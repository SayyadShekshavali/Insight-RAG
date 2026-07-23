import { Router } from 'express';
import { 
  getIntegrations, renderConnectOAuth, oauthCallback, 
  syncIntegration, disconnectIntegration, getGDriveFiles, getNotionFiles, connectNotionToken
} from './integrations.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, getIntegrations);
router.get('/connect/:source', requireAuth, requireAdmin, renderConnectOAuth);
router.get('/callback/:source', oauthCallback); // OAuth callback called by provider/browser redirect
router.post('/callback/:source', oauthCallback);
router.get('/gdrive/files', requireAuth, requireAdmin, getGDriveFiles);
router.get('/notion/files', requireAuth, requireAdmin, getNotionFiles);
router.post('/notion/connect-key', requireAuth, requireAdmin, connectNotionToken);
router.post('/sync/:source', requireAuth, requireAdmin, syncIntegration);
router.delete('/:source', requireAuth, requireAdmin, disconnectIntegration);

export default router;
