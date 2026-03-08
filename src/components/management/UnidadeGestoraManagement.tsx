import { useState, useEffect, useCallback } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Box, Typography, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { toast } from 'react-toastify';
import ManagementDialog from './ManagementDialog'; // Seu componente de diálogo

const apiUrl = import.meta.env.VITE_API_URL;
const API_URL = `${apiUrl}/api/unidadegestora`;

interface Unidade {
  id: number;
  nome: string;
  codigo: string;
}

// Define um tipo para o item que pode não ter um ID ainda (ao criar)
type EditableUnidade = Partial<Unidade>;

export default function UnidadeGestoraManagement() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  // O estado agora armazena um objeto parcial, nunca nulo quando o diálogo está aberto
  const [currentItem, setCurrentItem] = useState<EditableUnidade | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<Unidade[]>(API_URL);
      setUnidades(data);
    } catch (error) {
      toast.error("Falha ao carregar unidades gestoras.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (item: EditableUnidade | null = null) => {
    // --- PONTO PRINCIPAL DA CORREÇÃO ---
    // Se o item for nulo (clicou em "Adicionar"), iniciamos com um objeto vazio.
    // Isso garante que o ManagementDialog sempre receba um objeto, nunca `null`.
    setCurrentItem(item ? item : { id: 0, nome: '', codigo: '' });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentItem(null); // Limpa o item ao fechar
  };

  const handleSave = async (item: EditableUnidade) => {
    if (!item.nome || item.nome.trim() === '') {
        toast.warn('O nome da unidade não pode estar vazio.');
        return;
    }
    if (!item.codigo || item.codigo.trim() === '') {
        toast.warn('O código da unidade não pode estar vazio.');
        return;
    }

    const isEditing = !!item.id;
    const url = isEditing ? `${API_URL}/${item.id}` : API_URL;
    const method = isEditing ? 'put' : 'post';

    try {
      await axios[method](url, { nome: item.nome, codigo: item.codigo });
      toast.success(`Unidade ${isEditing ? 'atualizada' : 'salva'} com sucesso!`);
      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      const msg: string = error?.response?.data?.error || error?.response?.data?.message || '';
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate') || error?.response?.status === 409) {
        toast.error('Já existe uma unidade gestora com este código. Informe um código diferente.');
      } else {
        toast.error("Falha ao salvar unidade.");
      }
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        toast.success("Unidade excluída com sucesso!");
        fetchData(); // Recarrega os dados
      } catch (error) {
        toast.error("Falha ao excluir unidade. Verifique se ela não está sendo utilizada em algum registro.");
        console.error(error);
      }
    }
  };

  return (
    <>
      <Paper variant="outlined" sx={{ m: 2 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Gerenciar Unidades Gestoras</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Adicionar Nova
          </Button>
        </Box>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '10%' }}>ID</TableCell>
                <TableCell sx={{ width: '20%' }}>Código</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell align="right" sx={{ width: '15%' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} align="center"><CircularProgress /></TableCell>
                </TableRow>
              ) : unidades.map((unidade) => (
                <TableRow key={unidade.id} hover>
                  <TableCell>{unidade.id}</TableCell>
                  <TableCell>{unidade.codigo}</TableCell>
                  <TableCell>{unidade.nome}</TableCell>
                  <TableCell align="right">
                    <IconButton color="default" onClick={() => handleOpenDialog(unidade)}><EditIcon /></IconButton>
                    <IconButton color="default" onClick={() => handleDelete(unidade.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* O diálogo só é renderizado quando `currentItem` não é nulo */}
      {currentItem && (
        <ManagementDialog<EditableUnidade>
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSave}
          item={currentItem}
          title={currentItem.id ? 'Editar Unidade Gestora' : 'Nova Unidade Gestora'}
          label="Código"
          fieldName="codigo"
          extraFields={[
            { type: 'text', name: 'nome', label: 'Nome da Unidade', defaultValue: '' }
          ]}
        />
      )}
    </>
  );
}
