import React, { useState } from 'react';
import { Button, CircularProgress, Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Imovel } from '../types';

interface SafePdfButtonProps {
  imovel: Imovel;
  usuario: string;
  lookups: {
    paises: any[];
    estados: any[];
    municipios: any[];
    unidades: any[];
    regimes: any[];
  };
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const SafePdfButton: React.FC<SafePdfButtonProps> = ({
  imovel,
  usuario,
  lookups,
  variant = 'contained',
  color = 'primary',
  disabled = false,
  fullWidth = false,
  size = 'medium',
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Helpers
  const formatDateBR = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };
  const formatValorBR = (valor: string | number | undefined | null): string => {
    if (valor === undefined || valor === null || valor === "") return "R$ 0,00";
    try {
      const num = typeof valor === 'string'
        ? parseFloat(valor.replace(/\./g, "").replace(",", "."))
        : valor;
      if (isNaN(num)) return "N/A";
      return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch {
      return "N/A";
    }
  };
  const formatArea = (valor: string | number | undefined | null): string => {
    if (valor === undefined || valor === null || valor === "") return "0,00 m²";
    try {
      const num = typeof valor === 'string'
        ? parseFloat(valor.replace(/\./g, "").replace(",", "."))
        : valor;
      if (isNaN(num)) return "N/A";
      return `${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
    } catch {
      return "N/A";
    }
  };
  const getLookupName = (id?: number, list?: any[]): string => list?.find(item => item.id === id)?.nome || 'N/A';
  const getRegimeDesc = (id?: number): string => lookups.regimes.find(r => r.id === id)?.descricao || getLookupName(id, lookups.regimes);

  // Cabeçalho e rodapé
  function addHeader(doc) {
    // Brasão
    try {
      doc.addImage('/monitoraspu/assets/brasaooficialcolorido.png', 'PNG', 15, 10, 18, 18);
    } catch {}
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(51,51,51);
    doc.text('MINISTÉRIO DA GESTÃO E DA INOVAÇÃO EM SERVIÇOS PÚBLICOS', 36, 16, { baseline: 'top' });
    doc.text('SECRETARIA DO PATRIMÔNIO DA UNIÃO', 36, 20, { baseline: 'top' });
    doc.text('SUPERINTENDÊNCIA DO PATRIMÔNIO DA UNIÃO EM RORAIMA', 36, 24, { baseline: 'top' });
    // Barra relatório
    doc.setFillColor(224,224,224);
    doc.rect(15, 29, doc.internal.pageSize.getWidth()-30, 8, 'F');
    doc.setTextColor(0,0,0); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO', doc.internal.pageSize.getWidth()/2, 34, {align:'center'});
    doc.setTextColor(51,51,51); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  }
  function addFooter(doc, pageNumber, totalPages) {
    const height = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Usuário: ${usuario}`, 15, height-10);
    doc.text(`Página ${pageNumber} de ${totalPages}`, doc.internal.pageSize.getWidth()/2, height-10, {align: 'center'});
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, doc.internal.pageSize.getWidth()-15, height-10, {align: 'right'});
  }

  async function generateStructuredPdf() {
    setIsGenerating(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    let totalPages = 1; // será ajustado ao final

    // Função para repetir cabeçalho/rodapé
    const didDrawPage = (data) => {
      addHeader(doc);
      totalPages = doc.internal.getNumberOfPages();
      addFooter(doc, data.pageNumber, totalPages);
    };

    let y = 42; // início após cabeçalho

    // Seção Identificação e Fotos
    doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
    doc.text('Identificação e Fotos', 15, y);
    y += 2;
    autoTable(doc, {
      startY: y+2,
      margin: { left: 15, right: 15 },
      body: [
        ['Matrícula', imovel.matricula || 'N/A', 'Imóvel Ativo', imovel.situacao ? 'Sim':'Não'],
        ['RIP Imóvel', imovel.ripimovel || 'N/A', 'RIP Utilização', imovel.riputilizacao || 'N/A'],
        ['Nome', imovel.nome || 'N/A', '', ''],
        ['Valor', formatValorBR(imovel.valorimovel), 'Data do Imóvel', formatDateBR(imovel.dataimovel)],
      ],
      theme: 'plain',
      didDrawPage,
      styles: {fontSize:9,cellPadding:2, textColor: 51},
      alternateRowStyles: { fillColor: [255,255,255] },
    });
    y = doc.lastAutoTable.finalY + 4;

    // Seção Localização
    doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
    doc.text('Localização', 15, y);
    autoTable(doc, {
      startY: y+2,
      margin: { left: 15, right: 15 },
      body: [
        ['CEP', imovel.cep || 'N/A', 'País', getLookupName(imovel.idpais, lookups.paises)],
        ['Estado', getLookupName(imovel.idestado, lookups.estados), 'Município', getLookupName(imovel.idmunicipio, lookups.municipios)],
        ['Endereço', imovel.endereco || 'N/A', 'Número', imovel.numero || 'N/A'],
        ['Complemento', imovel.complemento || 'N/A', '', ''],
        ['Latitude', imovel.latitude ?? 'N/A', 'Longitude', imovel.longitude ?? 'N/A'],
      ],
      theme: 'plain',
      didDrawPage,
      styles: {fontSize:9,cellPadding:2, textColor: 51},
      alternateRowStyles: { fillColor: [255,255,255] },
    });
    y = doc.lastAutoTable.finalY + 4;

    // Seção Contato e Registro Cartorial
    doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
    doc.text('Contato', 15, y);
    autoTable(doc, {
      startY: y+2,
      margin: { left: 15, right: 15 },
      body: [
        ['E-mail', imovel.email || 'N/A'],
      ],
      theme: 'plain',
      didDrawPage,
      styles: {fontSize:9,cellPadding:2, textColor: 51},
      alternateRowStyles: { fillColor: [255,255,255] },
    });
    y = doc.lastAutoTable.finalY + 4;

    doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
    doc.text('Registro Cartorial', 15, y);
    autoTable(doc, {
      startY: y+2,
      margin: { left: 15, right: 15 },
      body: [
        ['Cartório', imovel.nomecartorio || 'N/A', 'Nº Processo', imovel.nprocesso || 'N/A', 'Ocupante', imovel.ocupante || 'N/A'],
      ],
      theme: 'plain',
      didDrawPage,
      styles: {fontSize:9,cellPadding:2, textColor: 51},
      alternateRowStyles: { fillColor: [255,255,255] },
    });
    y = doc.lastAutoTable.finalY + 4;

    // Seção Gestão e Áreas
    doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
    doc.text('Gestão e Áreas', 15, y);
    autoTable(doc, {
      startY: y+2,
      margin: { left: 15, right: 15 },
      body: [
        ['Unidade Gestora', getLookupName(imovel.idunidadegestora, lookups.unidades), 'Regime de Utilização', getRegimeDesc(imovel.idregimeutilizacao)],
        ['Área Construída', formatArea(imovel.areaconstruida), 'Área do Terreno', formatArea(imovel.areaterreno)],
      ],
      theme: 'plain',
      didDrawPage,
      styles: {fontSize:9,cellPadding:2, textColor: 51},
      alternateRowStyles: { fillColor: [255,255,255] },
    });
    y = doc.lastAutoTable.finalY + 4;

    // Seção Fiscalizações
    doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
    doc.text('Fiscalizações', 15, y);
    autoTable(doc, {
      startY: y+2,
      margin: { left: 15, right: 15 },
      head: [['Data','Fiscal','Condições','Observações']],
      body: imovel.fiscalizacoes?.length
        ? imovel.fiscalizacoes.map(f => [
            formatDateBR(f.datafiscalizacao),
            f.fiscalizador || 'N/A',
            f.condicoes || 'N/A',
            f.observacoes || 'N/A',
          ])
        : [['Nenhuma fiscalização encontrada','','','']],
      theme: 'grid',
      didDrawPage,
      styles: {fontSize:9,cellPadding:2, textColor: 51},
      alternateRowStyles: { fillColor: [255,255,255] },
    });
    y = doc.lastAutoTable.finalY + 4;

    // Seção Avaliações
    doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
    doc.text('Avaliações', 15, y);
    autoTable(doc, {
      startY: y+2,
      margin: { left: 15, right: 15 },
      head: [['Data','Avaliador','Novo Valor','Observações']],
      body: imovel.avaliacoes?.length
        ? imovel.avaliacoes.map(a => [
            formatDateBR(a.dataavaliacao),
            a.avaliador || 'N/A',
            formatValorBR(a.novovalor),
            a.observacoes || 'N/A',
          ])
        : [['Nenhuma avaliação encontrada','','','']],
      theme: 'grid',
      didDrawPage,
      styles: {fontSize:9,cellPadding:2, textColor: 51},
      alternateRowStyles: { fillColor: [255,255,255] },
    });
    y = doc.lastAutoTable.finalY + 4;

    // Seção Histórico Unidade Gestora
    doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
    doc.text('Histórico de Unidade Gestora', 15, y);
    autoTable(doc, {
      startY: y+2,
      margin: { left: 15, right: 15 },
      head: [['Unidade Gestora','Data Início','Data Fim']],
      body: imovel.hstUnidades?.length
        ? imovel.hstUnidades.map(h => [
            getLookupName(h.idunidadegestora, lookups.unidades),
            formatDateBR(h.dtinicio),
            h.dtfim ? formatDateBR(h.dtfim) : 'Atual',
          ])
        : [['Nenhum histórico encontrado','','']],
      theme: 'grid',
      didDrawPage,
      styles: {fontSize:9,cellPadding:2, textColor: 51},
      alternateRowStyles: { fillColor: [255,255,255] },
    });
    y = doc.lastAutoTable.finalY + 4;

    // Seção Histórico Regime de Utilização
    doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
    doc.text('Histórico de Regime de Utilização', 15, y);
    autoTable(doc, {
      startY: y+2,
      margin: { left: 15, right: 15 },
      head: [['Regime','Data Início','Data Fim']],
      body: imovel.hstRegimes?.length
        ? imovel.hstRegimes.map(h => [
            getRegimeDesc(h.idregimeutilizacao),
            formatDateBR(h.dtinicio),
            h.dtfim ? formatDateBR(h.dtfim) : 'Atual',
          ])
        : [['Nenhum histórico encontrado','','']],
      theme: 'grid',
      didDrawPage,
      styles: {fontSize:9,cellPadding:2, textColor: 51},
      alternateRowStyles: { fillColor: [255,255,255] },
    });

    // Ajusta número total de páginas no rodapé (corrige rodapé/cabeçalho em todas as páginas)
    const finalTotalPages = doc.internal.getNumberOfPages();
    for(let i=1; i<=finalTotalPages; i++) {
      doc.setPage(i);
      addHeader(doc);
      addFooter(doc, i, finalTotalPages);
    }

    doc.save(`Relatorio_Imovel_${imovel.matricula || imovel.idimovel || new Date().getTime()}.pdf`);
    setSnackbarMessage('PDF gerado com sucesso!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsGenerating(false);
  }

  // UI
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleCloseSnackbar = () => setSnackbarOpen(false);

  return (
    <>
      <Button
        variant={variant} color={color} disabled={disabled || isGenerating}
        fullWidth={fullWidth} size={size} onClick={handleClick}
        endIcon={<ArrowDropDownIcon />}
        startIcon={isGenerating ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
      >
        {isGenerating ? 'Gerando PDF...' : 'Baixar PDF'}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => generateStructuredPdf()}>PDF Completo (com imagens)</MenuItem>
        <MenuItem onClick={() => generateStructuredPdf()}>PDF Simplificado (sem imagens)</MenuItem>
      </Menu>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SafePdfButton;