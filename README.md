# 🚀 SignalOps - Smart Telecom Monitoring System

A real-time event-driven system for monitoring and analyzing network performance metrics with anomaly detection and alerting capabilities.

## 📊 Features

✅ Real-time network data ingestion  
✅ Automatic anomaly detection based on configurable thresholds  
✅ Alert generation and management  
✅ Real-time WebSocket notifications  
✅ Geo-based monitoring with map visualization  
✅ Scalable event processing with BullMQ queue  
✅ Docker-based deployment  
✅ Full-stack implementation (Backend + Frontend + DevOps)

## 🛠️ Tech Stack

- **Backend**: NestJS, Node.js
- **Database**: MongoDB, Redis
- **Queue**: BullMQ
- **Frontend**: React/Next.js (Phase 6)
- **DevOps**: Docker, Docker Compose, Jenkins
- **Monitoring**: Prometheus, Grafana (optional)

## 🚀 Quick Start

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

### Minimal Setup (3 steps)
```bash
# 1. Install dependencies
npm install

# 2. Start all services with Docker
npm run docker:up

# 3. Verify (should return "ok")
curl http://localhost:3000/api/health
```

## 📁 Project Structure

```
SignalOps/
├── apps/
│   ├── api-gateway/        NestJS API server
│   ├── worker-service/     Background event processing
│   ├── simulator/          Test data generator
│   └── dashboard/          React frontend (Phase 6)
├── libs/
│   ├── common/             Shared utilities
│   └── models/             Data models & interfaces
├── infrastructure/         Docker & CI/CD
├── docs/
│   ├── SPECIFICATION.md    Full project specification
│   ├── ARCHITECTURE.md     System design
│   └── IMPLEMENTATION_CHECKLIST.md
└── README.md              This file
```

## 📖 Documentation

- **[SPECIFICATION.md](docs/SPECIFICATION.md)** - Complete system specification
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture & patterns
- **[IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md)** - 7-phase development roadmap
- **[QUICKSTART.md](QUICKSTART.md)** - Quick setup guide

## 🚢 Development Phases

| Phase | Focus | Status |
|---|---|---|
| 1 | Project Setup & Infrastructure | ✅ Complete |
| 2 | Event Flow & Queue System | 🟡 Ready |
| 3 | Worker & Detection Logic | 🟡 Ready |
| 4 | Persistence & API | 🟡 Ready |
| 5 | Real-time Communication | 🟡 Ready |
| 6 | Frontend Dashboard | ⏳ Planned |
| 7 | CI/CD & DevOps Polish | ⏳ Planned |

## 🎯 Key Metrics & Thresholds

- **Latency Alert**: > 200ms
- **Packet Loss Alert**: > 5%
- **Signal Strength Alert**: < -90 dBm

## 🔌 API Endpoints

### Events
```
POST   /api/events          Create new event
GET    /api/events          List events
GET    /api/events/:id      Get event detail
```

### Alerts
```
GET    /api/alerts          List alerts
GET    /api/alerts/:id      Get alert detail
PATCH  /api/alerts/:id      Update alert status
```

### Health
```
GET    /api/health          System health check
```

## 🔁 Real-time WebSocket Events

- `event:new` - New network event
- `alert:new` - New alert created
- `alert:updated` - Alert status changed
- `device:status` - Device status change

## 🐳 Docker Deployment

All services run in Docker containers:

```bash
# Build images
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

Services:
- **api-gateway**: REST API & WebSocket server (port 3000)
- **worker-service**: Background event processing
- **simulator**: Test data generator (10 devices)
- **mongodb**: Data persistence
- **redis**: Queue & cache

## 📊 Monitor & Debug

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api-gateway

# Check service health
docker-compose ps
```

## 🧪 Testing

```bash
# Send test event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-01",
    "location": { "lat": 10.77, "lng": 106.70, "name": "HCM-Tower-1" },
    "latency": 250,
    "packetLoss": 8,
    "signalStrength": -95
  }'

# View events
curl http://localhost:3000/api/events

# View alerts (if thresholds exceeded)
curl http://localhost:3000/api/alerts
```

## 📈 Architecture

```
Simulator → API Gateway → Redis Queue → Worker Service → MongoDB
                    ↓
            WebSocket → Dashboard UI
```

## 🔒 Security

- Input validation on all API endpoints
- MongoDB authentication enabled
- Redis authentication (configurable)
- CORS configuration via environment
- JWT support (Phase expansion)

## 🚀 Performance Targets

- Event processing: < 1 second
- API response time: < 200ms
- Alert notification: < 2 seconds
- Supports 100+ concurrent WebSocket connections
- Easily scalable (horizontal scaling of worker services)

## 📝 Environment Variables

See `.env.example` for full configuration:

```bash
API_GATEWAY_PORT=3000
MONGODB_URI=mongodb://mongodb:27017/signalops-db
REDIS_HOST=redis
THRESHOLD_LATENCY_MS=200
```

## 🤝 Contributing

1. Check [IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md) for tasks
2. Create feature branch
3. Follow project structure conventions
4. Add tests for new features
5. Submit PR

## 📋 Next Steps

- [ ] Phase 2: Complete Event Flow implementation
- [ ] Phase 3: Enhance Worker & Detection Logic
- [ ] Phase 4: Add Database Optimization
- [ ] Phase 5: Implement WebSocket Features
- [ ] Phase 6: Build React Dashboard
- [ ] Phase 7: Setup CI/CD Pipeline

## 📞 Support

For questions or issues:
1. Check [QUICKSTART.md](QUICKSTART.md)
2. Review [ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. Check Docker logs: `npm run docker:logs`
4. Review [IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md)

## 📄 License

MIT

---

**Phase 1 Status**: ✅ Complete  
**Last Updated**: April 2026  
**Version**: 1.0.0
