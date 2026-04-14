import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  name?: string;
}

class MetricsDto {
  @IsNumber()
  @Min(0)
  latency: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  packetLoss: number;

  @IsNumber()
  @Min(-120)
  @Max(0)
  signalStrength: number;
}

export class CreateEventDto {
  @IsString()
  deviceId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsObject()
  @ValidateNested()
  @Type(() => MetricsDto)
  metrics: MetricsDto;
}
