import { MongoClient, AnyBulkWriteOperation, Document } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// resolve .env relative to repo root
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

function buildMongoUri() {
  return process.env.MONGODB_URI || 'mongodb://localhost:27017';
}

export async function computeDailySummaries({
  fromDate,
  toDate,
}: {
  fromDate: Date;
  toDate: Date;
}) {
  const uri = buildMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const dbName = process.env.MONGODB_DB || process.env.MONGODB_INITDB_DATABASE || 'signalops-db';
    const db = client.db(dbName);
    const alerts = db.collection('alerts');
    const summaries = db.collection('alert_daily_summaries');

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: 1,
          type: 1,
          severity: 1,
          createdAt: 1,
          resolvedAt: 1,
        },
      },
      {
        $group: {
          _id: { date: '$date', type: '$type', severity: '$severity' },
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          acknowledged: { $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          avgMttrMinutes: {
            $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60] },
          },
        },
      },
    ];

    const cursor = alerts.aggregate(pipeline, { allowDiskUse: true });
    const bulkOps: AnyBulkWriteOperation<Document>[] = [];
    for await (const row of cursor) {
      const [date, type, severity] = [row._id.date, row._id.type || null, row._id.severity || null];
      bulkOps.push({
        updateOne: {
          filter: { date, type, severity },
          update: {
            $set: {
              date,
              type,
              severity,
              total: row.total || 0,
              open: row.open || 0,
              acknowledged: row.acknowledged || 0,
              resolved: row.resolved || 0,
              mttrMinutes: Number((row.avgMttrMinutes || 0).toFixed(2)),
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      await summaries.bulkWrite(bulkOps);
    }

    return { updated: bulkOps.length };
  } finally {
    await client.close();
  }
}

export default computeDailySummaries;
