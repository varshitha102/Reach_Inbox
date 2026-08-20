import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './database/client.js';
import { redis } from './utils/redis.js';
import { EmailSenderService } from './services/emailSenderService.js';
import { EmailQueue } from './queue/queue.js';
import { logger } from './utils/logger.js';
import routes from './routes/index.js';
import { initializeSupabase } from './services/supabaseService.js';

const app = express();

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', routes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Express error', { error: err.message });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

let server: any;

async function startServer() {
  try {
    console.log('=== BACKEND STARTUP DEBUG ===');
    console.log('Starting server initialization...');
    console.log('PORT:', config.port);
    console.log('NODE_ENV:', config.nodeEnv);
    console.log('DATABASE_URL configured:', !!process.env.DATABASE_URL);
    console.log('REDIS_URL configured:', !!process.env.REDIS_URL);
    
    await connectDatabase();
    logger.info('Database connected successfully');
    console.log('✓ Database connected');
    
    await EmailSenderService.initialize();
    logger.info('SMTP transporter verified successfully');
    console.log('✓ SMTP initialized');

    initializeSupabase();

    server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`API server running on port ${config.port}`);
      console.log(`✓ Server listening on port ${config.port}`);
      console.log('=== BACKEND STARTUP COMPLETE ===');
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    console.error('✗ Server startup failed:', error);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down gracefully...');
  
  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      logger.info('Express server closed');
    }

    await EmailQueue.close();
    logger.info('EmailQueue closed');

    await EmailSenderService.close();
    logger.info('EmailSenderService closed');

    await disconnectDatabase();
    logger.info('Database disconnected');

    await redis.quit();
    logger.info('Redis disconnected');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();
