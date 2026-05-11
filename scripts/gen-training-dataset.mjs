#!/usr/bin/env node

/**
 * M13: Generate Training Dataset for ML Model
 * 
 * This script:
 * 1. Queries historical events from MongoDB
 * 2. Extracts normalized features
 * 3. Labels data based on whether alerts were created
 * 4. Exports as training dataset (CSV)
 * 
 * Usage: node gen-training-dataset.mjs
 * 
 * Environment variables:
 *  - MONGODB_URI: MongoDB connection string
 *  - DATASET_DAYS: Days of historical data (default: 30)
 *  - OUTPUT_FILE: Output CSV path (default: training-dataset.csv)
 *  - CONTEXT_WINDOW: Events to consider for volatility/change (default: 5)
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv/sync';

// Import feature extraction (simplified inline for mjs compatibility)
function normalizeMinMax(value, min, max) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function normalizeLatency(latency) {
  return normalizeMinMax(Math.min(Math.max(latency, 0), 500), 0, 500);
}

function normalizePacketLoss(packetLoss) {
  return normalizeMinMax(Math.min(Math.max(packetLoss, 0), 20), 0, 20);
}

function normalizeSignalStrength(signalStrength) {
  return normalizeMinMax(Math.min(Math.max(signalStrength, -120), -40), -120, -40);
}

function normalizeMetrics(metrics) {
  const latency_norm = normalizeLatency(metrics.latency);
  const packetLoss_norm = normalizePacketLoss(metrics.packetLoss);
  const signalStrength_norm = normalizeSignalStrength(metrics.signalStrength);
  const overall_quality = 1 - (latency_norm + packetLoss_norm + signalStrength_norm) / 3;

  return {
    latency_norm,
    packetLoss_norm,
    signalStrength_norm,
    overall_quality,
  };
}

function extractEventFeatures(event) {
  const normalized = normalizeMetrics(event.metrics);

  return {
    latency_norm: normalized.latency_norm,
    packetLoss_norm: normalized.packetLoss_norm,
    signalStrength_norm: normalized.signalStrength_norm,
    overall_quality: normalized.overall_quality,
    hour_of_day: new Date(event.timestamp).getHours(),
    day_of_week: new Date(event.timestamp).getDay(),
    deviceId: event.deviceId,
    timestamp: event.timestamp,
  };
}

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://user:password@localhost:27017/signalops-db';
  console.log(`Connecting to MongoDB...`);

  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function generateTrainingDataset() {
  const datasetDays = parseInt(process.env.DATASET_DAYS || '30', 10);
  const outputFile = process.env.OUTPUT_FILE || 'training-dataset.csv';
  const contextWindow = parseInt(process.env.CONTEXT_WINDOW || '5', 10);

  console.log(`\n📊 M13 Training Dataset Generation`);
  console.log(`   Period: Last ${datasetDays} days`);
  console.log(`   Output: ${outputFile}`);
  console.log(`   Context window: ${contextWindow} events`);
  console.log('-----------------------------------\n');

  // Fetch events
  const EventModel = mongoose.model('Event');
  const AlertModel = mongoose.model('Alert');
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - datasetDays);

  console.log(`Fetching events from ${startDate.toISOString()} to now...`);
  const events = await EventModel.find({
    createdAt: { $gte: startDate },
  })
    .select('_id deviceId metrics timestamp createdAt')
    .lean()
    .sort({ timestamp: 1 });

  console.log(`✓ Fetched ${events.length} events`);

  // Fetch alerts and build map
  console.log(`Fetching alerts...`);
  const alerts = await AlertModel.find({
    createdAt: { $gte: startDate },
  })
    .select('_id eventId createdAt')
    .lean();

  const alertEventIds = new Set(
    alerts.map((a) => a.eventId?.toString()).filter(Boolean),
  );
  console.log(`✓ Fetched ${alerts.length} alerts (${alertEventIds.size} unique events)`);

  // Extract features
  console.log(`\nExtracting features...`);
  const features = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    try {
      const baseFeatures = extractEventFeatures(event);

      // Check if alert exists for this event
      const anomalous = alertEventIds.has(event._id.toString()) ? 1 : 0;

      features.push({
        eventId: event._id.toString(),
        ...baseFeatures,
        anomalous,
      });

      if ((i + 1) % 100 === 0) {
        console.log(`  Processed ${i + 1}/${events.length} events...`);
      }
    } catch (error) {
      console.error(`  ✗ Error processing event ${event._id}:`, error.message);
    }
  }

  console.log(`✓ Extracted features from ${features.length} events\n`);

  // Generate statistics
  const normalCount = features.filter((f) => f.anomalous === 0).length;
  const anomalousCount = features.filter((f) => f.anomalous === 1).length;
  const ratio = anomalousCount > 0 ? (anomalousCount / features.length * 100).toFixed(1) : 0;

  console.log(`Dataset Statistics:`);
  console.log(`  Normal events: ${normalCount} (${(100 - ratio)}%)`);
  console.log(`  Anomalous events: ${anomalousCount} (${ratio}%)`);
  console.log(`  Class imbalance ratio: 1:${(normalCount / Math.max(anomalousCount, 1)).toFixed(1)}\n`);

  // Export to CSV
  console.log(`Exporting to CSV...`);
  const csvHeaders = [
    'eventId',
    'deviceId',
    'timestamp',
    'latency_norm',
    'packetLoss_norm',
    'signalStrength_norm',
    'overall_quality',
    'hour_of_day',
    'day_of_week',
    'anomalous',
  ];

  let csvContent = csvHeaders.join(',') + '\n';

  for (const feature of features) {
    const row = [
      feature.eventId,
      feature.deviceId,
      new Date(feature.timestamp).toISOString(),
      feature.latency_norm.toFixed(4),
      feature.packetLoss_norm.toFixed(4),
      feature.signalStrength_norm.toFixed(4),
      feature.overall_quality.toFixed(4),
      feature.hour_of_day,
      feature.day_of_week,
      feature.anomalous,
    ];
    csvContent += row.join(',') + '\n';
  }

  fs.writeFileSync(outputFile, csvContent);
  console.log(`✓ Dataset exported to: ${outputFile}`);

  // Summary
  const fileSize = (fs.statSync(outputFile).size / 1024).toFixed(1);
  console.log(`  File size: ${fileSize} KB`);
  console.log(`  Total samples: ${features.length}`);
  console.log(`\n✓ Training dataset generation complete`);

  return {
    outputFile,
    samples: features.length,
    normalCount,
    anomalousCount,
    imbalanceRatio: normalCount / Math.max(anomalousCount, 1),
  };
}

// Main
(async () => {
  try {
    await connectDB();
    const result = await generateTrainingDataset();
    console.log(`\nReady for ML training with ${result.samples} samples`);
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Dataset generation failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
