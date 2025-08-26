import { useState, useEffect, useCallback } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { toast } from 'react-toastify';
import ManagementDialog from './ManagementDialog';

const apiUrl = process.env.REACT_APP_API_URL;
const API_URL = `${apiUrl}/api/unidadegestora`;

interface Unidade {
  id: number;
  nome: string;
}

export default function UnidadeGestoraManagement() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Unidade | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(API_URL);
      setUnidades(data);
    } catch (error) {
      toast.error("Falha ao carregar unidades gestoras.");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (item: Unidade | null = null) => {
    setCurrentItem(item);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentItem(null);
  };

  const handleSave = async (item: Unidade) => {
    const isEditing = !!item.id;
    const url = isEditing ? `${API_URL}/${item.id}` : API_URL;
    const method = isEditing ? 'put' : 'post';

    try {
      await axios[method](url, { nome: item.nome });
      toast.success("Unidade salva com sucesso!");
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error("Falha ao salvar unidade.");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta unidade?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        toast.success("Unidade excluída com sucesso!");
        fetchData();
      } catch (error) {
        toast.error("Falha ao excluir unidade. Verifique se não está em uso.");
      }
    }
  };

  return (
    <>
      <Paper variant="outlined">
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Gerenciar Unidades Gestoras</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Adicionar Nova
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unidades.map((unidade) => (
                <TableRow key={unidade.id}>
                  <TableCell>{unidade.id}</TableCell>
                  <TableCell>{unidade.nome}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenDialog(unidade)}><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(unidade.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Aqui especificamos o tipo <Unidade> */}
      <ManagementDialog<Unidade>
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
        item={currentItem}
        title={currentItem ? 'Editar Unidade Gestora' : 'Nova Unidade Gestora'}
        label="Nome da Unidade"
        fieldName="nome"
      />
    </>
  );
}