import { Worker, Queue } from 'bullmq';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { Logger } from './common/logger';
import { buildAlertDocument } from './services/alert-factory';
import { ThresholdDetector } from './services/threshold-detector';
import { AlertRepository } from './repositories/alert.repository';
import { EventRepository } from './repositories/event.repository';
import { DeviceMaintenanceRepository } from './repositories/device-maintenance.repository';
import { NotificationWebhookRepository } from './repositories/notification-webhook.repository';
import { NotificationWebhookService } from './services/notification-webhook.service';
import { ThresholdProfileRepository } from './repositories/threshold-profile.repository';
import { initMLModel, scoreEventAnomaly } from './services/anomaly-scoring';
import {
  getRedisQueueConfig,
  createRedisPubSubClient,
  CorrelationContextManager,
  initializeTracing,
  shutdownTracing,
} from '@signalops/common';

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
  severity: 'low' | 'warning' | 'medium' | 'high' | 'critical';
  message: string;
};

type AiAnomalyPayload = {
  aiModelVersion: string;
  anomalyScore: number;
  anomalyConfidence: number;
  anomalyLabel: 'normal' | 'suspicious' | 'anomalous';
  anomalyReasons: string[];
};

type WorkerContext = {
  redis: Redis;
  pubSubRedis: Redis;
  queue: Queue;
  dlq: Queue;
  worker: Worker;
};

function isRedisEnabled(): boolean {
  return String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';
}

function resolveQueueName(): string {
  return process.env.QUEUE_EVENT_PROCESSING || 'event-processing';
}

function createRedisConnection(): Redis {
  return new Redis(getRedisQueueConfig());
}

function createQueuePair(redis: Redis): { queue: Queue; dlq: Queue } {
  const queueName = resolveQueueName();

  return {
    queue: new Queue(queueName, { connection: redis }),
    dlq: new Queue(`${queueName}-dlq`, { connection: redis }),
  };
}

async function handleAlertCreation(
  eventId: string,
  eventData: WorkerJobPayload,
  detectedAlerts: WorkerAlertResult[],
  aiAnomaly: AiAnomalyPayload,
  alertRepository: AlertRepository,
  eventRepository: EventRepository,
  pubSubRedis: Redis,
  notificationWebhookService: NotificationWebhookService
): Promise<number> {
  let createdCount = 0;

  for (const alertType of detectedAlerts) {
    const existingAlert = await alertRepository.findOpenDuplicate(
      eventData.deviceId,
      alertType.type
    );

    if (existingAlert) {
      Logger.info(`Skipping duplicate open alert for ${eventData.deviceId}/${alertType.type}`);
      continue;
    }

    const alert = buildAlertDocument(eventData, alertType);
    const aiTaggedAlert = {
      ...alert,
      aiModelVersion: aiAnomaly.aiModelVersion,
      anomalyScore: aiAnomaly.anomalyScore,
      anomalyConfidence: aiAnomaly.anomalyConfidence,
      anomalyLabel: aiAnomaly.anomalyLabel,
      anomalyReasons: aiAnomaly.anomalyReasons,
    };
    const savedAlert = await alertRepository.create(aiTaggedAlert);

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
      })
    );

    await notificationWebhookService.notifyAlertCreated({
      id: savedAlert._id.toString(),
      alertId: savedAlert.alertId,
      deviceId: savedAlert.deviceId,
      type: savedAlert.type,
      severity: savedAlert.severity,
      message: savedAlert.message,
      anomalyScore: aiAnomaly.anomalyScore,
      anomalyConfidence: aiAnomaly.anomalyConfidence,
      anomalyLabel: aiAnomaly.anomalyLabel,
      location: savedAlert.location
        ? {
            lat: savedAlert.location.lat,
            lng: savedAlert.location.lng,
            ...(savedAlert.location.name ? { name: savedAlert.location.name } : {}),
          }
        : undefined,
      timestamp: new Date().toISOString(),
    });

    Logger.info(`Alert created: ${alertType.type}`, alert);
    createdCount += 1;
  }

  return createdCount;
}

