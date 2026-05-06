# Data Archive Strategy

## Mục đích

Định nghĩa chính sách lưu trữ dữ liệu để:
1. **Giảm chi phí** (di chuyển dữ liệu cũ khỏi database đắt tiền)
2. **Cải thiện hiệu suất** (database nhỏ → query nhanh)
3. **Tuân thủ quy định** (lưu audit log lâu dài)
4. **Hỗ trợ phân tích lịch sử** (warehouse cho big data)

## Định nghĩa Dữ liệu

| Dữ liệu | Thời gian sống | TTL | Archive Destination |
|--------|----------------|-----|-------------------|
| **Events** | 90 ngày | `expireAfterSeconds: 7776000` ✅ | S3 (Parquet) |
| **Alerts** | 180 ngày | Cần thêm | S3 (CSV) |
| **Logs** | 30 ngày | Cần thêm | CloudWatch / S3 |
| **Metrics** | 15 ngày | Prometheus default | S3 (InfluxDB format) |

---

## Chiến lược Archive

### Phase 0: Hiện tại (Đã triển khai)

**Events**:
- ✅ TTL index on `createdAt` (90 days)
- ✅ MongoDB auto-deletes after expiration
- ⚠️ **Vấn đề**: Dữ liệu không lưu trữ, mất hết sau 90 ngày

**Action**: Triển khai snapshot trước khi TTL xóa

### Phase 1: Snapshot Before Delete (Q2 2025)

**Quy trình**:
```
Day 90: Events < createdAt (90 days ago) are marked for archival
        ↓
        Export to Parquet file
        ↓
        Upload to S3 (s3://signalops-archive/events/YYYY/MM/DD/)
        ↓
        Verify record count matches
        ↓
        Delete from MongoDB
        ↓
        Retain S3 for 7 years (tax compliance)
```

**Cron Job** (nightly at 02:00 UTC):
```bash
#!/bin/bash
YESTERDAY_MIDNIGHT=$(date -d yesterday +%Y-%m-%dT00:00:00Z)
mongodump --query "{createdAt: {\$lt: $YESTERDAY_MIDNIGHT}}" \
  --collection events > events-archive.bson
bsondump events-archive.bson | \
  pandas.read_json > events-archive.parquet
aws s3 cp events-archive.parquet \
  s3://signalops-archive/events/$(date +%Y/%m/%d)/
```

### Phase 2: Cold/Hot Tiering (Q3 2025)

**Concept**:
- **Hot** (0-30 days): MongoDB (query speed)
- **Warm** (30-90 days): MongoDB with higher TTL indices
- **Cold** (> 90 days): S3 (cost optimization)

**Implementation**:
```typescript
// Archive service
async archiveOldEvents() {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  // 1. Query events before cutoff
  const oldEvents = await Event.find({ 
    createdAt: { $lt: cutoffDate } 
  }).cursor();

  // 2. Export to Parquet
  const parquetWriter = new ParquetWriter({ schema: eventSchema });
  for await (const event of oldEvents) {
    parquetWriter.write(event);
  }
  
  // 3. Upload to S3
  const s3Path = await uploadParquetToS3(parquetWriter.getPath());
  
  // 4. Create archive metadata
  await ArchiveMetadata.create({
    collection: 'events',
    startDate: startOfMonth,
    endDate: endOfMonth,
    recordCount: await Event.countDocuments({ createdAt: { $lt: cutoffDate } }),
    s3Path,
    verificationHash: md5(parquetWriter.getBuffer()),
  });

  // 5. Delete from MongoDB
  await Event.deleteMany({ createdAt: { $lt: cutoffDate } });
}
```

**S3 Structure**:
```
s3://signalops-archive/
├── events/
│   ├── 2024/01/
│   │   ├── events-2024-01-01.parquet
│   │   ├── metadata.json
│   │   └── checksum.sha256
│   ├── 2024/02/
│   └── ...
├── alerts/
├── metrics/
└── backups/
    ├── daily/2024-01-01.tar.gz
    └── weekly/2024-W01.tar.gz
```

### Phase 3: Athena for Analysis (Q4 2025)

