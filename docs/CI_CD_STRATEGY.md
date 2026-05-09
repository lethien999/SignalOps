# Chiến lược CI/CD và triển khai bằng GitHub Actions

## Mục đích

Tự động hóa:
1. Build và test sau mỗi lần commit
2. Triển khai lên môi trường staging/production
3. Rollback nhanh nếu phát sinh sự cố

---

## Các sự kiện kích hoạt

| Sự kiện | Hành động | Workflow |
|---------|-----------|----------|
| Push lên `main` | Build → Test → Triển khai lên Staging | `build-and-test.yml` |
| Push lên `develop` | Build → Test → Triển khai lên Dev | `build-and-test.yml` |
| Tạo release tag | Build → Test → Triển khai lên Production | `release.yml` |
| Pull Request | Build → Test → Báo cáo coverage | `pr-check.yml` |
| Chạy thủ công | Triển khai một phiên bản cụ thể | `deploy-manual.yml` |

---

## Workflow: build-and-test.yml

```yaml
name: Build and Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build
      
      - name: Test
        run: npm run test -- --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Workflow: release.yml

```yaml
name: Release to Production

on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker images
        run: |
          docker build -f infrastructure/Dockerfile.api -t signalops-api:${{ github.ref_name }} .
          docker build -f infrastructure/Dockerfile.worker -t signalops-worker:${{ github.ref_name }} .
      
      - name: Push to Docker registry
        run: |
          docker push signalops-api:${{ github.ref_name }}
          docker push signalops-worker:${{ github.ref_name }}
      
      - name: Deploy to production
        run: |
          ./scripts/deploy-prod.sh ${{ github.ref_name }}
```

---

## Chiến lược rollback

### Kịch bản 1: Rollback ngay lập tức (< 1 giờ)

**Khi nào kích hoạt**: phát hiện lỗi trên production

**Quy trình**:
```bash
# 1. Xác định phiên bản lỗi
kubectl get deployment -A | grep signalops

# 2. Liệt kê các version gần nhất
docker images | grep signalops-api | head -5

# 3. Rollback về version trước
kubectl rollout undo deployment/signalops-api -n production

# 4. Kiểm tra lại trạng thái
kubectl rollout status deployment/signalops-api -n production
```

**Thời gian dự kiến**: 2-5 phút

### Kịch bản 2: Triển khai Blue-Green

**Thiết lập**:
```yaml
# Blue (hiện tại)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: signalops-api-blue
  
# Green (phiên bản mới)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: signalops-api-green

# Service trỏ về Blue
apiVersion: v1
kind: Service
metadata:
  name: signalops-api
spec:
  selector:
    version: blue  # Đổi sang 'green' khi rollout
```

**Quy trình rollout**:
```bash
# 1. Triển khai lên Green trong khi Blue vẫn phục vụ traffic
kubectl apply -f deploy-green.yml

# 2. Kiểm thử Green qua DNS nội bộ
curl http://signalops-api-green.svc.cluster.local/health

# 3. Chuyển traffic
kubectl patch service signalops-api -p '{"spec":{"selector":{"version":"green"}}}'

# 4. Theo dõi metrics trong 5 phút
# Nếu lỗi tăng đột biến, rollback:
kubectl patch service signalops-api -p '{"spec":{"selector":{"version":"blue"}}}'

# 5. Dọn dẹp Blue cũ
kubectl delete deployment signalops-api-blue
```

**Thời gian dự kiến**: 30-60 giây cho bước chuyển traffic

### Kịch bản 3: Canary Deployment (triển khai theo giai đoạn)

```bash
# 1. Đưa version mới chạy song song với version cũ
# 2. Chuyển 10% traffic sang version mới
# 3. Theo dõi tỷ lệ lỗi, độ trễ, business metrics
# 4. Tăng dần: 25% → 50% → 100%
# 5. Hoặc rollback nếu metrics xấu đi

# Công cụ: Flagger + Prometheus metrics
kubectl apply -f canary.yml
```

---

## Kiểm tra sức khỏe và monitoring

### Xác thực trước khi deploy

```bash
# Kiểm tra schema
npm run validate:schema

# Xác minh build
npm run build

# Chạy integration test
npm run test:integration

