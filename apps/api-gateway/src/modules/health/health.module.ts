import { Module } from '@nestjs/common';
import { HealthController, StatsController } from './health.controller';
import { HealthService } from './health.service';
import { EventModule } from '../event/event.module';
import { AlertModule } from '../alert/alert.module';

@Module({
  imports: [EventModule, AlertModule],
  controllers: [HealthController, StatsController],
  providers: [HealthService],
})
export class HealthModule {}
