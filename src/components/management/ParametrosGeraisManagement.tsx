import { useEffect, useMemo, useState, useCallback } from 'react';
import { Paper, Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '@/AuthContext';
const apiUrl = import.meta.env.VITE_API_URL;
const API_URL = `${apiUrl}/api/parametrosgerais`;


type ParametroGeral = {
  id: number;
  parametro: string;
  conteudoStr?: string | null;
  conteudoInt?: number | null;
  descricao?: string | null;
  tipo: string;
};

export default function ParametrosGeraisManagement() {
  const { usuario } = useAuth();
  const isAdmin = useMemo(() => usuario?.idpermissao === 1, [usuario?.idpermissao]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parametros, setParametros] = useState<ParametroGeral[]>([]);
  const [editedValues, setEditedValues] = useState<Record<number, string>>({});

  const isIntType = (tipo: string) => {
    const t = String(tipo || '').toLowerCase();
    return t === 'int' || t === 'integer';
  };

  const fetchParametros = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<ParametroGeral[]>(API_URL);
      const rows = Array.isArray(data) ? data : [];
      setParametros(rows);

      const initialValues: Record<number, string> = {};
      rows.forEach((p) => {
        if (isIntType(p.tipo)) {
          initialValues[p.id] = p.conteudoInt === null || p.conteudoInt === undefined ? '' : String(p.conteudoInt);
          return;
        }

        initialValues[p.id] = p.conteudoStr || '';
      });
      setEditedValues(initialValues);
    } catch {
      toast.error('Falha ao carregar parâmetros gerais.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParametros();
  }, [fetchParametros]);

  const handleValueChange = (id: number, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.warn('Apenas administradores podem alterar este parâmetro.');
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        parametros.map((parametro) => {
          const rawValue = editedValues[parametro.id] ?? '';
          const payload = {
            parametro: parametro.parametro,
            descricao: parametro.descricao,
            tipo: parametro.tipo,
            conteudoStr: isIntType(parametro.tipo) ? null : (rawValue.trim() || null),
            conteudoInt: isIntType(parametro.tipo)
              ? (rawValue.trim() === '' ? null : Number(rawValue))
              : null,
          };

          return axios.put(`${API_URL}/${parametro.id}`, payload);
        })
      );

      toast.success('Parâmetro salvo com sucesso.');
      fetchParametros();
    } catch (error: unknown) {
      const msg =
        axios.isAxiosError(error) && error.response?.data?.error
          ? String(error.response.data.error)
          : 'Falha ao salvar parâmetro.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        PARÂMETROS GERAIS
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
          <CircularProgress size={20} />
          <Typography>Carregando parâmetros...</Typography>
        </Box>
      ) : (
        <>
          {parametros.length === 0 ? (
            <Typography color="text.secondary">Nenhum parâmetro cadastrado.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {parametros.map((parametro) => {
                const value = editedValues[parametro.id] ?? '';
                const label = parametro.descricao || parametro.parametro;
                const intType = isIntType(parametro.tipo);

                return (
                  <TextField
                    key={parametro.id}
                    fullWidth
                    label={label}
                    value={value}
                    type={intType ? 'number' : 'text'}
                    onChange={(e) => handleValueChange(parametro.id, e.target.value)}
                    disabled={!isAdmin}
                    helperText={intType ? 'Tipo: int (conteudoInt)' : 'Tipo: varchar (conteudoStr)'}
                    inputProps={intType ? { step: 1 } : undefined}
                  />
                );
              })}
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!isAdmin || saving || parametros.length === 0}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
}
