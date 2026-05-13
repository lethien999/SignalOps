#!/usr/bin/env node

/**
 * M13: Evaluate AI Anomaly Scoring against Historical Data
 *
 * This script:
 * 1. Queries historical events from MongoDB
 * 2. Scores each event using the anomaly scoring function
 * 3. Compares against actual alerts created
 * 4. Calculates precision/recall/F1 metrics
 * 5. Generates evaluation report
 *
 * Usage: node eval-ai-scoring.mjs
 *
 * Environment variables:
 *  - MONGODB_URI: MongoDB connection string
 *  - EVAL_DAYS: Days of historical data to evaluate (default: 30)
 *  - ANOMALY_THRESHOLD: Score threshold for classification (default: 65)
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import * as ort from 'onnxruntime-node';

const { Schema } = mongoose;

const EventSchema = new Schema(
  {
    deviceId: { type: String, required: true },
    metrics: {
      latency: { type: Number, default: 0 },
      packetLoss: { type: Number, default: 0 },
      signalStrength: { type: Number, default: -100 },
    },
    timestamp: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    alertId: { type: Schema.Types.ObjectId, ref: 'Alert' },
  },
  { timestamps: true }
);

const AlertSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    deviceId: { type: String, required: true },
    type: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

mongoose.model('Event', EventSchema);
mongoose.model('Alert', AlertSchema);

const MODEL_PATH = path.join(process.cwd(), 'apps/worker-service/src/assets/anomaly-model.onnx');

function softmax(values) {
  const maxValue = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - maxValue));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

function normalizeMetric(value, min, max) {
  if (max === min) return 0.5;
  const clamped = Math.min(Math.max(value ?? min, min), max);
  return (clamped - min) / (max - min);
}

function buildFeatureVector(metrics) {
  const latencyNorm = normalizeMetric(metrics?.latency ?? 0, 0, 500);
  const packetLossNorm = normalizeMetric(metrics?.packetLoss ?? 0, 0, 20);
  const signalStrengthNorm = normalizeMetric(metrics?.signalStrength ?? -80, -120, -40);
  const overallQuality = 1 - (latencyNorm + packetLossNorm + signalStrengthNorm) / 3;
  const now = new Date();

  return [
    latencyNorm,
    packetLossNorm,
    signalStrengthNorm,
    overallQuality,
    now.getHours(),
    now.getDay(),
  ];
}

let sessionPromise = null;

async function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_PATH).catch((error) => {
      console.warn(
        `⚠ Unable to load ONNX model at ${MODEL_PATH}; falling back to heuristic scoring`,
        error.message
      );
      return null;
    });
  }

  return sessionPromise;
}

// Connect to MongoDB
async function connectDB() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://user:password@localhost:27017/signalops-db';
  console.log(`Connecting to MongoDB: ${mongoUri.split('@')[1]}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// AI scoring function backed by the trained ONNX model, with heuristic fallback.
async function scoreEventAnomaly(metrics) {
  const session = await ensureSession();

  if (!session) {
    const latency = Math.min(Math.max(metrics.latency, 0), 500);
    const packetLoss = Math.min(Math.max(metrics.packetLoss, 0), 20);
    const signalStrength = Math.min(Math.max(metrics.signalStrength, -120), -40);

    const latencyScore = (latency / 500) * 100;
    const packetLossScore = (packetLoss / 20) * 100;
    const signalScore = ((Math.abs(signalStrength) - 40) / 80) * 100;

    const weightedScore = latencyScore * 0.05 + packetLossScore * 0.5 + signalScore * 0.45;
    const anomalyScore = Math.round(Math.min(Math.max(weightedScore, 0), 100));
    return {
      score: anomalyScore,
      label: anomalyScore > 75 ? 'anomalous' : anomalyScore > 50 ? 'suspicious' : 'normal',
    };
  }

  const features = buildFeatureVector(metrics);
  const input = new ort.Tensor('float32', Float32Array.from(features), [1, 6]);
  const inputName = session.inputNames[0];
  const outputName =
    session.outputNames.find((name) => name.toLowerCase().includes('prob')) ??
    session.outputNames[0];
  const output = await session.run({ [inputName]: input });
  const raw = output[outputName];

  const values = Array.from(raw.data).map((value) => Number(value));
  const probability =
    values.length > 1 ? softmax(values)[1] : Math.min(Math.max(values[0] ?? 0, 0), 1);
  const anomalyScore = Math.round(probability * 100);

  return {
    score: anomalyScore,
    label: anomalyScore > 75 ? 'anomalous' : anomalyScore > 50 ? 'suspicious' : 'normal',
  };
}

// Fetch events from MongoDB
async function fetchEvents(daysBack = 30) {
  const EventModel = mongoose.model('Event');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  console.log(`Fetching events from ${startDate.toISOString()} to now...`);

  const events = await EventModel.find({
    createdAt: { $gte: startDate },
  })
    .select('_id deviceId metrics timestamp alertId createdAt')
    .lean();

  console.log(`✓ Fetched ${events.length} events`);
  return events;
}

// Fetch alerts from MongoDB
async function fetchAlerts(daysBack = 30) {
  const AlertModel = mongoose.model('Alert');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  console.log(`Fetching alerts from ${startDate.toISOString()} to now...`);

  const alerts = await AlertModel.find({
    createdAt: { $gte: startDate },
  })
    .select('_id eventId deviceId type severity createdAt')
    .lean();

  console.log(`✓ Fetched ${alerts.length} alerts`);
  return alerts;
}

// Main evaluation function
async function evaluateAnomalyScoring() {
  const daysBack = parseInt(process.env.EVAL_DAYS || '30', 10);
  const anomalyThreshold = parseInt(process.env.ANOMALY_THRESHOLD || '65', 10);

  console.log(`\n📊 M13 AI Anomaly Scoring Evaluation`);
  console.log(`   Period: Last ${daysBack} days`);
  console.log(`   Threshold: ${anomalyThreshold}`);
  console.log('-----------------------------------\n');

  // Fetch data
  const events = await fetchEvents(daysBack);
  const alerts = await fetchAlerts(daysBack);

  if (events.length === 0) {
    console.warn('⚠️  No events found in the specified period');
    process.exit(0);
  }

  // Build alert map: eventId -> alert
  const alertMap = new Map();
  for (const alert of alerts) {
    if (alert.eventId) {
      alertMap.set(alert.eventId.toString(), alert);
    }
  }

  // Score each event and compare
  let tp = 0; // TP: anomaly predicted + alert exists
  let fp = 0; // FP: anomaly predicted + no alert
  let fn = 0; // FN: no anomaly + alert exists
  let tn = 0; // TN: no anomaly + no alert
  let errorCount = 0;

  const eventScores = [];

  for (const event of events) {
    try {
      const aiScore = await scoreEventAnomaly(event.metrics);
      const isAnomalous = aiScore.score >= anomalyThreshold;
      const alertExists = alertMap.has(event._id.toString());

      if (isAnomalous && alertExists) {
        tp++;
      } else if (isAnomalous && !alertExists) {
        fp++;
      } else if (!isAnomalous && alertExists) {
        fn++;
      } else {
        tn++;
      }

      eventScores.push({
        eventId: event._id,
        deviceId: event.deviceId,
        aiScore: aiScore.score,
        aiLabel: aiScore.label,
        alertExists,
        isAnomalous,
        metrics: event.metrics,
      });
    } catch (error) {
      console.error(`✗ Error scoring event ${event._id}:`, error.message);
      errorCount++;
    }
  }

  // Calculate metrics
  const totalEvents = events.length - errorCount;
  const precision = tp > 0 ? (tp / (tp + fp)) * 100 : 0;
  const recall = tp > 0 ? (tp / (tp + fn)) * 100 : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = ((tp + tn) / totalEvents) * 100;

  console.log(`Events analyzed: ${totalEvents}`);
  console.log(`Errors: ${errorCount}\n`);

  console.log(`Classification Results:`);
  console.log(`  True Positives (TP):  ${tp}`);
  console.log(`  False Positives (FP): ${fp}`);
  console.log(`  False Negatives (FN): ${fn}`);
  console.log(`  True Negatives (TN):  ${tn}\n`);

  console.log(`Metrics:`);
  console.log(`  Precision: ${precision.toFixed(2)}%`);
  console.log(`  Recall:    ${recall.toFixed(2)}%`);
  console.log(`  F1 Score:  ${f1.toFixed(2)}`);
  console.log(`  Accuracy:  ${accuracy.toFixed(2)}%\n`);

  // Interpretation
  console.log(`Interpretation:`);
  if (precision < 50) {
    console.log(`  ⚠️  Precision is low: many false positives (too many alerts)`);
  } else if (precision > 90) {
    console.log(`  ✓ Precision is high: few false positives`);
  }

  if (recall < 50) {
    console.log(`  ⚠️  Recall is low: missing many real anomalies (too few alerts)`);
  } else if (recall > 90) {
    console.log(`  ✓ Recall is high: catching most anomalies`);
  }

  // Generate report file
  const report = {
    timestamp: new Date().toISOString(),
    period: { daysBack, startDate: new Date(Date.now() - daysBack * 86400000).toISOString() },
    threshold: anomalyThreshold,
    summary: {
      totalEvents,
      errors: errorCount,
    },
    classification: { tp, fp, fn, tn },
    metrics: {
      precision: parseFloat(precision.toFixed(2)),
      recall: parseFloat(recall.toFixed(2)),
      f1: parseFloat(f1.toFixed(2)),
      accuracy: parseFloat(accuracy.toFixed(2)),
    },
    sampleMisclassifications: eventScores
      .filter((e) => e.isAnomalous !== e.alertExists)
      .slice(0, 10)
      .map((e) => ({
        eventId: e.eventId.toString(),
        deviceId: e.deviceId,
        aiScore: e.aiScore,
        alertExists: e.alertExists,
        metrics: e.metrics,
      })),
  };

  const reportPath = path.join(process.cwd(), 'evaluation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  return report;
}

// Main
(async () => {
  try {
    await connectDB();
    const report = await evaluateAnomalyScoring();

    console.log(`\n✓ Evaluation complete`);
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Evaluation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
