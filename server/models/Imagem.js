'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Imagem extends Model {
    static associate(models) {
      // Uma Imagem pertence a um Imóvel
      this.belongsTo(models.Imovel, {
        foreignKey: 'idimovel',
        targetKey: 'idimovel'
      });
    }
  }
  Imagem.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idimovel: { type: DataTypes.INTEGER, allowNull: false },
    nomearquivo: { type: DataTypes.STRING, allowNull: false },
    imagem: { type: DataTypes.BLOB('long'), allowNull: false },
    ordem: { type: DataTypes.INTEGER },
    datecreated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    datemodified: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    usercreated: { type: DataTypes.INTEGER, allowNull: false },
    usermodified: { type: DataTypes.INTEGER, allowNull: false },
    isdefault: {
      type: DataTypes.STRING,
      get() {
        const rawValue = this.getDataValue('isdefault');
        return rawValue === '1';
      },
      set(value) {
        this.setDataValue('isdefault', value ? '1' : '0');
      }
    }
  }, {
    sequelize,
    modelName: 'Imagem',
    tableName: 'imagensimovel',
    schema: 'dbo',
    timestamps: false
  });
  return Imagem;
};