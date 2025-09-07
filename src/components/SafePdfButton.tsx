import React, { useState } from 'react';
import { Button, CircularProgress, Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Imovel } from '../types';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number; };
    getNumberOfPages(): number;
  }
}

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
  size = 'medium'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Helpers
  const formatDateBR = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR');
    } catch { return 'N/A'; }
  };
  const formatValorBR = (valor: string | number | undefined | null): string => {
    if (valor === undefined || valor === null || valor === "") return "R$ 0,00";
    try {
      const num = typeof valor === 'string'
        ? parseFloat(valor.replace(/\./g, "").replace(",", "."))
        : valor;
      if (isNaN(num)) return "N/A";
      return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch { return "N/A"; }
  };
  const formatArea = (valor: string | number | undefined | null): string => {
    if (valor === undefined || valor === null || valor === "") return "0,00 m²";
    try {
      const num = typeof valor === 'string'
        ? parseFloat(valor.replace(/\./g, "").replace(",", "."))
        : valor;
      if (isNaN(num)) return "N/A";
      return `${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
    } catch { return "N/A"; }
  };
  const getLookupName = (id?: number, list?: any[]): string => list?.find(item => item.id === id)?.nome || 'N/A';
  const getRegimeDesc = (id?: number): string => lookups.regimes.find(r => r.id === id)?.descricao || getLookupName(id, lookups.regimes);

  function addHeader(doc: jsPDF) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const imageHeight = 18;
    const imageWidth = 18;
    const marginY = 10;
    const marginX = 15;
    try {
      doc.addImage('/monitoraspu/assets/brasaooficialcolorido.png', 'PNG', marginX, marginY, imageWidth, imageHeight);
    } catch {}
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(51,51,51);
    const headerCenterY = marginY + imageHeight / 2 + 2;
    doc.text([
      'MINISTÉRIO DA GESTÃO E DA INOVAÇÃO EM SERVIÇOS PÚBLICOS',
      'SECRETARIA DO PATRIMÔNIO DA UNIÃO',
      'SUPERINTENDÊNCIA DO PATRIMÔNIO DA UNIÃO EM RORAIMA'
    ], pageWidth / 2, headerCenterY, { align: 'center' });
    doc.setFillColor(224,224,224);
    doc.rect(marginX, marginY + imageHeight + 5, pageWidth - marginX * 2, 8, 'F');
    doc.setTextColor(0,0,0); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO', pageWidth / 2, marginY + imageHeight + 10, { align: 'center' });
    doc.setTextColor(51,51,51); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  }
  function addFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
    const height = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Usuário: ${usuario}`, 15, height-10);
    doc.text(`Página ${pageNumber} de ${totalPages}`, doc.internal.pageSize.getWidth()/2, height-10, {align: 'center'});
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, doc.internal.pageSize.getWidth()-15, height-10, {align: 'right'});
  }

  function renderInfoTable(
    doc: jsPDF,
    startY: number,
    fields: Array<{label:string,value:string}>,
    columns: number = 2
  ) {
    const rows: string[][] = [];
    for (let i = 0; i < fields.length; i += columns) {
      const row: string[] = [];
      for (let c = 0; c < columns; c++) {
        const field = fields[i+c];
        if (field) {
          row.push(`${field.label}:`, `${String(field.value)}`);
        } else {
          row.push("", "");
        }
      }
      rows.push(row);
    }
    autoTable(doc, {
      startY,
      margin: { left: 15, right: 15 },
      body: rows,
      theme: 'grid',
      didDrawPage: (data: any) => {
        addHeader(doc);
        const totalPages = doc.getNumberOfPages();
        addFooter(doc, data.pageNumber, totalPages);
      },
      headStyles: {fillColor:'#E3F2FD', fontStyle:'bold', textColor:30, fontSize:10, halign:'center', valign:'middle' },
      bodyStyles: {fillColor:'#F7F9FB', fontStyle:'normal', textColor:51, halign:'left', valign:'middle', lineWidth:0.2, lineColor:'#90caf9' },
      alternateRowStyles: { fillColor: [247,249,251] },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: 30 },
        2: { fontStyle: 'bold', textColor: 30 },
      },
      styles: { cellPadding: 2, minCellHeight: 8, fontSize: 10 }
    });
    return doc.lastAutoTable.finalY;
  }

  async function generateStructuredPdf(withImages: boolean) {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      let y = 42;

      doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
      doc.text('Identificação', 15, y);
      y += 2;

      const idFields = [
        {label:'Matrícula',value:String(imovel.matricula || 'N/A')},
        {label:'Imóvel Ativo',value:imovel.situacao ? 'Sim':'Não'},
        {label:'RIP Imóvel',value: String(imovel.ripimovel || 'N/A')},
        {label:'RIP Utilização', value: String(imovel.riputilizacao || 'N/A')},
        {label:'Classe', value: String(imovel.nome || 'N/A')},
        {label:'Valor', value: formatValorBR(imovel.valorimovel)},
        {label:'Data do Imóvel', value: formatDateBR(imovel.dataimovel)}
      ];
      y = renderInfoTable(doc, y+2, idFields, 2);

      if (withImages && Array.isArray(imovel.imagens) && imovel.imagens.length > 0) {
        let imgY = y+4;
        let imgSize = 36;
        let imgX = 15;
        let gap = 5;
        let maxPerRow = 3;
        let count = 0;
        for (const img of imovel.imagens.slice(0,6)) {
          try {
            doc.addImage(img.url, 'JPEG', imgX, imgY, 55, imgSize);
          } catch {}
          imgX += 60;
          count++;
          if (count % maxPerRow === 0) {
            imgX = 15;
            imgY += imgSize + gap;
          }
        }
        y = imgY + imgSize + 6;
      } else {
        y += 6;
      }

      doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
      doc.text('Localização', 15, y);
      const locFields = [
        {label:'CEP',value:String(imovel.cep || 'N/A')},
        {label:'País',value:getLookupName(imovel.idpais, lookups.paises)},
        {label:'Estado',value:getLookupName(imovel.idestado, lookups.estados)},
        {label:'Município',value:getLookupName(imovel.idmunicipio, lookups.municipios)},
        {label:'Endereço',value:String(imovel.endereco || 'N/A')},
        {label:'Número',value:String(imovel.numero || 'N/A')},
        {label:'Complemento',value:String(imovel.complemento || 'N/A')},
        {label:'Latitude',value:String(imovel.latitude ?? 'N/A')},
        {label:'Longitude',value:String(imovel.longitude ?? 'N/A')},
      ];
      y = renderInfoTable(doc, y+2, locFields, 3);

      doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
      doc.text('Contato', 15, y);
      y = renderInfoTable(doc, y+2, [
        {label:'E-mail',value:String(imovel.email || 'N/A')},
      ], 2);

      doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
      doc.text('Registro Cartorial', 15, y);
      y = renderInfoTable(doc, y+2, [
        {label:'Cartório',value:String(imovel.nomecartorio || 'N/A')},
        {label:'Nº Processo',value:String(imovel.nprocesso || 'N/A')},
        {label:'Ocupante',value:String(imovel.ocupante || 'N/A')},
      ], 2);

      doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
      doc.text('Gestão e Áreas', 15, y);
      y = renderInfoTable(doc, y+2, [
        {label:'Unidade Gestora',value:getLookupName(imovel.idunidadegestora, lookups.unidades)},
        {label:'Regime de Utilização',value:getRegimeDesc(imovel.idregimeutilizacao)},
        {label:'Área Construída',value:formatArea(imovel.areaconstruida)},
        {label:'Área do Terreno',value:formatArea(imovel.areaterreno)},
      ], 2);

      doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
      doc.text('Fiscalizações', 15, y);
      autoTable(doc, {
        startY: y+2,
        margin: { left: 15, right: 15 },
        head: [['Data','Fiscal','Condições','Observações']],
        body: imovel.fiscalizacoes?.length
          ? imovel.fiscalizacoes.map(f => [
              formatDateBR(f.datafiscalizacao),
              String(f.fiscalizador || 'N/A'),
              String(f.condicoes || 'N/A'),
              String(f.observacoes || 'N/A'),
            ])
          : [['Nenhuma fiscalização encontrada','','','']],
        theme: 'grid',
        didDrawPage: (data: any) => {
          addHeader(doc);
          const totalPages = doc.getNumberOfPages();
          addFooter(doc, data.pageNumber, totalPages);
        },
        headStyles: {fillColor:'#E3F2FD', fontStyle:'bold', textColor:30, fontSize:10 },
        bodyStyles: {fillColor:'#F7F9FB', fontStyle:'normal', textColor:51 },
        alternateRowStyles: { fillColor: [247,249,251] },
      });
      y = doc.lastAutoTable.finalY + 4;

      doc.setFontSize(12); doc.setTextColor(30,58,138); doc.setFont('helvetica','bold');
      doc.text('Avaliações', 15, y);
      autoTable(doc, {
        startY: y+2,
        margin: { left: 15, right: 15 },
        head: [['Data','Avaliador','Novo Valor','Observações']],
        body: imovel.avaliacoes?.length
          ? imovel.avaliacoes.map(a => [
              formatDateBR(a.dataavaliacao),
              String(a.avaliador || 'N/A'),
              formatValorBR(a.novovalor),
              String(a.observacoes || 'N/A'),
            ])
          : [['Nenhuma avaliação encontrada','','','']],
        theme: 'grid',
        didDrawPage: (data: any) => {
          addHeader(doc);
          const totalPages = doc.getNumberOfPages();
          addFooter(doc, data.pageNumber, totalPages);
        },
        headStyles: {fillColor:'#E3F2FD', fontStyle:'bold', textColor:30, fontSize:10 },
        bodyStyles: {fillColor:'#F7F9FB', fontStyle:'normal', textColor:51 },
        alternateRowStyles: { fillColor: [247,249,251] },
      });
      y = doc.lastAutoTable.finalY + 4;

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
        didDrawPage: (data: any) => {
          addHeader(doc);
          const totalPages = doc.getNumberOfPages();
          addFooter(doc, data.pageNumber, totalPages);
        },
        headStyles: {fillColor:'#E3F2FD', fontStyle:'bold', textColor:30, fontSize:10 },
        bodyStyles: {fillColor:'#F7F9FB', fontStyle:'normal', textColor:51 },
        alternateRowStyles: { fillColor: [247,249,251] },
      });
      y = doc.lastAutoTable.finalY + 4;

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
        didDrawPage: (data: any) => {
          addHeader(doc);
          const totalPages = doc.getNumberOfPages();
          addFooter(doc, data.pageNumber, totalPages);
        },
        headStyles: {fillColor:'#E3F2FD', fontStyle:'bold', textColor:30, fontSize:10 },
        bodyStyles: {fillColor:'#F7F9FB', fontStyle:'normal', textColor:51 },
        alternateRowStyles: { fillColor: [247,249,251] },
      });

      const finalTotalPages = doc.getNumberOfPages();
      for(let i=1; i<=finalTotalPages; i++) {
        doc.setPage(i);
        addHeader(doc);
        addFooter(doc, i, finalTotalPages);
      }

      doc.save(`Relatorio_Imovel_${imovel.matricula || imovel.idimovel || new Date().getTime()}.pdf`);
      setSnackbarMessage('PDF gerado com sucesso!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage('Erro ao gerar PDF: ' + (err instanceof Error ? err.message : String(err)));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsGenerating(false);
    }
  }

  // MENU CORRETO! Chama PDF só no clique, nunca ao abrir a tela.
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleCloseSnackbar = () => setSnackbarOpen(false);
  const menuOpen = Boolean(anchorEl);

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
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleClose}>
        <MenuItem onClick={() => { handleClose(); generateStructuredPdf(true); }}>PDF Completo (com imagens)</MenuItem>
        <MenuItem onClick={() => { handleClose(); generateStructuredPdf(false); }}>PDF Simplificado (sem imagens)</MenuItem>
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