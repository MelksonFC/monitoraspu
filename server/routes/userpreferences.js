const express = require("express");
const sequelize = require("../models/sequelize.js");
const db = require('../models/index.js');
const { UserPreference } = db;

const router = express.Router();

const defaultPreferences = {
  themepreference: "theme-blue",
  chartcolorscheme: "monochromatic",
  uimode: "light",
};

// GET (sem alterações)
router.get("/:userid", async (req, res) => {
  const { userid } = req.params;
  console.log(`[DEBUG] Rota GET /userpreferences/:userid chamada com userid: ${userid}`);
  try {
    const config = await UserPreference.findOne({ where: { userid } });
    
    console.log("[DEBUG] Resultado da consulta do Sequelize:", config);

    if (config) {
      // Usar .toJSON() para garantir que estamos lidando com um objeto simples
      const configJSON = config.toJSON();
      console.log("[DEBUG] Enviando dados encontrados (JSON):", configJSON);
      res.json(configJSON);
    } else {
      console.log("[DEBUG] Nenhuma configuração encontrada, enviando padrão.");
      res.json({ ...defaultPreferences, userid: Number(userid) });
    }
  } catch (error) {
    console.error("[DEBUG] Erro capturado na rota GET:", error);
    res.status(500).json({ error: "Erro ao buscar preferências do usuário.", details: error.message });
  }
});

// --- [ROTA PUT CORRIGIDA E SIMPLIFICADA] ---
router.put("/:userid", async (req, res) => {
  const { userid } = req.params;
  const { themepreference, chartcolorscheme, uimode } = req.body;

  const validSchemes = ['monochromatic','multicolor'];
  if (chartcolorscheme && !validSchemes.includes(chartcolorscheme)) {
    return res.status(400).json({ error: "Esquema de cores inválido." });
  }

  const validUiModes = ['light', 'dark'];
  if (uimode && !validUiModes.includes(uimode)) {
    return res.status(400).json({ error: "Modo de UI inválido." });
  }

  // Verifica se pelo menos uma preferência foi enviada
  if (!themepreference && !chartcolorscheme && !uimode) {
    return res.status(400).json({ error: "Nenhuma preferência para atualizar foi fornecida." });
  }

  const t = await sequelize.transaction();
  try {
    // Tenta encontrar uma preferência existente
    let userPreference = await UserPreference.findOne({
      where: { userid },
      transaction: t,
    });

    // Se não encontrar, cria um novo registro
    if (!userPreference) {
      userPreference = await UserPreference.create({
        userid,
        themepreference: themepreference || defaultPreferences.themepreference,
        chartcolorscheme: chartcolorscheme || defaultPreferences.chartcolorscheme,
        uimode: uimode || defaultPreferences.uimode,
        updatedat: new Date(),
      }, { transaction: t });
    } else {
      // Se encontrar, atualiza apenas os campos que foram fornecidos
      if (themepreference) {
        userPreference.themepreference = themepreference;
      }
      if (chartcolorscheme) {
        userPreference.chartcolorscheme = chartcolorscheme;
      }
      if (uimode) {
        userPreference.uimode = uimode;
      }
      userPreference.updatedat = new Date();
      await userPreference.save({ transaction: t });
    }

    await t.commit();
    res.status(200).json(userPreference); // Retorna 200 OK com os dados atualizados
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: "Erro ao salvar preferências do usuário.", details: error.message });
  }
});

module.exports = router;