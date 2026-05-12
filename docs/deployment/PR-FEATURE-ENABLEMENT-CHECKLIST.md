# 🚀 PR Checklist: Safe Feature Enablement & Migration

**PR Title**: `feat: fix Dockerfile.worker ENTRYPOINT + extend alert schema with AI metadata`  
**Commit**: `3a715a3`  
**Branch**: `feat/ml-ab-rollout`  
**Status**: Ready for staged rollout  
**Last Updated**: 2026-05-12

---

## 📋 Summary of Changes

| Component | Change | Impact | Status |
|-----------|--------|--------|--------|
| `infrastructure/Dockerfile.worker` | CMD → ENTRYPOINT, Debian base, libstdc++6/libgomp1 | ONNX runtime compatibility ✅ | Live |
| `apps/worker-service/src/repositories/alert.repository.ts` | Added AI metadata schema fields | Alerts can store ML scores/labels | Live |
| `apps/worker-service/src/main.ts` | A/B rollout logic (AI_ROLLOUT_PERCENT) | Shadow mode + staged rollout | Live @ 10% |
| `apps/api-gateway/src/modules/event/event.controller.ts` | ApiKeyGuard on POST /api/events | API key required for event ingestion | Live |
| `apps/dashboard/components/AlertTable.tsx` | Severity config fallback + safe icon lookup | Dashboard UI stable | Live |
| `test_events.ps1` | Normalized DTO (deviceId, location, metrics) | Test script produces valid payloads | Ready |

---

## 🔄 Feature Enablement Stages

Each stage below includes prerequisites, configuration, deployment, and health checks.

---

### **Stage 1: Redis & WebSocket Re-enablement** *(Current: Disabled for local dev)*

**Affected Services**: API Gateway, Worker Service  
**Current Status**: 🔴 Disabled in local development  

#### 1.1 Prerequisites
- [ ] Redis cluster/instance running (currently on `redis:7.0-alpine`)
- [ ] Docker Compose Redis service health verified
- [ ] API Gateway deployment updated

#### 1.2 Configuration Changes
```bash
# .env.production — no changes needed (defaults assume Redis enabled)
# When REDIS_HOST is set and not 'localhost', WebSocket listeners activate:
REDIS_HOST=redis                    # or external Redis endpoint
REDIS_PORT=6379
REDIS_DB=1                         # Namespace for pubsub + job queues
```

#### 1.3 Deployment Steps
```bash
# Step 1: Verify Redis is running
docker compose exec redis redis-cli ping
# Expected: PONG

# Step 2: Rebuild API Gateway & Worker with latest code
docker compose build --no-cache api-gateway worker-service

# Step 3: Deploy with Redis connected
docker compose up -d --force-recreate api-gateway worker-service

# Step 4: Verify Redis integrations are active
docker logs signalops-api-gateway --tail 30 | grep -i "redis\|pubsub"
docker logs signalops-worker --tail 30 | grep -i "redis\|queue"
```

#### 1.4 Health Checks
```bash
# Check 1: API Gateway WebSocket Pub/Sub listener started
docker logs signalops-api-gateway | grep -E "WebSocket Pub/Sub listener" | head -1
# Expected: Should NOT contain "disabled for local development"

# Check 2: Worker can consume from Redis queue
docker logs signalops-worker | grep -E "event-processing queue|BullMQ" | head -1
# Expected: Should log queue subscription

# Check 3: Send test event and verify it's queued
curl -X POST http://localhost:3000/api/events \
  -H "x-api-key: signalops-local-key" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-redis","location":"lab","metrics":{"cpu":75}}'
# Expected: 202 Accepted with jobId

# Check 4: Monitor Redis queue depth
docker compose exec redis redis-cli -n 1 LLEN "bull:event-processing:queue"
# Expected: Should decrease as worker processes jobs
```

