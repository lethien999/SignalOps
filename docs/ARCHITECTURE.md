# SignalOps Architecture

## 1. Overview
SignalOps uses an event-driven architecture. Request handling is separated from heavy processing through a Redis queue, enabling better responsiveness and scaling.

## 2. Logical Components
- Client sources: simulator and external telemetry producers
- API Gateway: validates input, exposes REST and WebSocket APIs
- Event Broker: prepares and enqueues processing jobs
- Worker Service: consumes jobs, applies threshold logic, writes data
- MongoDB: primary persistence for events and alerts
- Redis: BullMQ queue backend and transient cache
- Nginx (optional): reverse proxy for unified ingress

## 3. Processing Path
1. POST /api/events arrives at API Gateway.
2. Event is validated and queued.
3. Worker consumes queued event.
4. Worker stores event and evaluates detection rules.
5. If triggered, alert is created and published to realtime channel.

## 4. Realtime Path
- WebSocket endpoint is hosted by API Gateway.
- Realtime topics include new events and alert updates.
- Dashboard clients subscribe and update UI without polling.

## 5. Data Layer
MongoDB collections:
- events
- alerts
- devices

Recommended indexes in current implementation:
- events: deviceId + timestamp
- alerts: status + severity + createdAt

## 6. Scalability Notes
- Worker can scale horizontally by increasing replicas.
- Queue decoupling protects API latency from processing spikes.
- MongoDB/Redis connection settings should be tuned per environment.

## 7. Reliability Notes
- Retries are handled at queue consumer level.
- Failed jobs should be routed to DLQ in next hardening phase.
- Health endpoints are exposed for service monitoring.

## 8. Security and Ops Baseline
- Configuration via environment variables
- Input validation at API boundary
- Reverse proxy available for ingress control
- Structured logs across services

## 9. Deployment Topology (Local)
- docker-compose orchestrates all services
- API Gateway available on port 3000
- Optional Nginx ingress available on port 8080
- MongoDB and Redis exposed for local diagnostics
