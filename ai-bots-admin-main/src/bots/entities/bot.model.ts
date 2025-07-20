import {
	Column,
	DataType,
	Model,
	PrimaryKey, Table
} from 'sequelize-typescript';

@Table({
	tableName: 'bots',
	timestamps: true,
	paranoid: true,
})
export class BotModel extends Model<BotModel> {
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
		type: DataType.STRING(355),
		defaultValue: null,
	})
	test_url: string;

	@Column({
		type: DataType.STRING(355),
		defaultValue: null,
	})
	production_url: string;

	@Column({
		type: DataType.STRING(355),
		defaultValue: null,
	})
	page_title: string;

	@Column({
		type: DataType.STRING(355),
		defaultValue: null,
	})
	page_meta_description: string;

	@Column({
		type: DataType.STRING(355),
		defaultValue: null,
	})
	greeting_message_text: string;

	@Column({
		type: DataType.STRING(3024),
		defaultValue: null,
	})
	prompt_prefix: string;

	@Column({
		type: DataType.STRING(3024),
		defaultValue: null,
	})
	prompt_answer_pre_prefix: string;

	@Column({
		type: DataType.STRING(355),
		defaultValue: null,
	})
	prompt_placeholder: string;

	@Column({
		type: DataType.STRING(355),
		defaultValue: null,
	})
	favicon_path: string;

	@Column({
		type: DataType.STRING(355),
		defaultValue: null,
	})
	background_image_path: string;

	@Column({
		type: DataType.STRING(355),
		defaultValue: null,
	})
	bot_name_label: string;

	@Column({
		type: DataType.STRING(355),
		defaultValue: null,
	})
	user_name_label: string;

	@Column({
		type: DataType.STRING(1024),
		defaultValue: null,
	})
	exists_responses_provider_url: string;


	@Column({
		type: DataType.STRING(1024),
		defaultValue: null,
	})
	model_name: string;

	public get config_for_front() {
		const { background_image_path, favicon_path, prompt_placeholder, page_meta_description, page_title, updatedAt, production_url, greeting_message_text } = this.dataValues;
		return {
			background_image_path, favicon_path, prompt_placeholder, page_meta_description, page_title, updatedAt, production_url, greeting_message_text
		}
	}

}