async function handleAutoResolve(
  eventData: WorkerJobPayload,
  detectedAlerts: WorkerAlertResult[],
  alertRepository: AlertRepository,
  pubSubRedis: Redis,
  thresholdProfile?: {
    latencyWarningMs: number;
    latencyCriticalMs: number;
    packetLossWarningPercent: number;
    packetLossCriticalPercent: number;
    signalWarningDbm: number;
    signalCriticalDbm: number;
  } | null
): Promise<number> {
  if (detectedAlerts.length > 0) return 0;

  const minOpenMinutes = parseInt(process.env.AUTO_RESOLVE_MIN_OPEN_MINUTES || '2', 10);
  const openAlerts = await alertRepository.findOpenAlertsByDevice(
    eventData.deviceId,
    minOpenMinutes
  );
  if (!openAlerts || openAlerts.length === 0) return 0;

  let resolvedCount = 0;
  for (const alert of openAlerts) {
    const alertType = alert.type as 'latency' | 'packet_loss' | 'signal';
    const isNormal = ThresholdDetector.isMetricNormal(
      alertType,
      eventData.metrics,
      thresholdProfile
    );

    if (isNormal) {
      const resolvedAlert = await alertRepository.autoResolve(alert._id.toString());
      await pubSubRedis.publish(
        'alerts:resolved',
        JSON.stringify({
          id: alert._id.toString(),
          alertId: alert.alertId,
          type: alert.type,
          severity: alert.severity,
          status: 'resolved',
          resolvedBy: 'system-auto',
          resolvedAt: resolvedAlert?.resolvedAt || new Date().toISOString(),
          resolutionNote: `Auto-resolved after ${minOpenMinutes} minutes of healthy metrics`,
          message: 'Auto-resolved: metric returned to normal',
          timestamp: new Date().toISOString(),
          deviceId: eventData.deviceId,
          autoResolved: true,
        })
      );
      Logger.info(`Auto-resolved alert ${alert._id} for ${eventData.deviceId}/${alertType}`);
      resolvedCount++;
    }
  }

  return resolvedCount;
}

