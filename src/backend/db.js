'use strict';

const { Pool } = require("pg");
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const connectionConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // --- POOL DE CONEXÕES ---
  max: 10,                 // máximo de conexões simultâneas
  min: 2,                  // mínimo de conexões mantidas abertas
  idleTimeoutMillis: 10000, // tempo antes de fechar conexão ociosa (ms)
  connectionTimeoutMillis: 30000 // tempo máximo esperando por conexão (ms)
};

// Adiciona configuração SSL apenas se a variável de ambiente indicar um ambiente de produção/nuvem
if (process.env.NODE_ENV === 'production') {
  connectionConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(connectionConfig);


module.exports = pool;