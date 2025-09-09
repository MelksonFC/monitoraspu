const express = require("express");
const db = require('../models/index.js');
const { PoligonoTerreno } = db;

const router = express.Router();

// Função de validação de coordenadas
function validaCoordenadas(coordinates) {
  if (!Array.isArray(coordinates)) return 'coordinates precisa ser um array';
  if (coordinates.length < 3) return 'Um polígono precisa de pelo menos 3 pontos';
  for (let i = 0; i < coordinates.length; i++) {
    const ponto = coordinates[i];
    if (!Array.isArray(ponto) || ponto.length !== 2) return `Coordenada na posição ${i+1} está inválida`;
    const [lat, lng] = ponto;
    if (typeof lat !== 'number' || typeof lng !== 'number') return `Lat/Lng na posição ${i+1} não são números`;
    if (lat < -90 || lat > 90) return `Latitude inválida na posição ${i+1} (${lat})`;
    if (lng < -180 || lng > 180) return `Longitude inválida na posição ${i+1} (${lng})`;
  }
  return null;
}

// Lista todos os polígonos
router.get("/", async (req, res) => res.json(await PoligonoTerreno.findAll()));

// Busca polígono por ID
router.get("/:id", async (req, res) => res.json(await PoligonoTerreno.findByPk(req.params.id)));

// Busca polígonos por idimovel
router.get("/imovel/:idimovel", async (req, res) => res.json(await PoligonoTerreno.findAll({ where: { idimovel: req.params.idimovel } })));

// Cria polígono com validação
router.post("/", async (req, res) => {
  try {
    const { idimovel, coordinates, usercreated, usermodified } = req.body;
    const erro = validaCoordenadas(coordinates);
    if (erro) return res.status(400).json({ error: erro });
    const polygon = { type: "Polygon", coordinates: [coordinates] };
    const now = new Date();
    const novo = await PoligonoTerreno.create({
      idimovel,
      area: polygon,
      usercreated,
      usermodified,
      datecreated: now,
      datemodified: now
    });
    res.json(novo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Atualiza polígono com validação
router.put("/:id", async (req, res) => {
  try {
    const { coordinates, usermodified } = req.body;
    const erro = validaCoordenadas(coordinates);
    if (erro) return res.status(400).json({ error: erro });
    const polygon = { type: "Polygon", coordinates: [coordinates] };
    const now = new Date();
    await PoligonoTerreno.update(
      { area: polygon, usermodified, datemodified: now },
      { where: { id: req.params.id } }
    );
    res.json(await PoligonoTerreno.findByPk(req.params.id));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove polígono
router.delete("/:id", async (req, res) => {
  await PoligonoTerreno.destroy({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

module.exports = router;