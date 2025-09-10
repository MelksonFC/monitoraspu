import React, { useState, useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from "react";
import {
  TextField, Button, DialogActions, MenuItem, Select, InputLabel,
  FormControl, Typography, IconButton, Box, Tooltip, Paper, Container, FormControlLabel, Checkbox, Dialog, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, CircularProgress
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ImageIcon from "@mui/icons-material/Image";
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import axios, { AxiosError } from "axios";
import type { SelectChangeEvent } from "@mui/material/Select";
import { toast } from "react-toastify";
import { useAuth } from "../AuthContext";
import MapaLeaflet from "./MapaLeaflet";
import SafePdfButton from '../components/SafePdfButton';
import { SafeNumberField } from '../components/SafeNumberField';
import MapIcon from "@mui/icons-material/Map";
import TerrainIcon from "@mui/icons-material/Terrain";
import LandscapeIcon from "@mui/icons-material/Landscape";
import PoligonoTerrenoDialog from "./PoligonoTerrenoDialog";

// Ícones para Navegação
import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';

import type { Imovel, Imagem, Fiscalizacao, Avaliacao, HstUnidadeGestora, HstRegimeUtilizacao, LookupItem } from '../types';

type FormProps = {
  imovel?: Partial<Imovel>;
  onSave: (imovel: Imovel, imagensRemover: number[]) => void;
  onCancel: () => void;
  onDataChange: () => void;
  displayedImovelIds: number[];
  onNavigate: (id: number) => void;
  isPdfMode?: boolean;
  showFormActions?: boolean;
  onRendered?: () => void;
  onReady?: () => void;
  formId?: string;
};

export type ImovelFormRef = {
  submit: () => void;
};

type ImovelFormState = Omit<Imovel, "imagens"> & {
  valorimovel: string;
  areaconstruida?: string;
  areaterreno?: string;
  novovalor?: string;
  // Adicione outros campos numéricos que quer digitar como string!
};

type DialogType = 'fiscalizacoes' | 'avaliacoes' | 'hstunidadegestora' | 'hstregimeutilizacao';
const dialogTitles: Record<DialogType, string> = {
  fiscalizacoes: 'Fiscalização',
  avaliacoes: 'Avaliação',
  hstunidadegestora: 'Histórico de Unidade Gestora',
  hstregimeutilizacao: 'Histórico de Regime de Utilização',
};

const API_URL = import.meta.env.VITE_API_URL;
const defaultImovel: Imovel = { nome: "", matricula: "", dataimovel: "", valorimovel: "", ripimovel: "", riputilizacao: "", situacao: true, idpais: 1, idestado: undefined, idmunicipio: undefined, cep: "", endereco: "", numero: "", complemento: "", latitude: -15.793889, longitude: -47.882778, email: "", nomecartorio: "", nprocesso: "", ocupante: "", idregimeutilizacao: undefined, idunidadegestora: undefined, areaconstruida: "", areaterreno: "", imagens: [], };

function safeSelectValue(val: number | undefined, arr: LookupItem[]): string { if (typeof val !== "number") return ""; return arr.some(a => a.id === val) ? String(val) : ""; }
function formatDateInput(value?: string): string { if (!value) return ""; if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value; if (value.length >= 10) return value.slice(0, 10); return value; }
function formatDateBR(dateStr?: string) { if (!dateStr) return ''; const [year, month, day] = dateStr.split('T')[0].split('-'); return `${day}/${month}/${year}`; }
export function formatValorBR(valor: string | number | null | undefined): string {
  if (valor === undefined || valor === null || String(valor).trim() === "") return "";
  const num = Number(String(valor).replace(/,/g, '.'));
  if (isNaN(num)) return "";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatValorParaDigitos(valor: string | number | null | undefined): string {
  if (valor === undefined || valor === null || String(valor).trim() === "") return "";
  const num = Number(String(valor).replace(/,/g, '.'));
  if (isNaN(num)) return "";
  return (num * 100).toFixed(0);
}


function ImageThumbnail({ imagem, onExpand, onSetDefault, onRemove, isPdfMode }: { imagem: Imagem; onExpand: () => void; onSetDefault: () => void; onRemove: () => void; isPdfMode?: boolean }) {
  return (
    <Box sx={{ position: 'relative', textAlign: 'center' }}>
      <Tooltip title="Clique para expandir">
        <Box component="img" src={imagem.url} alt={imagem.nomearquivo || `Imagem ${imagem.ordem}`} sx={{ width: 64, height: 64, objectFit: "cover", borderRadius: 2, border: imagem.isdefault ? '2px solid #1976d2' : '2px solid #ccc', cursor: isPdfMode ? 'default' : 'pointer', '&:hover': { opacity: 0.8 } }} onClick={isPdfMode ? undefined : onExpand} />
      </Tooltip>
      {!isPdfMode && (
        <>
          <Tooltip title={imagem.isdefault ? "Imagem Padrão" : "Tornar Padrão"}><IconButton size="small" sx={{ position: "absolute", bottom: -8, left: '50%', transform: 'translateX(-50%)', background: 'white', '&:hover': { background: '#f0f0f0' } }} onClick={onSetDefault}>{imagem.isdefault ? <StarIcon color="primary" sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}</IconButton></Tooltip>
          <IconButton color="error" size="small" sx={{ position: "absolute", top: -8, right: -8, background: 'white', '&:hover': { background: '#f0f0f0' } }} onClick={onRemove}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
        </>
      )}
    </Box>
  );
}

// COMPONENTE MODULAR DE CONFIRMAÇÃO
function ConfirmSaveDialog({ open, title, message, onCancel, onConfirm, confirmText = "Salvar" }: {
  open: boolean;
  title?: string;
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
}) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title || "Confirmar Salvamento"}</DialogTitle>
      <DialogContent>
        <Typography>{message || "Tem certeza que deseja salvar as mudanças?"}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button onClick={onConfirm} color="primary" variant="contained">{confirmText}</Button>
      </DialogActions>
    </Dialog>
  );
}

// === NOVO BLOCO DE VALIDAÇÃO ===

const REQUIRED_FIELDS: { name: keyof ImovelFormState; label: string }[] = [
  { name: "nome", label: "Classe" },
  { name: "matricula", label: "Matrícula" },
  { name: "dataimovel", label: "Data do Imóvel" },
  { name: "valorimovel", label: "Valor" },
  { name: "riputilizacao", label: "RIP Utilização" },
  { name: "ripimovel", label: "RIP Imóvel" },
  { name: "cep", label: "CEP" },
  { name: "idpais", label: "País" },
  { name: "idestado", label: "Estado" },
  { name: "idmunicipio", label: "Município" },
  { name: "endereco", label: "Endereço" },
  { name: "idunidadegestora", label: "Unidade Gestora" },
  { name: "idregimeutilizacao", label: "Regime de Utilização" },
  { name: "areaterreno", label: "Área Terreno" },
  { name: "areaconstruida", label: "Área Construída" },
];

const CUSTOM_VALIDATORS: {
  name: keyof ImovelFormState;
  validate: (value: any, form: ImovelFormState) => string | undefined;
}[] = [
  {
    name: "email",
    validate: (value) => {
      if (!value) return undefined;
      const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(String(value).toLowerCase()) ? undefined : "E-mail inválido";
    },
  },
  {
    name: "latitude",
    validate: (value) => {
      if (value === undefined || value === "") return "Latitude obrigatória";
      if (Number(value) < -90 || Number(value) > 90) return "Latitude fora do intervalo (-90 a 90)";
      return undefined;
    },
  },
  {
    name: "longitude",
    validate: (value) => {
      if (value === undefined || value === "") return "Longitude obrigatória";
      if (Number(value) < -180 || Number(value) > 180) return "Longitude fora do intervalo (-180 a 180)";
      return undefined;
    },
  },
  {
    name: "valorimovel",
    validate: (value) => {
      if (!value) return "Valor do imóvel obrigatório";
      const num = typeof value === "string" ? parseFloat(value.replace(/\./g, "").replace(",", ".")) : value;
      return num < 0 ? "Valor do imóvel não pode ser negativo" : undefined;
    },
  },
  {
    name: "cep",
    validate: (value) => {
      if (!value) return "CEP obrigatório";
      const onlyDigits = value.replace(/\D/g, "");
      return onlyDigits.length === 8 ? undefined : "CEP deve conter 8 dígitos";
    },
  },
  // Unicidade via API (matricula, riputilizacao, nprocesso)
];

