const express = require("express");
const db = require('../models/index.js');
const { UnidadeGestora } = db;

const router = express.Router();

router.get("/", async (req, res) => res.json(await UnidadeGestora.findAll()));
router.get("/:id", async (req, res) => res.json(await UnidadeGestora.findByPk(req.params.id)));
router.post("/", async (req, res) => res.json(await UnidadeGestora.create(req.body)));
router.put("/:id", async (req, res) => {
  await UnidadeGestora.update(req.body, { where: { id: req.params.id } });
  res.json(await UnidadeGestora.findByPk(req.params.id));
});
router.delete("/:id", async (req, res) => {
  await UnidadeGestora.destroy({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

module.exports = router;