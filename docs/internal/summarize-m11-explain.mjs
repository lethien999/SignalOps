#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] ?? path.resolve('docs/internal/m11-sla-explain.json');
const outputPath = process.argv[3] ?? path.resolve('docs/internal/m11-execution-stats-summary.md');

const explain = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

function getByPath(obj, keys) {
  return keys.reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);
}

function summarizePipeline(name, node) {
  const qp = node?.queryPlanner;
  const es = node?.executionStats;

  if (qp && es) {
    const winningStage = getByPath(qp, ['winningPlan', 'queryPlan', 'stage'])
      ?? getByPath(qp, ['winningPlan', 'stage'])
      ?? 'unknown';
    const inputStage = getByPath(qp, ['winningPlan', 'queryPlan', 'inputStage', 'stage'])
      ?? getByPath(qp, ['winningPlan', 'inputStage', 'stage'])
      ?? 'unknown';
    const indexName = getByPath(qp, ['winningPlan', 'inputStage', 'inputStage', 'indexName'])
      ?? getByPath(qp, ['winningPlan', 'queryPlan', 'inputStage', 'inputStage', 'indexName'])
      ?? getByPath(qp, ['winningPlan', 'inputStage', 'indexName'])
      ?? 'N/A';

    return {
      name,
      stage: winningStage,
      inputStage,
      indexName,
      nReturned: es.nReturned ?? 'N/A',
      executionTimeMillis: es.executionTimeMillis ?? 'N/A',
      totalKeysExamined: es.totalKeysExamined ?? 'N/A',
      totalDocsExamined: es.totalDocsExamined ?? 'N/A'
    };
  }

  const cursor = node?.stages?.find((s) => s.$cursor)?.$cursor;
  const cursorQp = cursor?.queryPlanner;
  const cursorEs = cursor?.executionStats;
  const winningStage = getByPath(cursorQp, ['winningPlan', 'stage']) ?? 'unknown';
  const inputStage = getByPath(cursorQp, ['winningPlan', 'inputStage', 'stage']) ?? 'unknown';
  const indexName = getByPath(cursorQp, ['winningPlan', 'inputStage', 'inputStage', 'indexName'])
    ?? getByPath(cursorQp, ['winningPlan', 'inputStage', 'indexName'])
    ?? 'N/A';

  return {
    name,
    stage: winningStage,
    inputStage,
    indexName,
    nReturned: cursorEs?.nReturned ?? 'N/A',
    executionTimeMillis: cursorEs?.executionTimeMillis ?? 'N/A',
    totalKeysExamined: cursorEs?.totalKeysExamined ?? 'N/A',
    totalDocsExamined: cursorEs?.totalDocsExamined ?? 'N/A'
  };
}

const rows = Object.entries(explain).map(([name, node]) => summarizePipeline(name, node));

const md = [
  '# M11 SLA Explain ExecutionStats Summary',
  '',
  `Source: ${path.basename(inputPath)}`,
  '',
  '| Pipeline | Stage | Input Stage | Index | nReturned | Time (ms) | Keys Examined | Docs Examined |',
  '|---|---|---|---|---:|---:|---:|---:|',
  ...rows.map((r) => `| ${r.name} | ${r.stage} | ${r.inputStage} | ${r.indexName} | ${r.nReturned} | ${r.executionTimeMillis} | ${r.totalKeysExamined} | ${r.totalDocsExamined} |`),
  '',
  '## Notes',
  '',
  '- Pipelines with `COLLSCAN` should be prioritized for index tuning.',
  '- `totalDocsExamined` and `totalKeysExamined` help validate index effectiveness under real dataset load.',
  '- If most counts are `0`, rerun explain against a time window containing realistic production-like data.'
].join('\n');

fs.writeFileSync(outputPath, md, 'utf8');
console.log(`Explain summary written to ${outputPath}`);
