'use strict';

const { Sequelize } = require("sequelize");
const dbConfig = require("../config/database");

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.user,
  dbConfig.password,
  {
    ...dbConfig,
    dialect: 'postgres',
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    define: {
      freezeTableName: true,
      schema: 'dbo'
    },
    dialectOptions: {
      ...dbConfig.dialectOptions,
      searchPath: 'dbo,public'
    }
  }
);

module.exports = sequelize;