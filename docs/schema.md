# MongoDB Schema for SignalOps

This file documents the collections, sample document shapes, and recommended indexes for local and production deployments.

Collections
-----------
- `events` — raw incoming events (short retention, can TTL/archived)
- `alerts` — generated alerts derived from events (longer retention)
- `failed_events` — DLQ / failed processing for manual replay
- `api_keys` — api keys for ingestion and audit (local-demo seeded)

Sample documents
----------------

Events
{
  _id: ObjectId,
  deviceId: String,
  location: { lat: Number, lng: Number, name?: String },
  metrics: { latency: Number, packetLoss: Number, signalStrength: Number },
  timestamp: ISODate,
  processedAt?: ISODate,
  alertId?: String,
  createdAt: ISODate,
  updatedAt: ISODate
}

Alerts
{
  _id: ObjectId,
  alertId: String,
  deviceId: String,
  type: String,
  severity: String,
  location: { lat: Number, lng: Number, name?: String },
  message: String,
  status: String,
  acknowledgedBy?: String,
  acknowledgedAt?: ISODate,
  resolvedAt?: ISODate,
  resolvedBy?: String,
  resolutionNote?: String,
  eventId?: String,
  createdAt: ISODate,
  updatedAt: ISODate
}

Failed events (DLQ)
{
  _id: ObjectId,
  event: Object,
  errorMessage: String,
  retryCount: Number,
  nextRetryAt: ISODate,
  firstFailedAt: ISODate
}

API keys
{
  _id: ObjectId,
  key: String,
  name: String,
  description?: String,
  scopes?: [String],
  createdAt: ISODate,
  updatedAt?: ISODate,
  lastUsedAt?: ISODate,
  active: Boolean
}

Indexes (mongo shell)
---------------------

# Events
> db.events.createIndex({ deviceId: 1, timestamp: -1 })
> db.events.createIndex({ timestamp: -1 })
# TTL: 30 days
> db.events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })

# Alerts
> db.alerts.createIndex({ status: 1, deviceId: 1, createdAt: -1 })
> db.alerts.createIndex({ resolvedAt: 1 })
> db.alerts.createIndex({ message: 'text' })

# DLQ
> db.failed_events.createIndex({ retryCount: 1 })
> db.failed_events.createIndex({ nextRetryAt: 1 })

# API keys
> db.api_keys.createIndex({ key: 1 }, { unique: true })

Scaling notes
-------------
- Consider sharding `events` by hashed `deviceId` or time-range for high write throughput.
- Use TTL + archiver job to move older raw events to cold storage.
- Pre-aggregate into `aggregates` collection for dashboard read efficiency.

Operational
-----------
- Backup nightly and test restores regularly.
- Monitor `events` collection size and index usage.  
- Seed API keys for local demo using `apps/api-gateway/scripts/init-db.mjs`.
