'use strict';

// Usamos 'require' aqui para compatibilidade com o sistema de modelos do Sequelize.
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const db = {};

// Puxa a sua instância do sequelize já configurada
// A CORREÇÃO ESTÁ AQUI: removemos o '.default' do final.
const sequelize = require('./sequelize.js'); 

fs
  .readdirSync(__dirname)
  .filter(file => {
    // Encontra todos os arquivos de modelo na pasta, ignorando a si mesmo e o arquivo de conexão
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      !file.endsWith('.test.js') &&
      file !== 'sequelize.js'
    );
  })
  .forEach(file => {
    // Carrega cada modelo (que agora é uma função) e o inicializa
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Executa o método .associate() em cada modelo para criar as relações
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Exporta o banco de dados completamente montado
module.exports = db;