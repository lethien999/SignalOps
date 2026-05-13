import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RunArchiveDto {
  @ApiPropertyOptional({ enum: ['events', 'alerts', 'both'], default: 'both' })
  @IsOptional()
  @IsIn(['events', 'alerts', 'both'])
  source?: 'events' | 'alerts' | 'both';

  @ApiPropertyOptional({ description: 'Archive dữ liệu cũ hơn N ngày', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  olderThanDays?: number;

  @ApiPropertyOptional({
    description: 'Số bản ghi tối đa mỗi lần archive cho mỗi collection',
    default: 5000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50000)
  maxDocumentsPerSource?: number;
}
