import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { toast } from 'react-toastify';

// Definimos uma interface base para garantir que o item sempre terá um id opcional
interface BaseItem {
  id?: number;
}

// Usamos <T extends BaseItem> para tornar o componente genérico
interface ManagementDialogProps<T extends BaseItem> {
  open: boolean;
  onClose: () => void;
  onSave: (item: T) => void;
  item: T | null;
  title: string;
  label: string;
  fieldName: keyof T & string; // O nome do campo deve ser uma chave do tipo T
}

export default function ManagementDialog<T extends BaseItem>({
  open,
  onClose,
  onSave,
  item,
  title,
  label,
  fieldName,
}: ManagementDialogProps<T>) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) {
      // Usamos 'as string' para garantir ao TS que o valor do campo é uma string
      setValue(item ? (item[fieldName] as string) || '' : '');
    }
  }, [item, open, fieldName]);

  const handleSaveClick = () => {
    if (!value.trim()) {
      toast.error(`O campo "${label}" é obrigatório.`);
      return;
    }
    // Criamos o novo objeto e o convertemos para o tipo T antes de salvar
    const updatedItem = { ...item, [fieldName]: value } as T;
    onSave(updatedItem);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={label}
          type="text"
          fullWidth
          variant="outlined"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSaveClick} variant="contained">Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}