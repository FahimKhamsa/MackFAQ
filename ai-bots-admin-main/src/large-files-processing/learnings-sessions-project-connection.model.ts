import {
  BelongsTo,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { LearningSession } from './learnings-sessions.model';

@Table({
  tableName: 'learging-sessions-project-connection',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      name: 'unique',
      fields: ['project_id', 'learning_session_id'],
      unique: true,
    },
  ],
})
export class LearningSessionProjectConnection extends Model<
  LearningSessionProjectConnection,
  Pick<LearningSessionProjectConnection, 'project_id' | 'learning_session_id'>
> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    defaultValue: null,
  })
  project_id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  learning_session_id: string;

  @BelongsTo(() => LearningSession, 'learning_session_id')
  learning_session: LearningSession;
}
