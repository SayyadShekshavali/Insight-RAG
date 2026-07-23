import { Router } from 'express';
import { getUsers, updateUserRole, updateUserStatus, inviteUser, bulkAction } from './users.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', getUsers);
router.put('/role/:id', updateUserRole);
router.put('/status/:id', updateUserStatus);
router.post('/invite', inviteUser);
router.post('/bulk', bulkAction);

export default router;
