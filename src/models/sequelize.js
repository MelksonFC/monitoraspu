'use strict';

const { Sequelize } = require("sequelize");
const fs = require('fs');
const path = require('path');

// Constrói o caminho para o arquivo do certificado CA.
// __dirname aponta para a pasta onde este arquivo (sequelize.js) está.
const caCertPath = path.join(__dirname,'..', 'backend', 'ca.pem');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });


// Substitua os valores abaixo pelos que você encontrou no painel da Aiven.
const sequelize = new Sequelize(
  process.env.DB_NAME,      
  process.env.DB_USER,      
  process.env.DB_PASSWORD,   
  {
    host: process.env.DB_HOST,           
    dialect: 'postgres',
    port: process.env.DB_PORT,           
    
  
    define: {
      freezeTableName: true,
      schema: 'dbo'
    },
    
    // Adicionamos a configuração de SSL dentro de dialectOptions
    dialectOptions: {
      searchPath: 'dbo,public', 
      ssl: {
        ca: fs.readFileSync(caCertPath).toString()
      }
    }
  }
);

module.exports = sequelize;