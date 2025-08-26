import React, { useState } from "react";
import { AppBar, Toolbar, Typography, Box, Avatar, IconButton, Menu, MenuItem, Divider, Tooltip } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const Header: React.FC = () => {
  const { usuario, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    handleClose();
    navigate(path);
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={1} 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#fff', // Fundo branco
        color: 'text.primary' // Cor do texto padrão
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", minHeight: 64 }}>
        
        {/* Lado Esquerdo: Logo do Sistema */}
        <Box 
          onClick={() => navigate('/dashboard')}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            cursor: 'pointer'
          }}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Monitora
          </Typography>
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/assets/LogoSPU.png`}
            alt="Logo SPU"
            sx={{ height: 28, position: 'relative', top: '2px' }}
          />
        </Box>

        {/* Lado Direito: Menu do Usuário */}
        <Box>
          <Tooltip title="Opções do usuário">
            <IconButton
              onClick={handleMenu}
              size="large"
              edge="end"
              sx={{ p: 0.5, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
              <Typography variant="subtitle1" fontWeight={500} sx={{ display: { xs: 'none', sm: 'block' } }}>
                {usuario?.nome ?? "Carregando..."}
              </Typography>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            PaperProps={{
              elevation: 3,
              sx: { mt: 1.5, minWidth: 220 },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => handleNavigate("/perfil")}>
              <PersonIcon sx={{ mr: 1.5 }} />
              Seu perfil
            </MenuItem>
            <MenuItem onClick={() => handleNavigate("/cadastros-gerais")}>
              <AssignmentIcon sx={{ mr: 1.5 }} />
              Cadastros Gerais
            </MenuItem>
            {/* Itens de Admin */}
            {usuario?.idpermissao === 1 && (
              <MenuItem onClick={() => handleNavigate("/configuracoes")}>
                <SettingsIcon sx={{ mr: 1.5 }} />
                Gestão de Usuários
              </MenuItem>
            )}
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <LogoutIcon sx={{ mr: 1.5 }} />
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;