const express = require("express");
const db = require('../models/index.js');
const { PoligonoTerreno, sequelize } = db;
const topojson = require("topojson-client");

const router = express.Router();

// Função para extrair a geometria e converter (VERSÃO CORRIGIDA)
const getGeometryFromRequest = (body) => {
    const { geometria, formato } = body;

    if (formato !== 'TopoJSON' || !geometria) {
        throw new Error("Formato de geometria inválido. Esperado TopoJSON.");
    }
    
    // 1. Parseia a string TopoJSON recebida do frontend
    const topology = JSON.parse(geometria);
    const objectName = "collection"; 

    // 2. Valida se a topologia e o objeto 'collection' existem
    if (!topology.objects || !topology.objects[objectName]) {
        throw new Error("TopoJSON inválido: não contém o objeto 'collection' esperado.");
    }

    // --- A CORREÇÃO PRINCIPAL ESTÁ AQUI ---
    // 3. Extrai o objeto específico que queremos converter
    const objectToConvert = topology.objects[objectName];

    // 4. Converte o objeto para GeoJSON usando a topologia completa.
    // A função `topojson.feature` recebe a topologia inteira e o objeto específico a ser convertido.
    const geojsonFeatureCollection = topojson.feature(topology, objectToConvert);
    // --- FIM DA CORREÇÃO ---
    
    // 5. Valida o resultado da conversão
    if (geojsonFeatureCollection && geojsonFeatureCollection.features && geojsonFeatureCollection.features.length > 0) {
        const firstGeometry = geojsonFeatureCollection.features[0].geometry;
        if (firstGeometry) {
            return firstGeometry; // Retorna a geometria GeoJSON, que o PostGIS entende.
        }
    }
    
    // Se chegou aqui, a conversão falhou
    throw new Error("Não foi possível extrair uma geometria válida do TopoJSON.");
};


router.get("/", async (req, res) => res.json(await PoligonoTerreno.findAll()));
router.get("/:id", async (req, res) => res.json(await PoligonoTerreno.findByPk(req.params.id)));
router.get("/imovel/:idimovel", async (req, res) => res.json(await PoligonoTerreno.findAll({ where: { idimovel: req.params.idimovel } })));


// ROTA DE CRIAÇÃO (POST) - Sem alterações aqui
router.post("/", async (req, res) => {
  try {
    const { idimovel, usercreated, usermodified } = req.body;
    // A função corrigida agora retorna um GeoJSON padrão
    const polygonGeoJSON = getGeometryFromRequest(req.body);

    // Usamos a função do PostGIS para converter o GeoJSON para um tipo geometry
    const areaGeom = sequelize.fn('dbo.ST_GeomFromGeoJSON', JSON.stringify(polygonGeoJSON));

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
    // Log do erro real no servidor para depuração
    console.error("Erro detalhado ao criar polígono:", error); 
    // Envia uma mensagem de erro genérica para o cliente
    res.status(400).json({ error: error.message });
  }
});

// ROTA DE ATUALIZAÇÃO (PUT) - Aplicando a mesma lógica
router.put("/:id", async (req, res) => {
  try {
    const { usermodified } = req.body;
    const polygonGeoJSON = getGeometryFromRequest(req.body);

    const areaGeom = sequelize.fn('dbo.ST_GeomFromGeoJSON', JSON.stringify(polygonGeoJSON));

    const now = new Date();
    await PoligonoTerreno.update(
      { area: areaGeom, usermodified, datemodified: now },
      { where: { id: req.params.id } }
    );
    res.json(await PoligonoTerreno.findByPk(req.params.id));
  } catch (error) {
    console.error("Erro detalhado ao atualizar polígono:", error);
    res.status(400).json({ error: error.message });
  }
});


// Suas outras rotas (DELETE) podem continuar como estão
router.delete("/:id", async (req, res) => {
  await PoligonoTerreno.destroy({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

module.exports = router;