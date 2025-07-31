import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/authController';
import { validateRegistration, validateLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

export default router;