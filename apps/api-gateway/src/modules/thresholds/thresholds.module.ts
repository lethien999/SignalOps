import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThresholdsController } from './thresholds.controller';
import { ThresholdsService } from './thresholds.service';
import { ThresholdProfile, ThresholdProfileSchema } from './schemas/threshold-profile.schema';
import { ThresholdProfileRepository } from './repositories/threshold-profile.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ThresholdProfile.name, schema: ThresholdProfileSchema }]),
  ],
  controllers: [ThresholdsController],
  providers: [ThresholdsService, ThresholdProfileRepository],
  exports: [ThresholdsService, ThresholdProfileRepository],
})
export class ThresholdsModule {}
