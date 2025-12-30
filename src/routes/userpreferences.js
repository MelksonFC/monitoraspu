const express = require("express");
const sequelize = require("../models/sequelize.js");
const db = require('../models/index.js'); // Carrega os modelos do banco
const { UserPreference } = db;

const router = express.Router();

// Define o tema padrão (caso nenhum tema esteja salvo)
const defaultTheme = {
  userid: null,
  themepreference: "blue-theme",
  chartcolorscheme: "monochromatic",
};

// GET /api/userpreferences/:userid
router.get("/:userid", async (req, res) => {
  const { userid } = req.params;
  try {
    const config = await UserPreference.findOne({ where: { userid } });
    if (config) {
      res.json(config);
    } else {
      // Retorna a configuração padrão se não encontrar nenhuma salva
      res.json({ ...defaultTheme, userid: Number(userid) });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar preferências de tema.", details: error.message });
  }
});

// PUT /api/userpreferences/:userid
router.put("/:userid", async (req, res) => {
  const { userid } = req.params;
  const { themepreference, chartcolorscheme } = req.body;

  const updateData = {};
  if (themepreference) updateData.themepreference = themepreference;
  if (chartcolorscheme) updateData.chartcolorscheme = chartcolorscheme;
  updateData.updatedat = new Date();

  if (Object.keys(updateData).length <= 1) {
    return res.status(400).json({ error: "Nenhuma preferência para atualizar foi fornecida." });
  }

  const t = await sequelize.transaction();
  try {
    const [config, created] = await UserPreference.findOrCreate({
      where: { userid },
      defaults: {
        themepreference: themepreference || defaultPreferences.themepreference,
        chartcolorscheme: chartcolorscheme || defaultPreferences.chartcolorscheme,
        updatedat: new Date()
      },
      transaction: t,
    });

    if (!created) {
      await config.update(updateData, { transaction: t });
    }

    await t.commit();
    res.json(config);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: "Erro ao salvar preferências do usuário.", details: error.message });
  }
});

module.exports = router;