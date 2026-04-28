# 🏗️ SignalOps Architecture Guide

---

## System Components Overview

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │  React/Next.js Dashboard                           │  │
│  │  - Map View (Leaflet)                             │  │
│  │  - Alert Table                                    │  │
│  │  - Metrics Dashboard                              │  │
│  └────────────────────────────────────────────────────┘  │
│                         ↕ WebSocket                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               APPLICATION LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ API Gateway  │  │Event Broker  │  │ Simulator    │   │
│  │              │  │              │  │              │   │
│  │- Auth        │  │- Validation  │  │- Gen data    │   │
│  │- Routing     │  │- Transform   │  │- Send events │   │
│  │- REST API    │  │- Queue push  │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│         ↓                 ↓                 ↓             │
│  ┌──────────────────────────────────────────────────┐    │
│  │           Redis Queue (BullMQ)                   │    │
│  │   - Job queue for event processing               │    │
│  │   - Persistence + retry logic                    │    │
│  └──────────────────────────────────────────────────┘    │
│                          ↓                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │         Worker Service (Scalable)               │    │
│  │   - Process events from queue                   │    │
│  │   - Threshold detection                         │    │
│  │   - Alert generation                            │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                DATA LAYER                                │
│  ┌──────────────────┐      ┌──────────────────────────┐ │
│  │    MongoDB       │      │      Redis Cache         │ │
│  │                  │      │                          │ │
│  │ Collections:     │      │ - Session data           │ │
│  │ - events         │      │ - Temporary cache        │ │
│  │ - alerts         │      │ - Queue state            │ │
│  │ - devices        │      │                          │ │
│  └──────────────────┘      └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Service Responsibilities

### 1. API Gateway (NestJS Main Service)
**Purpose**: Entry point for all requests

**Responsibilities**:
- Receive HTTP requests from external sources
- Authentication & authorization
- Request validation
- Route to appropriate handler
- Emit events to Event Broker
- Serve WebSocket connections
- Return HTTP responses

**Key Endpoints**:
- `POST /api/events` - Create new event
- `GET /api/events` - List events
- `GET /api/alerts` - List alerts
- `PATCH /api/alerts/:id` - Update alert status
- `GET /api/health` - Health check

**Tech**: NestJS, Express, class-validator

---

### 2. Event Broker Service
**Purpose**: Transform and queue events

**Responsibilities**:
- Receive events from API Gateway
- Validate event data
- Enrich event (add timestamps, defaults)
- Serialize to job format
- Push to Redis queue
- Emit WebSocket events for new data

**Tech**: NestJS service, BullMQ, ioredis

---

### 3. Worker Service (Scalable)
**Purpose**: Process events asynchronously

**Responsibilities**:
- Poll Redis queue for jobs
- Extract event data
- Apply threshold detection logic
- Generate alerts if thresholds exceeded
- Save events to MongoDB
- Save alerts to MongoDB
- Emit WebSocket alert notifications

**Logic**:
```
if latency > 200ms → severity: high, type: latency
if packet_loss > 5% → severity: high, type: packet_loss
if signal_strength < -90 dBm → severity: medium, type: signal
```

**Tech**: BullWorker, MongoDB, WebSocket emitter

---

### 4. Simulator Service
**Purpose**: Generate test network data

**Responsibilities**:
- Generate realistic network metrics
- Create mock devices at different locations
- Send data to API Gateway at regular intervals
- Simulate normal and error conditions

**Tech**: Node.js runtime, axios/fetch

---

### 5. Frontend Dashboard
**Purpose**: Visualize network status

**Responsibilities**:
- Connect to WebSocket server
- Render map with device markers
- Display alert table
- Show system metrics
- Provide alert actions (acknowledge, resolve)
- Real-time UI updates

**Tech**: React/Next.js, Leaflet, Socket.io-client

---

## Data Flow Patterns

### Pattern 1: Event Ingestion (Sync → Async)
```
1. Client sends POST /api/events
2. API Gateway validates
3. Event Broker queues job
4. API Gateway returns 202 Accepted
5. Worker processes asynchronously
```

