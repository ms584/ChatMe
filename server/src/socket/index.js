const { verifyToken } = require('../utils/jwt');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { getAdminId } = require('../utils/adminCache');

/**
 * Setup Socket.io server with JWT authentication and real-time messaging.
 */
const setupSocket = (io, socketMap) => {
  // --- Per-IP connection rate limiting (10 connections/min) ---
  const connRateMap = new Map(); // ip -> { count, resetAt }
  const MAX_CONN_PER_MIN = 10;
  // Cleanup expired entries every 5 min to prevent memory leak from unique IPs
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of connRateMap) {
      if (now >= entry.resetAt) connRateMap.delete(ip);
    }
  }, 5 * 60_000);

  // --- Middleware: verify JWT on handshake ---
  io.use((socket, next) => {
    // Rate-limit connection attempts per real IP
    // socket.handshake.address is the PROXY IP in production — must read X-Forwarded-For
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    const ip = (forwarded ? forwarded.split(',')[0] : socket.handshake.address).trim();
    
    // Prevent memory exhaustion DoS via infinite IP spoofing
    if (connRateMap.size > 50000) connRateMap.clear();

    const now = Date.now();
    const entry = connRateMap.get(ip);
    if (entry && now < entry.resetAt) {
      if (entry.count >= MAX_CONN_PER_MIN) {
        return next(new Error('Too many connection attempts'));
      }
      entry.count++;
    } else {
      connRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    }

    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: no token'));
    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.sub;
      socket.userRole = decoded.role;
      next();
    } catch {
      return next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, userRole } = socket;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔌 Socket connected: role=${userRole}`);
    }
    socketMap.set(userId, socket.id);

    // --- Per-socket rate limiting ---
    let msgCount = 0;
    const msgRateWindow = setInterval(() => { msgCount = 0; }, 60_000);
    const MAX_MSG_PER_MIN = 20;

    // Typing rate limit — separate bucket (60 events/min)
    let typingCount = 0;
    const typingRateWindow = setInterval(() => { typingCount = 0; }, 60_000);
    const MAX_TYPING_PER_MIN = 60;

    // Short-lived isBlocked cache per-socket (5s TTL) to avoid DB on every keystroke
    let blockedCache = null;        // null = unchecked, true/false = cached result
    let blockedCacheExpiry = 0;
    const BLOCKED_TTL_MS = 5_000;
    const isUserBlocked = async () => {
      if (userRole === 'admin') return false;
      const now = Date.now();
      if (blockedCache !== null && now < blockedCacheExpiry) return blockedCache;
      const u = await User.findById(userId).select('isBlocked').lean();
      blockedCache = u?.isBlocked === true;
      blockedCacheExpiry = now + BLOCKED_TTL_MS;
      return blockedCache;
    };

    // --- Event: send_message ---
    socket.on('send_message', async (data) => {
      if (msgCount >= MAX_MSG_PER_MIN) {
        socket.emit('error', { message: 'Rate limit exceeded — slow down!' });
        return;
      }
      msgCount++;
      try {
        // Guard against null/non-object payloads before destructuring
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          socket.emit('error', { message: 'Invalid payload' });
          return;
        }
        const { content, receiverId: clientReceiverId } = data;

        // Content validation
        if (typeof content !== 'string' || content.trim().length === 0 || content.length > 2000) {
          socket.emit('error', { message: 'Invalid message content' });
          return;
        }

        const sanitizedContent = content.trim();
        let receiverId;

        if (userRole === 'admin') {
          // Admin must specify a valid receiver ObjectId
          if (!clientReceiverId || !mongoose.Types.ObjectId.isValid(clientReceiverId)) {
            socket.emit('error', { message: 'Admin must specify a valid receiverId' });
            return;
          }
          receiverId = clientReceiverId;
        } else {
          // Users always message admin — use cache to avoid DB on every message
          const cachedAdminId = await getAdminId();
          if (!cachedAdminId) {
            socket.emit('error', { message: 'Admin unavailable' });
            return;
          }
          receiverId = cachedAdminId;
        }

        if (userId === receiverId) {
          socket.emit('error', { message: 'Cannot message yourself' });
          return;
        }

        // Blocked users cannot send messages — use TTL cache to avoid per-message DB query
        if (await isUserBlocked()) {
          socket.emit('message_blocked', { message: 'Your account has been blocked by the admin.' });
          return;
        }

        const message = await Message.create({ senderId: userId, receiverId, content: sanitizedContent });

        const conversationUserId = userRole === 'admin' ? receiverId : userId;
        const adminId = userRole === 'admin' ? userId : receiverId;

        await Conversation.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(conversationUserId) },
          {
            $set: {
              adminId: new mongoose.Types.ObjectId(adminId),
              lastMessage: sanitizedContent.length > 100
                ? sanitizedContent.substring(0, 100) + '…'
                : sanitizedContent,
              lastMessageAt: new Date(),
            },
          },
          { upsert: true }
        );

        const populated = await message.populate('senderId', 'username displayName avatar role -__v');

        // Emit to recipient
        const recipientSocketId = socketMap.get(receiverId);
        if (recipientSocketId) io.to(recipientSocketId).emit('new_message', populated);

        // Confirm to sender
        socket.emit('new_message', populated);
      } catch (err) {
        console.error('Socket send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // --- Event: typing indicators ---
    socket.on('typing', async (data) => {
      if (!data || typeof data !== 'object' || typeof data.receiverId !== 'string') return;

      // Typing rate limit — prevent keystroke flooding
      if (typingCount >= MAX_TYPING_PER_MIN) return;
      typingCount++;

      // Blocked users cannot send typing indicators — uses TTL cache
      if (await isUserBlocked()) return;

      const { receiverId, isTyping } = data;
      const recipientSocketId = socketMap.get(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_typing', {
          senderId: userId,
          isTyping: isTyping === true,   // strict check prevents Boolean('false') = true
        });
      }
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      // Guard against race: only delete if socketMap still points to THIS socket.
      // If the user reconnected quickly, connection fires first (overwriting the entry),
      // then old socket's disconnect fires — without this guard it would delete the NEW entry.
      if (socketMap.get(userId) === socket.id) {
        socketMap.delete(userId);
      }
      clearInterval(msgRateWindow);
      clearInterval(typingRateWindow);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔌 Socket disconnected: role=${userRole}`);
      }
    });
  });
};

module.exports = setupSocket;
