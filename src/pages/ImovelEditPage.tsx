import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, CircularProgress, Alert, Box, Button, Typography, Paper } from '@mui/material';
import { toast } from 'react-toastify';
import ImovelForm, { type ImovelFormRef } from './ImovelForm';
import type { Imovel } from '../types';
import { useAuth } from '../AuthContext';

// Importação do componente SafePdfButton
import SafePdfButton from '../components/SafePdfButton';

// Ícones para os botões
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

const API_URL = process.env.REACT_APP_API_URL;

// Definição explícita dos tipos para lookups
interface LookupItem {
  id: number;
  nome: string;
  descricao?: string;
  idestado?: number;
}

interface LookupsType {
  paises: LookupItem[];
  estados: LookupItem[];
  municipios: LookupItem[];
  unidades: LookupItem[];
  regimes: LookupItem[];
}

export default function ImovelEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const formRef = useRef<ImovelFormRef>(null);

  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para os lookups necessários para o SafePdfButton
  const [lookups, setLookups] = useState<LookupsType>({
    paises: [],
    estados: [],
    municipios: [],
    unidades: [],
    regimes: []
  });
  const [lookupsLoading, setLookupsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`${API_URL}/api/imoveis/${id}`)
      .then(response => {
        const data = Array.isArray(response.data) ? response.data[0] : response.data;
        if (data) {
          setImovel(data);
        } else {
          setError("Imóvel não encontrado.");
        }
      })
      .catch(err => {
        console.error("Erro ao buscar imóvel:", err);
        setError("Falha ao carregar os dados do imóvel.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Efeito para carregar os lookups - com endpoints baseados no padrão observado
  useEffect(() => {
    const fetchLookups = async () => {
      setLookupsLoading(true);
      
      try {
        // Usando endpoints baseados no padrão fornecido no exemplo
        const [paisesRes, estadosRes, municipiosRes, unidadesRes, regimesRes] = await Promise.all([
          axios.get(`${API_URL}/api/paises`),
          axios.get(`${API_URL}/api/estados`),
          axios.get(`${API_URL}/api/municipios`),
          axios.get(`${API_URL}/api/unidadegestora`),
          axios.get(`${API_URL}/api/regimeutilizacao`)
        ]);

        // Atualizamos o estado com os dados obtidos
        setLookups({
          paises: Array.isArray(paisesRes.data) ? paisesRes.data : [],
          estados: Array.isArray(estadosRes.data) ? estadosRes.data : [],
          municipios: Array.isArray(municipiosRes.data) ? municipiosRes.data : [],
          unidades: Array.isArray(unidadesRes.data) ? unidadesRes.data : [],
          regimes: Array.isArray(regimesRes.data) ? regimesRes.data : []
        });
        
        console.log('Lookups carregados com sucesso');
      } catch (error) {
        console.error("Erro ao carregar lookups:", error);
        
        // Se a tentativa inicial falhar, tentamos endpoints alternativos um por um
        const lookupData: Record<string, LookupItem[]> = {
          paises: [],
          estados: [],
          municipios: [],
          unidades: [],
          regimes: []
        };

        // Tentativa secundária para carregar cada lookup individualmente
        try { 
          const paisesRes = await axios.get(`${API_URL}/api/paises`); 
          lookupData.paises = Array.isArray(paisesRes.data) ? paisesRes.data : [];
          console.log('Paises carregados');
        } catch (e) { console.warn('Falha ao carregar países'); }
        
        try { 
          const estadosRes = await axios.get(`${API_URL}/api/estados`); 
          lookupData.estados = Array.isArray(estadosRes.data) ? estadosRes.data : [];
          console.log('Estados carregados');
        } catch (e) { console.warn('Falha ao carregar estados'); }
        
        try { 
          const municipiosRes = await axios.get(`${API_URL}/api/municipios`); 
          lookupData.municipios = Array.isArray(municipiosRes.data) ? municipiosRes.data : [];
          console.log('Municípios carregados');
        } catch (e) { console.warn('Falha ao carregar municípios'); }
        
        try { 
          const unidadesRes = await axios.get(`${API_URL}/api/unidadesgestoras`); 
          lookupData.unidades = Array.isArray(unidadesRes.data) ? unidadesRes.data : [];
          console.log('Unidades gestoras carregadas');
        } catch (e) { 
          console.warn('Tentando endpoint alternativo para unidades gestoras');
          try {
            const unidadesAltRes = await axios.get(`${API_URL}/api/lookups/unidadesgestoras`);
            lookupData.unidades = Array.isArray(unidadesAltRes.data) ? unidadesAltRes.data : [];
            console.log('Unidades gestoras carregadas (alternativo)');
          } catch (e) { console.warn('Falha ao carregar unidades gestoras'); }
        }
        
        try { 
          const regimesRes = await axios.get(`${API_URL}/api/regimesutilizacao`); 
          lookupData.regimes = Array.isArray(regimesRes.data) ? regimesRes.data : [];
          console.log('Regimes carregados');
        } catch (e) { 
          console.warn('Tentando endpoint alternativo para regimes');
          try {
            const regimesAltRes = await axios.get(`${API_URL}/api/lookups/regimesutilizacao`);
            lookupData.regimes = Array.isArray(regimesAltRes.data) ? regimesAltRes.data : [];
            console.log('Regimes carregados (alternativo)');
          } catch (e) { console.warn('Falha ao carregar regimes'); }
        }
        
        // Atualiza o estado com quaisquer dados que conseguimos obter
        setLookups({
          paises: lookupData.paises,
          estados: lookupData.estados,
          municipios: lookupData.municipios,
          unidades: lookupData.unidades,
          regimes: lookupData.regimes
        });
      } finally {
        setLookupsLoading(false);
      }
    };
    
    fetchLookups();
  }, []);

  const handleSave = async (imovelData: Imovel, imagensRemover: number[]) => {
    const formData = new FormData();
    formData.append('imovelData', JSON.stringify({ ...imovelData, usermodified: usuario?.id }));
    imovelData.imagens.forEach(img => {
        if (img.file && img.isNew) {
            formData.append('imagens', img.file);
        }
    });
    formData.append('imagensRemover', JSON.stringify(imagensRemover));

    try {
        await axios.put(`${API_URL}/api/imoveis/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Imóvel atualizado com sucesso!");
        navigate('/mapa');
    } catch (err) {
        toast.error("Erro ao atualizar o imóvel.");
        console.error(err);
    }
  };

  const handleGoBackToMap = () => {
    navigate('/mapa');
  };

  const triggerFormSave = () => {
    formRef.current?.submit();
  };

  if (loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Container>;
  }

  if (error) {
    return <Container><Alert severity="error" sx={{ mt: 2 }}>{error}</Alert></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {imovel ? (
        <>
          <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography variant="h5" component="h1">
                  Cadastro do Imóvel
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {imovel.nome}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                    variant="outlined" 
                    startIcon={<ArrowBackIcon />} 
                    onClick={handleGoBackToMap}
                >
                    Voltar para o Mapa
                </Button>
                
                {/* SafePdfButton que funciona mesmo com dados parciais */}
                {imovel ? (
                  <SafePdfButton
                    imovel={imovel}
                    usuario={usuario?.nome || "Usuário"}
                    lookups={lookups}
                    variant="outlined"
                    color="primary"
                    disabled={lookupsLoading}
                  />
                ) : (
                  <Button 
                    variant="outlined" 
                    disabled
                  >
                    PDF indisponível
                  </Button>
                )}
                
                <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<SaveIcon />} 
                    onClick={triggerFormSave}
                >
                    Salvar Alterações
                </Button>
            </Box>
          </Paper>

          <ImovelForm
            ref={formRef}
            imovel={imovel}
            onSave={handleSave}
            onCancel={handleGoBackToMap}
            onDataChange={() => {}}
            displayedImovelIds={id ? [parseInt(id, 10)] : []}
            onNavigate={() => {}}
            showFormActions={false}
          />
        </>
      ) : null}
    </Container>
  );
}