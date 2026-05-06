# Scale Evaluation: TimescaleDB vs VictoriaMetrics

## Hiện tại

**Metrics Stack**: Prometheus (scrape) + Grafana (visualization)
- **Ingestion Rate**: ~10K metrics/minute (development estimate)
- **Retention**: Prometheus default 15 days
- **Storage**: In-memory + disk (single instance)

**Event/Alert Data**: MongoDB
- **Write Volume**: ~1K events/minute (normal), spikes to 10K/minute (anomalies)
- **10M+ events/month** = ~347 events/second sustained

## Bottlenecks at 10M+ Events/Month

| Bottleneck | Current Behavior | Impact |
|-----------|-----------------|--------|
| **MongoDB collection size** | No sharding, single replica set | Query performance degrades, index fragmentation |
| **Prometheus disk I/O** | All metrics on local disk | Slow scrape, missing data during high load |
| **TTL index cleanup** | Synchronous cleanup | Lock DB during deletion of old data |
| **Aggregation queries** | Full collection scan (events > 1GB) | Timeout on dashboard load (P0.3 addressed with aggregation) |

## Option 1: TimescaleDB for Time-Series Data

### Characteristics
- PostgreSQL extension for time-series
- Automatic partitioning by time
- Optimized compression (~95% smaller than raw)
- Native SQL queries, hyper-tables, continuous aggregates

### Evaluation

**Pros**:
- Reduces data storage 95% via compression
- Sub-second queries on billion-row tables
- Hyper-tables eliminate manual partitioning
- Better than MongoDB for analytical workloads

**Cons**:
- Replaces MongoDB (major migration)
- Requires schema redesign
- Learning curve for hyper-tables and continuous aggregates
- Connection pool management per app instance

### Recommendation
**Use case**: IF events table grows > 5GB and query performance critical
- Migrate events → TimescaleDB (keep alerts in MongoDB)
- Use MongoDB for transactional data, TimescaleDB for analytics
- Estimated setup time: 2-3 weeks (migration + testing)

**Not recommended now** because:
- P0.3 (aggregation pipeline) already addresses query performance
- TTL index handles retention automatically
- 10M events/month ~ 30GB/year (manageable on single MongoDB instance)

---

## Option 2: VictoriaMetrics for Prometheus Metrics

### Characteristics
- Drop-in Prometheus replacement
- Better compression, lower memory usage
- Horizontal scaling via vmcluster
- Multi-tenant support

### Evaluation

**Pros**:
- 10x better compression than Prometheus
- Handles 10M+ metrics/minute (vs Prometheus 100K/minute limit)
- Easier scaling than Prometheus (remote storage)
- Better cardinality handling

**Cons**:
- Not full Prometheus replacement (breaking changes)
- Requires rewrite of alerts/rules
- VictoriaMetrics Cluster requires 3+ nodes (minimum)
- Overkill for current ~10K metrics/minute

### Recommendation
**Current Status**: Stick with Prometheus + Grafana
- Current 10K metrics/minute well within Prometheus capacity
- Add VictoriaMetrics when reaching 500K+ metrics/minute

**Trigger for upgrade**:
1. Prometheus scrape failures occurring regularly
2. Storage growing > 100GB per 15 days
3. Dashboard queries taking > 5 seconds consistently

---

## Hybrid Recommendation for 10M+ Events/Month

**Phase 1 (Now)**: Current stack + optimizations
- ✅ MongoDB aggregation pipeline (completed P0.3)
- ✅ TTL index for auto-cleanup (completed P0.4)
- ✅ Business metrics collection (completed P1.4)
- Implement Redis caching for frequently queried aggregations

**Phase 2 (Q3 2025)**: Scale horizontal read
- Read replicas in MongoDB (secondary nodes for analytics)
- Query secondary for heavy aggregations (non-critical reads)
- Separate connection pool for analytics queries

**Phase 3 (Q4 2025)**: Selective migration
- Migrate "cold" events (> 90 days) to TimescaleDB archive
- Keep hot data in MongoDB
- Use TimescaleDB for historical analysis, reporting

**Phase 4 (2026)**: Full time-series database
- Evaluate VictoriaMetrics for metric ingestion (if needed)
- Consider ClickHouse for event warehouse
- Implement data lake for long-term storage

## Action Items

1. **Monitor metrics**:
   - Add alerts for MongoDB oplog lag
   - Track query performance percentiles (p50, p95, p99)
   - Alert on Prometheus scrape failures

2. **Prepare for scale**:
   - Document backup strategy (BACKUP.md)
   - Test failover procedures
   - Document scaling playbook

3. **Evaluate in 6 months**:
   - If events > 50M/month → Move to Phase 2
   - If metrics > 500K/minute → Evaluate VictoriaMetrics
   - Based on actual usage patterns

## Estimated Costs (AWS)

| Option | Compute | Storage | Monthly |
|--------|---------|---------|---------|
| **Current (MongoDB)** | 2x m5.large | 500GB EBS | $500 |
| **+ TimescaleDB** | 3x m5.large | 200GB EBS | $700 |
| **+ VictoriaMetrics** | 3x m5.xlarge | 1TB EBS | $1200 |
| **Full migration** | 5x m5.large | 2TB EBS | $1500 |

**Note**: Based on AWS pricing; adjust for your cloud provider.
