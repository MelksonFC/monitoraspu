'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Avaliacao extends Model {
    static associate(models) {
      // Uma Avaliação pertence a um Imóvel
      this.belongsTo(models.Imovel, {
        foreignKey: 'idimovel',
        targetKey: 'idimovel'
      });
    }
  }
  Avaliacao.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idimovel: { type: DataTypes.INTEGER, allowNull: false },
    dataavaliacao: { type: DataTypes.DATEONLY, allowNull: false },
    novovalor: { type: DataTypes.DECIMAL(18, 2) },
    observacoes: { type: DataTypes.TEXT },
    avaliador: { type: DataTypes.STRING, allowNull: false },
    datecreated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    datemodified: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    usercreated: { type: DataTypes.INTEGER, allowNull: false },
    usermodified: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    sequelize,
    modelName: 'Avaliacao',
    tableName: 'avaliacao',
    schema: 'dbo',
    timestamps: false,
  });
  return Avaliacao;
};