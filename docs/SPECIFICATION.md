# 🚀 Project: SignalOps – Smart Telecom Monitoring System

**Status**: Specification Complete | Ready for Implementation  
**Last Updated**: April 2026  
**Tech Stack**: Node.js (NestJS), MongoDB, Redis, React/Next.js, Docker, Jenkins

---

## 🎯 1. System Objectives

Build a backend + dashboard system capable of:

- Collecting network data (latency, packet loss, signal strength)
- Detecting anomalies in real-time
- Creating alerts (alert system)
- Displaying network status on a map
- Real-time updates to users

---

## 🧠 2. Overall Workflow Concept

```
Simulated Network Devices
        ↓
   API Gateway
        ↓
   Event Broker
        ↓
   Redis Queue
        ↓
   Worker Services
        ↓
   MongoDB (Event + Alert)
        ↓
WebSocket + REST API
        ↓
   Dashboard UI
```

---

## 🔄 3. Detailed Processing Flow

### Step 1: Data Ingestion
- Simulator or external system sends network data
- Data includes:
  - latency
  - packet loss
  - signal strength
  - location

### Step 2: Event Processing
- API Gateway receives request
- Forwards to Event Broker
- Event Broker pushes to queue (Redis)

### Step 3: Background Processing
- Worker reads from queue
- Performs:
  - data validation
  - anomaly detection
  - database storage

### Step 4: Alert Generation
- If exceeds threshold:
  - creates alert
  - classifies severity

### Step 5: Real-time Communication
- Emits event + alert via WebSocket
- UI receives and updates immediately

### Step 6: Visualization
- Dashboard displays:
  - Map
  - Alert list
  - Metrics

---

## 🧱 4. System Architecture

### 4.1 Core Services

| Service        | Role                            |
|---|---|
| API Gateway    | receive requests, auth, routing |
| Event Broker   | process events, push queue      |
| Worker Service | async processing, detection    |
| Simulator      | generate test data             |

### 4.2 Data Layer

| Component | Role          |
|---|---|
| MongoDB   | store events + alerts |
| Redis     | queue + cache         |

### 4.3 Communication

| Type    | Technology  |
|---|---|
| Sync    | REST API    |
| Async   | Queue (BullMQ) |
| Realtime| WebSocket   |

---

## 🛠️ 5. Tech Stack

### Backend
- Node.js (NestJS)
- BullMQ (queue management)
- ioredis (Redis client)

### Database
- MongoDB (events, alerts, geo data)
- Redis (queue + cache)

### Frontend
- React / Next.js
- Map library (Leaflet / Mapbox)
- WebSocket client

### DevOps
- Docker
- Docker Compose
- Jenkins (CI/CD)

### Monitoring (optional advanced)
- Prometheus
- Grafana

---

## 📊 6. Data Model

### Event
```
{
  deviceId: string
  location: { lat, lng }
  latency: number (ms)
  packetLoss: number (%)
  signalStrength: number (dBm)
  timestamp: Date
}
```

### Alert
```
{
  alertId: string
  type: "latency" | "packet_loss" | "signal"
  severity: "low" | "medium" | "high"
  location: { lat, lng }
  message: string
  status: "open" | "acknowledged" | "resolved"
  createdAt: Date
  updatedAt: Date
}
```

---

## 🧠 7. Business Logic

### Threshold Detection
- latency > 200ms → alert
- packet loss > 5% → alert
- signal strength < -90 dBm → alert

### Alert Handling
- create new alert
- avoid duplicates (optional)
- update status

### Real-time Logic
- emit event when:
  - new event arrives
  - new alert is created

---

## 🖥️ 8. UI Requirements

### 8.1 Dashboard
- total event count
- active alert count
- latency chart

### 8.2 Map
- display markers by location
- colors:
  - green → normal
  - red → error

### 8.3 Alert Table
- list of alerts
- filter by:
  - severity
  - time
- actions:
  - acknowledge
  - resolve

---

## 🔌 9. API Design (High-level)

### Events
```
POST   /api/events              (create event)
GET    /api/events              (list events)
GET    /api/events/:id          (get event detail)
```

### Alerts
```
GET    /api/alerts              (list alerts)
GET    /api/alerts/:id          (get alert detail)
PATCH  /api/alerts/:id          (update alert status)
```

### System
```
GET    /api/health              (health check)
GET    /api/stats               (system statistics)
```

---

## 🔁 10. Real-time Events (WebSocket)

