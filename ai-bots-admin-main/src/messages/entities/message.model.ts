import {
	Column,
	DataType,
	Model,
	PrimaryKey, Table, BelongsTo, ForeignKey, HasMany, HasOne
} from 'sequelize-typescript';
import type { MessageTypes } from 'src/api/api.service';

@Table({
	tableName: 'messages',
	timestamps: true,
	paranoid: true,
})
export class MessageModel extends Model<MessageModel> {
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
	bot_id: number;

	@Column({
		type: DataType.STRING(100),
		unique: true,
		defaultValue: null,
	})
	unique_id: string;

	@Column({
		type: DataType.STRING(200),
		defaultValue: null,
	})
	conversation_unique_id: string;

	@Column({
		type: DataType.INTEGER,
		defaultValue: null,
	})
	previous_message_id: number;

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
}