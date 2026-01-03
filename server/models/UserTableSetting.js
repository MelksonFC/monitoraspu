'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserTableSetting extends Model {}
  UserTableSetting.init({
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userid:    { type: DataTypes.INTEGER, allowNull: false },
    tablename: { type: DataTypes.STRING(50), allowNull: false },
    columns:     { type: DataTypes.JSONB },
    orderby:     { type: DataTypes.STRING(50) },
    orderdir:    { type: DataTypes.STRING(4) },
    filters:     { type: DataTypes.JSONB },
    filterops:   { type: DataTypes.JSONB },
    filterrange: { type: DataTypes.JSONB },
    compactmode: { type: DataTypes.BOOLEAN, defaultValue: false },
    rowsperpage: { type: DataTypes.INTEGER, defaultValue: 50 },
    updatedat:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    sequelize,
    modelName: 'UserTableSetting',
    tableName: 'usertablesettings',
    schema: 'dbo', 
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['userid', 'tablename'],
      }
    ]
  });
  return UserTableSetting;
};