import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Alert,
  CircularProgress, IconButton, InputAdornment
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// Fundo e logos
import fundoJpg from '/public/assets/fundo.jpg';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados do formulário e da UI
  const [token, setToken] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Efeito para pegar o token da URL assim que a página carrega
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (!urlToken) {
      setErro("Token de redefinição inválido ou não encontrado na URL.");
    }
    setToken(urlToken);
  }, [searchParams]);

  // Função para validar a força da senha (mesma do backend)
  const validaSenha = (senha: string): boolean => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%&*]).{6,}$/.test(senha);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso("");

    // Validações no frontend para uma melhor experiência do usuário
    if (!token) {
      setErro("O token é inválido. Por favor, solicite uma nova redefinição de senha.");
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setErro("As senhas digitadas não coincidem.");
      return;
    }
    if (!validaSenha(novaSenha)) {
      setErro("A senha deve ter no mínimo 6 caracteres, incluindo uma letra maiúscula, uma minúscula, um número e um símbolo (@#$!%&*).");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/api/reset-redefinir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha }),
      });

      const dados = await resp.json();

      if (!resp.ok) {
        throw new Error(dados.message || "Não foi possível redefinir a senha.");
      }

      setSucesso("Senha redefinida com sucesso! Você já pode fazer o login com sua nova senha.");
      // Desabilita o formulário após o sucesso
      setIsLoading(true); 

    } catch (err: any) {
      setErro(err.message);
    } finally {
      if (!sucesso) setIsLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundImage: `url(${fundoJpg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(4px)', zIndex: -1, }} />
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Container maxWidth="xs" disableGutters>
          <Box sx={{ p: 4, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', textAlign: 'center' }}>
            <Typography variant="h4" component="h1" fontWeight="bold" color="primary.main" gutterBottom>
              Criar Nova Senha
            </Typography>
            
            {sucesso ? (
              <Box>
                <Alert severity="success" sx={{ mt: 2, textAlign: 'left' }}>{sucesso}</Alert>
                <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }} fullWidth>
                  Ir para a página de Login
                </Button>
              </Box>
            ) : (
              <form onSubmit={handleReset}>
                <TextField
                  label="Nova Senha"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  required
                  margin="normal"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  disabled={!token || isLoading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Confirmar Nova Senha"
                  type="password"
                  fullWidth
                  required
                  margin="normal"
                  value={confirmaSenha}
                  onChange={e => setConfirmaSenha(e.target.value)}
                  disabled={!token || isLoading}
                />
                <Box sx={{ position: 'relative', mt: 2 }}>
                  <Button type="submit" variant="contained" color="primary" fullWidth disabled={!token || isLoading} sx={{ py: 1.5 }}>
                    {isLoading ? 'Salvando...' : 'Redefinir Senha'}
                  </Button>
                  {isLoading && (
                    <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />
                  )}
                </Box>
              </form>
            )}

            {erro && (
              <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                {erro}
              </Alert>
            )}
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default ResetPasswordPage;