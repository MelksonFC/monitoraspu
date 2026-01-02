'use strict';
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserPreference extends Model {}
  UserPreference.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userid: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      themepreference: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      chartcolorscheme: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "monochromatic", // 'multicolor', 'monochromatic'
      },
      uimode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'light', // 'light', 'dark'
      },
      updatedat: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "UserPreference",
      tableName: "userpreferences",
      schema: "dbo",
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ["userid"],
        },
      ],
    }
  );
  return UserPreference;
};