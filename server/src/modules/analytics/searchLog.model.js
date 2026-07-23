import mongoose from 'mongoose';

const searchLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Org',
    required: true,
  },
  question: {
    type: String,
    required: true,
    trim: true,
  },
  sourcesUsed: {
    type: [String],
    default: [],
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
  feedback: {
    type: String,
    enum: ['up', 'down', null],
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

const SearchLog = mongoose.model('SearchLog', searchLogSchema);
export default SearchLog;
