/**
 * Migration: Setup Tenants collection + seed default tenant
 * Run: node apps/api-gateway/scripts/db-migrate.mjs up
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/signalops-db';

async function up() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // 1. Create tenants collection if not exists
    const collectionNames = (await db.listCollections().toArray()).map((c) => c.name);
    if (!collectionNames.includes('tenants')) {
      await db.createCollection('tenants');
      console.log('✅ Created tenants collection');
    }

    const tenantsCollection = db.collection('tenants');

    // 2. Create indexes
    await tenantsCollection.createIndex({ apiKey: 1 }, { unique: true });
    console.log('✅ Created index on apiKey');

    await tenantsCollection.createIndex({ name: 1 }, { unique: true });
    console.log('✅ Created index on name');

    await tenantsCollection.createIndex({ status: 1 });
    console.log('✅ Created index on status');

    await tenantsCollection.createIndex({ createdAt: -1 });
    console.log('✅ Created index on createdAt');

    // 3. Seed default tenant if not exists
    const defaultTenant = await tenantsCollection.findOne({ name: 'default' });
    if (!defaultTenant) {
      const defaultApiKey = 'default-key-' + Math.random().toString(36).substring(2, 15);
      await tenantsCollection.insertOne({
        name: 'default',
        apiKey: defaultApiKey,
        quota: {
          eventsPerMonth: parseInt(process.env.TENANT_QUOTA_EVENTS_DEFAULT || '1000000', 10),
          alertsPerMonth: parseInt(process.env.TENANT_QUOTA_ALERTS_DEFAULT || '100000', 10),
        },
        usage: {
          events: 0,
          alerts: 0,
          month: new Date().toISOString().slice(0, 7),
        },
        status: 'active',
        description: 'Default tenant for development/testing',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Seeded default tenant with API key: ${defaultApiKey}`);
    }

    console.log('Migration up completed');
  } finally {
    await client.close();
  }
}

async function down() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // Drop tenants collection
    await db.collection('tenants').drop();
    console.log('✅ Dropped tenants collection');
    console.log('Migration down completed');
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('Collection does not exist; skipping');
    } else {
      throw error;
    }
  } finally {
    await client.close();
  }
}

const command = process.argv[2] || 'up';
if (command === 'up') {
  up().catch((error) => {
    console.error('Migration up failed:', error);
    process.exit(1);
  });
} else if (command === 'down') {
  down().catch((error) => {
    console.error('Migration down failed:', error);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
