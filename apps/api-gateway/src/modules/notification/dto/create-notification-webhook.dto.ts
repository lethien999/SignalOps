import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateNotificationWebhookDto {
  @ApiProperty({ example: 'Kênh Slack vận hành' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'slack', enum: ['slack', 'telegram'] })
  @IsIn(['slack', 'telegram'])
  channel: 'slack' | 'telegram';

  @ApiProperty({ example: 'https://hooks.slack.com/services/xxx/yyy/zzz' })
  @IsUrl({ require_tld: false })
  webhookUrl: string;

  @ApiProperty({
    isArray: true,
    example: ['high', 'critical'],
    enum: ['low', 'warning', 'medium', 'high', 'critical'],
  })
  @IsArray()
  @IsIn(['low', 'warning', 'medium', 'high', 'critical'], { each: true })
  severities: Array<'low' | 'warning' | 'medium' | 'high' | 'critical'>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  retryMax?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  retryBackoffMs?: number;

  @ApiPropertyOptional({ example: 'ops-admin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  updatedBy?: string;
}
