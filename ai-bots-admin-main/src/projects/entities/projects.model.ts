import {
  BelongsTo,
  Column,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { ProjectAssistantModel } from 'src/openai-knowledge/entities/project-assistant.model';
import { UserModel } from 'src/users/entities/user.model';

@Table({
  tableName: 'projects',
  timestamps: true,
  paranoid: true,
})
export class ProjectModel extends Model<ProjectModel> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.UUID,
  })
  assistant_id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @Column({
    type: DataType.STRING(255),
    defaultValue: null,
  })
  name: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  use_deep_faq: boolean;

  @Column({
    type: DataType.STRING(3024),
    defaultValue: null,
  })
  prompt_prefix: string;

  @Column({
    type: DataType.STRING(255),
    defaultValue: null,
  })
  @Index
  public_link: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  files: number;
}
