const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,   // RFC 5321 max email length
      default: null,
    },
    avatar: {
      type: String,
      maxlength: 500,   // prevent oversized URLs
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,    // queried in broadcast filter and block checks
    },
  },
  { timestamps: true }
);

// Compound index for admin lookup — called on every message send
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
