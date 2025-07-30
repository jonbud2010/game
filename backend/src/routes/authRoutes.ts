import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/authController.js';
import { validateRegistration, validateLogin } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

export default router;