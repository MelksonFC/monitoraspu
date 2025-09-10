'use strict';

const express = require("express");
const sequelize = require("../models/sequelize.js");
const { Op } = require("sequelize");
const db = require('../models/index.js');
const multer = require("multer");
const { Imovel, Municipio, Estado, Imagem, UnidadeGestora, RegimeUtilizacao, HstUnidadeGestora, HstRegimeUtilizacao } = db;

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Corrige o problema de encoding no nome do arquivo
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, true);
  }
});

// FUNÇÃO DE SANITIZAÇÃO ADICIONADA AQUI
function sanitizeFilename(filename) {
  if (!filename) return "";
  // Converte para NFD (Normalization Form D), onde os acentos são separados dos caracteres
  // e depois remove os caracteres de acentuação (range U+0300 a U+036f)
  const withoutAccents = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Remove caracteres especiais, mantendo apenas letras, números, pontos, hífens e underscores
  // e substitui espaços por underscore
  const sanitized = withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  return sanitized;
}

const parseCurrencyToFloat = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  
  const withoutDots = value.replace(/\./g, '');
  const withDotAsDecimal = withoutDots.replace(',', '.');
  const floatValue = parseFloat(withDotAsDecimal);

  return isNaN(floatValue) ? null : floatValue;
};

// Função para processar todos os campos monetários de um objeto
const processMonetaryFields = (data) => {
  const fieldsToProcess = ['valorimovel', 'areaconstruida', 'areaterreno'];
  
  const processedData = {...data}; 
  
  for (const field of fieldsToProcess) {
    if (processedData[field] !== undefined) {
      processedData[field] = parseCurrencyToFloat(processedData[field]);
    }
  }
  
  return processedData;
};

/*async function isMatriculaDuplicada(matricula, idimovel = null) {
  const where = { matricula };
  if (idimovel) where.idimovel = { [Op.ne]: idimovel };
  const found = await Imovel.findOne({ where });
  return !!found;
}*/

async function isRipUtilizacaoDuplicada(riputilizacao, ripimovel, idimovel = null) {
  const where = { riputilizacao, ripimovel };
  if (idimovel) where.idimovel = { [Op.ne]: idimovel };
  const found = await Imovel.findOne({ where });
  return !!found;
}

async function isNProcessoDuplicado(nprocesso, idimovel = null) {
  const where = { nprocesso };
  if (idimovel) where.idimovel = { [Op.ne]: idimovel };
  const found = await Imovel.findOne({ where });
  return !!found;
}

// Restrições de arquivo
const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];


