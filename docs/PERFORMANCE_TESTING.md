# SignalOps Performance Testing Guide

This document covers the ready-to-use performance testing harnesses included in SignalOps. These tools are designed to verify system performance under load and can be run locally or in staging/production environments.

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm installed
- SignalOps services running (`docker-compose up`)
- `.env` file configured with `API_KEY` for authentication

### Run All Tests
```bash
# Unit + integration tests
npm run test:integration

# Load testing
npm run perf:load

# WebSocket broadcast testing
npm run perf:websocket

# Long-running soak test
npm run perf:soak
```

---

## 1. HTTP Load Testing (`npm run perf:load`)

Tests the HTTP API under concurrent load. Measures throughput, latency (avg and P95), and error rate.

### Basic Usage
```bash
npm run perf:load
```

Default behavior:
- Duration: 30 seconds
- Concurrency: 10 concurrent workers
- Target endpoint: `http://localhost:3000/api/events`
- Output: JSON with metrics

### Configuration (Environment Variables)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PERF_TEST_TOTAL_REQUESTS` | 0 (unlimited) | Fixed request count. If set, overrides duration-based mode |
| `PERF_TEST_CONCURRENCY` | 10 | Number of concurrent workers |
| `PERF_TEST_DURATION_SECONDS` | 30 | How long to run (ignored if PERF_TEST_TOTAL_REQUESTS is set) |
| `PERF_TEST_MAX_AVG_MS` | (none) | Assertion: fail if average latency exceeds this |
| `PERF_TEST_MAX_P95_MS` | (none) | Assertion: fail if P95 latency exceeds this |
| `PERF_TEST_MAX_ERROR_RATE` | (none) | Assertion: fail if error rate exceeds this (0.0-1.0) |

### Examples

**Probe Test (5 requests, 2 workers)**
```bash
$env:PERF_TEST_TOTAL_REQUESTS='5'
$env:PERF_TEST_CONCURRENCY='2'
node scripts/perf-load.mjs
```

**30-second load test with 50 concurrent workers**
```bash
$env:PERF_TEST_CONCURRENCY='50'
$env:PERF_TEST_DURATION_SECONDS='30'
npm run perf:load
```

**1000 requests, fail if P95 > 500ms**
```bash
$env:PERF_TEST_TOTAL_REQUESTS='1000'
$env:PERF_TEST_CONCURRENCY='100'
$env:PERF_TEST_MAX_P95_MS='500'
npm run perf:load
```

**100 requests/sec for 5 minutes (duration-based, ~30,000 total)**
```bash
$env:PERF_TEST_DURATION_SECONDS='300'
$env:PERF_TEST_CONCURRENCY='100'  # Will throttle to hit 100 req/s
npm run perf:load
```

### Output Format
```json
{
  "event": "perf:load:summary",
  "baseUrl": "http://localhost:3000",
  "concurrency": 10,
  "durationSeconds": 30,
  "targetTotalRequests": 0,
  "success": 1456,
  "errors": 3,
  "throughputPerSecond": 48.53,
  "avgMs": 205.23,
  "p95Ms": 312.44,
  "errorRate": 0.002
}
```

### Interpreting Results
- **throughputPerSecond**: Requests handled per second
- **avgMs**: Average response time in milliseconds
- **p95Ms**: 95th percentile latency (95% of requests are faster than this)
- **errorRate**: Percentage of failed requests (e.g., 0.02 = 2%)

### Typical Targets
| Metric | Target | Notes |
|--------|--------|-------|
| throughputPerSecond | >100 req/s | For 10 concurrent, expect ~500 req/s |
| avgMs | <100 ms | Average response time |
| p95Ms | <200 ms | 95% of requests complete within this time |
| errorRate | <0.01 (1%) | Less than 1% failures |

---

## 2. Soak Testing (`npm run perf:soak`)

Long-running test to detect memory leaks or performance degradation over time. Uses the same configuration as load testing but typically runs for hours.

### Basic Usage
```bash
# Run for 10 minutes
$env:PERF_TEST_DURATION_SECONDS='600'
npm run perf:soak
```

### Recommended Configuration
```bash
$env:PERF_TEST_CONCURRENCY='20'         # Moderate load
$env:PERF_TEST_DURATION_SECONDS='3600'  # 1 hour
npm run perf:soak
```

**24-hour soak test** (for production validation)
```bash
$env:PERF_TEST_CONCURRENCY='50'
$env:PERF_TEST_DURATION_SECONDS='86400'  # 24 hours
npm run perf:soak
```

### What to Monitor
While soak test runs, observe:
1. Memory usage: `docker stats` or `ps aux`
2. CPU usage: Resource utilization should remain stable
3. Logs: Check for growing error rates or warning messages
4. Metrics: Prometheus dashboard for custom application metrics