// Função que consulta a API para verificar unicidade
async function checkUnicityAPI(form: ImovelFormState): Promise<{ [field: string]: string }> {
  const errors: { [field: string]: string } = {};
  try {
    // Matricula
    //if (form.matricula) {
    //  const res = await axios.get(`${API_URL}/api/imoveis?matricula=${encodeURIComponent(form.matricula)}`);
    //  if (Array.isArray(res.data)) {
    //    const found = res.data.find((i: any) => i.matricula === form.matricula && i.idimovel !== form.idimovel);
    //    if (found) errors.matricula = "Matrícula já cadastrada";
    //  }
    //}
    // RIP Utilização
    if (form.riputilizacao) {
      const res = await axios.get(`${API_URL}/api/imoveis?ripUtilizacao=${encodeURIComponent(form.riputilizacao)}`);
      if (Array.isArray(res.data)) {
        const found = res.data.find((i: any) => i.riputilizacao === form.riputilizacao && i.ripimovel === form.ripimovel && i.idimovel !== form.idimovel);
        if (found) errors.riputilizacao = "RIP Utilização já existe para esse RIP Imóvel";
      }
    }
    // Nº Processo
    if (form.nprocesso) {
      const res = await axios.get(`${API_URL}/api/imoveis?nprocesso=${encodeURIComponent(form.nprocesso)}`);
      if (Array.isArray(res.data)) {
        const found = res.data.find((i: any) => i.nprocesso === form.nprocesso && i.idimovel !== form.idimovel);
        if (found) errors.nprocesso = "Número de Processo já cadastrado";
      }
    }
  } catch (err) {
    // silencioso, backend retorna vazio se não encontrar
  }
  return errors;
}

function validateForm(form: ImovelFormState): { [key: string]: string } {
  const errors: { [key: string]: string } = {};

  // 1. Obrigatórios
  REQUIRED_FIELDS.forEach(({ name, label }) => {
    const value = form[name];
    if (value === undefined || value === null || String(value).trim() === "") {
      errors[name] = `${label} é obrigatório`;
    }
  });

  // 2. Personalizados
  CUSTOM_VALIDATORS.forEach(({ name, validate }) => {
    const msg = validate(form[name], form);
    if (msg) errors[name] = msg;
  });

  return errors;
}

// === FIM DO BLOCO DE VALIDAÇÃO ===

