const express = require("express");
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
  console.log(`[DEBUG GET] ========== INÍCIO ==========`);
  console.log(`[DEBUG GET] Rota chamada com userid: ${userid}`);
  console.log(`[DEBUG GET] UserPreference model:`, UserPreference ? 'OK' : 'UNDEFINED');
  console.log(`[DEBUG GET] db.sequelize:`, db.sequelize ? 'OK' : 'UNDEFINED');
  try {
    console.log(`[DEBUG GET] Executando findOne...`);
    const config = await UserPreference.findOne({ where: { userid } });
    console.log(`[DEBUG GET] findOne concluído`);

    
    console.log("[DEBUG GET] Resultado:", config ? 'ENCONTRADO' : 'VAZIO');

    if (config) {
      console.log("[DEBUG GET] Convertendo para JSON...");
      const configJSON = config.toJSON();
      console.log("[DEBUG GET] JSON:", configJSON);
      console.log("[DEBUG GET] Enviando resposta 200");
      res.json(configJSON);
    } else {
      console.log("[DEBUG GET] Enviando padrão:", { ...defaultPreferences, userid: Number(userid) });
      res.json({ ...defaultPreferences, userid: Number(userid) });
    }
    console.log(`[DEBUG GET] ========== FIM OK ==========`);
  } catch (error) {
    console.error("[DEBUG GET] ========== ERRO CAPTURADO ==========");
    console.error("[DEBUG GET] Erro:", error);
    console.error("[DEBUG GET] Stack:", error.stack);
    console.error("[DEBUG GET] Message:", error.message);
    console.error("[DEBUG GET] ========== FIM ERRO ==========");
    res.status(500).json({ error: "Erro ao buscar preferências do usuário.", details: error.message, stack: error.stack });
  }
});

// --- [ROTA PUT CORRIGIDA E SIMPLIFICADA] ---
router.put("/:userid", async (req, res) => {
  console.log(`[DEBUG PUT] ========== INÍCIO ==========`);
  const { userid } = req.params;
  const { themepreference, chartcolorscheme, uimode } = req.body;
  console.log(`[DEBUG PUT] userid: ${userid}`);
  console.log(`[DEBUG PUT] body:`, req.body);

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

  console.log(`[DEBUG PUT] Iniciando transação...`);
  const t = await db.sequelize.transaction();
  console.log(`[DEBUG PUT] Transação criada`);
  try {
    console.log(`[DEBUG PUT] Buscando registro existente...`);
    let userPreference = await UserPreference.findOne({
      where: { userid },
      transaction: t,
    });
    console.log(`[DEBUG PUT] Registro existente:`, userPreference ? 'SIM' : 'NÃO');

    // Se não encontrar, cria um novo registro
    if (!userPreference) {
      console.log(`[DEBUG PUT] Criando novo registro...`);
      userPreference = await UserPreference.create({
        userid,
        themepreference: themepreference || defaultPreferences.themepreference,
        chartcolorscheme: chartcolorscheme || defaultPreferences.chartcolorscheme,
        uimode: uimode || defaultPreferences.uimode,
        updatedAt: new Date(),
      }, { transaction: t });
      console.log(`[DEBUG PUT] Registro criado:`, userPreference.toJSON());
    } else {
      console.log(`[DEBUG PUT] Atualizando registro existente...`);
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
      userPreference.updatedAt = new Date();
      console.log(`[DEBUG PUT] Salvando alterações...`);
      await userPreference.save({ transaction: t });
      console.log(`[DEBUG PUT] Alterações salvas`);
    }

    console.log(`[DEBUG PUT] Fazendo commit da transação...`);
    await t.commit();
    console.log(`[DEBUG PUT] Commit realizado`);
    console.log(`[DEBUG PUT] Enviando resposta 200`);
    res.status(200).json(userPreference);
    console.log(`[DEBUG PUT] ========== FIM OK ==========`);
  } catch (error) {
    console.error(`[DEBUG PUT] ========== ERRO CAPTURADO ==========`);
    console.error(`[DEBUG PUT] Erro:`, error);
    console.error(`[DEBUG PUT] Stack:`, error.stack);
    console.error(`[DEBUG PUT] Message:`, error.message);
    await t.rollback();
    console.error(`[DEBUG PUT] Rollback realizado`);
    console.error(`[DEBUG PUT] ========== FIM ERRO ==========`);
    res.status(500).json({ error: "Erro ao salvar preferências do usuário.", details: error.message, stack: error.stack });
  }
});

module.exports = router;