**Benefit**: Non-blocking, scalable

### Pattern 2: Alert Generation (Async Chain)
```
1. Worker receives event from queue
2. Checks against thresholds
3. Creates Alert document
4. Saves to MongoDB
5. Emits WebSocket: alert:new
6. Dashboard receives in real-time
```

**Benefit**: Reliable, auditable

### Pattern 3: Real-time Updates (WebSocket)
```
1. Alert created by worker
2. Worker emits: socket.emit('alert:new', alertData)
3. Dashboard socket listeners react
4. UI updates immediately (no polling)
```

**Benefit**: Instant feedback

---

## Database Schema

### MongoDB Collections

#### events
```javascript
{
  _id: ObjectId,
  deviceId: String,
  location: {
    lat: Number,
    lng: Number,
    name: String
  },
  metrics: {
    latency: Number,      // milliseconds
    packetLoss: Number,   // percentage
    signalStrength: Number // dBm
  },
  timestamp: Date,
  processedAt: Date,
  createdAt: Date
}
```

#### alerts
```javascript
{
  _id: ObjectId,
  deviceId: String,
  type: String,           // 'latency', 'packet_loss', 'signal'
  severity: String,       // 'low', 'medium', 'high'
  location: {
    lat: Number,
    lng: Number,
    name: String
  },
  message: String,
  status: String,         // 'open', 'acknowledged', 'resolved'
  acknowledgedBy: String, // optional
  acknowledgedAt: Date,   // optional
  resolvedAt: Date,       // optional
  createdAt: Date,
  updatedAt: Date
}
```

#### devices (optional)
```javascript
{
  _id: ObjectId,
  deviceId: String,
  name: String,
  location: {
    lat: Number,
    lng: Number,
    city: String
  },
  status: String,         // 'online', 'offline'
  lastSeen: Date,
  createdAt: Date
}
```

---

## Redis Usage

### Queue Structure (BullMQ)
```
Queue: "event-processing"
├── Job 1: { eventData, createdAt }
├── Job 2: { eventData, createdAt }
└── ...

Queue: "alert-notification"
├── Job 1: { alertData, createdAt }
└── ...
```

### Cache Keys
```
device:{deviceId} → device status (TTL: 5 min)
alerts:active → count of active alerts (TTL: 1 min)
events:latest:10 → recent events (TTL: 30 sec)
```

---

## Scalability Considerations

### Horizontal Scaling
- **Worker Service**: Deploy multiple instances
  - Each reads from same Redis queue
  - Processed jobs acknowledged = no duplication
  - Scale based on queue depth

### Vertical Optimization
- **Connection Pooling**: MongoDB, Redis
- **Indexes**: On deviceId, timestamp, status
- **Caching**: Recent alerts, device status

### Load Handling
- **Rate Limiting**: Per device, per API key
- **Queue Batching**: Process events in batches
- **WebSocket Rooms**: Group clients by region

---

## Error Handling Strategy

### API Gateway
- Input validation errors → 400 Bad Request
- Auth failures → 401 Unauthorized
- Rate limit exceeded → 429 Too Many Requests
- Server errors → 500 with error ID for tracking

### Worker Service
- Failed threshold check → log + retry
- Database write failure → log + dead letter queue
- Corruption detected → alert + manual review

### WebSocket
- Connection drops → auto-reconnect (client-side)
- Emit failures → log + retry
- Client disconnect → cleanup subscriptions

---

## Monitoring Points

- Queue depth (alert if > threshold)
- Worker processing time (p50, p95, p99)
- Alert creation rate
- Database response times
- WebSocket connection count
- Error rates by service

---

## Security Considerations

1. **API Authentication**: JWT tokens or API keys
2. **Input Validation**: All user inputs sanitized
3. **Database**: MongoDB authentication enabled
4. **Redis**: Password protected
5. **WebSocket**: Auth on connection
6. **Logging**: Sensitive data masked
7. **CORS**: Restricted to known origins
