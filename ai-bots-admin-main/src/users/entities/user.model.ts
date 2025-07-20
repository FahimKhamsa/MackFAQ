import {
	Column,
	DataType,
	Model,
	PrimaryKey, Table
} from 'sequelize-typescript';

import * as bcrypt from 'bcryptjs';
import { ILoginPayload } from 'src/auth/dto/login-payload.dto';

@Table({
	tableName: 'users',
	timestamps: true,
	paranoid: true,
})
export class UserModel extends Model<UserModel> {
	@PrimaryKey
	@Column({
		type: DataType.INTEGER,
		autoIncrement: true,
	})
	id: number;

	@Column({
		type: DataType.STRING,
		defaultValue: null,
		unique: true,
	})
	username: string;

	@Column({
		type: DataType.STRING,
		defaultValue: null,
		unique: true,
	})
	email: string;

	@Column({
		type: DataType.STRING,
		defaultValue: null,
	})
	private password: string;

	private is_login_confirmed = false;
	private twofa_token: string;

	public get payload(): ILoginPayload {
		return {
			email: this.email,
			sub: this.id,
			is_confirmed: this.is_login_confirmed,
			twofa_token: this.twofa_token,
		};
	}

	public loginConfirmed() {
		this.is_login_confirmed = true;
	}

	public set2FaToken(token: string) {
		this.twofa_token = token;
	}

	public validatePassword(password: string) {
		return bcrypt.compareSync(password, this.password);
	}

	public setPassword(password: string) {
		this.password = bcrypt.hashSync(password);
	}
}