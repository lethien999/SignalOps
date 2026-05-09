import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { TenantQuotaMiddleware } from './middleware/tenant-quota.middleware';
import { TenantAdminController } from './controllers/tenant-admin.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
    UserModule,
  ],
  providers: [TenantService],
  controllers: [TenantController, TenantAdminController],
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
