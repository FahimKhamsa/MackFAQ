import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from './entities/user.model';
import { BotsService } from '../bots/bots.service';
import { OpenaiKnowledgeService } from '../openai-knowledge/openai-knowledge.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserModel) private userModel: typeof UserModel,
    private botsService: BotsService,
    private openaiKnowledgeService: OpenaiKnowledgeService,
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

    // Create default assistant for the user (stored in project_assistants with project_id = null)
    await this.openaiKnowledgeService.createOrGetAssistant(
      null, // project_id = null for default assistant
      "You are a helpful default assistant with access to the user's general knowledge base. Use the uploaded files to answer questions accurately. When referencing information from files, be specific about which document you are citing.",
      user.id.toString(),
    );

    return user;
  }

  async getUserWithAssistant(
    id: number,
  ): Promise<{ user: UserModel; default_assistant: any } | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    // Get the default assistant from project_assistants table
    const defaultAssistant =
      await this.openaiKnowledgeService.createOrGetAssistant(
        null, // project_id = null for default assistant
        undefined, // use default instructions
        user.id.toString(),
      );

    return {
      user,
      default_assistant: defaultAssistant,
    };
  }
}
