import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './api/api.module';
import { MessagesModule } from './messages/messages.module';
import { ProjectsModule } from './projects/projects.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OpenaiKnowledgeModule } from './openai-knowledge/openai-knowledge.module';
import { ConversationsModule } from './conversations/conversations.module';
import { IdentityModule } from './identity/identity.module';
import { BotsModule } from './bots/bots.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // load: [configuration,],
    }),
    ApiModule,
    ServeStaticModule.forRoot({
      rootPath: process.env.PUBLIC_FILES_STORAGE,
      serveRoot: '/storage',
    }),
    AuthModule,
    DatabaseModule,
    BotsModule,
    MessagesModule,
    ProjectsModule,
    ScheduleModule.forRoot(),
    OpenaiKnowledgeModule,
    ConversationsModule,
    IdentityModule,
  ],
})
export class AppModule {}
