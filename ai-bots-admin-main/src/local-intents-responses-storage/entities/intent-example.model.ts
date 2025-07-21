import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { IntentModel } from './intent.model';

@Table({
  tableName: 'intent_examples',
  timestamps: true,
  paranoid: true,
})
export class IntentExampleModel extends Model<IntentExampleModel> {
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
  @ForeignKey(() => IntentModel)
  @BelongsTo(() => IntentModel, { as: 'intent', targetKey: 'id' })
  intent_id: number;

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
  text: string;

  @Column({
    type: DataType.TEXT,
    defaultValue: null,
  })
  text_without_punctuation_marks: string;
}
