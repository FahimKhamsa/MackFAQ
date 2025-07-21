import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'responses',
  timestamps: true,
  paranoid: true,
})
export class ResponseModel extends Model<ResponseModel> {
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
  intent_id: number;

  @Column({
    type: DataType.TEXT,
    defaultValue: null,
  })
  text: string;
}
