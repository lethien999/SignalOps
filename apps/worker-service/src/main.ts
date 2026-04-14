import { Worker, Queue } from 'bullmq';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { Logger } from './common/logger';
import { ThresholdDetector } from './services/threshold-detector';
import { AlertRepository } from './repositories/alert.repository';
import { EventRepository } from './repositories/event.repository';

async function bootstrap() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/signalops-db');
    Logger.info('Connected to MongoDB');

    // Setup Redis
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });

    // Initialize repositories
    const alertRepository = new AlertRepository();
    const eventRepository = new EventRepository();

    // Setup queue processing
    const queue = new Queue(process.env.QUEUE_EVENT_PROCESSING || 'event-processing', {
      connection: redis,
    });

    const worker = new Worker(
      process.env.QUEUE_EVENT_PROCESSING || 'event-processing',
      async (job) => {
        Logger.info(`Processing job ${job.id}`, job.data);

        try {
          const eventData = job.data;

          // Mark event as processed
          await eventRepository.updateProcessedTime(eventData._id);

          // Check thresholds
          const detectedAlerts = ThresholdDetector.detectAnomalies(eventData);

          // Create alerts if needed
          for (const alertType of detectedAlerts) {
            const alert = {
              deviceId: eventData.deviceId,
              type: alertType.type,
              severity: alertType.severity,
              location: eventData.location,
              message: alertType.message,
              status: 'open',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await alertRepository.create(alert);
            Logger.info(`Alert created: ${alertType.type}`, alert);
          }

          return { success: true, alertsCreated: detectedAlerts.length };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          Logger.error(`Job processing failed: ${errorMessage}`, error);
          throw error;
        }
      },
      {
        connection: redis,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
      },
    );

    worker.on('completed', (job) => {
      Logger.info(`Job completed: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      Logger.error(`Job failed: ${job?.id || 'unknown'}`, err);
    });

    Logger.info(`Worker started with ${process.env.WORKER_CONCURRENCY || 5} concurrency`);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      Logger.info('SIGTERM received, shutting down worker...');
      await worker.close();
      await mongoose.disconnect();
      process.exit(0);
    });
  } catch (error) {
    Logger.error('Failed to start worker', error);
    process.exit(1);
  }
}

bootstrap();
