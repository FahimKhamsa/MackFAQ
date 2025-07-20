import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { BotsModule } from './bots/bots.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './api/api.module';
import { MessagesModule } from './messages/messages.module';
import { RasaapiModule } from './rasaapi/rasaapi.module';
import { LocalIntentsResponsesStorageModule } from './local-intents-responses-storage/local-intents-responses-storage.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SOPModule } from './sop/sop.module';
import { AIConfigModule } from './ai-config/ai-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // load: [configuration,],
    }),
    ApiModule,
    ServeStaticModule.forRoot({ rootPath: process.env.PUBLIC_FILES_STORAGE, serveRoot: '/storage' }, ),
    AuthModule,
    DatabaseModule,
    BotsModule, MessagesModule, RasaapiModule, LocalIntentsResponsesStorageModule,
    ScheduleModule.forRoot(),
    SOPModule,
    AIConfigModule,
  ],
})
export class AppModule { }
