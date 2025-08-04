import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { LocalStorageModel } from '../../local-intents-responses-storage/entities/local-storage-project.model';

@Table({
  tableName: 'project_assistants',
  timestamps: true,
  paranoid: true,
})
export class ProjectAssistantModel extends Model<ProjectAssistantModel> {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => LocalStorageModel)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  project_id: number;

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

  @BelongsTo(() => LocalStorageModel)
  project: LocalStorageModel;
}
