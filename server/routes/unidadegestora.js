const express = require("express");
const db = require('../models/index.js');
const { UnidadeGestora } = db;

const router = express.Router();

router.get("/", async (req, res) => res.json(await UnidadeGestora.findAll()));
router.get("/:id", async (req, res) => res.json(await UnidadeGestora.findByPk(req.params.id)));

router.post("/", async (req, res) => {
  try {
    const item = await UnidadeGestora.create(req.body);
    res.json(item);
  } catch (err) {
    const isUnique = err.name === 'SequelizeUniqueConstraintError';
    res.status(isUnique ? 409 : 500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await UnidadeGestora.update(req.body, { where: { id: req.params.id } });
    res.json(await UnidadeGestora.findByPk(req.params.id));
  } catch (err) {
    const isUnique = err.name === 'SequelizeUniqueConstraintError';
    res.status(isUnique ? 409 : 500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await UnidadeGestora.destroy({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;