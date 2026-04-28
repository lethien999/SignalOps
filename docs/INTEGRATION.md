# Hướng dẫn tích hợp dữ liệu thực tế

## Tổng quan

Hiện tại hệ thống SignalOps sử dụng **Simulator** để tạo dữ liệu mô phỏng. Tài liệu này hướng dẫn cách tích hợp dữ liệu từ thiết bị mạng thật vào hệ thống.

---

## Nguồn dữ liệu thực tế

SignalOps có thể nhận dữ liệu từ bất kỳ nguồn nào có khả năng gửi HTTP POST request:

```
┌───────────────────────────────────────────────┐
│            NGUỒN DỮ LIỆU                      │
│                                               │
│  📡 Trạm BTS / NodeB / eNodeB                 │
│  📶 Access Point, Router, Switch              │
│  🖥️ Hệ thống NMS (Zabbix, LibreNMS, Nagios)  │
│  📊 SNMP Agent trên thiết bị                  │
│  🔌 IoT Sensor / Edge Gateway                 │
│  📱 Ứng dụng đo tốc độ mạng                   │
└───────────────┬───────────────────────────────┘
                │
                │  HTTP POST /api/events
                │  Content-Type: application/json
                │
                ▼
         ┌──────────────┐
         │ API Gateway  │ (localhost:3000)
         └──────────────┘
```

---

## Format dữ liệu

Mỗi event gửi tới API Gateway cần có format JSON sau:

```json
{
  "deviceId": "bts-hcm-tower-01",
  "location": {
    "lat": 10.7769,
    "lng": 106.7009,
    "name": "Trạm BTS Quận 1 - Tòa nhà Bitexco"
  },
  "metrics": {
    "latency": 145,
    "packetLoss": 2.1,
    "signalStrength": -72
  }
}
```

### Giải thích các trường

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `deviceId` | string | ✅ | Mã định danh duy nhất của thiết bị (ví dụ: `bts-hcm-01`, `router-dn-03`) |
| `location.lat` | number | ✅ | Vĩ độ (latitude) của thiết bị |
| `location.lng` | number | ✅ | Kinh độ (longitude) của thiết bị |
| `location.name` | string | ❌ | Tên mô tả vị trí (ví dụ: "Trạm Q1 HCM") |
| `metrics.latency` | number | ✅ | Độ trễ mạng, đơn vị ms. **> 200ms sẽ tạo cảnh báo** |
| `metrics.packetLoss` | number | ✅ | Tỷ lệ mất gói, đơn vị %. **> 5% sẽ tạo cảnh báo** |
| `metrics.signalStrength` | number | ✅ | Cường độ tín hiệu, đơn vị dBm. **< -90 dBm sẽ tạo cảnh báo** |

### Ngưỡng cảnh báo tự động

| Chỉ số | Ngưỡng | Mức độ | Hậu quả |
|--------|--------|--------|---------|
| Latency > 200ms | `THRESHOLD_LATENCY_MS` | 🔴 HIGH | Người dùng trải nghiệm lag, cuộc gọi giật |
| Packet Loss > 5% | `THRESHOLD_PACKET_LOSS_PERCENT` | 🔴 HIGH | Dữ liệu bị mất, cuộc gọi đứt |
| Signal < -90 dBm | `THRESHOLD_SIGNAL_STRENGTH_DBM` | 🟡 MEDIUM | Vùng phủ sóng yếu |

Các ngưỡng có thể thay đổi trong file `.env`.

---

## Cách gửi dữ liệu

### Cách 1: HTTP POST trực tiếp (đơn giản nhất)

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "bts-hcm-01",
    "location": { "lat": 10.77, "lng": 106.70, "name": "Trạm Q1 HCM" },
    "metrics": { "latency": 250, "packetLoss": 8, "signalStrength": -95 }
  }'
```

**Phản hồi:**
```json
{
  "id": "662a7ed9a6b4f9838b0c9f45",
  "status": "queued",
  "jobId": "bts-hcm-01-662a7ed9a6b4f9838b0c9f45"
}
```

API trả về `202 Accepted` — nghĩa là dữ liệu đã được nhận và đang xử lý bất đồng bộ.

### Cách 2: Script Python thu thập từ thiết bị

```python
import requests
import subprocess
import time
import re

API_URL = "http://your-signalops-server:3000/api/events"

DEVICE = {
    "deviceId": "router-office-01",
    "location": {"lat": 10.77, "lng": 106.70, "name": "Văn phòng HCM"}
}

def measure_network(target_ip="8.8.8.8"):
    """Đo latency và packet loss bằng ping"""
    result = subprocess.run(
        ["ping", "-c", "10", target_ip],
        capture_output=True, text=True
    )
    output = result.stdout

    # Parse latency
    latency_match = re.search(r"avg[/=]\s*([\d.]+)", output)
    latency = float(latency_match.group(1)) if latency_match else 0

    # Parse packet loss
    loss_match = re.search(r"([\d.]+)% packet loss", output)
    packet_loss = float(loss_match.group(1)) if loss_match else 0

    return latency, packet_loss

