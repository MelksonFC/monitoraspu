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

const PAGE_MARGIN_TOP = 45;
const PAGE_MARGIN_BOTTOM = 20;

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}
function formatValorBR(valor: string | number | undefined | null): string {
  if (valor === undefined || valor === null || valor === "") return "R$ 0,00";
  try {
    const num = typeof valor === 'string'
      ? parseFloat(valor.replace(/\./g, "").replace(",", "."))
      : valor;
    if (isNaN(num)) return "N/A";
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch { return "N/A"; }
}
function formatArea(valor: string | number | undefined | null): string {
  if (valor === undefined || valor === null || valor === "") return "0,00 m²";
  try {
    const num = typeof valor === 'string'
      ? parseFloat(valor.replace(/\./g, "").replace(",", "."))
      : valor;
    if (isNaN(num)) return "N/A";
    return `${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
  } catch { return "N/A"; }
}
function getLookupName(id: number | undefined, list: any[]): string {
  return list?.find(item => item.id === id)?.nome || '';
}
function getRegimeDesc(id: number | undefined, regimes: any[]): string {
  return regimes.find(r => r.id === id)?.descricao || getLookupName(id, regimes);
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

  function addHeader(doc: jsPDF) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const imageHeight = 18;
    const imageWidth = 18;
    const marginX = 15;
    const marginY = 12;
    try {
      doc.addImage('/monitoraspu/assets/brasaooficialcolorido.png', 'PNG', marginX, marginY, imageWidth, imageHeight);
    } catch { }
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    const headerCenterY = marginY + imageHeight / 2 - 2;
    doc.text([
      'MINISTÉRIO DA GESTÃO E DA INOVAÇÃO EM SERVIÇOS PÚBLICOS',
      'SECRETARIA DO PATRIMÔNIO DA UNIÃO',
      'SUPERINTENDÊNCIA DO PATRIMÔNIO DA UNIÃO EM RORAIMA'
    ], pageWidth / 2, headerCenterY, { align: 'center' });
    doc.setFillColor(224, 224, 224);
    doc.rect(marginX, marginY + imageHeight + 2, pageWidth - marginX * 2, 8, 'F');
    doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO', pageWidth / 2, marginY + imageHeight + 7, { align: 'center' });
    doc.setTextColor(51, 51, 51); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  }
  function addFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
    const height = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Usuário: ${usuario}`, 15, height - PAGE_MARGIN_BOTTOM + 2);
    doc.text(`Página ${pageNumber} de ${totalPages}`, doc.internal.pageSize.getWidth() / 2, height - PAGE_MARGIN_BOTTOM + 2, { align: 'center' });
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, doc.internal.pageSize.getWidth() - 15, height - PAGE_MARGIN_BOTTOM + 2, { align: 'right' });
  }

  // Função utilitária: garante espaço antes do título
  function ensureSpace(doc: jsPDF, currentY: number, requiredSpace: number, margin = 15) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = margin;
    if (currentY + requiredSpace + bottomMargin > pageHeight) {
      doc.addPage();
      addHeader(doc);
      return 50; // início da nova página
    }
    return currentY;
  }

  function drawSectionTitle(doc: jsPDF, text: string, y: number, columns: number, margin = 15) {
    const tableWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const rectHeight = 9;
    doc.setFillColor(230, 240, 255);
    doc.rect(margin, y, tableWidth, rectHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 58, 138);
    doc.text(text, margin + 2, y + 6); // ajuste para alinhar verticalmente
    return y + rectHeight + 2; // novo y
  }

  async function generateStructuredPdf(withImages: boolean) {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      let y = PAGE_MARGIN_TOP;

      // Identificação
      y = drawSectionTitle(doc, 'Identificação', y, 4);

      autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
         ],
        body: [
          [
            { content: 'Matrícula:', styles: { fontStyle: 'bold' } }, imovel.matricula || '',
            { content: 'Imóvel Ativo:', styles: { fontStyle: 'bold' } }, imovel.situacao ? 'Sim' : 'Não'
          ],
          [
            { content: 'RIP Imóvel:', styles: { fontStyle: 'bold' } }, imovel.ripimovel || '',
            { content: 'RIP Utilização:', styles: { fontStyle: 'bold' } }, imovel.riputilizacao || ''
          ],
          [
            { content: 'Valor:', styles: { fontStyle: 'bold' } }, formatValorBR(imovel.valorimovel),
            { content: 'Data do Imóvel:', styles: { fontStyle: 'bold' } }, formatDateBR(imovel.dataimovel)
          ],
          [
            { content: 'Classe:', styles: { fontStyle: 'bold' }, colSpan: 1 },
            { content: imovel.nome || '', colSpan: 3 }
          ]
        ],
        bodyStyles: { lineWidth: 0, fontSize: 11 },
        styles: { cellPadding: 2 }
      });
      y = doc.lastAutoTable.finalY + 4;

      // Imagens
      if (withImages && Array.isArray(imovel.imagens) && imovel.imagens.length > 0) {
      
      y = drawSectionTitle(doc, 'Imagens', y, 2);
        autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
          ],
        body: [
          [{ content: '', colSpan: 2 }]
        ],
        bodyStyles: { lineWidth: 0 },
        styles: { cellPadding: 2 }
      });
      y = doc.lastAutoTable.finalY + 1;

      
        let imgY = y;
        let imgHeight = 50; 
        let imgWidth = 85;
        let imgX = 15;
        let gap = 5;
        let maxPerRow = 2;
        let count = 0;
        let totalRows = Math.ceil(imovel.imagens.length / maxPerRow);

        for (const img of imovel.imagens.slice(0, 4)) {
          try {
            doc.addImage(img.url, 'JPEG', imgX, imgY, imgWidth, imgHeight);
          } catch { }
          count++;
          if (count % maxPerRow === 0) {
            imgX = 15;
            imgY += imgHeight + gap;
          } else {
            imgX += imgWidth + 10;
          }
        }
        y = y + totalRows * (imgHeight + gap);
      } else {
        y += 4;
      }

      // Localização
      y = ensureSpace(doc, y, 21);
      y = drawSectionTitle(doc, 'Localização', y, 6);

      autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
          ],
        body: [
          [
            { content: 'CEP:', styles: { fontStyle: 'bold' }, colSpan: 1},
            { content: imovel.cep || '', colSpan: 5 }
          ],  
          [ 
            { content: 'País:', styles: { fontStyle: 'bold' } }, getLookupName(imovel.idpais, lookups.paises),
            { content: 'Estado:', styles: { fontStyle: 'bold' } }, getLookupName(imovel.idestado, lookups.estados),
            { content: 'Município:', styles: { fontStyle: 'bold' } }, getLookupName(imovel.idmunicipio, lookups.municipios)
          ],
          [
            { content: 'Endereço:', styles: { fontStyle: 'bold' } }, imovel.endereco || '',
            { content: '', colSpan: 2 },
            { content: 'Número:', styles: { fontStyle: 'bold' } }, imovel.numero || ''
          ],
          [
            { content: 'Complemento:', styles: { fontStyle: 'bold' }, colSpan: 1 },
            { content: imovel.complemento || '', colSpan: 5 }
          ],
          [
            { content: 'Latitude:', styles: { fontStyle: 'bold' } }, String(imovel.latitude ?? ''),
            { content: '', colSpan: 1 },
            { content: 'Longitude:', styles: { fontStyle: 'bold' } }, String(imovel.longitude ?? ''),
            { content: '', colSpan: 1 }
          ]
        ],
        bodyStyles: { lineWidth: 0 },
        styles: { cellPadding: 2 }
      });
      y = doc.lastAutoTable.finalY + 4;

      // Contato
      y = ensureSpace(doc, y, 21);
      y = drawSectionTitle(doc, 'Contato', y, 2);

      autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
          ],
        body: [
          [
            { content: 'E-mail:', styles: { fontStyle: 'bold' } }, { content: imovel.email || '', styles: { halign: 'left' } }
          ]
        ],
        bodyStyles: { lineWidth: 0 },
        styles: { cellPadding: 2 }
      });
      y = doc.lastAutoTable.finalY + 4;

      // Registro Cartorial
      y = ensureSpace(doc, y, 21);
      y = drawSectionTitle(doc, 'Registro Cartorial', y, 4);

      autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
          ],
        body: [
          [
            { content: 'Cartório:', styles: { fontStyle: 'bold' } }, imovel.nomecartorio || '',
            { content: 'Nº Processo:', styles: { fontStyle: 'bold' } }, imovel.nprocesso || ''
          ],
          [
            { content: 'Ocupante:', styles: { fontStyle: 'bold' } }, { content: imovel.ocupante || '', colSpan: 3 }
          ]
        ],
        bodyStyles: { lineWidth: 0 },
        styles: { cellPadding: 2 }
      });
      y = doc.lastAutoTable.finalY + 4;

      // Gestão e Áreas
      y = ensureSpace(doc, y, 21);
      y = drawSectionTitle(doc, 'Gestão e Áreas', y, 4);

      autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
          ],
        body: [
          [
            { content: 'Unidade Gestora:', styles: { fontStyle: 'bold' } }, getLookupName(imovel.idunidadegestora, lookups.unidades),
            { content: '', colSpan: 2 },
          ],
          [
            { content: 'Regime de Utilização:', styles: { fontStyle: 'bold' } }, getRegimeDesc(imovel.idregimeutilizacao, lookups.regimes),
            { content: '', colSpan: 2 },
          ],
          [
            { content: 'Área Construída:', styles: { fontStyle: 'bold' } }, formatArea(imovel.areaconstruida),
            { content: 'Área do Terreno:', styles: { fontStyle: 'bold' } }, formatArea(imovel.areaterreno)
          ]
        ],
        bodyStyles: { lineWidth: 0 },
        styles: { cellPadding: 2 }
      });
      y = doc.lastAutoTable.finalY + 4;

      // Fiscalizações
      y = ensureSpace(doc, y, 21);
      y = drawSectionTitle(doc, 'Fiscalizações', y, 4);

      autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
          [
            { content: 'Data', styles: { fontStyle: 'bold' } },
            { content: 'Fiscal', styles: { fontStyle: 'bold' } },
            { content: 'Condições verificadas na fiscalização', styles: { fontStyle: 'bold' } },
            { content: '', styles: { fontStyle: 'bold' } }
          ]
        ],
        body: (imovel.fiscalizacoes?.length
          ? imovel.fiscalizacoes.map(f => [
            formatDateBR(f.datafiscalizacao),
            String(f.fiscalizador || ''),
            { content: String(f.condicoes || ''), colSpan: 2 }
          ])
          : [[{ content: 'Nenhuma fiscalização encontrada', colSpan: 4 }]]
        ),
        bodyStyles: { lineWidth: 0 },
        styles: { cellPadding: 2 }
      });
      y = doc.lastAutoTable.finalY + 4;

      // Avaliações
      y = ensureSpace(doc, y, 21);
      y = drawSectionTitle(doc, 'Avaliações', y, 4);
      
      autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
          [
            { content: 'Data', styles: { fontStyle: 'bold' } },
            { content: 'Avaliador', styles: { fontStyle: 'bold' } },
            { content: 'Novo Valor', styles: { fontStyle: 'bold' } },
            { content: 'Observações', styles: { fontStyle: 'bold' } }
          ]
        ],
        body: (imovel.avaliacoes?.length
          ? imovel.avaliacoes.map(a => [
            formatDateBR(a.dataavaliacao),
            String(a.avaliador || ''),
            formatValorBR(a.novovalor),
            String(a.observacoes || '')
          ])
          : [[{ content: 'Nenhuma avaliação encontrada', colSpan: 4 }]]
        ),
        bodyStyles: { lineWidth: 0 },
        styles: { cellPadding: 2 }
      });
      y = doc.lastAutoTable.finalY + 4;

      // Histórico Unidade Gestora
      y = ensureSpace(doc, y, 21);
      y = drawSectionTitle(doc, 'Histórico de Unidade Gestora', y, 3);

      autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
          [
            { content: 'Unidade Gestora', styles: { fontStyle: 'bold' } },
            { content: 'Data Início', styles: { fontStyle: 'bold' } },
            { content: 'Data Fim', styles: { fontStyle: 'bold' } }
          ]
        ],
        body: (imovel.hstUnidades?.length
          ? imovel.hstUnidades.map(h => [
            getLookupName(h.idunidadegestora, lookups.unidades),
            formatDateBR(h.dtinicio),
            h.dtfim ? formatDateBR(h.dtfim) : 'Atual'
          ])
          : [[{ content: 'Nenhuma histórico encontrado', colSpan: 3 }]]
        ),
        bodyStyles: { lineWidth: 0 },
        styles: { cellPadding: 2 }
      });
      y = doc.lastAutoTable.finalY + 4;

      // Histórico Regime de Utilização`
      y = ensureSpace(doc, y, 21);
      y = drawSectionTitle(doc, 'Histórico de Regime de Utilização', y, 3);

      autoTable(doc, {
        startY: y,
        margin: { top: PAGE_MARGIN_TOP, bottom: PAGE_MARGIN_BOTTOM, left: 15, right: 15 },
        theme: 'plain',
        head: [
          [
            { content: 'Regime', styles: { fontStyle: 'bold' } },
            { content: 'Data Início', styles: { fontStyle: 'bold' } },
            { content: 'Data Fim', styles: { fontStyle: 'bold' } }
          ]
        ],
        body: (imovel.hstRegimes?.length
          ? imovel.hstRegimes.map(h => [
            getRegimeDesc(h.idregimeutilizacao, lookups.regimes),
            formatDateBR(h.dtinicio),
            h.dtfim ? formatDateBR(h.dtfim) : 'Atual'
          ])
          : [[{ content: 'Nenhuma histórico encontrado', colSpan: 3 }]]
        ),
        bodyStyles: { lineWidth: 0 },
        styles: { cellPadding: 2 }
      });

      // Cabeçalho/Rodapé em todas as páginas
      const finalTotalPages = doc.getNumberOfPages();
      for (let i = 1; i <= finalTotalPages; i++) {
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