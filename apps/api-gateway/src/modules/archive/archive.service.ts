import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Alert } from '../alert/schemas/alert.schema';
import { Event } from '../event/schemas/event.schema';
import { Model, Types } from 'mongoose';
import { ArchiveRecordRepository } from './repositories/archive-record.repository';
import { ArchiveRecord, ArchiveSource } from './schemas/archive-record.schema';
import { Logger } from '../../common/logger';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { gzipSync } from 'zlib';

export type RunArchiveInput = {
  source?: 'events' | 'alerts' | 'both';
  olderThanDays?: number;
  maxDocumentsPerSource?: number;
};

@Injectable()
export class ArchiveService {
  private readonly archiveEnabled =
    String(process.env.ARCHIVE_S3_ENABLED || 'false').toLowerCase() === 'true';
  private readonly bucket = process.env.ARCHIVE_S3_BUCKET || '';
  private readonly endpoint = process.env.ARCHIVE_S3_ENDPOINT || '';
  private readonly region = process.env.ARCHIVE_S3_REGION || 'auto';
  private readonly forcePathStyle =
    String(process.env.ARCHIVE_S3_FORCE_PATH_STYLE || 'true').toLowerCase() === 'true';
  private readonly keyId = process.env.ARCHIVE_S3_ACCESS_KEY_ID || '';
  private readonly secretKey = process.env.ARCHIVE_S3_SECRET_ACCESS_KEY || '';
  private readonly prefix = (process.env.ARCHIVE_S3_PREFIX || 'signalops/archive').replace(
    /^\/+|\/+$/g,
    ''
  );
  private readonly retentionDays = parseInt(process.env.ARCHIVE_RETENTION_DAYS || '180', 10);
  private readonly deleteSource =
    String(process.env.ARCHIVE_DELETE_SOURCE || 'false').toLowerCase() === 'true';