def send_event(latency, packet_loss, signal=-65):
    payload = {
        **DEVICE,
        "metrics": {
            "latency": round(latency, 2),
            "packetLoss": round(packet_loss, 2),
            "signalStrength": signal
        }
    }
    resp = requests.post(API_URL, json=payload)
    print(f"[{resp.status_code}] Latency={latency}ms, Loss={packet_loss}%")

# Gửi dữ liệu mỗi 30 giây
while True:
    lat, loss = measure_network()
    send_event(lat, loss)
    time.sleep(30)
```

### Cách 3: Tích hợp từ hệ thống NMS (Zabbix, LibreNMS)

Các hệ thống giám sát mạng như Zabbix có thể gọi webhook khi có dữ liệu mới. Tạo **Media Type** dạng Webhook trong Zabbix:

**Zabbix → Administration → Media types → Create:**
```
Type: Webhook
Script:
  var params = JSON.parse(value);
  var req = new HttpRequest();
  req.addHeader('Content-Type: application/json');
  var payload = JSON.stringify({
    deviceId: params.host,
    location: { lat: 10.77, lng: 106.70, name: params.host },
    metrics: {
      latency: parseFloat(params.latency) || 0,
      packetLoss: parseFloat(params.packetLoss) || 0,
      signalStrength: parseFloat(params.signal) || -65
    }
  });
  req.post('http://signalops-server:3000/api/events', payload);
```

### Cách 4: Adapter SNMP → SignalOps

Nếu thiết bị chỉ hỗ trợ SNMP, tạo adapter đơn giản:

```javascript
// snmp-adapter.js
const snmp = require("net-snmp");
const axios = require("axios");

const API_URL = "http://localhost:3000/api/events";

// OID cho các chỉ số mạng (ví dụ Cisco)
const LATENCY_OID = "1.3.6.1.4.1.9.9.42.1.2.10.1.1";
const LOSS_OID = "1.3.6.1.4.1.9.9.42.1.2.10.1.6";

const devices = [
  { ip: "192.168.1.1", name: "Router-Core", lat: 10.77, lng: 106.70 },
  { ip: "192.168.1.2", name: "Switch-Floor-1", lat: 10.78, lng: 106.71 },
];

async function pollDevice(device) {
  const session = snmp.createSession(device.ip, "public");

  session.get([LATENCY_OID, LOSS_OID], (error, varbinds) => {
    if (error) return console.error(`Lỗi SNMP ${device.name}:`, error);

    const latency = varbinds[0]?.value || 0;
    const packetLoss = varbinds[1]?.value || 0;

    axios.post(API_URL, {
      deviceId: device.name,
      location: { lat: device.lat, lng: device.lng, name: device.name },
      metrics: { latency, packetLoss, signalStrength: -65 }
    });
  });
}

// Poll mỗi 60 giây
setInterval(() => devices.forEach(pollDevice), 60000);
```

---

## Kiến trúc triển khai thực tế

### Triển khai nội bộ (On-Premise)

```
Mạng nội bộ (LAN/VPN)
│
├── Thiết bị mạng (BTS, Router, Switch...)
│   └── Gửi dữ liệu qua HTTP POST
│
├── Server SignalOps
│   ├── API Gateway (:3000)
│   ├── Worker Service
│   ├── Event Broker
│   ├── MongoDB
│   ├── Redis
│   └── Dashboard (:3001)
│
└── Trình duyệt nhân viên NOC
    └── Truy cập Dashboard (:3001)
```

### Triển khai Cloud

```
Internet
│
├── Thiết bị mạng → VPN/API Key → Load Balancer
│                                      │
│                              ┌───────┴───────┐
│                              │  Cloud Server  │
│                              │  (AWS/GCP/VPS) │
│                              │                │
│                              │  Docker Compose│
│                              │  hoặc K8s      │
│                              └────────────────┘
│
└── Trình duyệt quản lý → HTTPS → Dashboard
```

---

## Lưu ý khi triển khai thực tế

1. **Bảo mật API**: Thêm API Key hoặc JWT authentication cho endpoint POST /api/events
2. **HTTPS**: Bắt buộc sử dụng HTTPS cho production
3. **Rate Limiting**: Giới hạn số request/giây để tránh quá tải
4. **Backup MongoDB**: Cấu hình backup tự động cho database
5. **Monitoring**: Dùng Prometheus + Grafana giám sát sức khỏe hệ thống
6. **Scaling**: Tăng số Worker replicas nếu có nhiều thiết bị (hàng nghìn)