Emit events on these topics:
- `event:new` - new network event
- `alert:new` - new alert created
- `alert:updated` - alert status changed
- `device:status` - device status change

---

## 🐳 11. Deployment Architecture

### Docker
- Each service: 1 container
- MongoDB + Redis: separate containers
- Nginx: reverse proxy (optional)

### Docker Compose
- Orchestrate entire system
- Single command: `docker-compose up -d`

### Jenkins Pipeline
```
Pull → Build → Test → Docker Build → Deploy → Verify
```

---

## 📈 12. Non-functional Requirements

- **Async Processing**: Use queue for heavy operations
- **Scalability**: Easy to scale workers
- **Real-time**: Sub-second WebSocket delivery
- **Reliability**: Proper error handling + logging
- **Monitoring**: Prometheus metrics (optional)
- **Data Persistence**: All events + alerts stored
- **Security**: Basic auth/token validation

---

## 🧪 13. Testing Strategy

- **Unit Tests**: Service logic
- **Integration Tests**: Event flow, queue processing
- **E2E Tests**: Full workflow (optional)
- **Load Tests**: Queue throughput

---

## 🧭 14. Development Roadmap (7 Phases)

### Phase 1: Project Setup & Infrastructure
- Initialize NestJS project
- Setup Docker environment
- Configure MongoDB + Redis
- Create project structure

### Phase 2: Event Flow & Queue System
- Event Broker service
- Redis queue setup (BullMQ)
- Basic API Gateway
- Event ingestion endpoint

### Phase 3: Worker & Detection Logic
- Worker service setup
- Implement threshold detection
- Anomaly detection logic
- Alert generation

### Phase 4: Persistence & API
- MongoDB schema design
- Data repository layer
- Complete REST API
- Query optimization

### Phase 5: Real-time Communication
- WebSocket server setup
- Event emission system
- Alert notifications
- Dashboard connection

### Phase 6: Frontend Dashboard
- React/Next.js setup
- Map integration (Leaflet)
- Alert table component
- Real-time data binding

### Phase 7: CI/CD & DevOps Polish
- Jenkins pipeline setup
- Docker image optimization
- Logging + monitoring setup
- Production readiness

---

## 📁 15. Project Structure

```
SignalOps/
├── apps/
│   ├── api-gateway/          # NestJS main API
│   ├── event-broker/         # Event processing
│   ├── worker-service/       # Background jobs
│   ├── simulator/            # Device data generator
│   └── dashboard/            # React frontend
├── libs/
│   ├── common/               # Shared utilities
│   ├── models/               # Data models
│   └── constants/            # Constants
├── infrastructure/
│   ├── docker-compose.yml    # Local setup
│   ├── Dockerfile.api        # API container
│   ├── Dockerfile.worker     # Worker container
│   └── Jenkinsfile           # CI/CD pipeline
├── docs/
│   ├── SPECIFICATION.md      # This file
│   ├── ARCHITECTURE.md       # Architecture details
│   ├── API.md                # API documentation
│   └── DEPLOYMENT.md         # Deployment guide
└── package.json              # Monorepo config
```

---

## 💣 16. Key Selling Points

- **🎯 Event-Driven Architecture**: Scalable event processing
- **⚡ Real-time Processing**: Sub-second anomaly detection
- **🗺️ Geo-based Monitoring**: Location-aware alerts
- **📦 Queue-based Async**: Reliable job processing with BullMQ
- **🔗 Full-Stack System**: Backend + UI + DevOps
- **📊 Production-Ready**: Logging, monitoring, CI/CD
- **🚀 Cloud-Native**: Containerized, easy to scale

---

## 🎯 17. Success Criteria

✅ Backend services run stably (no crashes)  
✅ Dashboard UI displays real-time data  
✅ Map shows network status with correct indicators  
✅ Full Docker environment runs with single command  
✅ Jenkins pipeline executes successfully  
✅ Alerts are triggered correctly per thresholds  
✅ WebSocket connections are reliable  
✅ Code is well-documented and structured  

---

## 📋 18. Implementation Notes

- Use **NestJS modules** for clean separation
- Implement **proper error handling** at each layer
- Add **logging throughout** for debugging
- Use **environment variables** for configuration
- Implement **database transactions** for consistency
- Add **data validation** at API boundaries
- Use **WebSocket namespaces** for organization
- Keep **UI state management** simple (consider Redux/Zustand)

---

**Next Steps**: Pass to implementation team with this specification. Each phase can be developed independently and integrated.