**Athena + Glue Catalog**:
```python
# Query archived events via Athena
import boto3
athena = boto3.client('athena')

query = """
SELECT 
    deviceId, 
    COUNT(*) as event_count,
    AVG(metrics.latency) as avg_latency
FROM s3_events_parquet
WHERE year=2024 AND month=01
GROUP BY deviceId
"""

response = athena.start_query_execution(
    QueryString=query,
    QueryExecutionContext={'Database': 'signalops_archive'},
    ResultConfiguration={'OutputLocation': 's3://signalops-archive/query-results/'}
)
```

---

## Retention Policy

| Data Type | Retention | Action on Expiry |
|-----------|-----------|------------------|
| Hot Events | 90 days | Archive to S3 |
| Warm Events | 1 year | Delete |
| Cold Backups | 7 years | Delete (tax compliance: keep for audits) |
| Audit Logs | 3 years | Archive to S3 (compliance) |
| PII Data | 30 days after account deletion | Cryptographic wipe |

---

## Backup Strategy

**Daily Backup** (2:00 AM):
```bash
mongodump --archive=signalops-backup-$(date +%Y-%m-%d).archive \
  --gzip --quiet
aws s3 cp signalops-backup-$(date +%Y-%m-%d).archive \
  s3://signalops-backups/daily/
```

**Weekly Backup** (Sunday 2:00 AM):
```bash
# Same as daily but to weekly/ prefix
# Keep 12 weeks (3 months)
aws s3 ls s3://signalops-backups/weekly/ | head -n 12
```

**Disaster Recovery**:
```bash
# Restore from backup
aws s3 cp s3://signalops-backups/daily/signalops-backup-2024-01-01.archive .
mongorestore --archive=signalops-backup-2024-01-01.archive --gzip
```

---

## Cost Analysis

### Current (No Archive)
- MongoDB storage: 500GB × $0.25/GB = **$125/month**
- Backup storage: 50GB × $0.023/GB = **$1/month**
- **Total**: $126/month

### With Archive (Phase 1)
- MongoDB storage: 200GB (hot only) × $0.25/GB = **$50/month**
- S3 Archive: 300GB × $0.023/GB = **$7/month**
- **Total**: $57/month (55% cost reduction)

### Estimates at 10M+ Events/Month
- Events size: ~1GB/month
- Archive after 90 days → 3GB in hot storage
- 12 months archive → 12GB in S3 (4x cheaper than MongoDB)
- **Annual savings**: ~$1500 vs keeping everything in MongoDB

---

## Implementation Roadmap

| Phase | Timeline | Tasks | Owner |
|-------|----------|-------|-------|
| Phase 0 | ✅ Done | TTL index setup | Backend |
| Phase 1 | Q2 2025 | Archive service + S3 setup | Infra |
| Phase 2 | Q3 2025 | Tiering, warm layer config | Backend + Infra |
| Phase 3 | Q4 2025 | Athena catalog, historical queries | Data / Infra |
| Phase 4 | 2026 | Data warehouse (ClickHouse/BigQuery) | Data Engineer |

---

## Monitoring

**CloudWatch Alarms**:
```python
# Alert if archive fails
cloudwatch.put_metric_alarm(
    AlarmName='ArchiveJobFailure',
    MetricName='ArchiveExitCode',
    Statistic='Maximum',
    Period=3600,  # 1 hour
    EvaluationPeriods=1,
    Threshold=0,
    ComparisonOperator='GreaterThan',
)

# Alert if S3 archive growth stalls
cloudwatch.put_metric_alarm(
    AlarmName='ArchiveSizeNotIncreasing',
    MetricName='S3BucketSize',
    Statistic='Average',
    Period=86400,  # 1 day
    Threshold=1000000,  # 1GB
)
```

---

## Q&A

**Q: Why not keep everything in MongoDB?**
- MongoDB not optimized for 10+ year retention
- Indexes grow linearly with data
- Query performance degrades significantly
- Cost per GB in managed MongoDB is 10x+ S3

**Q: How long to recover from S3 archive?**
- 100GB archive: ~2 hours to restore to MongoDB
- Include pre-restore testing: plan for 4-6 hours

**Q: What if we accidentally delete data?**
- Keep backup + archive for recovery
- Backup: 12-week retention = 3 months recovery window
- Archive: 7-year retention = long-term recovery

**Q: Can we query archived data directly?**
- Yes, Athena/Presto queries S3 Parquet files
- Join with hot MongoDB data via federation
- ~5-10 seconds for billion-row queries
