import React, { useState } from "react";
import {
  Box, TextField, Typography, Button, Alert, Paper, RadioGroup, FormControlLabel, Radio, Switch, InputAdornment, IconButton
} from "@mui/material";
import { useAuth } from "../AuthContext";
import axios from "axios";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const apiUrl = import.meta.env.VITE_API_URL;

const PERMISSOES = [
  { id: 1, label: "Admin" },
  { id: 2, label: "Editor" },
  { id: 3, label: "Visualizador" },
];

function validaSenha(senha: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%&*]).{6,}$/.test(senha);
}

const PerfilUsuario: React.FC = () => {
  const { usuario, setUsuario } = useAuth();
  const [form, setForm] = useState({
    nome: usuario?.nome ?? "",
    email: usuario?.email ?? "",
    idpermissao: usuario?.idpermissao ?? 3,
    ativo: usuario?.ativo ?? 1,
    senha: "",
    confirmarSenha: "",
  });
  const [erroSenha, setErroSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmaSenha, setShowConfirmaSenha] = useState(false);
  const admin = usuario?.idpermissao === 1;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  }

  function handlePermissao(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({
      ...f,
      idpermissao: Number(e.target.value),
    }));
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    // Validação senha
    if (form.senha || form.confirmarSenha) {
      if (form.senha !== form.confirmarSenha) {
        setErroSenha("As senhas não coincidem.");
        return;
      }
      if (!validaSenha(form.senha)) {
        setErroSenha("Senha deve ter ao menos 6 caracteres, incluindo maiúscula, minúscula, número e caractere especial.");
        return;
      }
    }
    setErroSenha("");
    // Monta objeto só com campos editáveis
    const toSend: any = { nome: form.nome };
    if (admin) {
      toSend.ativo = form.ativo;
      toSend.idpermissao = form.idpermissao;
      toSend.email = form.email.toLowerCase();
    }
    if (form.senha) toSend.senha = form.senha;

    try {
      const res = await axios.put(`${apiUrl}/api/usuarios/${usuario?.id}`, toSend);
      setMsg(res.data.message || "Salvo com sucesso!");
      // Atualiza contexto se mudou nome
      setUsuario({ ...usuario, ...toSend });
      setForm(f => ({ ...f, senha: "", confirmarSenha: "" }));
    } catch (err: any) {
      setMsg(err?.response?.data?.error || "Erro ao salvar");
    }
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
      <Paper sx={{ maxWidth: 480, width: "100%", p: 4 }}>
        <Typography variant="h5" mb={3}>Perfil do Usuário</Typography>
        <form onSubmit={handleSalvar}>
          <TextField
            label="Nome"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Email"
            name="email"
            value={form.email}
            fullWidth
            margin="normal"
            disabled={!admin}
            onChange={handleChange}
            required
          />
          <RadioGroup
            row
            name="idpermissao"
            value={form.idpermissao}
            onChange={handlePermissao}
          >
            {PERMISSOES.map(p => (
              <FormControlLabel
                key={p.id}
                value={p.id}
                control={<Radio disabled={!admin} />}
                label={p.label}
              />
            ))}
          </RadioGroup>
          <FormControlLabel
            control={
              <Switch
                name="ativo"
                checked={form.ativo === 1}
                onChange={handleChange}
                disabled={!admin}
              />
            }
            label="Ativo"
          />
          <TextField
            label="Nova senha"
            name="senha"
            type={showSenha ? "text" : "password"}
            fullWidth
            margin="normal"
            value={form.senha}
            onChange={handleChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showSenha ? "Ocultar senha" : "Exibir senha"}
                    onClick={() => setShowSenha(show => !show)}
                    edge="end"
                  >
                    {showSenha ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField
            label="Confirmar nova senha"
            name="confirmarSenha"
            type={showConfirmaSenha ? "text" : "password"}
            fullWidth
            margin="normal"
            value={form.confirmarSenha}
            onChange={handleChange}
            error={!!erroSenha}
            helperText={erroSenha}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showConfirmaSenha ? "Ocultar confirmação" : "Exibir confirmação"}
                    onClick={() => setShowConfirmaSenha(show => !show)}
                    edge="end"
                  >
                    {showConfirmaSenha ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          {msg && <Alert sx={{ mt: 2 }} severity={msg.includes("sucesso") ? "success" : "info"}>{msg}</Alert>}
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3 }}>
            Salvar alterações
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default PerfilUsuario;
