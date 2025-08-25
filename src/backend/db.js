'use strict';

const { Pool } = require("pg");
const fs = require('fs');
const path = require('path');

const caCertPath = path.join(__dirname, 'ca.pem');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// Substitua os valores abaixo pelos que você encontrou no painel da Aiven.
const pool = new Pool({
  user: process.env.DB_USER,      
  host: process.env.DB_HOST,         
  database: process.env.DB_NAME, 
  password: process.env.DB_PASSWORD,   
  port: process.env.DB_PORT,            
  
  // Configuração de SSL segura usando o certificado CA.
  ssl: {
    ca: fs.readFileSync(caCertPath).toString(),
  }
});


module.exports = pool;