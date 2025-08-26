import express from "express";
import db from "../models/index.js";
const { Pais, Estado } = db;
import { Op } from "sequelize"; 

const router = express.Router();

// GET todos os países, ordenados por nome
router.get("/", async (req, res) => {
  try {
    const paises = await Pais.findAll({ order: [['nome', 'ASC']] });
    res.json(paises);
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao buscar os países." });
  }
});

// GET país por ID
router.get("/:id", async (req, res) => {
  try {
    const pais = await Pais.findByPk(req.params.id);
    if (pais) {
      res.json(pais);
    } else {
      res.status(404).json({ error: "País não encontrado." });
    }
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao buscar o país." });
  }
});


// POST novo país com validação
router.post("/", async (req, res) => {
  const { nome } = req.body;
  if (!nome || nome.trim() === "") {
    return res.status(400).json({ error: "O nome do país é obrigatório." });
  }
  try {
    const novoPais = await Pais.create({ nome });
    res.status(201).json(novoPais);
  } catch (err) {
    // Trata erros de unicidade do banco de dados, se houver
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: "Este país já existe." });
    }
    res.status(500).json({ error: "Ocorreu um erro ao salvar o país." });
  }
});

// PUT atualizar país com validação
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;
  if (!nome || nome.trim() === "") {
    return res.status(400).json({ error: "O nome do país é obrigatório." });
  }
  try {
    const pais = await Pais.findByPk(id);
    if (!pais) {
      return res.status(404).json({ error: "País não encontrado." });
    }
    await pais.update({ nome });
    res.json(pais);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: "Este nome de país já está em uso." });
    }
    res.status(500).json({ error: "Ocorreu um erro ao atualizar o país." });
  }
});

// DELETE país com verificação de dependência
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const estadoAssociado = await Estado.findOne({ where: { idpais: id } });
    if (estadoAssociado) {
      return res.status(400).json({ error: "Não é possível excluir o país pois ele possui estados associados." });
    }
    const deleted = await Pais.destroy({ where: { idpais: id } });
    if (deleted) {
      res.status(204).send(); // Sucesso, sem conteúdo
    } else {
      res.status(404).json({ error: "País não encontrado." });
    }
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao excluir o país." });
  }
});

export default router;