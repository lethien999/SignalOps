import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ArchiveRecord, ArchiveSource, ArchiveStatus } from '../schemas/archive-record.schema';

type ArchiveRecordFilters = {
  source?: ArchiveSource;
  status?: ArchiveStatus;
  skip?: number;
  limit?: number;
};

@Injectable()
export class ArchiveRecordRepository {
  constructor(
    @InjectModel(ArchiveRecord.name) private readonly archiveRecordModel: Model<ArchiveRecord>,
  ) {}

  async createRunning(payload: {
    source: ArchiveSource;
    bucket: string;
    objectKey: string;
    cutoffDate: Date;
    retentionExpiresAt?: Date;
  }): Promise<ArchiveRecord> {
    return this.archiveRecordModel.create({
      source: payload.source,
      status: 'running',
      bucket: payload.bucket,
      objectKey: payload.objectKey,
      cutoffDate: payload.cutoffDate,
      retentionExpiresAt: payload.retentionExpiresAt,
      documentCount: 0,
    });
  }

  async markCompleted(
    id: string,
    payload: {
      documentCount: number;
      rangeFrom?: Date;
      rangeTo?: Date;
      contentType: string;
      contentLength: number;
      checksumSha256: string;
    },
  ): Promise<ArchiveRecord | null> {
    return this.archiveRecordModel.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        documentCount: payload.documentCount,
        rangeFrom: payload.rangeFrom,
        rangeTo: payload.rangeTo,
        contentType: payload.contentType,
        contentLength: payload.contentLength,
        checksumSha256: payload.checksumSha256,
        errorMessage: undefined,
      },
      { new: true },
    ).exec();
  }

  async markFailed(id: string, errorMessage: string): Promise<ArchiveRecord | null> {
    return this.archiveRecordModel.findByIdAndUpdate(
      id,
      {
        status: 'failed',
        errorMessage,
      },
      { new: true },
    ).exec();
  }

  async findById(id: string): Promise<ArchiveRecord | null> {
    return this.archiveRecordModel.findById(id).exec();
  }

  async list(filters: ArchiveRecordFilters): Promise<{ data: ArchiveRecord[]; total: number }> {
    const query: Record<string, string> = {};

    if (filters.source) {
      query.source = filters.source;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = Math.max(filters.skip || 0, 0);
    const limit = Math.min(Math.max(filters.limit || 20, 1), 200);

    const [data, total] = await Promise.all([
      this.archiveRecordModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.archiveRecordModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async findExpiredCompleted(now: Date): Promise<ArchiveRecord[]> {
    return this.archiveRecordModel
      .find({
        status: 'completed',
        deletedAt: { $exists: false },
        retentionExpiresAt: { $lte: now },
      })
      .exec();
  }

  async markDeleted(id: string): Promise<void> {
    await this.archiveRecordModel.findByIdAndUpdate(id, { deletedAt: new Date() }).exec();
  }
}
