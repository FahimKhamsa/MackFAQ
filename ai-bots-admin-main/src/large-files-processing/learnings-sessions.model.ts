import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { LearningSessionProjectConnection } from './learnings-sessions-project-connection.model';

@Table({
  tableName: 'learging-sessions',
  timestamps: true,
  paranoid: true,
})
export class LearningSession extends Model<LearningSession> {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: null,
  })
  creator_id: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: null,
  })
  bot_id: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: null,
  })
  project_id: number;

  @Column({
    type: DataType.STRING(255),
    defaultValue: null,
  })
  file_name: string;

  @Column({
    type: DataType.STRING(255),
    defaultValue: null,
  })
  provider_id: 'private-api';

  @Column({
    type: DataType.TEXT('long'),
    defaultValue: null,

    get() {
      return (
        JSON.parse(this.getDataValue('docs_ids_from_provider') || '[]') || []
      );
    },
    set(val) {
      this.setDataValue('docs_ids_from_provider', JSON.stringify(val || []));
    },
  })
  docs_ids_from_provider: string[];

  @Column({
    type: DataType.STRING(100),
    defaultValue: 'document',
  })
  file_category: string; // 'manual', 'invoice', 'contract', 'email', 'transcript', 'screenshot'

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  page_count: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  file_size: number;

  @Column({
    type: DataType.STRING(100),
    defaultValue: null,
  })
  original_mime_type: string;

  @HasMany(() => LearningSessionProjectConnection, 'learning_session_id')
  connections: LearningSessionProjectConnection;
}
