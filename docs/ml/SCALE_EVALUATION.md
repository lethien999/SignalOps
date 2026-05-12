# Đánh giá khả năng mở rộng: TimescaleDB so với VictoriaMetrics

## Hiện trạng

**Ngăn xếp metrics**: Prometheus (scrape) + Grafana (hiển thị)
- **Tốc độ thu thập**: khoảng 10K metrics/phút (ước lượng trong môi trường phát triển)
- **Thời gian lưu giữ**: mặc định của Prometheus là 15 ngày
- **Lưu trữ**: bộ nhớ + đĩa (một instance)

**Dữ liệu event/alert**: MongoDB
- **Khối lượng ghi**: khoảng 1K events/phút (bình thường), có thể tăng vọt lên 10K/phút khi có bất thường
- **10M+ events/tháng** tương đương khoảng 347 events/giây duy trì

## Các điểm nghẽn khi vượt 10M+ events/tháng

| Điểm nghẽn | Hành vi hiện tại | Tác động |
|-----------|------------------|---------|
| **Dung lượng collection MongoDB** | Không sharding, chỉ một replica set | Hiệu năng truy vấn giảm, index bị phân mảnh |
| **I/O đĩa của Prometheus** | Tất cả metrics nằm trên đĩa cục bộ | Scrape chậm, có thể mất dữ liệu khi tải cao |
| **Dọn dẹp index TTL** | Dọn dẹp đồng bộ | Khóa DB trong lúc xóa dữ liệu cũ |
| **Truy vấn tổng hợp** | Quét toàn bộ collection (events > 1GB) | Timeout khi load dashboard (đã được P0.3 xử lý bằng aggregation) |

## Phương án 1: TimescaleDB cho dữ liệu chuỗi thời gian

### Đặc điểm
- Là extension của PostgreSQL cho dữ liệu chuỗi thời gian
- Tự động phân vùng theo thời gian
- Nén tối ưu, dung lượng giảm khoảng 95% so với dữ liệu thô
- Hỗ trợ SQL native, hyper-table và continuous aggregates

### Đánh giá

**Ưu điểm**:
- Giảm dung lượng lưu trữ khoảng 95% nhờ nén
- Truy vấn dưới 1 giây trên các bảng hàng tỷ dòng
- Hyper-table giúp loại bỏ việc phân vùng thủ công
- Phù hợp cho workload phân tích hơn MongoDB

**Nhược điểm**:
- Thay thế MongoDB, tức là phải migration lớn
- Cần thiết kế lại schema
- Có độ dốc học tập cho hyper-table và continuous aggregates
- Phải quản lý connection pool cho từng instance ứng dụng

### Khuyến nghị
**Trường hợp nên dùng**: khi bảng events vượt quá 5GB và hiệu năng truy vấn trở nên rất quan trọng
- Chuyển events sang TimescaleDB (giữ alerts trong MongoDB)
- Dùng MongoDB cho dữ liệu giao dịch, TimescaleDB cho phân tích
- Thời gian thiết lập ước tính: 2-3 tuần (migration + test)

**Chưa nên dùng ngay** vì:
- P0.3 (aggregation pipeline) đã xử lý vấn đề hiệu năng truy vấn
- TTL index tự động xử lý retention
- 10M events/tháng tương đương khoảng 30GB/năm, vẫn có thể quản lý trên một MongoDB instance

---

## Phương án 2: VictoriaMetrics cho metrics của Prometheus

### Đặc điểm
- Có thể thay thế Prometheus theo kiểu drop-in
- Nén tốt hơn, dùng ít bộ nhớ hơn
- Mở rộng ngang qua vmcluster
- Hỗ trợ multi-tenant

### Đánh giá

**Ưu điểm**:
- Nén tốt hơn Prometheus khoảng 10 lần
- Xử lý được 10M+ metrics/phút (trong khi giới hạn Prometheus khoảng 100K/phút)
- Dễ scale hơn Prometheus (remote storage)
- Xử lý cardinality tốt hơn

**Nhược điểm**:
- Không phải thay thế hoàn toàn Prometheus theo nghĩa không đổi gì
- Phải viết lại alert/rule
- VictoriaMetrics Cluster cần tối thiểu 3 node
- Quá mức cần thiết với tải hiện tại khoảng 10K metrics/phút

### Khuyến nghị
**Trạng thái hiện tại**: giữ Prometheus + Grafana
- Mức 10K metrics/phút hiện tại vẫn nằm trong khả năng của Prometheus
- Chỉ cân nhắc VictoriaMetrics khi chạm 500K+ metrics/phút

**Dấu hiệu cần nâng cấp**:
1. Prometheus thường xuyên scrape thất bại
2. Dung lượng lưu trữ vượt 100GB mỗi 15 ngày
3. Truy vấn dashboard thường xuyên chậm hơn 5 giây

---

## Khuyến nghị lai cho 10M+ events/tháng

**Giai đoạn 1 (hiện tại)**: giữ nguyên stack hiện tại + tối ưu
- ✅ Aggregation pipeline của MongoDB (đã hoàn thành ở P0.3)
- ✅ TTL index để tự động dọn dữ liệu (đã hoàn thành ở P0.4)
- ✅ Thu thập business metrics (đã hoàn thành ở P1.4)
- Bổ sung cache Redis cho các truy vấn tổng hợp được dùng nhiều

**Giai đoạn 2 (Q3/2025)**: scale đọc ngang
- Thêm read replica cho MongoDB (secondary node phục vụ phân tích)
- Cho phép query secondary với các truy vấn nặng nhưng không quá nhạy cảm
- Tách riêng connection pool cho truy vấn phân tích

**Giai đoạn 3 (Q4/2025)**: migration chọn lọc
- Chuyển các events “lạnh” (trên 90 ngày) sang TimescaleDB archive
- Giữ dữ liệu nóng trong MongoDB
- Dùng TimescaleDB cho phân tích lịch sử và báo cáo

**Giai đoạn 4 (2026)**: cơ sở dữ liệu chuỗi thời gian đầy đủ
- Đánh giá VictoriaMetrics cho ingestion metrics nếu thật sự cần
- Cân nhắc ClickHouse làm warehouse cho event
- Xây dựng data lake cho lưu trữ dài hạn

## Các việc cần làm

1. **Theo dõi metrics**:
   - Thêm cảnh báo cho MongoDB oplog lag
   - Theo dõi các percentile hiệu năng truy vấn (p50, p95, p99)
   - Cảnh báo khi Prometheus scrape thất bại

2. **Chuẩn bị cho việc scale**:
   - Ghi tài liệu chiến lược backup (BACKUP.md)
   - Kiểm thử quy trình failover
   - Viết playbook scale

3. **Đánh giá lại sau 6 tháng**:
   - Nếu events > 50M/tháng → chuyển sang Giai đoạn 2
   - Nếu metrics > 500K/phút → đánh giá VictoriaMetrics
   - Dựa trên mẫu sử dụng thực tế

## Chi phí ước tính (AWS)

| Phương án | Compute | Lưu trữ | Hàng tháng |
|----------|---------|---------|-----------|
| **Hiện tại (MongoDB)** | 2x m5.large | 500GB EBS | $500 |
| **+ TimescaleDB** | 3x m5.large | 200GB EBS | $700 |
| **+ VictoriaMetrics** | 3x m5.xlarge | 1TB EBS | $1200 |
| **Full migration** | 5x m5.large | 2TB EBS | $1500 |

**Lưu ý**: các con số trên dựa trên giá AWS; cần điều chỉnh theo nhà cung cấp cloud đang dùng.
