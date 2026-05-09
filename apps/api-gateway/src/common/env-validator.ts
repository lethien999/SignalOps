import { Logger } from './logger';

/**
 * Kiểm tra các biến môi trường bắt buộc khi khởi động.
 * Nếu thiếu biến quan trọng, ghi log cảnh báo.
 * Nếu thiếu biến bắt buộc, throw error để dừng khởi động.
 */

interface EnvCheck {
  key: string;
  required: boolean;
  default?: string;
  description: string;
}

const ENV_CHECKS: EnvCheck[] = [
  { key: 'MONGODB_URI', required: true, default: 'mongodb://localhost:27017/signalops-db', description: 'MongoDB connection string' },
  { key: 'API_GATEWAY_PORT', required: false, default: '3000', description: 'Cổng API Gateway' },
  { key: 'REDIS_ENABLED', required: false, default: 'false', description: 'Bật/tắt Redis' },
  { key: 'REDIS_HOST', required: false, default: 'localhost', description: 'Redis host' },
  { key: 'REDIS_PORT', required: false, default: '6379', description: 'Redis port' },
  { key: 'CORS_ORIGIN', required: false, default: 'http://localhost:3001', description: 'CORS origins (phân cách bằng dấu phẩy)' },
  { key: 'WEBSOCKET_AUTH_TOKEN', required: false, description: 'Token xác thực WebSocket' },
  { key: 'RATE_LIMIT_MAX', required: false, default: '100', description: 'Giới hạn request/phút' },
  { key: 'ARCHIVE_S3_ENABLED', required: false, default: 'false', description: 'Bật/tắt archive pipeline S3-compatible' },
  { key: 'ARCHIVE_S3_BUCKET', required: false, description: 'Bucket lưu file archive' },
  { key: 'ARCHIVE_S3_ENDPOINT', required: false, description: 'Endpoint S3-compatible (MinIO/R2/S3)' },
  { key: 'ARCHIVE_S3_REGION', required: false, default: 'auto', description: 'Region cho S3-compatible client' },
  { key: 'ARCHIVE_S3_ACCESS_KEY_ID', required: false, description: 'Access key của object storage' },
  { key: 'ARCHIVE_S3_SECRET_ACCESS_KEY', required: false, description: 'Secret key của object storage' },
  { key: 'ARCHIVE_S3_PREFIX', required: false, default: 'signalops/archive', description: 'Prefix object key khi archive' },
  { key: 'ARCHIVE_RETENTION_DAYS', required: false, default: '180', description: 'Số ngày giữ archive trước khi xóa object' },
  { key: 'ARCHIVE_DELETE_SOURCE', required: false, default: 'false', description: 'Xóa dữ liệu nguồn sau khi archive thành công' },
  { key: 'TENANT_QUOTA_EVENTS_DEFAULT', required: false, default: '1000000', description: 'Default events/month quota per tenant' },
  { key: 'TENANT_QUOTA_ALERTS_DEFAULT', required: false, default: '100000', description: 'Default alerts/month quota per tenant' },
  { key: 'TENANT_QUOTA_OVERRIDE_KEYS', required: false, description: 'JSON map of apiKey->{ eventsPerMonth, alertsPerMonth }' },
];

export function validateEnvironment(): void {
  Logger.info('Kiểm tra biến môi trường...');

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const check of ENV_CHECKS) {
    const value = process.env[check.key];

    if (!value && check.required && !check.default) {
      missing.push(`  ❌ ${check.key} — ${check.description} (BẮT BUỘC)`);
    } else if (!value && check.default) {
      process.env[check.key] = check.default;
      warnings.push(`  ⚠️ ${check.key} không được đặt, dùng mặc định: "${check.default}"`);
    } else if (!value && !check.required) {
      warnings.push(`  ℹ️ ${check.key} không được đặt — ${check.description}`);
    }
  }

  if (warnings.length > 0) {
    Logger.warn('Cảnh báo cấu hình:', { details: warnings });
  }

  if (missing.length > 0) {
    Logger.error('Thiếu biến môi trường bắt buộc:', { details: missing });
    throw new Error(`Thiếu biến môi trường bắt buộc:\n${missing.join('\n')}`);
  }

  Logger.info('Kiểm tra biến môi trường hoàn tất ✅');
}
