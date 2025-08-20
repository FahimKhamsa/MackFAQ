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
  tableName: 'project_files',
  timestamps: true,
  paranoid: true,
})
export class ProjectFileModel extends Model<ProjectFileModel> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => ProjectAssistantModel)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  assistant_id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  openai_file_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  filename: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  file_type: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  file_size: number;

  @Column({
    type: DataType.ENUM('uploaded', 'processing', 'completed', 'failed'),
    defaultValue: 'uploaded',
  })
  status: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  shared: boolean;

  @BelongsTo(() => ProjectAssistantModel)
  assistant: ProjectAssistantModel;
}
