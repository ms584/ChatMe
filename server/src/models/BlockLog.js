const mongoose = require('mongoose');

const blockLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['blocked', 'unblocked'],
      required: true,
    },
    reason: {
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlockLog', blockLogSchema);
