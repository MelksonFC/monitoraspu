'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Municipio extends Model {
    static associate(models) {
      // Um Município pertence a um Estado
      this.belongsTo(models.Estado, {
        foreignKey: 'idestado',
        targetKey: 'idestado'
      });
      // Um Município tem muitos Imóveis
      this.hasMany(models.Imovel, {
        foreignKey: 'idmunicipio'
      });
    }
  }
  Municipio.init({
    idmunicipio: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(150), allowNull: false },
    idibge: { type: DataTypes.INTEGER, allowNull: true, unique: true },
    idestado: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    sequelize,
    modelName: 'Municipio',
    tableName: 'municipio',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['idestado', 'nome'] }
    ]
  });
  return Municipio;
};