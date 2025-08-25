import { useEffect, useState } from 'react';
import { 
  Drawer, Box, Typography, Button, TextField, Autocomplete, 
  CircularProgress, Divider, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axios from 'axios';

const API_URL = "http://localhost:3001/api";

export interface FiltrosState {
  selectedPais: Pais | null;
  selectedEstado: Estado | null;
  selectedMunicipio: Municipio | null;
  selectedUnidades: UnidadeGestora[];
  selectedRegimes: Regime[];
  matricula: string;
  ripImovel: string;
  ripUtilizacao: string;
  tipoData: string;
  dataInicio: Date | null;
  dataFim: Date | null;
}

interface Pais { idpais: number; nome: string; }
interface Estado { idestado: number; nome: string; }
interface Municipio { idmunicipio: number; nome: string; }
interface UnidadeGestora { id: number; nome: string; }
interface Regime { id: number; descricao: string; }

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filtros: FiltrosState;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosState>>;
  onApplyFilters: (clear?: boolean) => void;
}

const DRAWER_WIDTH = 350;

export default function FilterDrawer({ open, onClose, filtros, setFiltros, onApplyFilters }: FilterDrawerProps) {
  const [paises, setPaises] = useState<Pais[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [unidades, setUnidades] = useState<UnidadeGestora[]>([]);
  const [regimes, setRegimes] = useState<Regime[]>([]);
  const [loadingPaises, setLoadingPaises] = useState(false);
  const [loadingEstados, setLoadingEstados] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  const handleFiltroChange = (field: keyof FiltrosState, value: any) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (open && paises.length === 0) {
      const fetchLookups = async () => {
          setLoadingPaises(true);
          try {
            // --- INÍCIO DA CORREÇÃO: Chama as novas rotas ---
            const [paisesRes, ugsRes, regimesRes] = await Promise.all([
              axios.get(`${API_URL}/lookups/paises-com-imoveis`), // <--- MUDANÇA AQUI
              axios.get(`${API_URL}/lookups/unidades-gestoras`),
              axios.get(`${API_URL}/lookups/regimes-utilizacao`),
            ]);
            setPaises(paisesRes.data);
            setUnidades(ugsRes.data);
            setRegimes(regimesRes.data);
          } catch (error) {
            console.error("Erro ao carregar dados para os filtros", error);
          } finally {
            setLoadingPaises(false);
          }
      };
      fetchLookups();
    }
  }, [open, paises.length]);

  useEffect(() => {
    if (filtros.selectedPais) {
      setLoadingEstados(true);
      handleFiltroChange('selectedEstado', null);
      handleFiltroChange('selectedMunicipio', null);
      // --- INÍCIO DA CORREÇÃO: Chama as novas rotas ---
      axios.get(`${API_URL}/lookups/estados-com-imoveis?paisId=${filtros.selectedPais.idpais}`) // <--- MUDANÇA AQUI
        .then(res => setEstados(res.data))
        .finally(() => setLoadingEstados(false));
    } else {
      setEstados([]);
      setMunicipios([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.selectedPais]);

  useEffect(() => {
    if (filtros.selectedEstado) {
      setLoadingMunicipios(true);
      handleFiltroChange('selectedMunicipio', null); 
      // --- INÍCIO DA CORREÇÃO: Chama as novas rotas ---
      axios.get(`${API_URL}/lookups/municipios-com-imoveis?estadoId=${filtros.selectedEstado.idestado}`) // <--- MUDANÇA AQUI
        .then(res => setMunicipios(res.data))
        .finally(() => setLoadingMunicipios(false));
    } else {
      setMunicipios([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.selectedEstado]);

  const handleApply = () => {
    onApplyFilters();
    onClose();
  };

  const handleClear = () => {
    onApplyFilters(true);
    onClose();
  };
  
  return (
    <Drawer anchor="left" open={open} onClose={onClose} variant="temporary" sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}>
      <Box sx={{ width: DRAWER_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" component="div" sx={{ textAlign: 'center' }}>
                Filtros Avançados
            </Typography>
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, '& .MuiTextField-root, .MuiAutocomplete-root': { mb: 2 } }}>
            <Autocomplete size="small" options={paises} getOptionLabel={(o) => o.nome} value={filtros.selectedPais} onChange={(_, v) => handleFiltroChange('selectedPais', v)} loading={loadingPaises} renderInput={(params) => <TextField {...params} label="País" InputProps={{ ...params.InputProps, endAdornment: (<>{loadingPaises ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>)}} />} />
            <Autocomplete size="small" options={estados} getOptionLabel={(o) => o.nome} value={filtros.selectedEstado} onChange={(_, v) => handleFiltroChange('selectedEstado', v)} loading={loadingEstados} disabled={!filtros.selectedPais} renderInput={(params) => <TextField {...params} label="Estado" InputProps={{ ...params.InputProps, endAdornment: (<>{loadingEstados ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>)}} />} />
            <Autocomplete size="small" options={municipios} getOptionLabel={(o) => o.nome} value={filtros.selectedMunicipio} onChange={(_, v) => handleFiltroChange('selectedMunicipio', v)} loading={loadingMunicipios} disabled={!filtros.selectedEstado} renderInput={(params) => <TextField {...params} label="Município" InputProps={{ ...params.InputProps, endAdornment: (<>{loadingMunicipios ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>)}} />} />
            <Divider sx={{ my: 1 }} />
            <Autocomplete size="small" multiple options={unidades} getOptionLabel={(o) => o.nome} value={filtros.selectedUnidades} onChange={(_, v) => handleFiltroChange('selectedUnidades', v)} renderInput={(params) => <TextField {...params} label="Unidades Gestoras" />} />
            <Autocomplete size="small" multiple options={regimes} getOptionLabel={(o) => o.descricao} value={filtros.selectedRegimes} onChange={(_, v) => handleFiltroChange('selectedRegimes', v)} renderInput={(params) => <TextField {...params} label="Regimes de Utilização" />} />
            <Divider sx={{ my: 1 }} />
            <TextField size="small" label="Matrícula" fullWidth value={filtros.matricula} onChange={e => handleFiltroChange('matricula', e.target.value)} />
            <TextField size="small" label="RIP do Imóvel" fullWidth value={filtros.ripImovel} onChange={e => handleFiltroChange('ripImovel', e.target.value)} />
            <TextField size="small" label="RIP de Utilização" fullWidth value={filtros.ripUtilizacao} onChange={e => handleFiltroChange('ripUtilizacao', e.target.value)} />
            <Divider sx={{ my: 1 }} />
            <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontSize: '0.8rem' }}>Período por</FormLabel>
                <RadioGroup row value={filtros.tipoData} onChange={(e) => handleFiltroChange('tipoData', e.target.value)}>
                <FormControlLabel value="avaliacao" control={<Radio size="small" />} label="Avaliação" />
                <FormControlLabel value="fiscalizacao" control={<Radio size="small" />} label="Fiscalização" />
                </RadioGroup>
            </FormControl>
            <DatePicker disabled={!filtros.tipoData} label="Desde" value={filtros.dataInicio} onChange={v => handleFiltroChange('dataInicio', v)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
            <DatePicker disabled={!filtros.tipoData} label="Até" value={filtros.dataFim} onChange={v => handleFiltroChange('dataFim', v)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
        </Box>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button variant="contained" onClick={handleApply} fullWidth>Aplicar Filtros</Button>
            <Button variant="text" color="secondary" onClick={handleClear} fullWidth sx={{ mt: 1 }}>Limpar Filtros</Button>
        </Box>
      </Box>
    </Drawer>
  );
}