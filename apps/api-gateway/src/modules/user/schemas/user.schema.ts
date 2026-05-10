import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string; // bcrypt hashed password

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' })
  roleId: string; // Reference to Role._id

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: String })
  totpSecret?: string; // TOTP secret for 2FA

  @Prop({ type: [String], default: [] })
  backupCodes: string[]; // One-time backup codes for 2FA recovery

  @Prop({ type: Boolean, default: false })
  totpEnabled: boolean; // Is 2FA enabled

  @Prop({
    type: [
      {
        provider: { type: String, enum: ['google', 'github'] },
        providerId: { type: String },
        email: { type: String },
        linkedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  oauthProviders: Array<{
    provider: string;
    providerId: string;
    email: string;
    linkedAt: Date;
  }>; // OAuth provider accounts linked to this user

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes
UserSchema.index({ email: 1 });
UserSchema.index({ tenantId: 1 });
UserSchema.index({ tenantId: 1, roleId: 1 });
UserSchema.index({ 'oauthProviders.provider': 1, 'oauthProviders.providerId': 1 }, { unique: true, sparse: true });
