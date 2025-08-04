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
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => ProjectAssistantModel)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  assistant_id: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
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
    type: DataType.STRING(50),
    defaultValue: 'uploaded',
  })
  status: string; // uploaded, processing, completed, failed

  @BelongsTo(() => ProjectAssistantModel)
  assistant: ProjectAssistantModel;
}
