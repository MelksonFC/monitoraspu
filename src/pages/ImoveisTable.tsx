import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Button, Table, TableHead, TableRow, TableCell, TableBody,
  TableSortLabel, TextField, Checkbox, Toolbar, Typography,
  Menu, MenuItem, Paper, Select, IconButton, Tooltip, Dialog, DialogContent, FormControl, InputLabel, OutlinedInput, ListItemText, DialogTitle, DialogActions, Box,
  CircularProgress
} from "@mui/material";
// ... (outras importações)
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import SettingsBackupRestoreIcon from "@mui/icons-material/SettingsBackupRestore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FilterListIcon from "@mui/icons-material/FilterList";
import ImovelForm from "./ImovelForm";
import axios from "axios";
import { toast } from "react-toastify";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useAuth } from "../AuthContext";
import { formatValorBR } from './ImovelForm';

const TABLE_SETTINGS_TABLENAME = "imoveis";

async function fetchUserTableConfig(userId: number | string) {
  const apiUrl = import.meta.env.VITE_API_URL;
  try {
    const res = await axios.get(`${apiUrl}/api/usertablesettings/${userId}/${TABLE_SETTINGS_TABLENAME}`);
    return res.data;
  } catch (err) {
    return null;
  }
}

// Salva configuração do usuário na API
async function saveUserTableConfig(userId: number | string, config: {
  columns: string[],
  orderby: string,
  orderdir: string,
  filters: any,
  filterops: any,
  filterrange: any
}) {
  const apiUrl = import.meta.env.VITE_API_URL;
  try {
    await axios.put(`${apiUrl}/api/usertablesettings/${userId}/${TABLE_SETTINGS_TABLENAME}`, config);
  } catch (err) {
    // Você pode exibir um toast de erro se desejar
  }
}

// ... (funções de formatação, interfaces, constantes, etc. - sem alterações)
function formatDateBR(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const raw = dateStr.length >= 10 ? dateStr.slice(0, 10) : dateStr;
  const [y, m, d] = raw.split("-");
  if (y && m && d) return `${d}/${m}/${y}`;
  return dateStr;
}
function formatDateTimeBR(dateStr: string | undefined): string {
  if (!dateStr) return "";
  let d = "";
  let t = "";
  if (dateStr.includes("T")) {
    [d, t] = dateStr.split("T");
    t = t.split(".")[0].replace("Z", "");
  } else if (dateStr.includes(" ")) {
    [d, t] = dateStr.split(" ");
  } else if (dateStr.length >= 10) {
    d = dateStr.slice(0, 10);
    t = "";
  }
  const [y, m, dd] = d.split("-");
  if (y && m && dd) {
    return `${dd}/${m}/${y}` + (t ? ` ${t}` : "");
  }
  return dateStr;
}
function formatCEP(cep: string | undefined): string {
  if (!cep) return "";
  const digits = cep.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return cep;
}

type LookupItem = { id: number; nome: string; descricao?: string };
type ColumnDef = {
  id: string;
  label: string;
  numeric?: boolean;
  type?: "string" | "number" | "date" | "datetime" | "lookup" | "boolean";
};

const TABLE_MIN_WIDTH = 1200;
const PAPER_MAX_WIDTH = 1650;

const columnsAll: ColumnDef[] = [
  { id: "idimovel", label: "ID", numeric: true, type: "number" },
  { id: "nome", label: "Classe", type: "string" },
  { id: "matricula", label: "Matrícula", type: "string" },
  { id: "dataimovel", label: "Data do Imóvel", type: "date" },
  { id: "valorimovel", label: "Valor", numeric: true, type: "number" },
  { id: "ripimovel", label: "RIP Imóvel", type: "string" },
  { id: "riputilizacao", label: "RIP Utilização", type: "string" },
  { id: "situacao", label: "Ativo", type: "boolean" },
  { id: "idpais", label: "País", type: "lookup" },
  { id: "idestado", label: "Estado", type: "lookup" },
  { id: "idmunicipio", label: "Município", type: "lookup" },
  { id: "endereco", label: "Endereço", type: "string" },
  { id: "cep", label: "CEP", type: "string" },
  { id: "numero", label: "Numero", type: "string" },
  { id: "complemento", label: "Complemento", type: "string" },
  { id: "latitude", label: "Latitude", numeric: true, type: "number" },
  { id: "longitude", label: "Longitude", numeric: true, type: "number" },
  { id: "email", label: "Email", type: "string" },
  { id: "nomecartorio", label: "Cartório", type: "string" },
  { id: "nprocesso", label: "Nº Processo", type: "string" },
  { id: "ocupante", label: "Ocupante", type: "string" },
  { id: "idregimeutilizacao", label: "Regime Utilização", type: "lookup" },
  { id: "idunidadegestora", label: "Unidade Gestora", type: "lookup" },
  { id: "areaconstruida", label: "Área Construída m²", numeric: true, type: "number" },
  { id: "areaterreno", label: "Área Terreno m²", numeric: true, type: "number" },
  { id: "datecreated", label: "Criado em", type: "datetime" },
  { id: "usercreated", label: "Usuário Criação", type: "lookup" },
  { id: "datemodified", label: "Modificado em", type: "datetime" },
  { id: "usermodified", label: "Usuário Modificação", type: "lookup" }
];

