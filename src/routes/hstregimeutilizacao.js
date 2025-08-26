import express from "express";
import db from "../models/index.js";
const { HstRegimeUtilizacao } = db;

const router = express.Router();

// AJUSTE: Permite filtrar por idimovel na query string
router.get("/", async (req, res) => {
  const { idimovel } = req.query;
  const where = idimovel ? { idimovel: Number(idimovel) } : {};
  const historico = await HstRegimeUtilizacao.findAll({ 
    where,
    order: [['dtinicio', 'DESC']] // Ordena do mais recente para o mais antigo
  });
  res.json(historico);
});

router.get("/:id", async (req, res) => res.json(await HstRegimeUtilizacao.findByPk(req.params.id)));
router.post("/", async (req, res) => res.json(await HstRegimeUtilizacao.create(req.body)));
router.put("/:id", async (req, res) => {
  await HstRegimeUtilizacao.update(req.body, { where: { id: req.params.id } });
  res.json(await HstRegimeUtilizacao.findByPk(req.params.id));
});
router.delete("/:id", async (req, res) => {
  await HstRegimeUtilizacao.destroy({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

export default router;