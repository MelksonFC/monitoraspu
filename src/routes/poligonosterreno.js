const express = require("express");
const db = require('../models/index.js');
const { PoligonoTerreno } = db;
const topojson = require("topojson-client");

const router = express.Router();

// Função de validação antiga (não será mais usada para TopoJSON)
function validaCoordenadas(coordinates) {
  // ... (código existente, mantido para retrocompatibilidade se necessário)
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

// ===================================================================
// ROTA DE CRIAÇÃO (POST) - ATUALIZADA
// ===================================================================
router.post("/", async (req, res) => {
  try {
    // Extrai os novos campos do body
    const { idimovel, geometria, formato, usercreated, usermodified } = req.body;
    let polygonToSave;

    // Verifica se o formato é TopoJSON (enviado pelo novo frontend)
    if (formato === 'TopoJSON' && geometria) {
      // 1. Parse da string TopoJSON para um objeto
      const topojsonData = JSON.parse(geometria);
      
      // 2. Extrai o nome do objeto principal do TopoJSON (geralmente o nome do arquivo original)
      const objectName = Object.keys(topojsonData.objects)[0];
      if (!objectName) {
        return res.status(400).json({ error: "Arquivo TopoJSON inválido: não contém objetos." });
      }

      // 3. Converte TopoJSON para GeoJSON (resulta em uma FeatureCollection)
      const geojsonFeatureCollection = topojson.feature(topojsonData, topojsonData.objects[objectName]);
      
      // 4. Extrai a geometria do primeiro "feature" da coleção
      // O banco espera apenas o objeto de geometria, não a "Feature" inteira.
      if (geojsonFeatureCollection && geojsonFeatureCollection.features && geojsonFeatureCollection.features.length > 0) {
        polygonToSave = geojsonFeatureCollection.features[0].geometry;
      } else {
        return res.status(400).json({ error: "Não foi possível extrair uma geometria válida do TopoJSON." });
      }

    } else {
      // Lógica antiga (fallback, caso ainda receba o formato de 'coordinates')
      const { coordinates } = req.body;
      const erro = validaCoordenadas(coordinates);
      if (erro) return res.status(400).json({ error: erro });
      polygonToSave = { type: "Polygon", coordinates: [coordinates] };
    }

    if (!polygonToSave) {
        return res.status(400).json({ error: "Nenhuma geometria válida para salvar." });
    }

    const now = new Date();
    const novo = await PoligonoTerreno.create({
      idimovel,
      area: polygonToSave, // Salva o objeto GeoJSON convertido
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
// ROTA DE ATUALIZAÇÃO (PUT) - ATUALIZADA
// ===================================================================
router.put("/:id", async (req, res) => {
  try {
    const { geometria, formato, usermodified } = req.body;
    let polygonToSave;

    if (formato === 'TopoJSON' && geometria) {
      const topojsonData = JSON.parse(geometria);
      const objectName = Object.keys(topojsonData.objects)[0];
      if (!objectName) return res.status(400).json({ error: "TopoJSON inválido." });
      
      const geojsonFeatureCollection = topojson.feature(topojsonData, topojsonData.objects[objectName]);
      
      if (geojsonFeatureCollection && geojsonFeatureCollection.features && geojsonFeatureCollection.features.length > 0) {
        polygonToSave = geojsonFeatureCollection.features[0].geometry;
      } else {
        return res.status(400).json({ error: "Não foi possível extrair geometria do TopoJSON." });
      }
    } else {
      const { coordinates } = req.body;
      const erro = validaCoordenadas(coordinates);
      if (erro) return res.status(400).json({ error: erro });
      polygonToSave = { type: "Polygon", coordinates: [coordinates] };
    }

    if (!polygonToSave) {
        return res.status(400).json({ error: "Nenhuma geometria válida para salvar." });
    }

    const now = new Date();
    await PoligonoTerreno.update(
      { area: polygonToSave, usermodified, datemodified: now },
      { where: { id: req.params.id } }
    );
    res.json(await PoligonoTerreno.findByPk(req.params.id));
  } catch (error) {
    console.error("Erro ao atualizar polígono:", error);
    res.status(400).json({ error: error.message });
  }
});

// Remove polígono
router.delete("/:id", async (req, res) => {
  await PoligonoTerreno.destroy({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

module.exports = router;