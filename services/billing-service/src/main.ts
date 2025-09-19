import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Health check route
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    message: 'Billing service is healthy',
    data: {
      service: 'billing-service',
      status: 'running',
      timestamp: new Date().toISOString()
    }
  });
});

// Basic route
app.get('/', (req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    message: 'Billing service is running',
    data: {
      service: 'billing-service',
      version: '0.1.0'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null
  });
});

const port = process.env.PORT || 3004;
app.listen(port, () => {
  console.log(`billing-service listening on port ${port}`);
});
