import {
  Column,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'local_projects',
  timestamps: true,
  paranoid: true,
})
export class LocalStorageModel extends Model<LocalStorageModel> {
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
    type: DataType.INTEGER,
    defaultValue: null,
  })
  creator_id: number;

  @Column({
    type: DataType.STRING(255),
    defaultValue: null,
  })
  name: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  use_deep_faq: boolean;

  @Column({
    type: DataType.STRING(3024),
    defaultValue: null,
  })
  prompt_prefix: string;

  @Column({
    type: DataType.STRING(255),
    defaultValue: null,
  })
  @Index
  public_link: string;
}
