import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';
import MapView from '../components/map/MapView';
import PropertySidebar from '../components/map/PropertySidebar';
import FilterDrawer, { type FiltrosState } from '../components/map/FilterDrawer';
import FilterToggleButton from '../components/map/FilterToggleButton';

export interface ImovelComCoordenadas {
  idimovel: number;
  nome: string;
  matricula: string;
  valorimovel: number;
  ripimovel?: string;
  riputilizacao?: string;
  endereco: string;
  numero: string;
  cep: string;
  complemento?: string;
  latitude?: string;
  longitude?: string;
  Municipio?: {
    nome: string;
    Estado?: {
      uf: string;
    };
  };
  imagens?: { url: string; isdefault: boolean; }[];
}

const API_URL = import.meta.env.VITE_API_URL;


const estadoInicialFiltros: FiltrosState = {
  selectedPais: null,
  selectedEstado: null,
  selectedMunicipio: null,
  selectedUnidades: [],
  selectedRegimes: [],
  matricula: '',
  ripImovel: '',
  ripUtilizacao: '',
  tipoData: '',
  dataInicio: null,
  dataFim: null,
};

export default function MapPage() {
  const [imoveis, setImoveis] = useState<ImovelComCoordenadas[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImovel, setSelectedImovel] = useState<ImovelComCoordenadas | null>(null);
  const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [appliedFiltros, setAppliedFiltros] = useState<FiltrosState>(estadoInicialFiltros);
  const [tempFiltros, setTempFiltros] = useState<FiltrosState>(estadoInicialFiltros);
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  // --- INÍCIO DA CORREÇÃO ---
  // 1. Criamos uma função de tratamento de seleção que lida com selecionar e desselecionar.
  const handleImovelSelection = (imovel: ImovelComCoordenadas | null) => {
    // Se nenhum imóvel for passado, ou se o imóvel clicado já for o selecionado, limpa a seleção.
    if (!imovel || (selectedImovel && selectedImovel.idimovel === imovel.idimovel)) {
      setSelectedImovel(null);
    } else {
      // Caso contrário, define o novo imóvel como selecionado.
      setSelectedImovel(imovel);
    }
  };
  // --- FIM DA CORREÇÃO ---

  const fetchImoveis = useCallback(async (currentFilters: FiltrosState) => {
    setLoading(true);
    // Remove a seleção ao fazer uma nova busca para evitar inconsistências
    setSelectedImovel(null); 
    try {
      const response = await axios.get(`${API_URL}/api/imoveis/com-relacoes`, {
        params: {
          pais: currentFilters.selectedPais?.idpais,
          estado: currentFilters.selectedEstado?.idestado,
          municipio: currentFilters.selectedMunicipio?.idmunicipio,
          unidades: currentFilters.selectedUnidades.map(u => u.id).join(','),
          regimes: currentFilters.selectedRegimes.map(r => r.id).join(','),
          matricula: currentFilters.matricula,
          ripImovel: currentFilters.ripImovel,
          ripUtilizacao: currentFilters.ripUtilizacao,
          tipoData: currentFilters.tipoData,
          dataInicio: currentFilters.dataInicio?.toISOString(),
          dataFim: currentFilters.dataFim?.toISOString(),
        },
      });
      setImoveis(response.data);
    } catch (error) {
      console.error("Erro ao buscar imóveis:", error);
      toast.error("Erro ao carregar os dados dos imóveis.");
    } finally {
      setLoading(false);
    }
  }, []);

  const filterCount = Object.values(appliedFiltros).reduce((count, value) => {
    if (Array.isArray(value) && value.length > 0) return count + 1;
    if (value !== null && value !== '' && !Array.isArray(value)) return count + 1;
    return count;
  }, 0);

  useEffect(() => {
    setIsFilterApplied(filterCount > 0);
    fetchImoveis(appliedFiltros);
  }, [appliedFiltros, fetchImoveis, filterCount]);

  const handleApplyOrClearFilters = (clear = false) => {
    if (clear) {
      setAppliedFiltros(estadoInicialFiltros);
      setTempFiltros(estadoInicialFiltros);
    } else {
      setAppliedFiltros(tempFiltros);
    }
    setFilterDrawerOpen(false);
  };

  const handleOpenDrawer = () => {
    setTempFiltros(appliedFiltros);
    setFilterDrawerOpen(true);
  };

  if (loading && imoveis.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Buscando imóveis...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexGrow: 1, height: '100%' }}>
      <FilterDrawer
        open={isFilterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filtros={tempFiltros}
        setFiltros={setTempFiltros}
        onApplyFilters={handleApplyOrClearFilters}
      />
      {/* --- INÍCIO DA CORREÇÃO --- */}
      {/* 2. Passamos a nova função para a barra lateral */}
      <PropertySidebar
        imoveis={imoveis}
        onImovelSelect={handleImovelSelection}
        selectedImovel={selectedImovel}
        onClearFilters={() => handleApplyOrClearFilters(true)}
        isFilterApplied={isFilterApplied}
      />
      {/* --- FIM DA CORREÇÃO --- */}
      <Box ref={mapContainerRef} sx={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0, height: '100%' }}>
        <FilterToggleButton
          onClick={handleOpenDrawer}
          filterCount={filterCount}
        />
        {loading && (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1100, p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {/* --- INÍCIO DA CORREÇÃO --- */}
        {/* 3. Passamos a nova função também para o mapa */}
        <MapView
          imoveis={imoveis}
          selectedImovel={selectedImovel}
          onMarkerClick={handleImovelSelection}
        />
        {/* --- FIM DA CORREÇÃO --- */}
      </Box>
    </Box>
  );
}