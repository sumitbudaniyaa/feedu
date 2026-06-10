import { Router } from 'express';
import { loginSchema, refreshSchema, registerSchema } from '@feedo/types';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/http.js';
import * as controller from './auth.controller.js';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(controller.register));
router.post('/login', validate(loginSchema), asyncHandler(controller.login));
router.post('/refresh', validate(refreshSchema), asyncHandler(controller.refresh));
router.get('/me', authenticate, asyncHandler(controller.me));

export default router;
