# GitHub Actions CI/CD & Deployment Strategy

## Mục đích

Tự động hóa:
1. Build & test trên mỗi commit
2. Deploy lên staging/production
3. Rollback nhanh nếu có vấn đề

---

## Trigger Events

| Event | Action | Workflow |
|-------|--------|----------|
| Push to `main` | Build → Test → Deploy to Staging | `build-and-test.yml` |
| Push to `develop` | Build → Test → Deploy to Dev | `build-and-test.yml` |
| Create Release tag | Build → Test → Deploy to Production | `release.yml` |
| Pull Request | Build → Test → Report coverage | `pr-check.yml` |
| Manual dispatch | Deploy specific version | `deploy-manual.yml` |

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

## Rollback Strategy

### Scenario 1: Immediate Rollback (< 1 hour)

**Trigger**: Bug discovered in production

**Process**:
```bash
# 1. Identify bad version
kubectl get deployment -A | grep signalops

# 2. List recent versions
docker images | grep signalops-api | head -5

# 3. Rollback to previous version
kubectl rollout undo deployment/signalops-api -n production

# 4. Verify health
kubectl rollout status deployment/signalops-api -n production
```

**Expected time**: 2-5 minutes

### Scenario 2: Blue-Green Deployment

**Setup**:
```yaml
# Blue (current)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: signalops-api-blue
  
# Green (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: signalops-api-green

# Service routes to Blue
apiVersion: v1
kind: Service
metadata:
  name: signalops-api
spec:
  selector:
    version: blue  # Switch to 'green' for rollout
```

**Rollout Process**:
```bash
# 1. Deploy to Green (while Blue handles traffic)
kubectl apply -f deploy-green.yml

# 2. Test Green behind internal DNS
curl http://signalops-api-green.svc.cluster.local/health

# 3. Switch traffic
kubectl patch service signalops-api -p '{"spec":{"selector":{"version":"green"}}}'

# 4. Monitor metrics for 5 minutes
# If errors spike, rollback:
kubectl patch service signalops-api -p '{"spec":{"selector":{"version":"blue"}}}'

# 5. Cleanup old Blue
kubectl delete deployment signalops-api-blue
```

**Expected time**: 30-60 seconds for cutover

### Scenario 3: Canary Deployment (Staged Rollout)

```bash
# 1. Deploy new version alongside old
# 2. Route 10% traffic to new version
# 3. Monitor error rate, latency, business metrics
# 4. Gradually increase: 25% → 50% → 100%
# 5. Or rollback if metrics degraded

# Tools: Flagger + Prometheus metrics
kubectl apply -f canary.yml
```

---

## Health Checks & Monitoring

### Pre-deployment Validation

```bash
# Schema validation
npm run validate:schema

# Build verification
npm run build

# Integration tests
npm run test:integration

# Load testing (optional)
npm run test:load -- --rps=1000 --duration=60
```

### Post-deployment Checks

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Error rate | > 1% | Immediate rollback |
| p99 latency | > 10s | Escalate to ops |
| Memory usage | > 80% | Scale horizontally |
| Queue depth | > 10K jobs | Alert for investigation |

---

## Rollback Triggers

| Condition | Severity | Action |
|-----------|----------|--------|
| HTTP 5xx errors > 5% | CRITICAL | Auto-rollback |
| All replicas down | CRITICAL | Manual investigation |
| Database connection fails | CRITICAL | Auto-rollback |
| Memory leak (OOM) | HIGH | Auto-rollback after 3 min |
| Performance degradation > 50% | MEDIUM | Manual review |

---

## Deployment Checklist

```markdown
## Pre-deployment
- [ ] Code review approved
- [ ] All tests passing (CI/CD green)
- [ ] Changelog updated
- [ ] Database migrations tested
- [ ] Rollback plan documented

## During deployment
- [ ] Health checks passing
- [ ] No error rate spike
- [ ] WebSocket connections stable
- [ ] Queue processing normal
- [ ] Monitoring dashboards green

## Post-deployment
- [ ] Smoke tests passing
- [ ] Business metrics normal
- [ ] No alert escalations
- [ ] Logs reviewed for errors
- [ ] Performance metrics as expected
- [ ] Schedule follow-up review if large change
```

---

## Secrets Management

```yaml
# .github/workflows/deploy.yml
env:
  REGISTRY: ghcr.io
  
jobs:
  deploy:
    steps:
      - name: Authenticate with registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_TOKEN }}
      
      - name: Deploy with secrets
        env:
          MONGODB_PASSWORD: ${{ secrets.PROD_MONGODB_PASSWORD }}
          REDIS_PASSWORD: ${{ secrets.PROD_REDIS_PASSWORD }}
          API_KEY: ${{ secrets.PROD_API_KEY }}
        run: ./scripts/deploy-prod.sh
```

**Store secrets in GitHub**:
- Organization Settings → Secrets and variables
- Reference as `${{ secrets.SECRET_NAME }}`
- Rotate credentials quarterly

---

## Versioning & Release

### Semantic Versioning

```
v1.0.0 = MAJOR.MINOR.PATCH
        = Breaking change.Feature.Bugfix
```

**Examples**:
- v0.1.0 → v0.1.1: Bugfix
- v0.1.0 → v0.2.0: New feature
- v0.2.0 → v1.0.0: Breaking change (production ready)

### Creating a Release

```bash
# 1. Update version in package.json
npm version patch  # or minor, major

# 2. Commit and tag
git push origin main --tags

# 3. GitHub Actions automatically deploys on tag
# 4. Release notes auto-generated from commit messages
```

---

## Monitoring Deployments

**Real-time dashboard**:
```bash
# Watch deployment status
watch kubectl get deployment -A

# Stream logs from new version
kubectl logs -f deployment/signalops-api -n production --tail=100

# Check rollout history
kubectl rollout history deployment/signalops-api -n production
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Deployment stuck | Pod not becoming healthy | `kubectl describe pod POD_NAME` |
| Rollback failed | Previous version also broken | Manual restore from backup |
| Image not found | Registry authentication failed | Check secrets, rerun auth |
| Health check failing | Service not ready | Increase startup probe grace period |

---

## Links & References

- [GitHub Actions Docs](https://docs.github.com/actions)
- [Kubernetes Rollout Docs](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [GitOps Best Practices](https://argoproj.github.io/cd/)
