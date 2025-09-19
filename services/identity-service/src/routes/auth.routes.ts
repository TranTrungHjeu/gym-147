import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = Router();
const authController = new AuthController();

// Auth routes
router.post('/login', (req, res) => authController.login(req, res));
router.post('/register', (req, res) => authController.register(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/profile', (req, res) => authController.getProfile(req, res));

export default router;