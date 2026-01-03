import React from "react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from "./AuthContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Configuracoes from "./pages/Configuracoes";
import AppLayout from "./AppLayout"; 
import PerfilUsuario from "./pages/PerfilUsuario";
import ImoveisTable from "./pages/ImoveisTable"; 
import CadastrosGerais from './pages/CadastrosGerais';
import MapPage from './pages/MapPage'; 
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './styles/globals.css';
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AtivarConta from "./pages/AtivarConta"; 
import { LayoutProvider } from "./LayoutContext";
import { ThemeProvider } from "./ThemeContext";


// MUDANÇA: Importando a nova página de edição de imóvel
import ImovelEditPage from "./pages/ImovelEditPage";

// Importações para o seletor de data
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';

const App: React.FC = () => {
  // O estado de autenticação que você já usa para proteger as rotas.
  const [autenticado, setAutenticado] = React.useState(true);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <AuthProvider>
        <ThemeProvider>
          <LayoutProvider>
            <BrowserRouter basename="/">
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
              />
              <Routes>
                <Route path="/" element={<LoginPage setAutenticado={setAutenticado} />} />
                <Route path="/reset-senha" element={<ResetPasswordPage />} />
                <Route path="/ativar-conta" element={<AtivarConta />} />
                <Route
                  path="/dashboard"
                  element={
                    autenticado
                      ? <AppLayout><Dashboard /></AppLayout>
                      : <Navigate to="/" replace />
                  }
                />
                <Route
                  path="/imoveis"
                  element={
                    autenticado
                      ? <AppLayout><ImoveisTable /></AppLayout>
                      : <Navigate to="/" replace />
                  }
                />
                <Route
                  path="/mapa"
                  element={
                    autenticado
                      ? <AppLayout><MapPage /></AppLayout>
                      : <Navigate to="/" replace />
                  }
                />

                {/* MUDANÇA: Nova rota para a página de edição do imóvel */}
                <Route
                  path="/imovel/:id"
                  element={
                    autenticado
                      ? <AppLayout><ImovelEditPage /></AppLayout>
                      : <Navigate to="/" replace />
                  }
                />

                <Route
                  path="/configuracoes"
                  element={
                    autenticado
                      ? <AppLayout><Configuracoes /></AppLayout>
                      : <div>Acesso restrito a administradores.</div>
                  }
                />
                <Route
                  path="/perfil"
                  element={
                    autenticado
                      ? <AppLayout><PerfilUsuario /></AppLayout>
                      : <Navigate to="/" replace />
                  }
                />
                <Route 
                  path="/cadastros-gerais" 
                  element={
                    autenticado
                    ? <AppLayout><CadastrosGerais /></AppLayout>
                    : <Navigate to="/" replace />
                  } 
                />
              </Routes>
            </BrowserRouter>
          </LayoutProvider>
        </ThemeProvider>
      </AuthProvider>
    </LocalizationProvider>
  );
};

export default App;
