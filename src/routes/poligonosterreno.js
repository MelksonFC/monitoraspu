const express = require("express");
const db = require('../models/index.js');
const { PoligonoTerreno, sequelize } = db; // Importe 'sequelize'
const topojson = require("topojson-client");

const router = express.Router();

// Suas rotas GET
router.get("/", async (req, res) => res.json(await PoligonoTerreno.findAll()));
router.get("/:id", async (req, res) => res.json(await PoligonoTerreno.findByPk(req.params.id)));
router.get("/imovel/:idimovel", async (req, res) => res.json(await PoligonoTerreno.findAll({ where: { idimovel: req.params.idimovel } })));

// Função para extrair a geometria e converter
const getGeometryFromRequest = (body) => {
    const { geometria, formato } = body;
    if (formato !== 'TopoJSON' || !geometria) {
        throw new Error("Formato de geometria inválido. Esperado TopoJSON.");
    }
    
    const topojsonData = JSON.parse(geometria);
    const objectName = Object.keys(topojsonData.objects)[0];
    if (!objectName) throw new Error("TopoJSON inválido: não contém objetos.");

    const geojsonFeatureCollection = topojson.feature(topojsonData, topojsonData.objects[objectName]);
    if (geojsonFeatureCollection && geojsonFeatureCollection.features && geojsonFeatureCollection.features.length > 0) {
        return geojsonFeatureCollection.features[0].geometry;
    } else {
        throw new Error("Não foi possível extrair uma geometria válida do TopoJSON.");
    }
};

// ===================================================================
// ROTA DE CRIAÇÃO (POST) - VERSÃO FINAL
// ===================================================================
router.post("/", async (req, res) => {
  try {
    const { idimovel, usercreated, usermodified } = req.body;
    const polygonGeoJSON = getGeometryFromRequest(req.body);

    // --- AQUI ESTÁ A CORREÇÃO BRUTE-FORCE ---
    // Chamamos a função com o esquema na frente: "dbo.ST_GeomFromGeoJSON"
    // E passamos o GeoJSON como uma string. O banco de dados fará o parse.
    const areaGeom = sequelize.fn('dbo.ST_GeomFromGeoJSON', JSON.stringify(polygonGeoJSON));
    // --- FIM DA CORREÇÃO ---

    const now = new Date();
    const novo = await PoligonoTerreno.create({
      idimovel,
      area: areaGeom,
      usercreated,
      usermodified,
      datecreated: now,
      datemodified: now
    });
    res.status(201).json(novo);

  } catch (error) {
    console.error("Erro ao criar polígono:", error);
    res.status(400).json({ error: error.message });
  }
});

// ===================================================================
// ROTA DE ATUALIZAÇÃO (PUT) - VERSÃO FINAL
// ===================================================================
router.put("/:id", async (req, res) => {
  try {
    const { usermodified } = req.body;
    const polygonGeoJSON = getGeometryFromRequest(req.body);

    // --- MESMA CORREÇÃO APLICADA AQUI ---
    const areaGeom = sequelize.fn('dbo.ST_GeomFromGeoJSON', JSON.stringify(polygonGeoJSON));
    // --- FIM DA CORREÇÃO ---

    const now = new Date();
    await PoligonoTerreno.update(
      { area: areaGeom, usermodified, datemodified: now },
      { where: { id: req.params.id } }
    );
    res.json(await PoligonoTerreno.findByPk(req.params.id));
  } catch (error) {
    console.error("Erro ao atualizar polígono:", error);
    res.status(400).json({ error: error.message });
  }
});

// Rota DELETE
router.delete("/:id", async (req, res) => {
  await PoligonoTerreno.destroy({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

module.exports = router;