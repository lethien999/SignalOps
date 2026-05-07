import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertThresholdProfileDto {
  @ApiProperty({ example: 'global', enum: ['global', 'device'] })
  @IsIn(['global', 'device'])
  scopeType: 'global' | 'device';

  @ApiProperty({ example: 'global', description: 'Mã phạm vi; dùng global hoặc deviceId' })
  @IsString()
  scopeId: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsInt()
  @Min(0)
  latencyWarningMs?: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsInt()
  @Min(0)
  latencyCriticalMs?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  packetLossWarningPercent?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  packetLossCriticalPercent?: number;

  @ApiPropertyOptional({ example: -80 })
  @IsOptional()
  @IsInt()
  @Max(0)
  signalWarningDbm?: number;

  @ApiPropertyOptional({ example: -100 })
  @IsOptional()
  @IsInt()
  @Max(0)
  signalCriticalDbm?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'Điều chỉnh theo site mới' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'ops-admin' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}
