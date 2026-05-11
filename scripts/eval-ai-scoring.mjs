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

// Connect to MongoDB
async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://user:password@localhost:27017/signalops-db';
  console.log(`Connecting to MongoDB: ${mongoUri.split('@')[1]}`);
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Anomaly scoring function (mirror from worker-service)
function scoreEventAnomaly(metrics) {
  const latency = Math.min(Math.max(metrics.latency, 0), 500); // 0-500ms scale
  const packetLoss = Math.min(Math.max(metrics.packetLoss, 0), 20); // 0-20% scale
  const signalStrength = Math.min(Math.max(metrics.signalStrength, -120), -40); // -120 to -40 dBm scale

  // Weighted scoring: latency 5%, packet_loss 50%, signal_strength 45%
  const latencyScore = (latency / 500) * 100;
  const packetLossScore = (packetLoss / 20) * 100;
  const signalScore = ((Math.abs(signalStrength) - 40) / 80) * 100; // Invert: worse signal = higher score

  const weightedScore = latencyScore * 0.05 + packetLossScore * 0.5 + signalScore * 0.45;
  const anomalyScore = Math.round(Math.min(Math.max(weightedScore, 0), 100));

  let anomalyLabel = 'normal';
  if (anomalyScore > 75) {
    anomalyLabel = 'anomalous';
  } else if (anomalyScore > 50) {
    anomalyLabel = 'suspicious';
  }

  return {
    score: anomalyScore,
    label: anomalyLabel,
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
      const aiScore = scoreEventAnomaly(event.metrics);
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
