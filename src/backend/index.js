'use strict';

// ===================================================================
// IMPORTAÇÕES CONVERTIDAS PARA O PADRÃO REQUIRE
// ===================================================================
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Carregando a conexão com o banco e os routers
const pool = require("./db.js"); // Assumindo que db.js também usa module.exports
const loginRouter = require("./login.js"); // Assumindo que login.js também usa module.exports

// Carregando os routers que corrigimos
const imoveisRouter = require("../routes/imoveis.js");
const municipiosRouter = require("../routes/municipio.js");
const estadoRouter = require("../routes/estado.js");
const paisRouter = require("../routes/pais.js");
const fiscalizacaoRouter = require("../routes/fiscalizacao.js");
const hstregimeutilizacaoRouter = require("../routes/hstregimeutilizacao.js");
const hstunidadegestoraRouter = require("../routes/hstunidadegestora.js");
const avaliacaoRouter = require("../routes/avaliacao.js");
const regimeutilizacaoRouter = require("../routes/regimeutilizacao.js");
const unidadegestoraRouter = require("../routes/unidadegestora.js");

// Sequelize não é mais usado diretamente aqui, mas mantido caso alguma rota futura precise
const sequelize = require('../models/sequelize.js');

// ===================================================================
// CONFIGURAÇÃO DO SERVIDOR EXPRESS
// ===================================================================
const app = express();
app.use(cors());
app.use(express.json());

// ===================================================================
// FUNÇÕES E CONFIGURAÇÕES AUXILIARES
// ===================================================================

 const apiUrl = import.meta.env.VITE_API_URL;

// Função de validação de força de senha
function validaSenha(senha) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%&*]).{6,}$/.test(senha);
}

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "melkso@gmail.com",
    pass: "lloe hxnt vwyv fpyk", // Lembre-se que é uma boa prática usar variáveis de ambiente para senhas
  },
});

// ===================================================================
// DEFINIÇÃO DAS ROTAS DA APLICAÇÃO
// ===================================================================

// Rota de login
app.use("/api", loginRouter);

// Rotas relacionadas ao Sequelize (que corrigimos)
app.use("/api/imoveis", imoveisRouter);
app.use("/api/municipios", municipiosRouter);
app.use("/api/estados", estadoRouter); // Corrigido para /api/estados para consistência
app.use("/api/paises", paisRouter); // Corrigido para /api/paises para consistência
app.use("/api/fiscalizacoes", fiscalizacaoRouter);
app.use("/api/hstregimeutilizacao", hstregimeutilizacaoRouter);
app.use("/api/hstunidadegestora", hstunidadegestoraRouter);
app.use("/api/avaliacoes", avaliacaoRouter);
app.use("/api/regimeutilizacao", regimeutilizacaoRouter);
app.use("/api/unidadegestora", unidadegestoraRouter);
app.use('/api/lookups', require('../routes/lookups'));