const ImovelForm = forwardRef<ImovelFormRef, FormProps>(
  ({ imovel, onSave, onCancel, onDataChange, displayedImovelIds, onNavigate, isPdfMode = false, showFormActions = true, formId }, ref) => {
    const { usuario } = useAuth();
    const [form, setForm] = useState<ImovelFormState>(defaultImovel);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
    const [unidades, setUnidades] = useState<LookupItem[]>([]);
    const [paises, setPaises] = useState<LookupItem[]>([]);
    const [estados, setEstados] = useState<LookupItem[]>([]);
    const [municipios, setMunicipios] = useState<LookupItem[]>([]);
    const [regimes, setRegimes] = useState<LookupItem[]>([]);
    const [imagens, setImagens] = useState<Imagem[]>([]);
    const [imagensRemover, setImagensRemover] = useState<number[]>([]);
    const [lightboxState, setLightboxState] = useState({ open: false, index: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fiscalizacoes, setFiscalizacoes] = useState<Fiscalizacao[]>([]);
    const [avaliacoes, setAcaliacoes] = useState<Avaliacao[]>([]);
    const [hstUnidades, setHstUnidades] = useState<HstUnidadeGestora[]>([]);
    const [hstRegimes, setHstRegimes] = useState<HstRegimeUtilizacao[]>([]);
    const [dialogState, setDialogState] = useState<{ type: DialogType, open: boolean, data?: any }>({ type: 'fiscalizacoes', open: false });
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: DialogType, id: number } | null>(null);
    const [mapaAberto, setMapaAberto] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
    const [poligonoDialogOpen, setPoligonoDialogOpen] = useState(false);

    // MUDANÇA: Variável para determinar se está em modo de edição
    const isEditMode = !!imovel?.idimovel;

    const navigationState = useMemo(() => {
        if (!imovel?.idimovel || displayedImovelIds.length === 0) { return { canGoFirst: false, canGoPrev: false, canGoNext: false, canGoLast: false, currentIndex: -1 }; }
        const currentIndex = displayedImovelIds.indexOf(imovel.idimovel);
        if (currentIndex === -1) { return { canGoFirst: false, canGoPrev: false, canGoNext: false, canGoLast: false, currentIndex: -1 }; }
        const canGoFirst = currentIndex > 0;
        const canGoPrev = currentIndex > 0;
        const canGoNext = currentIndex < displayedImovelIds.length - 1;
        const canGoLast = currentIndex < displayedImovelIds.length - 1;
        return { canGoFirst, canGoPrev, canGoNext, canGoLast, currentIndex };
    }, [imovel?.idimovel, displayedImovelIds]);

    const handleNavigationClick = (direction: 'first' | 'prev' | 'next' | 'last') => {
        const { currentIndex } = navigationState;
        if (currentIndex === -1) return;
        let newIndex = currentIndex;
        switch (direction) {
            case 'first': newIndex = 0; break;
            case 'prev': if (currentIndex > 0) newIndex = currentIndex - 1; break;
            case 'next': if (currentIndex < displayedImovelIds.length - 1) newIndex = currentIndex + 1; break;
            case 'last': newIndex = displayedImovelIds.length - 1; break;
        }
        if (newIndex !== currentIndex) { onNavigate(displayedImovelIds[newIndex]); }
    };

    const fetchLookups = () => {
        axios.get(`${API_URL}/api/paises`).then(res => setPaises(Array.isArray(res.data) ? res.data.map((p: any) => ({ id: p.idpais ?? p.id, nome: p.nome })) : []));
        axios.get(`${API_URL}/api/unidadegestora`).then(res => setUnidades(Array.isArray(res.data) ? res.data.map((u: any) => ({ id: u.idunidadegestora ?? u.id, nome: u.nome })) : []));
        axios.get(`${API_URL}/api/regimeutilizacao`).then(res => setRegimes(Array.isArray(res.data) ? res.data.map((r: any) => ({ id: r.idregimeutilizacao ?? r.id, nome: r.nome, descricao: r.descricao })) : []));
    };

    const fetchDependentLookups = (idPais?: number, idEstado?: number) => {
        const paisParaBuscar = idPais ?? form.idpais;
        if (paisParaBuscar) { axios.get(`${API_URL}/api/estados?pais=${paisParaBuscar}`).then(res => { const estadosData = Array.isArray(res.data) ? res.data.map((e: any) => ({ id: e.idestado ?? e.id, nome: e.nome, uf: e.uf })) : []; setEstados(estadosData); }); }
        const estadoParaBuscar = idEstado ?? form.idestado;
        if (estadoParaBuscar) { axios.get(`${API_URL}/api/municipios?estado=${estadoParaBuscar}`).then(res => { const municipiosData = Array.isArray(res.data) ? res.data.map((m: any) => ({ id: m.idmunicipio ?? m.id, nome: m.nome })) : []; setMunicipios(municipiosData); }); }
    };

    const fetchSubTables = async (idimovel: number) => {
        try {
            const [fiscalizacoesRes, avaliacoesRes, hstUnidadesRes, hstRegimesRes] = await Promise.all([
                axios.get(`${API_URL}/api/fiscalizacoes?idimovel=${idimovel}`),
                axios.get(`${API_URL}/api/avaliacoes?idimovel=${idimovel}`),
                axios.get(`${API_URL}/api/hstunidadegestora?idimovel=${idimovel}`),
                axios.get(`${API_URL}/api/hstregimeutilizacao?idimovel=${idimovel}`)
            ]);
            setFiscalizacoes(fiscalizacoesRes.data);
            setAcaliacoes(avaliacoesRes.data);
            setHstUnidades(hstUnidadesRes.data);
            setHstRegimes(hstRegimesRes.data);
        } catch (error) { toast.error("Erro ao carregar dados relacionados ao imóvel."); }
    };

    useEffect(() => {
      fetchLookups(); 

      if (imovel?.idimovel) {
        const imovelFormatado: ImovelFormState = {
          ...defaultImovel, 
          ...imovel,       
          valorimovel: formatValorParaDigitos(imovel.valorimovel),
          areaconstruida: formatValorParaDigitos(imovel.areaconstruida),
          areaterreno: formatValorParaDigitos(imovel.areaterreno),
        };
        
        setForm(imovelFormatado);

        const initialImagens = (imovel.imagens ?? []).sort((a, b) => a.ordem - b.ordem);
        if (initialImagens.length > 0 && !initialImagens.some(img => img.isdefault)) { 
          initialImagens[0].isdefault = true; 
        }
        setImagens(initialImagens);
        setImagensRemover([]);
        fetchSubTables(imovel.idimovel);
        fetchDependentLookups(imovel.idpais, imovel.idestado);

      } else {
        setForm(defaultImovel);
        setImagens([]);
        setImagensRemover([]);
        setFiscalizacoes([]);
        setAcaliacoes([]);
        setHstUnidades([]);
        setHstRegimes([]);
      }
    }, [imovel]);

    useEffect(() => { if (form.idestado) { fetchDependentLookups(form.idpais, form.idestado); } }, [form.idestado]);
    
    const getUnidadeNome = (id: number) => unidades.find(u => u.id === id)?.nome || id;
    const getRegimeNome = (id: number) => regimes.find(r => r.id === id)?.descricao || regimes.find(r => r.id === id)?.nome || id;

    // NOVO HANDLE SUBMIT COM VALIDAÇÃO DINÂMICA
    const handleSubmit = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      let errors = validateForm(form);

      // Checa unicidade via API
      const apiErrors = await checkUnicityAPI(form);
      errors = { ...errors, ...apiErrors };

      if (Object.keys(errors).length > 0) {
        toast.error("Há campos obrigatórios sem preenchimento ou inválidos. Corrija os campos destacados.");
        setValidationErrors(errors);
        setConfirmSaveOpen(false);
        return;
      }

      const imagensParaSalvar = imagens.map((img, index) => ({ ...img, ordem: index + 1 }));
      onSave({ ...form, imagens: imagensParaSalvar }, imagensRemover);
      setConfirmSaveOpen(false);
    };

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));

    // RESTANTE: handleChange, handleSelectChange, handleBlur, etc. — sem alterações relevantes

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;

      // Limpa erro de validação, se existir
      if (validationErrors[name]) {
        setValidationErrors(prev => ({ ...prev, [name]: '' }));
      }

      // Checkbox
      if (type === 'checkbox') {
        setForm(f => ({ ...f, [name]: checked }));
        return;
      }

      // CEP formatado
      if (name === 'cep') {
        const digitsOnly = value.replace(/\D/g, '');
        if (digitsOnly.length > 8) return;
        let formattedCep = digitsOnly;
        if (digitsOnly.length > 5) {
          formattedCep = `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`;
        }
        setForm(f => ({ ...f, [name]: formattedCep }));
        return;
      }

      // Campos numéricos amigáveis (mantém string, sem conversão para number)
      if (["valorimovel", "areaconstruida", "areaterreno", "novovalor"].includes(name)) {
        let str = value.replace(/[^\d.,-]/g, "");
        setForm(f => ({ ...f, [name]: str }));
        return;
      }

      setForm(f => ({ ...f, [name]: type === "number" ? Number(value) : value }));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      if (name === 'email') {
        const emailError = CUSTOM_VALIDATORS.find(v => v.name === "email")?.validate(value, form);
        if (emailError) setValidationErrors(prev => ({ ...prev, email: emailError }));
      }
    };

    function handleSelectChange(e: SelectChangeEvent) {
      const { name, value } = e.target;
      setForm(f => {
        const newForm = { ...f };
        if (name === "idpais") {
          newForm.idestado = undefined;
          newForm.idmunicipio = undefined;
        }
        if (name === "idestado") {
          newForm.idmunicipio = undefined;
        }
        (newForm as any)[name] = value === "" ? undefined : Number(value);
        return newForm;
      });
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      if (!e.target.files) return;
      const MAX_FILES = 5;
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

      const currentCount = imagens.length;
      const files = Array.from(e.target.files);

      // Limite de quantidade
      if (currentCount + files.length > MAX_FILES) {
        toast.error(`Você só pode adicionar até ${MAX_FILES} fotos ao imóvel.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Validação dos arquivos
      const invalidFiles = files.filter(
        (file) =>
          !ALLOWED_TYPES.includes(file.type) ||
          file.size > MAX_SIZE
      );

      if (invalidFiles.length > 0) {
        toast.error("Apenas arquivos JPEG, JPG, PNG, GIF de até 10MB são permitidos.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const novasImagens: Imagem[] = files.map((file, idx) => ({
        ordem: imagens.length + idx + 1,
        url: URL.createObjectURL(file),
        file,
        isNew: true,
        isdefault: imagens.length === 0 && idx === 0,
        nomearquivo: file.name,
      }));

      setImagens((imgs) => [...imgs, ...novasImagens]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function handleDeleteImagem(url: string) { const imagemARemover = imagens.find(img => img.url === url); if (imagemARemover?.id && !imagemARemover.isNew) setImagensRemover(removidas => [...removidas, imagemARemover.id!]); let remainingImages = imagens.filter(img => img.url !== url); if (imagemARemover?.isdefault && remainingImages.length > 0) remainingImages[0] = { ...remainingImages[0], isdefault: true }; setImagens(remainingImages); }
    
    function handleSetDefault(url: string) { setImagens(imgs => imgs.map(img => ({ ...img, isdefault: img.url === url }))); }

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));
    
    const handleLocationUpdate = (lat: number, lng: number) => { setForm(f => ({ ...f, latitude: parseFloat(lat.toFixed(8)), longitude: parseFloat(lng.toFixed(8)), })); };
    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length !== 8) { if (cep.length > 0) { setValidationErrors(prev => ({ ...prev, cep: 'CEP inválido. Deve conter 8 dígitos.' })); } return; }
        try {
            const { data: viaCepData } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
            if (viaCepData.erro) { toast.warn("CEP não encontrado."); setValidationErrors(prev => ({ ...prev, cep: 'CEP não encontrado.' })); return; }
            const { logradouro, bairro, localidade, uf } = viaCepData;
            const { data: estadosData } = await axios.get(`${API_URL}/api/estados?pais=1`);
            const estadosList: LookupItem[] = Array.isArray(estadosData)
              ? estadosData.map((e: any) => ({ id: e.idestado ?? e.id, nome: e.nome, uf: e.uf }))
              : [];
            const estadoEncontrado = estadosList.find(est => est.uf?.toUpperCase() === uf.toUpperCase());
            if (!estadoEncontrado) {
              toast.error(`Estado com a sigla ${uf} não encontrado no sistema.`);
              return;
            }
            // Atualize o estado do componente
            setEstados(estadosList);
            const { data: municipiosDoEstado } = await axios.get(`${API_URL}/api/municipios?estado=${estadoEncontrado.id}`);
            const municipiosList: LookupItem[] = Array.isArray(municipiosDoEstado) ? municipiosDoEstado.map((m: any) => ({ id: m.idmunicipio ?? m.id, nome: m.nome })) : [];
            setMunicipios(municipiosList);
            const municipioEncontrado = municipiosList.find(mun => mun.nome.toUpperCase() === localidade.toUpperCase());
            if (!municipioEncontrado) { toast.error(`Município "${localidade}" não encontrado para o estado ${uf}.`); return; }
            setForm(f => ({ ...f, endereco: `${logradouro}, ${bairro}`, idestado: estadoEncontrado.id, idmunicipio: municipioEncontrado.id }));
            toast.info("Endereço, Estado e Município preenchidos. Buscando coordenadas...");
            const streetQuery = form.numero ? `${form.numero} ${logradouro}` : logradouro;
            const { data: nominatimData } = await axios.get('https://nominatim.openstreetmap.org/search', { params: { street: streetQuery, city: localidade, state: uf, postalcode: cep, country: 'brasil', format: 'json', limit: 1 } });
            if (nominatimData && nominatimData.length > 0) { const { lat, lon } = nominatimData[0]; handleLocationUpdate(parseFloat(lat), parseFloat(lon)); toast.success("Coordenadas encontradas e atualizadas!"); } else { toast.warn("Não foi possível encontrar as coordenadas para este endereço."); }
        } catch (error) { console.error("Erro ao buscar CEP ou coordenadas:", error); toast.error("Falha ao buscar informações do CEP."); }
    };

    const handleOpenDialog = (type: DialogType, data?: any) => { if (!form.idimovel) { toast.warn("Salve o imóvel principal antes de adicionar itens."); return; } setDialogState({ type, open: true, data: data || { idimovel: form.idimovel } }); };
    const handleCloseDialog = () => setDialogState({ ...dialogState, open: false });
    const handleSaveSubItem = async (subItemData: any) => {
      const { type } = dialogState;
      const isEditing = !!subItemData.id;
      const endpoint = `/api/${type}`;
      const url = `${API_URL}${endpoint}${isEditing ? `/${subItemData.id}` : ''}`;
      const method = isEditing ? 'put' : 'post';

      // Monta o objeto conforme o tipo
      let dataToSend: any = {
        usercreated: usuario?.id,
        usermodified: usuario?.id,
      };

      if (type === 'fiscalizacoes') {
        dataToSend = {
          idimovel: form.idimovel,
          datafiscalizacao: subItemData.datafiscalizacao,
          fiscalizador: subItemData.fiscalizador,
          condicoes: subItemData.condicoes,
          observacoes: subItemData.observacoes,
          usercreated: usuario?.id,
          usermodified: usuario?.id,
          ...(isEditing && { id: subItemData.id })
        };
      } else if (type === 'avaliacoes') {
        dataToSend = {
          idimovel: form.idimovel,
          dataavaliacao: subItemData.dataavaliacao,
          avaliador: subItemData.avaliador,
          novovalor: subItemData.novovalor,
          observacoes: subItemData.observacoes,
          usercreated: usuario?.id,
          usermodified: usuario?.id,
          ...(isEditing && { id: subItemData.id })
        };
      } else if (type === 'hstunidadegestora') {
        dataToSend = {
          idimovel: form.idimovel,
          idunidadegestora: subItemData.idunidadegestora,
          dtinicio: subItemData.dtinicio,
          dtfim: subItemData.dtfim,
          usercreated: usuario?.id,
          usermodified: usuario?.id,
          ...(isEditing && { id: subItemData.id })
        };
      } else if (type === 'hstregimeutilizacao') {
        dataToSend = {
          idimovel: form.idimovel,
          idregimeutilizacao: subItemData.idregimeutilizacao,
          dtinicio: subItemData.dtinicio,
          dtfim: subItemData.dtfim,
          usercreated: usuario?.id,
          usermodified: usuario?.id,
          ...(isEditing && { id: subItemData.id })
        };
      }

      try {
        console.log("handleSaveSubItem - Enviando:", dataToSend); // Log para depuração!
        console.log("Salvando subitem", { method, url, dataToSend });
        await axios[method](url, dataToSend);
        toast.success(`${dialogTitles[type]} salvo com sucesso!`);
        handleCloseDialog();
        if (form.idimovel) {
          fetchSubTables(form.idimovel);
          onDataChange();
        }
      } catch (error) {
        toast.error(`Erro ao salvar ${dialogTitles[type]}.`);
        // Log detalhado de erro
        console.error(`Erro ao salvar ${type}:`, error, "\nPayload enviado:", dataToSend);
      }
    };
    
    const handleDeleteSubItem = async () => { 
      if (!deleteConfirm) return; 
      const { type, id } = deleteConfirm; 
      const endpoint = `/api/${type}`; 
      try { 
        await axios.delete(`${API_URL}${endpoint}/${id}`); 
        toast.success(`${dialogTitles[type]} excluído com sucesso!`);
        setDeleteConfirm(null); 
        if (form.idimovel) { 
          fetchSubTables(form.idimovel); 
          onDataChange(); 
        } 
      } 
      catch (error: unknown) {
        const err = error as AxiosError<{ error: string }>;
        const backendMsg =
          err?.response?.data?.error || `Erro ao excluir ${dialogTitles[type]}.`;
        toast.error(backendMsg);
      }
    };
    const handleOpenLightbox = (index: number) => setLightboxState({ open: true, index });
    const handleCloseLightbox = () => setLightboxState({ open: false, index: 0 });
    const handleNextImage = () => setLightboxState(prev => ({ ...prev, index: (prev.index + 1) % imagens.length }));
    const handlePrevImage = () => setLightboxState(prev => ({ ...prev, index: (prev.index - 1 + imagens.length) % imagens.length }));
    const imagensOrdenadas = useMemo(() => [...imagens].sort((a, b) => a.ordem - b.ordem), [imagens]);
    const featuredImage = useMemo(() => imagensOrdenadas.find(img => img.isdefault) || imagensOrdenadas[0], [imagensOrdenadas]);

     // Agrupa todos os dados necessários para o PDF em um único objeto
    const pdfData = useMemo(() => ({
      imovel: {
        ...form,
        imagens: imagensOrdenadas,
        fiscalizacoes,
        avaliacoes,
        hstUnidades,
        hstRegimes,
      },
      usuario: usuario?.nome || 'Usuário Desconhecido',
      lookups: {
        paises,
        estados,
        municipios,
        unidades,
        regimes,
      }
    }), [form, imagensOrdenadas, fiscalizacoes, avaliacoes, hstUnidades, hstRegimes, usuario, paises, estados, municipios, unidades, regimes]);
   

    return (
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4, ...(isPdfMode && { mt: 0, mb: 0, p: 0, background: '#fff' }) }}>
        {!isPdfMode && showFormActions && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 2 }}>
            <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>{imovel?.idimovel ? `Editando Imóvel: #${imovel.idimovel} - ${imovel.nome}` : 'Novo Imóvel'}</Typography>
            {imovel?.idimovel && (
            <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 1 }}>
              <Tooltip title="Primeiro">
                <span>
                  <IconButton onClick={() => handleNavigationClick('first')} disabled={!navigationState.canGoFirst}><FirstPageIcon /></IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Anterior">
                <span>
                  <IconButton onClick={() => handleNavigationClick('prev')} disabled={!navigationState.canGoPrev}><KeyboardArrowLeft /></IconButton>
                </span>
              </Tooltip>
              <Typography variant="body2" sx={{ px: 1 }}>{navigationState.currentIndex > -1 ? `${navigationState.currentIndex + 1} de ${displayedImovelIds.length}` : ''}</Typography>
              <Tooltip title="Próximo">
                <span>
                  <IconButton onClick={() => handleNavigationClick('next')} disabled={!navigationState.canGoNext}><KeyboardArrowRight /></IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Último">
                <span>
                  <IconButton onClick={() => handleNavigationClick('last')} disabled={!navigationState.canGoLast}><LastPageIcon /></IconButton>
                </span>
              </Tooltip>
            </Box>)}
          </Box>
        )}

        <form onSubmit={e => { e.preventDefault(); setConfirmSaveOpen(true); }} noValidate id={formId ?? "imovel-form-container"} className={isPdfMode ? "pdf-mode-container" : ""}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: isPdfMode ? 0 : 3 }}>
            <Paper variant={isPdfMode ? "elevation" : "outlined"} square={isPdfMode} elevation={isPdfMode ? 0 : 1} sx={{ p: 2, boxShadow: isPdfMode ? 'none' : 'default' }}>
              <Typography variant="h6" gutterBottom>Identificação e Fotos</Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField label="Matrícula" name="matricula" className={isPdfMode ? "pdf-field" : ""} value={form.matricula} onChange={handleChange} fullWidth required variant="outlined" InputProps={{style: isPdfMode ? { minWidth: 180, fontSize: '1rem', height: 48 } : {}}} error={!!validationErrors.matricula} helperText={validationErrors.matricula}/>
                    <FormControlLabel control={<Checkbox name="situacao" checked={!!form.situacao} onChange={handleChange} disabled={isPdfMode} />} label="Imóvel Ativo" sx={{ minWidth: 'max-content' }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label="RIP Imóvel" name="ripimovel" className={isPdfMode ? "pdf-field" : ""} value={form.ripimovel} required onChange={handleChange} fullWidth variant="outlined" InputProps={{ readOnly: isPdfMode }} error={!!validationErrors.ripimovel} helperText={validationErrors.ripimovel}/>
                    <TextField label="RIP Utilização" name="riputilizacao" className={isPdfMode ? "pdf-field" : ""} value={form.riputilizacao} required onChange={handleChange} fullWidth variant="outlined" InputProps={{ readOnly: isPdfMode }} error={!!validationErrors.riputilizacao} helperText={validationErrors.riputilizacao}/>
                  </Box>
                  <TextField label="Classe" name="nome" className={isPdfMode ? "pdf-field" : ""} value={form.nome} onChange={handleChange} fullWidth required variant="outlined" InputProps={{ readOnly: isPdfMode }} error={!!validationErrors.nome} helperText={validationErrors.nome}/>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Tooltip title={isEditMode ? "O valor do imóvel só pode ser alterado através de uma nova avaliação." : ""} arrow>
                      <span style={{ width: '100%' }}>
                        <SafeNumberField
                          label="Valor"
                          required
                          name="valorimovel"
                          value={form.valorimovel}
                          onChange={(value) => setForm(f => ({ ...f, valorimovel: value }))}
                          InputProps={{ 
                            readOnly: isEditMode || isPdfMode,
                            style: isPdfMode ? { minWidth: 180, fontSize: '1rem', height: 48 } : undefined
                          }}
                          variant="outlined"
                          inputProps={{ inputMode: "decimal" }}
                          sx={{
                            ...(isEditMode && { '& .MuiInputBase-root': { backgroundColor: '#f0f0f0' } })
                          }}
                          error={!!validationErrors.valorimovel}
                          helperText={validationErrors.valorimovel}
                        />
                      </span>
                    </Tooltip>
                    <TextField label="Data do Imóvel" name="dataimovel" className={isPdfMode ? "pdf-field" : ""} required value={formatDateInput(form.dataimovel)} onChange={handleChange} fullWidth type="date" InputLabelProps={{ shrink: true }} variant="outlined" InputProps={{ readOnly: isPdfMode }} error={!!validationErrors.dataimovel} helperText={validationErrors.dataimovel}/>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, border: "1px dashed #ccc", borderRadius: 1, p: 2, minWidth: 300 }}>
                  <Box sx={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: 1, overflow: 'hidden' }}>{featuredImage ? (
                    <Tooltip title="Clique para expandir"><img src={featuredImage.url} alt="Imagem de destaque" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: isPdfMode ? 'default' : 'pointer' }} onClick={isPdfMode ? undefined : () => { const idx = imagensOrdenadas.findIndex(i => i.url === featuredImage.url); if (idx > -1) handleOpenLightbox(idx) }} /></Tooltip>) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', flexDirection: 'column' }}>
                      <ImageIcon sx={{ fontSize: 60 }} />
                      <Typography>Nenhuma foto</Typography>
                    </Box>)}
                  </Box>{imagensOrdenadas.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', p: 1, borderTop: '1px solid #eee' }}>{imagensOrdenadas.map((img, index) => (
                    <ImageThumbnail key={img.id || `new-${index}`} imagem={img} onExpand={() => handleOpenLightbox(index)} onRemove={() => handleDeleteImagem(img.url)} onSetDefault={() => handleSetDefault(img.url)} isPdfMode={isPdfMode} />))}
                  </Box>)} {!isPdfMode && 
                    <Button fullWidth variant="outlined" startIcon={<AddPhotoAlternateIcon />} onClick={() => fileInputRef.current?.click()} sx={{ mt: 'auto' }}>Adicionar Foto(s)</Button>}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
                      multiple
                      hidden
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </Box>
                </Box>
            </Paper>
            <Paper variant={isPdfMode ? "elevation" : "outlined"} square={isPdfMode} elevation={isPdfMode ? 0 : 1} sx={{ p: 2, boxShadow: isPdfMode ? 'none' : 'default' }}>
              <Typography variant="h6" gutterBottom>Localização</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField label="CEP" name="cep" required value={form.cep ?? ""} onChange={handleChange} onBlur={handleCepBlur} variant="outlined" sx={{ flex: 1, minWidth: 120 }} error={!!validationErrors.cep} helperText={validationErrors.cep} InputProps={{ readOnly: isPdfMode }} />
                  <FormControl variant="outlined" sx={{ flex: 1, minWidth: 150 }} error={!!validationErrors.idpais} required>
                    <InputLabel>País</InputLabel>
                    <Select name="idpais" value={safeSelectValue(form.idpais, paises)} label="País" onChange={handleSelectChange} readOnly={isPdfMode}>
                      <MenuItem value="">Selecione...</MenuItem>
                      {paises.map(p => (<MenuItem key={p.id} value={String(p.id)}>{p.nome}</MenuItem>))}
                    </Select>
                    {validationErrors.idpais && <Typography color="error" variant="caption">{validationErrors.idpais}</Typography>}
                  </FormControl>
                  <FormControl variant="outlined" sx={{ flex: 1, minWidth: 150 }} error={!!validationErrors.idestado} required>
                    <InputLabel>Estado</InputLabel>
                    <Select name="idestado" value={safeSelectValue(form.idestado, estados)} label="Estado" onChange={handleSelectChange} disabled={!form.idpais || estados.length === 0 || isPdfMode} readOnly={isPdfMode}>
                      <MenuItem value="">Selecione...</MenuItem>
                      {estados.map(e => (<MenuItem key={e.id} value={String(e.id)}>{e.nome}</MenuItem>))}
                    </Select>
                    {validationErrors.idestado && <Typography color="error" variant="caption">{validationErrors.idestado}</Typography>}
                  </FormControl>
                  <FormControl variant="outlined" sx={{ flex: 2, minWidth: 180 }} error={!!validationErrors.idmunicipio} required>
                    <InputLabel>Município</InputLabel>
                    <Select name="idmunicipio" value={safeSelectValue(form.idmunicipio, municipios)} label="Município" onChange={handleSelectChange} disabled={!form.idestado || municipios.length === 0 || isPdfMode} readOnly={isPdfMode}>
                      <MenuItem value="">Selecione...</MenuItem>
                      {municipios.map(m => (<MenuItem key={m.id} value={String(m.id)}>{m.nome}</MenuItem>))}
                    </Select>
                    {validationErrors.idmunicipio && <Typography color="error" variant="caption">{validationErrors.idmunicipio}</Typography>}
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField label="Endereço" name="endereco" required value={form.endereco} onChange={handleChange} variant="outlined" sx={{ flex: 3 }} InputProps={{ readOnly: isPdfMode }} error={!!validationErrors.endereco} helperText={validationErrors.endereco}/>
                  <TextField label="Número" name="numero" value={form.numero ?? ""} onChange={handleChange} variant="outlined" sx={{ flex: 1 }} InputProps={{ readOnly: isPdfMode }} />
                </Box>
                <TextField label="Complemento" name="complemento" value={form.complemento ?? ""} onChange={handleChange} fullWidth variant="outlined" InputProps={{ readOnly: isPdfMode }} />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField label="Latitude" name="latitude" value={form.latitude ?? ""} onChange={handleChange} variant="outlined" sx={{ flex: 1 }} inputProps={{ inputMode: "decimal", readOnly: isPdfMode }} error={!!validationErrors.latitude} helperText={validationErrors.latitude}/>
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <TextField label="Longitude" name="longitude" value={form.longitude ?? ""} onChange={handleChange} fullWidth variant="outlined" inputProps={{ inputMode: "decimal", readOnly: isPdfMode }} error={!!validationErrors.longitude} helperText={validationErrors.longitude}/>
                    {!isPdfMode && 
                    <Tooltip title="Ajustar no mapa">
                      <IconButton onClick={() => setMapaAberto(true)} sx={{ ml: 1 }} color="primary">
                        <LocationOnIcon />
                      </IconButton>
                    </Tooltip>}
                  </Box>
                </Box>
              </Box>
            </Paper>
            {/* CONTATO */}
            <Paper variant={isPdfMode ? "elevation" : "outlined"} square={isPdfMode} elevation={isPdfMode ? 0 : 1} sx={{ p: 2, boxShadow: isPdfMode ? 'none' : 'default' }}>
              <Typography variant="h6" gutterBottom>Contato</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField label="e-mail" name="email" value={form.email} onChange={handleChange} onBlur={handleBlur} variant="outlined" sx={{ flex: 1 }} error={!!validationErrors.email} helperText={validationErrors.email} InputProps={{ readOnly: isPdfMode }} />
              </Box>
            </Paper>
            {/* REGISTRO */}
            <Paper variant={isPdfMode ? "elevation" : "outlined"} square={isPdfMode} elevation={isPdfMode ? 0 : 1} sx={{ p: 2, boxShadow: isPdfMode ? 'none' : 'default' }}>
              <Typography variant="h6" gutterBottom>Registro Cartorial</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField label="Cartório" name="nomecartorio" value={form.nomecartorio} onChange={handleChange} variant="outlined" sx={{ flex: 1 }} InputProps={{ readOnly: isPdfMode }}/>
                <TextField label="Nº Processo" name="nprocesso" value={form.nprocesso} onChange={handleChange} variant="outlined" sx={{ flex: 1 }} InputProps={{ readOnly: isPdfMode }} error={!!validationErrors.nprocesso} helperText={validationErrors.nprocesso}/>
                <TextField label="Ocupante" name="ocupante" value={form.ocupante} onChange={handleChange} variant="outlined" sx={{ flex: 1 }} InputProps={{ readOnly: isPdfMode }} />
              </Box>
            </Paper>
            {/* GESTÃO E ÁREAS */}
            <Paper variant={isPdfMode ? "elevation" : "outlined"} square={isPdfMode} elevation={isPdfMode ? 0 : 1} sx={{ p: 2, boxShadow: isPdfMode ? 'none' : 'default' }}>
              <Typography variant="h6" gutterBottom>Gestão e Áreas</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl variant="outlined" sx={{ flex: 1 }} error={!!validationErrors.idunidadegestora} required>
                  <InputLabel id="unidade-label">Unidade Gestora</InputLabel>
                  <Select labelId="unidade-label" name="idunidadegestora" value={safeSelectValue(form.idunidadegestora, unidades)} label="Unidade Gestora" onChange={handleSelectChange} readOnly={isPdfMode}>
                    <MenuItem value="">Selecione...</MenuItem>
                    {unidades.map(u => (<MenuItem key={u.id} value={String(u.id)}>{u.nome}</MenuItem>))}
                  </Select>
                  {validationErrors.idunidadegestora && <Typography color="error" variant="caption">{validationErrors.idunidadegestora}</Typography>}
                </FormControl>
                <FormControl fullWidth variant="outlined" sx={{ flex: 1 }} error={!!validationErrors.idregimeutilizacao} required>
                  <InputLabel id="regime-label">Regime Utilização</InputLabel>
                  <Select labelId="regime-label" name="idregimeutilizacao" value={safeSelectValue(form.idregimeutilizacao, regimes)} label="Regime Utilização" onChange={handleSelectChange} readOnly={isPdfMode}>
                    <MenuItem value="">Selecione...</MenuItem>
                    {regimes.map(r => (<MenuItem key={r.id} value={String(r.id)}>{r.descricao || r.nome}</MenuItem>))}
                  </Select>
                  {validationErrors.idregimeutilizacao && <Typography color="error" variant="caption">{validationErrors.idregimeutilizacao}</Typography>}
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <SafeNumberField
                  label="Área Construída"
                  required
                  name="areaconstruida"
                  value={form.areaconstruida  || ''}
                  onChange={(value) => setForm(f => ({ ...f, areaconstruida: value }))}
                  InputProps={{ readOnly: isPdfMode }}
                  variant="outlined"
                  inputProps={{ inputMode: "decimal" }}
                  error={!!validationErrors.areaconstruida}
                  helperText={validationErrors.areaconstruida}
                />
                <SafeNumberField
                  label="Área Terreno"
                  required
                  name="areaterreno"
                  value={form.areaterreno  || ''}
                  onChange={(value) => setForm(f => ({ ...f, areaterreno: value }))}
                  InputProps={{ readOnly: isPdfMode }}
                  variant="outlined"
                  inputProps={{ inputMode: "decimal" }}
                  error={!!validationErrors.areaterreno}
                  helperText={validationErrors.areaterreno}
                />
                {!form.idimovel ? (
                  <Tooltip title="Demarcar terreno">
                    <span>
                      <IconButton disabled
                        aria-label="Demarcar terreno"
                        sx={{
                          ml: 1, 
                          borderRadius: "100%",
                        }}
                      >
                        <MapIcon/>
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip title="Demarcar terreno">
                    <span>
                    <IconButton
                      aria-label="Demarcar terreno"
                      onClick={() => setPoligonoDialogOpen(true)}
                      sx={{
                          ml: 1, 
                          borderRadius: "100%",
                        }}
                    >
                      <MapIcon/>
                    </IconButton>
                    </span>
                    </Tooltip>
                    <PoligonoTerrenoDialog
                      open={poligonoDialogOpen}
                      onClose={() => setPoligonoDialogOpen(false)}
                      idimovel={form.idimovel}
                      lat={form.latitude}
                      lng={form.longitude}
                    />
                  </>
                )}
              </Box>
            </Paper>
            <Paper variant={isPdfMode ? "elevation" : "outlined"} square={isPdfMode} elevation={isPdfMode ? 0 : 1} sx={{ p: 2, boxShadow: isPdfMode ? 'none' : 'default' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Fiscalizações</Typography>
                {!isPdfMode && <Button startIcon={<AddIcon />} onClick={() => handleOpenDialog('fiscalizacoes')} variant="contained" size="small">Adicionar</Button>}
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Fiscal</TableCell>
                      <TableCell>Condições verificadas na fiscalização</TableCell>
                      {!isPdfMode && <TableCell align="right">Ações</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>{fiscalizacoes.map(f => (
                    <TableRow key={f.id} hover>
                      <TableCell>{formatDateBR(f.datafiscalizacao)}</TableCell>
                      <TableCell>{f.fiscalizador}</TableCell>
                      <TableCell>{f.condicoes}</TableCell>
                      {!isPdfMode && (
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog('fiscalizacoes', f)}><EditIcon /></IconButton>
                        <IconButton size="small" onClick={() => setDeleteConfirm({ type: 'fiscalizacoes', id: f.id! })}><DeleteIcon /></IconButton>
                      </TableCell>)}
                    </TableRow>))}
                    {fiscalizacoes.length === 0 && 
                    <TableRow>
                      <TableCell colSpan={isPdfMode ? 3 : 4} align="center">Nenhuma fiscalização encontrada.</TableCell>
                    </TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            <Paper variant={isPdfMode ? "elevation" : "outlined"} square={isPdfMode} elevation={isPdfMode ? 0 : 1} sx={{ p: 2, boxShadow: isPdfMode ? 'none' : 'default' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Avaliações</Typography>
                {!isPdfMode && <Button startIcon={<AddIcon />} onClick={() => handleOpenDialog('avaliacoes')} variant="contained" size="small">Adicionar</Button>}
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Avaliador</TableCell>
                      <TableCell>Novo Valor</TableCell>
                      {!isPdfMode && 
                      <TableCell align="right">Ações</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>{avaliacoes.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell>{formatDateBR(a.dataavaliacao)}</TableCell>
                      <TableCell>{a.avaliador}</TableCell>
                      <TableCell>{formatValorBR(a.novovalor)}</TableCell>
                      {!isPdfMode && 
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog('avaliacoes', a)}><EditIcon /></IconButton>
                        <IconButton size="small" onClick={() => setDeleteConfirm({ type: 'avaliacoes', id: a.id! })}><DeleteIcon /></IconButton>
                      </TableCell>}
                    </TableRow>))}
                    {avaliacoes.length === 0 && 
                    <TableRow>
                      <TableCell colSpan={isPdfMode ? 3 : 4} align="center">Nenhuma avaliação encontrada.</TableCell>
                    </TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            <Accordion defaultExpanded={true} sx={{ '&.Mui-expanded': { mt: isPdfMode ? 0 : 'default' }, boxShadow: isPdfMode ? 'none' : 'default', '&:before': { display: isPdfMode ? 'none' : 'flex' } }}>
              <AccordionSummary expandIcon={isPdfMode ? null : <ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Typography variant="h6">Histórico de Unidade Gestora</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {!isPdfMode && 
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <Button startIcon={<AddIcon />} onClick={(e) => { e.stopPropagation(); handleOpenDialog('hstunidadegestora'); }} variant="contained" size="small">Adicionar</Button>
                </Box>}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Unidade Gestora</TableCell>
                        <TableCell>Data Início</TableCell>
                        <TableCell>Data Fim</TableCell>
                        {!isPdfMode && 
                        <TableCell align="right">Ações</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>{hstUnidades.map(h => (
                      <TableRow key={h.id}>
                        <TableCell>{getUnidadeNome(h.idunidadegestora)}</TableCell>
                        <TableCell>{formatDateBR(h.dtinicio)}</TableCell>
                        <TableCell>{h.dtfim ? formatDateBR(h.dtfim) : 'Atual'}</TableCell>
                        {!isPdfMode && 
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenDialog('hstunidadegestora', h)}><EditIcon /></IconButton>
                          <IconButton size="small" onClick={() => setDeleteConfirm({ type: 'hstunidadegestora', id: h.id! })}><DeleteIcon /></IconButton>
                        </TableCell>}
                      </TableRow>))}{hstUnidades.length === 0 && 
                      <TableRow>
                        <TableCell colSpan={isPdfMode ? 3 : 4} align="center">Nenhum histórico encontrado.</TableCell>
                      </TableRow>}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
            <Accordion defaultExpanded={true} sx={{ '&.Mui-expanded': { mt: isPdfMode ? 0 : 'default' }, boxShadow: isPdfMode ? 'none' : 'default', '&:before': { display: isPdfMode ? 'none' : 'flex' } }}>
              <AccordionSummary expandIcon={isPdfMode ? null : <ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Typography variant="h6">Histórico de Regime de Utilização</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {!isPdfMode && 
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <Button startIcon={<AddIcon />} onClick={(e) => { e.stopPropagation(); handleOpenDialog('hstregimeutilizacao'); }} variant="contained" size="small">Adicionar</Button>
                </Box>}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Regime de Utilização</TableCell>
                        <TableCell>Data Início</TableCell>
                        <TableCell>Data Fim</TableCell>
                        {!isPdfMode && 
                        <TableCell align="right">Ações</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>{hstRegimes.map(h => (
                      <TableRow key={h.id}>
                        <TableCell>{getRegimeNome(h.idregimeutilizacao)}</TableCell>
                        <TableCell>{formatDateBR(h.dtinicio)}</TableCell>
                        <TableCell>{h.dtfim ? formatDateBR(h.dtfim) : 'Atual'}</TableCell>
                        {!isPdfMode && 
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenDialog('hstregimeutilizacao', h)}><EditIcon />
                          </IconButton><IconButton size="small" onClick={() => setDeleteConfirm({ type: 'hstregimeutilizacao', id: h.id! })}><DeleteIcon /></IconButton>
                        </TableCell>}
                      </TableRow>))}{hstRegimes.length === 0 && 
                      <TableRow>
                        <TableCell colSpan={isPdfMode ? 3 : 4} align="center">Nenhum histórico encontrado.</TableCell>
                      </TableRow>}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Box>
          {!isPdfMode && showFormActions && (
          <DialogActions sx={{ mt: 3, p: 0, justifyContent: 'space-between' }}>
            <Box>
              {imovel?.idimovel && (
                <SafePdfButton
                  imovel={{...(pdfData.imovel as Imovel)}}
                  usuario={String(pdfData.usuario || 'Usuário')}
                  lookups={pdfData.lookups}
                  variant="outlined"
                  color="secondary"
                  size="medium"
                />
              )}
            </Box>
            <Box>
              <Button onClick={onCancel}>CANCELAR</Button>
              <Button variant="contained" 
                color="primary" 
                sx={{ ml: 1 }}
                onClick={e => { e.preventDefault(); setConfirmSaveOpen(true); }}
                type="button"> SALVAR IMÓVEL</Button>
            </Box>
          </DialogActions>
          )}
        </form>
        <ConfirmSaveDialog
          open={confirmSaveOpen}
          title="Confirmar Salvamento"
          message="Tem certeza que deseja salvar as mudanças deste imóvel?"
          onCancel={() => setConfirmSaveOpen(false)}
          onConfirm={handleSubmit}
          confirmText="Salvar"
        />
        {mapaAberto && (
          <MapaLeaflet open={mapaAberto} onClose={() => setMapaAberto(false)} latInicial={Number(form.latitude) || -15.793889} lngInicial={Number(form.longitude) || -47.882778} onLocationChange={handleLocationUpdate} />)}
          <SubItemDialog 
            dialogState={dialogState}
            onClose={handleCloseDialog}
            onSave={handleSaveSubItem}
            lookups={{ unidades, regimes }}
            isPdfMode={isPdfMode}
          />
          <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent>
              <Typography>Tem certeza que deseja excluir este item?</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button onClick={handleDeleteSubItem} color="error">Excluir</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={lightboxState.open} onClose={handleCloseLightbox} maxWidth="xl" PaperProps={{ sx: { backgroundColor: 'rgba(0, 0, 0, 0.7)' } }}>
            <DialogContent sx={{ p: 1, position: 'relative' }}>
              <IconButton onClick={handleCloseLightbox} sx={{ position: 'absolute', top: 8, right: 8, color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1 }}>
                <CloseIcon />
              </IconButton>
              {imagensOrdenadas.length > 1 && (
                <IconButton onClick={handlePrevImage} sx={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)', color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                  <ArrowBackIosNewIcon />
                </IconButton>)}
                {imagensOrdenadas[lightboxState.index]?.url && (<img src={imagensOrdenadas[lightboxState.index].url} alt="Visualização expandida" style={{ width: '100%', maxHeight: '90vh', objectFit: 'contain' }} />)}{imagensOrdenadas.length > 1 && (
                  <IconButton onClick={handleNextImage} sx={{ position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)', color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <ArrowForwardIosIcon />
                  </IconButton>
                )}
            </DialogContent>
          </Dialog>
          <Dialog open={confirmSaveOpen} onClose={() => setConfirmSaveOpen(false)}>
            <DialogTitle>Confirmar Salvamento</DialogTitle>
            <DialogContent>
              <Typography>Tem certeza que deseja salvar as mudanças deste imóvel?</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmSaveOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} color="primary" variant="contained">Salvar</Button>
            </DialogActions>
          </Dialog>
        </Container>
    );
});

export default ImovelForm;

function SubItemDialog({
  dialogState,
  onClose,
  onSave,
  lookups,
  isPdfMode = false,
}: {
  dialogState: { type: DialogType; open: boolean; data?: any };
  onClose: () => void;
  onSave: (data: any) => void;
  lookups: { unidades: LookupItem[]; regimes: LookupItem[] };
  isPdfMode?: boolean;
}) {
  const { type, open, data } = dialogState;
  
type FormDialogData = {
  id?: number;
  datafiscalizacao?: string;
  fiscalizador?: string;
  condicoes?: string;
  observacoes?: string;
  dataavaliacao?: string;
  avaliador?: string;
  novovalor?: string;
  idunidadegestora?: string;
  dtinicio?: string;
  dtfim?: string;
  idregimeutilizacao?: string;
};
  const [formData, setFormData] = useState<FormDialogData>({});
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  useEffect(() => {
    setFormData({
      id: data?.id,
      datafiscalizacao: data?.datafiscalizacao ?? "",
      fiscalizador: data?.fiscalizador ?? "",
      condicoes: data?.condicoes ?? "",
      observacoes: data?.observacoes ?? "",
      dataavaliacao: data?.dataavaliacao ?? "",
      avaliador: data?.avaliador ?? "",
      novovalor: formatValorParaDigitos(data?.novovalor),
      idunidadegestora: data?.idunidadegestora !== undefined && data?.idunidadegestora !== null ? String(data.idunidadegestora) : "",
      dtinicio: data?.dtinicio ?? "",
      dtfim: data?.dtfim ?? "",
      idregimeutilizacao: data?.idregimeutilizacao !== undefined && data?.idregimeutilizacao !== null ? String(data.idregimeutilizacao) : "",
    });
  }, [data]);

  // Corrigido: Usando apenas formData e onSave do escopo
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const { name, value } = e.target;

    // Para campos numéricos amigáveis
    if (name === "novovalor") {
      const str = typeof value === "string" ? value.replace(/[^\d.,-]/g, "") : String(value);
      setFormData((prev) => ({ ...prev, [name]: str }));
      return;
    }

    // Para selects/campos que esperam string, converta sempre para string
    if (
      name === "idunidadegestora" ||
      name === "idregimeutilizacao" ||
      name === "dtinicio" ||
      name === "dtfim"
    ) {
      setFormData((prev) => ({
        ...prev,
        [name]: value === undefined || value === null ? "" : String(value),
      }));
      return;
    }

    // Para os demais campos, mantenha como string
    setFormData((prev) => ({
      ...prev,
      [name]: value === undefined || value === null ? "" : String(value),
    }));
  };

const handleSubItemSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setConfirmSaveOpen(true);
  };

const handleConfirmSave = () => {
    setConfirmSaveOpen(false);

    const valorParaSalvar = formData.novovalor 
      ? parseFloat(formData.novovalor) / 100 
      : undefined;

    // Cria o objeto para salvar, convertendo os campos para número
    const toSave = {
      ...formData,
      idunidadegestora:
        formData.idunidadegestora !== undefined && formData.idunidadegestora !== ""
          ? Number(formData.idunidadegestora)
          : undefined,
      idregimeutilizacao:
        formData.idregimeutilizacao !== undefined && formData.idregimeutilizacao !== ""
          ? Number(formData.idregimeutilizacao)
          : undefined,
      novovalor: valorParaSalvar,
    };

    onSave(toSave);
  };  

  if (!open) return null;

  const renderFormFields = () => {
    switch (type) {
      case "fiscalizacoes":
        return (
          <>
            <TextField
              name="datafiscalizacao"
              label="Data da Fiscalização"
              type="date"
              value={formatDateInput(formData?.datafiscalizacao)}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              name="fiscalizador"
              label="Nome do Fiscal"
              value={formData?.fiscalizador || ""}
              onChange={handleChange}
              required
            />
            <TextField
              name="condicoes"
              label="Condições verificadas na fiscalização"
              value={formData?.condicoes || ""}
              onChange={handleChange}
              multiline
              rows={3}
              required
            />
          </>
        );
      case "avaliacoes":
        return (
          <>
            <TextField
              name="dataavaliacao"
              label="Data da Avaliação"
              type="date"
              value={formatDateInput(formData?.dataavaliacao)}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              name="avaliador"
              label="Nome do Avaliador"
              value={formData?.avaliador || ""}
              onChange={handleChange}
              required
            />
            <SafeNumberField
              label="Novo Valor do Imóvel"
              name="novovalor"
              value={formData.novovalor || ""}
              onChange={(value) => setFormData(f => ({ ...f, novovalor: value }))}
              InputProps={{ readOnly: isPdfMode }}
              variant="outlined"
              inputProps={{ inputMode: "decimal" }}
            />
            <TextField
              name="observacoes"
              label="Observações"
              value={formData?.observacoes || ""}
              onChange={handleChange}
              multiline
              rows={3}
            />
          </>
        );
      case "hstunidadegestora":
        return (
          <>
            <FormControl fullWidth required>
              <InputLabel>Unidade Gestora</InputLabel>
                <Select
                  name="idunidadegestora"
                  value={formData.idunidadegestora || ""}
                  label="Unidade Gestora"
                  onChange={handleChange}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {lookups.unidades.map((u: LookupItem) => (
                    <MenuItem key={u.id} value={String(u.id)}>
                      {u.nome}
                    </MenuItem>
                  ))}
                </Select>
            </FormControl>
            <TextField
              name="dtinicio"
              label="Data Início"
              type="date"
              value={formatDateInput(formData?.dtinicio)}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              name="dtfim"
              label="Data Fim"
              type="date"
              value={formatDateInput(formData?.dtfim)}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </>
        );
      case "hstregimeutilizacao":
        return (
          <>
            <FormControl fullWidth required>
              <InputLabel>Regime de Utilização</InputLabel>
                <Select
                  name="idregimeutilizacao"
                  value={formData.idregimeutilizacao || ""}
                  label="Regime de Utilização"
                  onChange={handleChange}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {lookups.regimes.map((r: LookupItem) => (
                    <MenuItem key={r.id} value={String(r.id)}>
                      {r.descricao || r.nome}
                    </MenuItem>
                  ))}
                </Select>
            </FormControl>
            <TextField
              name="dtinicio"
              label="Data Início"
              type="date"
              value={formatDateInput(formData?.dtinicio)}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              name="dtfim"
              label="Data Fim"
              type="date"
              value={formatDateInput(formData?.dtfim)}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </>
        );
      default:
        return null;
    }
  };

  if (!open) return null;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{data?.id ? "Editar" : "Adicionar"} {dialogTitles[type]}</DialogTitle>
      <form onSubmit={handleSubItemSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {renderFormFields()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </form>
      <ConfirmSaveDialog
        open={confirmSaveOpen}
        title={`Confirmar ${data?.id ? "Edição" : "Cadastro"} de ${dialogTitles[type]}`}
        message={`Tem certeza que deseja salvar as mudanças deste ${dialogTitles[type].toLowerCase()}?`}
        onCancel={() => setConfirmSaveOpen(false)}
        onConfirm={handleConfirmSave}
      />
    </Dialog>
  );
}