// ROTA PARA O MAPA - GET /api/imoveis/com-relacoes - ATUALIZADA COM FILTROS AVANÇADOS
router.get('/com-relacoes', async (req, res) => {
  try {
    const {
      pais, estado, municipio, unidades, regimes, matricula,
      ripImovel, ripUtilizacao, tipoData, dataInicio, dataFim
    } = req.query;

    // --- INÍCIO DA CORREÇÃO ---

    // 1. Cláusula WHERE para o modelo principal (Imovel)
    const imovelWhere = {};
    if (matricula) imovelWhere.matricula = { [Op.iLike]: `%${matricula}%` };
    if (ripImovel) imovelWhere.ripimovel = { [Op.iLike]: `%${ripImovel}%` };
    if (ripUtilizacao) imovelWhere.riputilizacao = { [Op.iLike]: `%${ripUtilizacao}%` }; // Assumindo que esta coluna está no Imovel
    
    // Adiciona o filtro de município diretamente, pois é uma chave estrangeira no Imovel
    if (municipio) imovelWhere.idmunicipio = municipio;

    // 2. Cláusulas WHERE para os modelos incluídos (JOINs)
    const estadoWhere = {};
    if (estado && !municipio) estadoWhere.idestado = estado; // Só aplica se não houver filtro de município
    if (pais && !estado && !municipio) estadoWhere.idpais = pais; // Só aplica se não houver filtro de estado/município

    const unidadeGestoraWhere = {};
    if (unidades) unidadeGestoraWhere.id = { [Op.in]: unidades.split(',') };

    const regimeUtilizacaoWhere = {};
    if (regimes) regimeUtilizacaoWhere.id = { [Op.in]: regimes.split(',') };
    
    // 3. Filtro de data
    if (dataInicio && dataFim && tipoData) {
      const dateRange = { [Op.between]: [new Date(dataInicio), new Date(dataFim)] };
      // Verifique se os nomes das colunas estão corretos no seu BD
      if (tipoData === 'avaliacao') imovelWhere.data_ultima_avaliacao = dateRange;
      if (tipoData === 'fiscalizacao') imovelWhere.data_ultima_fiscalizacao = dateRange;
    }

    // --- FIM DA CORREÇÃO ---

    const imoveis = await Imovel.findAll({
      // --- MUDANÇA: Aplica a cláusula where principal ---
      where: imovelWhere,
      
      // --- MUDANÇA: Adiciona as cláusulas where e required:true nos includes ---
      include: [
        {
          model: Municipio,
          as: 'Municipio',
          attributes: ['nome'],
          // O include de Estado agora fica aninhado dentro de Município
          include: [{
            model: Estado,
            as: 'Estado',
            attributes: ['uf'],
            where: Object.keys(estadoWhere).length > 0 ? estadoWhere : undefined,
            required: Object.keys(estadoWhere).length > 0
          }],
          // Required: true se o filtro de Estado ou País estiver ativo, forçando o JOIN
          required: Object.keys(estadoWhere).length > 0
        },
        {
          model: Imagem,
          as: 'imagens',
          attributes: ['imagem', 'isdefault'],
          where: { isdefault: '1' },
          required: false // Mantém como LEFT JOIN para imóveis sem imagem
        },
        {
          model: UnidadeGestora,
          as: 'UnidadeGestora',
          attributes: ['nome'],
          where: Object.keys(unidadeGestoraWhere).length > 0 ? unidadeGestoraWhere : undefined,
          required: Object.keys(unidadeGestoraWhere).length > 0
        },
        {
          model: RegimeUtilizacao,
          as: 'RegimeUtilizacao',
          attributes: ['descricao'],
          where: Object.keys(regimeUtilizacaoWhere).length > 0 ? regimeUtilizacaoWhere : undefined,
          required: Object.keys(regimeUtilizacaoWhere).length > 0
        }
      ],
      attributes: [ 'idimovel', 'nome', 'matricula', 'valorimovel', 'ripimovel', 'riputilizacao', 
        'endereco', 'numero', 'cep', 'latitude', 'longitude', 'complemento' ],
      order: [['nome', 'ASC']] // Adicionado para consistência
    });

    // Sua lógica de conversão de imagem para Base64 (MANTIDA)
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
    res.status(500).json({ error: "Erro ao buscar imóveis.", details: error.message });
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

    const dadosProcessados = processMonetaryFields(dadosPrincipaisImovel);

    // === VALIDAÇÃO DE CAMPOS DUPLICADOS ===
    /*if (await isMatriculaDuplicada(dadosPrincipaisImovel.matricula)) {
      await t.rollback();
      return res.status(400).json({ error: "Matrícula já cadastrada." });
    }*/
    if (await isRipUtilizacaoDuplicada(dadosPrincipaisImovel.riputilizacao, dadosPrincipaisImovel.ripimovel)) {
      await t.rollback();
      return res.status(400).json({ error: "RIP Utilização já existe para esse RIP Imóvel." });
    }
    if (dadosPrincipaisImovel.nprocesso && await isNProcessoDuplicado(dadosPrincipaisImovel.nprocesso)) {
      await t.rollback();
      return res.status(400).json({ error: "Número de Processo já cadastrado." });
    }
    // === FIM VALIDAÇÃO ===

    // === VALIDAÇÃO DE ARQUIVOS ===
    if (req.files && req.files.length > MAX_FILES) {
      await t.rollback();
      return res.status(400).json({ error: `Máximo de ${MAX_FILES} fotos permitidas.` });
    }
    for (const file of req.files) {
      if (!ALLOWED_TYPES.includes(file.mimetype) || file.size > MAX_SIZE) {
        await t.rollback();
        return res.status(400).json({ error: "Apenas arquivos JPEG, JPG, PNG, GIF de até 10MB são permitidos." });
      }
    }
    // === FIM DA VALIDAÇÃO DE ARQUIVOS ===

    const newImovel = await Imovel.create(dadosProcessados, { transaction: t });

    // ... resto igual ...
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
        const sanitizedName = sanitizeFilename(file.originalname);
        return imgInfo ? {
            idimovel: newImovel.idimovel,
            nomearquivo: sanitizedName,
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

        const dadosProcessados = processMonetaryFields(dadosPrincipaisImovel);

        // === VALIDAÇÃO DE CAMPOS DUPLICADOS ===
        /*if (await isMatriculaDuplicada(dadosPrincipaisImovel.matricula, id)) {
          await t.rollback();
          return res.status(400).json({ error: "Matrícula já cadastrada." });
        }*/
        if (await isRipUtilizacaoDuplicada(dadosPrincipaisImovel.riputilizacao, dadosPrincipaisImovel.ripimovel, id)) {
          await t.rollback();
          return res.status(400).json({ error: "RIP Utilização já existe para esse RIP Imóvel." });
        }
        if (dadosPrincipaisImovel.nprocesso && await isNProcessoDuplicado(dadosPrincipaisImovel.nprocesso, id)) {
          await t.rollback();
          return res.status(400).json({ error: "Número de Processo já cadastrado." });
        }
        // === FIM VALIDAÇÃO ===

        // === VALIDAÇÃO DE ARQUIVOS ===
        if (req.files && req.files.length > MAX_FILES) {
          await t.rollback();
          return res.status(400).json({ error: `Máximo de ${MAX_FILES} fotos permitidas.` });
        }
        for (const file of req.files) {
          if (!ALLOWED_TYPES.includes(file.mimetype) || file.size > MAX_SIZE) {
            await t.rollback();
            return res.status(400).json({ error: "Apenas arquivos JPEG, JPG, PNG, GIF de até 10MB são permitidos." });
          }
        }
        // === FIM DA VALIDAÇÃO DE ARQUIVOS ===

        const imovelAtual = await Imovel.findByPk(id, { transaction: t });
        if (!imovelAtual) {
            await t.rollback();
            return res.status(404).json({ error: "Imóvel não encontrado para atualização." });
        }

        // ... resto igual ...
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

        await Imovel.update(dadosProcessados, { where: { idimovel: id }, transaction: t });

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
                const sanitizedName = sanitizeFilename(file.originalname);
                return imgInfo ? {
                    idimovel: id,
                    nomearquivo: sanitizedName,
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