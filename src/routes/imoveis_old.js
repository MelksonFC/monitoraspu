'use strict';

const express = require("express");
const multer = require("multer");
const { Imovel, Municipio, Estado, Imagem, UnidadeGestora, RegimeUtilizacao, HstUnidadeGestora, HstRegimeUtilizacao } = require("../models");
const sequelize = require("../models/sequelize");
const { Op } = require("sequelize");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ROTA PARA O MAPA - GET /api/imoveis/com-relacoes - ATUALIZADA COM FILTROS AVANÇADOS
router.get('/com-relacoes', async (req, res) => {
  try {
    const {
      municipioId,
      estadoId,
      regimes,
      unidadesGestoras,
      matricula,
      ripImovel,
      ripUtilizacao,
      dataInicio,
      dataFim,
      tipoData, // Será 'avaliacao' ou 'fiscalizacao'
    } = req.query;

    const whereClause = {};
    
    // ... (Filtros de Localização, Múltipla Escolha e Texto continuam iguais) ...
    if (municipioId) whereClause.idmunicipio = municipioId;
    else if (estadoId) whereClause.idestado = estadoId;
    if (regimes) whereClause.idregimeutilizacao = { [Op.in]: regimes.split(',') };
    if (unidadesGestoras) whereClause.idunidadegestora = { [Op.in]: unidadesGestoras.split(',') };
    if (matricula) whereClause.matricula = { [Op.iLike]: `%${matricula}%` };
    if (ripImovel) whereClause.ripimovel = { [Op.iLike]: `%${ripImovel}%` };
    if (ripUtilizacao) whereClause.riputilizacao = { [Op.iLike]: `%${ripUtilizacao}%` };
    
    // MUDANÇA: Lógica condicional para o filtro de data
    if (dataInicio && dataFim && tipoData) {
      const dateRange = { [Op.between]: [dataInicio, dataFim] };
      
      // IMPORTANTE: Verifique se os nomes das colunas abaixo correspondem ao seu banco de dados!
      if (tipoData === 'avaliacao') {
        whereClause.data_ultima_avaliacao = dateRange;
      } else if (tipoData === 'fiscalizacao') {
        whereClause.data_ultima_fiscalizacao = dateRange;
      }
    }

    const imoveis = await Imovel.findAll({
      where: whereClause,
      // ... (includes e attributes continuam iguais) ...
      include: [
        { model: Municipio, as: 'Municipio', attributes: ['nome'] },
        { model: Estado, as: 'Estado', attributes: ['uf'] },
        { model: Imagem, as: 'imagens', attributes: ['imagem', 'isdefault'], where: { isdefault: '1' }, required: false },
        { model: UnidadeGestora, as: 'UnidadeGestora', attributes: ['nome'] },
        { model: RegimeUtilizacao, as: 'RegimeUtilizacao', attributes: ['descricao'] }
      ],
      attributes: [ 'idimovel', 'nome', 'matricula', 'valorimovel', 'ripimovel', 'riputilizacao', 
        'endereco', 'numero', 'cep', 'latitude', 'longitude', 'complemento' ]
    });

    // ... (lógica de conversão de imagem para Base64 continua a mesma) ...
    const imoveisComUrlDeImagem = imoveis.map(imovel => {
      const imovelJson = imovel.toJSON();
      if (imovelJson.imagens && imovelJson.imagens.length > 0) {
        const imagemDefault = imovelJson.imagens[0];
        if (imagemDefault.imagem && imagemDefault.imagem.length > 0) {
          imagemDefault.url = `data:image/jpeg;base64,${Buffer.from(imagemDefault.imagem).toString('base64')}`;
          delete imagemDefault.imagem;
        }
      }
      return imovelJson;
    });

    res.status(200).json(imoveisComUrlDeImagem);

  } catch (error) {
    console.error("ERRO AO BUSCAR IMÓVEIS COM RELAÇÕES:", error);
    res.status(500).json({ error: "Ocorreu um erro no servidor ao buscar os dados dos imóveis.", details: error.message });
  }
});


