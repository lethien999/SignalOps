import { Worker, Queue } from 'bullmq';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { Logger } from './common/logger';
import { ThresholdDetector } from './services/threshold-detector';
import { AlertRepository } from './repositories/alert.repository';
import { EventRepository } from './repositories/event.repository';

type WorkerJobPayload = {
  _id: string;
  deviceId: string;
  location: {
    lat: number;
    lng: number;
    name?: string;
  };
  metrics: {
    latency: number;
    packetLoss: number;
    signalStrength: number;
  };
  eventData?: unknown;
};

type WorkerAlertResult = {
  type: 'latency' | 'packet_loss' | 'signal';
  severity: 'low' | 'medium' | 'high';
  message: string;
};

type WorkerContext = {
  redis: Redis;
  pubSubRedis: Redis;
  queue: Queue;
  dlq: Queue;
  worker: Worker;
};

function resolveQueueName(): string {
  return process.env.QUEUE_EVENT_PROCESSING || 'event-processing';
}

function createRedisConnection(): Redis {
  // BullMQ expects maxRetriesPerRequest to be null for worker connections.
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
  });
}

function createQueuePair(redis: Redis): { queue: Queue; dlq: Queue } {
  const queueName = resolveQueueName();

  return {
    queue: new Queue(queueName, { connection: redis }),
    dlq: new Queue(`${queueName}-dlq`, { connection: redis }),
  };
}

function buildAlertDocument(eventData: WorkerJobPayload, alertType: WorkerAlertResult) {
  const alertId = `${eventData.deviceId}-${alertType.type}-${Date.now()}`;
  const safeLocation = {
    lat: eventData.location.lat,
    lng: eventData.location.lng,
    ...(eventData.location.name ? { name: eventData.location.name } : {}),
  };

  return {
    alertId,
    deviceId: eventData.deviceId,
    type: alertType.type,
    severity: alertType.severity,
    location: safeLocation,
    message: alertType.message,
    status: 'open' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    eventId: eventData._id.toString(),
  };
}

async function handleAlertCreation(
  eventId: string,
  eventData: WorkerJobPayload,
  detectedAlerts: WorkerAlertResult[],
  alertRepository: AlertRepository,
  eventRepository: EventRepository,
  pubSubRedis: Redis,
): Promise<number> {
  let createdCount = 0;

  for (const alertType of detectedAlerts) {
    const existingAlert = await alertRepository.findOpenDuplicate(eventData.deviceId, alertType.type);

    if (existingAlert) {
      Logger.info(`Skipping duplicate open alert for ${eventData.deviceId}/${alertType.type}`);
      continue;
    }

    const alert = buildAlertDocument(eventData, alertType);
    const savedAlert = await alertRepository.create(alert);

    // Link the originating event to the newly created alert for traceability.
    await eventRepository.linkAlert(eventId, savedAlert._id.toString());

    await pubSubRedis.publish(
      'alerts:created',
      JSON.stringify({
        id: savedAlert._id.toString(),
        alertId: savedAlert.alertId,
        type: savedAlert.type,
        severity: savedAlert.severity,
        location: savedAlert.location,
        message: savedAlert.message,
        timestamp: new Date().toISOString(),
        deviceId: savedAlert.deviceId,
      }),
    );

    Logger.info(`Alert created: ${alertType.type}`, alert);
    createdCount += 1;
  }

  return createdCount;
}

function createWorker(
  redis: Redis,
  pubSubRedis: Redis,
  alertRepository: AlertRepository,
  eventRepository: EventRepository,
): Worker {
  return new Worker(
    resolveQueueName(),
    async (job) => {
      Logger.info(`Processing job ${job.id}`, job.data);

      try {
          const eventData = (job.data?.eventData || job.data) as WorkerJobPayload;

        if (!eventData._id) {
          throw new Error('Event job payload missing _id');
        }

        const eventId = eventData._id;

        await eventRepository.updateProcessedTime(eventId);

        const detectedAlerts = ThresholdDetector.detectAnomalies(eventData);
        const createdCount = await handleAlertCreation(
          eventId,
          eventData,
          detectedAlerts,
          alertRepository,
          eventRepository,
          pubSubRedis,
        );

        // Publish event:processed to Redis Pub/Sub for API Gateway to broadcast via WebSocket
        const eventProcessedPayload = JSON.stringify({
          id: eventData._id,
          deviceId: eventData.deviceId,
          location: eventData.location,
          metrics: eventData.metrics,
          timestamp: new Date().toISOString(),
          alertsCreated: createdCount,
        });
        await pubSubRedis.publish('events:processed', eventProcessedPayload);

        return { success: true, alertsCreated: createdCount };
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
}

function registerWorkerEvents(worker: Worker, dlq: Queue): void {
  const maxAttempts = parseInt(process.env.WORKER_MAX_ATTEMPTS || '3', 10);

  worker.on('completed', (job) => {
    Logger.info(`Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    Logger.error(`Job failed: ${job?.id || 'unknown'}`, err);

    if (job && job.attemptsMade >= maxAttempts) {
      void dlq.add('failed-event', {
        jobId: job.id,
        reason: err instanceof Error ? err.message : String(err),
        payload: job.data,
        failedAt: new Date().toISOString(),
      });
    }
  });
}

function registerShutdown(worker: Worker, queue: Queue, dlq: Queue, redis: Redis, pubSubRedis: Redis): void {
  process.on('SIGTERM', async () => {
    Logger.info('SIGTERM received, shutting down worker...');
    await worker.close();
    await queue.close();
    await dlq.close();
    await redis.quit();
    await pubSubRedis.quit();
    await mongoose.disconnect();
    process.exit(0);
  });
}

async function bootstrap() {
  let context: WorkerContext | null = null;

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/signalops-db');
    Logger.info('Connected to MongoDB');

    const redis = createRedisConnection();
    const pubSubRedis = createRedisConnection(); // Separate connection for Pub/Sub
    const { queue, dlq } = createQueuePair(redis);
    const alertRepository = new AlertRepository();
    const eventRepository = new EventRepository();
    const worker = createWorker(redis, pubSubRedis, alertRepository, eventRepository);

    context = { redis, pubSubRedis, queue, dlq, worker };
    registerWorkerEvents(worker, dlq);
    registerShutdown(worker, queue, dlq, redis, pubSubRedis);

    Logger.info(`Worker started with ${process.env.WORKER_CONCURRENCY || 5} concurrency`);
  } catch (error) {
    Logger.error('Failed to start worker', error);

    if (context) {
      await context.worker?.close().catch(() => undefined);
      await context.queue?.close().catch(() => undefined);
      await context.dlq?.close().catch(() => undefined);
      await context.redis?.quit().catch(() => undefined);
      await context.pubSubRedis?.quit().catch(() => undefined);
    }

    process.exit(1);
  }
}

bootstrap();
