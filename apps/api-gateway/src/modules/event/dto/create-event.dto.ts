import { IsString, IsObject } from 'class-validator';

export class CreateEventDto {
  @IsString()
  deviceId: string;

  @IsObject()
  location: {
    lat: number;
    lng: number;
    name?: string;
  };

  @IsObject()
  metrics: {
    latency: number;
    packetLoss: number;
    signalStrength: number;
  };
}
