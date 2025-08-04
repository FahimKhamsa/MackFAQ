import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'ai_configurations',
  timestamps: true,
  paranoid: true,
})
export class AIConfiguration extends Model<AIConfiguration> {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    defaultValue:
      'You are a helpful AI assistant for project management and document analysis. Provide accurate, professional responses based on the uploaded documents and company SOPs.',
  })
  system_prompt: string;

  @Column({
    type: DataType.STRING(100),
    defaultValue: 'gpt-3.5-turbo',
  })
  selected_model: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  prompt_locked: boolean;

  @Column({
    type: DataType.STRING(50),
    defaultValue: 'openrouter',
  })
  api_provider: string;

  @Column({
    type: DataType.STRING(500),
    defaultValue: null,
  })
  openrouter_api_key: string;

  @Column({
    type: DataType.STRING(500),
    defaultValue: null,
  })
  openai_api_key: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  include_sop: boolean;

  @Column({
    type: DataType.JSON,
    defaultValue: null,
    get() {
      return JSON.parse(this.getDataValue('available_models') || '[]') || [];
    },
    set(val) {
      this.setDataValue('available_models', JSON.stringify(val || []));
    },
  })
  available_models: string[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  auto_fallback: boolean;
}
