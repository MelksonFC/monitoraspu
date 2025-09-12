const express = require("express");
const db = require('../models/index.js');
const { PoligonoTerreno, sequelize } = db;
const topojson = require("topojson-client");

const router = express.Router();

/**
 * Extrai e converte a geometria TopoJSON da requisição para um objeto GeoJSON.
 * Esta versão é robusta e lida com diferentes estruturas de GeoJSON resultantes.
 * @param {object} body - O corpo da requisição express.
 * @returns {object} A geometria no formato GeoJSON, pronta para ser usada pelo PostGIS.
 * @throws {Error} Se a geometria não puder ser extraída ou convertida.
 */
const getGeometryFromRequest = (body) => {
    const { geometria, formato } = body;

    if (formato !== 'TopoJSON' || !geometria) {
        throw new Error("Formato de geometria inválido. O corpo da requisição deve conter 'formato: \"TopoJSON\"' e a 'geometria'.");
    }
    
    // 1. Parseia a string TopoJSON recebida do frontend.
    const topology = JSON.parse(geometria);
    const objectName = "collection"; 

    // 2. Valida se a topologia e o objeto 'collection' existem.
    if (!topology || !topology.objects || !topology.objects[objectName]) {
        throw new Error("TopoJSON inválido: não contém o objeto 'objects.collection' esperado.");
    }

    // 3. Extrai o objeto específico ('collection') que queremos converter.
    const objectToConvert = topology.objects[objectName];

    // 4. Converte o objeto TopoJSON para GeoJSON.
    // A função `topojson.feature` pode retornar uma Feature ou uma FeatureCollection.
    const geojsonResult = topojson.feature(topology, objectToConvert);
    
    // 5. Extrai a geometria do resultado da conversão, tratando ambos os casos.
    if (geojsonResult) {
        // Caso A: O resultado é uma FeatureCollection.
        if (geojsonResult.type === 'FeatureCollection' && geojsonResult.features.length > 0) {
            const firstGeometry = geojsonResult.features[0].geometry;
            if (firstGeometry) {
                return firstGeometry; // Retorna a geometria da primeira feature.
            }
        }
        // Caso B: O resultado é uma única Feature.
        else if (geojsonResult.type === 'Feature' && geojsonResult.geometry) {
            return geojsonResult.geometry; // Retorna a geometria da feature.
        }
    }
     // --- LOG DE DEBUG ADICIONADO ---
    console.error("DEBUG: Falha na conversão de TopoJSON para GeoJSON.");
    console.error("DEBUG: TopoJSON recebido:", JSON.stringify(topology, null, 2));
    console.error("DEBUG: Resultado da conversão (geojsonResult):", JSON.stringify(geojsonResult, null, 2));
    // --- FIM DO LOG ---
    // Se chegou até aqui, a conversão falhou ou resultou em um objeto vazio.
    throw new Error("Não foi possível extrair uma geometria válida do TopoJSON após a conversão.");
};


// --- ROTAS DA API ---

router.get("/", async (req, res) => res.json(await PoligonoTerreno.findAll()));

router.get("/:id", async (req, res) => res.json(await PoligonoTerreno.findByPk(req.params.id)));

router.get("/imovel/:idimovel", async (req, res) => {
    const poligonos = await PoligonoTerreno.findAll({ where: { idimovel: req.params.idimovel } });
    res.json(poligonos);
});

// Rota para criar um novo polígono
router.post("/", async (req, res) => {
  try {
    const { idimovel, usercreated, usermodified } = req.body;
    
    // A função robusta extrai a geometria no formato GeoJSON padrão.
    const polygonGeoJSON = getGeometryFromRequest(req.body);

    // Usa a função do PostGIS para converter o objeto GeoJSON para o tipo 'geometry' do banco.
    const areaGeom = sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(polygonGeoJSON));

    const now = new Date();
    const novoPoligono = await PoligonoTerreno.create({
      idimovel,
      area: areaGeom,
      usercreated,
      usermodified,
      datecreated: now,
      datemodified: now
    });
    res.status(201).json(novoPoligono);

  } catch (error) {
    console.error("Erro detalhado ao criar polígono:", error); 
    res.status(400).json({ error: `Falha ao criar polígono: ${error.message}` });
  }
});

// Rota para atualizar um polígono existente
router.put("/:id", async (req, res) => {
  try {
    const { usermodified } = req.body;
    const polygonGeoJSON = getGeometryFromRequest(req.body);

    const areaGeom = sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(polygonGeoJSON));

    const now = new Date();
    const [updateCount] = await PoligonoTerreno.update(
      { area: areaGeom, usermodified, datemodified: now },
      { where: { id: req.params.id } }
    );

    if (updateCount === 0) {
        return res.status(404).json({ error: "Polígono não encontrado." });
    }

    res.json(await PoligonoTerreno.findByPk(req.params.id));
  } catch (error) {
    console.error("Erro detalhado ao atualizar polígono:", error);
    res.status(400).json({ error: `Falha ao atualizar polígono: ${error.message}` });
  }
});

// Rota para deletar um polígono
router.delete("/:id", async (req, res) => {
  const deleted = await PoligonoTerreno.destroy({ where: { id: req.params.id } });
  if (deleted) {
      res.status(200).json({ message: "Polígono deletado com sucesso." });
  } else {
      res.status(404).json({ error: "Polígono não encontrado." });
  }
});

module.exports = router;