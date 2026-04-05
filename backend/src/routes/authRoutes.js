import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  startGoogleAuth,
  handleGoogleCallback,
} from '../controllers/authController.js';
import authenticate from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/google', startGoogleAuth);
router.get('/google/callback', handleGoogleCallback);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);

export default router;
