import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  BelongsTo,
  ForeignKey,
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
    type: DataType.UUID,
    allowNull: false,
  })
  assistant_id: string;

  @ForeignKey(() => ConversationModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
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

  @BelongsTo(() => ConversationModel, 'conversation_id')
  conversation: ConversationModel;
}
