import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, List, ListItemText, ListItemButton, Paper, Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios, { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import LocationDialog from './LocationDialog';

const API_URL = process.env.REACT_APP_API_URL;

interface Pais { idpais: number; nome: string; }
interface Estado { idestado: number; nome: string; idpais: number; uf: string; idibge?: number; }
interface Municipio { idmunicipio: number; nome: string; idestado: number; idibge?: number; }
type LocationItem = Pais | Estado | Municipio;
type DialogType = 'pais' | 'estado' | 'municipio';

export default function LocationManagement() {
  const [paises, setPaises] = useState<Pais[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);

  const [selectedPais, setSelectedPais] = useState<Pais | null>(null);
  const [selectedEstado, setSelectedEstado] = useState<Estado | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('pais');
  const [currentItem, setCurrentItem] = useState<Partial<LocationItem> | null>(null);

  const fetchPaises = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/paises`);
      setPaises(data);
    } catch (error) { toast.error("Falha ao buscar países."); }
  }, []);

  const fetchEstados = useCallback(async (idpais: number) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/estados?pais=${idpais}`);
      setEstados(data);
    } catch (error) { toast.error("Falha ao buscar estados."); }
  }, []);

  const fetchMunicipios = useCallback(async (idestado: number) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/municipios?estado=${idestado}`);
      setMunicipios(data);
    } catch (error) { toast.error("Falha ao buscar municípios."); }
  }, []);

  useEffect(() => { fetchPaises(); }, [fetchPaises]);

  const handleSelectPais = (pais: Pais) => {
    setSelectedPais(pais);
    setSelectedEstado(null);
    setMunicipios([]);
    fetchEstados(pais.idpais);
  };

  const handleSelectEstado = (estado: Estado) => {
    setSelectedEstado(estado);
    fetchMunicipios(estado.idestado);
  };

  const handleOpenDialog = (type: DialogType, item: Partial<LocationItem> | null = null) => {
    setDialogType(type);
    // CORREÇÃO: Pré-popula o pai ao criar um novo item
    if (!item) {
        const newItem: Partial<LocationItem> = {};
        if (type === 'estado' && selectedPais) (newItem as Partial<Estado>).idpais = selectedPais.idpais;
        if (type === 'municipio' && selectedEstado) (newItem as Partial<Municipio>).idestado = selectedEstado.idestado;
        setCurrentItem(newItem);
    } else {
        setCurrentItem(item);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentItem(null);
  };

  const handleSave = async (itemData: any) => {
    // CORREÇÃO: Lógica de ID e Endpoint mais robusta
    const idMap = { pais: 'idpais', estado: 'idestado', municipio: 'idmunicipio' };
    const idKey = idMap[dialogType];
    const id = itemData[idKey];
    const isEditing = !!id;
    
    const endpointMap = { pais: 'paises', estado: 'estados', municipio: 'municipios' };
    const url = `${API_URL}/api/${endpointMap[dialogType]}${isEditing ? `/${id}` : ''}`;
    const method = isEditing ? 'put' : 'post';
    
    // Limpa o ID principal do corpo da requisição para evitar confusão no backend
    const { [idKey]: _, ...dataToSend } = itemData;

    try {
      await axios[method](url, dataToSend);
      toast.success(`${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} salvo com sucesso!`);
      handleCloseDialog();
      if (dialogType === 'pais') fetchPaises();
      if (dialogType === 'estado' && selectedPais) fetchEstados(selectedPais.idpais);
      if (dialogType === 'municipio' && selectedEstado) fetchMunicipios(selectedEstado.idestado);
    } catch (error) {
      // CORREÇÃO: Tratamento de erro específico
      let errorMessage = `Falha ao salvar ${dialogType}.`;
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || errorMessage;
      }
      toast.error(errorMessage);
    }
  };
  
  const handleDelete = async (type: DialogType, id: number) => {
    if (!window.confirm(`Tem certeza que deseja excluir este ${type}? A ação não pode ser desfeita.`)) return;

    const endpointMap = { pais: 'paises', estado: 'estados', municipio: 'municipios' };
    try {
      await axios.delete(`${API_URL}/api/${endpointMap[type]}/${id}`);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} excluído com sucesso!`);
      if (type === 'pais') {
        fetchPaises();
        setSelectedPais(null);
        setSelectedEstado(null);
        setEstados([]);
        setMunicipios([]);
      }
      if (type === 'estado' && selectedPais) {
        fetchEstados(selectedPais.idpais);
        setSelectedEstado(null);
        setMunicipios([]);
      }
      if (type === 'municipio' && selectedEstado) fetchMunicipios(selectedEstado.idestado);
    } catch (error) {
        // CORREÇÃO: Tratamento de erro específico
        let errorMessage = `Falha ao excluir ${type}.`;
        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.error || errorMessage;
        }
        toast.error(errorMessage);
    }
  };
  
  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Coluna de Países */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper variant="outlined">
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
              <Typography variant="h6">Países</Typography>
              <Button startIcon={<AddIcon />} size="small" variant="outlined" onClick={() => handleOpenDialog('pais')}>Novo</Button>
            </Box>
            <List dense component="nav" sx={{ maxHeight: 400, overflow: 'auto' }}>
              {paises.map((pais) => (
                <ListItemButton key={pais.idpais} selected={selectedPais?.idpais === pais.idpais} onClick={() => handleSelectPais(pais)}>
                  <ListItemText primary={pais.nome} />
                  <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); handleOpenDialog('pais', pais); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); handleDelete('pais', pais.idpais); }}><DeleteIcon fontSize="small" /></IconButton>
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Coluna de Estados */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper variant="outlined">
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
              <Typography variant="h6">Estados</Typography>
              <Button startIcon={<AddIcon />} size="small" variant="outlined" disabled={!selectedPais} onClick={() => handleOpenDialog('estado')}>Novo</Button>
            </Box>
            <List dense component="nav" sx={{ maxHeight: 400, overflow: 'auto' }}>
              {selectedPais ? estados.map((estado) => (
                <ListItemButton key={estado.idestado} selected={selectedEstado?.idestado === estado.idestado} onClick={() => handleSelectEstado(estado)}>
                  <ListItemText primary={`${estado.nome} (${estado.uf})`} />
                   <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); handleOpenDialog('estado', estado); }}><EditIcon fontSize="small" /></IconButton>
                   <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); handleDelete('estado', estado.idestado); }}><DeleteIcon fontSize="small" /></IconButton>
                </ListItemButton>
              )) : <ListItemButton disabled><ListItemText secondary="Selecione um país" /></ListItemButton>}
            </List>
          </Paper>
        </Box>
        
        {/* Coluna de Municípios */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper variant="outlined">
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
              <Typography variant="h6">Municípios</Typography>
              <Button startIcon={<AddIcon />} size="small" variant="outlined" disabled={!selectedEstado} onClick={() => handleOpenDialog('municipio')}>Novo</Button>
            </Box>
            <List dense component="nav" sx={{ maxHeight: 400, overflow: 'auto' }}>
              {selectedEstado ? municipios.map((municipio) => (
                <ListItemButton key={municipio.idmunicipio}>
                  <ListItemText primary={municipio.nome} />
                   <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); handleOpenDialog('municipio', municipio); }}><EditIcon fontSize="small" /></IconButton>
                   <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); handleDelete('municipio', municipio.idmunicipio); }}><DeleteIcon fontSize="small" /></IconButton>
                </ListItemButton>
              )) : <ListItemButton disabled><ListItemText secondary="Selecione um estado" /></ListItemButton>}
            </List>
          </Paper>
        </Box>
      </Box>

      {dialogOpen && (
        <LocationDialog
            open={dialogOpen}
            onClose={handleCloseDialog}
            onSave={handleSave}
            item={currentItem}
            type={dialogType}
            parentList={
                dialogType === 'estado' ? paises.map(p => ({id: p.idpais, nome: p.nome})) :
                dialogType === 'municipio' ? estados.map(e => ({id: e.idestado, nome: `${e.nome} (${e.uf})`})) :
                []
            }
        />
      )}
    </>
  );
}