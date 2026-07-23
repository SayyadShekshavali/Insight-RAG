import mongoose from 'mongoose';

const orgSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  domainAllowlist: {
    type: [String],
    default: [],
  },
  settings: {
    dataRetentionDays: {
      type: Number,
      default: 90,
    },
    billingPlaceholder: {
      type: String,
      default: 'free_tier',
    }
  }
}, {
  timestamps: true,
});

const Org = mongoose.model('Org', orgSchema);
export default Org;
