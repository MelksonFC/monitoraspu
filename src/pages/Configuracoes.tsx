import React, { useEffect, useState, useRef } from "react";
import {
  Box, Typography, IconButton, Button, Table, TableHead, TableRow, TableCell, TableBody, Switch,
  Dialog, DialogTitle, DialogContent, TextField, RadioGroup, FormControlLabel, Radio, DialogActions, Alert,
  InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EmailIcon from "@mui/icons-material/Email";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Header from "../components/Header";
import axios from "axios";
import Papa from "papaparse";

const apiUrl = import.meta.env.VITE_API_URL;

const PERMISSOES = [
  { id: 1, label: "Admin" },
  { id: 2, label: "Editor" },
  { id: 3, label: "Visualizador" },
];

function exportToCSV(data: any[]) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "usuarios.csv";
  link.click();
}

type FormUsuario = {
  nome: string;
  email: string;
  idpermissao: number;
  ativo: number;
  senha?: string;
  confirmarSenha?: string;
};

const formInicialVazio: FormUsuario = {
  nome: "",
  email: "",
  idpermissao: 3, // Padrão para 'Visualizador', mais seguro
  ativo: 1,
  senha: "",
  confirmarSenha: "",
};

const UsuarioDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (user: any) => Promise<{ message?: string }>;
  editUser: any | null;
}> = ({ open, onClose, onSave, editUser }) => {
  // Estado do formulário
  const isEdit = !!editUser;
  const [form, setForm] = useState<FormUsuario>(formInicialVazio);
  const [erroSenha, setErroSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmaSenha, setShowConfirmaSenha] = useState(false);

  // Ref para foco acessível no Dialog
  const nomeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editUser) {
        // Se está editando, preenche com os dados do usuário
        setForm({
          nome: editUser.nome,
          email: editUser.email,
          idpermissao: editUser.idpermissao,
          ativo: editUser.ativo,
          senha: "",
          confirmarSenha: "",
        });
      } else {
        // Se é novo usuário, reseta para o formulário vazio
        setForm(formInicialVazio);
      }
      // Limpa mensagens de erro e status anteriores
      setErroSenha("");
      setMsg("");
    }
  }, [editUser, open]);

  // Foca no campo nome ao abrir Dialog (acessibilidade)
  useEffect(() => {
    if (open && nomeInputRef.current) {
      nomeInputRef.current.focus();
    }
  }, [open]);

  function validaSenha(senha: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%&*]).{6,}$/.test(senha);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  }

  function handlePermissao(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({
      ...f,
      idpermissao: Number(e.target.value),
    }));
  }

  async function handleSubmit() {
    // Validação de senha
    if ((!isEdit || form.senha) && form.senha !== form.confirmarSenha) {
      setErroSenha("As senhas não coincidem.");
      return;
    }
    if ((!isEdit || form.senha) && !validaSenha(form.senha || "")) {
      setErroSenha("Senha deve ter ao menos 6 caracteres, incluindo maiúscula, minúscula, número e caractere especial.");
      return;
    }
    setErroSenha("");
    const userData = { ...form };
    if (isEdit && !form.senha) {
      userData.senha = undefined;
      userData.confirmarSenha = undefined;
    }
    const res = await onSave(userData);
    if (res?.message) setMsg(res.message);
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isEdit ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
      <DialogContent>
        <TextField
          inputRef={nomeInputRef}
          autoFocus
          label="Nome"
          name="nome"
          fullWidth
          margin="normal"
          value={form.nome}
          onChange={handleChange}
          required
        />
        <TextField
          label="Email"
          name="email"
          fullWidth
          margin="normal"
          value={form.email}
          onChange={handleChange}
          required
        />
        <RadioGroup
          row
          name="idpermissao"
          value={form.idpermissao}
          onChange={handlePermissao}
        >
          {PERMISSOES.map(p => (
            <FormControlLabel key={p.id} value={p.id} control={<Radio />} label={p.label} />
          ))}
        </RadioGroup>
        <FormControlLabel
          control={
            <Switch
              name="ativo"
              checked={form.ativo === 1}
              onChange={handleChange}
            />
          }
          label="Ativo"
        />
        <TextField
          label={isEdit ? "Nova senha" : "Senha"}
          name="senha"
          type={showSenha ? "text" : "password"}
          fullWidth
          margin="normal"
          value={form.senha}
          onChange={handleChange}
          required={!isEdit}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showSenha ? "Ocultar senha" : "Exibir senha"}
                  onClick={() => setShowSenha((show) => !show)}
                  edge="end"
                >
                  {showSenha ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <TextField
          label={isEdit ? "Confirmar nova senha" : "Confirmar senha"}
          name="confirmarSenha"
          type={showConfirmaSenha ? "text" : "password"}
          fullWidth
          margin="normal"
          value={form.confirmarSenha}
          onChange={handleChange}
          required={!!form.senha || !isEdit}
          error={!!erroSenha}
          helperText={erroSenha}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showConfirmaSenha ? "Ocultar confirmação" : "Exibir confirmação"}
                  onClick={() => setShowConfirmaSenha((show) => !show)}
                  edge="end"
                >
                  {showConfirmaSenha ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        {msg && <Alert severity="info" sx={{ mt: 2 }}>{msg}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">Salvar</Button>
      </DialogActions>
    </Dialog>
  );
};

