import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || process.env.MONGODB_INITDB_DATABASE || 'signalops-db';

async function main() {
  console.log('Connecting to', uri);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // Create collections if not exist
  const existing = await db.listCollections().toArray();
  const names = existing.map((c) => c.name);

  const want = ['events', 'alerts', 'failed_events', 'api_keys'];
  for (const name of want) {
    if (!names.includes(name)) {
      console.log('Creating collection', name);
      await db.createCollection(name);
    } else {
      console.log('Collection exists', name);
    }
  }

  // Create indexes
  console.log('Creating indexes...');
  async function createIndexSafe(col, spec, opts) {
    try {
      await db.collection(col).createIndex(spec, opts);
      console.log('Index created on', col, JSON.stringify(spec), opts || '');
    } catch (err) {
      if (err && err.codeName === 'IndexOptionsConflict') {
        console.log('Index options conflict for', col, JSON.stringify(spec), '- skipping');
      } else {
        console.error('Index create error', col, err.message || err);
      }
    }
  }

  await createIndexSafe('events', { deviceId: 1, timestamp: -1 });
  await createIndexSafe('events', { timestamp: -1 });
  // optional TTL for events (30 days)
  await createIndexSafe('events', { timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

  await db.collection('alerts').createIndex({ status: 1, deviceId: 1, createdAt: -1 });
  await db.collection('alerts').createIndex({ resolvedAt: 1 });
  await db.collection('alerts').createIndex({ message: 'text' });

  await db.collection('failed_events').createIndex({ retryCount: 1 });
  await db.collection('failed_events').createIndex({ nextRetryAt: 1 });

  await createIndexSafe('api_keys', { key: 1 }, { unique: true });

  // Seed a sample api key if none exists (for local demo)
  const keyCount = await db.collection('api_keys').countDocuments();
  if (keyCount === 0) {
    const sample = {
      key: process.env.SIGNALOPS_API_KEY || 'signalops-local-key',
      name: 'local-demo',
      createdAt: new Date(),
      active: true,
    };
    await db.collection('api_keys').insertOne(sample);
    console.log('Inserted sample api key');
  }

  console.log('Done');
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
