const express = require("express");
const sequelize = require("../models/sequelize.js");
const db = require('../models/index.js'); // Carrega os modelos do banco
const { UserPreference } = db;

const router = express.Router();

// Define o tema padrão (caso nenhum tema esteja salvo)
const defaultTheme = {
  userid: null,
  themepreference: "blue-theme",
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
  const { themepreference } = req.body;

  const t = await sequelize.transaction();
  try {
    // Upsert: atualiza se existe, senão cria
    const [config, created] = await UserPreference.findOrCreate({
      where: { userid },
      defaults: { themepreference, updatedat: new Date() },
      transaction: t,
    });

    if (!created) {
      await config.update({ themepreference, updatedat: new Date() }, { transaction: t });
    }

    await t.commit();
    res.json(config);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: "Erro ao salvar preferências de tema.", details: error.message });
  }
});

module.exports = router;