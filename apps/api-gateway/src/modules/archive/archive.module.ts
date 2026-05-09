import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Alert, AlertSchema } from '../alert/schemas/alert.schema';
import { Event, EventSchema } from '../event/schemas/event.schema';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';
import { ArchiveRecordRepository } from './repositories/archive-record.repository';
import { ArchiveRecord, ArchiveRecordSchema } from './schemas/archive-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Alert.name, schema: AlertSchema },
      { name: ArchiveRecord.name, schema: ArchiveRecordSchema },
    ]),
  ],
  controllers: [ArchiveController],
  providers: [ArchiveService, ArchiveRecordRepository],
  exports: [ArchiveService, ArchiveRecordRepository],
})
export class ArchiveModule {}
