import mongoose from 'mongoose';

const integrationSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Org',
    required: true,
  },
  sourceType: {
    type: String,
    enum: ['github', 'jira', 'confluence', 'slack', 'gdrive', 'notion'],
    required: true,
  },
  status: {
    type: String,
    enum: ['connected', 'syncing', 'error'],
    default: 'connected',
  },
  credentials: {
    accessToken: String,
    refreshToken: String,
    expiresAt: Date,
    webhookSecret: String,
    extraConfig: mongoose.Schema.Types.Mixed,
  },
  lastSyncTime: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

// Avoid duplicate configurations for the same org + source
integrationSchema.index({ orgId: 1, sourceType: 1 }, { unique: true });

const Integration = mongoose.model('Integration', integrationSchema);
export default Integration;
