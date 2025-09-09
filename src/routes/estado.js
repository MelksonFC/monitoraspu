const express = require("express");
const sequelize = require("../models/sequelize.js");
const { Op } = require("sequelize");
const db = require('../models/index.js');
const { Estado, Municipio } = db;


const router = express.Router();

// GET estados com filtro por país, ordenados por nome
router.get("/", async (req, res) => {
  const { pais } = req.query;
  const where = pais ? { idpais: Number(pais) } : {};
  try {
    const estados = await Estado.findAll({ where, order: [['nome', 'ASC']] });
    res.json(estados);
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao buscar os estados." });
  }
});

// GET estado por ID
router.get("/:id", async (req, res) => {
  try {
    const estado = await Estado.findByPk(req.params.id);
    if (estado) {
      res.json(estado);
    } else {
      res.status(404).json({ error: "Estado não encontrado." });
    }
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao buscar o estado." });
  }
});

// --- INÍCIO DA CORREÇÃO ---
const checkUniqueness = async (uf, idibge, excludeId = null) => {
  // Condição para procurar um registro com a mesma UF
  const whereUf = { uf: uf.toUpperCase() };
  if (excludeId) {
    whereUf.idestado = { [Op.ne]: excludeId };
  }
  const existingUf = await Estado.findOne({ where: whereUf });
  if (existingUf) {
    return `A UF '${uf.toUpperCase()}' já está em uso.`;
  }

  // Condição separada para procurar um registro com o mesmo ID IBGE
  // Só executa se idibge for fornecido
  if (idibge !== null && idibge !== undefined && String(idibge).trim() !== '') {
    const whereIbge = { idibge: Number(idibge) };
    if (excludeId) {
      whereIbge.idestado = { [Op.ne]: excludeId };
    }
    const existingIbge = await Estado.findOne({ where: whereIbge });
    if (existingIbge) {
      return `O código IBGE '${idibge}' já está em uso.`;
    }
  }

  return null; // Nenhum conflito encontrado
};
// --- FIM DA CORREÇÃO ---

// POST novo estado com validações
router.post("/", async (req, res) => {
  const { nome, uf, idpais, idibge } = req.body;
  if (!nome || !uf || !idpais) {
    return res.status(400).json({ error: "Nome, UF e País são obrigatórios." });
  }

  try {
    const uniqueError = await checkUniqueness(uf, idibge);
    if (uniqueError) return res.status(400).json({ error: uniqueError });

    const novoEstado = await Estado.create({
      nome,
      uf: uf.toUpperCase(),
      idpais,
      idibge: idibge || null,
    });
    res.status(201).json(novoEstado);
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao criar o estado." });
  }
});

// PUT atualizar estado com validações
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, uf, idibge } = req.body;
  if (!nome || !uf) {
    return res.status(400).json({ error: "Nome e UF são obrigatórios." });
  }

  try {
    const estado = await Estado.findByPk(id);
    if (!estado) {
      return res.status(404).json({ error: "Estado não encontrado." });
    }

    const uniqueError = await checkUniqueness(uf, idibge, id); // Passa o ID para ser excluído da verificação
    if (uniqueError) return res.status(400).json({ error: uniqueError });

    await estado.update({
      nome,
      uf: uf.toUpperCase(),
      idibge: idibge || null,
    });
    res.json(estado);
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao atualizar o estado." });
  }
});

// DELETE estado com verificação de dependência
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const municipioAssociado = await Municipio.findOne({ where: { idestado: id } });
    if (municipioAssociado) {
      return res.status(400).json({ error: "Não é possível excluir o estado pois ele possui municípios associados." });
    }
    const deleted = await Estado.destroy({ where: { idestado: id } });
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Estado não encontrado." });
    }
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao excluir o estado." });
  }
});

module.exports = router;