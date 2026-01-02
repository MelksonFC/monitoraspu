'use strict';

const { Sequelize } = require("sequelize");
const dbConfig = require("../config/database");

const sequelizeOptions = {
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
    searchPath: 'dbo,public'
  }
};

// O Sequelize espera a configuração SSL dentro de 'dialectOptions'.
// Se a configuração 'ssl' existir no config principal (para o Render),
// nós a movemos para o lugar correto para o Sequelize.
if (sequelizeOptions.ssl) {
  sequelizeOptions.dialectOptions.ssl = sequelizeOptions.ssl;
}

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.user,
  dbConfig.password,
  sequelizeOptions
);

module.exports = sequelize;