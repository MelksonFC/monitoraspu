import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Box, TextField, Button, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment } from "@mui/material";
import { useAuth } from "../AuthContext";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

interface LoginPageProps {
  setAutenticado: (auth: boolean) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ setAutenticado }) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const { setUsuario } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      const resp = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), senha })
      });
      const dados = await resp.json();
      if (!resp.ok) {
        setErro(dados.message || "Erro ao autenticar");
        return;
      }
      setAutenticado(true);
      setUsuario(dados); // salva usuário no contexto
      localStorage.setItem("usuario", JSON.stringify(dados)); // salva localmente (opcional)
      navigate("/dashboard");
    } catch {
      setErro("Erro de rede ou servidor.");
    }
  }

  async function handleResetSenha() {
    setResetMsg("");
    // Envia email de redefinição
    try {
      const resp = await fetch("http://localhost:3001/api/reset-solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.toLowerCase() })
      });
      const dados = await resp.json();
      setResetMsg(dados.message || "Verifique seu e-mail para redefinir a senha.");
    } catch {
      setResetMsg("Erro ao solicitar redefinição.");
    }
  }

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, p: 4, boxShadow: 3, borderRadius: 2 }}>
        <Typography variant="h5" align="center" mb={3}>
          Acesso ao Sistema
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="E-mail"
            type="email"
            fullWidth
            required
            margin="normal"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <TextField
            label="Senha"
            type={showPassword ? "text" : "password"}
            fullWidth
            required
            margin="normal"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    onClick={handleClickShowPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
            Entrar
          </Button>
        </form>
        <Button onClick={() => setShowReset(true)} sx={{ mt: 1 }} fullWidth>
          Esqueci minha senha
        </Button>
        {erro && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {erro}
          </Alert>
        )}
      </Box>
      <Dialog open={showReset} onClose={() => setShowReset(false)}>
        <DialogTitle>Redefinir senha</DialogTitle>
        <DialogContent>
          <TextField
            label="E-mail cadastrado"
            type="email"
            fullWidth
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
            margin="normal"
          />
          {resetMsg && <Alert sx={{ mt: 2 }} severity="info">{resetMsg}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReset(false)}>Cancelar</Button>
          <Button onClick={handleResetSenha} variant="contained">Enviar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LoginPage;