import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ProjectModel } from 'src/projects/entities/projects.model';
import { UserModel } from 'src/users/entities/user.model';
import { BotModel } from 'src/bots/entities/bot.model';

@Table({
  tableName: 'project_assistants',
  timestamps: true,
  paranoid: true,
})
export class ProjectAssistantModel extends Model<ProjectAssistantModel> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => ProjectModel)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  project_id: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  user_id: string;

  @ForeignKey(() => BotModel)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  bot_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  openai_assistant_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  vector_store_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  instructions: string;

  @Column({
    type: DataType.STRING(100),
    defaultValue: 'gpt-4-1106-preview',
  })
  model: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active: boolean;

  @BelongsTo(() => ProjectModel, {
    foreignKey: 'project_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  project: ProjectModel;

  @BelongsTo(() => UserModel, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: UserModel;

  @BelongsTo(() => BotModel, {
    foreignKey: 'bot_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  bot: BotModel;
}
