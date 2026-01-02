'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Pais extends Model {
    static associate(models) {
      // Um País tem muitos Estados
      this.hasMany(models.Estado, {
        foreignKey: 'idpais'
      });
    }
  }
  Pais.init({
    idpais: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  }, {
    sequelize,
    modelName: 'Pais',
    tableName: 'pais',
    schema: 'dbo',
    timestamps: false,
  });
  return Pais;
};