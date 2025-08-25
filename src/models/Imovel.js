'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Imovel extends Model {
    static associate(models) {
      // Relação com Municipio
      this.belongsTo(models.Municipio, {
        foreignKey: 'idmunicipio',
        as: 'Municipio'
      });
      // Relação com Estado
      this.belongsTo(models.Estado, {
        foreignKey: 'idestado',
        as: 'Estado'
      });
      // Relação com Unidade Gestora
      this.belongsTo(models.UnidadeGestora, {
        foreignKey: 'idunidadegestora',
        targetKey: 'id', // A PK de UnidadeGestora é 'id'
        as: 'UnidadeGestora'
      });
      // Relação com Regime de Utilização
      this.belongsTo(models.RegimeUtilizacao, {
        foreignKey: 'idregimeutilizacao',
        targetKey: 'id', // A PK de RegimeUtilizacao é 'id'
        as: 'RegimeUtilizacao'
      });
      // Relação com Imagem
      this.hasMany(models.Imagem, {
        foreignKey: 'idimovel',
        as: 'imagens'
      });
    }
  }
  Imovel.init({
    idimovel: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    matricula: { type: DataTypes.STRING, unique: true },
    nome: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    endereco: { type: DataTypes.STRING, allowNull: false },
    cep: { type: DataTypes.STRING, allowNull: false },
    numero: { type: DataTypes.STRING, allowNull: true },
    complemento: { type: DataTypes.STRING, allowNull: true },
    idmunicipio: { type: DataTypes.INTEGER, allowNull: false },
    idestado: { type: DataTypes.INTEGER, allowNull: false },
    idpais: { type: DataTypes.INTEGER, allowNull: false },
    nomecartorio: { type: DataTypes.STRING, allowNull: false },
    nprocesso: { type: DataTypes.STRING, unique: true },
    latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    areaterreno: { type: DataTypes.DECIMAL(18, 2) },
    areaconstruida: { type: DataTypes.DECIMAL(18, 2) },
    ocupante: { type: DataTypes.STRING },
    ripimovel: { type: DataTypes.STRING },
    riputilizacao: { type: DataTypes.STRING },
    situacao: { type: DataTypes.BOOLEAN },
    dataimovel: { type: DataTypes.DATE },
    valorimovel: { type: DataTypes.DECIMAL(18, 2) },
    idunidadegestora: { type: DataTypes.INTEGER },
    idregimeutilizacao: { type: DataTypes.INTEGER },
    datecreated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    datemodified: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    usercreated: { type: DataTypes.INTEGER, allowNull: false },
    usermodified: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    sequelize,
    modelName: 'Imovel',
    tableName: 'imoveis',
    schema: 'dbo',
    timestamps: false
  });
  return Imovel;
};