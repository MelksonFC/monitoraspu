import React, { useState, useRef } from 'react';
import { Button, CircularProgress, Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [showContent, setShowContent] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [withImages, setWithImages] = useState(true);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Funções auxiliares (sem alteração)
  const formatDateBR = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try { const date = new Date(dateStr); if (isNaN(date.getTime())) return dateStr; return date.toLocaleDateString('pt-BR'); } catch { return 'N/A'; }
  };
  const formatValorBR = (valor: string | number | undefined | null): string => {
    if (valor === undefined || valor === null || valor === "") return "R$ 0,00";
    try { const num = typeof valor === 'string' ? parseFloat(valor.replace(/\./g, "").replace(",", ".")) : valor; if (isNaN(num)) return "N/A"; return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; } catch { return "N/A"; }
  };
  const formatArea = (valor: string | number | undefined | null): string => {
    if (valor === undefined || valor === null || valor === "") return "0,00 m²";
    try { const num = typeof valor === 'string' ? parseFloat(valor.replace(/\./g, "").replace(",", ".")) : valor; if (isNaN(num)) return "N/A"; return `${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`; } catch { return "N/A"; }
  };
  const getLookupName = (id?: number, list?: any[]): string => list?.find(item => item.id === id)?.nome || 'N/A';
  const getRegimeDesc = (id?: number): string => lookups.regimes.find(r => r.id === id)?.descricao || getLookupName(id, lookups.regimes);

  // --- INÍCIO DA CORREÇÃO ---
  // Função de geração de PDF contínuo com rodapé corrigido
  const generateContinuousPdf = async (showImages: boolean) => {
    try {
      if (!contentRef.current) throw new Error('Elemento de conteúdo não disponível');

      const content = contentRef.current;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15; // Margem nas laterais, topo e fundo
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);

      const canvas = await html2canvas(content, {
        scale: 2, useCORS: true, allowTaint: true, logging: false, width: 800,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / contentWidth;
      const totalPdfHeight = imgHeight / ratio;

      let position = 0;
      let pageCount = 1;

      // Adiciona a primeira página
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalPdfHeight);
      
      // Calcula quantas páginas são necessárias
      let heightLeft = totalPdfHeight;
      heightLeft -= contentHeight;
      
      while (heightLeft > 0) {
        pageCount++;
        position -= pdfHeight; // Move a imagem para cima na próxima página
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position + margin, contentWidth, totalPdfHeight);
        heightLeft -= contentHeight;
      }
      
      // Adiciona o rodapé em cada página
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        const footerY = pdf.internal.pageSize.getHeight() - 10;
        pdf.text(`Usuário: ${usuario}`, margin, footerY);
        pdf.text(`Página ${i} de ${pageCount}`, pdfWidth / 2, footerY, { align: 'center' });
        pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pdfWidth - margin, footerY, { align: 'right' });
      }

      const suffix = showImages ? 'Completa' : 'Simples';
      pdf.save(`Ficha_${suffix}_Imovel_${imovel.matricula || imovel.idimovel || new Date().getTime()}.pdf`);
      
      setSnackbarMessage('PDF gerado com sucesso!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setSnackbarMessage(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  // --- FIM DA CORREÇÃO ---

  const generatePdf = async (showImages: boolean) => {
    try {
      setIsGenerating(true);
      setWithImages(showImages);
      setShowContent(true);
      handleClose();
      
      setTimeout(async () => {
        try {
          await generateContinuousPdf(showImages);
        } catch (err) {
          console.error('Erro durante a geração do PDF:', err);
          setSnackbarMessage(`Erro ao gerar PDF: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        } finally {
          setIsGenerating(false);
          setShowContent(false);
        }
      }, 1000);
    } catch (err) {
      console.error('Erro ao iniciar geração do PDF:', err);
      setIsGenerating(false);
      setShowContent(false);
      setSnackbarMessage(`Erro ao gerar PDF: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const imagensOrdenadas = Array.isArray(imovel.imagens) ? [...imovel.imagens].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)) : [];
  const fiscalizacoes = Array.isArray(imovel.fiscalizacoes) ? imovel.fiscalizacoes : [];
  const avaliacoes = Array.isArray(imovel.avaliacoes) ? imovel.avaliacoes : [];
  const hstUnidades = Array.isArray(imovel.hstUnidades) ? imovel.hstUnidades : [];
  const hstRegimes = Array.isArray(imovel.hstRegimes) ? imovel.hstRegimes : [];
  const featuredImage = imagensOrdenadas.find(img => img.isdefault) || imagensOrdenadas[0];

  const PdfHeader = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        <img
          src={`/monitoraspu/assets/brasaooficialcolorido.png`}
          alt="Brasão da República Federativa do Brasil"
          style={{ width: '80px', height: 'auto', marginRight: '20px' }}
        />
        <div style={{ 
          flex: 1, fontSize: '10pt', lineHeight: '1.4',
          color: '#333', fontFamily: 'Times New Roman, serif', textTransform: 'uppercase' 
        }}>
          <div>MINISTÉRIO DA GESTÃO E DA INOVAÇÃO EM SERVIÇOS PÚBLICOS</div>
          <div>SECRETARIA DO PATRIMÔNIO DA UNIÃO</div>
          <div>SUPERINTENDÊNCIA DO PATRIMÔNIO DA UNIÃO EM RORAIMA</div>
        </div>
      </div>
      <div style={{
        backgroundColor: '#e0e0e0', color: 'black', textAlign: 'center',
        padding: '6px', fontSize: '11pt', fontWeight: 'bold',
        marginBottom: '25px', borderTop: '0.5px solid #aaaaaa',
        borderBottom: '0.5px solid #aaaaaa'
      }}>
        RELATÓRIO
      </div>
    </>
  );

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
        <MenuItem onClick={() => generatePdf(true)}>PDF Completo (com imagens)</MenuItem>
        <MenuItem onClick={() => generatePdf(false)}>PDF Simplificado (sem imagens)</MenuItem>
      </Menu>
      
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {showContent && (
        <div 
          style={{ 
            position: 'absolute', left: '-9999px', top: '-9999px',
            width: '800px', background: '#ffffff', fontFamily: 'Roboto, Arial, sans-serif',
            color: '#333333', fontSize: '9pt',
          }}
        >
          <div ref={contentRef} style={{ padding: '20px' }}>
            <PdfHeader />
            
            {/* SEÇÃO 1: IDENTIFICAÇÃO E FOTOS */}
            <div style={{ marginBottom: '12px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px', color: '#1E3A8A', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>Identificação e Fotos</div>
              <div style={{ display: 'flex' }}>
                <div style={{ flex: withImages ? 1.5 : 1, paddingRight: '8px' }}>
                  <div style={{ display: 'flex', marginBottom: '5px' }}><div style={{ flex: 1, paddingRight: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Matrícula</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px' }}>{imovel.matricula || 'N/A'}</div></div></div><div style={{ flex: 1, paddingLeft: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Imóvel Ativo</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px' }}>{imovel.situacao ? 'Sim' : 'Não'}</div></div></div></div>
                  <div style={{ display: 'flex', marginBottom: '5px' }}><div style={{ flex: 1, paddingRight: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>RIP Imóvel</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px' }}>{imovel.ripimovel || 'N/A'}</div></div></div><div style={{ flex: 1, paddingLeft: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>RIP Utilização</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px' }}>{imovel.riputilizacao || 'N/A'}</div></div></div></div>
                  <div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Nome</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px' }}>{imovel.nome || 'N/A'}</div></div>
                  <div style={{ display: 'flex', marginBottom: '5px' }}><div style={{ flex: 1, paddingRight: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Valor</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px' }}>{formatValorBR(imovel.valorimovel)}</div></div></div><div style={{ flex: 1, paddingLeft: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Data do Imóvel</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px' }}>{formatDateBR(imovel.dataimovel)}</div></div></div></div>
                </div>
                {withImages && (<div style={{ flex: 1 }}>{featuredImage?.url ? (<img src={featuredImage.url} alt="Imagem principal do imóvel" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px', backgroundColor: '#f0f0f0' }}/>) : (<div style={{ width: '100%', height: '200px', borderRadius: '4px', marginBottom: '8px', backgroundColor: '#f0f0f0', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #e0e0e0' }}><div style={{ color: '#666666', fontSize: '10pt', textAlign: 'center' }}>Sem imagem</div></div>)}{imagensOrdenadas.length > 0 && (<div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '5px' }}>{imagensOrdenadas.filter(img => img.url).slice(0, 4).map((img, index) => (<img key={index} src={img.url} alt={`Miniatura ${index + 1}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '3px', border: img.isdefault ? '2px solid #1976d2' : '1px solid #ccc', margin: '2px' }}/>))}</div>)}</div>)}
              </div>
            </div>

            {/* SEÇÃO 2: LOCALIZAÇÃO */}
            <div style={{ marginBottom: '12px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px', color: '#1E3A8A', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px', }}>Localização</div>
                <div style={{ display: 'flex', marginBottom: '5px' }}><div style={{ flex: 1, padding: '0 4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>CEP</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.cep || 'N/A'}</div></div></div><div style={{ flex: 1, padding: '0 4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>País</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{getLookupName(imovel.idpais, lookups.paises)}</div></div></div><div style={{ flex: 1, padding: '0 4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Estado</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{getLookupName(imovel.idestado, lookups.estados)}</div></div></div></div>
                <div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Município</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{getLookupName(imovel.idmunicipio, lookups.municipios)}</div></div>
                <div style={{ display: 'flex', marginBottom: '5px' }}><div style={{ flex: 3, paddingRight: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Endereço</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.endereco || 'N/A'}</div></div></div><div style={{ flex: 1, paddingLeft: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Número</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.numero || 'N/A'}</div></div></div></div>
                <div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Complemento</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.complemento || 'N/A'}</div></div>
                <div style={{ display: 'flex', marginBottom: '5px' }}><div style={{ flex: 1, paddingRight: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Latitude</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.latitude || 'N/A'}</div></div></div><div style={{ flex: 1, paddingLeft: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Longitude</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.longitude || 'N/A'}</div></div></div></div>
            </div>

            {/* SEÇÃO 3 E 4: CONTATO, REGISTRO, GESTÃO E ÁREAS */}
            <div style={{ display: 'flex', marginBottom: '12px' }}><div style={{ flex: 1, marginRight: '8px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', }}><div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px', color: '#1E3A8A', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px', }}>Contato</div><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>E-mail</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.email || 'N/A'}</div></div></div><div style={{ flex: 2, padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', }}><div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px', color: '#1E3A8A', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px', }}>Registro Cartorial</div><div style={{ display: 'flex', marginBottom: '5px' }}><div style={{ flex: 1, padding: '0 4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Cartório</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.nomecartorio || 'N/A'}</div></div></div><div style={{ flex: 1, padding: '0 4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Nº Processo</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.nprocesso || 'N/A'}</div></div></div><div style={{ flex: 1, padding: '0 4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Ocupante</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{imovel.ocupante || 'N/A'}</div></div></div></div></div></div>
            <div style={{ marginBottom: '12px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', }}><div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px', color: '#1E3A8A', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px', }}>Gestão e Áreas</div><div style={{ display: 'flex', marginBottom: '5px' }}><div style={{ flex: 1, paddingRight: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Unidade Gestora</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{getLookupName(imovel.idunidadegestora, lookups.unidades)}</div></div></div><div style={{ flex: 1, paddingLeft: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Regime de Utilização</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{getRegimeDesc(imovel.idregimeutilizacao)}</div></div></div></div><div style={{ display: 'flex', marginBottom: '5px' }}><div style={{ flex: 1, paddingRight: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Área Construída</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{formatArea(imovel.areaconstruida)}</div></div></div><div style={{ flex: 1, paddingLeft: '4px' }}><div style={{ marginBottom: '5px' }}><div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>Área do Terreno</div><div style={{ fontSize: '9pt', color: '#333333', borderBottom: '0.5px solid #f0f0f0', paddingBottom: '2px', }}>{formatArea(imovel.areaterreno)}</div></div></div></div></div>

            {/* SEÇÃO 5 E 6: FISCALIZAÇÕES E AVALIAÇÕES */}
            <div style={{ marginBottom: '12px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px' }}><div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px', color: '#1E3A8A', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>Fiscalizações</div>{fiscalizacoes.length > 0 ? (<div style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: '3px' }}><div style={{ display: 'flex', backgroundColor: '#f2f2f2', borderBottom: '1px solid #e0e0e0' }}><div style={{ flex: 1.5, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Data</div><div style={{ flex: 2, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Fiscal</div><div style={{ flex: 3, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Condições</div><div style={{ flex: 3, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Observações</div></div>{fiscalizacoes.map((f: any, index: number) => (<div key={index} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}><div style={{ flex: 1.5, padding: '5px', fontSize: '9pt' }}>{formatDateBR(f.datafiscalizacao)}</div><div style={{ flex: 2, padding: '5px', fontSize: '9pt' }}>{String(f.fiscalizador || 'N/A')}</div><div style={{ flex: 3, padding: '5px', fontSize: '9pt' }}>{String(f.condicoes || 'N/A')}</div><div style={{ flex: 3, padding: '5px', fontSize: '9pt' }}>{String(f.observacoes || 'N/A')}</div></div>))}</div>) : (<div>Nenhuma fiscalização encontrada.</div>)}</div>
            <div style={{ marginBottom: '12px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px' }}><div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px', color: '#1E3A8A', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>Avaliações</div>{avaliacoes.length > 0 ? (<div style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: '3px' }}><div style={{ display: 'flex', backgroundColor: '#f2f2f2', borderBottom: '1px solid #e0e0e0' }}><div style={{ flex: 1.5, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Data</div><div style={{ flex: 2, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Avaliador</div><div style={{ flex: 2, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Novo Valor</div><div style={{ flex: 4, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Observações</div></div>{avaliacoes.map((a: any, index: number) => (<div key={index} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}><div style={{ flex: 1.5, padding: '5px', fontSize: '9pt' }}>{formatDateBR(a.dataavaliacao)}</div><div style={{ flex: 2, padding: '5px', fontSize: '9pt' }}>{String(a.avaliador || 'N/A')}</div><div style={{ flex: 2, padding: '5px', fontSize: '9pt' }}>{formatValorBR(a.novovalor)}</div><div style={{ flex: 4, padding: '5px', fontSize: '9pt' }}>{String(a.observacoes || 'N/A')}</div></div>))}</div>) : (<div>Nenhuma avaliação encontrada.</div>)}</div>
            
            {/* SEÇÃO 7 E 8: HISTÓRICOS */}
            <div style={{ marginBottom: '12px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px' }}><div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px', color: '#1E3A8A', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>Histórico de Unidade Gestora</div>{hstUnidades.length > 0 ? (<div style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: '3px' }}><div style={{ display: 'flex', backgroundColor: '#f2f2f2', borderBottom: '1px solid #e0e0e0' }}><div style={{ flex: 3, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Unidade Gestora</div><div style={{ flex: 2, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Data Início</div><div style={{ flex: 2, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Data Fim</div></div>{hstUnidades.map((h: any, index: number) => (<div key={index} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}><div style={{ flex: 3, padding: '5px', fontSize: '9pt' }}>{getLookupName(h.idunidadegestora, lookups.unidades)}</div><div style={{ flex: 2, padding: '5px', fontSize: '9pt' }}>{formatDateBR(h.dtinicio)}</div><div style={{ flex: 2, padding: '5px', fontSize: '9pt' }}>{h.dtfim ? formatDateBR(h.dtfim) : 'Atual'}</div></div>))}</div>) : (<div>Nenhum histórico encontrado.</div>)}</div>
            <div style={{ marginBottom: '12px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px' }}><div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px', color: '#1E3A8A', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>Histórico de Regime de Utilização</div>{hstRegimes.length > 0 ? (<div style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: '3px' }}><div style={{ display: 'flex', backgroundColor: '#f2f2f2', borderBottom: '1px solid #e0e0e0' }}><div style={{ flex: 3, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Regime</div><div style={{ flex: 2, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Data Início</div><div style={{ flex: 2, padding: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Data Fim</div></div>{hstRegimes.map((h: any, index: number) => (<div key={index} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}><div style={{ flex: 3, padding: '5px', fontSize: '9pt' }}>{getRegimeDesc(h.idregimeutilizacao)}</div><div style={{ flex: 2, padding: '5px', fontSize: '9pt' }}>{formatDateBR(h.dtinicio)}</div><div style={{ flex: 2, padding: '5px', fontSize: '9pt' }}>{h.dtfim ? formatDateBR(h.dtfim) : 'Atual'}</div></div>))}</div>) : (<div>Nenhum histórico encontrado.</div>)}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default SafePdfButton;