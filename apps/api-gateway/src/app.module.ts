import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventModule } from './modules/event/event.module';
import { AlertModule } from './modules/alert/alert.module';
import { HealthModule } from './modules/health/health.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ThresholdsModule } from './modules/thresholds/thresholds.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { RequestTimeoutMiddleware } from './common/middleware/request-timeout.middleware';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/signalops-db', {
      // Connection timeout: 10 seconds
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT_MS || '10000', 10),
      // Socket timeout: 30 seconds
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '30000', 10),
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    }),
    EventModule,
    AlertModule,
    NotificationModule,
    ThresholdsModule,
    ArchiveModule,
    AdminModule,
    HealthModule,
    WebSocketModule,
    TenantModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestTimeoutMiddleware, CorrelationIdMiddleware)
      .forRoutes('*');
  }
}
