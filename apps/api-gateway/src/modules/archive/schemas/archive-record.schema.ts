import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ArchiveSource = 'events' | 'alerts';
export type ArchiveStatus = 'running' | 'completed' | 'failed';

@Schema({ timestamps: true, strict: 'throw', minimize: false })
export class ArchiveRecord extends Document {
  @Prop({ required: true, enum: ['events', 'alerts'] })
  source: ArchiveSource;

  @Prop({ required: true, enum: ['running', 'completed', 'failed'], default: 'running' })
  status: ArchiveStatus;

  @Prop({ required: true, trim: true })
  bucket: string;

  @Prop({ required: true, trim: true })
  objectKey: string;

  @Prop({ trim: true })
  contentType?: string;

  @Prop()
  contentLength?: number;

  @Prop({ default: 0 })
  documentCount: number;

  @Prop()
  rangeFrom?: Date;

  @Prop()
  rangeTo?: Date;

  @Prop({ required: true })
  cutoffDate: Date;

  @Prop()
  retentionExpiresAt?: Date;

  @Prop({ trim: true })
  checksumSha256?: string;

  @Prop({ trim: true })
  errorMessage?: string;

  @Prop()
  deletedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ArchiveRecordSchema = SchemaFactory.createForClass(ArchiveRecord);
ArchiveRecordSchema.index({ source: 1, status: 1, createdAt: -1 });
ArchiveRecordSchema.index({ retentionExpiresAt: 1, status: 1 });
