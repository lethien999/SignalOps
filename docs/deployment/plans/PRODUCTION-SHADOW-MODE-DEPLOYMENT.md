# 📋 Production Shadow Mode Deployment - M13

**Ngày chuẩn bị**: 12/05/2026  
**Trạng thái**: Ready for deployment  
**Giai đoạn**: Giai đoạn 1 - Shadow Mode (0% ML alerts, 100% rule-based)

---

## Bước 1: Kiểm tra trước triển khai

### Pre-flight Checklist
- [x] Staging A/B test chạy thành công (worker healthy)
- [x] Docker image built (`infrastructure-worker:latest`)
- [x] ONNX model file ready: `apps/worker-service/src/assets/anomaly-model.onnx`
- [x] MongoDB backup created
- [x] Redis backup created
- [x] All tests pass: `npm run test`
- [x] PR #27 approved & merged to main
- [x] Dockerfile fixed: libstdc++ + glibc added

---

## Bước 2: Cấu hình production `.env.production`

Tạo file `.env.production` (hoặc update `.env` hiện tại):

```bash
# ===== Environment =====
NODE_ENV=production

# ===== API Gateway =====
API_GATEWAY_PORT=3000
API_GATEWAY_HOST=0.0.0.0
API_KEY=<use-strong-key>
ADMIN_API_KEY=<use-strong-key>

# ===== MongoDB (Production) =====
MONGODB_URI=mongodb://signalops:secret123@mongodb-prod:27017/signalops-db?authSource=admin
MONGODB_USERNAME=signalops
MONGODB_PASSWORD=<use-strong-password>
MONGODB_INITDB_DATABASE=signalops-db

# ===== Redis (Production) =====
REDIS_HOST=redis-prod
REDIS_PORT=6379
REDIS_PASSWORD=<use-strong-password>

# ===== JWT & Auth =====
JWT_SECRET=<use-strong-secret-key-min-32-chars>
JWT_EXPIRATION=24h

# ===== Worker Service =====
WORKER_CONCURRENCY=10          # Increase for production (5-20 tuỳ CPU)
WORKER_MAX_ATTEMPTS=3
QUEUE_EVENT_PROCESSING=event-processing
AUTO_RESOLVE_MIN_OPEN_MINUTES=2

# ===== M13: AI Anomaly Detection =====
ANOMALY_THRESHOLD=80           # ML decision threshold

# SHADOW MODE (Giai đoạn 1):
# - AI scores events but does NOT create alerts
# - Rule-based detection creates all alerts
# - Purpose: collect metrics, compare ML vs rule-based
AI_AB_TEST=true                # Enable A/B infrastructure
AI_ROLLOUT_PERCENT=0           # 0% = Shadow mode (no ML alerts)

# ===== Alert Thresholds (Rule-based) =====
THRESHOLD_LATENCY_MS=200       # Warning level
THRESHOLD_PACKET_LOSS_PERCENT=5
THRESHOLD_SIGNAL_STRENGTH_DBM=-90

# ===== Logging =====
LOG_LEVEL=info                 # info for production (not debug)
LOG_FORMAT=json

# ===== CORS =====
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# ===== Monitoring =====
METRICS_ENABLE=true
PROMETHEUS_PORT=9090

# ===== WebSocket =====
WEBSOCKET_ENABLE=true
WEBSOCKET_NAMESPACE=/socket.io
```

---

## Bước 3: Docker Compose Production Deployment

**Option A: Single-node (Recommended for start)**
```bash
# Load production env
export $(cat .env.production | grep -v '^#' | xargs)

# Deploy (single instance, all services)
docker compose --env-file .env.production \
  -f infrastructure/docker-compose.yml up -d

# Verify all services healthy
docker compose -f infrastructure/docker-compose.yml ps

# Check logs
docker compose -f infrastructure/docker-compose.yml logs --tail=50 worker
```

**Option B: Multi-node (K8s / advanced)**
- Use infrastructure/k8s/ manifests (if available)
- Or scale with: `docker compose --scale worker=3`

---

## Bước 4: Verify Deployment

### Health Checks
```bash
# API Gateway health
curl http://localhost:3000/api/health

# Dashboard health
curl http://localhost:3001/api/health

# Check MongoDB connection
curl -X GET http://localhost:3000/api/admin/metrics

# Check Redis queue depth
redis-cli -h redis-prod INFO stats
```

### Verify AI Shadow Mode
```bash
# Check logs for ML scoring (should be present even with 0% rollout)
docker compose logs worker | grep -i "ai\|ml\|anomaly"

# Verify ONNX model loaded
docker compose logs worker | grep "ML model loaded"

# Check A/B rollout disabled (0%)
docker compose logs worker | grep -i "rollout\|a/b"
```

