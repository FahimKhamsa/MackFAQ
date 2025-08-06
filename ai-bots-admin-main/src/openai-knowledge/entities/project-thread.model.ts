import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ProjectAssistantModel } from './project-assistant.model';

@Table({
  tableName: 'project_threads',
  timestamps: true,
  paranoid: true,
})
export class ProjectThreadModel extends Model<ProjectThreadModel> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => ProjectAssistantModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  assistant_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  openai_thread_id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  session_id: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active: boolean;

  @BelongsTo(() => ProjectAssistantModel)
  assistant: ProjectAssistantModel;
}
