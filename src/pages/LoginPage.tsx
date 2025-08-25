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
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { setUsuario } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setIsLoading(true);
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
    // Lógica para enviar email de redefinição...
  }

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
          backgroundImage: 'url(/assets/fundo.jpg)',
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
            <Typography variant="h3" component="h1" fontWeight="bold" color="primary.main" gutterBottom>
              Monitora SPU
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
                  src="/assets/LogoSPU.png"
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
                  src="/assets/gov.png"
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
    </>
  );
};

export default LoginPage;