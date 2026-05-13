# 🏗️ Kiến trúc & Thiết kế

Tài liệu về kiến trúc hệ thống, quyết định thiết kế (ADR), và schema cơ sở dữ liệu.

## Các file trong mục này

| File                               | Mô tả                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Tổng quan kiến trúc: components, luồng sự kiện, scaling, độ tin cậy               |
| [ADR.md](ADR.md)                   | Architecture Decision Records (11 ADR): Outbox, Circuit Breaker, AsyncLocal, etc. |
| [schema.md](schema.md)             | MongoDB collections: events, alerts, devices, api_keys, indexes                   |

## Khi nào dùng?

- **Hiểu cách hệ thống hoạt động**: → Đọc ARCHITECTURE.md
- **Hiểu tại sao chúng ta chọn cách này**: → Đọc ADR.md
- **Hiểu cấu trúc dữ liệu**: → Đọc schema.md
- **Phát triển tính năng mới**: → Tham khảo kiến trúc + ADR
- **Debug vấn đề hệ thống**: → Kiểm tra architecture pattern + design decisions
