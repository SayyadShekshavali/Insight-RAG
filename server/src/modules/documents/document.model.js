import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  sourceType: {
    type: String,
    enum: ['github', 'jira', 'confluence', 'slack', 'gdrive', 'notion', 'pdf', 'docx', 'xlsx', 'swagger', 'transcript'],
    required: true,
  },
  sourceId: {
    type: String,
    default: '',
  },
  sourceUrl: {
    type: String,
    default: '',
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Org',
    required: true,
  },
  filePath: {
    type: String,
    default: '',
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  indexingStatus: {
    type: String,
    enum: ['indexed', 'processing', 'failed'],
    default: 'processing',
  },
  errorMessage: {
    type: String,
    default: '',
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

const Document = mongoose.model('Document', documentSchema);
export default Document;
