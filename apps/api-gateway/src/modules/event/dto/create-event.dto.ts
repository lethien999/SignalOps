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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ example: 10.762622 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 106.660172 })
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ example: 'District 1' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class MetricsDto {
  @ApiProperty({ example: 210 })
  @IsNumber()
  @Min(0)
  latency: number;

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(0)
  @Max(100)
  packetLoss: number;

  @ApiProperty({ example: -95 })
  @IsNumber()
  @Min(-120)
  @Max(0)
  signalStrength: number;
}

export class CreateEventDto {
  @ApiProperty({ example: 'device-001' })
  @IsString()
  deviceId: string;

  @ApiProperty({ type: LocationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ type: MetricsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => MetricsDto)
  metrics: MetricsDto;
}
