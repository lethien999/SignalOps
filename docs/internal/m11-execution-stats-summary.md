# M11 SLA Explain ExecutionStats Summary

Source: m11-sla-explain.json

| Pipeline | Stage | Input Stage | Index | nReturned | Time (ms) | Keys Examined | Docs Examined |
|---|---|---|---|---:|---:|---:|---:|
| totals | GROUP | COLLSCAN | N/A | 0 | 2 | 0 | 0 |
| mttr | PROJECTION_SIMPLE | FETCH | status_1_severity_-1_createdAt_-1 | 0 | 1 | 0 | 0 |
| downtime | PROJECTION_SIMPLE | COLLSCAN | N/A | 0 | 0 | 0 | 0 |
| byDayStatus | unknown | unknown | N/A | 0 | 3 | 0 | 0 |
| byDayMttr | GROUP | FETCH | status_1_severity_-1_createdAt_-1 | 0 | 3 | 0 | 0 |

## Notes

- Pipelines with `COLLSCAN` should be prioritized for index tuning.
- `totalDocsExamined` and `totalKeysExamined` help validate index effectiveness under real dataset load.
- If most counts are `0`, rerun explain against a time window containing realistic production-like data.