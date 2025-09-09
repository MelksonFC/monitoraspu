import { useState, useEffect, useCallback } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Box, Typography, Checkbox } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { toast } from 'react-toastify';
import ManagementDialog from './ManagementDialog';

const apiUrl = import.meta.env.VITE_API_URL;
const API_URL = `${apiUrl}/api/regimeutilizacao`;

interface Regime {
  id: number;
  descricao: string;
  destinado: boolean; 
}

export default function RegimeUtilizacaoManagement() {
  const [regimes, setRegimes] = useState<Regime[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Regime | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(API_URL);
      setRegimes(data);
    } catch (error) {
      toast.error("Falha ao carregar regimes de utilização.");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (item: Regime | null = null) => {
    // Se for novo, garante destinacao como false
    setCurrentItem(item ? item : { id: 0, descricao: '', destinado: false });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentItem(null);
  };

  const handleSave = async (item: Regime) => {
    const isEditing = !!item.id;
    const url = isEditing ? `${API_URL}/${item.id}` : API_URL;
    const method = isEditing ? 'put' : 'post';

    try {
      await axios[method](url, {
        descricao: item.descricao,
        destinado: item.destinado ?? false
      });
      toast.success("Regime salvo com sucesso!");
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error("Falha ao salvar regime.");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este regime?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        toast.success("Regime excluído com sucesso!");
        fetchData();
      } catch (error) {
        toast.error("Falha ao excluir regime. Verifique se não está em uso.");
      }
    }
  };

  return (
    <>
      <Paper variant="outlined">
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Gerenciar Regimes de Utilização</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Adicionar Novo
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Destinado</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {regimes.map((regime) => (
                <TableRow key={regime.id}>
                  <TableCell>{regime.id}</TableCell>
                  <TableCell>{regime.descricao}</TableCell>
                  <TableCell>
                    <Checkbox checked={!!regime.destinado} disabled />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenDialog(regime)}><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(regime.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Agora passa o campo extra para o ManagementDialog */}
      <ManagementDialog<Regime>
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
        item={currentItem}
        title={currentItem ? 'Editar Regime de Utilização' : 'Novo Regime de Utilização'}
        label="Descrição do Regime"
        fieldName="descricao"
        extraFields={[
          {
            type: 'checkbox',
            name: 'destinado',
            label: 'Destinado',
            defaultValue: false
          }
        ]}
      />
    </>
  );
}