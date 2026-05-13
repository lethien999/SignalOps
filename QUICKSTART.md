# Quick Start - SignalOps Bootstrap

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for local development)
- Git

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

### 3. Start All Services with Docker

```bash
# Build images
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs
```

### 4. Verify Services

```bash
# Check API Gateway health
curl http://localhost:3000/api/health

# Send test event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-01",
    "location": { "lat": 10.77, "lng": 106.70, "name": "Test" },
    "latency": 150,
    "packetLoss": 1.5,
    "signalStrength": -65
  }'

# List events
curl http://localhost:3000/api/events

# List alerts
curl http://localhost:3000/api/alerts
```

## Project Structure

```
apps/
├── api-gateway/    # Main API server (port 3000)
├── worker-service/ # Background event processing
├── simulator/      # Test data generator
└── event-broker/   # Event transformation (legacy, can skip)

libs/
├── common/         # Shared utilities
└── models/         # Data models & interfaces

infrastructure/
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.worker
└── Dockerfile.simulator
```

## Available Commands

```bash
# Development
npm run dev          # Start all services in dev mode

# Production
npm run build        # Build all services
npm run start        # Start built services

# Testing
npm run test         # Run tests
npm run lint         # Lint code

# Formatting
npm run format       # Format code with Prettier

# Docker
npm run docker:build # Build Docker images
npm run docker:up    # Start Docker containers
npm run docker:down  # Stop Docker containers
npm run docker:logs  # View Docker logs
```

## Environment Variables

Key variables in `.env.example`:

- `API_GATEWAY_PORT` - API port (default: 3000)
- `MONGODB_URI` - MongoDB connection
- `REDIS_HOST` - Redis host
- `THRESHOLD_LATENCY_MS` - Latency alert threshold
- `THRESHOLD_PACKET_LOSS_PERCENT` - Packet loss threshold
- `THRESHOLD_SIGNAL_STRENGTH_DBM` - Signal strength threshold

## Testing the System

1. **API Gateway**: `curl http://localhost:3000/api/health`
2. **Create Event**: POST to `/api/events` with sample data
3. **View Events**: `curl http://localhost:3000/api/events`
4. **View Alerts**: `curl http://localhost:3000/api/alerts` (if thresholds exceeded)
5. **WebSocket**: Connect to `ws://localhost:3000/socket.io` for real-time updates

## Troubleshooting

### Services not starting

```bash
docker-compose logs -f
```

### MongoDB connection error

- Ensure MongoDB container is running: `docker ps`
- Check MongoDB credentials in `.env`

### Worker not processing events

- Check Redis queue status
- Verify MongoDB is connected
- Check worker service logs

## Next Steps

See [IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md) for the full implementation roadmap.

## Support

For issues, check:

- Docker logs: `npm run docker:logs`
- Service-specific logs in container output
- MongoDB and Redis connectivity

---

**Bootstrap Complete!** Ready to extend with Event Flow & Queue System work.
