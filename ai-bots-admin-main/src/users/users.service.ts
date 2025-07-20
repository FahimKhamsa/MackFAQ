import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from './entities/user.model';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(UserModel) private userModel: typeof UserModel
    ) {

    }
    async findByEmail(email: string): Promise<UserModel | null> {
        return await this.userModel.findOne({
            where: {
                email,
            }
        });
    }

    async registration(data: Pick<UserModel, 'email'> & { password: string }): Promise<UserModel | null> {
        if (await this.findByEmail(data.email)) {
            throw new BadRequestException("User already exists");
        }
        const user = new this.userModel;
        user.email = data.email;
        user.setPassword(data.password);
        await user.save();
        return user;
    }
}
