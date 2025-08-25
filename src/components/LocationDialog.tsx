import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent 
} from '@mui/material';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  item: any | null;
  type: 'pais' | 'estado' | 'municipio';
  parentList: { id: number; nome: string }[];
}

export default function LocationDialog({ open, onClose, onSave, item, type, parentList }: DialogProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({});
    }
  }, [item, open]);

  // --- INÍCIO DA CORREÇÃO ---
  // A função agora aceita o tipo de evento do TextField ou do Select.
  // O evento do Select é importado do @mui/material.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<any>) => {
    const { name, value } = e.target;
    // O `name` pode não estar presente em alguns eventos, então garantimos que ele exista.
    if (name) {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };
  // --- FIM DA CORREÇÃO ---
  
  const handleSaveClick = () => {
    if (!formData.nome || formData.nome.trim() === '') {
        alert('O campo Nome é obrigatório.');
        return;
    }
    // Adiciona validação para UF do estado
    if (type === 'estado' && (!formData.uf || formData.uf.trim() === '')) {
      alert('O campo UF é obrigatório.');
      return;
    }
    onSave(formData);
  };

  const title = `${item && (item.idpais || item.idestado || item.idmunicipio) ? 'Editar' : 'Novo'} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  const isEditing = item && (item.idpais || item.idestado || item.idmunicipio);
  const parentField = type === 'estado' ? 'idpais' : 'idestado';
  const parentLabel = type === 'estado' ? 'País' : 'Estado';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ pt: '20px !important' }}>
        {type !== 'pais' && (
          <FormControl fullWidth margin="normal" required>
            <InputLabel id={`select-label-${parentField}`}>{parentLabel}</InputLabel>
            <Select
              labelId={`select-label-${parentField}`}
              name={parentField}
              value={formData[parentField] || ''}
              label={parentLabel}
              onChange={handleChange} // Agora é compatível
              disabled={isEditing}
            >
              {parentList.map(parent => (
                <MenuItem key={parent.id} value={parent.id}>{parent.nome}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          autoFocus
          margin="dense"
          name="nome"
          label="Nome"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.nome || ''}
          onChange={handleChange} // Também compatível
          required
        />
        
        {type === 'estado' && (
          <>
            <TextField margin="dense" name="uf" label="UF" type="text" fullWidth variant="outlined" value={formData.uf || ''} onChange={handleChange} required inputProps={{ maxLength: 2 }} />
            <TextField margin="dense" name="idibge" label="Código IBGE" type="number" fullWidth variant="outlined" value={formData.idibge || ''} onChange={handleChange} />
          </>
        )}

        {type === 'municipio' && (
          <TextField margin="dense" name="idibge" label="Código IBGE" type="number" fullWidth variant="outlined" value={formData.idibge || ''} onChange={handleChange} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSaveClick}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}