#### 1.5 Rollback Plan
```bash
# If WebSocket/Redis issues detected:
docker compose down redis api-gateway worker-service
# Revert .env.production REDIS_HOST → localhost (disables)
docker compose up -d api-gateway worker-service
```

---

### **Stage 2: AI Rollout Progression** *(Current: 10%)*

**Affected Services**: Worker Service  
**Current Status**: 🟡 Shadow mode @ 10% (Early adopter phase)  

#### 2.1 Rollout Schedule

| Phase | Date | AI_ROLLOUT_PERCENT | Description | Duration |
|-------|------|-------------------|-------------|----------|
| Shadow | 14-21/05 | 0% | ML scores logged, no alerts | 1 week |
| **Early** | **21-28/05** | **5-10%** | ML alerts for 5-10% of events | 1 week |
| Scaled | 28-04/06 | 25% | 25% of events use ML | 1 week |
| Gradual | 04-11/06 | 50→75→90% | Progressive increase | 1 week |
| Full | 11/06+ | 100% | All events use ML | Permanent |

#### 2.2 Configuration Changes
```bash
# .env.production — Update AI_ROLLOUT_PERCENT
AI_AB_TEST=true                    # A/B test infrastructure enabled
AI_ROLLOUT_PERCENT=10              # ← Current: Early adopter phase
ANOMALY_THRESHOLD=80               # ML decision threshold (0-100)
```

**Progression**: To move to next phase, update `AI_ROLLOUT_PERCENT` → `{5, 10, 25, 50, 75, 90, 100}` and redeploy worker.

#### 2.3 Deployment Steps
```bash
# Example: Increase from 10% → 25%
# Step 1: Update .env.production
sed -i 's/AI_ROLLOUT_PERCENT=10/AI_ROLLOUT_PERCENT=25/' .env.production

# Step 2: Rebuild & restart worker
docker compose build --no-cache worker-service
docker compose up -d --force-recreate worker-service

# Step 3: Verify env var inside container
docker exec signalops-worker env | grep AI_ROLLOUT_PERCENT
# Expected: AI_ROLLOUT_PERCENT=25
```

#### 2.4 Health Checks
```bash
# Check 1: ML model loaded at startup
docker logs signalops-worker | grep "ML model loaded" | tail -1
# Expected: "✓ ML model loaded from src/assets/anomaly-model.onnx"

# Check 2: Verify rollout percent is applied
docker logs signalops-worker | grep "AI_ROLLOUT_PERCENT" | tail -1
# Expected: Should log the value set

# Check 3: Send 100 test events and verify alert count
# For 25% rollout: expect ~25 alerts with aiModelVersion set
# Run test script and check:
curl http://localhost:3000/api/alerts | jq '.data | length'
# Expected: ~25 alerts (25% of 100 events sent)

# Check 4: Verify alert metadata present
curl http://localhost:3000/api/alerts | jq '.data[0] | {aiModelVersion, anomalyScore, anomalyLabel}'
# Expected: { "aiModelVersion": "ml-shadow-v2", "anomalyScore": 62, "anomalyLabel": "suspicious" }

# Check 5: Monitor alert distribution (ML vs rule-based)
docker logs signalops-worker | grep -E "Branch: ML|Branch: deterministic" | tail -20
# Expected: ~25% ML branch hits, ~75% deterministic hits
```

#### 2.5 Pause / Abort Plan
```bash
# If precision or recall drops below thresholds:
# 1. Set rollout to 0%
sed -i 's/AI_ROLLOUT_PERCENT=.*/AI_ROLLOUT_PERCENT=0/' .env.production
docker compose up -d --force-recreate worker-service

# 2. Adjust ANOMALY_THRESHOLD if needed
# Precision low → Increase ANOMALY_THRESHOLD (80→85)
# Recall low → Decrease ANOMALY_THRESHOLD (80→75)
sed -i 's/ANOMALY_THRESHOLD=80/ANOMALY_THRESHOLD=85/' .env.production
docker compose up -d --force-recreate worker-service

# 3. Wait 48h, collect metrics, re-evaluate
```

