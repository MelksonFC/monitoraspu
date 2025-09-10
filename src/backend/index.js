'use strict';

// ===================================================================
// IMPORTAÇÕES CONVERTIDAS PARA O PADRÃO "IMPORT"
// ===================================================================
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Carregando a conexão com o banco e os routers
// IMPORTANTE: Adicionamos a extensão .js no final dos arquivos
const pool = require("./db.js");
const loginRouter = require("./login.js");

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
const lookupsRouter = require("../routes/lookups.js");
const usertablesettingsRouter = require("../routes/usertablesettings.js");
const poligonosterrenoRouter = require("../routes/poligonosterreno.js");

const sequelize = require('../models/sequelize.js');


// ===================================================================
// CONFIGURAÇÃO DO SERVIDOR EXPRESS
// ===================================================================
const app = express();

// --- INÍCIO DA CORREÇÃO DE CORS ---
// 1. Defina as origens que você quer permitir.
const allowedOrigins = [
  'https://melksonfc.github.io', // Seu frontend em produção
  'http://localhost:5173',      // Seu frontend em desenvolvimento local
  'http://127.0.0.1:5173'       // Outra variação do localhost
];

// 2. Crie as opções do CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (como apps mobile ou Postman) ou se a origem estiver na lista
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pela política de CORS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Métodos permitidos
  credentials: true, // Se você precisar enviar cookies
  optionsSuccessStatus: 204 // Para navegadores antigos
};

// 3. Use as opções de CORS no seu app
// Esta linha substitui a antiga "app.use(cors());"
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// --- FIM DA CORREÇÃO DE CORS ---

// AUMENTAR O LIMITE DO PAYLOAD AQUI
// O padrão é 100kb, o que é muito pouco para 17.000 coordenadas.
// Aumentamos para 50mb para acomodar polígonos grandes.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===================================================================
// FUNÇÕES E CONFIGURAÇÕES AUXILIARES
// ===================================================================

const apiUrl = process.env.VITE_API_URL;
const frontendUrl = process.env.FRONTEND_URL; 

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
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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
app.use('/api/lookups', lookupsRouter);
app.use("/api/usertablesettings", usertablesettingsRouter);
app.use("/api/poligonosterreno", poligonosterrenoRouter);

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

// Rota para ativar a conta do usuário
app.get("/api/ativar", async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ message: "Token de ativação não fornecido." });
  }

  try {
    // 1. Encontra o usuário pelo token e verifica se não expirou
    const userResult = await pool.query(
      "SELECT * FROM dbo.usuarios WHERE ativacao_token = $1 AND ativacao_token_expira > NOW()",
      [token]
    );

    const usuario = userResult.rows[0];
    if (!usuario) {
      return res.status(400).json({ message: "Token de ativação inválido ou expirado. Por favor, solicite um novo." });
    }
    
    // 2. Se o usuário já estiver ativado, apenas informa
    if (usuario.ativado) {
        return res.status(200).json({ message: "Esta conta já foi ativada. Você já pode fazer o login."});
    }

    // 3. Ativa o usuário e limpa os campos de ativação no banco
    await pool.query(
      "UPDATE dbo.usuarios SET ativado = true, ativacao_token = NULL, ativacao_token_expira = NULL WHERE id = $1",
      [usuario.id]
    );

    // 4. Envia resposta de sucesso para o frontend
    res.status(200).json({ message: "Conta ativada com sucesso! Você já pode fazer o login." });

  } catch (err) {
    console.error("Erro na rota de ativação:", err);
    res.status(500).json({ message: "Ocorreu um erro interno ao ativar a conta." });
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
      from: "naoresponda@monitoraspurr.com",
      to: email,
      subject: "Ativação de conta",
      text: `Olá ${nome},\n\nClique para ativar sua conta:\n${frontendUrl}/ativar-conta?token=${ativacao_token}\n\nEste link expira em 1 hora.`,
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
      from: "naoresponda@monitoraspurr.com",
      to: usuario.email,
      subject: "Ativação de conta",
      text: `Olá ${usuario.nome},\n\nClique para ativar sua conta:\n${frontendUrl}/ativar-conta?token=${ativacao_token}\n\nEste link expira em 1 hora.`,
    });
    
    res.json({ message: "Email de ativação reenviado!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT para atualizar usuário (VERSÃO REATORADA E MAIS SEGURA)
app.put("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, idpermissao, ativo } = req.body;

  try {
    // 1. Pega os dados atuais do usuário
    const userResult = await pool.query("SELECT * FROM dbo.usuarios WHERE id=$1", [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    const userAtual = userResult.rows[0];

    // 2. Prepara os campos para a atualização
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    // Adiciona os campos que foram fornecidos na requisição
    if (nome !== undefined) {
      updateFields.push(`nome = $${paramIndex++}`);
      queryParams.push(nome);
    }
    if (idpermissao !== undefined) {
      updateFields.push(`idpermissao = $${paramIndex++}`);
      queryParams.push(idpermissao);
    }
    if (ativo !== undefined) {
      updateFields.push(`ativo = $${paramIndex++}`);
      queryParams.push(ativo);
    }

    // Lógica para troca de e-mail e reativação
    if (email && email.toLowerCase() !== userAtual.email) {
      const emailLower = email.toLowerCase();
      const ativacao_token = crypto.randomBytes(32).toString("hex");
      const ativacao_token_expira = new Date(Date.now() + 3600 * 1000);

      updateFields.push(`email = $${paramIndex++}`);
      queryParams.push(emailLower);
      updateFields.push(`ativado = $${paramIndex++}`);
      queryParams.push(false);
      updateFields.push(`ativacao_token = $${paramIndex++}`);
      queryParams.push(ativacao_token);
      updateFields.push(`ativacao_token_expira = $${paramIndex++}`);
      queryParams.push(ativacao_token_expira);
      
      // Envia o e-mail de reativação
      await transporter.sendMail({
        from: "naoresponda@monitoraspurr.com", to: emailLower, subject: "Reative sua conta",
        text: `Olá ${nome || userAtual.nome},\n\nSeu e-mail foi atualizado. Ative novamente sua conta:\n${frontendUrl}/ativar-conta?token=${ativacao_token}`
      });
    }

    // Lógica para atualização de senha
    if (senha) {
      if (!validaSenha(senha)) return res.status(400).json({ error: "Senha não atende aos requisitos de força." });
      const senha_hash = await bcrypt.hash(senha, 10);
      updateFields.push(`senha_hash = $${paramIndex++}`);
      queryParams.push(senha_hash);
    }

    // Se não houver campos para atualizar, retorna
    if (updateFields.length === 0) {
      return res.json({ message: "Nenhum dado para atualizar.", usuario: userAtual });
    }

    // 3. Monta e executa a query final
    const query = `UPDATE dbo.usuarios SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
    queryParams.push(id);
    
    const result = await pool.query(query, queryParams);

    res.json({ message: "Usuário atualizado com sucesso.", usuario: result.rows[0] });

  } catch (err) {
    // Verifica erro de e-mail duplicado
    if (err.code === '23505' && err.constraint === 'usuarios_email_key') {
        return res.status(409).json({ error: 'Este e-mail já está em uso por outro usuário.' });
    }
    console.error("Erro ao atualizar usuário:", err);
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