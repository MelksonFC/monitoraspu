'use strict';

// Carrega as variáveis de ambiente do arquivo .env na raiz do projeto
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// --- FONTE ÚNICA DA VERDADE ---
// Este objeto contém todas as informações de conexão com o banco de dados.
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

// Adiciona a configuração SSL necessária para ambientes de produção (como o Render)
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

module.exports = dbConfig;