---

### **Stage 3: OpenTelemetry / Tracing** *(Current: Disabled by default)*

**Affected Services**: API Gateway, Worker Service, Dashboard  
**Current Status**: 🔴 Disabled (opt-in, requires additional packages)  

#### 3.1 Prerequisites
- [ ] OpenTelemetry packages installed (`npm install --save @opentelemetry/api @opentelemetry/sdk-node`)
- [ ] Jaeger or Zipkin endpoint configured
- [ ] Span collector service running

#### 3.2 Configuration Changes
```bash
# .env.production — Add tracing config
TRACING_ENABLED=true                # Enable OpenTelemetry instrumentation
JAEGER_AGENT_HOST=localhost          # Jaeger collector
JAEGER_AGENT_PORT=6831               # UDP port
SERVICE_NAME=signalops               # Service identifier

# Or use environment variables:
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
export OTEL_SERVICE_NAME="signalops"
```

#### 3.3 Deployment Steps
```bash
# Step 1: Install packages (if not already done)
npm install --save \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/exporter-trace-otlp-http

# Step 2: Enable tracing in libs/common/src/tracing.config.ts
# Uncomment instrumentation setup

# Step 3: Rebuild apps
npm run build

# Step 4: Redeploy with tracing enabled
docker compose up -d --force-recreate api-gateway worker-service
```

#### 3.4 Health Checks
```bash
# Check 1: Verify tracing middleware is loaded
docker logs signalops-api-gateway | grep -i "opentelemetry\|tracing" | head -3
# Expected: Should log tracing initialization (not "disabled in this build")

# Check 2: Verify spans are exported
# Query Jaeger UI: http://localhost:16686
# Expected: Service "signalops" should appear in service dropdown

# Check 3: Send test request and check spans
curl http://localhost:3000/api/health
# Expected: Trace ID should appear in API response headers (X-Trace-ID)
```

#### 3.5 Disable Plan
```bash
# If tracing causes performance issues:
# Comment out tracing in libs/common/src/tracing.config.ts
# Or set env:
export TRACING_ENABLED=false
docker compose up -d --force-recreate api-gateway worker-service
```

---

### **Stage 4: Per-Tenant AI Control** *(Future: Not in this PR)*

**Affected Services**: API Gateway, Tenant Module  
**Current Status**: 🟢 Ready (schema field exists, backend ready)  

#### 4.1 Preparation
- [ ] Tenant schema already extended with `aiEnabled` boolean field
- [ ] Admin UI endpoint prepared for toggling

#### 4.2 Future Deployment (post-M13)
```bash
# Set aiEnabled per tenant in MongoDB:
db.tenants.updateOne(
  { name: "tenant-a" },
  { $set: { aiEnabled: false } }
);

# Worker will check:
if (!tenant.aiEnabled && AI_ROLLOUT_PERCENT > 0) {
  // Use rule-based alerts only for this tenant
}
```

---

## ✅ Pre-Merge Checklist

Before merging `feat/ml-ab-rollout` into `main`:

- [ ] All 3 commits pushed to `origin`
- [ ] Code review completed (at least 1 approval)
- [ ] Unit tests passing: `npm run test`
- [ ] Integration tests passing: `npm run test:integration` (if added)
- [ ] Build succeeds: `npm run build` + `docker compose build`
- [ ] Docker images build without warnings/errors
- [ ] No breaking changes to API contracts
- [ ] Backward-compatible schema changes (all new fields optional or have defaults)
- [ ] All secrets/API keys NOT committed (use `.env.local`, `.env.production`)

---

## 📊 Monitoring During Rollout

### Key Metrics to Track

