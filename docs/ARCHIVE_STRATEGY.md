# Chiến lược lưu trữ dữ liệu

## Mục đích

Định nghĩa chính sách lưu trữ dữ liệu để:
1. **Giảm chi phí** bằng cách chuyển dữ liệu cũ ra khỏi database đắt tiền
2. **Cải thiện hiệu suất** vì database nhỏ hơn sẽ query nhanh hơn
3. **Tuân thủ quy định** bằng cách lưu audit log dài hạn
4. **Hỗ trợ phân tích lịch sử** với warehouse cho dữ liệu lớn

## Phân loại dữ liệu

| Dữ liệu | Thời gian sống | TTL | Đích lưu trữ |
|--------|----------------|-----|-------------|
| **Events** | 90 ngày | `expireAfterSeconds: 7776000` ✅ | S3 (Parquet) |
| **Alerts** | 180 ngày | Cần bổ sung | S3 (CSV) |
| **Logs** | 30 ngày | Cần bổ sung | CloudWatch / S3 |
| **Metrics** | 15 ngày | Theo mặc định của Prometheus | S3 (định dạng InfluxDB) |

---

## Chiến lược lưu trữ

### Giai đoạn 0: Hiện tại (đã triển khai)

**Events**:
- ✅ TTL index trên `createdAt` (90 ngày)
- ✅ MongoDB tự xóa sau khi hết hạn
- ⚠️ **Vấn đề**: dữ liệu không được lưu trữ dài hạn, sẽ mất sau 90 ngày

**Hành động**: triển khai snapshot trước khi TTL xóa dữ liệu

### Giai đoạn 1: Snapshot trước khi xóa (Q2/2025)

**Quy trình**:
```
Ngày 90: Events có createdAt cũ hơn 90 ngày sẽ được đánh dấu để lưu trữ
        ↓
Xuất ra file Parquet
        ↓
Upload lên S3 (s3://signalops-archive/events/YYYY/MM/DD/)
        ↓
Xác minh số lượng bản ghi khớp
        ↓
Xóa khỏi MongoDB
        ↓
Giữ trên S3 trong 7 năm (tuân thủ thuế và kiểm toán)
```

**Cron job** (chạy hằng đêm lúc 02:00 UTC):
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

### Giai đoạn 2: Phân tầng nóng/lạnh (Q3/2025)

**Khái niệm**:
- **Hot** (0-30 ngày): MongoDB (tối ưu tốc độ truy vấn)
- **Warm** (30-90 ngày): MongoDB với TTL index cao hơn
- **Cold** (> 90 ngày): S3 (tối ưu chi phí)

**Triển khai**:
```typescript
// Archive service
async archiveOldEvents() {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  // 1. Truy vấn các event trước mốc cutoff
  const oldEvents = await Event.find({ 
    createdAt: { $lt: cutoffDate } 
  }).cursor();

  // 2. Xuất ra Parquet
  const parquetWriter = new ParquetWriter({ schema: eventSchema });
  for await (const event of oldEvents) {
    parquetWriter.write(event);
  }
  
  // 3. Upload lên S3
  const s3Path = await uploadParquetToS3(parquetWriter.getPath());
  
  // 4. Tạo metadata cho archive
  await ArchiveMetadata.create({
    collection: 'events',
    startDate: startOfMonth,
    endDate: endOfMonth,
    recordCount: await Event.countDocuments({ createdAt: { $lt: cutoffDate } }),
    s3Path,
    verificationHash: md5(parquetWriter.getBuffer()),
  });

  // 5. Xóa khỏi MongoDB
  await Event.deleteMany({ createdAt: { $lt: cutoffDate } });
}
```

**Cấu trúc S3**:
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

### Giai đoạn 3: Athena cho phân tích (Q4/2025)

**Athena + Glue Catalog**:
```python
# Truy vấn event đã lưu trữ qua Athena
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

## Chính sách lưu giữ

| Loại dữ liệu | Thời gian lưu | Hành động khi hết hạn |
|--------------|--------------|----------------------|
| Hot Events | 90 ngày | Lưu trữ sang S3 |
| Warm Events | 1 năm | Xóa |
| Cold Backups | 7 năm | Xóa (tuân thủ thuế: giữ cho kiểm toán) |
| Audit Logs | 3 năm | Lưu trữ sang S3 (tuân thủ) |
| Dữ liệu PII | 30 ngày sau khi xóa tài khoản | Xóa bằng phương pháp cryptographic wipe |

---

## Chiến lược backup

**Backup hằng ngày** (2:00 AM):
```bash
mongodump --archive=signalops-backup-$(date +%Y-%m-%d).archive \
  --gzip --quiet
