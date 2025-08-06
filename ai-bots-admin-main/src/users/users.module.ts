import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { UserModel } from './entities/user.model';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { BotsModule } from '../bots/bots.module';

@Module({
  imports: [BotsModule],
  providers: [
    UsersService,
    { provide: getModelToken(UserModel), useValue: UserModel },
  ],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
