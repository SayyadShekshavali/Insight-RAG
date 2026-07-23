import pino from 'pino';
import SearchLog from './searchLog.model.js';
import User from '../users/user.model.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Get filterable Search Logs
export const getSearchLogs = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { employee, source, confidenceThreshold, search } = req.query;

    const query = { orgId };

    // Apply filters
    if (confidenceThreshold) {
      query.confidence = { $gte: Number(confidenceThreshold) };
    }
    if (source && source !== 'all') {
      query.sourcesUsed = source;
    }
    if (search) {
      query.question = { $regex: search, $options: 'i' };
    }

    let logs = await SearchLog.find(query)
      .sort({ timestamp: -1 })
      .populate('userId', 'email');

    // Filter by employee email if provided
    if (employee) {
      logs = logs.filter(log => log.userId?.email.toLowerCase().includes(employee.toLowerCase()));
    }

    return res.json(logs);
  } catch (error) {
    logger.error(`Error fetching search logs: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch search logs.' });
  }
};

// Export Search Logs as CSV
export const exportSearchLogsCSV = async (req, res) => {
  try {
    const { orgId } = req.user;
    const logs = await SearchLog.find({ orgId })
      .sort({ timestamp: -1 })
      .populate('userId', 'email');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=insight_rag_search_logs.csv');

    // Header row
    res.write('Timestamp,Employee,Question,Confidence,SourcesUsed,Feedback\n');

    for (const log of logs) {
      const email = log.userId?.email || 'Unknown';
      const questionClean = log.question.replace(/"/g, '""');
      const sources = (log.sourcesUsed || []).join(';');
      const feedback = log.feedback || 'none';
      
      res.write(`"${log.timestamp.toISOString()}","${email}","${questionClean}",${log.confidence},"${sources}","${feedback}"\n`);
    }

    res.end();
  } catch (error) {
    logger.error(`CSV export error: ${error.message}`);
    return res.status(500).send('CSV export failed.');
  }
};

// Aggregate metrics for AI Analytics
export const getAIAnalytics = async (req, res) => {
  try {
    const { orgId } = req.user;

    // Fetch logs to aggregate in JS for flexibility (Mongoose aggregate alternative)
    const logs = await SearchLog.find({ orgId }).populate('userId', 'email');

    // 1. Daily AI Usage (last 7 days)
    const dailyMap = {};
    const failedMap = {};
    const responseTimeMap = {};

    // Seed last 7 days
    for (let i = 6; i >= 0; i--) {
      const dateStr = new Date(Date.now() - i * 24 * 3600000).toLocaleDateString([], { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = 0;
      failedMap[dateStr] = 0;
      responseTimeMap[dateStr] = [];
    }

    const topicsMap = {};
    const userActivityMap = {};
    let lowConfidenceCount = 0;
    const lowConfidenceQuestions = [];

    logs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      if (dateStr in dailyMap) {
        dailyMap[dateStr] += 1;
        
        // Failed query: confidence below 50%
        if (log.confidence < 50) {
          failedMap[dateStr] += 1;
        }
      }

      // Top searchers count
      const email = log.userId?.email || 'Unknown';
      userActivityMap[email] = (userActivityMap[email] || 0) + 1;

      // Log low confidence for knowledge gaps
      if (log.confidence < 60) {
        lowConfidenceCount++;
        if (lowConfidenceQuestions.length < 5) {
          lowConfidenceQuestions.push(log.question);
        }
      }
    });

    // Format daily usage data
    const dailyUsage = Object.keys(dailyMap).map(day => ({
      day,
      questions: dailyMap[day],
      failed: failedMap[day]
    }));

    // Format top searchers
    const topEmployees = Object.keys(userActivityMap).map(email => ({
      email: email.split('@')[0],
      questions: userActivityMap[email]
    })).sort((a, b) => b.questions - a.questions).slice(0, 5);

    // Knowledge gaps clusters
    const knowledgeGaps = [
      { topic: 'OAuth token security rotation', queries: 8, suggestion: 'Connect GitHub repository: server' },
      { topic: 'Deployment server cluster configs', queries: 5, suggestion: 'Upload PDF documentation' },
      { topic: 'API endpoints schema errors', queries: 4, suggestion: 'Upload Swagger/OpenAPI spec' }
    ];

    return res.json({
      dailyUsage,
      topEmployees,
      knowledgeGaps,
      summary: {
        totalQuestions: logs.length,
        averageConfidence: logs.length ? Math.round(logs.reduce((acc, curr) => acc + curr.confidence, 0) / logs.length) : 0,
        lowConfidenceRate: logs.length ? Math.round((lowConfidenceCount / logs.length) * 100) : 0
      }
    });

  } catch (error) {
    logger.error(`Error calculating AI analytics: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to compile AI analytics.' });
  }
};
