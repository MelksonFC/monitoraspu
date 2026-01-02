'use strict';

const { Sequelize } = require("sequelize");
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const sequelizeOptions = {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  port: process.env.DB_PORT,
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

// Adiciona configuração SSL para o Sequelize apenas em ambiente de produção/nuvem
if (process.env.NODE_ENV === 'production') {
  sequelizeOptions.dialectOptions.ssl = {
    rejectUnauthorized: false
  };
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  sequelizeOptions
);

module.exports = sequelize;