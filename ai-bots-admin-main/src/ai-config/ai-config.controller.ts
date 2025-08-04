import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AIConfigService } from './ai-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai-config')
@UseGuards(JwtAuthGuard)
export class AIConfigController {
  constructor(private readonly aiConfigService: AIConfigService) {}

  @Get()
  async getUserConfig(@Request() req) {
    return this.aiConfigService.getUserConfiguration(req.user.id);
  }

  @Put('prompt')
  async updatePrompt(@Request() req, @Body() body: { system_prompt: string }) {
    return this.aiConfigService.updateSystemPrompt(
      req.user.id,
      body.system_prompt,
    );
  }

  @Post('prompt/toggle-lock')
  async togglePromptLock(@Request() req) {
    return this.aiConfigService.togglePromptLock(req.user.id);
  }

  @Put('model')
  async updateModel(@Request() req, @Body() body: { model: string }) {
    return this.aiConfigService.updateSelectedModel(req.user.id, body.model);
  }

  @Put('provider')
  async updateProvider(
    @Request() req,
    @Body() body: { provider: 'openai' | 'openrouter' },
  ) {
    return this.aiConfigService.updateAPIProvider(req.user.id, body.provider);
  }

  @Put('api-keys')
  async updateAPIKeys(
    @Request() req,
    @Body() body: { openai_api_key?: string; openrouter_api_key?: string },
  ) {
    return this.aiConfigService.updateAPIKeys(req.user.id, body);
  }

  @Post('sop/toggle')
  async toggleSOPInclude(@Request() req) {
    return this.aiConfigService.toggleSOPInclude(req.user.id);
  }

  @Put('sop')
  async updateSOPInclude(
    @Request() req,
    @Body() body: { include_sop: boolean },
  ) {
    return this.aiConfigService.updateSOPInclude(req.user.id, body.include_sop);
  }

  @Post('auto-fallback/toggle')
  async toggleAutoFallback(@Request() req) {
    return this.aiConfigService.toggleAutoFallback(req.user.id);
  }

  @Get('models/available')
  async getAvailableModels() {
    return this.aiConfigService.getAvailableModels();
  }

  @Put('models/available')
  async updateAvailableModels(
    @Request() req,
    @Body() body: { models: string[] },
  ) {
    return this.aiConfigService.updateAvailableModels(req.user.id, body.models);
  }

  @Post('reset')
  async resetToDefaults(@Request() req) {
    return this.aiConfigService.resetToDefaults(req.user.id);
  }

  @Delete()
  async deleteConfig(@Request() req) {
    return this.aiConfigService.deleteUserConfiguration(req.user.id);
  }
}
