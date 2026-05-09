import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash an API key using bcrypt
 * Used when creating or rotating API keys
 */
export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plaintext API key with its bcrypt hash
 * Used during validation
 */
export async function verifyApiKey(plaintext: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}

/**
 * Generate a secure random API key (64 chars hex)
 */
export function generateRandomApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
