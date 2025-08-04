import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { AIConfigService } from './ai-config.service';
import { AIConfigController } from './ai-config.controller';
import { AIConfiguration } from './entities/ai-configuration.model';

@Module({
  imports: [],
  controllers: [AIConfigController],
  providers: [
    AIConfigService,
    { provide: getModelToken(AIConfiguration), useValue: AIConfiguration },
  ],
  exports: [AIConfigService],
})
export class AIConfigModule {}
