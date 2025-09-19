import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Identity service is healthy',
    data: {
      service: 'identity-service',
      status: 'running',
      timestamp: new Date().toISOString()
    }
  });
});

// Auth routes
router.use('/api/auth', authRoutes);

export { router as routes };
