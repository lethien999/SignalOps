import { IsString, IsNumber, IsObject, Min, Max } from 'class-validator';

export class CreateEventDto {
  @IsString()
  deviceId: string;

  @IsObject()
  location: {
    lat: number;
    lng: number;
    name?: string;
  };

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
