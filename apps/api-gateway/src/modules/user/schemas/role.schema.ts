import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ collection: 'roles', timestamps: true })
export class Role {
  @Prop({ type: String, enum: ['admin', 'editor', 'viewer'], required: true, _id: true })
  _id: string; // 'admin', 'editor', 'viewer'

  @Prop({ type: String, required: true })
  name: string; // 'Administrator', 'Editor', 'Viewer'

  @Prop({
    type: [String],
    required: true,
    default: [],
  })
  permissions: string[]; // ['read:events', 'write:events', 'manage:users', ...]

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Seed data for default roles
export const DEFAULT_ROLES: Partial<Role>[] = [
  {
    _id: 'admin',
    name: 'Administrator',
    permissions: [
      'read:events',
      'write:events',
      'read:alerts',
      'write:alerts',
      'read:config',
      'write:config',
      'write:webhooks',
      'manage:users',
      'manage:roles',
      'view:metrics',
      'view:billing',
    ],
  },
  {
    _id: 'editor',
    name: 'Editor',
    permissions: [
      'read:events',
      'write:events',
      'read:alerts',
      'write:alerts',
      'read:config',
      'write:config',
      'write:webhooks',
      'view:metrics',
    ],
  },
  {
    _id: 'viewer',
    name: 'Viewer',
    permissions: ['read:events', 'read:alerts', 'read:config', 'view:metrics'],
  },
];
