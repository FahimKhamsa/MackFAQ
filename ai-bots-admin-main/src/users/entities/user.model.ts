import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import * as bcrypt from 'bcryptjs';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
})
export class UserModel extends Model<UserModel> {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    defaultValue: null,
    unique: true,
  })
  username: string;

  @Column({
    type: DataType.STRING,
    defaultValue: null,
    unique: true,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

  public async validatePassword(password: string): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  }

  public setPassword(password: string) {
    this.password = bcrypt.hashSync(password, 10);
  }
}
