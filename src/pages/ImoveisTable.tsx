import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Button, Table, TableHead, TableRow, TableCell, TableBody,
  TableSortLabel, TextField, Checkbox, Toolbar, Typography,
  Menu, MenuItem, Paper, Select, IconButton, Tooltip, Dialog, DialogContent, FormControl, InputLabel, OutlinedInput, ListItemText, DialogTitle, DialogActions, Box,
  CircularProgress, TablePagination
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
import ViewCompactIcon from "@mui/icons-material/ViewCompact";
import ViewStreamIcon from "@mui/icons-material/ViewStream";
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
  filterrange: any,
  compactmode: boolean,
  rowsperpage: number
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
    const [compactMode, setCompactMode] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

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
          setCompactMode(config.compactmode || false);
          setRowsPerPage(config.rowsperpage || 50);
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
        filterrange: filterRange,
        compactmode: compactMode,
        rowsperpage: rowsPerPage
      };
      saveUserTableConfig(usuario.id, config);
    }, [columns, orderBy, orderDir, filters, filterOps, filterRange, compactMode, rowsPerPage, usuario?.id]);

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

  // Reseta para a primeira página quando filtros, ordenação ou dados mudam
  useEffect(() => {
    setPage(0);
  }, [filters, filterOps, filterRange, orderBy, orderDir, imoveis.length]);


  function getLookupNome(arr: LookupItem[], id: number | string | undefined): string {
    if (id === undefined || id === null) return "";
    const found = arr.find(l => Number(l.id) === Number(id));
    return found ? (found.descricao || found.nome) : String(id);
  }

  function formatTableCell(colId: string, value: any) {
    if (colId === "situacao") {
      const isChecked = value === 1 || value === true;
      return isChecked ? "Sim" : "Não";
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

  const dynamicLookupOptions = useMemo(() => {
    const lookupColumns = ["idpais", "idestado", "idmunicipio", "idunidadegestora", "idregimeutilizacao", "usercreated", "usermodified"];
    const options: { [key: string]: LookupItem[] } = {};

    const fullLookupMap: { [key: string]: LookupItem[] } = {
        idpais: paises,
        idestado: estados,
        idmunicipio: municipios,
        idunidadegestora: unidadesGestoras,
        idregimeutilizacao: regimes,
        usercreated: usuarios,
        usermodified: usuarios
    };

    lookupColumns.forEach(colId => {
        // 1. Coleta todos os IDs únicos presentes na tabela (sorted) para esta coluna
        const uniqueIds = new Set(sorted.map(item => item[colId]).filter(id => id !== null && id !== undefined));
        
        // 2. Busca os objetos completos (id, nome) a partir dos IDs únicos
        const sourceList = fullLookupMap[colId] || [];
        const filteredOptions = sourceList.filter(item => uniqueIds.has(item.id));
        
        options[colId] = filteredOptions;
    });

    return options;
  }, [sorted, paises, estados, municipios, unidadesGestoras, regimes, usuarios]);

  // Array paginado - aplicado DEPOIS de filtros e ordenação
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sorted.slice(startIndex, startIndex + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

  // Otimização: calcula soma apenas dos selecionados com useMemo
  const totalValorSelecionado = useMemo(() => {
    return selectedRows.reduce((acc, curr) => {
      const valor = Number(curr.valorimovel);
      return acc + (isNaN(valor) ? 0 : valor);
    }, 0);
  }, [selectedRows]);

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
    if (e.target.checked) {
      // Seleciona apenas os itens da página atual
      const newSelections = paginatedData.filter(
        item => !selectedRows.find(r => r.idimovel === item.idimovel)
      );
      setSelectedRows([...selectedRows, ...newSelections]);
    } else {
      // Desmarca apenas os itens da página atual
      const currentPageIds = paginatedData.map(item => item.idimovel);
      setSelectedRows(selectedRows.filter(r => !currentPageIds.includes(r.idimovel)));
    }
  }
  const allSelected = paginatedData.length > 0 && paginatedData.every(item => 
    selectedRows.find(r => r.idimovel === item.idimovel)
  );
  const someSelected = paginatedData.some(item => 
    selectedRows.find(r => r.idimovel === item.idimovel)
  ) && !allSelected;
  function handleExport(type: "csv" | "xlsx") {
    const exportData = (selectedRows.length > 0 ? selectedRows : sorted).map(item => {
      const obj: { [key: string]: any } = {};
      columns.forEach(colId => {
        obj[getColumnLabel(colId)] = formatTableCell(colId, item[colId]);
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
    setPage(0); // Reseta para primeira página
  }
  
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reseta para primeira página ao mudar linhas por página
  };
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

  function getCellBorder(colId: string, columns: string[]) { return colId !== columns[columns.length - 1] ? "1px solid hsl(var(--border))" : undefined; }
  function formatValor(valor: number) { return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

  const headerColor = "hsl(0 0% 15%)";
  const headerHoverColor = "hsl(0 0% 20%)"; // Hover do header sem transparência
  const zebraColor = "hsl(0 0% 10%)";
  const rowColor = "hsl(var(--card))";
  const hoverColor = "hsl(0 0% 18%)"; // Hover das linhas sem transparência
  const selectedColor = "hsl(210 100% 20%)";

  //const lookupMap: { [key: string]: LookupItem[] } = { idpais: paises, idestado: estados, idmunicipio: municipios, idunidadegestora: unidadesGestoras, idregimeutilizacao: regimes, usercreated: usuarios, usermodified: usuarios };
  const rightAlignFields = ["valorimovel", "areaconstruida", "areaterreno"];

  return (
    <Box
      sx={{ 
        width: "100%", 
        maxWidth: PAPER_MAX_WIDTH, 
        margin: "0 auto",
        p: 3,
        height: "calc(100vh - 100px)", 
        display: "flex", 
        flexDirection: "column",
      }}
    >
      <Paper
        elevation={0}
        sx={{ 
          display: "flex", 
          flexDirection: "column", 
          overflow: "hidden",
          height: "100%",
          bgcolor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 2,
        }}
      >
      <Toolbar sx={{ 
        px: 3, 
        py: 2, 
        flexShrink: 0, 
        bgcolor: 'hsl(var(--card))',
        borderBottom: '2px solid hsl(var(--border))',
        gap: 1
      }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600, color: 'hsl(var(--foreground))' }}>Imóveis</Typography>
        <Button startIcon={<DownloadIcon />} onClick={e => setExportAnchorEl(e.currentTarget)} sx={{ color: 'hsl(var(--foreground))' }}>Exportar</Button>
        <Tooltip title="Editar"><span><Button startIcon={<EditIcon />} disabled={selectedRows.length !== 1} onClick={handleEdit} sx={{ color: 'hsl(var(--foreground))', '&.Mui-disabled': { color: 'hsl(var(--muted-foreground))' } }}>Editar</Button></span></Tooltip>
        <Tooltip title="Excluir"><span><Button startIcon={<DeleteIcon />} disabled={selectedRows.length === 0} onClick={handleDelete} sx={{ color: 'hsl(var(--foreground))', '&.Mui-disabled': { color: 'hsl(var(--muted-foreground))' } }}>Excluir</Button></span></Tooltip>
        <Tooltip title="Incluir"><span><Button startIcon={<AddIcon />} variant="contained" color="primary" onClick={handleAdd}>Incluir</Button></span></Tooltip>
        <Tooltip title={compactMode ? "Modo Extenso" : "Modo Compacto"}>
          <IconButton onClick={() => setCompactMode(!compactMode)} sx={{ color: 'hsl(var(--foreground))' }}>
            {compactMode ? <ViewStreamIcon /> : <ViewCompactIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Restaurar ordem padrão"><IconButton onClick={handleResetOrder} sx={{ color: 'hsl(var(--foreground))' }}><SettingsBackupRestoreIcon /></IconButton></Tooltip>
        <Tooltip title="Configurar colunas"><IconButton onClick={e => setAnchorEl(e.currentTarget)} sx={{ color: 'hsl(var(--foreground))' }}><ViewColumnIcon /></IconButton></Tooltip>
        <Tooltip title="Limpar todos os filtros"><IconButton onClick={handleClearFilters} sx={{ color: 'hsl(var(--foreground))' }}><ClearAllIcon /></IconButton></Tooltip>
      </Toolbar>

      <Box sx={{ 
        width: "100%", 
        overflow: "auto", 
        flexGrow: 1,
        bgcolor: 'hsl(var(--background))',
      }}>
        {showLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', pt: 10 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Carregando dados...</Typography>
          </Box>
        ) : (
        <Table stickyHeader sx={{ minWidth: TABLE_MIN_WIDTH, tableLayout: "fixed" }} size={compactMode ? "small" : "medium"}>
          <TableHead>
            <TableRow>
              {/* --- INÍCIO DA CORREÇÃO 2: Checkbox --- */}
              <TableCell
                padding="none"
                sx={{
                  position: "sticky", left: 0,
                  zIndex: 11,
                  bgcolor: headerColor,
                  width: 60, minWidth: 60, maxWidth: 60,
                  borderRight: "2px solid hsl(var(--border))",
                  borderBottom: "2px solid hsl(var(--border))",
                  fontWeight: 600,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                    sx={{ 
                      p: 0,
                      color: 'hsl(var(--foreground))',
                      '&.Mui-checked': { color: 'primary.main' },
                      '&.MuiCheckbox-indeterminate': { color: 'primary.main' }
                    }}
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
                      color: 'hsl(var(--foreground))',
                      fontWeight: 600,
                      zIndex: 10,
                      width: columnWidths[col.id], minWidth: columnWidths[col.id], 
                      maxWidth: 400,
                      userSelect: "none", transition: "all 0.2s",
                      whiteSpace: "normal", 
                      wordBreak: "break-word",
                      textAlign: rightAlignFields.includes(colId) ? "right" : col.numeric || col.type === 'boolean' ? "center" : "left",
                      borderRight: getCellBorder(colId, columns),
                      borderBottom: "2px solid hsl(var(--border))",
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: headerHoverColor,
                      },
                      "&:hover .filter-icon": {
                        opacity: 1,
                      },
                    }}
                    onClick={() => handleRequestSort(col.id)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <TableSortLabel 
                          active={orderBy === col.id} 
                          direction={orderBy === col.id ? orderDir : "asc"}
                          sx={{
                            color: 'hsl(var(--muted-foreground))',
                            '&:hover': {
                              color: 'hsl(var(--foreground))',
                            },
                            '&.Mui-active': {
                              color: 'hsl(var(--foreground))',
                              fontWeight: 700,
                            },
                            '& .MuiTableSortLabel-icon': {
                              color: 'hsl(var(--muted-foreground)) !important',
                              opacity: 0.5,
                            },
                            '&.Mui-active .MuiTableSortLabel-icon': {
                              color: 'hsl(var(--foreground)) !important',
                              opacity: 1,
                            },
                          }}
                        >
                          <strong>{col.label}</strong>
                        </TableSortLabel>
                        <IconButton
                          size="small"
                          className="filter-icon"
                          sx={{ ml: 0.5, opacity: isFiltered ? 1 : 0, transition: "opacity 0.2s", color: 'hsl(var(--foreground))' }}
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
            {paginatedData.map((item, idx) => (
              <TableRow 
                key={item.idimovel} 
                hover 
                onDoubleClick={() => handleOpenForm(item)} 
                sx={{ 
                  bgcolor: !!selectedRows.find(r => r.idimovel === item.idimovel) 
                    ? selectedColor 
                    : (idx % 2 === 0 ? rowColor : zebraColor),
                  '&:hover': {
                    bgcolor: hoverColor + ' !important',
                  },
                  transition: 'background-color 0.15s',
                  cursor: 'pointer',
                  borderBottom: '1px solid hsl(var(--border) / 0.5)',
                }}
              >
                {/* --- INÍCIO DA CORREÇÃO 2: Checkbox --- */}
                <TableCell
                  padding="none"
                  sx={{
                    position: "sticky", left: 0,
                    zIndex: 2,
                    bgcolor: (!!selectedRows.find(r => r.idimovel === item.idimovel) 
                      ? selectedColor 
                      : (idx % 2 === 0 ? rowColor : zebraColor)) + ' !important',
                    width: 60, minWidth: 60, maxWidth: 60,
                    borderRight: "2px solid hsl(var(--border))",
                  }}
                  >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Checkbox
                      checked={!!selectedRows.find(r => r.idimovel === item.idimovel)}
                      onChange={e => handleSelectRow(item, e.target.checked)}
                      sx={{ 
                        p: 0,
                        color: 'hsl(var(--foreground))',
                        '&.Mui-checked': { color: 'primary.main' }
                      }}
                    />
                  </Box>
                </TableCell>
                {/* --- FIM DA CORREÇÃO 2: Checkbox --- */}
                {columns.map(colId => {
                  const col = columnsAll.find(c => c.id === colId)!;
                  const cellValue = formatTableCell(col.id, item[col.id]);
                  const cellText = typeof cellValue === 'string' || typeof cellValue === 'number' ? String(cellValue) : '';
                  
                  return (
                    <Tooltip 
                      key={col.id}
                      title={compactMode && cellText ? cellText : ''}
                      placement="top"
                      arrow
                    >
                      <TableCell
                        sx={{
                          width: columnWidths[col.id], minWidth: columnWidths[col.id], 
                          maxWidth: 400,
                          whiteSpace: compactMode ? "nowrap" : "normal",
                          wordBreak: "break-word",
                          overflow: compactMode ? "hidden" : "visible",
                          textOverflow: compactMode ? "ellipsis" : "clip",
                          verticalAlign: 'top',
                          transition: "width 0.2s",
                          textAlign: rightAlignFields.includes(colId) ? "right" : col.numeric || col.type === 'boolean' ? "center" : "left",
                          borderRight: getCellBorder(colId, columns),
                          color: 'hsl(var(--foreground))',
                          ...(compactMode && {
                            py: 0.5,
                            height: '36px',
                            maxHeight: '36px',
                          }),
                        }}
                      >
                        {cellValue}
                      </TableCell>
                    </Tooltip>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      </Box>

      {/* Pagina\u00e7\u00e3o */}
      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[25, 50, 100, 200, 500]}
        labelRowsPerPage="Linhas por p\u00e1gina:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        sx={{
          bgcolor: 'hsl(var(--card))',
          borderTop: '1px solid hsl(var(--border))',
          color: 'hsl(var(--foreground))',
          flexShrink: 0,
          '.MuiTablePagination-select': {
            color: 'hsl(var(--foreground))',
          },
          '.MuiTablePagination-selectIcon': {
            color: 'hsl(var(--foreground))',
          },
          '.MuiTablePagination-actions': {
            color: 'hsl(var(--foreground))',
          },
        }}
      />

      {/* Barra de status */}
      <Box sx={{ 
        bgcolor: 'hsl(var(--card))', 
        borderTop: "1px solid hsl(var(--border))", 
        height: 48, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        px: 3, 
        flexShrink: 0, 
        color: 'hsl(var(--foreground))',
        fontWeight: 500
      }}>
        <span>{selectedRows.length > 0 ? `Selecionados: ${selectedRows.length} | Valor total: ${formatValor(totalValorSelecionado)}` : "Nenhum registro selecionado"}</span>
        <span>Total de registros: {sorted.length}</span>
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
                  {/* Troca o lookupMap pelo dynamicLookupOptions */}
                  {(dynamicLookupOptions[currentFilteringCol.id] || []).map(item => (
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
      <Menu 
        anchorEl={anchorEl} 
        open={Boolean(anchorEl)} 
        onClose={() => setAnchorEl(null)} 
        PaperProps={{ 
          style: { 
            maxHeight: 500, 
            width: 380,
          },
          sx: {
            bgcolor: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid hsl(var(--border))', position: 'sticky', top: 0, bgcolor: 'hsl(var(--card))', zIndex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>Configurar Colunas</Typography>
          <Typography variant="caption" color="hsl(var(--muted-foreground))">
            {columns.length} de {columnsAll.length} colunas visíveis
          </Typography>
        </Box>
        
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid hsl(var(--border))', bgcolor: 'hsl(var(--muted) / 0.3)' }}>
          <Button 
            size="small" 
            onClick={() => setColumns(defaultColumns)}
            sx={{ mr: 1 }}
          >
            Restaurar Padrão
          </Button>
          <Button 
            size="small" 
            onClick={() => setColumns(columnsAll.map(c => c.id))}
          >
            Mostrar Todas
          </Button>
        </Box>

        {columnsAll.map(c => {
            const currentIdx = columns.indexOf(c.id);
            const isVisible = columns.includes(c.id);
            return (
              <MenuItem 
                key={c.id} 
                sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  py: 1,
                  px: 2,
                  bgcolor: isVisible ? 'hsl(var(--accent) / 0.1)' : 'transparent',
                  '&:hover': {
                    bgcolor: isVisible ? 'hsl(var(--accent) / 0.2)' : 'hsl(var(--accent) / 0.1)',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <Checkbox 
                    checked={isVisible} 
                    onChange={() => handleToggleColumn(c.id)}
                    size="small"
                    sx={{ mr: 1, p: 0 }}
                  />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: isVisible ? 500 : 400,
                      color: isVisible ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {c.label}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                  <Tooltip title="Mover para cima">
                    <span>
                      <IconButton 
                        disabled={currentIdx <= 0} 
                        onClick={(e) => { e.stopPropagation(); moveColumn(c.id, -1); }} 
                        size="small" 
                        sx={{ 
                          p: 0.5,
                          color: 'hsl(var(--foreground))',
                          '&:hover': {
                            bgcolor: 'hsl(var(--accent))',
                          },
                          '&:disabled': { 
                            opacity: 0.3,
                            color: 'hsl(var(--muted-foreground))',
                          }
                        }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Mover para baixo">
                    <span>
                      <IconButton 
                        disabled={currentIdx < 0 || currentIdx === columns.length - 1} 
                        onClick={(e) => { e.stopPropagation(); moveColumn(c.id, 1); }} 
                        size="small"
                        sx={{ 
                          p: 0.5,
                          color: 'hsl(var(--foreground))',
                          '&:hover': {
                            bgcolor: 'hsl(var(--accent))',
                          },
                          '&:disabled': { 
                            opacity: 0.3,
                            color: 'hsl(var(--muted-foreground))',
                          }
                        }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </MenuItem>
            );
        })}
        
        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid hsl(var(--border))', position: 'sticky', bottom: 0, bgcolor: 'hsl(var(--card))', display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => setAnchorEl(null)} variant="contained" size="small">
            Fechar
          </Button>
        </Box>
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
    </Box>
  );
}
