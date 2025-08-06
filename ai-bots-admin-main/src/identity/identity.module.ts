import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { ProjectRepository } from './repositories/project.repository';
import { AssistantRepository } from './repositories/assistant.repository';
import { UserRepository } from './repositories/user.repository';
import { CacheService } from './cache/cache.service';
import { IdResolutionInterceptor } from './decorators/inject-ids.decorator';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    IdentityService,
    ProjectRepository,
    AssistantRepository,
    UserRepository,
    CacheService,
    IdResolutionInterceptor,
  ],
  exports: [
    IdentityService,
    ProjectRepository,
    AssistantRepository,
    UserRepository,
    CacheService,
    IdResolutionInterceptor,
  ],
})
export class IdentityModule {}
