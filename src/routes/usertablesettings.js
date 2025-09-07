import express from "express";
import sequelize from "../models/sequelize.js";
import db from "../models/index.js";
const { UserTableSetting } = db;

const router = express.Router();

// Defina aqui sua configuração padrão
const defaultConfig = {
  columns: [
    "idimovel", "nome", "matricula", "dataimovel", "valorimovel",
    "ripimovel", "riputilizacao", "situacao", "idpais", "idestado",
    "idmunicipio", "endereco", "cep", "numero", "complemento",
    "latitude", "longitude", "email", "nomecartorio", "nprocesso",
    "ocupante", "idregimeutilizacao", "idunidadegestora",
    "areaconstruida", "areaterreno", "datecreated", "usercreated",
    "datemodified", "usermodified"
  ],
  orderby: "idimovel",
  orderdir: "asc",
  filters: {},
  filterops: {},
  filterrange: {}
};

// GET /api/usertablesettings/:userid/:tablename
router.get("/:userid/:tablename", async (req, res) => {
  const { userid, tablename } = req.params;
  try {
    const config = await UserTableSetting.findOne({ where: { userid, tablename } });
    if (config) {
      res.json(config);
    } else {
      // Retorna a configuração padrão se não encontrar nenhuma salva
      res.json({
        userid: Number(userid),
        tablename,
        ...defaultConfig
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar configuração.", details: error.message });
  }
});

// PUT /api/usertablesettings/:userid/:tablename
router.put("/:userid/:tablename", async (req, res) => {
  const { userid, tablename } = req.params;
  const { columns, orderby, orderdir, filters, filterops, filterrange } = req.body;

  const t = await sequelize.transaction();
  try {
    // Upsert: atualiza se existe, senão cria
    const [config, created] = await UserTableSetting.findOrCreate({
      where: { userid, tablename },
      defaults: {
        columns, orderby, orderdir, filters, filterops, filterrange,
        updatedat: new Date(),
      },
      transaction: t,
    });

    if (!created) {
      await config.update(
        { columns, orderby, orderdir, filters, filterops, filterrange, updatedat: new Date() },
        { transaction: t }
      );
    }

    await t.commit();
    res.json(config);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: "Erro ao salvar configuração.", details: error.message });
  }
});

export default router;