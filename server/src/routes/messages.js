const express = require('express');
const mongoose = require('mongoose');
const authenticate = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { validateMessage } = require('../validation/messageSchema');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { getAdminId } = require('../utils/adminCache');

const router = express.Router();

/**
 * POST /messages/broadcast
 * Admin only — send the same message to ALL non-blocked users.
 * ⚠️ Must be defined BEFORE /:messageId to avoid Express routing it as a param.
 */
router.post('/broadcast', authenticate, isAdmin, async (req, res) => {
  try {
    const { content } = req.body || {};
    const trimmed = typeof content === 'string' ? content.trim() : '';
    if (!trimmed) {
      return res.status(400).json({ error: 'Content is required' });
    }
    if (trimmed.length > 2000) {
      return res.status(400).json({ error: 'Content too long (max 2000 chars)' });
    }

    const adminId = req.user.id;
    const adminObjId = new mongoose.Types.ObjectId(adminId);
    // Cap at 500 users to prevent OOM from unbounded Promise.allSettled
    const users = await User.find({ role: 'user', isBlocked: { $ne: true } }).select('_id').limit(500);

    const io = req.app.get('io');
    const socketMap = req.app.get('socketMap');

    const results = await Promise.allSettled(
      users.map(async (u) => {
        const msg = await Message.create({
          senderId: adminObjId,
          receiverId: u._id,
          content: trimmed,
        });
        await Conversation.findOneAndUpdate(
          { userId: u._id },
          { $set: { adminId: adminObjId, lastMessage: trimmed.substring(0, 100), lastMessageAt: new Date() } },
          { upsert: true }
        );
        const populated = await msg.populate('senderId', 'username displayName avatar role');
        const sid = socketMap?.get(u._id.toString());
        if (sid && io) io.to(sid).emit('new_message', populated);
        return populated;
      })
    );

    return res.json({ message: 'Broadcast sent successfully' });
  } catch (err) {
    console.error('POST /messages/broadcast error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /messages/:userId
 * - Admin: fetch full conversation between admin and the specified userId
 * - User: only allowed if req.user.id === userId (own messages with admin)
 */
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const requesterId = req.user.id;
    const isAdminRole = req.user.role === 'admin';

    if (!isAdminRole && requesterId !== userId) {
      return res.status(403).json({ error: 'Forbidden: cannot access another user\'s messages' });
    }

    // Blocked users cannot access their message history
    if (!isAdminRole) {
      const senderUser = await User.findById(requesterId).select('isBlocked');
      if (senderUser?.isBlocked) {
        return res.status(403).json({ error: 'Your account has been blocked' });
      }
    }

    let userIdInConv, adminId;

    if (isAdminRole) {
      // Admin's own ID is already verified in JWT — no DB lookup needed
      adminId   = requesterId;
      userIdInConv = userId;
    } else {
      // Use in-memory cache — avoids DB hit on every message-history load
      adminId = await getAdminId();
      if (!adminId) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      userIdInConv = requesterId;
    }


    // Pagination — hardened against negative/NaN/array injection
    // Math.min(NaN, 100) = NaN and .limit(NaN) = no limit, so we clamp explicitly
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 100;

    // before cursor — must be a plain string (not array from ?before[]=x) and valid ObjectId
    const rawBefore = req.query.before;
    const before = typeof rawBefore === 'string' ? rawBefore : null;

    const filter = {
      $or: [
        { senderId: userIdInConv, receiverId: adminId },
        { senderId: adminId, receiverId: userIdInConv },
      ],
    };

    if (before && mongoose.Types.ObjectId.isValid(before)) {
      filter._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'username displayName avatar role')
      .populate('receiverId', 'username displayName avatar role')
      .lean();

    // Return in ascending order for display
    return res.json(messages.reverse());
  } catch (err) {
    console.error('GET /messages/:userId error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /messages
 * Authenticated. senderId is ALWAYS set from JWT — never from request body.
 * Users always send to admin; admin can specify receiverId.
 */
router.post('/', authenticate, validateMessage, async (req, res) => {
  try {
    const senderId = req.user.id;
    const isAdminRole = req.user.role === 'admin';
    const { content, receiverId: bodyReceiverId } = req.body;

    let receiverId;

    if (isAdminRole) {
      if (!bodyReceiverId || !mongoose.Types.ObjectId.isValid(bodyReceiverId)) {
        return res.status(400).json({ error: 'Admin must provide a valid receiverId' });
      }
      receiverId = bodyReceiverId;
    } else {
      const cachedAdminId = await getAdminId();
      if (!cachedAdminId) return res.status(503).json({ error: 'Admin is not available yet' });
      receiverId = cachedAdminId;
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Blocked users cannot send messages
    if (!isAdminRole) {
      const senderUser = await User.findById(senderId).select('isBlocked').lean();
      if (senderUser?.isBlocked) {
        return res.status(403).json({ error: 'Your account has been blocked' });
      }
    }

    const message = await Message.create({ senderId, receiverId, content });

    const conversationUserId = isAdminRole ? receiverId : senderId;
    const adminIdStr = isAdminRole ? senderId : receiverId;

    const trimmedContent = content.trim();

    await Conversation.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(conversationUserId) },
      {
        $set: {
          adminId: new mongoose.Types.ObjectId(adminIdStr),
          lastMessage: trimmedContent.length > 100 ? trimmedContent.substring(0, 100) + '…' : trimmedContent,
          lastMessageAt: new Date(),
        },
      },
      { upsert: true }
    );


    const populated = await message.populate('senderId', 'username displayName avatar role');

    const io = req.app.get('io');
    if (io) {
      const socketMap = req.app.get('socketMap');
      const recipientSocketId = socketMap?.get(receiverId);
      if (recipientSocketId) io.to(recipientSocketId).emit('new_message', populated);
      const senderSocketId = socketMap?.get(senderId);
      if (senderSocketId) io.to(senderSocketId).emit('new_message', populated);
    }

    return res.status(201).json(populated);
  } catch (err) {
    console.error('POST /messages error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /messages/:messageId
 * Admin only — hard delete a message by ID.
 */
router.delete('/:messageId', authenticate, isAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: 'Invalid messageId' });
    }

    const msg = await Message.findByIdAndDelete(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    // Refresh Conversation.lastMessage only if admin exists
    const cachedAdminId = await getAdminId();
    if (cachedAdminId) {
      const adminId = cachedAdminId;
      const convUserId = [msg.senderId?.toString(), msg.receiverId?.toString()]
        .find((id) => id && id !== adminId);

      if (convUserId) {
        const latestMsg = await Message.findOne({
          $or: [
            { senderId: convUserId, receiverId: adminId },
            { senderId: adminId, receiverId: convUserId },
          ],
        }).sort({ createdAt: -1 }).select('content createdAt');

        await Conversation.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(convUserId) },
          {
            $set: {
              lastMessage: latestMsg ? latestMsg.content.substring(0, 100) : '',
              lastMessageAt: latestMsg ? latestMsg.createdAt : null,
            },
          }
        );
      }
    }

    const io = req.app.get('io');
    const socketMap = req.app.get('socketMap');
    if (io) {
      const payload = { messageId };
      [msg.senderId?.toString(), msg.receiverId?.toString()].forEach((uid) => {
        const sid = socketMap?.get(uid);
        if (sid) io.to(sid).emit('message_deleted', payload);
      });
    }

    return res.json({ message: 'Message deleted', messageId });
  } catch (err) {
    console.error('DELETE /messages/:messageId error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
