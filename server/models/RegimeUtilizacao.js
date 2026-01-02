'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RegimeUtilizacao extends Model {
    static associate(models) {
      // Define a relação inversa
      this.hasMany(models.Imovel, {
        foreignKey: 'idregimeutilizacao'
      });
    }
  }
  RegimeUtilizacao.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    descricao: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    destinado: { type: DataTypes.BOOLEAN },
  }, {
    sequelize,
    modelName: 'RegimeUtilizacao',
    tableName: 'regimeutilizacao',
    schema: 'dbo',
    timestamps: false,
  });
  return RegimeUtilizacao;
};