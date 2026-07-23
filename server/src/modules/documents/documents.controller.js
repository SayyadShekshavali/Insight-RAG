import fs from 'fs';
import path from 'path';
import pino from 'pino';
import http from 'http';
import https from 'https';
import Document from './document.model.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Helper: Ensure upload directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Fetch all documents for organization
export const getDocuments = async (req, res) => {
  try {
    const { orgId } = req.user;
    const docs = await Document.find({ orgId }).sort({ updatedAt: -1 });
    return res.json(docs);
  } catch (error) {
    logger.error(`Error listing documents: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch documents.' });
  }
};

// Background worker helper to index document in Python AI service
const triggerPythonIndexing = async (docRecord, originalFilename) => {
  const pythonUrl = new URL(process.env.PYTHON_AI_URL || 'http://localhost:8000');
  const postData = JSON.stringify({
    document_id: docRecord._id.toString(),
    file_path: docRecord.filePath,
    title: docRecord.title,
    source_type: docRecord.sourceType,
    org_id: docRecord.orgId.toString(),
  });

  const options = {
    hostname: pythonUrl.hostname,
    port: pythonUrl.port || (pythonUrl.protocol === 'https:' ? 443 : 80),
    path: '/index',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const client = pythonUrl.protocol === 'https:' ? https : http;
  const pyReq = client.request(options, (pyRes) => {
    let responseBody = '';
    pyRes.on('data', (chunk) => {
      responseBody += chunk;
    });

    pyRes.on('end', async () => {
      try {
        if (pyRes.statusCode === 200) {
          docRecord.indexingStatus = 'indexed';
          docRecord.errorMessage = '';
          logger.info(`Successfully indexed document: ${docRecord.title}`);
        } else {
          const err = JSON.parse(responseBody);
          docRecord.indexingStatus = 'failed';
          docRecord.errorMessage = err.detail || 'Python parsing execution failed.';
          logger.error(`Failed to index document ${docRecord.title}: ${docRecord.errorMessage}`);
        }
        await docRecord.save();
      } catch (err) {
        logger.error(`Failed to parse index result: ${err.message}`);
      }
    });
  });

  pyReq.on('error', async (err) => {
    logger.error(`Failed to reach Python indexing service: ${err.message}`);
    docRecord.indexingStatus = 'failed';
    docRecord.errorMessage = 'AI index service is offline. File is saved but not embedded.';
    await docRecord.save();
  });

  pyReq.write(postData);
  pyReq.end();
};

// Upload single document controller
export const uploadDocument = async (req, res) => {
  try {
    const { orgId } = req.user;
    if (!req.file) {
      return res.status(400).json({ error: 'ValidationError', message: 'No file uploaded.' });
    }

    const { originalname, size, path: tempPath } = req.file;
    const extension = originalname.split('.').pop()?.toLowerCase();

    // Map extension to sourceType
    let sourceType = 'pdf';
    if (['xlsx', 'xls'].includes(extension)) sourceType = 'xlsx';
    else if (['docx', 'doc'].includes(extension)) sourceType = 'docx';
    else if (['json', 'yaml', 'yml'].includes(extension)) sourceType = 'swagger';

    // Move file to final uploads directory
    const finalFilename = `${Date.now()}-${originalname}`;
    const finalPath = path.join(UPLOADS_DIR, finalFilename);
    fs.renameSync(tempPath, finalPath);

    // Save record to MongoDB
    const newDoc = new Document({
      title: originalname,
      sourceType,
      orgId,
      filePath: finalPath,
      fileSize: size,
      indexingStatus: 'processing',
    });

    await newDoc.save();
    logger.info(`Document uploaded and saved to DB: ${originalname}`);

    // Trigger non-blocking Python indexing
    triggerPythonIndexing(newDoc, originalname);

    return res.status(201).json(newDoc);
  } catch (error) {
    logger.error(`Document upload error: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to process document upload.' });
  }
};

// Reindex a document
export const reindexDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    const doc = await Document.findOne({ _id: id, orgId });
    if (!doc) {
      return res.status(404).json({ error: 'DocumentNotFound', message: 'The document was not found.' });
    }

    doc.indexingStatus = 'processing';
    doc.errorMessage = '';
    await doc.save();

    triggerPythonIndexing(doc, doc.title);
    return res.json(doc);
  } catch (error) {
    logger.error(`Error re-indexing document: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to re-index document.' });
  }
};

// Delete document from both Mongo and local file
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    const doc = await Document.findOne({ _id: id, orgId });
    if (!doc) {
      return res.status(404).json({ error: 'DocumentNotFound', message: 'Document not found.' });
    }

    // Delete local file if exists
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      try {
        fs.unlinkSync(doc.filePath);
      } catch (err) {
        logger.error(`Failed to delete local file: ${err.message}`);
      }
    }

    // Trigger Python deletion from Qdrant vector database (non-blocking)
    const pythonUrl = new URL(process.env.PYTHON_AI_URL || 'http://localhost:8000');
    const deleteData = JSON.stringify({ document_id: doc._id.toString() });
    
    const options = {
      hostname: pythonUrl.hostname,
      port: pythonUrl.port,
      path: '/delete-index',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(deleteData),
      },
    };

    const deleteReq = http.request(options);
    deleteReq.on('error', (err) => logger.error(`Failed to trigger vector deletion: ${err.message}`));
    deleteReq.write(deleteData);
    deleteReq.end();

    await Document.deleteOne({ _id: id, orgId });
    logger.info(`Successfully deleted document: ${doc.title}`);

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting document: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to delete document.' });
  }
};

// Retrieve a single document and its preview content
export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    const doc = await Document.findOne({ _id: id, orgId });
    if (!doc) {
      return res.status(404).json({ error: 'DocumentNotFound', message: 'Document not found.' });
    }
    
    let content = '';
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      try {
        const stat = fs.statSync(doc.filePath);
        if (stat.size < 5 * 1024 * 1024) {
          const data = fs.readFileSync(doc.filePath, 'utf8');
          content = data;
        } else {
          content = 'Document content is too large to load in the preview panel.';
        }
      } catch (err) {
        content = 'Could not load preview text for this document format.';
      }
    } else {
      content = 'No preview content available for this external integration resource.';
    }

    return res.json({
      _id: doc._id,
      title: doc.title,
      sourceType: doc.sourceType,
      fileSize: doc.fileSize,
      indexingStatus: doc.indexingStatus,
      lastSyncedAt: doc.lastSyncedAt,
      content,
    });
  } catch (error) {
    logger.error(`Error retrieving document: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve document.' });
  }
};
