'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PoligonoTerreno extends Model {}

  PoligonoTerreno.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idimovel: { type: DataTypes.INTEGER, allowNull: false },
    area: { type: DataTypes.GEOMETRY('POLYGON', 4326), allowNull: false },
    usermodified: { type: DataTypes.INTEGER, allowNull: false },
    usercreated: { type: DataTypes.INTEGER, allowNull: false },
    datemodified: { type: DataTypes.DATE, allowNull: false },
    datecreated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    sequelize,
    modelName: 'PoligonosTerreno',
    tableName: 'poligonosterreno',
    schema: 'dbo',
    timestamps: false,
  });

  return PoligonoTerreno;
};