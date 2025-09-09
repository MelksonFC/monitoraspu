import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
} from '@mui/material';
import { toast } from 'react-toastify';

// Interface base para garantir que o item sempre terá um id opcional
interface BaseItem {
  id?: number;
}

// Novo tipo para campos extras
type ExtraFieldType = 'checkbox' | 'text' | 'number';

interface ExtraField<T> {
  type: ExtraFieldType;
  name: keyof T;
  label: string;
  defaultValue?: any;
}

interface ManagementDialogProps<T extends BaseItem> {
  open: boolean;
  onClose: () => void;
  onSave: (item: T) => void;
  item: T | null;
  title: string;
  label: string;
  fieldName: keyof T & string;
  extraFields?: ExtraField<T>[];
}

export default function ManagementDialog<T extends BaseItem>({
  open,
  onClose,
  onSave,
  item,
  title,
  label,
  fieldName,
  extraFields = [],
}: ManagementDialogProps<T>) {
  // Inicializa todos os valores do formulário
  const [formValues, setFormValues] = useState<any>({});

  useEffect(() => {
    if (open) {
      let initialValues: any = item ? { ...item } : { [fieldName]: '' };
      extraFields.forEach(field => {
        if (!(field.name in initialValues)) {
          initialValues[field.name] = field.defaultValue ?? (field.type === 'checkbox' ? false : '');
        }
      });
      setFormValues(initialValues);
    }
  }, [item, open, fieldName, extraFields]);

  const handleFieldChange = (key: keyof T, value: any) => {
    setFormValues((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveClick = () => {
    if (!formValues[fieldName] || (typeof formValues[fieldName] === 'string' && !formValues[fieldName].trim())) {
      toast.error(`O campo "${label}" é obrigatório.`);
      return;
    }
    onSave(formValues as T);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label={label}
            type="text"
            fullWidth
            variant="outlined"
            value={formValues[fieldName] ?? ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            sx={{ mt: 2 }}
          />
          {extraFields.map(field => {
            switch (field.type) {
              case 'checkbox':
                return (
                  <FormControlLabel
                    key={String(field.name)}
                    control={
                      <Checkbox
                        checked={!!formValues[field.name]}
                        onChange={e => handleFieldChange(field.name, e.target.checked)}
                      />
                    }
                    label={field.label}
                    sx={{ mt: 2 }}
                  />
                );
              case 'text':
                return (
                  <TextField
                    key={String(field.name)}
                    margin="dense"
                    label={field.label}
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={formValues[field.name] ?? ''}
                    onChange={e => handleFieldChange(field.name, e.target.value)}
                    sx={{ mt: 2 }}
                  />
                );
              case 'number':
                return (
                  <TextField
                    key={String(field.name)}
                    margin="dense"
                    label={field.label}
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={formValues[field.name] ?? ''}
                    onChange={e => handleFieldChange(field.name, Number(e.target.value))}
                    sx={{ mt: 2 }}
                  />
                );
              default:
                return null;
            }
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSaveClick} variant="contained">Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}