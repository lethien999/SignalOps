import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({ timestamps: true })
export class PasswordResetToken {
  @Prop({ required: true, unique: false })
  email: string;

  @Prop({ required: true, unique: true })
  token: string; // hashed token

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: Date })
  usedAt?: Date;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(
  PasswordResetToken,
);

// TTL index: auto-delete expired tokens after 24 hours
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
