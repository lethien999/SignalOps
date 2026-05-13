import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAlertDto {
  @ApiPropertyOptional({ enum: ['open', 'acknowledged', 'resolved'] })
  @IsOptional()
  @IsIn(['open', 'acknowledged', 'resolved'])
  status?: 'open' | 'acknowledged' | 'resolved';

  @ApiPropertyOptional({ example: 'operator-a' })
  @IsOptional()
  @IsString()
  acknowledgedBy?: string;

  @ApiPropertyOptional({ example: '2026-04-25T02:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  acknowledgedAt?: string;

  @ApiPropertyOptional({ example: '2026-04-25T02:10:00.000Z' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @ApiPropertyOptional({ example: 'Đã khởi động lại router, latency trở về bình thường' })
  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
