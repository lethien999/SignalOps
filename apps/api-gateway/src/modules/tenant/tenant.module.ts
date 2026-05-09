import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { TenantQuotaMiddleware } from './middleware/tenant-quota.middleware';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }])],
  providers: [TenantService],
  controllers: [TenantController],
  exports: [TenantService],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantQuotaMiddleware).forRoutes(
      {
        path: '/api/events',
        method: RequestMethod.POST,
      },
      {
        path: 'api/alerts',
        method: RequestMethod.POST,
      }
    );
  }
}
