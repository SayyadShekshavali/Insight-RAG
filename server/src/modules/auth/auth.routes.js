import { Router } from 'express';
import { signup, login, refresh, logout } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, signupSchema } from './auth.validation.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);

export default router;