  private readonly s3Client: S3Client;

  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    @InjectModel(Alert.name) private readonly alertModel: Model<Alert>,
    private readonly archiveRecordRepository: ArchiveRecordRepository
  ) {
    this.s3Client = new S3Client({
      endpoint: this.endpoint || undefined,
      region: this.region,
      forcePathStyle: this.forcePathStyle,
      credentials:
        this.keyId && this.secretKey
          ? {
              accessKeyId: this.keyId,
              secretAccessKey: this.secretKey,
            }
          : undefined,
    });
  }

  async runArchive(input: RunArchiveInput) {
    this.assertArchiveReady();

    const source = input.source || 'both';
    const olderThanDays = Math.min(Math.max(input.olderThanDays || 30, 1), 3650);
    const maxDocumentsPerSource = Math.min(Math.max(input.maxDocumentsPerSource || 5000, 1), 50000);
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const sources: ArchiveSource[] = source === 'both' ? ['events', 'alerts'] : [source];

    const results = [] as Array<{
      source: ArchiveSource;
      archivedDocuments: number;
      recordId?: string;
      objectKey?: string;
      skipped: boolean;
      message?: string;
    }>;

    for (const item of sources) {
      const result = await this.archiveOneSource(item, cutoffDate, maxDocumentsPerSource);
      results.push(result);
    }

    const cleanup = await this.cleanupExpiredArchives();

    return {
      archiveEnabled: this.archiveEnabled,
      olderThanDays,
      cutoffDate: cutoffDate.toISOString(),
      deleteSource: this.deleteSource,
      retentionDays: this.retentionDays,
      results,
      retentionCleanup: cleanup,
    };
  }

  async listRecords(filters: {
    source?: ArchiveSource;
    status?: 'running' | 'completed' | 'failed';
    skip?: number;
    limit?: number;
  }) {
    const { data, total } = await this.archiveRecordRepository.list(filters);

    return {
      data,
      pagination: {
        skip: Math.max(filters.skip || 0, 0),
        limit: Math.min(Math.max(filters.limit || 20, 1), 200),
        total,
      },
    };
  }

  async downloadArchive(recordId: string): Promise<{ record: ArchiveRecord; body: Buffer }> {
    this.assertArchiveReady();

    const record = await this.archiveRecordRepository.findById(recordId);
    if (!record) {
      throw new NotFoundException(`Không tìm thấy archive record ${recordId}`);
    }

    if (record.deletedAt) {
      throw new NotFoundException(`Archive record ${recordId} đã hết hạn retention`);
    }

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: record.bucket,
        Key: record.objectKey,
      })
    );

    if (!response.Body) {
      throw new NotFoundException(`Không tìm thấy object ${record.objectKey}`);
    }

    const bytes = await response.Body.transformToByteArray();
    return {
      record,
      body: Buffer.from(bytes),
    };
  }

  private async archiveOneSource(
    source: ArchiveSource,
    cutoffDate: Date,
    maxDocumentsPerSource: number
  ): Promise<{
    source: ArchiveSource;
    archivedDocuments: number;
    recordId?: string;
    objectKey?: string;
    skipped: boolean;
    message?: string;
  }> {
    const model: Model<Record<string, unknown>> = (source === 'events'
      ? this.eventModel
      : this.alertModel) as unknown as Model<Record<string, unknown>>;

    const docs = (await model
      .find({
        createdAt: { $lte: cutoffDate },
        archivedAt: { $exists: false },
      })
      .sort({ createdAt: 1 })
      .limit(maxDocumentsPerSource)
      .lean()
      .exec()) as Array<
      Record<string, unknown> & { _id: Types.ObjectId | string; createdAt?: Date | string }
    >;

    if (docs.length === 0) {
      return {
        source,
        archivedDocuments: 0,
        skipped: true,
        message: 'Không có dữ liệu phù hợp để archive',
      };
    }

    const now = new Date();
    const retentionExpiresAt = new Date(now.getTime() + this.retentionDays * 24 * 60 * 60 * 1000);
    const objectKey = this.buildObjectKey(source, now);

    const record = await this.archiveRecordRepository.createRunning({
      source,
      bucket: this.bucket,
      objectKey,
      cutoffDate,
      retentionExpiresAt,
    });

    try {
      const ndjson = docs.map((doc: Record<string, unknown>) => JSON.stringify(doc)).join('\n');
      const buffer = gzipSync(Buffer.from(ndjson, 'utf-8'));
      const checksumSha256 = createHash('sha256').update(buffer).digest('hex');

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: 'application/x-ndjson',
          ContentEncoding: 'gzip',
        })
      );

      const ids = docs
        .map((doc) => doc._id)
        .filter(
          (id): id is Types.ObjectId | string =>
            id instanceof Types.ObjectId || typeof id === 'string'
        )
        .map((id) => (id instanceof Types.ObjectId ? id : new Types.ObjectId(id)));

      if (this.deleteSource) {
        await model.deleteMany({ _id: { $in: ids } }).exec();
      } else {
        await model.updateMany({ _id: { $in: ids } }, { $set: { archivedAt: now } }).exec();
      }

      const firstCreatedRaw = docs[0]?.createdAt;
      const lastCreatedRaw = docs[docs.length - 1]?.createdAt;
      const firstCreatedAt = firstCreatedRaw ? new Date(firstCreatedRaw) : undefined;
      const lastCreatedAt = lastCreatedRaw ? new Date(lastCreatedRaw) : undefined;

      await this.archiveRecordRepository.markCompleted(record._id.toString(), {
        documentCount: docs.length,
        rangeFrom: firstCreatedAt,
        rangeTo: lastCreatedAt,
        contentType: 'application/x-ndjson',
        contentLength: buffer.length,
        checksumSha256,
      });

      Logger.info('Archive thành công', {
        source,
        recordId: record._id?.toString(),
        objectKey,
        documentCount: docs.length,
        deleteSource: this.deleteSource,
      });

      return {
        source,
        archivedDocuments: docs.length,
        skipped: false,
        recordId: record._id?.toString(),
        objectKey,
      };
    } catch (error) {
      await this.archiveRecordRepository.markFailed(
        record._id.toString(),
        error instanceof Error ? error.message : 'Unknown archive error'
      );
      throw error;
    }
  }

  private async cleanupExpiredArchives() {
    this.assertArchiveReady();

    const expiredRecords = await this.archiveRecordRepository.findExpiredCompleted(new Date());
    let deleted = 0;
    const errors: string[] = [];

    for (const record of expiredRecords) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: record.bucket,
            Key: record.objectKey,
          })
        );
        await this.archiveRecordRepository.markDeleted(record._id.toString());
        deleted += 1;
      } catch (error) {
        errors.push(
          `${record._id?.toString()}: ${error instanceof Error ? error.message : 'unknown error'}`
        );
      }
    }

    return {
      checked: expiredRecords.length,
      deleted,
      failed: errors.length,
      errors,
    };
  }

  private buildObjectKey(source: ArchiveSource, now: Date): string {
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    return `${this.prefix}/${source}/${yyyy}/${mm}/${dd}/${now.getTime()}.ndjson.gz`;
  }

  private assertArchiveReady() {
    if (!this.archiveEnabled) {
      throw new BadRequestException(
        'Archive pipeline đang tắt. Set ARCHIVE_S3_ENABLED=true để sử dụng.'
      );
    }

    if (!this.bucket) {
      throw new BadRequestException('Thiếu cấu hình ARCHIVE_S3_BUCKET');
    }
  }
}
