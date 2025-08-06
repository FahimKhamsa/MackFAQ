import { Global, Module } from '@nestjs/common';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BotsController],
  providers: [BotsService],
  exports: [BotsService],
})
@Global()
export class BotsModule {}
