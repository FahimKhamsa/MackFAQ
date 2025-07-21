import { Global, Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { BotModel } from './entities/bot.model';

@Module({
  controllers: [BotsController],
  providers: [
    BotsService,
    { provide: getModelToken(BotModel), useValue: BotModel },
  ],
  exports: [BotsService],
})
@Global()
export class BotsModule {}
