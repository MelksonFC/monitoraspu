'use strict';

const { Pool } = require("pg");
const dbConfig = require("./config/database");

// Cria o pool de conexões usando a configuração centralizada
const pool = new Pool({
  ...dbConfig,
  // --- POOL DE CONEXÕES (configurações específicas do 'pg-pool') ---
  max: 10,                 // máximo de conexões simultâneas
  min: 2,                  // mínimo de conexões mantidas abertas
  idleTimeoutMillis: 10000, // tempo antes de fechar conexão ociosa (ms)
  connectionTimeoutMillis: 30000 // tempo máximo esperando por conexão (ms)
});

module.exports = pool;