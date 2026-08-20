import { connectDatabase, disconnectDatabase } from './database/client.js';
import { startWorker, gracefulShutdown as workerGracefulShutdown } from './workers/emailWorker.js';
import { logger } from './utils/logger.js';

async function startWorkerProcess() {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');
    
    await startWorker();
    logger.info('Worker process started successfully');
  } catch (error) {
    logger.error('Failed to start worker process', { error });
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down worker process gracefully...');
  
  try {
    await workerGracefulShutdown();
    await disconnectDatabase();
    logger.info('Worker process shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during worker shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startWorkerProcess();
