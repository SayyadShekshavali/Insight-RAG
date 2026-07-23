import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  citations: [{
    sourceType: {
      type: String,
      required: true,
    },
    sourceId: String,
    title: String,
    sourceUrl: String,
    snippet: String,
  }],
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  followUpQuestions: {
    type: [String],
    default: [],
  }
}, {
  timestamps: true,
});

const chatThreadSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true,
  },
  isSaved: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

// Embed messages as a subdocument array on the thread
chatThreadSchema.add({
  messages: [messageSchema]
});

const ChatThread = mongoose.model('ChatThread', chatThreadSchema);
export default ChatThread;
