import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDeviceMaintenanceDto {
  @ApiProperty({ example: true, description: 'Bật hoặc tắt chế độ bảo trì cho thiết bị' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ example: 'Nâng cấp firmware', description: 'Lý do bảo trì' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({ example: 'ops-admin', description: 'Người thao tác' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  updatedBy?: string;
}
