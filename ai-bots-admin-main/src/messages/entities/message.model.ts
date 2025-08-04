import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  BelongsTo,
  ForeignKey,
  HasMany,
  HasOne,
} from 'sequelize-typescript';
import type { MessageTypes } from 'src/api/api.service';
import { ConversationModel } from 'src/conversations/entities/conversation.model';

@Table({
  tableName: 'messages',
  timestamps: true,
  paranoid: true,
})
export class MessageModel extends Model<MessageModel> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: null,
  })
  assistant_id: number;

  @ForeignKey(() => ConversationModel)
  @Column({
    type: DataType.UUID,
    defaultValue: null,
  })
  conversation_id: string;

  @Column({
    type: DataType.UUID,
    defaultValue: null,
  })
  previous_message_id: string;

  @Column({
    type: DataType.UUID,
    defaultValue: null,
  })
  next_message_id: string;

  @Column({
    type: DataType.STRING(50),
    defaultValue: null,
  })
  type: MessageTypes;

  @Column({
    type: DataType.TEXT('medium'),
    defaultValue: null,
  })
  text: string;

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

  @BelongsTo(() => ConversationModel, 'conversation_id')
  conversation: ConversationModel;
}
