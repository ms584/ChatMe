const express = require('express');
const mongoose = require('mongoose');
const authenticate = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const BlockLog = require('../models/BlockLog');
const { getAdminId } = require('../utils/adminCache');

const router = express.Router();

/**
 * GET /conversations
 */
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const conversations = await Conversation.find()
      .select('-__v')
      .populate('userId', 'username displayName email avatar githubId role isBlocked')
      .sort({ lastMessageAt: -1 })
      .limit(500)
      .lean();
    return res.json(conversations);
  } catch (err) {
    console.error('GET /conversations error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /conversations/block-history
 * Admin only — returns full block/unblock audit log, newest first.
 */
router.get('/block-history', authenticate, isAdmin, async (req, res) => {
  try {
    const logs = await BlockLog.find()
      .select('-__v')
      .populate('userId', 'username displayName avatar')
      .populate('adminId', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json(logs);
  } catch (err) {
    console.error('GET /conversations/block-history error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PATCH /conversations/:userId/block
 * Admin only — toggle isBlocked + write audit log.
 */
router.patch('/:userId/block', authenticate, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot block admin' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    // Write audit log
    await BlockLog.create({
      userId: user._id,
      adminId: req.user.id,
      action: user.isBlocked ? 'blocked' : 'unblocked',
    });

    // Notify user via socket
    const io = req.app.get('io');
    const socketMap = req.app.get('socketMap');
    const sid = socketMap?.get(userId);
    if (sid && io) {
      io.to(sid).emit('account_status', { isBlocked: user.isBlocked });
    }

    return res.json({ userId, isBlocked: user.isBlocked });
  } catch (err) {
    console.error('PATCH /conversations/:userId/block error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


/**
 * DELETE /conversations/:userId
 * Admin only — delete ALL messages in a conversation with a user.
 */
router.delete('/:userId', authenticate, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const adminId = await getAdminId();
    if (!adminId) return res.status(503).json({ error: 'Admin account not found' });

    // Delete all messages between admin and this user
    const result = await Message.deleteMany({
      $or: [
        { senderId: userId, receiverId: adminId },
        { senderId: adminId, receiverId: userId },
      ],
    });

    // Reset conversation record
    await Conversation.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { lastMessage: '', lastMessageAt: null } }
    );

    // Notify both parties
    const io = req.app.get('io');
    const socketMap = req.app.get('socketMap');
    if (io) {
      [userId, adminId].forEach((uid) => {
        const sid = socketMap?.get(uid);
        if (sid) io.to(sid).emit('conversation_cleared', { userId });
      });
    }

    return res.json({ message: 'Conversation cleared successfully', userId });
  } catch (err) {
    console.error('DELETE /conversations/:userId error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
