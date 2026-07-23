import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getDocuments, uploadDocument, reindexDocument, deleteDocument, getDocumentById } from './documents.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';

// Setup multer for temporary uploads before processing
const tempDir = path.join(process.cwd(), 'uploads', 'temp');
const upload = multer({
  dest: tempDir,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

const router = Router();

router.get('/', requireAuth, getDocuments);
router.get('/:id', requireAuth, getDocumentById);
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), uploadDocument);
router.post('/reindex/:id', requireAuth, requireAdmin, reindexDocument);
router.delete('/:id', requireAuth, requireAdmin, deleteDocument);

export default router;
