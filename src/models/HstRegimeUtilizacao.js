'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HstRegimeUtilizacao extends Model {
    static associate(models) {
      // Um Histórico pertence a um Imóvel
      this.belongsTo(models.Imovel, { foreignKey: 'idimovel', targetKey: 'idimovel' });
      // Um Histórico pertence a um Regime de Utilização
      this.belongsTo(models.RegimeUtilizacao, { foreignKey: 'idregimeutilizacao', targetKey: 'id' });
    }
  }
  HstRegimeUtilizacao.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idimovel: { type: DataTypes.INTEGER, allowNull: false },
    idregimeutilizacao: { type: DataTypes.INTEGER, allowNull: false },
    dtinicio: { type: DataTypes.DATEONLY, allowNull: false },
    dtfim: { type: DataTypes.DATEONLY },
    datecreated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    datemodified: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    usercreated: { type: DataTypes.INTEGER, allowNull: false },
    usermodified: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    sequelize,
    modelName: 'HstRegimeUtilizacao',
    tableName: 'hstregimeutilizacao',
    schema: 'dbo',
    timestamps: false,
  });
  return HstRegimeUtilizacao;
};