# Load test (không bắt buộc)
npm run test:load -- --rps=1000 --duration=60
```

### Kiểm tra sau khi deploy

| Chỉ số | Ngưỡng cảnh báo | Hành động |
|-------|-----------------|-----------|
| Tỷ lệ lỗi | > 1% | Rollback ngay |
| Độ trễ p99 | > 10s | Báo ops xử lý |
| Mức dùng bộ nhớ | > 80% | Scale ngang |
| Độ sâu queue | > 10K jobs | Cảnh báo để kiểm tra |

---

## Ngưỡng rollback

| Điều kiện | Mức độ | Hành động |
|-----------|--------|----------|
| HTTP 5xx > 5% | CRITICAL | Auto-rollback |
| Tất cả replica ngừng hoạt động | CRITICAL | Kiểm tra thủ công |
| Kết nối database thất bại | CRITICAL | Auto-rollback |
| Rò rỉ bộ nhớ (OOM) | HIGH | Auto-rollback sau 3 phút |
| Suy giảm hiệu năng > 50% | MEDIUM | Xem xét thủ công |

---

## Checklist deploy

```markdown
## Trước khi deploy
- [ ] Code review đã được duyệt
- [ ] Tất cả test đều pass (CI/CD xanh)
- [ ] Changelog đã cập nhật
- [ ] Đã test migrations database
- [ ] Đã ghi chú kế hoạch rollback

## Trong lúc deploy
- [ ] Health check pass
- [ ] Không có spike tỷ lệ lỗi
- [ ] Kết nối WebSocket ổn định
- [ ] Xử lý queue bình thường
- [ ] Dashboard monitoring hiển thị xanh

## Sau khi deploy
- [ ] Smoke test pass
- [ ] Business metrics bình thường
- [ ] Không có cảnh báo mới
- [ ] Logs đã được kiểm tra lỗi
- [ ] Metrics hiệu năng đúng kỳ vọng
- [ ] Lên lịch review lại nếu thay đổi lớn
```

---

## Quản lý secrets

```yaml
# .github/workflows/deploy.yml
env:
  REGISTRY: ghcr.io
```

```yaml
jobs:
  deploy:
    steps:
      - name: Xác thực với registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_TOKEN }}
      
      - name: Triển khai với secrets
        env:
          MONGODB_PASSWORD: ${{ secrets.PROD_MONGODB_PASSWORD }}
          REDIS_PASSWORD: ${{ secrets.PROD_REDIS_PASSWORD }}
          API_KEY: ${{ secrets.PROD_API_KEY }}
        run: ./scripts/deploy-prod.sh
```

**Lưu secrets trong GitHub**:
- Organization Settings → Secrets and variables
- Tham chiếu bằng `${{ secrets.SECRET_NAME }}`
- Luân chuyển thông tin xác thực theo quý

---

## Phiên bản và phát hành

### Semantic Versioning

```
v1.0.0 = MAJOR.MINOR.PATCH
        = Breaking change.Feature.Bugfix
```

**Ví dụ**:
- v0.1.0 → v0.1.1: Sửa lỗi
- v0.1.0 → v0.2.0: Tính năng mới
- v0.2.0 → v1.0.0: Breaking change (đã sẵn sàng cho production)

### Tạo release

```bash
# 1. Cập nhật version trong package.json
npm version patch  # hoặc minor, major

# 2. Commit và gắn tag
git push origin main --tags

# 3. GitHub Actions tự động deploy khi có tag
# 4. Release notes được tạo tự động từ commit message
```

---

## Theo dõi triển khai

**Dashboard thời gian thực**:
```bash
# Xem trạng thái deployment
watch kubectl get deployment -A

# Stream logs của version mới
kubectl logs -f deployment/signalops-api -n production --tail=100

# Xem lịch sử rollout
kubectl rollout history deployment/signalops-api -n production
```

---

## Xử lý sự cố

| Vấn đề | Nguyên nhân | Giải pháp |
|-------|-------------|-----------|
| Deploy bị kẹt | Pod chưa sẵn sàng | `kubectl describe pod POD_NAME` |
| Rollback thất bại | Phiên bản trước cũng lỗi | Khôi phục thủ công từ backup |
| Không tìm thấy image | Xác thực registry thất bại | Kiểm tra secrets, chạy lại auth |
| Health check thất bại | Service chưa sẵn sàng | Tăng thời gian grace cho startup probe |

---

## Liên kết và tài liệu tham khảo

- [GitHub Actions Docs](https://docs.github.com/actions)
- [Kubernetes Rollout Docs](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [GitOps Best Practices](https://argoproj.github.io/cd/)
