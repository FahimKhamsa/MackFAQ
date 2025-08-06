import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from './entities/user.model';
import { BotsService } from '../bots/bots.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserModel) private userModel: typeof UserModel,
    private botsService: BotsService,
  ) {}
  async findByEmail(email: string): Promise<UserModel | null> {
    return await this.userModel.findOne({
      where: {
        email,
      },
    });
  }

  async findById(id: number): Promise<UserModel | null> {
    return await this.userModel.findByPk(id);
  }

  async registration(
    data: Pick<UserModel, 'email'> & { password: string },
  ): Promise<UserModel | null> {
    if (await this.findByEmail(data.email)) {
      throw new BadRequestException('User already exists');
    }
    const user = new this.userModel();
    user.email = data.email;
    user.setPassword(data.password);
    await user.save();

    // Create default bot for the user
    await this.botsService.getDefaultBotForUser({ user_id: user.id });

    return user;
  }

  async findByIdWithBot(
    id: number,
  ): Promise<{ user: UserModel; default_bot: any } | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    const defaultBot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });

    return {
      user,
      default_bot: defaultBot?.dataValues || defaultBot,
    };
  }
}
