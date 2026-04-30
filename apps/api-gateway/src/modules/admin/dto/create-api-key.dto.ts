import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, ArrayUnique } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'production-ingestion-key' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Key for production telemetry ingestion' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    example: ['events:write'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ example: 'optional-custom-key' })
  @IsOptional()
  @IsString()
  key?: string;
}
