import { Injectable, Inject } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { UserModel } from '../../users/entities/user.model';

@Injectable()
export class UserRepository {
  private userModel: typeof UserModel;

  constructor(
    @Inject('SEQUELIZE')
    private sequelize: Sequelize,
  ) {
    this.userModel = this.sequelize.models.UserModel as typeof UserModel;
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<UserModel> {
    return await this.userModel.findByPk(userId);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserModel> {
    return await this.userModel.findOne({
      where: { email },
    });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<UserModel> {
    return await this.userModel.findOne({
      where: { username },
    });
  }

  /**
   * Create a new user
   */
  async create(userData: {
    username?: string;
    email?: string;
    password: string;
  }): Promise<UserModel> {
    return await this.userModel.create(userData);
  }

  /**
   * Update user
   */
  async update(
    userId: string,
    updateData: Partial<UserModel>,
  ): Promise<UserModel> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      return null;
    }
    return await user.update(updateData);
  }

  /**
   * Delete user
   */
  async delete(userId: string): Promise<boolean> {
    const result = await this.userModel.destroy({
      where: { id: userId },
    });
    return result > 0;
  }

  /**
   * Find all users with pagination
   */
  async findWithPagination(
    limit = 10,
    offset = 0,
  ): Promise<{ users: UserModel[]; total: number }> {
    const { rows: users, count: total } = await this.userModel.findAndCountAll({
      limit,
      offset,
      order: [['updatedAt', 'DESC']],
    });

    return { users, total };
  }

  /**
   * Check if user exists by email or username
   */
  async exists(email?: string, username?: string): Promise<boolean> {
    const whereClause: any = {};
    if (email) whereClause.email = email;
    if (username) whereClause.username = username;

    const user = await this.userModel.findOne({ where: whereClause });
    return !!user;
  }
}
