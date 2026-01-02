let mongoose;

const getBlockedEntityModel = () => {
  if (!mongoose) {
    mongoose = require('mongoose');
  }

  const BlockedEntitySchema = new mongoose.Schema(
    {
      entityType: {
        type: String,
        enum: ['user', 'ip'],
        required: true,
        index: true,
      },
      entityValue: {
        type: String,
        required: true,
        index: true,
      },
      reason: {
        type: String,
        required: true,
      },
      blockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      blockedAt: {
        type: Date,
        default: Date.now,
      },
      unblockAt: Date,
      isPermanent: {
        type: Boolean,
        default: true,
      },
    },
    { timestamps: true }
  );

  BlockedEntitySchema.index({ entityType: 1, entityValue: 1 });

  return mongoose.model('BlockedEntity', BlockedEntitySchema);
};

module.exports = getBlockedEntityModel();