const Configuracoes: React.FC = () => {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const usuarioAtual = { idpermissao: 1 }; 
  const novoUsuarioBtnRef = useRef<HTMLButtonElement>(null);

  // 1. Centraliza a busca de usuários em uma função para reutilização
  const fetchUsuarios = () => {
    // Adiciona um parâmetro `_` com a data atual para evitar o cache do navegador
    axios.get(`${apiUrl}/api/usuarios`, { params: { _: new Date().getTime() } })
      .then(res => setUsuarios(res.data))
      .catch(err => console.error("Erro ao buscar usuários:", err));
  };

  // 2. Função para mostrar a mensagem de status e limpá-la após 5 segundos
  const showStatusMessage = (message: string) => {
    setStatusMsg(message);
    setTimeout(() => {
      setStatusMsg("");
    }, 5000); // A mensagem some após 5 segundos
  };

  // Busca os usuários quando o componente é montado pela primeira vez
  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleSave = async (user: any): Promise<{ message?: string }> => {
    try {
      const userToSend = { ...user, email: user.email.toLowerCase() };
      let res;
      if (editUser) {
        res = await axios.put(`${apiUrl}/api/usuarios/${editUser.id}`, userToSend);
      } else {
        res = await axios.post(`${apiUrl}/api/usuarios`, userToSend);
      }
      setDialogOpen(false);
      setEditUser(null);
      novoUsuarioBtnRef.current?.focus();
      
      // 3. Usa as novas funções para atualizar a lista e mostrar a mensagem
      fetchUsuarios();
      showStatusMessage(res.data.message || "Operação realizada com sucesso.");
      
      return { message: res.data.message };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Ocorreu um erro.";
      showStatusMessage(errorMessage);
      return { message: errorMessage };
    }
  };

  async function handleReenviarAtivacao(user: any) {
    try {
      const res = await axios.put(`${apiUrl}/api/usuarios/${user.id}/reenviar-ativacao`);
      fetchUsuarios(); // Atualiza a lista de usuários
      showStatusMessage(res.data.message || "Email de ativação reenviado."); // Mostra a mensagem de sucesso
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Erro ao reenviar ativação.";
      showStatusMessage(errorMessage); // Mostra a mensagem de erro
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${apiUrl}/api/usuarios/${id}`);
      // 3. Usa as novas funções para atualizar a lista e mostrar a mensagem
      fetchUsuarios();
      showStatusMessage("Usuário excluído com sucesso.");
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Erro ao excluir usuário.";
      showStatusMessage(errorMessage);
    }
  };
  
  const handleToggleAtivo = async (user: any) => {
    try {
        const novoStatus = user.ativo === 1 ? 0 : 1;
        await axios.put(`${apiUrl}/api/usuarios/${user.id}`, { ativo: novoStatus });
        // 3. Usa as novas funções para atualizar a lista e mostrar a mensagem
        fetchUsuarios();
        showStatusMessage(`Usuário ${novoStatus === 1 ? 'ativado' : 'desativado'} com sucesso.`);
    } catch (error: any) {
        const errorMessage = error.response?.data?.error || "Erro ao alterar status do usuário.";
        showStatusMessage(errorMessage);
    }
  };

  if (usuarioAtual.idpermissao !== 1) {
    return <Typography variant="h6" sx={{ p: 4 }}>Acesso restrito a administradores.</Typography>;
  }

  return (
    <Box>
      <Header />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" mb={2}>Gestão de Usuários</Typography>
        {statusMsg && <Alert sx={{ mb: 2 }} severity="info">{statusMsg}</Alert>}
        <Button
          ref={novoUsuarioBtnRef}
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setDialogOpen(true); setEditUser(null); }}
        >
          Novo Usuário
        </Button>
        <IconButton sx={{ ml: 2 }} onClick={() => exportToCSV(usuarios)}>
          <DownloadIcon />
        </IconButton>
        <Table sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Permissão</TableCell>
              <TableCell>Ativo</TableCell>
              <TableCell>Ativado</TableCell>
              <TableCell>Último Login</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.nome}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{PERMISSOES.find(p => p.id === user.idpermissao)?.label}</TableCell>
                <TableCell>
                  <Switch
                    checked={user.ativo === 1}
                    onChange={async () => {
                      await axios.put(`${apiUrl}/api/usuarios/${user.id}`, { ...user, ativo: user.ativo === 1 ? 0 : 1 });
                      const res = await axios.get(`${apiUrl}/api/usuarios`);
                      setUsuarios(res.data);
                    }}
                  />
                </TableCell>
                <TableCell>
                  {user.ativado ? "Ativado" : (
                    <Button size="small" startIcon={<EmailIcon />} onClick={() => handleReenviarAtivacao(user)}>
                      Reenviar ativação
                    </Button>
                  )}
                </TableCell>
                <TableCell>{user.lastlogin ? new Date(user.lastlogin).toLocaleString() : "-"}</TableCell>
                <TableCell>
                  <IconButton onClick={() => { setEditUser(user); setDialogOpen(true); }}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(user.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {dialogOpen && (
          <UsuarioDialog
            // A 'key' força a recriação do componente quando o usuário a ser editado muda.
            // Se 'editUser' for nulo (novo usuário), a key será 'novo'.
            // Se estiver editando, a key será o ID do usuário.
            key={editUser ? editUser.id : 'novo'}
            open={dialogOpen}
            onClose={() => {
              setDialogOpen(false);
              setEditUser(null);
              novoUsuarioBtnRef.current?.focus();
            }}
            onSave={handleSave}
            editUser={editUser}
          />
        )}
      </Box>
    </Box>
  );
};

export default Configuracoes;