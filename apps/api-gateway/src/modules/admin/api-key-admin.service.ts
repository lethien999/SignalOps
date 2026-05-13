import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ObjectId } from 'mongodb';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { hashApiKey, verifyApiKey, generateRandomApiKey } from '../../common/api-key.utils';

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
      .find(
        {},
        {
          projection: {
            key: 1,
            name: 1,
            description: 1,
            scopes: 1,
            active: 1,
            createdAt: 1,
            updatedAt: 1,
            lastUsedAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    return keys.map((key) => this.toView(key));
  }

  async create(input: CreateApiKeyDto): Promise<ApiKeyView & { key: string }> {
    const now = new Date();
    const key = input.key?.trim() || generateRandomApiKey();
    const hashedKey = await hashApiKey(key);

    const document: ApiKeyDocument = {
      _id: new ObjectId(),
      key: hashedKey,
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
    const key = generateRandomApiKey();
    const hashedKey = await hashApiKey(key);
    const now = new Date();
    const existing = await this.collection().findOne({ _id: new ObjectId(id) });

    if (!existing) {
      throw new NotFoundException(`API key ${id} not found`);
    }

    await this.collection().updateOne(
      { _id: existing._id },
      {
        $set: {
          key: hashedKey,
          updatedAt: now,
          lastUsedAt: undefined,
        },
      }
    );

    return {
      ...this.toView({ ...existing, key: hashedKey, updatedAt: now, lastUsedAt: undefined }),
      key,
    };
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

    // Fetch all active keys (only hashes are stored in DB)
    const activeKeys = await this.collection()
      .find({ active: { $ne: false } })
      .project({ key: 1 })
      .toArray();

    // Compare provided key against each hashed key
    for (const storedDoc of activeKeys) {
      if (await verifyApiKey(providedKey, storedDoc.key)) {
        return true;
      }
    }

    return false;
  }

  async hasActiveKeys(): Promise<boolean> {
    const count = await this.collection().countDocuments({ active: { $ne: false } });
    return count > 0;
  }

  async markUsed(providedKey?: string): Promise<void> {
    if (!providedKey) {
      return;
    }

    // Find the key by comparing against all active keys
    const activeKeys = await this.collection()
      .find({ active: { $ne: false } })
      .project({ _id: 1, key: 1 })
      .toArray();

    for (const storedDoc of activeKeys) {
      if (await verifyApiKey(providedKey, storedDoc.key)) {
        await this.collection().updateOne(
          { _id: storedDoc._id },
          { $set: { lastUsedAt: new Date() } }
        );
        break;
      }
    }
  }

  async ensureSeedKey(key: string, name: string): Promise<void> {
    // Check if any key exists with this name (can't do plaintext comparison anymore)
    const existing = await this.collection().findOne({ name });
    if (existing) {
      return;
    }

    const hashedKey = await hashApiKey(key);

    await this.collection().insertOne({
      _id: new ObjectId(),
      key: hashedKey,
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

  private assertObjectId(value: string): void {
    if (!ObjectId.isValid(value)) {
      throw new NotFoundException(`API key ${value} not found`);
    }
  }
}
