import * as dotenv from 'dotenv';
import type { Dialect } from 'sequelize';
dotenv.config();

export interface IDbConf {
    username: string,
    password: string,
    database: string,
    host: string,
    port: number,
    dialect: Dialect,
    logging?: boolean,
}

export const dbConf: IDbConf = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    dialect: process.env.DB_DIALECT as Dialect,
    logging: process.env.NODE_ENV === 'development',
}