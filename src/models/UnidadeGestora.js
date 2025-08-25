'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UnidadeGestora extends Model {
    static associate(models) {
      // Define a relação inversa: Uma Unidade Gestora pode ter muitos imóveis
      this.hasMany(models.Imovel, {
        foreignKey: 'idunidadegestora'
      });
    }
  }
  UnidadeGestora.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  }, {
    sequelize,
    modelName: 'UnidadeGestora',
    tableName: 'unidadegestora',
    schema: 'dbo',
    timestamps: false,
  });
  return UnidadeGestora;
};