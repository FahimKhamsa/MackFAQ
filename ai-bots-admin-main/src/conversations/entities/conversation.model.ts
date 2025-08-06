import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  HasMany,
  ForeignKey,
} from 'sequelize-typescript';
import { MessageModel } from 'src/messages/entities/message.model';
import { ProjectModel } from 'src/projects/entities/projects.model';

@Table({
  tableName: 'conversations',
  timestamps: true,
  paranoid: true,
})
export class ConversationModel extends Model<ConversationModel> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.STRING(500),
    defaultValue: null,
  })
  name: string;

  @ForeignKey(() => ProjectModel)
  @Column({
    type: DataType.UUID,
    defaultValue: null,
  })
  project_id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  assistant_id: string;

  @Column({
    type: DataType.TEXT,
    defaultValue: null,
  })
  messages_slug: string;

  @Column({
    type: DataType.JSON,
    defaultValue: [],
  })
  messages: string[];

  @HasMany(() => MessageModel, 'conversation_id')
  messageModels: MessageModel[];
}
