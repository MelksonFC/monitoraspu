import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Box, TextField, Button, Typography, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  InputAdornment, CircularProgress, Divider
} from "@mui/material";
import { useAuth } from "../AuthContext";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import fundoJpg from '/public/assets/fundo.jpg';
import logoSpuPng from '/public/assets/LogoSPU.png';
import logoGovPng from '/public/assets/gov.png';

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
  const [resetError, setResetError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const { setUsuario } = useAuth();

  const apiUrl = import.meta.env.VITE_API_URL;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setIsLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/api/login`, {
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
      setUsuario(dados);
      localStorage.setItem("usuario", JSON.stringify(dados));
      navigate("/dashboard");
    } catch {
      setErro("Erro de rede ou servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetSenha() {
    setResetMsg("");
    setResetError("");
    setIsResetting(true);

    try {
      const resp = await fetch(`${apiUrl}/api/reset-solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.toLowerCase() })
      });
      
      const dados = await resp.json();

      if (!resp.ok) {
        // Mesmo em caso de erro (ex: email não encontrado), mostramos uma mensagem genérica
        // para não informar a um possível atacante se um email existe ou não no sistema.
        console.error("Falha na solicitação:", dados.message);
      }
      
      // Mensagem de sucesso genérica
      setResetMsg("Se uma conta com este e-mail existir, um link para redefinição de senha foi enviado.");

    } catch (err) {
      console.error("Erro de rede na redefinição:", err);
      setResetError("Não foi possível conectar ao servidor. Tente novamente mais tarde.");
    } finally {
      setIsResetting(false);
    }
  }

  const handleOpenResetDialog = () => {
    // Limpa estados anteriores ao abrir o dialog
    setResetEmail("");
    setResetMsg("");
    setResetError("");
    setShowReset(true);
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <>
      {/* Box para o Fundo com Imagem e Desfoque */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage:  `url(${fundoJpg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px)',
          zIndex: -1,
        }}
      />

      {/* Container Principal para o Conteúdo */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          p: 2,
        }}
      >

        {/* Caixa de Login com Efeito de Vidro */}
        <Container maxWidth="xs" disableGutters>
          <Box
            sx={{
              p: 4,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" component="h1" fontWeight="bold" color="primary.main" gutterBottom>
              Monitora SPU-RR
            </Typography>
            <Typography variant="h6" component="h2" color="text.secondary" mb={3}>
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
              <Box sx={{ position: 'relative', mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={isLoading}
                  sx={{ py: 1.5 }}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
                {isLoading && (
                  <CircularProgress
                    size={24}
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      marginTop: '-12px',
                      marginLeft: '-12px',
                    }}
                  />
                )}
              </Box>
            </form>
            <Button onClick={() => setShowReset(true)} sx={{ mt: 2, textTransform: 'none' }} fullWidth>
              Esqueci minha senha
            </Button>
            {erro && (
              <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                {erro}
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            {/* --- INÍCIO DA ALTERAÇÃO --- */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: { xs: 2, sm: 4 },
                flexWrap: 'wrap',
              }}
            >
              {/* Grupo SPU + Ministério */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  component="img"
                  src={logoSpuPng}
                  alt="Logo SPU"
                  sx={{ height: 30 }}
                />
                <Divider orientation="vertical" flexItem sx={{ height: 'auto', alignSelf: 'stretch' }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontWeight: 200,
                      fontSize: '0.6rem',
                      textTransform: 'uppercase',
                      lineHeight: 1.2,
                    }}
                  >
                    Ministério da
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{
                      fontWeight: 'bold',
                      fontSize: '0.6rem',
                      textTransform: 'uppercase',
                      lineHeight: 1.2,
                    }}
                  >
                    Gestão e da Inovação
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{
                      fontWeight: 'bold',
                      fontSize: '0.6rem',
                      textTransform: 'uppercase',
                      lineHeight: 1.2,
                    }}
                  >
                    em Serviços Públicos
                  </Typography>
                </Box>
                <Box
                  component="img"
                  src={logoGovPng}
                  alt="Logo Governo Federal"
                  sx={{ height: 55 }}
                />
              </Box>

              {/* Logo Governo Federal */}
              
            </Box>
            {/* --- FIM DA ALTERAÇÃO --- */}

          </Box>
        </Container>
      </Box>

      {/* Dialog de Redefinir Senha */}
      <Dialog open={showReset} onClose={() => setShowReset(false)}>
        <DialogTitle>Redefinir senha</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Digite seu e-mail abaixo. Se ele estiver cadastrado em nosso sistema, enviaremos um link para você criar uma nova senha.
          </Typography>
          <TextField autoFocus label="E-mail cadastrado" type="email" fullWidth value={resetEmail} onChange={e => setResetEmail(e.target.value)} margin="normal" />
          {resetMsg && <Alert sx={{ mt: 2 }} severity="success">{resetMsg}</Alert>}
          {resetError && <Alert sx={{ mt: 2 }} severity="error">{resetError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReset(false)} disabled={isResetting}>Cancelar</Button>
          <Button onClick={handleResetSenha} variant="contained" disabled={isResetting}>
            {isResetting ? <CircularProgress size={24} /> : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LoginPage;