// Vou omitir o resto para ser breve, mas ele continua igual ao que você me enviou.
router.get("/", async (req, res) => {
  try {
    const imoveis = await Imovel.findAll({
      include: [{ 
        model: Imagem, 
        as: 'imagens', 
        attributes: ['id', 'ordem', 'imagem', 'isdefault', 'nomearquivo'] 
      }],
      order: [['idimovel', 'ASC'], [{ model: Imagem, as: 'imagens' }, 'ordem', 'ASC']]
    });
    const imoveisComImagensBase64 = imoveis.map(imovel => {
      const imovelJson = imovel.toJSON();
      if (imovelJson.imagens && Array.isArray(imovelJson.imagens)) {
        imovelJson.imagens = imovelJson.imagens.map(imagem => {
          if (imagem.imagem && imagem.imagem.length > 0) {
            return {
              ...imagem,
              url: `data:image/jpeg;base64,${Buffer.from(imagem.imagem).toString('base64')}`
            };
          }
          return imagem;
        });
      }
      return imovelJson;
    });
    res.json(imoveisComImagensBase64);
  } catch (err) {
    console.error("[BACKEND] Erro ao buscar imóveis:", err);
    res.status(500).json({ error: "Falha ao buscar imóveis." });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const imovel = await Imovel.findByPk(id, {
      include: [{
        model: Imagem,
        as: 'imagens',
        attributes: ['id', 'ordem', 'imagem', 'isdefault', 'nomearquivo']
      }],
      order: [[{ model: Imagem, as: 'imagens' }, 'ordem', 'ASC']]
    });

    if (imovel) {
      const imovelJson = imovel.toJSON();
      if (imovelJson.imagens && Array.isArray(imovelJson.imagens)) {
        imovelJson.imagens = imovelJson.imagens.map(imagem => {
          if (imagem.imagem && imagem.imagem.length > 0) {
            return {
              ...imagem,
              url: `data:image/jpeg;base64,${Buffer.from(imagem.imagem).toString('base64')}`
            };
          }
          delete imagem.imagem; 
          return imagem;
        });
      }
      res.json(imovelJson);
    } else {
      res.status(404).json({ error: "Imóvel não encontrado." });
    }
  } catch (error) {
    console.error("Erro ao buscar imóvel por ID:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});
router.post("/", upload.array('files'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const imovelData = JSON.parse(req.body.imovelData);
    const { imagens, ...dadosPrincipaisImovel } = imovelData;
    
    const newImovel = await Imovel.create(dadosPrincipaisImovel, { transaction: t });

    const hoje = new Date();
    if (dadosPrincipaisImovel.idunidadegestora) {
      await HstUnidadeGestora.create({
        idimovel: newImovel.idimovel,
        idunidadegestora: dadosPrincipaisImovel.idunidadegestora,
        dtinicio: hoje,
        usercreated: dadosPrincipaisImovel.usercreated,
        usermodified: dadosPrincipaisImovel.usercreated
      }, { transaction: t });
    }
    if (dadosPrincipaisImovel.idregimeutilizacao) {
      await HstRegimeUtilizacao.create({
        idimovel: newImovel.idimovel,
        idregimeutilizacao: dadosPrincipaisImovel.idregimeutilizacao,
        dtinicio: hoje,
        usercreated: dadosPrincipaisImovel.usercreated,
        usermodified: dadosPrincipaisImovel.usercreated
      }, { transaction: t });
    }

    if (req.files && req.files.length > 0) {
      const imagensParaCriar = req.files.map(file => {
        const imgInfo = imagens.find(img => img.isNew && img.nomearquivo === file.originalname);
        return imgInfo ? {
            idimovel: newImovel.idimovel,
            nomearquivo: file.originalname,
            imagem: file.buffer,
            ordem: imgInfo.ordem,
            isdefault: imgInfo.isdefault || false,
            usercreated: imovelData.usercreated,
            usermodified: imovelData.usermodified,
        } : null;
      }).filter(img => img !== null);

      if (imagensParaCriar.length > 0) {
        await Imagem.bulkCreate(imagensParaCriar, { transaction: t });
      }
    }

    await t.commit();
    const imovelCompleto = await Imovel.findByPk(newImovel.idimovel, { include: ['imagens'] });
    res.status(201).json(imovelCompleto);
  } catch (err) {
    await t.rollback();
    console.error("--- [BACKEND-POST] ERRO AO CRIAR IMÓVEL ---", err);
    res.status(500).json({ error: "Falha ao criar imóvel.", details: err.message });
  }
});
router.put("/:id", upload.array('files'), async (req, res) => {
    const { id } = req.params;
    const t = await sequelize.transaction();
    try {
        const imovelData = JSON.parse(req.body.imovelData);
        const imagensRemover = JSON.parse(req.body.imagensRemover || "[]");
        const { imagens, ...dadosPrincipaisImovel } = imovelData;
        const hoje = new Date();

        const imovelAtual = await Imovel.findByPk(id, { transaction: t });
        if (!imovelAtual) {
            await t.rollback();
            return res.status(404).json({ error: "Imóvel não encontrado para atualização." });
        }

        if (dadosPrincipaisImovel.idunidadegestora !== imovelAtual.idunidadegestora) {
            await HstUnidadeGestora.update(
                { dtfim: hoje, usermodified: imovelData.usermodified },
                { where: { idimovel: id, dtfim: null }, transaction: t }
            );
            await HstUnidadeGestora.create({
                idimovel: id,
                idunidadegestora: dadosPrincipaisImovel.idunidadegestora,
                dtinicio: hoje,
                usercreated: imovelData.usermodified,
                usermodified: imovelData.usermodified
            }, { transaction: t });
        }

        if (dadosPrincipaisImovel.idregimeutilizacao !== imovelAtual.idregimeutilizacao) {
            await HstRegimeUtilizacao.update(
                { dtfim: hoje, usermodified: imovelData.usermodified },
                { where: { idimovel: id, dtfim: null }, transaction: t }
            );
            await HstRegimeUtilizacao.create({
                idimovel: id,
                idregimeutilizacao: dadosPrincipaisImovel.idregimeutilizacao,
                dtinicio: hoje,
                usercreated: imovelData.usermodified,
                usermodified: imovelData.usermodified
            }, { transaction: t });
        }

        await Imovel.update(dadosPrincipaisImovel, { where: { idimovel: id }, transaction: t });

        if (imagensRemover.length > 0) {
            await Imagem.destroy({ where: { id: { [Op.in]: imagensRemover } }, transaction: t });
        }
        
        const imagensExistentes = imagens.filter(img => img.id && !img.isNew);
        for (const img of imagensExistentes) {
            await Imagem.update(
                { ordem: img.ordem, isdefault: img.isdefault || false },
                { where: { id: img.id }, transaction: t }
            );
        }

        if (req.files && req.files.length > 0) {
            const imagensParaCriar = req.files.map(file => {
                const imgInfo = imagens.find(img => img.isNew && img.nomearquivo === file.originalname);
                return imgInfo ? {
                    idimovel: id,
                    nomearquivo: file.originalname,
                    imagem: file.buffer,
                    ordem: imgInfo.ordem,
                    isdefault: imgInfo.isdefault || false,
                    usercreated: imovelData.usermodified,
                    usermodified: imovelData.usermodified,
                } : null;
            }).filter(img => img !== null);

            if (imagensParaCriar.length > 0) {
                await Imagem.bulkCreate(imagensParaCriar, { transaction: t });
            }
        }
        
        await t.commit();
        const imovelAtualizado = await Imovel.findByPk(id, { include: [{ model: Imagem, as: 'imagens' }] });
        res.json(imovelAtualizado);

    } catch (err) {
        await t.rollback();
        console.error(`--- [BACKEND-PUT] ERRO AO ATUALIZAR IMÓVEL ${id} ---`, err);
        res.status(500).json({ error: "Falha ao atualizar imóvel.", details: err.message });
    }
});
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const t = await sequelize.transaction();
    try {
        await Imagem.destroy({ where: { idimovel: id }, transaction: t });
        await HstUnidadeGestora.destroy({ where: { idimovel: id }, transaction: t });
        await HstRegimeUtilizacao.destroy({ where: { idimovel: id }, transaction: t });
        
        const result = await Imovel.destroy({ where: { idimovel: id }, transaction: t });
        
        if (result === 0) {
            await t.rollback();
            return res.status(404).json({ error: "Imóvel não encontrado." });
        }
        
        await t.commit();
        res.status(204).send();
    } catch (err) {
        await t.rollback();
        console.error(`[BACKEND] Erro ao excluir imóvel ${id}:`, err);
        res.status(500).json({ error: "Falha ao excluir imóvel.", details: err.message });
    }
});

module.exports = router;