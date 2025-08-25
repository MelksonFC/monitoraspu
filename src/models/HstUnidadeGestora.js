'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HstUnidadeGestora extends Model {
    static associate(models) {
      // Um Histórico pertence a um Imóvel
      this.belongsTo(models.Imovel, { foreignKey: 'idimovel', targetKey: 'idimovel' });
      // Um Histórico pertence a uma Unidade Gestora
      this.belongsTo(models.UnidadeGestora, { foreignKey: 'idunidadegestora', targetKey: 'id' });
    }
  }
  HstUnidadeGestora.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idimovel: { type: DataTypes.INTEGER, allowNull: false },
    idunidadegestora: { type: DataTypes.INTEGER, allowNull: false },
    dtinicio: { type: DataTypes.DATEONLY, allowNull: false },
    dtfim: { type: DataTypes.DATEONLY },
    datecreated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    datemodified: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    usercreated: { type: DataTypes.INTEGER, allowNull: false },
    usermodified: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    sequelize,
    modelName: 'HstUnidadeGestora',
    tableName: 'hstunidadegestora',
    schema: 'dbo',
    timestamps: false,
  });
  return HstUnidadeGestora;
};