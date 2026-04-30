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
