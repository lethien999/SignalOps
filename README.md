<p align="center">
  <h1 align="center">🛰️ SignalOps</h1>
  <p align="center">
    Real-time Telecom Network Quality Monitoring System
    <br />
    <a href="docs/ARCHITECTURE.md"><strong>Architecture</strong></a> •
    <a href="docs/API.md"><strong>API</strong></a> •
    <a href="docs/DEPLOYMENT.md"><strong>Deployment</strong></a> •
    <a href="docs/OPERATIONS.md"><strong>Operations</strong></a> •
    <a href="docs/CONTRIBUTING.md"><strong>Contributing</strong></a> •
    <a href="docs/PERFORMANCE_TESTING.md"><strong>Performance Test</strong></a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/nestjs-10-red" alt="NestJS">
  <img src="https://img.shields.io/badge/typescript-5-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/status-production--ready-brightgreen" alt="Status">
</p>

---

## Overview

**SignalOps** is a real-time network quality monitoring platform for telecommunications infrastructure. It continuously collects telemetry (latency, packet loss, signal strength), detects anomalies against configurable thresholds, and provides instant alerts via a reactive dashboard with map visualization.

---

## Quick Start

`ash
git clone https://github.com/lethien999/SignalOps.git
cd SignalOps

npm install
cp .env.example .env

docker compose --env-file .env -f infrastructure/docker-compose.yml up -d
`

**Access:**
- API: http://localhost:3000/api/docs
- Dashboard: http://localhost:3001
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3003

Stop:
`ash
docker compose --env-file .env -f infrastructure/docker-compose.yml down
`

---

## Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, components, data flow, scalability |
| [API.md](docs/API.md) | REST endpoints, WebSocket events, schemas |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Local setup, production checklist, CI/CD |
| [OPERATIONS.md](docs/OPERATIONS.md) | Alert handling, troubleshooting, runbooks |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Development guidelines, code standards |
| [PERFORMANCE_TESTING.md](docs/PERFORMANCE_TESTING.md) | Load testing, benchmarking |

---

## Architecture

`
Device/Simulator → API Gateway (port 3000)
                 ↓
             Redis Queue
                 ↓
          Worker Service
                 ↓
    MongoDB + WebSocket
                 ↓
Dashboard (port 3001) + Monitoring (Prometheus/Grafana)
`

---

## Tech Stack

**Backend:** NestJS · TypeScript · BullMQ · Socket.io  
**Frontend:** Next.js · React · Tailwind CSS · Leaflet · Zustand  
**Data:** MongoDB · Redis  
**Infrastructure:** Docker Compose · Nginx · Jenkins

---

## Features

- ✅ Event ingestion API with API Key authentication
- ✅ Threshold-based anomaly detection
- ✅ Real-time alerts via WebSocket (<500ms)
- ✅ Interactive dashboard with map & metrics
- ✅ Alert management (acknowledge, resolve, notes)
- ✅ Multi-level severity (warning/high/critical)
- ✅ Monitoring stack (Prometheus + Grafana)
- ✅ Production-ready (health checks, graceful shutdown, structured logging)

---

## Project Structure

`
apps/
  ├── api-gateway/          REST API, WebSocket server, event ingestion
  ├── worker-service/       Background processing, threshold detection, alerts
  ├── simulator/            Mock telemetry generation for testing
  └── dashboard/            Next.js web UI
libs/
  ├── common/               Shared utilities, constants, logger
  └── models/               Data schemas, TypeScript interfaces
infrastructure/
  ├── docker-compose.yml    Production configuration
  ├── Dockerfile.*          Service images
  ├── nginx/                Reverse proxy configuration
  └── monitoring/           Prometheus & Grafana setup
docs/                       Complete documentation
`

---

## Configuration

Copy .env.example to .env:

`env
NODE_ENV=production
API_KEY=your-secret-key
MONGODB_URI=mongodb://user:pass@mongodb:27017/signalops
REDIS_URL=redis://redis:6379
API_GATEWAY_PORT=3000
DASHBOARD_PORT=3001
`

---

## Alerts

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Latency | > 200ms | High |
| Packet Loss | > 5% | High |
| Signal Strength | < -90 dBm | Medium |

---

## Testing

`ash
npm run build
npm run test:integration
npm run perf:websocket
`

---

## Deployment

**Development:**
`ash
npm run build
docker compose -f infrastructure/docker-compose.dev.yml up
`

**Production:** See [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/lethien999/SignalOps/issues)
- **Discussions:** [GitHub Discussions](https://github.com/lethien999/SignalOps/discussions)
- **Troubleshooting:** [OPERATIONS.md](docs/OPERATIONS.md)

---

## License

MIT
