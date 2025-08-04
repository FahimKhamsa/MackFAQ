import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  HasMany,
} from 'sequelize-typescript';
import { MessageModel } from 'src/messages/entities/message.model';

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

  @Column({
    type: DataType.INTEGER,
    defaultValue: null,
  })
  project_id: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: null,
  })
  assistant_id: number;

  @Column({
    type: DataType.TEXT,
    defaultValue: null,
  })
  messages_slug: string;

  @Column({
    type: DataType.JSON,
    defaultValue: null,
  })
  messages: string[];

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  updated_at: Date;

  @HasMany(() => MessageModel, 'conversation_id')
  messageModels: MessageModel[];
}
