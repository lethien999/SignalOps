# M13: AI Anomaly Scoring - Evaluation & A/B Testing Guide

## Overview

SignalOps M13 introduces AI-powered anomaly detection in **shadow mode** - scoring events in parallel with the existing rule-based system without disrupting current alerts. This guide covers evaluating the AI model and A/B testing it in staging.

---

## Phase 1: Evaluate Precision/Recall (Historical Data)

### Why Evaluate?

Before deploying AI, we need to validate it works correctly by:
- Comparing AI scores against real alerts that were created historically
- Calculating precision, recall, and F1 scores
- Identifying if thresholds need tuning

### How to Run Evaluation

#### Prerequisites

```bash
# Start MongoDB (if not running)
docker compose -f infrastructure/docker-compose.yml up -d mongodb

# Verify connection
mongosh "mongodb://user:password@localhost:27017/signalops-db"
```

#### Run Evaluation Script

```bash
# Evaluate last 30 days of data (default)
npm run eval:ai

# Evaluate custom period
EVAL_DAYS=60 npm run eval:ai

# Use custom anomaly threshold (0-100)
ANOMALY_THRESHOLD=70 npm run eval:ai

# Full example
MONGODB_URI="mongodb://user:password@localhost:27017/signalops-db" \
  EVAL_DAYS=60 \
  ANOMALY_THRESHOLD=70 \
  npm run eval:ai
```

#### Expected Output

```
📊 M13 AI Anomaly Scoring Evaluation
   Period: Last 30 days
   Threshold: 65
-----------------------------------

Events analyzed: 4,250
Errors: 2

Classification Results:
  True Positives (TP):  425    (anomaly predicted + alert exists)
  False Positives (FP): 85     (anomaly predicted + no alert)
  False Negatives (FN): 95     (no anomaly + alert exists)
  True Negatives (TN):  3,645  (no anomaly + no alert)

Metrics:
  Precision: 83.33%    (how many predicted anomalies are correct)
  Recall:    81.73%    (how many actual anomalies were caught)
  F1 Score:  82.51     (balanced precision/recall)
  Accuracy:  95.72%

Interpretation:
  ✓ Precision is high: few false positives
  ✓ Recall is high: catching most anomalies

📄 Report saved to: /path/to/evaluation-report.json
```

#### Interpreting Results

**Precision = TP / (TP + FP)** — "Of the anomalies we predicted, how many were correct?"
- **High precision** (>80%): Few false alarms, operator trust increases
- **Low precision** (<60%): Many false alarms, operators may ignore alerts

**Recall = TP / (TP + FN)** — "Of the actual anomalies, how many did we catch?"
- **High recall** (>80%): Few missed anomalies, good detection coverage
- **Low recall** (<60%): Missing many anomalies, real issues go unnoticed

**F1 Score** — Harmonic mean of precision and recall (0-100, higher is better)
- **F1 > 80**: Model is well-balanced
- **F1 < 60**: Model needs tuning

#### Tuning Thresholds

If precision/recall are poor, adjust the anomaly threshold:

```bash
# If too many false positives (low precision), increase threshold
ANOMALY_THRESHOLD=75 npm run eval:ai   # Stricter

# If missing too many anomalies (low recall), decrease threshold
ANOMALY_THRESHOLD=60 npm run eval:ai   # More sensitive
```

**Sweet spot** typically around **65-70** for balanced precision/recall.

### Report Output

The evaluation saves a detailed JSON report:

```json
{
  "timestamp": "2026-05-11T10:30:00Z",
  "period": {
    "daysBack": 30,
    "startDate": "2026-04-11T10:30:00Z"
  },
  "threshold": 65,
  "summary": {
    "totalEvents": 4250,
    "errors": 2
  },
  "classification": {
    "tp": 425,
    "fp": 85,
    "fn": 95,
    "tn": 3645
  },
  "metrics": {
    "precision": 83.33,
    "recall": 81.73,
    "f1": 82.51,
    "accuracy": 95.72
  },
  "sampleMisclassifications": [
    {
      "eventId": "...",
      "deviceId": "device-123",
      "aiScore": 72,
      "alertExists": false,
      "metrics": { "latency": 280, "packetLoss": 8, "signalStrength": -85 }
    }
  ]
}
```

---

## Phase 2: A/B Testing in Staging

### Why A/B Test?

After validation on historical data, A/B testing in staging allows us to:
- Compare AI alerts vs rule-based alerts in real-time
- Measure operator response time differences
- Validate that AI doesn't create false positives in production-like environment
- Collect feedback before full production rollout

### Setup A/B Test

#### 1. Deploy to Staging Environment

