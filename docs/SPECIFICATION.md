# SignalOps Specification

Status: active
Last updated: April 2026

## 1. Purpose
SignalOps monitors telecom network quality in near real-time. The system ingests telemetry, detects threshold violations, persists events and alerts, and exposes data to API and dashboard clients.

## 2. Scope
In scope:
- Event ingestion pipeline (API -> queue -> worker)
- Threshold-based alert generation
- Event and alert persistence in MongoDB
- REST APIs for events, alerts, and health
- Realtime stream via WebSocket
- Local container orchestration with Docker Compose

Out of scope for current release:
- Production IAM and multi-tenant auth model
- Advanced anomaly ML models
- Full CI/CD hardening

## 3. High-Level Flow
1. Simulator or external source sends event payload to API Gateway.
2. API validates payload and enqueues processing job.
3. Worker consumes queue jobs and applies detection rules.
4. Worker stores event and creates alert when thresholds are exceeded.
5. API and WebSocket endpoints expose data to clients.

## 4. Services
- api-gateway: REST + WebSocket entrypoint
- worker-service: asynchronous processing and alert generation
- event-broker: queue-facing event layer
- simulator: synthetic telemetry generator
- mongodb: persistent storage
- redis: queue and transient cache
- nginx (optional): reverse proxy

## 5. Data Contracts
### Event
- deviceId: string
- location: object (lat, lng, name)
- metrics: object (latency, packetLoss, signalStrength)
- timestamp: datetime

### Alert
- deviceId: string
- type: latency | packet_loss | signal
- severity: low | medium | high
- status: open | acknowledged | resolved
- location: object
- message: string
- createdAt/updatedAt: datetime

## 6. Detection Rules
- latency > 200 ms -> high latency alert
- packetLoss > 5% -> high packet_loss alert
- signalStrength < -90 dBm -> medium signal alert

## 7. API Surface
Events:
- POST /api/events
- GET /api/events
- GET /api/events/:id

Alerts:
- GET /api/alerts
- GET /api/alerts/:id
- PATCH /api/alerts/:id

System:
- GET /api/health

## 8. Non-Functional Targets
- Queue-based asynchronous processing
- Service restart resilience via Redis and MongoDB persistence
- Structured logging across services
- Containerized local setup

## 9. Runtime and Deployment
- Node.js (NestJS) services
- MongoDB for events and alerts
- Redis/BullMQ for queue processing
- Docker Compose for local orchestration
- Optional Nginx reverse proxy at localhost:8080

## 10. Delivery Phases
- Phase 1: infrastructure and baseline services
- Phase 2: event flow and queue integration
- Phase 3: worker detection logic
- Phase 4: persistence and API completion
- Phase 5: realtime communication
- Phase 6: frontend dashboard
- Phase 7: CI/CD and production hardening

## 11. Success Criteria
- Services start reliably in compose
- Events are accepted and processed asynchronously
- Alerts are created according to thresholds
- Events and alerts are queryable through API
- Realtime clients can receive updates
