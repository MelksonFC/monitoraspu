'use strict';

const express = require("express");
const pool = require("./db.js");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const router = express.Router();

const apiUrl = process.env.REACT_APP_API_URL;

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
    user: "melkso@gmail.com",
    pass: "lloe hxnt vwyv fpyk",
  },
});

router.post("/api/login", async (req, res) => {
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

router.post("/api/reset-solicitar", async (req, res) => {
  const { email } = req.body;
  const emailLower = email.toLowerCase();
  const token = crypto.randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + 3600 * 1000);
  const usuario = await pool.query("SELECT * FROM dbo.usuarios WHERE email=$1", [emailLower]);
  if (!usuario.rows[0]) return res.status(404).json({ message: "Usuário inválido." });

  await pool.query(
    "UPDATE dbo.usuarios SET reset_token=$1, reset_token_expira=$2 WHERE email=$3",
    [token, expira, emailLower]
  );
  await transporter.sendMail({
    from: "no-reply@seusistema.com",
    to: email,
    subject: "Redefinir senha",
    text: `Clique no link para redefinir sua senha: ${apiUrl}/reset?token=${token}`
  });
  res.json({ message: "Email de redefinição enviado." });
});

router.post("/api/reset-redefinir", async (req, res) => {
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

router.get("/api/ativar", async (req, res) => {
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

module.exports = router;