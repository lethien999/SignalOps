import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

export type ApiKeyDocument = {
  _id: ObjectId;
  key: string;
  name: string;
  description?: string;
  scopes?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
  lastUsedAt?: Date;
};

export type ApiKeyView = {
  id: string;
  name: string;
  description?: string;
  scopes?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
  lastUsedAt?: Date;
  keyPreview: string;
};

@Injectable()
export class ApiKeyAdminService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private collection() {
    if (!this.connection.db) {
      throw new Error('MongoDB connection is not ready');
    }

    return this.connection.db.collection<ApiKeyDocument>('api_keys');
  }

  async list(): Promise<ApiKeyView[]> {
    const keys = await this.collection()
      .find({}, { projection: { key: 1, name: 1, description: 1, scopes: 1, active: 1, createdAt: 1, updatedAt: 1, lastUsedAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    return keys.map((key) => this.toView(key));
  }

  async create(input: CreateApiKeyDto): Promise<ApiKeyView & { key: string }> {
    const now = new Date();
    const key = input.key?.trim() || this.generateKey();

    const document: ApiKeyDocument = {
      _id: new ObjectId(),
      key,
      name: input.name.trim(),
      description: input.description?.trim(),
      scopes: input.scopes || ['events:write'],
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection().insertOne(document);
    return { ...this.toView(document), key };
  }

  async update(id: string, input: UpdateApiKeyDto): Promise<ApiKeyView> {
    this.assertObjectId(id);
    const now = new Date();
    const existing = await this.collection().findOne({ _id: new ObjectId(id) });

    if (!existing) {
      throw new NotFoundException(`API key ${id} not found`);
    }

    const patch = {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.scopes !== undefined ? { scopes: input.scopes } : {}),
      updatedAt: now,
    };

    await this.collection().updateOne({ _id: existing._id }, { $set: patch });

    return this.toView({ ...existing, ...patch });
  }

  async rotate(id: string): Promise<ApiKeyView & { key: string }> {
    this.assertObjectId(id);
    const key = this.generateKey();
    const now = new Date();
    const existing = await this.collection().findOne({ _id: new ObjectId(id) });

    if (!existing) {
      throw new NotFoundException(`API key ${id} not found`);
    }

    await this.collection().updateOne(
      { _id: existing._id },
      {
        $set: {
          key,
          updatedAt: now,
          lastUsedAt: undefined,
        },
      },
    );

    return { ...this.toView({ ...existing, key, updatedAt: now, lastUsedAt: undefined }), key };
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    this.assertObjectId(id);
    const result = await this.collection().deleteOne({ _id: new ObjectId(id) });
    return { deleted: result.deletedCount > 0 };
  }

  async validateApiKey(providedKey?: string): Promise<boolean> {
    if (!providedKey) {
      return false;
    }

    const storedKey = await this.collection().findOne({ key: providedKey, active: { $ne: false } });
    return Boolean(storedKey);
  }

  async hasActiveKeys(): Promise<boolean> {
    const count = await this.collection().countDocuments({ active: { $ne: false } });
    return count > 0;
  }

  async markUsed(providedKey?: string): Promise<void> {
    if (!providedKey) {
      return;
    }

    await this.collection().updateOne(
      { key: providedKey, active: { $ne: false } },
      { $set: { lastUsedAt: new Date() } },
    );
  }

  async ensureSeedKey(key: string, name: string): Promise<void> {
    const existing = await this.collection().findOne({ key });
    if (existing) {
      return;
    }

    await this.collection().insertOne({
      _id: new ObjectId(),
      key,
      name,
      description: 'Seeded local access key',
      scopes: ['events:write'],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private toView(document: ApiKeyDocument): ApiKeyView {
    return {
      id: document._id.toString(),
      name: document.name,
      description: document.description,
      scopes: document.scopes,
      active: document.active,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      lastUsedAt: document.lastUsedAt,
      keyPreview: this.previewKey(document.key),
    };
  }

  private previewKey(key: string): string {
    if (key.length <= 8) {
      return key;
    }

    return `${key.slice(0, 4)}…${key.slice(-4)}`;
  }

  private generateKey(): string {
    return randomBytes(24).toString('base64url');
  }

  private assertObjectId(value: string): void {
    if (!ObjectId.isValid(value)) {
      throw new NotFoundException(`API key ${value} not found`);
    }
  }
}
