import { Router } from 'express';
import { askAI, getHistory, toggleSaveThread, deleteThread, logFeedback, getOrCreateThread, getThread } from './chat.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/history', requireAuth, getHistory);
router.post('/thread', requireAuth, getOrCreateThread);
router.get('/thread/:id', requireAuth, getThread);
router.post('/ask', requireAuth, askAI);
router.post('/save/:id', requireAuth, toggleSaveThread);
router.delete('/:id', requireAuth, deleteThread);
router.post('/feedback', requireAuth, logFeedback);

export default router;