### Sample event test
```bash
# Send test event to trigger alert creation
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device",
    "metrics": {
      "latency": 250,
      "packetLoss": 8,
      "signalStrength": -95
    },
    "location": {
      "lat": 10.5,
      "lng": 106.5,
      "name": "Ho Chi Minh"
    }
  }'

# Verify alert created (should be rule-based, not ML)
# Check dashboard or query MongoDB: db.alerts.findOne({ deviceId: "test-device" })
```

---

## Bước 5: Monitoring & Logging

### Real-time Monitoring
```bash
# Watch worker logs
docker compose logs -f worker

# Watch all services
docker compose logs -f

# Monitor queue depth
watch -n 5 'redis-cli -h redis-prod LLEN event-processing'
```

### Prometheus Scrape Setup
```bash
# Metrics exposed at: http://localhost:9090/api/v1/targets
# Key metrics to monitor:
# - signalops_alert_created_total{source="rule-based"}
# - signalops_ml_score_computed_total
# - signalops_worker_job_duration_seconds
# - signalops_false_positive_rate
```

### Application Logs
All logs stored in: `/var/log/signalops/` (or configure in docker-compose)

---

## Bước 6: Daily Monitoring Tasks (Shadow Mode)

**Hàng ngày (tối thiểu):**

1. **Check Alert Volume**
   ```javascript
   // MongoDB query
   db.alerts.countDocuments({ 
     createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 1)) },
     source: "rule-based"
   })
   ```

2. **Verify ML Scoring Happening**
   ```javascript
   // Check ML scores are computed (even if not used for alerts)
   db.alerts.find({ anomalyScore: { $exists: true } }).count()
   ```

3. **Check Error Rate**
   ```bash
   docker compose logs worker | grep -i "error\|exception" | wc -l
   # Should be < 10 errors/hour
   ```

4. **Check Queue Health**
   ```bash
   # Queue should be nearly empty (< 100 jobs in queue)
   redis-cli LLEN event-processing
   ```

---

## Bước 7: Decision Gate - When to Move to Next Stage

**After 1 week in Shadow Mode, check:**

| Metric | Target | Action |
|--------|--------|--------|
| **Worker Uptime** | > 99.9% | ✅ Go / ❌ Debug |
| **Error Rate** | < 0.1% | ✅ Go / ❌ Debug |
| **ML Scoring Latency** | < 150ms p99 | ✅ Go / ❌ Optimize |
| **False Positive (rule-based)** | < 5% | ✅ Go / ⚠️ Monitor |
| **Alert Latency (p95)** | < 100ms | ✅ Go / ⚠️ Monitor |

**If all GO: Proceed to Giai đoạn 2 (Early Adopter: 5% AI rollout)**

See: [PRODUCTION-ROLLOUT-PLAN.md](PRODUCTION-ROLLOUT-PLAN.md#giai-đoạn-2-early-adopter-tuần-2)

---

## Bước 8: Rollback Plan (nếu cần)

Nếu phát hiện vấn đề, rollback ngay:

```bash
# Stop shadow mode (zero AI alerts)
# Set AI_ROLLOUT_PERCENT=0 in .env and redeploy, hoặc:

# Disable ONNX inference (fallback to rule-based only)
docker compose exec worker bash
  # Inside container:
  rm /app/dist/src/assets/anomaly-model.onnx
  exit

# Or disable entire AI module (revert docker-compose.yml)
git checkout HEAD -- infrastructure/docker-compose.yml
docker compose up -d
```

---

## Bước 9: Deployment Notification

**Gửi thông báo:**
- [ ] Notify Operations team (deployment complete, shadow mode active)
- [ ] Notify Support (no changes to alert behavior, for now)
- [ ] Notify Engineering (ready for Giai đoạn 2 after 1 week)
- [ ] Document deployment time & version in CHANGELOG

---

## Artifacts & References

| Item | Location | Status |
|------|----------|--------|
| ML Model (ONNX) | `apps/worker-service/src/assets/anomaly-model.onnx` | ✅ Ready |
| Docker Image | `infrastructure-worker:latest` | ✅ Built |
| Env Config | `.env.production` | 📋 Create before deploy |
| PR | [#27](https://github.com/lethien999/SignalOps/pull/27) | ✅ Merged |
| Docs | [PRODUCTION-ROLLOUT-PLAN.md](PRODUCTION-ROLLOUT-PLAN.md) | ✅ Complete |

---

## Contact & Escalation

- **On-call**: [Engineering team contact]
- **Monitoring**: [Prometheus/Grafana link]
- **Rollback**: See Bước 8
- **Questions**: Check [OPERATIONS.md](OPERATIONS.md) or [DEPLOYMENT.md](DEPLOYMENT.md)

---

*Created: 12/05/2026 | Status: Ready for Shadow Mode Deployment*
