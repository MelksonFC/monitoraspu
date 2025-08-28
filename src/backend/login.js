'use strict';

import express from "express";
import pool  from "./db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = express.Router();

// A lógica interna das suas rotas não precisa de NENHUMA alteração.
// ... (função validaSenha, transporter, router.post('/login'), etc. permanecem iguais) ...

function validaSenha(senha) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%&*]).{6,}$/.test(senha);
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  const emailLower = email.toLowerCase();
  try {
    const result = await pool.query(
      "SELECT * FROM dbo.usuarios WHERE email=$1",
      [emailLower]
    );
    const usuario = result.rows[0];
    if (!usuario) {
      return res.status(404).json({ message: "Login ou senha inválidos." });
    }
    if (!usuario.ativado || usuario.ativo !== 1) {
      return res.status(403).json({ message: "Login ou senha inválidos." });
    }
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ message: "Login ou senha inválidos." });
    }
    await pool.query("UPDATE dbo.usuarios SET lastlogin = NOW() WHERE id=$1", [usuario.id]);
    return res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      idpermissao: usuario.idpermissao,
      ativo: usuario.ativo
    });
  } catch (err) {
    res.status(500).json({ message: "Erro ao fazer login.", error: err.message });
  }
});

router.post("/reset-solicitar", async (req, res) => {
  const { email } = req.body;
  const emailLower = email.toLowerCase();

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
      console.error("A variável de ambiente FRONTEND_URL não está definida.");
      // Não envie o erro para o cliente para não expor a configuração do servidor
      return res.status(500).json({ message: "Erro de configuração do servidor." });
  }

  try {
    const userResult = await pool.query("SELECT * FROM dbo.usuarios WHERE email=$1", [emailLower]);
    const usuario = userResult.rows[0];

    // Importante: Mesmo que o usuário não seja encontrado, não retorne um erro 404.
    // Isso evita que alguém use esta rota para descobrir quais e-mails estão cadastrados.
    if (usuario) {
      const token = crypto.randomBytes(32).toString("hex");
      const expira = new Date(Date.now() + 3600 * 1000); // Token expira em 1 hora

      await pool.query(
        "UPDATE dbo.usuarios SET reset_token=$1, reset_token_expira=$2 WHERE email=$3",
        [token, expira, emailLower]
      );

      // O link agora aponta para uma página /reset-senha no seu site do frontend
      const resetLink = `${frontendUrl}/reset-senha?token=${token}`;
      
      await transporter.sendMail({
        from: `"Monitora SPU-RR" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Redefinição de Senha - Monitora SPU-RR",
        text: `Você solicitou uma redefinição de senha. Clique no link a seguir para criar uma nova senha: ${resetLink}`,
        html: `<p>Você solicitou uma redefinição de senha.</p><p>Clique no link a seguir para criar uma nova senha: <a href="${resetLink}">${resetLink}</a></p><p>Este link expira em 1 hora.</p>`,
      });
    }
    
    // Sempre retorne uma mensagem de sucesso genérica.
    res.json({ message: "Solicitação de redefinição recebida." });

  } catch (err) {
      console.error("Erro ao solicitar redefinição de senha:", err);
      // Resposta genérica também em caso de erro de banco de dados.
      res.json({ message: "Solicitação de redefinição recebida." });
  }
});

router.post("/reset-redefinir", async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!validaSenha(novaSenha)) {
    return res.status(400).json({ message: "Senha não atende aos requisitos de força." });
  }
  const usuario = await pool.query(
    "SELECT * FROM dbo.usuarios WHERE reset_token=$1 AND reset_token_expira > NOW()",
    [token]
  );
  if (!usuario.rows[0]) return res.status(400).json({ message: "Token inválido ou expirado." });

  const senha_hash = await bcrypt.hash(novaSenha, 10);
  await pool.query(
    "UPDATE dbo.usuarios SET senha_hash=$1, reset_token=NULL, reset_token_expira=NULL WHERE id=$2",
    [senha_hash, usuario.rows[0].id]
  );
  res.json({ message: "Senha redefinida com sucesso." });
});

router.get("/ativar", async (req, res) => {
  const { token } = req.query;
  const usuario = await pool.query(
    "SELECT * FROM dbo.usuarios WHERE ativacao_token=$1 AND ativacao_token_expira > NOW()",
    [token]
  );
  if (!usuario.rows[0]) return res.status(400).json({ message: "Token inválido ou expirado." });

  await pool.query(
    "UPDATE dbo.usuarios SET ativado=true, ativacao_token=NULL, ativacao_token_expira=NULL WHERE id=$1",
    [usuario.rows[0].id]
  );
  res.json({ message: "Usuário ativado com sucesso." });
});

export default router;