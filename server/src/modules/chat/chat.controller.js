import http from 'http';
import https from 'https';
import mongoose from 'mongoose';
import pino from 'pino';
import ChatThread from './chatThread.model.js';
import SearchLog from '../analytics/searchLog.model.js';
import Document from '../documents/document.model.js';
import Integration from '../integrations/integration.model.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Create or fetch thread
export const getOrCreateThread = async (req, res) => {
  try {
    const { userId, orgId } = req.user;
    const { title } = req.body;

    const thread = new ChatThread({
      userId,
      orgId,
      title: title || 'New Search Thread',
      messages: [],
    });

    await thread.save();
    return res.status(201).json(thread);
  } catch (error) {
    logger.error(`Error creating chat thread: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to create chat thread.' });
  }
};

// Get user chat history
export const getHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    const threads = await ChatThread.find({ userId })
      .sort({ updatedAt: -1 })
      .select('title isSaved updatedAt messages');
    
    // Format to density requested (include used source types)
    const formatted = threads.map(t => {
      const allCitations = [];
      t.messages.forEach(m => {
        if (m.citations) {
          m.citations.forEach(c => {
            if (!allCitations.includes(c.sourceType)) {
              allCitations.push(c.sourceType);
            }
          });
        }
      });

      return {
        id: t._id,
        title: t.title,
        isSaved: t.isSaved,
        updatedAt: t.updatedAt,
        sourcesUsed: allCitations,
        snippet: t.messages[0]?.content || 'Empty conversation'
      };
    });

    return res.json(formatted);
  } catch (error) {
    logger.error(`Error fetching chat history: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch search history.' });
  }
};

// Toggle saved chat status
export const toggleSaveThread = async (req, res) => {
  try {
    const { id } = req.params;
    const thread = await ChatThread.findById(id);
    if (!thread) {
      return res.status(404).json({ error: 'ThreadNotFound', message: 'The chat thread was not found.' });
    }

    thread.isSaved = !thread.isSaved;
    await thread.save();

    return res.json({ id: thread._id, isSaved: thread.isSaved, title: thread.title });
  } catch (error) {
    logger.error(`Error saving thread: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to toggle saved status.' });
  }
};

// Delete chat thread
export const deleteThread = async (req, res) => {
  try {
    const { id } = req.params;
    await ChatThread.findByIdAndDelete(id);
    return res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting thread: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to delete chat thread.' });
  }
};

const streamCustomResponse = async (res, thread, question, userId, orgId, message) => {
  const words = message.split(' ');
  for (const word of words) {
    res.write(`data: ${JSON.stringify({ event: 'token', text: word + ' ' })}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  
  res.write(`data: ${JSON.stringify({ event: 'complete', confidence: 100, citations: [], followUpQuestions: [] })}\n\n`);
  res.end();

  try {
    thread.messages.push({
      role: 'assistant',
      content: message,
      citations: [],
      confidence: 100,
      followUpQuestions: []
    });
    await thread.save();

    const searchLog = new SearchLog({
      userId,
      orgId,
      question,
      sourcesUsed: [],
      confidence: 100,
      feedback: null
    });
    await searchLog.save();
  } catch (err) {
    logger.error(`Error saving intercepted message to DB: ${err.message}`);
  }
};

// Handle natural-language query and stream synthesized AI response
export const askAI = async (req, res) => {
  const { question, threadId, documentId } = req.body;
  const { userId, orgId } = req.user;

  if (!question) {
    return res.status(400).json({ error: 'ValidationError', message: 'Question string is required.' });
  }

  // 1. Get or create thread
  let thread;
  try {
    if (threadId) {
      thread = await ChatThread.findOne({ _id: threadId, userId });
    }
    if (!thread) {
      thread = new ChatThread({
        userId,
        orgId,
        title: question.slice(0, 40) + (question.length > 40 ? '...' : ''),
        messages: []
      });
    }

    // Append user query to thread
    thread.messages.push({
      role: 'user',
      content: question
    });
    await thread.save();
  } catch (err) {
    logger.error(`Error preparing chat thread: ${err.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to initialize conversation thread.' });
  }

  // 2. Set headers for SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send the threadId to client immediately
  res.write(`data: ${JSON.stringify({ event: 'thread_created', threadId: thread._id })}\n\n`);

  // 2.5. Intercept query if asking about a specific document (only block if status is actively processing or failed)
  let allDocs = [];
  try {
    allDocs = await Document.find({ orgId }).select('title sourceType indexingStatus errorMessage');
    if (!allDocs || allDocs.length === 0) {
      allDocs = await Document.find({}).select('title sourceType indexingStatus errorMessage');
    }
    const queryClean = question.toLowerCase().replace(/\s+/g, ' ').trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const doc of allDocs) {
      const lowerTitle = doc.title.toLowerCase().trim();
      const stripped = lowerTitle
        .replace(/^(notion|jira|slack channel|google drive|github|pdf|swagger):\s*/i, '')
        .replace(/^\d+-/, '')
        .trim();
      const filename = stripped.split('/').pop();

      let score = 0;
      if (queryClean.includes(lowerTitle)) {
        score = 100 + lowerTitle.length;
      } else if (stripped.length > 2 && queryClean.includes(stripped)) {
        score = 80 + stripped.length;
      } else if (filename && filename.length > 3 && queryClean.includes(filename)) {
        score = 50 + filename.length;
        const pathSegments = stripped.split('/').filter(s => s.length > 2);
        for (const seg of pathSegments) {
          if (queryClean.includes(seg)) {
            score += 10;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = doc;
      }
    }

    if (bestMatch && bestScore >= 40) {
      if (bestMatch.indexingStatus === 'processing') {
        const msg = `The document "${bestMatch.title}" is currently processing/syncing in your workspace. Please wait a moment until it is fully indexed.`;
        return streamCustomResponse(res, thread, question, userId, orgId, msg);
      } else if (bestMatch.indexingStatus === 'failed') {
        const msg = `The document "${bestMatch.title}" failed to index. Error: ${bestMatch.errorMessage || 'Unknown extraction error.'}`;
        return streamCustomResponse(res, thread, question, userId, orgId, msg);
      }
    }
  } catch (err) {
    logger.error(`Error executing document status query interceptor: ${err.message}`);
  }

  // 3. Request streaming response from Python AI FastAPI Service
  let integrationsList = [];
  try {
    const integrations = await Integration.find({ orgId }).select('sourceType status');
    integrationsList = integrations.map(i => ({ sourceType: i.sourceType, status: i.status }));
  } catch (err) {
    logger.error(`Error loading integrations for ask payload: ${err.message}`);
  }

  const chatHistory = (thread.messages || []).slice(-8).map(m => ({
    role: m.role,
    content: m.content
  }));

  const pythonUrl = new URL(process.env.PYTHON_AI_URL || 'http://localhost:8000');
  const postData = JSON.stringify({
    question,
    org_id: orgId.toString(),
    user_id: userId.toString(),
    document_id: documentId || undefined,
    integrations: integrationsList,
    documents: allDocs.map(d => ({
      title: d.title,
      source_type: d.sourceType || 'file',
      indexing_status: d.indexingStatus || 'indexed'
    })),
    chat_history: chatHistory
  });

  const options = {
    hostname: pythonUrl.hostname,
    port: pythonUrl.port || (pythonUrl.protocol === 'https:' ? 443 : 80),
    path: '/ask',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  req.setTimeout(120000);
  res.setTimeout(120000);

  let assistantContent = '';
  let citations = [];
  let confidence = 85; // default fallback
  let followUpQuestions = [];
  let pyBuffer = '';

  const client = pythonUrl.protocol === 'https:' ? https : http;
  const pyReq = client.request(options, (pyRes) => {
    pyRes.setTimeout(120000);
    pyRes.on('data', async (chunk) => {
      const text = chunk.toString();
      
      // Node.js streams back the chunk to React client
      res.write(text);

      // Parse chunk lines safely with buffer
      pyBuffer += text;
      const lines = pyBuffer.split('\n');
      pyBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmedLine.substring(6));
            if (parsed.event === 'token') {
              assistantContent += parsed.text;
            } else if (parsed.event === 'complete') {
              citations = parsed.citations || [];
              confidence = parsed.confidence || 85;
              followUpQuestions = parsed.followUpQuestions || [];
            }
          } catch (e) {
            // Ignore incomplete chunks / partial lines
          }
        }
      }
    });

    pyRes.on('end', async () => {
      if (pyBuffer.trim().startsWith('data: ')) {
        try {
          const parsed = JSON.parse(pyBuffer.trim().substring(6));
          if (parsed.event === 'token') {
            assistantContent += parsed.text;
          } else if (parsed.event === 'complete') {
            citations = parsed.citations || [];
            confidence = parsed.confidence || 85;
            followUpQuestions = parsed.followUpQuestions || [];
          }
        } catch (e) {}
      }
      try {
        // Save complete assistant turn to DB
        thread.messages.push({
          role: 'assistant',
          content: assistantContent || 'Sorry, I could not synthesize an answer from the indexed documentation.',
          citations,
          confidence,
          followUpQuestions
        });
        await thread.save();

        // Log the search for Admin analytics
        const searchLog = new SearchLog({
          userId,
          orgId,
          question,
          sourcesUsed: citations.map(c => c.sourceType),
          confidence,
          feedback: null
        });
        await searchLog.save();

        // Send search log ID to client for thumbs up/down feedback
        res.write(`data: ${JSON.stringify({ event: 'search_log_created', logId: searchLog._id })}\n\n`);

      } catch (err) {
        logger.error(`Error saving assistant response to DB: ${err.message}`);
      }
      res.end();
    });
  });

  pyReq.on('error', (err) => {
    logger.error(`Connection to Python AI service failed: ${err.message}`);
    // Write friendly error to SSE stream and close
    const errorPayload = {
      event: 'token',
      text: 'The AI pipeline is currently offline or indexing. Please verify your Python service is running on port 8000.'
    };
    res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
    res.write(`data: ${JSON.stringify({ event: 'complete', confidence: 0, citations: [], followUpQuestions: [] })}\n\n`);
    res.end();
  });

  pyReq.write(postData);
  pyReq.end();
};

// Log search feedback (thumbs up / down)
export const logFeedback = async (req, res) => {
  try {
    const { logId, feedback } = req.body;
    if (!['up', 'down'].includes(feedback)) {
      return res.status(400).json({ error: 'ValidationError', message: 'Feedback must be either "up" or "down".' });
    }

    const log = await SearchLog.findById(logId);
    if (!log) {
      return res.status(404).json({ error: 'LogNotFound', message: 'Search log record not found.' });
    }

    log.feedback = feedback;
    await log.save();

    return res.json({ message: 'Feedback logged successfully' });
  } catch (error) {
    logger.error(`Error logging feedback: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to log feedback.' });
  }
};

// Retrieve a single chat thread details
export const getThread = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, orgId } = req.user;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'ThreadNotFound', message: 'Invalid thread ID format.' });
    }

    let thread = await ChatThread.findOne({ _id: id, userId });
    if (!thread) {
      thread = await ChatThread.findOne({ _id: id, orgId });
    }
    if (!thread) {
      thread = await ChatThread.findById(id);
    }

    if (!thread) {
      return res.status(404).json({ error: 'ThreadNotFound', message: 'The chat thread was not found.' });
    }
    return res.json(thread);
  } catch (error) {
    logger.error(`Error fetching thread: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch thread.' });
  }
};