const stringOperators = [
  { value: "contains", label: "Contém" },
  { value: "not_contains", label: "Não contém" },
  { value: "equals", label: "Igual" },
  { value: "not_equals", label: "Diferente" }
];
const numberOperators = [
  { value: "equals", label: "Igual" },
  { value: "not_equals", label: "Diferente" },
  { value: "greater", label: "Maior que" },
  { value: "less", label: "Menor que" },
  { value: "greater_equal", label: "Maior igual" },
  { value: "less_equal", label: "Menor Igual" },
  { value: "between", label: "Entre" }
];
const dateOperators = [
  { value: "equals", label: "Igual" },
  { value: "not_equals", label: "Diferente" },
  { value: "greater", label: "Maior que" },
  { value: "less", label: "Menor que" },
  { value: "greater_equal", label: "Maior igual" },
  { value: "less_equal", label: "Menor igual" },
  { value: "between", label: "Entre" }
];

const defaultOrderBy = "idimovel";
const defaultOrderDir: "asc" | "desc" = "asc";
const defaultColumns = columnsAll.map(c => c.id);

export default function ImoveisTable() {
    // ... (lógica e estados - sem alterações)
    const { usuario } = useAuth();
    const [imoveis, setImoveis] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>(defaultColumns);
    const [filters, setFilters] = useState<{ [key: string]: any }>({});
    const [filterOps, setFilterOps] = useState<{ [key: string]: string }>({});
    const [filterRange, setFilterRange] = useState<{ [key: string]: [string, string] }>({});
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [orderBy, setOrderBy] = useState<string>(defaultOrderBy);
    const [orderDir, setOrderDir] = useState<"asc" | "desc">(defaultOrderDir);
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
    const resizingCol = useRef<string | null>(null);
    const [openForm, setOpenForm] = useState(false);
    const [editingImovel, setEditingImovel] = useState<any>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [paises, setPaises] = useState<LookupItem[]>([]);
    const [estados, setEstados] = useState<LookupItem[]>([]);
    const [municipios, setMunicipios] = useState<LookupItem[]>([]);
    const [unidadesGestoras, setUnidadesGestoras] = useState<LookupItem[]>([]);
    const [regimes, setRegimes] = useState<LookupItem[]>([]);
    const [usuarios, setUsuarios] = useState<LookupItem[]>([]);
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const [currentFilteringCol, setCurrentFilteringCol] = useState<ColumnDef | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLayoutReady, setIsLayoutReady] = useState(false);

    const showLoading = isLoading || !isLayoutReady;

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
      if (!usuario?.id) return;
      fetchUserTableConfig(usuario.id).then(config => {
        if (config) {
          setColumns(config.columns || defaultColumns);
          setOrderBy(config.orderby || defaultOrderBy);
          setOrderDir(config.orderdir || defaultOrderDir);
          setFilters(config.filters || {});
          setFilterOps(config.filterops || {});
          setFilterRange(config.filterrange || {});
        }
      });
    }, [usuario?.id]);

    useEffect(() => {
      if (!usuario?.id) return;
      const config = {
        columns,
        orderby: orderBy,
        orderdir: orderDir,
        filters,
        filterops: filterOps,
        filterrange: filterRange
      };
      saveUserTableConfig(usuario.id, config);
    }, [columns, orderBy, orderDir, filters, filterOps, filterRange, usuario?.id]);

    async function fetchImoveis() {
    setIsLoading(true);
    setIsLayoutReady(false);
    try {
      const res = await axios.get(`${apiUrl}/api/imoveis`);
      setImoveis(Array.isArray(res.data) ? res.data : []);
      setSelectedRows([]);
    } catch (err) {
      console.error("Erro ao carregar imóveis:", err);
      toast.error("Não foi possível carregar os imóveis.");
    } finally {
        setIsLoading(false); 
    }
  }

  useEffect(() => {
    fetch(`${apiUrl}/api/paises`).then(res => res.json()).then(arr => {
      setPaises(Array.isArray(arr) ? arr.map((p: any) => ({ id: p.idpais ?? p.id, nome: p.nome })) : []);
    });
    fetch(`${apiUrl}/api/estados`).then(res => res.json()).then(arr => {
      setEstados(Array.isArray(arr) ? arr.map((e: any) => ({ id: e.idestado ?? e.id, nome: e.nome })) : []);
    });
    fetch(`${apiUrl}/api/municipios`).then(res => res.json()).then(arr => {
      setMunicipios(Array.isArray(arr) ? arr.map((m: any) => ({ id: m.idmunicipio ?? m.id, nome: m.nome })) : []);
    });
    fetch(`${apiUrl}/api/unidadegestora`).then(res => res.json()).then(arr => {
      setUnidadesGestoras(Array.isArray(arr) ? arr.map((u: any) => ({ id: u.idunidadegestora ?? u.id, nome: u.nome })) : []);
    });
    fetch(`${apiUrl}/api/regimeutilizacao`).then(res => res.json()).then(arr => {
      setRegimes(Array.isArray(arr) ? arr.map((r: any) => ({ id: r.idregimeutilizacao ?? r.id, nome: r.nome, descricao: r.descricao })) : []);
    });
    fetch(`${apiUrl}/api/usuarios`).then(res => res.json()).then(arr => {
      setUsuarios(Array.isArray(arr) ? arr.map((u: any) => ({ id: u.idusuario ?? u.id, nome: u.nome, descricao: u.descricao ?? u.nome })) : []);
    });
  }, []);

  useEffect(() => { fetchImoveis(); }, []);



  function getLookupNome(arr: LookupItem[], id: number | string | undefined): string {
    if (id === undefined || id === null) return "";
    const found = arr.find(l => Number(l.id) === Number(id));
    return found ? (found.descricao || found.nome) : String(id);
  }

  function formatTableCell(colId: string, value: any, context: 'display' | 'export' = 'display') {
    if (colId === "situacao") {
      const isChecked = value === 1 || value === true;
      if (context === 'export') {
        return isChecked ? "Sim" : "Não";
      }
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Checkbox checked={isChecked} readOnly />
        </Box>
      );
    }
    
    if (["valorimovel", "areaconstruida", "areaterreno"].includes(colId)) {
      return formatValorBR(value ?? "");
    }
    if (["dataimovel"].includes(colId)) {
      return formatDateBR(value ?? "");
    }
    if (["datecreated", "datemodified"].includes(colId)) {
      return formatDateTimeBR(value ?? "");
    }
    if (colId === "idpais") return getLookupNome(paises, value);
    if (colId === "idestado") return getLookupNome(estados, value);
    if (colId === "idmunicipio") return getLookupNome(municipios, value);
    if (colId === "idunidadegestora") return getLookupNome(unidadesGestoras, value);
    if (colId === "idregimeutilizacao") return getLookupNome(regimes, value);
    if (colId === "usercreated") return getLookupNome(usuarios, value);
    if (colId === "usermodified") return getLookupNome(usuarios, value);
    if (colId === "cep") return formatCEP(value ?? "");
    return value;
  }

  const sorted = useMemo(() => {
    const filtered = imoveis.filter(item =>
      columns.every(col => {
        const coldef = columnsAll.find(c => c.id === col);
        if (!coldef) return true;

        const op = filterOps[col] || ((coldef.type === "number" || coldef.numeric) ? "equals" : "contains");
        const val = filters[col];
        const valRange = filterRange[col] || ["", ""];
        let field = item[col];

        if (coldef.type === 'boolean') {
          if (val === "" || val === undefined) return true;
          const filterAsBoolean = val === 'true';
          const fieldAsBoolean = field === 1 || field === true;
          return fieldAsBoolean === filterAsBoolean;
        }

        if (coldef.type === "lookup") {
          const lookupArr =
            col === "idpais" ? paises :
            col === "idestado" ? estados :
            col === "idmunicipio" ? municipios :
            col === "idunidadegestora" ? unidadesGestoras :
            col === "idregimeutilizacao" ? regimes :
            col === "usercreated" || col === "usermodified" ? usuarios : [];
          if (val && Array.isArray(val) && val.length > 0) {
            return val.includes(getLookupNome(lookupArr, item[col]));
          }
          return true;
        }

        if (coldef.type === "string") {
          const fieldStr = String(field ?? "").toLowerCase();
          if (!val) return true;
          const valStr = String(val).toLowerCase();
          switch (op) {
            case "contains": return fieldStr.includes(valStr);
            case "not_contains": return !fieldStr.includes(valStr);
            case "equals": return fieldStr === valStr;
            case "not_equals": return fieldStr !== valStr;
            default: return true;
          }
        }

        if (coldef.type === "number" || coldef.numeric) {
          if (val === "" || val === undefined) return true;
          const fieldNum = Number(field);
          const valNum = Number(val);
          switch (op) {
            case "equals": return fieldNum === valNum;
            case "not_equals": return fieldNum !== valNum;
            case "greater": return fieldNum > valNum;
            case "less": return fieldNum < valNum;
            case "greater_equal": return fieldNum >= valNum;
            case "less_equal": return fieldNum <= valNum;
            case "between":
              const [min, max] = valRange;
              const minNum = Number(min), maxNum = Number(max);
              if (min === "" || max === "") return true;
              return fieldNum >= minNum && fieldNum <= maxNum;
            default: return true;
          }
        }

        if (coldef.type === "date" || coldef.type === "datetime") {
          if (!val && (!valRange[0] || !valRange[1])) return true;
          let fieldDate: Date | null = null;
          if (field) fieldDate = new Date(field);
          if (!fieldDate) return false;
          switch (op) {
            case "equals": return fieldDate.toISOString().slice(0, 10) === val;
            case "not_equals": return fieldDate.toISOString().slice(0, 10) !== val;
            case "greater": return fieldDate > new Date(val);
            case "less": return fieldDate < new Date(val);
            case "greater_equal": return fieldDate >= new Date(val);
            case "less_equal": return fieldDate <= new Date(val);
            case "between": {
              const [min, max] = valRange;
              if (!min || !max) return true;
              return fieldDate >= new Date(min) && fieldDate <= new Date(max);
            }
            default: return true;
          }
        }

        return true;
      })
    );

    return [...filtered].sort((a, b) => {
      const col = orderBy;
      const aVal = a[col];
      const bVal = b[col];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return orderDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return orderDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [imoveis, columns, filters, filterOps, filterRange, orderBy, orderDir, paises, estados, municipios, unidadesGestoras, regimes, usuarios]);

  const displayedImovelIds = useMemo(() => sorted.map(imovel => imovel.idimovel), [sorted]);
  const handleNavigate = async (newId: number) => {
    try {
      const response = await axios.get(`${apiUrl}/api/imoveis/${newId}`);
      setEditingImovel(response.data);
    } catch (error) {
      toast.error("Erro ao carregar dados do imóvel para navegação.");
      console.error(error);
    }
  };
  function handleSelectRow(item: any, checked: boolean) {
    setSelectedRows(rows =>
      checked
        ? [...rows, item]
        : rows.filter(r => r.idimovel !== item.idimovel)
    );
  }
  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedRows(e.target.checked ? sorted : []);
  }
  const allSelected = sorted.length > 0 && sorted.length === selectedRows.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < sorted.length;
  function handleExport(type: "csv" | "xlsx") {
    const exportData = (selectedRows.length > 0 ? selectedRows : sorted).map(item => {
      const obj: { [key: string]: any } = {};
      columns.forEach(colId => {
        obj[getColumnLabel(colId)] = formatTableCell(colId, item[colId], 'export');
      });
      return obj;
    });

    if (type === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Imoveis");
      XLSX.writeFile(wb, "imoveis.xlsx");
    } else {
      const BOM = "\uFEFF";
      const csv = Papa.unparse(exportData, { delimiter: ";" });
      const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "imoveis.csv";
      link.click();
    }
    setExportAnchorEl(null);
  }
  function getColumnLabel(colId: string) {
    const col = columnsAll.find(c => c.id === colId);
    return col?.label ?? colId;
  }
  function handleToggleColumn(colId: string) {
    setColumns(cols =>
      cols.includes(colId)
        ? cols.filter(c => c !== colId)
        : [...cols, colId]
    );
  }
  function moveColumn(colId: string, direction: number) {
    setColumns(cols => {
      const idx = cols.indexOf(colId);
      if (idx < 0) return cols;
      const newIdx = Math.max(0, Math.min(cols.length - 1, idx + direction));
      const newCols = [...cols];
      newCols.splice(idx, 1);
      newCols.splice(newIdx, 0, colId);
      return newCols;
    });
  }
  async function handleSubItemChange() {
    if (!editingImovel?.idimovel) return;

    try {
        const res = await axios.get(`${apiUrl}/api/imoveis/${editingImovel.idimovel}`);
        setEditingImovel(res.data);
    } catch (error) {
        console.error("Erro ao recarregar dados do imóvel para o formulário.", error);
    }
  }
  async function handleDeleteConfirmed() {
    setDeleting(true);
    try {
      await Promise.all(
        selectedRows.map(async (row) => {
          await fetch(`${apiUrl}/api/imoveis/${row.idimovel}`, {
            method: "DELETE"
          });
        })
      );
      toast.success(`${selectedRows.length} imóvel(is) excluído(s) com sucesso!`);
      await fetchImoveis();
      setSelectedRows([]);
      setOpenDeleteDialog(false);
    } catch (err) {
      toast.error("Erro ao excluir imóveis!");
    } finally {
      setDeleting(false);
    }
  }
  function handleDelete() {
    setOpenDeleteDialog(true);
  }
  async function handleOpenForm(item?: any) {
    if (item?.idimovel) {
      try {
        const response = await axios.get(`${apiUrl}/api/imoveis/${item.idimovel}`);
        setEditingImovel(response.data);
      } catch (error) {
        toast.error("Não foi possível carregar os dados completos do imóvel.");
        return;
      }
    } else {
      setEditingImovel(null);
    }
    setOpenForm(true);
  }
  function handleCloseForm() {
    setOpenForm(false);
    setEditingImovel(null);
  }
  async function handleSaveImovel(imovelData: any, imagensRemover: number[]) {
    try {
      const formData = new FormData();
      const userId = usuario?.id;

      const valorImovelNumerico = imovelData.valorimovel ? parseFloat(imovelData.valorimovel) / 100 : undefined;
      const areaConstruidaNumerico = imovelData.areaconstruida ? parseFloat(imovelData.areaconstruida) / 100 : undefined;
      const areaTerrenoNumerico = imovelData.areaterreno ? parseFloat(imovelData.areaterreno) / 100 : undefined;
      const cepSemMascara = imovelData.cep ? String(imovelData.cep).replace(/\D/g, '') : '';
  
      const imagensParaUpload = imovelData.imagens.filter((img: any) => img.isNew && img.file);
      
      const dadosLimpos = { 
        ...imovelData,
        valorimovel: valorImovelNumerico,
        areaconstruida: areaConstruidaNumerico,
        areaterreno: areaTerrenoNumerico,
        cep: cepSemMascara,
        usermodified: userId,
        imagens: imovelData.imagens.map((img: any) => ({
          id: img.id,
          ordem: img.ordem,
          isdefault: img.isdefault,
          nomearquivo: img.nomearquivo,
          isNew: img.isNew
        }))
      };

      if (!dadosLimpos.idimovel) {
        dadosLimpos.usercreated = userId;
      }
  
      formData.append('imovelData', JSON.stringify(dadosLimpos));
      formData.append('imagensRemover', JSON.stringify(imagensRemover));
  
      imagensParaUpload.forEach((img: any) => {
        formData.append('files', img.file, img.file.name);
      });
      
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
      };
      
      const url = imovelData.idimovel 
        ? `${apiUrl}/api/imoveis/${imovelData.idimovel}`
        : `${apiUrl}/api/imoveis`;
      const method = imovelData.idimovel ? 'put' : 'post';
  
      await axios[method](url, formData, config);
  
      toast.success("Imóvel salvo com sucesso!");
      await fetchImoveis();
      handleCloseForm();
  
    } catch (err) {
      let errorMsg = "Ocorreu um erro desconhecido.";
      if (axios.isAxiosError(err)) {
        errorMsg = err.response?.data?.details || err.response?.data?.error || err.message;
      }
      toast.error(`Erro ao salvar imóvel! ${errorMsg}`);
    }
  }
  function handleAdd() { handleOpenForm(); }
  function handleEdit() { if (selectedRows.length === 1) handleOpenForm(selectedRows[0]); }
  function handleRequestSort(colId: string) {
    if (orderBy === colId) { setOrderDir(dir => (dir === "asc" ? "desc" : "asc")); }
    else { setOrderBy(colId); setOrderDir("asc"); }
  }
  function handleResetOrder() {
    setColumns(defaultColumns);
    setOrderBy(defaultOrderBy);
    setOrderDir(defaultOrderDir);
  }
  function handleClearFilters() {
    setFilters({});
    setFilterOps({});
    setFilterRange({});
  }
  const handleOpenFilterMenu = (event: React.MouseEvent<HTMLElement>, col: ColumnDef) => {
    setFilterAnchorEl(event.currentTarget);
    setCurrentFilteringCol(col);
  };
  const handleCloseFilterMenu = () => {
    setFilterAnchorEl(null);
    setCurrentFilteringCol(null);
  };
  function handleMouseDown(colId: string) { resizingCol.current = colId; document.body.style.cursor = "col-resize"; }
  function handleMouseUp() { resizingCol.current = null; document.body.style.cursor = ""; }
  function handleMouseMove(e: MouseEvent) {
    if (!resizingCol.current) return;
    setColumnWidths(widths => ({ ...widths, [resizingCol.current as string]: Math.max(60, (widths[resizingCol.current as string] || 120) + e.movementX), }));
  }
  useEffect(() => {
    function onMouseUp() { handleMouseUp(); }
    function onMouseMove(e: MouseEvent) { handleMouseMove(e); }
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

    // --- INÍCIO DA CORREÇÃO 1: Largura fixa para a coluna ID ---
    useEffect(() => {
      if (isLoading || imoveis.length === 0) return;
        
        setColumnWidths(widths => {
            const newWidths = { ...widths };
            columns.forEach(colId => {
                if (!newWidths[colId]) {
                    // Se for a coluna ID, define uma largura fixa e pequena
                    if (colId === 'idimovel') {
                        newWidths[colId] = 120;
                    } else {
                        // Para as outras, mantém o cálculo dinâmico
                        const coldef = columnsAll.find(c => c.id === colId);
                        const maxLen = Math.max(
                            String(coldef?.label ?? "").length,
                            ...sorted.map(row => String(row[colId] ?? "").length)
                        );
                        newWidths[colId] = Math.max(200, Math.min(400, 80 + maxLen * 9));
                    }
                }
            });
            return newWidths;
        });
        setIsLayoutReady(true);
    }, [columns, sorted, isLoading, imoveis.length]);

  function getCellBorder(colId: string, columns: string[]) { return colId !== columns[columns.length - 1] ? "1px solid #dedede" : undefined; }
  const totalValorSelecionado = selectedRows.reduce((acc, curr) => { const valor = Number(curr.valorimovel); return acc + (isNaN(valor) ? 0 : valor); }, 0);
  function formatValor(valor: number) { return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

  const headerColor = "#f0f4f8";
  const zebraColor = "#f7fafc";
  const rowColor = "#fff";

  const lookupMap: { [key: string]: LookupItem[] } = { idpais: paises, idestado: estados, idmunicipio: municipios, idunidadegestora: unidadesGestoras, idregimeutilizacao: regimes, usercreated: usuarios, usermodified: usuarios };
  const rightAlignFields = ["valorimovel", "areaconstruida", "areaterreno"];

  return (
    <Paper
      sx={{ p: 2, width: "100%", maxWidth: PAPER_MAX_WIDTH, margin: "0 auto", overflow: "hidden", height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}
    >
      <Toolbar sx={{ px: 0, py: 1, flexShrink: 0, position: 'sticky', top: 0, zIndex: 12, bgcolor: 'background.paper' }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Imóveis</Typography>
        <Button startIcon={<DownloadIcon />} onClick={e => setExportAnchorEl(e.currentTarget)}>Exportar</Button>
        <Tooltip title="Editar"><span><Button startIcon={<EditIcon />} disabled={selectedRows.length !== 1} onClick={handleEdit}>Editar</Button></span></Tooltip>
        <Tooltip title="Excluir"><span><Button startIcon={<DeleteIcon />} disabled={selectedRows.length === 0} onClick={handleDelete}>Excluir</Button></span></Tooltip>
        <Tooltip title="Incluir"><span><Button startIcon={<AddIcon />} variant="contained" color="primary" onClick={handleAdd}>Incluir</Button></span></Tooltip>
        <Tooltip title="Restaurar ordem padrão"><IconButton onClick={handleResetOrder}><SettingsBackupRestoreIcon /></IconButton></Tooltip>
        <Tooltip title="Configurar colunas"><IconButton onClick={e => setAnchorEl(e.currentTarget)}><ViewColumnIcon /></IconButton></Tooltip>
        <Tooltip title="Limpar todos os filtros"><IconButton onClick={handleClearFilters}><ClearAllIcon /></IconButton></Tooltip>
      </Toolbar>

      <Box sx={{ width: "100%", overflow: "auto", flexGrow: 1 }}>
        {showLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', pt: 10 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Carregando dados...</Typography>
          </Box>
        ) : (
        <Table stickyHeader sx={{ minWidth: TABLE_MIN_WIDTH, tableLayout: "fixed" }} size="small">
          <TableHead>
            <TableRow>
              {/* --- INÍCIO DA CORREÇÃO 2: Checkbox --- */}
              <TableCell
                padding="none" // Remove todo o padding da célula
                sx={{
                  position: "sticky", left: 0,
                  zIndex: 11,
                  bgcolor: headerColor,
                  width: 60, minWidth: 60, maxWidth: 60,
                  borderRight: "1px solid #dedede",
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                    sx={{ p: 0 }}
                  />
                </Box>
              </TableCell>
              {/* --- FIM DA CORREÇÃO 2: Checkbox --- */}
              {columns.map(colId => {
                const col = columnsAll.find(c => c.id === colId)!;
                const isFiltered = filters[col.id] !== undefined && filters[col.id] !== '' && filters[col.id]?.length !== 0;
                return (
                  <TableCell
                    key={col.id}
                    sx={{
                      position: "sticky", top: 0, bgcolor: headerColor,
                      zIndex: 10,
                      width: columnWidths[col.id], minWidth: columnWidths[col.id], 
                      maxWidth: 400,
                      userSelect: "none", transition: "width 0.2s",
                      whiteSpace: "normal", 
                      wordBreak: "break-word",
                      textAlign: rightAlignFields.includes(colId) ? "right" : col.numeric || col.type === 'boolean' ? "center" : "left",
                      borderRight: getCellBorder(colId, columns),
                      cursor: "pointer",
                      "&:hover .filter-icon": {
                        opacity: 1,
                      },
                    }}
                    onClick={() => handleRequestSort(col.id)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <TableSortLabel active={orderBy === col.id} direction={orderBy === col.id ? orderDir : "asc"}>
                          <strong>{col.label}</strong>
                        </TableSortLabel>
                        <IconButton
                          size="small"
                          className="filter-icon"
                          sx={{ ml: 0.5, opacity: isFiltered ? 1 : 0, transition: "opacity 0.2s" }}
                          onClick={(e) => { e.stopPropagation(); handleOpenFilterMenu(e, col); }}
                        >
                          <FilterListIcon fontSize="small" color={isFiltered ? "primary" : "inherit"} />
                        </IconButton>
                      </Box>
                      <div style={{ width: 10, height: '100%', cursor: 'col-resize', alignSelf: 'stretch' }} onMouseDown={e => { e.stopPropagation(); handleMouseDown(col.id); }} />
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((item, idx) => (
              <TableRow key={item.idimovel} hover onDoubleClick={() => handleOpenForm(item)} sx={{ bgcolor: idx % 2 === 0 ? rowColor : zebraColor }}>
                {/* --- INÍCIO DA CORREÇÃO 2: Checkbox --- */}
                <TableCell
                  padding="none" // Remove todo o padding da célula
                  sx={{
                    position: "sticky", left: 0,
                    zIndex: 1,
                    bgcolor: 'inherit',
                    width: 60, minWidth: 60, maxWidth: 60,
                    borderRight: "1px solid #dedede",
                  }}
                  >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Checkbox
                      checked={!!selectedRows.find(r => r.idimovel === item.idimovel)}
                      onChange={e => handleSelectRow(item, e.target.checked)}
                      sx={{ p: 0 }}
                    />
                  </Box>
                </TableCell>
                {/* --- FIM DA CORREÇÃO 2: Checkbox --- */}
                {columns.map(colId => {
                  const col = columnsAll.find(c => c.id === colId)!;
                  return (
                    <TableCell
                      key={col.id}
                      sx={{
                        width: columnWidths[col.id], minWidth: columnWidths[col.id], 
                        maxWidth: 400,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        verticalAlign: 'top',
                        transition: "width 0.2s",
                        textAlign: rightAlignFields.includes(colId) ? "right" : col.numeric || col.type === 'boolean' ? "center" : "left",
                        borderRight: getCellBorder(colId, columns),
                      }}
                    >
                      {formatTableCell(col.id, item[col.id])}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      </Box>

      {/* ... (Barra de status e todos os Dialogs/Menus permanecem os mesmos) ... */}
      <Box sx={{ background: "#f0f4f8", borderTop: "1px solid #dedede", height: 40, display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "0 24px", flexShrink: 0 }}>
        <span>{selectedRows.length > 0 ? `Selecionados: ${selectedRows.length} | Valor total: ${formatValor(totalValorSelecionado)}` : "Nenhum registro selecionado"}</span>
      </Box>
      <Menu anchorEl={filterAnchorEl} open={Boolean(filterAnchorEl)} onClose={handleCloseFilterMenu} >
        {currentFilteringCol && (
          <Box sx={{ p: 2, width: 320 }}>
            <Typography variant="subtitle1" gutterBottom>Filtrar por {currentFilteringCol.label}</Typography>
            {currentFilteringCol.type === 'boolean' && (
              <FormControl fullWidth size="small">
                <Select value={filters[currentFilteringCol.id] ?? ''} onChange={e => setFilters(f => ({ ...f, [currentFilteringCol.id]: e.target.value }))} displayEmpty>
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="true">Sim</MenuItem>
                  <MenuItem value="false">Não</MenuItem>
                </Select>
              </FormControl>
            )}
            {currentFilteringCol.type === 'lookup' && (
              <FormControl fullWidth size="small">
                <InputLabel>{currentFilteringCol.label}</InputLabel>
                <Select multiple value={filters[currentFilteringCol.id] ?? []} onChange={e => setFilters(f => ({ ...f, [currentFilteringCol.id]: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value }))} input={<OutlinedInput label={currentFilteringCol.label} />} renderValue={selected => (selected as string[]).join(", ")}>
                  {(lookupMap[currentFilteringCol.id] || []).map(item => (
                    <MenuItem key={item.id} value={item.descricao || item.nome}>
                      <Checkbox checked={filters[currentFilteringCol.id]?.indexOf(item.descricao || item.nome) > -1} />
                      <ListItemText primary={item.descricao || item.nome} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {(currentFilteringCol.type === 'string' || currentFilteringCol.type === 'number' || currentFilteringCol.type === 'date' || currentFilteringCol.type === 'datetime') && (
              <Box>
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>Operador</InputLabel>
                  <Select
                    label="Operador"
                    value={filterOps[currentFilteringCol.id] || (currentFilteringCol.type === 'string' ? 'contains' : 'equals')}
                    onChange={e => setFilterOps(o => ({ ...o, [currentFilteringCol.id]: e.target.value as string }))}
                  >
                    {(currentFilteringCol.type === 'string' ? stringOperators : (currentFilteringCol.type === 'number' ? numberOperators : dateOperators)).map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {filterOps[currentFilteringCol.id] === 'between' ? (
                  <Box display="flex" gap={1}>
                    <TextField fullWidth size="small" type={currentFilteringCol.type === 'number' ? 'number' : 'date'} label="Mínimo" value={filterRange[currentFilteringCol.id]?.[0] ?? ""} onChange={e => setFilterRange(r => ({ ...r, [currentFilteringCol.id]: [e.target.value, filterRange[currentFilteringCol.id]?.[1] ?? ""] }))} InputLabelProps={{ shrink: true }} />
                    <TextField fullWidth size="small" type={currentFilteringCol.type === 'number' ? 'number' : 'date'} label="Máximo" value={filterRange[currentFilteringCol.id]?.[1] ?? ""} onChange={e => setFilterRange(r => ({ ...r, [currentFilteringCol.id]: [filterRange[currentFilteringCol.id]?.[0] ?? "", e.target.value] }))} InputLabelProps={{ shrink: true }} />
                  </Box>
                ) : (
                  <TextField fullWidth size="small" type={currentFilteringCol.type === 'date' || currentFilteringCol.type === 'datetime' ? 'date' : 'text'} label="Valor" value={filters[currentFilteringCol.id] ?? ""} onChange={e => setFilters(f => ({ ...f, [currentFilteringCol.id]: e.target.value }))} InputLabelProps={{ shrink: true }} />
                )}
              </Box>
            )}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleCloseFilterMenu}>Fechar</Button>
            </Box>
          </Box>
        )}
      </Menu>
      <Menu anchorEl={exportAnchorEl} open={!!exportAnchorEl} onClose={() => setExportAnchorEl(null)}>
        <MenuItem onClick={() => handleExport("csv")}>Exportar CSV (;)</MenuItem>
        <MenuItem onClick={() => handleExport("xlsx")}>Exportar XLSX</MenuItem>
      </Menu>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ style: { maxHeight: 400, minWidth: 270 } }}>
        {columnsAll.map(c => {
            const currentIdx = columns.indexOf(c.id);
            return (
              <MenuItem key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ minWidth: 110 }}>{c.label}</span>
                <Checkbox checked={columns.includes(c.id)} onChange={() => handleToggleColumn(c.id)} />
                <IconButton disabled={currentIdx <= 0} onClick={() => moveColumn(c.id, -1)} size="small" color="primary" sx={{ mx: 0.5 }}><ArrowUpwardIcon fontSize="small" /></IconButton>
                <IconButton disabled={currentIdx < 0 || currentIdx === columns.length - 1} onClick={() => moveColumn(c.id, 1)} size="small" color="primary" sx={{ mx: 0.5 }}><ArrowDownwardIcon fontSize="small" /></IconButton>
              </MenuItem>
            );
        })}
      </Menu>
      <Dialog open={openForm} onClose={handleCloseForm} fullWidth maxWidth="xl">
        <DialogContent sx={{ p: 0 }}>
          <ImovelForm imovel={editingImovel} onSave={handleSaveImovel} onCancel={handleCloseForm} onDataChange={handleSubItemChange} displayedImovelIds={displayedImovelIds} onNavigate={handleNavigate} />
        </DialogContent>
      </Dialog>
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmação de exclusão</DialogTitle>
        <DialogContent>Tem certeza que deseja excluir <strong>{selectedRows.length}</strong> registro{selectedRows.length > 1 ? "s" : ""} selecionado{selectedRows.length > 1 ? "s" : ""}?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} disabled={deleting}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirmed} disabled={deleting}>Excluir</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
