import express from "express";
import sequelize from "../models/sequelize.js";
import { Op } from "sequelize"; 
import { Avaliacao, Imovel } from '../models/index.js'; // Adicionado /index.js


const router = express.Router();

const parseCurrencyToFloat = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  
  const withoutDots = value.replace(/\./g, '');
  const withDotAsDecimal = withoutDots.replace(',', '.');
  const floatValue = parseFloat(withDotAsDecimal);

  return isNaN(floatValue) ? null : floatValue;
};


// GET (sem alterações na lógica principal)
router.get("/", async (req, res) => {
  const { idimovel } = req.query;
  const whereOptions = idimovel ? { where: { idimovel } } : {};
  try {
    const avaliacoes = await Avaliacao.findAll({ ...whereOptions, order: [['dataavaliacao', 'DESC']] });
    res.json(avaliacoes);
  } catch (error) {
    res.status(500).json({ error: "Falha ao buscar avaliações" });
  }
});

// POST - Criar nova avaliação (LÓGICA PRINCIPAL AQUI - COM CORREÇÃO)
router.post("/", async (req, res) => {
  console.log("Avaliacao POST body:", req.body);
  const { idimovel, novovalor, dataavaliacao, avaliador, observacoes, usercreated } = req.body;
  if (!idimovel || !dataavaliacao || !avaliador) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes: idimovel, dataavaliacao, avaliador." });
  }
  const t = await sequelize.transaction();

  try {
    const valorNumerico = parseCurrencyToFloat(novovalor);

    // 1. Verificar se é a primeira avaliação
    const existingAvals = await Avaliacao.count({ where: { idimovel }, transaction: t });

    if (existingAvals === 0) {
      // Se for a primeira, cria um registro inicial com os dados do imóvel
      const imovel = await Imovel.findByPk(idimovel, { transaction: t });
      if (imovel) {
        const valorImovelAtual = parseCurrencyToFloat(imovel.valorimovel);
        // Só cria o registro automático se valor do imóvel for diferente do valor que está sendo incluído
        if (valorImovelAtual !== valorNumerico) {
          await Avaliacao.create({
            idimovel: idimovel,
            dataavaliacao: imovel.dataimovel || new Date(),
            novovalor: imovel.valorimovel,
            observacoes: "Registro de Inclusão do Imovel",
            avaliador: "Sistema",
            usercreated: usercreated,
            usermodified: usercreated,
          }, { transaction: t });
        }
      }
    }

    // 2. Criar a nova avaliação solicitada pelo usuário
    const novaAvaliacao = await Avaliacao.create({
      idimovel,
      dataavaliacao,
      novovalor: valorNumerico,
      observacoes,
      avaliador,
      usercreated,
      usermodified: usercreated
    }, { transaction: t });

    // 3. Se um novo valor foi fornecido, atualiza o imóvel
    if (valorNumerico !== null && valorNumerico !== undefined && valorNumerico !== '') {
      await Imovel.update(
        { valorimovel: valorNumerico, usermodified: usercreated, datemodified: new Date() },
        { where: { idimovel: idimovel }, transaction: t }
      );
    }

    await t.commit();
    res.status(201).json(novaAvaliacao);
  } catch (error) {
    await t.rollback();
    console.error("Erro ao criar avaliação:", error);
    console.error("Payload recebido:", req.body);
    if (error && error.stack) console.error("Stack:", error.stack);
    res.status(400).json({ error: "Erro ao criar avaliação", details: error.message });
  }
});

// DELETE - Excluir avaliação (LÓGICA DE REVERSÃO AQUI - sem alterações)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const t = await sequelize.transaction();

  try {
    // 1. Encontrar a avaliação a ser deletada para obter o idimovel
    const avaliacaoParaDeletar = await Avaliacao.findByPk(id, { transaction: t });
    if (!avaliacaoParaDeletar) {
      await t.rollback();
      return res.status(404).json({ error: "Avaliação não encontrada" });
    }
    const { idimovel } = avaliacaoParaDeletar;

    // NOVA REGRA: Buscar avaliações valoradas (novovalor não nulo) desse imóvel
    const avaliacoesValidadas = await Avaliacao.findAll({
      where: {
        idimovel: idimovel,
        novovalor: { [Op.not]: null }
      },
      transaction: t
    });

    // Se só existe UMA avaliação valorada, não permite excluir
    if (avaliacoesValidadas.length <= 1) {
      await t.rollback();
      return res.status(400).json({ error: "O imóvel deve ter pelo menos uma avaliação com valor. Não é possível excluir a última avaliação valorada." });
    }

    // 2. Deletar a avaliação
    await Avaliacao.destroy({ where: { id: id }, transaction: t });

    // 3. Encontrar a avaliação mais recente que SOBROU
    const ultimaAvaliacaoRestante = await Avaliacao.findOne({
      where: { idimovel: idimovel },
      order: [['dataavaliacao', 'DESC'], ['id', 'DESC']],
      transaction: t,
    });

    // 4. Atualizar o valor do imóvel com base na avaliação restante
    let novoValorImovel = 0;
    if (ultimaAvaliacaoRestante) {
      novoValorImovel = ultimaAvaliacaoRestante.novovalor;
    } else {
      const imovel = await Imovel.findByPk(idimovel, { transaction: t, attributes: ['valorimovel'] });
      if (imovel) {
         const avaliacaoInicial = await Avaliacao.findOne({
             where: { idimovel: idimovel },
             order: [['dataavaliacao', 'ASC'], ['id', 'ASC']],
             transaction: t
         });
         if(avaliacaoInicial) novoValorImovel = avaliacaoInicial.novovalor;
      }
    }

    await Imovel.update(
      { valorimovel: novoValorImovel, datemodified: new Date() },
      { where: { idimovel: idimovel }, transaction: t }
    );

    await t.commit();
    res.status(204).send();
  } catch (error) {
    await t.rollback();
    console.error("Erro ao deletar avaliação:", error);
    res.status(500).json({ error: "Falha ao deletar avaliação" });
  }
});


// PUT - Atualizar avaliação (COM CORREÇÃO)
router.put("/:id", async (req, res) => {
    const { novovalor, dataavaliacao, avaliador,observacoes, usermodified } = req.body;
      if (!novovalor || !dataavaliacao || !avaliador) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes: novovalor, dataavaliacao, avaliador." });
      }
    const { id } = req.params;
    const t = await sequelize.transaction();

    try {
        // --- CORREÇÃO APLICADA AQUI ---
        const valorNumerico = parseCurrencyToFloat(novovalor);
        
        // Prepara o corpo da requisição com o valor numérico tratado
        const updateData = { ...req.body, novovalor: valorNumerico };

        const [updated] = await Avaliacao.update(updateData, { where: { id }, transaction: t });

        if (updated) {
            const avaliacaoAtualizada = await Avaliacao.findByPk(id, { transaction: t });
            
            // Se o novo valor foi fornecido, atualiza o imóvel
            if (valorNumerico !== null && valorNumerico !== undefined && valorNumerico !== '') {
                await Imovel.update(
                    { valorimovel: valorNumerico, avaliador,observacoes,usermodified, datemodified: new Date() }, // <-- Usando o valor tratado
                    { where: { idimovel: avaliacaoAtualizada.idimovel }, transaction: t }
                );
            }
            
            await t.commit();
            res.json(avaliacaoAtualizada);
        } else {
            await t.rollback();
            res.status(404).json({ error: "Avaliação não encontrada" });
        }
    } catch (error) {
        await t.rollback();
        res.status(400).json({ error: "Erro ao atualizar avaliação", details: error.message });
    }
});


export default router;