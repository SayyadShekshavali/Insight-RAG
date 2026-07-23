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
    let docs = await Document.find({ orgId }).sort({ updatedAt: -1 });
    if (!docs || docs.length === 0) {
      docs = await Document.find({}).sort({ updatedAt: -1 });
    }
    return res.json(docs);
  } catch (error) {
    logger.error(`Error listing documents: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch documents.' });
  }
};

// Background worker helper to index document in Python AI service
const triggerPythonIndexing = async (docRecord, originalFilename) => {
  try {
    let fileContent = '';
    if (docRecord.filePath && fs.existsSync(docRecord.filePath)) {
      try {
        const stat = fs.statSync(docRecord.filePath);
        if (stat.size < 5 * 1024 * 1024) {
          fileContent = fs.readFileSync(docRecord.filePath, 'utf8');
        }
      } catch (e) {}
    }

    const baseUrl = (process.env.PYTHON_AI_URL || 'http://localhost:8000').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: docRecord._id.toString(),
        file_path: docRecord.filePath,
        title: docRecord.title,
        source_type: docRecord.sourceType,
        org_id: docRecord.orgId.toString(),
        content: (fileContent && fileContent.trim()) ? fileContent : `Document file: ${docRecord.title}`
      })
    });

    if (res.ok) {
      docRecord.indexingStatus = 'indexed';
      docRecord.errorMessage = '';
      logger.info(`Successfully indexed document: ${docRecord.title}`);
    } else {
      let detail = 'Python parsing execution failed.';
      try {
        const err = await res.json();
        detail = err.detail || detail;
      } catch (e) {}
      docRecord.indexingStatus = 'failed';
      docRecord.errorMessage = detail;
      logger.error(`Failed to index document ${docRecord.title}: ${docRecord.errorMessage}`);
    }
    await docRecord.save();
  } catch (err) {
    logger.error(`Failed to reach Python indexing service: ${err.message}`);
    docRecord.indexingStatus = 'failed';
    docRecord.errorMessage = 'AI index service is offline. File is saved but not embedded.';
    await docRecord.save();
  }
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
    let doc = await Document.findOne({ _id: id, orgId });
    if (!doc) {
      doc = await Document.findOne({ _id: id });
    }
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
    let doc = await Document.findOne({ _id: id, orgId });
    if (!doc) {
      doc = await Document.findOne({ _id: id });
    }
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
