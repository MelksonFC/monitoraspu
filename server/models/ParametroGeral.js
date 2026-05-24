'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ParametroGeral extends Model {
    static associate(_models) {
      // Sem relacionamentos no momento.
    }
  }

  ParametroGeral.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      parametro: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      conteudoStr: { type: DataTypes.STRING(225), allowNull: true, field: 'conteudostr' },
      conteudoInt: { type: DataTypes.INTEGER, allowNull: true, field: 'conteudoint' },
      descricao: { type: DataTypes.STRING(225), allowNull: true },
      tipo: { type: DataTypes.STRING(100), allowNull: false },
    },
    {
      sequelize,
      modelName: 'ParametroGeral',
      tableName: 'parametrosgerais',
      schema: 'dbo',
      timestamps: false,
    }
  );

  return ParametroGeral;
};
