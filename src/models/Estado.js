'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Estado extends Model {
    static associate(models) {
      // Um Estado pertence a um País
      this.belongsTo(models.Pais, {
        foreignKey: 'idpais',
        targetKey: 'idpais'
      });
      // Um Estado tem muitos Municípios
      this.hasMany(models.Municipio, {
        foreignKey: 'idestado'
      });
      // Um Estado tem muitos Imóveis
      this.hasMany(models.Imovel, {
        foreignKey: 'idestado'
      });
    }
  }
  Estado.init({
    idestado: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(100), allowNull: false },
    uf: { type: DataTypes.STRING(2), allowNull: false },
    idibge: { type: DataTypes.INTEGER, allowNull: true, unique: true },
    idpais: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    sequelize,
    modelName: 'Estado',
    tableName: 'estado',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['idpais', 'nome'] },
      { unique: true, fields: ['idpais', 'uf'] }
    ]
  });
  return Estado;
};