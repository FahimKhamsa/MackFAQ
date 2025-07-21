import {
  Column,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { IntentExampleModel } from './intent-example.model';

@Table({
  tableName: 'intents',
  timestamps: true,
  paranoid: true,
})
export class IntentModel extends Model<IntentModel> {
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
    type: DataType.TEXT,
    defaultValue: null,
  })
  text_original: string;
}
