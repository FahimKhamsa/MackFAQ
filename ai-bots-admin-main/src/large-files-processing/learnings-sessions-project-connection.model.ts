import {
	BelongsTo,
	Column,
	DataType,
	ForeignKey,
	Model,
	PrimaryKey, Table
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
		}
	]
})
export class LearningSessionProjectConnection extends Model<LearningSessionProjectConnection, Pick<LearningSessionProjectConnection, 'project_id' | 'learning_session_id'>> {
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
	project_id: number;

	@Column({
		type: DataType.INTEGER,
		allowNull: false,
	})
	learning_session_id: number;

	@BelongsTo(() => LearningSession, 'learning_session_id')
	learning_session: LearningSession;
}