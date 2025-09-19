import { Router } from 'express';
import scheduleRoutes from './schedule.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Schedule service is healthy',
    data: {
      service: 'schedule-service',
      status: 'running',
      timestamp: new Date().toISOString()
    }
  });
});

// Schedule routes
router.use('/api', scheduleRoutes);

export { router as routes };
