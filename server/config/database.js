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

// Adiciona a configuração SSL se estiver conectando a um host remoto (ex: Aiven, Render)
// Isso é necessário tanto para produção quanto para desenvolvimento local apontando para a nuvem.
if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
  dbConfig.ssl = {
    rejectUnauthorized: false // Necessário para muitos serviços de DB na nuvem
  };
}

module.exports = dbConfig;
