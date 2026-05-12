# 🚀 Production Shadow Mode - Ready to Deploy (14/05 sau 12:00)

**Status**: 📋 PREPARED - Ready to execute after Staging Decision (NOT DEPLOYED YET)

**Timeline**:
- 12-14/05: Staging A/B test monitoring (ONGOING)
- 14/05 12:00: Decision gate → If PASS, proceed
- 14/05 14:00-18:00: Production shadow mode deployment window

---

## ✅ Pre-Deployment Checklist (Staging PASS là điều kiện)

### Điều kiện tiên quyết

- [ ] **Staging A/B test PASS** (Precision ≥ 88%, Recall ≥ 90%)
  - Proof: [Decision form từ STAGING-MONITORING-CHECKLIST.md]
  
- [ ] **PR #27 reviewed & approved**
  - Reviewers: _________________
  - Approval date: ___/05/2026

- [ ] **PR #27 merged to main**
  ```bash
  # Verify merge
  git log main --oneline | grep "M13"
  ```

- [ ] **Production environment ready**
  - MongoDB backup created: ___/05
  - Redis backup created: ___/05
  - On-call team notified: ___/05

---

## 📋 Production Deployment Steps

### Bước 1: Chuẩn bị .env.production

**File location**: `d:\dev\SignalOps\.env.production`

```bash
# Copy template
cp .env.production.example .env.production

# Edit values
code .env.production

# Verify required variables
grep -E "ANOMALY_THRESHOLD|AI_ROLLOUT_PERCENT|AI_AB_TEST" .env.production
```

**Shadow Mode Config** (giai đoạn 1):
```bash
ANOMALY_THRESHOLD=80           # ← Từ staging threshold sweep
AI_AB_TEST=true                # ← Enable A/B infrastructure
AI_ROLLOUT_PERCENT=0           # ← Shadow mode: NO ML alerts (score only)
```

**Verification**:
```bash
# File tồn tại
[ -f .env.production ] && echo "✓ File exists" || echo "✗ Missing"

# Format hợp lệ
grep -q "^NODE_ENV=production" .env.production && echo "✓ NODE_ENV set"
grep -q "^ANOMALY_THRESHOLD=80" .env.production && echo "✓ Threshold set"
```

### Bước 2: Backup Production Data

**MongoDB Backup**:
```bash
# Local backup (nếu chạy local)
docker compose exec mongodb mongosh --eval "db.adminCommand('shutdown')" 2>/dev/null || true
sleep 2
tar -czf mongodb-backup-$(date +%Y%m%d-%H%M%S).tar.gz /path/to/mongodb/data/
echo "✓ MongoDB backup created"

# Hoặc: dùng managed MongoDB (Atlas/DocumentDB) - backup tự động
```

**Redis Backup**:
```bash
docker compose exec redis redis-cli BGSAVE
# Expected: "Background saving started"
sleep 5
docker compose exec redis redis-cli LASTSAVE
# Expected: Unix timestamp hiện tại
```

**Verification**:
- [ ] MongoDB backup file tồn tại: ___________
- [ ] Redis LASTSAVE gần nhất: ___________

### Bước 3: Kiểm tra Production Infrastructure

**MongoDB Connection**:
```bash
# Nếu local test trước
docker compose --env-file .env.production exec mongodb mongosh --eval "db.version()"
# Expected: "7.0.x" hoặc version MongoDB
```

**Redis Connection**:
```bash
docker compose --env-file .env.production exec redis redis-cli ping
# Expected: "PONG"
```

**ONNX Model File**:
```bash
# Verify model exists
ls -lh apps/worker-service/src/assets/anomaly-model.onnx
# Expected: file size ~2-5MB

# Verify model readable
file apps/worker-service/src/assets/anomaly-model.onnx
# Expected: ONNX or binary file
```

**Verification**:
- [ ] MongoDB version: __________
- [ ] Redis ping: OK / FAIL
- [ ] ONNX model size: __________

### Bước 4: Deploy Production Stack

```bash
# Navigate to project root
cd d:\dev\SignalOps

# Pull latest code (đã merge PR #27)
git pull origin main

# Verify commit history
git log --oneline -3
# Expected: Latest commit là M13 merge

# Build new images (if needed)
docker compose -f infrastructure/docker-compose.yml build --no-cache

# Deploy with .env.production
$env:NODE_ENV='production'
docker compose --env-file .env.production -f infrastructure/docker-compose.yml up -d

# Monitor startup (2-3 minutes)
sleep 10
docker compose ps
# Expected: api-gateway, worker, dashboard = UP
```

**Verification**:
- [ ] Build completed: ___/05 __:__
- [ ] Containers started: ___/05 __:__

### Bước 5: Verify Production Deployment

**Health Check - API Gateway**:
```bash
# Local test
curl http://localhost:3000/api/health -s | jq .
# Expected:
#{
#  "status": "ok",
#  "mongodb": true,
#  "redis": true
#}
```

**Health Check - Worker**:
```bash
docker compose logs --tail=20 signalops-worker | grep -i "connected\|listening\|ready"
# Expected: "Worker started successfully" hoặc "Queue listener ready"
```

**ML Model Load Verification**:
```bash
docker compose logs --tail=50 signalops-worker | grep -i "model\|onnx\|ml"
# Expected: "ML model loaded from..." hoặc "ONNX inference ready"
```

