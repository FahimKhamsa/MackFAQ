import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
    tableName: 'sop_documents',
    timestamps: true,
    paranoid: true,
})
export class SOPDocument extends Model<SOPDocument> {
    @PrimaryKey
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
    })
    id: number;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
    })
    title: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
    })
    category: string;

    @Column({
        type: DataType.STRING(500),
        allowNull: false,
    })
    file_path: string;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    page_count: number;

    @Column({
        type: DataType.JSON,
        defaultValue: null,
        get() {
            return JSON.parse(this.getDataValue('vector_ids') || '[]') || [];
        },
        set(val) {
            this.setDataValue('vector_ids', JSON.stringify(val || []));
        }
    })
    vector_ids: string[];

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    is_active: boolean;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    uploaded_by: number;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    file_size: number;

    @Column({
        type: DataType.STRING(100),
        defaultValue: null,
    })
    original_mime_type: string;
}
