#!/usr/bin/env node

/**
 * Migration: db-migrate-users.mjs
 * - Creates User collection with indexes
 * - Seeds default roles (admin, editor, viewer)
 * - Extends Tenant schema with adminUserIds
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'signalops-db';

async function up(db) {
  console.log('Running migration: create users collection and indexes...');

  // Create users collection if not exists
  try {
    await db.createCollection('users');
    console.log('✓ Created users collection');
  } catch (err) {
    if (err.codeName === 'NamespaceExists') {
      console.log('ℹ Users collection already exists');
    } else {
      throw err;
    }
  }

  // Create indexes on users
  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
  console.log('✓ Created index: users.email (unique)');

  await users.createIndex({ tenantId: 1 });
  console.log('✓ Created index: users.tenantId');

  await users.createIndex({ tenantId: 1, roleId: 1 });
  console.log('✓ Created index: users.tenantId + roleId');

  // Create roles collection if not exists
  try {
    await db.createCollection('roles');
    console.log('✓ Created roles collection');
  } catch (err) {
    if (err.codeName === 'NamespaceExists') {
      console.log('ℹ Roles collection already exists');
    } else {
      throw err;
    }
  }

  // Seed default roles
  const roles = db.collection('roles');
  const defaultRoles = [
    {
      _id: 'admin',
      name: 'Administrator',
      permissions: [
        'read:events',
        'write:events',
        'read:alerts',
        'write:alerts',
        'read:config',
        'write:config',
        'write:webhooks',
        'manage:users',
        'manage:roles',
        'view:metrics',
        'view:billing',
      ],
      createdAt: new Date(),
    },
    {
      _id: 'editor',
      name: 'Editor',
      permissions: [
        'read:events',
        'write:events',
        'read:alerts',
        'write:alerts',
        'read:config',
        'write:config',
        'write:webhooks',
        'view:metrics',
      ],
      createdAt: new Date(),
    },
    {
      _id: 'viewer',
      name: 'Viewer',
      permissions: [
        'read:events',
        'read:alerts',
        'read:config',
        'view:metrics',
      ],
      createdAt: new Date(),
    },
  ];

  for (const role of defaultRoles) {
    await roles.updateOne({ _id: role._id }, { $set: role }, { upsert: true });
    console.log(`✓ Seeded role: ${role._id}`);
  }

  // Extend tenants schema: add adminUserIds if not exists
  const tenants = db.collection('tenants');
  const result = await tenants.updateMany(
    { adminUserIds: { $exists: false } },
    { $set: { adminUserIds: [] } },
  );
  console.log(`✓ Extended tenants schema: updated ${result.modifiedCount} documents with adminUserIds`);

  console.log('\n✅ Migration completed successfully!');
}

async function down(db) {
  console.log('Rolling back migration...');

  try {
    await db.dropCollection('users');
    console.log('✓ Dropped users collection');
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') {
      console.log('ℹ Users collection does not exist');
    } else {
      throw err;
    }
  }

  try {
    await db.dropCollection('roles');
    console.log('✓ Dropped roles collection');
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') {
      console.log('ℹ Roles collection does not exist');
    } else {
      throw err;
    }
  }

  // Remove adminUserIds from tenants
  const tenants = db.collection('tenants');
  const result = await tenants.updateMany(
    {},
    { $unset: { adminUserIds: '' } },
  );
  console.log(`✓ Removed adminUserIds from ${result.modifiedCount} tenants`);

  console.log('\n✅ Rollback completed successfully!');
}

async function main() {
  const action = process.argv[2] || 'up';

  if (!['up', 'down'].includes(action)) {
    console.error('Usage: node db-migrate-users.mjs [up|down]');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    if (action === 'up') {
      await up(db);
    } else {
      await down(db);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
