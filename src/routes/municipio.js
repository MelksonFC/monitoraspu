const express = require("express");
const { Municipio, Imovel } = require("../models");
const { Op } = require("sequelize");

const router = express.Router();

// GET municípios com filtro por estado, ordenados por nome
router.get("/", async (req, res) => {
  const { estado } = req.query;
  const where = estado ? { idestado: Number(estado) } : {};
  try {
    const municipios = await Municipio.findAll({ where, order: [['nome', 'ASC']] });
    res.json(municipios);
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao buscar os municípios." });
  }
});

// GET município por ID
router.get("/:id", async (req, res) => {
  try {
    const municipio = await Municipio.findByPk(req.params.id);
    if (municipio) {
      res.json(municipio);
    } else {
      res.status(404).json({ error: "Município não encontrado." });
    }
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao buscar o município." });
  }
});

// --- INÍCIO DA CORREÇÃO ---
const checkUniqueness = async (idibge, excludeId = null) => {
  // Só executa se idibge for fornecido
  if (idibge === null || idibge === undefined || String(idibge).trim() === '') {
    return null;
  }
  
  const whereClause = { idibge: Number(idibge) };
  if (excludeId) {
      whereClause.idmunicipio = { [Op.ne]: excludeId };
  }
  
  const existing = await Municipio.findOne({ where: whereClause });
  if (existing) {
    return `O código IBGE '${idibge}' já está em uso.`;
  }
  
  return null; // Nenhum conflito encontrado
};
// --- FIM DA CORREÇÃO ---

// POST novo município com validações
router.post("/", async (req, res) => {
  const { nome, idestado, idibge } = req.body;
  if (!nome || !idestado) {
    return res.status(400).json({ error: "Nome e Estado são obrigatórios." });
  }
  try {
    const uniqueError = await checkUniqueness(idibge);
    if (uniqueError) return res.status(400).json({ error: uniqueError });

    const novoMunicipio = await Municipio.create({
      nome,
      idestado,
      idibge: idibge || null,
    });
    res.status(201).json(novoMunicipio);
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao criar o município." });
  }
});

// PUT atualizar município com validações
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, idibge } = req.body;
  if (!nome) {
    return res.status(400).json({ error: "O nome é obrigatório." });
  }
  try {
    const municipio = await Municipio.findByPk(id);
    if (!municipio) {
      return res.status(404).json({ error: "Município não encontrado." });
    }
    
    const uniqueError = await checkUniqueness(idibge, id); // Passa o ID para ser excluído da verificação
    if (uniqueError) return res.status(400).json({ error: uniqueError });

    await municipio.update({
      nome,
      idibge: idibge || null,
    });
    res.json(municipio);
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao atualizar o município." });
  }
});

// DELETE município com verificação de dependência (exemplo com Imovel)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const imovelAssociado = await Imovel.findOne({ where: { idmunicipio: id } });
    if (imovelAssociado) {
        return res.status(400).json({ error: "Não é possível excluir o município pois ele está associado a um ou mais imóveis." });
    }

    const deleted = await Municipio.destroy({ where: { idmunicipio: id } });
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Município não encontrado." });
    }
  } catch (err) {
    res.status(500).json({ error: "Ocorreu um erro ao excluir o município." });
  }
});

module.exports = router;