#!/usr/bin/env ts-node
import computeDailySummaries from '../jobs/alert-summary.job';

async function run() {
  const days = Number(process.env.BACKFILL_DAYS || '30');
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  console.log(`Backfilling alert summaries from ${from.toISOString()} to ${to.toISOString()}`);

  const res = await computeDailySummaries({ fromDate: from, toDate: to });
  console.log('Backfill result:', res);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