| Metric | Query | Target | Alert if |
|--------|-------|--------|----------|
| **Alert Volume** | `count(alerts) by (aiModelVersion)` | ML: 10% of total | Drops below 5% or above 15% |
| **Precision** | TP/(TP+FP) on test set | > 80% | Falls below 70% |
| **Recall** | TP/(TP+FN) on test set | > 75% | Falls below 65% |
| **Latency (p95)** | Response time for `/api/events` | < 200ms | Exceeds 500ms |
| **Worker Queue Depth** | `bull:event-processing:queue` length | < 100 jobs | Exceeds 1000 |
| **ONNX Inference Time** | Worker logs `ml_inference_ms` | 10-50ms | Exceeds 100ms |

### Grafana Dashboard
```
Import: docs/ml/STAGING-AB-REPORT.md → Dashboard "A/B Test Rollout"
Panels:
  - Alert distribution (ML % vs Rule-based %)
  - Inference latency histogram
  - Queue depth over time
  - Error rate by type
```

---

## 🔐 Rollback Procedures

### If AI Feature Causes Issues

**Symptom**: High false positive rate, precision < 70%  
**Action**:
```bash
# Rollback AI_ROLLOUT_PERCENT to 0
echo "AI_ROLLOUT_PERCENT=0" >> .env.production
docker compose up -d --force-recreate worker-service
# Monitor: Alerts should revert to rule-based only
```

### If ONNX Runtime Fails

**Symptom**: Worker crashes, logs show "ld-linux" or "ONNX" errors  
**Action**:
```bash
# Revert to Alpine base or verify Debian dependencies
docker compose pull
docker compose build --no-cache worker-service
docker compose up -d --force-recreate worker-service
# Fallback to deterministic scoring (no ML inference)
```

### If WebSocket/Redis Down

**Symptom**: Dashboard disconnects, events queue up  
**Action**:
```bash
# Restart Redis
docker compose restart redis

# Or switch to polling mode (dashboard falls back automatically)
# Check: dashboard should show "Polling alerts (Redis unavailable)"
```

---

## 📝 Deployment Approval Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| **Author** | AI Agent | 2026-05-12 | ✅ Ready |
| **Code Reviewer** | *Pending* | - | ⏳ |
| **QA Lead** | *Pending* | - | ⏳ |
| **Ops / DevOps** | *Pending* | - | ⏳ |
| **Product Lead** | *Pending* | - | ⏳ |

**Approval Gate**: All 5 roles must sign off before merging to `main`.

---

## 🔗 Related Documents

- [PRODUCTION-SHADOW-MODE-DEPLOYMENT.md](PRODUCTION-SHADOW-MODE-DEPLOYMENT.md) — Initial shadow mode setup
- [PRODUCTION-ROLLOUT-PLAN.md](PRODUCTION-ROLLOUT-PLAN.md) — Full rollout schedule
- [STAGING-AB-REPORT.md](STAGING-AB-REPORT.md) — Staging A/B results
- [AI-EVALUATION.md](../ml/AI-EVALUATION.md) — ML model performance baseline
- [M13-Client-AI.md](../internal/milestones/M13-Client-AI.md) — M13 milestone tracker

---

## ❓ FAQ

**Q: Can I skip Redis enablement and go straight to AI rollout?**  
A: Yes. Redis is optional; WebSocket listeners gracefully degrade. But for production, Redis is recommended for reliability.

**Q: What if I want to rollback to 0% AI but keep WebSocket live?**  
A: Set `AI_ROLLOUT_PERCENT=0` and redeploy. WebSocket remains active independently.

**Q: How long should I wait at each rollout stage?**  
A: Minimum 3-5 days to collect meaningful metrics (false positives, false negatives, latency). 1 week is recommended.

**Q: Who approves moving to the next rollout percentage?**  
A: Product Lead + QA Lead + Ops team must jointly review metrics and approve.

**Q: Can I deploy this PR outside the checklist order?**  
A: Not recommended. Follow stages 1→2→3→4 for safety and observability.

---

**Last Reviewed**: 2026-05-12 17:00 UTC  
**Next Review**: After Stage 1 health checks pass
