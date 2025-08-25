'use strict';
const express = require("express");
const { Op } = require("sequelize");
const { Pais, Estado, Municipio, UnidadeGestora, RegimeUtilizacao, Imovel } = require("../models");

const router = express.Router();

// GET /api/lookups/paises-com-imoveis
router.get('/paises-com-imoveis', async (req, res) => {
    try {
        const paises = await Pais.findAll({
            attributes: ['idpais', 'nome'],
            include: [{
                model: Estado,
                attributes: [],
                required: true,
                include: [{
                    model: Municipio,
                    attributes: [],
                    required: true,
                    include: [{ model: Imovel, attributes: [], required: true }]
                }]
            }],
            // --- CORREÇÃO FINAL: Usando os nomes dos atributos do modelo ---
            group: ['Pais.idpais'],
            order: [['nome', 'ASC']]
        });
        res.json(paises);
    } catch (err) {
        console.error("ERRO EM /paises-com-imoveis:", err);
        res.status(500).json({ message: "Erro ao buscar países com imóveis.", error: err.message });
    }
});

// GET /api/lookups/estados-com-imoveis?paisId=1
router.get('/estados-com-imoveis', async (req, res) => {
    const { paisId } = req.query;
    if (!paisId) return res.status(400).json({ message: 'O ID do país é obrigatório.' });
    try {
        const estados = await Estado.findAll({
            attributes: ['idestado', 'nome'],
            where: { idpais: paisId },
            include: [{
                model: Municipio,
                attributes: [],
                required: true,
                include: [{ model: Imovel, attributes: [], required: true }]
            }],
            // --- CORREÇÃO FINAL: Usando os nomes dos atributos do modelo ---
            group: ['Estado.idestado'],
            order: [['nome', 'ASC']]
        });
        res.json(estados);
    } catch (err) {
        console.error("ERRO EM /estados-com-imoveis:", err);
        res.status(500).json({ message: "Erro ao buscar estados com imóveis.", error: err.message });
    }
});

// GET /api/lookups/municipios-com-imoveis?estadoId=5
router.get('/municipios-com-imoveis', async (req, res) => {
    const { estadoId } = req.query;
    if (!estadoId) return res.status(400).json({ message: 'O ID do estado é obrigatório.' });
    try {
        const municipios = await Municipio.findAll({
            attributes: ['idmunicipio', 'nome'],
            where: { idestado: estadoId },
            include: [{
                model: Imovel,
                attributes: [],
                required: true
            }],
            // --- CORREÇÃO FINAL: Usando os nomes dos atributos do modelo ---
            group: ['Municipio.idmunicipio'],
            order: [['nome', 'ASC']]
        });
        res.json(municipios);
    } catch (err) {
        console.error("ERRO EM /municipios-com-imoveis:", err);
        res.status(500).json({ message: "Erro ao buscar municípios com imóveis.", error: err.message });
    }
});


// Rotas que não precisam de verificação e podem continuar como estão
router.get('/unidades-gestoras', async (req, res) => {
    try {
        const ugs = await UnidadeGestora.findAll({ order: [['nome', 'ASC']] });
        res.json(ugs);
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar unidades gestoras.", error: err.message });
    }
});

router.get('/regimes-utilizacao', async (req, res) => {
    try {
        const regimes = await RegimeUtilizacao.findAll({ order: [['descricao', 'ASC']] });
        res.json(regimes);
    } catch (err)
        {
        res.status(500).json({ message: "Erro ao buscar regimes de utilização.", error: err.message });
    }
});

module.exports = router;