function createWorker(
  redis: Redis,
  pubSubRedis: Redis,
  alertRepository: AlertRepository,
  eventRepository: EventRepository,
  deviceMaintenanceRepository: DeviceMaintenanceRepository,
  thresholdProfileRepository: ThresholdProfileRepository,
  notificationWebhookService: NotificationWebhookService
): Worker {
  return new Worker(
    resolveQueueName(),
    async (job) => {
      const correlationId = job.data?._id || job.id || 'unknown';
      const tracer = trace.getTracer('signalops-worker-service');

      return CorrelationContextManager.runAsync(correlationId, async () => {
        return tracer.startActiveSpan('worker.process-event', async (span) => {
          span.setAttribute('messaging.system', 'bullmq');
          span.setAttribute('messaging.destination', resolveQueueName());
          span.setAttribute('signalops.correlation_id', correlationId);
          span.setAttribute('signalops.job_id', String(job.id || 'unknown'));

          Logger.info(`Processing job ${job.id}`, job.data);

          try {
            const eventData = (job.data?.eventData || job.data) as WorkerJobPayload;

            if (!eventData._id) {
              throw new Error('Event job payload missing _id');
            }

            const eventId = eventData._id;
            await eventRepository.updateProcessedTime(eventId);

            const thresholdProfile = await thresholdProfileRepository.findEffective(
              eventData.deviceId
            );
            const aiAnomaly = await scoreEventAnomaly(
              eventData.metrics,
              thresholdProfile || undefined
            );

            const activeMaintenance = await deviceMaintenanceRepository.findEnabledByDeviceId(
              eventData.deviceId
            );
            if (activeMaintenance) {
              Logger.info('Skipping alert creation because the device is under maintenance', {
                deviceId: eventData.deviceId,
                reason: activeMaintenance.reason,
              });

              const eventProcessedPayload = JSON.stringify({
                id: eventData._id,
                deviceId: eventData.deviceId,
                location: eventData.location,
                metrics: eventData.metrics,
                timestamp: new Date().toISOString(),
                alertsCreated: 0,
                alertsSuppressed: true,
                suppressionReason: activeMaintenance.reason,
              });
              await pubSubRedis.publish('events:processed', eventProcessedPayload);

              span.setStatus({ code: SpanStatusCode.OK });
              return { success: true, alertsCreated: 0, alertsSuppressed: true };
            }

            let detectedAlerts = ThresholdDetector.detectAnomalies(
              eventData,
              thresholdProfile || undefined
            );
            const rolloutPercent = parseInt(process.env.AI_ROLLOUT_PERCENT || '0', 10);
            const aiAbTestEnabled =
              String(process.env.AI_AB_TEST || 'false').toLowerCase() === 'true';
            const inRollout =
              aiAbTestEnabled && rolloutPercent > 0 && Math.random() * 100 < rolloutPercent;

            if (inRollout) {
              if (aiAnomaly && aiAnomaly.anomalyLabel === 'anomalous') {
                const reasonsText = (aiAnomaly.anomalyReasons || []).join(' ').toLowerCase();
                const inferType = () => {
                  if (reasonsText.includes('latency')) return 'latency';
                  if (reasonsText.includes('packet')) return 'packet_loss';
                  if (reasonsText.includes('signal')) return 'signal';
                  return 'latency';
                };
                const severityForScore = (score: number) => {
                  if (score >= 90) return 'critical';
                  if (score >= 75) return 'high';
                  if (score >= 55) return 'medium';
                  if (score >= 35) return 'warning';
                  return 'low';
                };

                detectedAlerts = [
                  {
                    type: inferType() as 'latency' | 'packet_loss' | 'signal',
                    severity: severityForScore(aiAnomaly.anomalyScore) as any,
                    message: `AI-driven alert (A/B) - score ${aiAnomaly.anomalyScore}`,
                  },
                ];
                Logger.info('In A/B rollout: using AI decision for alert creation', {
                  deviceId: eventData.deviceId,
                  score: aiAnomaly.anomalyScore,
                });
              } else {
                detectedAlerts = [];
                Logger.info('In A/B rollout: ML classified event as normal, suppressing alerts', {
                  deviceId: eventData.deviceId,
                  score: aiAnomaly?.anomalyScore,
                });
              }
            }

            const createdCount = await handleAlertCreation(
              eventId,
              eventData,
              detectedAlerts,
              aiAnomaly,
              alertRepository,
              eventRepository,
              pubSubRedis,
              notificationWebhookService
            );

            const autoResolvedCount = await handleAutoResolve(
              eventData,
              detectedAlerts,
              alertRepository,
              pubSubRedis,
              thresholdProfile || undefined
            );
            if (autoResolvedCount > 0) {
              Logger.info(`Auto-resolved ${autoResolvedCount} alerts for ${eventData.deviceId}`);
            }

            const eventProcessedPayload = JSON.stringify({
              id: eventData._id,
              deviceId: eventData.deviceId,
              location: eventData.location,
              metrics: eventData.metrics,
              timestamp: new Date().toISOString(),
              alertsCreated: createdCount,
              aiModelVersion: aiAnomaly.aiModelVersion,
              anomalyScore: aiAnomaly.anomalyScore,
              anomalyConfidence: aiAnomaly.anomalyConfidence,
              anomalyLabel: aiAnomaly.anomalyLabel,
              anomalyReasons: aiAnomaly.anomalyReasons,
            });
            await pubSubRedis.publish('events:processed', eventProcessedPayload);

            span.setStatus({ code: SpanStatusCode.OK });
            return { success: true, alertsCreated: createdCount };
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            span.recordException(error instanceof Error ? error : new Error(errorMessage));
            span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
            Logger.error(`Job processing failed: ${errorMessage}`, error);
            throw error;
          } finally {
            span.end();
          }
        });
      });
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    }
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

function registerDlqMonitoring(dlq: Queue, pubSubRedis: Redis): NodeJS.Timeout {
  const intervalMs = 5 * 60 * 1000;

  return setInterval(() => {
    void (async () => {
      try {
        const count = await dlq.count();

        if (count > 0) {
          await pubSubRedis.publish(
            'dlq:status',
            JSON.stringify({
              queue: dlq.name,
              failedJobs: count,
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch (error) {
        Logger.error('Failed to publish DLQ status', error);
      }
    })();
  }, intervalMs);
}

function registerShutdown(
  worker: Worker,
  queue: Queue,
  dlq: Queue,
  redis: Redis,
  pubSubRedis: Redis
): void {
  let dlqMonitorTimer: NodeJS.Timeout | null = null;

  const attachMonitor = () => {
    if (!dlqMonitorTimer) {
      dlqMonitorTimer = registerDlqMonitoring(dlq, pubSubRedis);
    }
  };

  attachMonitor();

  const shutdown = async (signal: 'SIGTERM' | 'SIGINT') => {
    Logger.info(`${signal} received, shutting down worker...`);
    await shutdownTracing();
    if (dlqMonitorTimer) {
      clearInterval(dlqMonitorTimer);
      dlqMonitorTimer = null;
    }
    await worker.close();
    await queue.close();
    await dlq.close();
    await redis.quit();
    await pubSubRedis.quit();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', async () => {
    await shutdown('SIGTERM');
  });

  process.on('SIGINT', async () => {
    await shutdown('SIGINT');
  });
}

async function bootstrap() {
  // Initialize OpenTelemetry tracing first
  await initializeTracing('signalops-worker-service');

  let context: WorkerContext | null = null;

  try {
    if (!isRedisEnabled()) {
      Logger.info('Worker service disabled for local development');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/signalops-db');
    Logger.info('Connected to MongoDB');

    const redis = createRedisConnection();
    const pubSubRedis = createRedisPubSubClient(); // Separate connection for Pub/Sub
    const { queue, dlq } = createQueuePair(redis);
    const alertRepository = new AlertRepository();
    const eventRepository = new EventRepository();
    const deviceMaintenanceRepository = new DeviceMaintenanceRepository();
    const notificationWebhookRepository = new NotificationWebhookRepository();
    const notificationWebhookService = new NotificationWebhookService(
      notificationWebhookRepository
    );
    const thresholdProfileRepository = new ThresholdProfileRepository();
    await initMLModel();
    const worker = createWorker(
      redis,
      pubSubRedis,
      alertRepository,
      eventRepository,
      deviceMaintenanceRepository,
      thresholdProfileRepository,
      notificationWebhookService
    );

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
