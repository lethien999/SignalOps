# Kiến trúc SignalOps

## 1. Tổng quan

SignalOps sử dụng kiến trúc hướng sự kiện (event-driven). Việc tiếp nhận request được tách biệt khỏi xử lý nặng thông qua hàng đợi Redis, giúp tăng khả năng phản hồi và mở rộng.

## 2. Các thành phần

- **Nguồn dữ liệu**: Simulator và các thiết bị telemetry bên ngoài
- **API Gateway**: Xác thực đầu vào, cung cấp REST và WebSocket API
- **Event Broker**: Chuẩn bị và đẩy job vào hàng đợi
- **Worker Service**: Xử lý job, áp dụng logic phát hiện ngưỡng, ghi dữ liệu
- **MongoDB**: Lưu trữ chính cho events và alerts
- **Redis**: Hàng đợi BullMQ và cache tạm
- **Nginx** (tùy chọn): Reverse proxy cho ingress thống nhất

## 3. Luồng xử lý

1. `POST /api/events` gửi tới API Gateway
2. Event được xác thực và đẩy vào hàng đợi
3. Worker lấy event từ hàng đợi
4. Worker lưu event và đánh giá quy tắc phát hiện
5. Nếu vượt ngưỡng → tạo cảnh báo và phát qua kênh realtime

## 4. Luồng Realtime

- WebSocket endpoint được host bởi API Gateway
- Các topic bao gồm: sự kiện mới, cập nhật cảnh báo
- Dashboard client đăng ký và cập nhật UI mà không cần polling

## 5. Tầng dữ liệu

Các collection MongoDB:
- `events` — sự kiện telemetry
- `alerts` — cảnh báo
- `devices` — thông tin thiết bị

Index được khuyến nghị:
- events: `deviceId` + `timestamp`
- alerts: `status` + `severity` + `createdAt`

## 6. Khả năng mở rộng

- Worker có thể scale ngang bằng cách tăng replicas
- Hàng đợi tách biệt bảo vệ API latency khỏi tải xử lý
- Cấu hình kết nối MongoDB/Redis nên được điều chỉnh theo môi trường

## 7. Độ tin cậy

- Retry được xử lý ở tầng consumer
- Job thất bại được đẩy vào Dead Letter Queue (DLQ)
- Health endpoint phục vụ giám sát service

## 8. Bảo mật cơ bản

- Cấu hình qua biến môi trường
- Xác thực đầu vào tại API boundary
- Reverse proxy cho kiểm soát ingress
- Structured logging trên tất cả service

## 9. Topology triển khai (Local)

- Docker Compose điều phối tất cả service
- API Gateway tại cổng 3000
- Nginx ingress (tùy chọn) tại cổng 8080
- MongoDB và Redis expose cho chẩn đoán local
