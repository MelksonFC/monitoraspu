'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Fiscalizacao extends Model {
    static associate(models) {
      // Uma Fiscalização pertence a um Imóvel
      this.belongsTo(models.Imovel, {
        foreignKey: 'idimovel',
        targetKey: 'idimovel'
      });
    }
  }
  Fiscalizacao.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idimovel: { type: DataTypes.INTEGER, allowNull: false },
    datafiscalizacao: { type: DataTypes.DATEONLY, allowNull: false },
    condicoes: { type: DataTypes.TEXT, allowNull: false },
    observacoes: { type: DataTypes.TEXT },
    fiscalizador: { type: DataTypes.STRING, allowNull: false },
    datecreated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    datemodified: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    usercreated: { type: DataTypes.INTEGER, allowNull: false },
    usermodified: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    sequelize,
    modelName: 'Fiscalizacao',
    tableName: 'fiscalizacao',
    schema: 'dbo',
    timestamps: false,
  });
  return Fiscalizacao;
};