### Example: Monitor During Soak
```bash
# In a separate terminal, watch Docker stats
docker stats signalops-api-gateway signalops-worker signalops-mongodb

# Watch logs for errors
docker-compose logs -f api-gateway worker
```

---

## 3. WebSocket Broadcast Testing (`npm run perf:websocket`)

Tests real-time WebSocket broadcasts. Connects N clients, triggers an alert event via HTTP, and measures how many clients receive the broadcast within a timeout.

### Basic Usage
```bash
npm run perf:websocket
```

Default behavior:
- Number of clients: 100
- Timeout: 20 seconds (to wait for broadcast)
- Output: JSON with delivery metrics

### Configuration (Environment Variables)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PERF_TEST_CLIENTS` | 100 | Number of WebSocket clients to connect |
| `PERF_TEST_TIMEOUT_MS` | 20000 | How long to wait for alert:new broadcast (milliseconds) |

### Examples

**Probe Test (2 clients)**
```bash
$env:PERF_TEST_CLIENTS='2'
$env:PERF_TEST_TIMEOUT_MS='15000'
npm run perf:websocket
```

**100 clients, 30-second timeout**
```bash
$env:PERF_TEST_CLIENTS='100'
$env:PERF_TEST_TIMEOUT_MS='30000'
npm run perf:websocket
```

**Stress: 500 concurrent clients**
```bash
$env:PERF_TEST_CLIENTS='500'
$env:PERF_TEST_TIMEOUT_MS='45000'  # Longer timeout for more clients
npm run perf:websocket
```

### Output Format
```json
{
  "event": "perf:websocket:summary",
  "baseUrl": "http://localhost:3000",
  "clientCount": 100,
  "delivered": 100,
  "deliveryRate": 1.0
}
```

### Interpreting Results
- **clientCount**: Number of WebSocket clients that connected
- **delivered**: How many clients received the `alert:new` broadcast
- **deliveryRate**: `delivered / clientCount` (1.0 = 100% delivery)

### Typical Targets
| Metric | Target | Notes |
|--------|--------|-------|
| clientCount | Should match PERF_TEST_CLIENTS | Indicates connection success |
| deliveryRate | 1.0 (100%) | All clients should receive broadcasts |

---

## Automation & CI/CD Integration

### Run in Jenkins Pipeline
```groovy
stage('Performance Test') {
  steps {
    sh '''
      export PERF_TEST_TOTAL_REQUESTS=500
      export PERF_TEST_CONCURRENCY=50
      export PERF_TEST_MAX_AVG_MS=150
      export PERF_TEST_MAX_P95_MS=300
      npm run perf:load
    '''
  }
}
```

### GitHub Actions Example
```yaml
- name: Run Performance Tests
  run: |
    export PERF_TEST_TOTAL_REQUESTS=1000
    export PERF_TEST_CONCURRENCY=100
    npm run perf:load
```

---

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"
**Problem**: Cannot connect to API
**Solution**:
- Verify services are running: `docker-compose ps`
- Check API Gateway is healthy: `curl http://localhost:3000/api/health`
- Ensure correct API_KEY in `.env`

### High Error Rate During Load Test
**Possible Causes**:
1. System overloaded → increase `PERF_TEST_CONCURRENCY` gradually
2. API has a bug → check logs: `docker-compose logs api-gateway`
3. Database connection lost → check MongoDB/Redis: `docker-compose ps`

### WebSocket Clients Not Connecting
**Problem**: `clientCount` much lower than `PERF_TEST_CLIENTS`
**Solution**:
- Check network connectivity
- Verify API Gateway WebSocket is running: `curl http://localhost:3000/socket.io`
- Increase timeout: `PERF_TEST_TIMEOUT_MS=60000`

### Memory Spike During Soak Test
**Possible Causes**:
1. Memory leak in application → check for unclosed connections or event listeners
2. Test tool accumulating results → normal if short-lived

**Solution**:
- Monitor with `docker stats` and `docker logs`
- Check application logs for warnings/errors
- If leak confirmed, file bug with timestamp and metrics

---

## Best Practices

1. **Start Small**: Begin with probe tests (5 requests, 2 clients) to ensure basic connectivity
2. **Gradual Ramp**: Increase load/client count incrementally rather than jumping to max
3. **Monitor**: Watch CPU, memory, and logs while tests run
4. **Record Baseline**: Run tests in clean environment to establish performance baseline
5. **Compare**: After code changes, re-run with same configuration to detect regressions
6. **Automate**: Integrate into CI/CD pipeline with consistent environment
7. **Document Results**: Keep records of performance metrics over time

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment guide
- [OPERATIONS.md](./OPERATIONS.md) — Operational procedures
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design
- [docs/internal/IMPLEMENTATION_CHECKLIST.md](./internal/IMPLEMENTATION_CHECKLIST.md) — Complete feature checklist

---

**Last Updated**: 04/05/2026  
**Status**: ✅ Ready for use (local + staging/production)
