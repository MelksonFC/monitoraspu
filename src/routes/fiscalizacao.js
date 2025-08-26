import express from "express";
import db from "../models/index.js";
const { Fiscalizacao } = db;

const router = express.Router();

router.get("/", async (req, res) => {
  const { idimovel } = req.query;
  const whereOptions = {};

  if (idimovel) {
    whereOptions.idimovel = idimovel;
  }

  try {
    const fiscalizacoes = await Fiscalizacao.findAll({ where: whereOptions });
    res.json(fiscalizacoes);
  } catch (error) {
    console.error("Erro ao buscar fiscalizações:", error);
    res.status(500).json({ error: "Falha ao buscar fiscalizações" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const fiscalizacao = await Fiscalizacao.findByPk(req.params.id);
    if (fiscalizacao) {
      res.json(fiscalizacao);
    } else {
      res.status(404).json({ error: "Fiscalização não encontrada" });
    }
  } catch (error) {
    res.status(500).json({ error: "Falha ao buscar fiscalização" });
  }
});

router.post("/", async (req, res) => {
  // Supondo que estes são obrigatórios:
  console.log("Fiscalizacao POST body:", req.body);
  console.log(`[${req.method}] Fiscalizacao id:`, req.params.id, 'Body:', req.body);
  const { idimovel, datafiscalizacao, fiscalizador, condicoes } = req.body;
  if (!idimovel || !datafiscalizacao || !fiscalizador || !condicoes) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes: idimovel, datafiscalizacao, fiscalizador, condicoes." });
  }
  try {
    const novaFiscalizacao = await Fiscalizacao.create(req.body);
    res.status(201).json(novaFiscalizacao);
  } catch (error) {
    res.status(400).json({ error: "Erro ao criar fiscalização", details: error.message });
  }
});

router.put("/:id", async (req, res) => {
  // Supondo que estes são obrigatórios:
  console.log("Fiscalizacao PUT body:", req.body);
  console.log(`[${req.method}] Fiscalizacao id:`, req.params.id, 'Body:', req.body);
  const { idimovel, datafiscalizacao, fiscalizador, condicoes } = req.body;
  if (!idimovel || !datafiscalizacao || !fiscalizador || !condicoes) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes: idimovel, datafiscalizacao, fiscalizador, condicoes." });
  }
  try {
    const [updated] = await Fiscalizacao.update(req.body, { where: { id: req.params.id } });
    if (updated) {
      const fiscalizacaoAtualizada = await Fiscalizacao.findByPk(req.params.id);
      res.json(fiscalizacaoAtualizada);
    } else {
      res.status(404).json({ error: "Fiscalização não encontrada" });
    }
  } catch (error) {
    res.status(400).json({ error: "Erro ao atualizar fiscalização", details: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Fiscalizacao.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: "Fiscalização não encontrada" });
    }
  } catch (error) {
    res.status(500).json({ error: "Falha ao deletar fiscalização" });
  }
});

export default router;