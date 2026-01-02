import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Box
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";
import TableViewIcon from "@mui/icons-material/TableView";
import MapIcon from '@mui/icons-material/Map'; // 1. Importe o ícone do mapa

const drawerWidth = 240;
const collapsedWidth = 72;

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  headerHeight: number;
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapsed, headerHeight }) => {
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: collapsed ? collapsedWidth : drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: collapsed ? collapsedWidth : drawerWidth,
          boxSizing: "border-box",
          transition: "width 0.2s",
          overflowX: "hidden",
          marginTop: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`,
        },
      }}
      PaperProps={{
        style: {
          marginTop: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`,
        }
      }}
    >
      {/* Botão de recolher/expandir */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        height: 64,
        justifyContent: collapsed ? "center" : "flex-start",
        pl: collapsed ? 0 : 1
      }}>
        <IconButton onClick={onToggleCollapsed}>
          <MenuIcon />
        </IconButton>
      </Box>
      <Divider />

      {/* Opções de navegação */}
      <List>
        {/* Dashboard */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate("/dashboard")}
            sx={{ justifyContent: collapsed ? "center" : "flex-start", px: collapsed ? 0 : 2 }}
          >
            <Tooltip title="Dashboard" placement="right" disableHoverListener={!collapsed}>
              <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
                <HomeIcon />
              </ListItemIcon>
            </Tooltip>
            {!collapsed && <ListItemText primary="Dashboard" sx={{ ml: 2 }}/> }
          </ListItemButton>
        </ListItem>
        {/* Tabela de Imóveis */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate("/imoveis")}
            sx={{ justifyContent: collapsed ? "center" : "flex-start", px: collapsed ? 0 : 2 }}
          >
            <Tooltip title="Imóveis" placement="right" disableHoverListener={!collapsed}>
              <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
                <TableViewIcon />
              </ListItemIcon>
            </Tooltip>
            {!collapsed && <ListItemText primary="Imóveis" sx={{ ml: 2 }}/> }
          </ListItemButton>
        </ListItem>
        {/* 2. Adicione o novo item de menu para o Mapa */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate("/mapa")}
            sx={{ justifyContent: collapsed ? "center" : "flex-start", px: collapsed ? 0 : 2 }}
          >
            <Tooltip title="Mapa" placement="right" disableHoverListener={!collapsed}>
              <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
                <MapIcon />
              </ListItemIcon>
            </Tooltip>
            {!collapsed && <ListItemText primary="Mapa" sx={{ ml: 2 }}/> }
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
