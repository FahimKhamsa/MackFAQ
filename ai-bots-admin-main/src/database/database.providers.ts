import { Sequelize } from 'sequelize-typescript';
import { dbConf } from './database.config';
import { DatabaseModels } from './database.models';

export const databaseProviders = [
  {
    provide: 'SEQUELIZE',
    useFactory: async () => {
      const sequelize = new Sequelize(dbConf);
      sequelize.addModels(DatabaseModels);
      await sequelize.sync({ alter: true });
      return sequelize;
    },
  },
];
