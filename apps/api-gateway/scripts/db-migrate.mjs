import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../../../.env') });

function isRunningInDocker() {
  return process.platform !== 'win32' && path.resolve('/') === '/' && Boolean(process.env.DOCKER_CONTAINER || process.env.container || process.env.KUBERNETES_SERVICE_HOST || process.env.CI);
}

function buildMongoUri() {
  const rawUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

  try {
    const parsed = new URL(rawUri);
    const host = parsed.hostname;

    if (!isRunningInDocker() && host === 'mongodb') {
      parsed.hostname = 'localhost';
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return rawUri;
  }
}

const uri = buildMongoUri();
const dbName = process.env.MONGODB_DB || process.env.MONGODB_INITDB_DATABASE || 'signalops-db';
const command = process.argv[2] || 'up';

function resolveMongoHostLabel() {
  try {
    const host = new URL(uri).hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'localhost (host)';
    }

    return host;
  } catch {
    return 'unknown';
  }
}

async function withDb(handler) {
  console.log(`Using MongoDB URI: ${uri} [${resolveMongoHostLabel()}]`);
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    return await handler(db);
  } finally {
    await client.close();
  }
}

async function createCollectionIfMissing(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name);
    console.log('Created collection:', name);
  }
}

async function createIndexSafe(db, collection, spec, options) {
  try {
    await db.collection(collection).createIndex(spec, options);
    console.log('Created index on', collection, JSON.stringify(spec));
  } catch (error) {
    if (error && error.codeName === 'IndexOptionsConflict') {
      console.log('Index already exists with different options on', collection, JSON.stringify(spec));
      return;
    }

    throw error;
  }
}

async function dropIndexBySpec(db, collection, spec) {
  const indexes = await db.collection(collection).indexes();
  const match = indexes.find((index) => {
    const keys = Object.keys(spec);
    const indexKeys = Object.keys(index.key || {});
    if (keys.length !== indexKeys.length) {
      return false;
    }

    return keys.every((key) => index.key?.[key] === spec[key]);
  });

  if (match && match.name !== '_id_') {
    await db.collection(collection).dropIndex(match.name);
    console.log('Dropped index from', collection, match.name);
  }
}

async function up(db) {
  await createCollectionIfMissing(db, 'events');
  await createCollectionIfMissing(db, 'alerts');
  await createCollectionIfMissing(db, 'failed_events');
  await createCollectionIfMissing(db, 'api_keys');

  await createIndexSafe(db, 'events', { deviceId: 1, timestamp: -1 });
  await createIndexSafe(db, 'events', { timestamp: -1 });
  await createIndexSafe(db, 'events', { timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

  await createIndexSafe(db, 'alerts', { status: 1, severity: -1, createdAt: -1 });
  await createIndexSafe(db, 'alerts', { resolvedAt: 1 });
  await createIndexSafe(db, 'alerts', { message: 'text' });
  // Additional indexes to support SLA and aggregation queries
  await createIndexSafe(db, 'alerts', { type: 1, createdAt: -1 });
  await createIndexSafe(db, 'alerts', { severity: 1, createdAt: -1 });
  await createIndexSafe(db, 'alerts', { deviceId: 1, createdAt: -1 });

  await createIndexSafe(db, 'failed_events', { retryCount: 1 });
  await createIndexSafe(db, 'failed_events', { nextRetryAt: 1 });
  await createIndexSafe(db, 'api_keys', { key: 1 }, { unique: true });

  await db.collection('api_keys').updateOne(
    { name: 'local-demo' },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        key: process.env.SIGNALOPS_API_KEY || 'signalops-local-key',
        name: 'local-demo',
        description: 'Local development key',
        scopes: ['events:write'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  console.log('Migration up completed');
}

async function down(db) {
  await db.collection('events').deleteMany({ deviceId: /^seed-device-/ });
  await db.collection('alerts').deleteMany({ alertId: /^seed-alert-/ });
  await db.collection('api_keys').deleteMany({ name: 'local-demo' });

  await dropIndexBySpec(db, 'events', { deviceId: 1, timestamp: -1 });
  await dropIndexBySpec(db, 'events', { timestamp: -1 });
  await dropIndexBySpec(db, 'events', { timestamp: 1 });

  await dropIndexBySpec(db, 'alerts', { status: 1, severity: -1, createdAt: -1 });
  await dropIndexBySpec(db, 'alerts', { resolvedAt: 1 });
  await dropIndexBySpec(db, 'alerts', { message: 'text' });

  await dropIndexBySpec(db, 'failed_events', { retryCount: 1 });
  await dropIndexBySpec(db, 'failed_events', { nextRetryAt: 1 });
  await dropIndexBySpec(db, 'api_keys', { key: 1 });

  console.log('Rollback completed');
}

withDb(async (db) => {
  if (command === 'up') {
    await up(db);
    return;
  }

  if (command === 'down') {
    await down(db);
    return;
  }

  if (command === 'status') {
    const collections = await db.listCollections().toArray();
    console.log(JSON.stringify(collections.map((collection) => collection.name), null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
