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
    rejectUnauthorized: true // É uma boa prática de segurança manter isso como true.
  }
});

// Adiciona um listener para erros de conexão no pool, para facilitar o debug no futuro.
pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente do pool de banco de dados', err);
  process.exit(-1);
});


module.exports = pool;