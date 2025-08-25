const express = require("express");
const { RegimeUtilizacao } = require("../models");

const router = express.Router();

router.get("/", async (req, res) => res.json(await RegimeUtilizacao.findAll()));
router.get("/:id", async (req, res) => res.json(await RegimeUtilizacao.findByPk(req.params.id)));
router.post("/", async (req, res) => res.json(await RegimeUtilizacao.create(req.body)));
router.put("/:id", async (req, res) => {
  await RegimeUtilizacao.update(req.body, { where: { id: req.params.id } });
  res.json(await RegimeUtilizacao.findByPk(req.params.id));
});
router.delete("/:id", async (req, res) => {
  await RegimeUtilizacao.destroy({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

module.exports = router;