const express = require("express");
const db = require('../models/index.js');
const { PoligonoTerreno, sequelize } = db; // Importe 'sequelize'
const topojson = require("topojson-client");
const wkt = require('wkt'); // Importe a nova biblioteca

const router = express.Router();

// ... (suas rotas GET e a função 'validaCoordenadas' podem continuar como estão) ...
router.get("/", async (req, res) => res.json(await PoligonoTerreno.findAll()));
router.get("/:id", async (req, res) => res.json(await PoligonoTerreno.findByPk(req.params.id)));
router.get("/imovel/:idimovel", async (req, res) => res.json(await PoligonoTerreno.findAll({ where: { idimovel: req.params.idimovel } })));


// ===================================================================
// ROTA DE CRIAÇÃO (POST) - CORRIGIDA
// ===================================================================
router.post("/", async (req, res) => {
  try {
    const { idimovel, geometria, formato, usercreated, usermodified } = req.body;
    let polygonGeoJSON;

    if (formato === 'TopoJSON' && geometria) {
      const topojsonData = JSON.parse(geometria);
      const objectName = Object.keys(topojsonData.objects)[0];
      if (!objectName) return res.status(400).json({ error: "TopoJSON inválido." });

      const geojsonFeatureCollection = topojson.feature(topojsonData, topojsonData.objects[objectName]);
      if (geojsonFeatureCollection && geojsonFeatureCollection.features && geojsonFeatureCollection.features.length > 0) {
        polygonGeoJSON = geojsonFeatureCollection.features[0].geometry;
      } else {
        return res.status(400).json({ error: "Não foi possível extrair geometria do TopoJSON." });
      }
    } else {
      return res.status(400).json({ error: "Formato de geometria inválido. Esperado TopoJSON." });
    }

    if (!polygonGeoJSON) {
      return res.status(400).json({ error: "Nenhuma geometria válida para salvar." });
    }

    // --- A MUDANÇA PRINCIPAL ESTÁ AQUI ---
    // 1. Converte o objeto GeoJSON para uma string de texto WKT.
    const wktString = wkt.stringify(polygonGeoJSON);

    // 2. Usa a função ST_GeomFromText do PostGIS, que é mais robusta.
    // O sequelize.fn chama a função do banco de dados de forma segura.
    const areaGeom = sequelize.fn('ST_GeomFromText', wktString, 4326);
    // --- FIM DA MUDANÇA ---

    const now = new Date();
    const novo = await PoligonoTerreno.create({
      idimovel,
      area: areaGeom, // Salva o resultado da função do banco de dados
      usercreated,
      usermodified,
      datecreated: now,
      datemodified: now
    });
    res.status(201).json(novo);

  } catch (error) {
    console.error("Erro ao criar polígono:", error);
    // Verifica se é um erro do PostGIS para dar uma mensagem mais clara
    if (error.message.includes('parse error')) {
        return res.status(400).json({ error: 'Erro de formatação na geometria. Verifique os dados do polígono.' });
    }
    res.status(400).json({ error: error.message });
  }
});


// ===================================================================
// ROTA DE ATUALIZAÇÃO (PUT) - CORRIGIDA
// ===================================================================
router.put("/:id", async (req, res) => {
  try {
    const { geometria, formato, usermodified } = req.body;
    let polygonGeoJSON;

    if (formato === 'TopoJSON' && geometria) {
        const topojsonData = JSON.parse(geometria);
        const objectName = Object.keys(topojsonData.objects)[0];
        if (!objectName) return res.status(400).json({ error: "TopoJSON inválido." });
  
        const geojsonFeatureCollection = topojson.feature(topojsonData, topojsonData.objects[objectName]);
        if (geojsonFeatureCollection && geojsonFeatureCollection.features && geojsonFeatureCollection.features.length > 0) {
          polygonGeoJSON = geojsonFeatureCollection.features[0].geometry;
        } else {
          return res.status(400).json({ error: "Não foi possível extrair geometria do TopoJSON." });
        }
    } else {
        return res.status(400).json({ error: "Formato de geometria inválido. Esperado TopoJSON." });
    }

    if (!polygonGeoJSON) {
      return res.status(400).json({ error: "Nenhuma geometria válida para salvar." });
    }

    // --- MESMA MUDANÇA APLICADA AQUI ---
    const wktString = wkt.stringify(polygonGeoJSON);
    const areaGeom = sequelize.fn('ST_GeomFromText', wktString, 4326);
    // --- FIM DA MUDANÇA ---

    const now = new Date();
    await PoligonoTerreno.update(
      { area: areaGeom, usermodified, datemodified: now },
      { where: { id: req.params.id } }
    );
    res.json(await PoligonoTerreno.findByPk(req.params.id));
  } catch (error) {
    console.error("Erro ao atualizar polígono:", error);
    if (error.message.includes('parse error')) {
        return res.status(400).json({ error: 'Erro de formatação na geometria. Verifique os dados do polígono.' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Remove polígono
router.delete("/:id", async (req, res) => {
  await PoligonoTerreno.destroy({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

module.exports = router;