import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyAdminService } from './api-key-admin.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { AdminApiKeyGuard } from './admin-api-key.guard';

@ApiTags('admin')
@ApiSecurity('admin-api-key')
@UseGuards(AdminApiKeyGuard)
@Controller('api/admin/api-keys')
export class AdminController {
  constructor(private readonly apiKeyAdminService: ApiKeyAdminService) {}

  @ApiOperation({ summary: 'List stored API keys' })
  @ApiOkResponse({ description: 'Stored API keys without exposing full secret values' })
  @Get()
  async listApiKeys() {
    return this.apiKeyAdminService.list();
  }

  @ApiOperation({ summary: 'Create a new API key' })
  @ApiCreatedResponse({ description: 'Created API key and full secret value' })
  @Post()
  async createApiKey(@Body() input: CreateApiKeyDto) {
    return this.apiKeyAdminService.create(input);
  }

  @ApiOperation({ summary: 'Update API key metadata or active status' })
  @ApiOkResponse({ description: 'Updated API key' })
  @Patch(':id')
  async updateApiKey(@Param('id') id: string, @Body() input: UpdateApiKeyDto) {
    return this.apiKeyAdminService.update(id, input);
  }

  @ApiOperation({ summary: 'Rotate an API key secret' })
  @ApiOkResponse({ description: 'Rotated API key and full secret value' })
  @Post(':id/rotate')
  async rotateApiKey(@Param('id') id: string) {
    return this.apiKeyAdminService.rotate(id);
  }

  @ApiOperation({ summary: 'Delete an API key' })
  @ApiOkResponse({ description: 'Deletion result' })
  @Delete(':id')
  async deleteApiKey(@Param('id') id: string) {
    return this.apiKeyAdminService.remove(id);
  }
}
