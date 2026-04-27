import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Alert, AlertSchema } from './schemas/alert.schema';
import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';
import { AlertRepository } from './repositories/alert.repository';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]),
    WebSocketModule,
  ],
  controllers: [AlertController],
  providers: [AlertService, AlertRepository],
  exports: [AlertService, AlertRepository],
})
export class AlertModule {}