**Test Event Ingestion**:
```bash
# Send test event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: $(grep API_KEY .env.production | cut -d= -f2)" \
  -d '{
    "deviceId": "prod-test-device",
    "metrics": { "latency": 250, "packetLoss": 8, "signalStrength": -95 },
    "location": { "lat": 10.5, "lng": 106.5, "name": "Test Location" }
  }'

# Expected: 202 Accepted
# Verify in MongoDB:
docker compose exec mongodb mongosh --eval "use signalops-db; db.events.findOne({ deviceId: 'prod-test-device' })"
```

**Verification Checklist**:
- [ ] API /health returns 200: ___/05 __:__
- [ ] Worker logs show ML loaded: ___/05 __:__
- [ ] Test event created: ___/05 __:__
- [ ] Event visible in MongoDB: ___/05 __:__

### Bước 6: Verify Shadow Mode (AI_ROLLOUT_PERCENT=0)

**Expected Behavior**:
- AI chấm điểm ALL events → `anomalyScore` + `anomalyConfidence` stored
- Nhưng KHÔNG tạo alert từ AI (0% rollout)
- Rule-based detection TẠO alerts như bình thường

**Verification Query**:
```bash
docker compose exec mongodb mongosh --eval "
use signalops-db

// Should find events with anomalyScore
db.events.findOne({ anomalyScore: { \$exists: true } })

// Alerts created ONLY by rule-based (source != 'ml')
db.alerts.countDocuments({ source: 'ml' })  // Expected: 0 (shadow mode)
db.alerts.countDocuments({ source: 'rule-based' })  // Expected: > 0
"
```

**Log Verification**:
```bash
docker compose logs --tail=100 signalops-worker | grep -i "shadow\|rollout.*0\|ai.*score"
# Expected pattern: "Scoring event in shadow mode" hoặc "AI_ROLLOUT_PERCENT=0: storing score only"
```

**Verification**:
- [ ] Events have anomalyScore: ___/05 __:__
- [ ] Alerts from ML: 0 (shadow mode OK): ___/05 __:__
- [ ] Alerts from rule-based: > 0 (normal): ___/05 __:__

### Bước 7: Prometheus Metrics Check

```bash
# Access Prometheus
open http://localhost:9090

# Query: Check AI metrics
http://localhost:9090/graph?g0.expr=signalops_ml_score_computed_total

# Expected: Rising counter (events being scored by ML)
```

**Verification**:
- [ ] Prometheus scraping metrics: ___/05 __:__
- [ ] ML score counter increasing: ___/05 __:__

---

## 🎯 Post-Deployment Actions (Hôm sau 13/05)

### Hàng ngày trong 1 tuần (Shadow Mode Baseline)

| Ngày | Mục tiêu | Checklist |
|-----|---------|-----------|
| 14/05 | Kiểm tra 4 giờ sau deploy | ✓ Health / ✓ Events flowing / ✓ No errors |
| 15/05 | 24h baseline | ✓ Metrics stable / ✓ Uptime > 99% |
| 16-20/05 | Cumulative metrics | ✓ Precision tracking / ✓ Recall estimation |
| 21/05 | 1 week decision | Compare AI scores vs rule-based |

### Monitoring Commands

```bash
# Real-time event count (24h)
docker compose exec mongodb mongosh --eval "
db.events.countDocuments({ createdAt: { \$gte: new Date(Date.now() - 24*60*60*1000) } })
"

# AI scores stored (24h)
docker compose exec mongodb mongosh --eval "
db.events.countDocuments({ 
  anomalyScore: { \$exists: true },
  createdAt: { \$gte: new Date(Date.now() - 24*60*60*1000) }
})
"

# Compare: Rule-based vs AI distribution
docker compose exec mongodb mongosh --eval "
db.events.aggregate([
  { \$match: { anomalyScore: { \$exists: true } } },
  { \$bucket: { groupBy: '\$anomalyScore', boundaries: [0, 20, 40, 60, 80, 100], default: 'other' } },
  { \$sort: { _id: 1 } }
])
"
```

---

## 🔄 Rollback Procedure (If Issues Detected)

**Immediate Rollback** (< 1 hour):
```bash
# Stop production
docker compose down

# Revert code to previous version
git checkout HEAD~1  # Back to before M13

# Restart with old config
docker compose --env-file .env up -d

# Verify
docker compose ps
curl http://localhost:3000/api/health
```

**Data Rollback** (If data corruption):
```bash
# Restore MongoDB from backup
tar -xzf mongodb-backup-<timestamp>.tar.gz -C /path/to/mongodb/data/
docker compose restart mongodb
```

**Rollback Decision Criteria**:
- Worker crash không recovery
- Error rate > 5% liên tục
- Database connection lost > 1 giờ
- API latency > 1000ms

---

## 📞 Escalation Contacts

| Role | Name | Phone | On-call |
|------|------|-------|---------|
| Engineering Lead | ___________ | __________ | Yes/No |
| DevOps | ___________ | __________ | Yes/No |
| Database Admin | ___________ | __________ | Yes/No |

---

## ✍️ Deployment Sign-off

**Deployed by**: __________________ (Date: __/05 Time: __ :__)  
**Verified by**: __________________ (Date: __/05 Time: __ :__)  
**Approved by**: __________________ (Date: __/05 Time: __ :__)  

**Notes**:
- Deployment successful: ✓ / ✗
- Issues encountered: _____________________
- Rollback used: Yes / No
- Time to stabilize: __ minutes

---

**Status**: 📋 Ready (NOT DEPLOYED YET)  
**Next Action**: Execute after Staging PASS on 14/05  
**Timeline**: 14/05 14:00-18:00 deployment window
