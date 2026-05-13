import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantService, TenantView } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { AdminApiKeyGuard } from '../admin/admin-api-key.guard';
import { Logger } from '../../common/logger';

@ApiTags('admin/tenants')
@ApiSecurity('admin-api-key')
@UseGuards(AdminApiKeyGuard)
@Controller('api/admin/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @ApiOperation({ summary: 'List all tenants with optional status filter' })
  @ApiOkResponse({ description: 'List of tenants', isArray: true })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended', 'deleted'] })
  @Get()
  async list(@Query('status') status?: string): Promise<TenantView[]> {
    return this.tenantService.list(status);
  }

  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiOkResponse({ description: 'Tenant details' })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @Get(':id')
  async getById(@Param('id') id: string): Promise<TenantView> {
    return this.tenantService.getById(id);
  }

  @ApiOperation({ summary: 'Create new tenant' })
  @ApiCreatedResponse({ description: 'Tenant created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid tenant data' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTenantDto): Promise<TenantView> {
    Logger.info(`Creating tenant: ${dto.name}`);
    return this.tenantService.create(dto);
  }

  @ApiOperation({ summary: 'Update tenant' })
  @ApiOkResponse({ description: 'Tenant updated successfully' })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto): Promise<TenantView> {
    Logger.info(`Updating tenant: ${id}`);
    return this.tenantService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete tenant (soft delete)' })
  @ApiOkResponse({ description: 'Tenant deleted' })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    Logger.info(`Deleting tenant: ${id}`);
    await this.tenantService.delete(id);
  }
}
