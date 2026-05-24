const express = require("express");
const db = require("../models/index.js");

const { ParametroGeral } = db;
const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await ParametroGeral.findAll({ order: [["id", "ASC"]] });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const row = await ParametroGeral.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Parâmetro não encontrado." });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.parametro) body.parametro = String(body.parametro).trim();
    if (body.descricao) body.descricao = String(body.descricao).trim();
    if (body.tipo) body.tipo = String(body.tipo).trim();

    const row = await ParametroGeral.create(body);
    res.status(201).json(row);
  } catch (err) {
    const isUnique = err.name === "SequelizeUniqueConstraintError";
    res.status(isUnique ? 409 : 500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.parametro) body.parametro = String(body.parametro).trim();
    if (body.descricao) body.descricao = String(body.descricao).trim();
    if (body.tipo) body.tipo = String(body.tipo).trim();

    await ParametroGeral.update(body, { where: { id: req.params.id } });
    const updated = await ParametroGeral.findByPk(req.params.id);
    if (!updated) return res.status(404).json({ error: "Parâmetro não encontrado." });
    res.json(updated);
  } catch (err) {
    const isUnique = err.name === "SequelizeUniqueConstraintError";
    res.status(isUnique ? 409 : 500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await ParametroGeral.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: "Parâmetro não encontrado." });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
