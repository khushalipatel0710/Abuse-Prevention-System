const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ip: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['LOGIN', 'LOGOUT', 'REGISTER', 'LOGIN_FAILED', 'RATE_LIMIT_EXCEEDED', 'BLOCKED'],
      required: true,
    },
    status: {
      type: String,
      default: 'SUCCESS',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ ip: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);