aws s3 cp signalops-backup-$(date +%Y-%m-%d).archive \
  s3://signalops-backups/daily/
```

**Backup hằng tuần** (Chủ nhật 2:00 AM):
```bash
# Tương tự backup hằng ngày nhưng đẩy vào prefix weekly/
# Giữ 12 tuần (3 tháng)
aws s3 ls s3://signalops-backups/weekly/ | head -n 12
```

**Khôi phục khi sự cố nghiêm trọng**:
```bash
# Khôi phục từ backup
aws s3 cp s3://signalops-backups/daily/signalops-backup-2024-01-01.archive .
mongorestore --archive=signalops-backup-2024-01-01.archive --gzip
```

---

## Phân tích chi phí

### Hiện tại (không archive)
- Dung lượng MongoDB: 500GB × $0.25/GB = **$125/tháng**
- Dung lượng backup: 50GB × $0.023/GB = **$1/tháng**
- **Tổng**: $126/tháng

### Có archive (giai đoạn 1)
- Dung lượng MongoDB: 200GB (chỉ hot data) × $0.25/GB = **$50/tháng**
- S3 Archive: 300GB × $0.023/GB = **$7/tháng**
- **Tổng**: $57/tháng (giảm 55% chi phí)

### Ước tính tại 10M+ events/tháng
- Kích thước event: khoảng 1GB/tháng
- Archive sau 90 ngày → 3GB trong hot storage
- Archive 12 tháng → 12GB trên S3 (rẻ hơn MongoDB khoảng 4 lần)
- **Tiết kiệm hằng năm**: khoảng $1500 so với việc giữ toàn bộ trong MongoDB

---

## Lộ trình triển khai

| Giai đoạn | Thời gian | Việc cần làm | Chủ trì |
|----------|----------|-------------|--------|
| Giai đoạn 0 | ✅ Xong | Thiết lập TTL index | Backend |
| Giai đoạn 1 | Q2/2025 | Service archive + cấu hình S3 | Infra |
| Giai đoạn 2 | Q3/2025 | Phân tầng, cấu hình lớp warm | Backend + Infra |
| Giai đoạn 3 | Q4/2025 | Athena catalog, truy vấn lịch sử | Data / Infra |
| Giai đoạn 4 | 2026 | Data warehouse (ClickHouse/BigQuery) | Data Engineer |

---

## Monitoring

**CloudWatch Alarms**:
```python
# Cảnh báo nếu job archive thất bại
cloudwatch.put_metric_alarm(
    AlarmName='ArchiveJobFailure',
    MetricName='ArchiveExitCode',
    Statistic='Maximum',
    Period=3600,  # 1 giờ
    EvaluationPeriods=1,
    Threshold=0,
    ComparisonOperator='GreaterThan',
)

# Cảnh báo nếu tốc độ tăng trưởng archive S3 bị chững
cloudwatch.put_metric_alarm(
    AlarmName='ArchiveSizeNotIncreasing',
    MetricName='S3BucketSize',
    Statistic='Average',
    Period=86400,  # 1 ngày
    Threshold=1000000,  # 1GB
)
```

---

## Hỏi đáp

**Hỏi: Tại sao không giữ tất cả trong MongoDB?**
- MongoDB không tối ưu cho lưu giữ 10+ năm
- Index tăng tuyến tính theo dữ liệu
- Hiệu năng truy vấn giảm đáng kể
- Chi phí mỗi GB trên MongoDB managed cao hơn S3 rất nhiều

**Hỏi: Khôi phục từ S3 archive mất bao lâu?**
- Archive 100GB: khoảng 2 giờ để restore về MongoDB
- Tính thêm kiểm thử trước khi restore: nên dự trù 4-6 giờ

**Hỏi: Nếu lỡ tay xóa dữ liệu thì sao?**
- Giữ cả backup và archive để phục hồi
- Backup: giữ 12 tuần, tức khoảng 3 tháng cửa sổ phục hồi
- Archive: giữ 7 năm, phục vụ phục hồi dài hạn và kiểm toán
