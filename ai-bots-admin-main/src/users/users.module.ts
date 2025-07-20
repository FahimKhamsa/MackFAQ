import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { UserModel } from './entities/user.model';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [
    UsersService,
    {provide: getModelToken (UserModel), useValue: UserModel},
  ],
  exports: [
    UsersService,
  ],
  controllers: [UsersController]
})
export class UsersModule {}
