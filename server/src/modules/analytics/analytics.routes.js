import { Router } from 'express';
import { getSearchLogs, exportSearchLogsCSV, getAIAnalytics } from './analytics.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';

const router = Router();

router.get('/logs', requireAuth, requireAdmin, getSearchLogs);
router.get('/search-logs', requireAuth, requireAdmin, getSearchLogs);
router.get('/export', requireAuth, requireAdmin, exportSearchLogsCSV);
router.get('/stats', requireAuth, requireAdmin, getAIAnalytics);

export default router;
