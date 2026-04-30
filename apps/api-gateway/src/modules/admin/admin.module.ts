import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { ApiKeyAdminService } from './api-key-admin.service';

@Module({
  imports: [MongooseModule],
  controllers: [AdminController],
  providers: [ApiKeyAdminService],
  exports: [ApiKeyAdminService],
})
export class AdminModule {}