```bash
# Checkout M13 branch
git checkout m13/client-ai

# Deploy to staging
npm run docker:up  # Or your staging deployment command

# Verify services running
docker compose ps
```

#### 2. Enable AI Toggle for Test Group

```bash
# Via MongoDB shell
db.tenants.updateOne(
  { name: "staging-tenant" },
  { $set: { aiEnabled: true } }
)

# Verify
db.tenants.findOne({ name: "staging-tenant" }, { aiEnabled: 1 })
```

Or via Admin API:

```bash
curl -X PATCH http://localhost:3000/api/admin/tenants/{tenantId} \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "aiEnabled": true }'
```

#### 3. Run Test Duration

Recommended: **5-7 days** of production-like traffic

```
Metrics to collect during test:
├─ AI Model
│  ├─ Precision: % of AI alerts that match rule-based
│  ├─ Recall: % of rule-based alerts caught by AI
│  └─ False Positive Rate: % of AI alerts without rule-based match
├─ Operations
│  ├─ Average Response Time: AI alerts vs rule-based
│  ├─ Operator Engagement: Which alerts got acknowledged first?
│  └─ Escalation Rate: Did AI alerts get escalated more/less?
└─ System
   ├─ Latency: AI scoring overhead (target: <50ms)
   └─ Error Rate: Any scoring failures?
```

#### 4. Collect Metrics

```bash
# Query AI scoring performance in logs
docker compose logs -f worker-service | grep -i "anomaly"

# Export alerts for comparison
# Get rule-based only alerts (before M13)
db.alerts.countDocuments({ aiModelVersion: { $exists: false } })

# Get AI-enhanced alerts (after M13)
db.alerts.countDocuments({ aiModelVersion: { $exists: true } })

# Comparison by severity
db.alerts.aggregate([
  {
    $group: {
      _id: { hasAI: { $exists: ["$aiModelVersion"] }, severity: "$severity" },
      count: { $sum: 1 }
    }
  }
])
```

### Decision Criteria

After A/B test, decide to proceed based on:

| Criteria | Pass Threshold | Action |
|----------|---|---------|
| **Precision** | ≥ 80% | Validates AI doesn't create false alarms |
| **Recall** | ≥ 75% | Ensures AI catches most real anomalies |
| **F1 Score** | ≥ 78 | Balanced performance |
| **Response Time** | ≤ 50ms per event | AI scoring doesn't slow down system |
| **Error Rate** | < 0.1% | AI service is stable |
| **Operator Feedback** | Net positive | Operators find AI alerts useful |

**Decision Table:**

- **All criteria PASS**: → Production rollout (Phase 3)
- **Most criteria PASS**: → Minor tuning, extend test 3-5 days
- **Multiple criteria FAIL**: → Adjust thresholds, retrain, retry test

---

## Phase 3: Production Rollout (Future)

Once A/B test passes, production deployment:

1. **Gradual Rollout** (10% → 50% → 100% tenants)
2. **Monitor** AI precision/recall in production
3. **Fallback** plan: If issues, disable `aiEnabled` per tenant
4. **Documentation** for operators: How to interpret AI confidence scores

---

## File Reference

| File | Purpose |
|------|---------|
| `scripts/eval-ai-scoring.mjs` | Evaluation script (precision/recall calculation) |
| `apps/api-gateway/src/modules/tenant/schemas/tenant.schema.ts` | Tenant.aiEnabled flag (enable/disable per tenant) |
| `apps/dashboard/services/notification.service.ts` | Push notifications for high-confidence AI alerts |
| `apps/worker-service/src/services/anomaly-scoring.ts` | AI anomaly scoring function |

---

## Troubleshooting

### Script fails: "Cannot connect to MongoDB"

```bash
# Check MongoDB is running
docker compose ps | grep mongodb

# Restart MongoDB
docker compose restart mongodb

# Verify connection manually
mongosh "mongodb://user:password@localhost:27017/signalops-db" --eval "db.version()"
```

### Evaluation shows 0 events

```bash
# Verify events exist
mongo > use signalops-db
mongo > db.events.countDocuments()

# If empty, seed demo data
npm run db:seed
```

### Metrics look incorrect

```bash
# Check MongoDB indexes
db.events.getIndexes()
db.alerts.getIndexes()

# Rebuild indexes if needed
db.events.reIndex()
db.alerts.reIndex()
```

---

## Next Steps

1. ✅ Created evaluation script (this commit)
2. ⏳ Run evaluation on historical data (before staging)
3. ⏳ Deploy to staging with AI enabled
4. ⏳ Run 5-7 day A/B test
5. ⏳ Collect and analyze metrics
6. ⏳ Make go/no-go decision for production

---

**Updated**: 11/05/2026  
**Status**: Phase 1 evaluation ready, Phase 2 in progress