// Rota de teste de conexão ao banco
app.get('/api/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROTAS DE USUÁRIOS (usando 'pool' diretamente) ---

// GET todos usuários
app.get("/api/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM dbo.usuarios ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET usuário por ID
app.get("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM dbo.usuarios WHERE id=$1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST novo usuário
app.post('/api/usuarios', async (req, res) => {
  try {
    const { nome, email, senha, idpermissao, ativo } = req.body;
    const emailLower = email.toLowerCase();
    if (!nome || !email || !senha) return res.status(400).json({ error: "Campos obrigatórios faltando" });
    if (!validaSenha(senha)) return res.status(400).json({ error: "Senha não atende aos requisitos de força." });
    
    const senha_hash = await bcrypt.hash(senha, 10);
    const ativacao_token = crypto.randomBytes(32).toString("hex");
    const ativacao_token_expira = new Date(Date.now() + 3600 * 1000); // 1 hora
    
    const existente = await pool.query("SELECT id FROM dbo.usuarios WHERE email=$1", [emailLower]);
    if (existente.rows.length > 0) return res.status(409).json({ error: "Já existe um usuário com esse e-mail." });
    
    const result = await pool.query(
      "INSERT INTO dbo.usuarios (nome, email, senha_hash, idpermissao, ativo, ativado, ativacao_token, ativacao_token_expira) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [nome, emailLower, senha_hash, idpermissao, ativo ?? 1, false, ativacao_token, ativacao_token_expira]
    );
    
    await transporter.sendMail({
      from: "naoresponda@monitoraspu.com",
      to: email,
      subject: "Ativação de conta",
      text: `Olá ${nome},\n\nClique para ativar sua conta:\n${apiUrl}/api/ativar?token=${ativacao_token}\n\nEste link expira em 1 hora.`,
    });
    
    res.status(201).json({ message: "Usuário criado! Email de ativação enviado.", usuario: result.rows[0] });
  } catch (err) {
    console.error("Erro ao criar usuário ou enviar email:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT para reenviar ativação
app.put("/api/usuarios/:id/reenviar-ativacao", async (req, res) => {
  const { id } = req.params;
  try {
    const userResult = await pool.query("SELECT * FROM dbo.usuarios WHERE id=$1", [id]);
    const usuario = userResult.rows[0];
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });
    
    const ativacao_token = crypto.randomBytes(32).toString("hex");
    const ativacao_token_expira = new Date(Date.now() + 3600 * 1000);
    
    await pool.query("UPDATE dbo.usuarios SET ativado=false, ativacao_token=$1, ativacao_token_expira=$2 WHERE id=$3", [ativacao_token, ativacao_token_expira, id]);
    
    await transporter.sendMail({
      from: "naoresponda@monitoraspu.com",
      to: usuario.email,
      subject: "Ativação de conta",
      text: `Olá ${usuario.nome},\n\nClique para ativar sua conta:\n${apiUrl}/api/ativar?token=${ativacao_token}\n\nEste link expira em 1 hora.`,
    });
    
    res.json({ message: "Email de ativação reenviado!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT para atualizar usuário
app.put("/api/usuarios/:id", async (req, res) => {
  // Lógica de atualização complexa permanece a mesma
  const { id } = req.params;
  let { nome, email, senha, idpermissao, ativo } = req.body;
  
  try {
    if (email) email = email.toLowerCase();
    
    const userResult = await pool.query("SELECT * FROM dbo.usuarios WHERE id=$1", [id]);
    const userAtual = userResult.rows[0];
    if (!userAtual) return res.status(404).json({ error: "Usuário Invalido." });

    let sendActivation = email && email !== userAtual.email;
    let ativacao_token = sendActivation ? crypto.randomBytes(32).toString("hex") : null;
    let ativacao_token_expira = sendActivation ? new Date(Date.now() + 3600 * 1000) : null;
    
    let query, params;
    
    if (senha) {
      if (!validaSenha(senha)) return res.status(400).json({ error: "Senha não atende aos requisitos de força." });
      const senha_hash = await bcrypt.hash(senha, 10);
      if (sendActivation) {
        query = `UPDATE dbo.usuarios SET nome=$1, email=$2, senha_hash=$3, idpermissao=$4, ativo=$5, ativado=false, ativacao_token=$6, ativacao_token_expira=$7 WHERE id=$8 RETURNING *`;
        params = [nome, email, senha_hash, idpermissao, ativo, ativacao_token, ativacao_token_expira, id];
      } else {
        query = `UPDATE dbo.usuarios SET nome=$1, email=$2, senha_hash=$3, idpermissao=$4, ativo=$5 WHERE id=$6 RETURNING *`;
        params = [nome, email || userAtual.email, senha_hash, idpermissao, ativo, id];
      }
    } else {
      if (sendActivation) {
        query = `UPDATE dbo.usuarios SET nome=$1, email=$2, idpermissao=$3, ativo=$4, ativado=false, ativacao_token=$5, ativacao_token_expira=$6 WHERE id=$7 RETURNING *`;
        params = [nome, email, idpermissao, ativo, ativacao_token, ativacao_token_expira, id];
      } else {
        query = `UPDATE dbo.usuarios SET nome=$1, email=$2, idpermissao=$3, ativo=$4 WHERE id=$5 RETURNING *`;
        params = [nome, email || userAtual.email, idpermissao, ativo, id];
      }
    }
    
    const result = await pool.query(query, params);
    
    if (sendActivation) {
      await transporter.sendMail({
        from: "naoresponda@monitoraspu.com",
        to: email,
        subject: "Ativação de conta",
        text: `Olá ${nome},\n\nSeu e-mail foi atualizado. Ative novamente sua conta:\n${apiUrl}/api/ativar?token=${ativacao_token}\n\nEste link expira em 1 hora.`,
      });
    }
    
    res.json({ message: sendActivation ? "Usuário editado! Email de ativação reenviado." : "Usuário editado com sucesso.", usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE usuário
app.delete("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM dbo.usuarios WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ===================================================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[BACKEND] API rodando na porta ${PORT}`);
});