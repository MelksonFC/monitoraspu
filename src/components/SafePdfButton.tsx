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
  const [withImages, setWithImages] = useState(true); // Estado para controlar se mostrar imagens
  const open = Boolean(anchorEl);
  
  // Definimos o número total de páginas de antemão (sabemos que são 3)
  const TOTAL_PAGES = 3;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Gera o título com a matrícula do imóvel
  const getImovelTitle = (): string => {
    const matricula = imovel.matricula || '';
    return matricula ? `Ficha do Imóvel ${matricula}` : 'Ficha do Imóvel';
  };

  // Funções auxiliares
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

  const getLookupName = (id?: number, list?: any[]): string => 
    list?.find(item => item.id === id)?.nome || 'N/A';
  
  const getRegimeDesc = (id?: number): string => 
    lookups.regimes.find(r => r.id === id)?.descricao || getLookupName(id, lookups.regimes);

  // Função para gerar múltiplas páginas de PDF
  const generateMultipagePdf = async (showImages: boolean) => {
    try {
      if (!contentRef.current) {
        throw new Error('Elemento de conteúdo não disponível');
      }

      // Criar seções separadas para capturar cada parte do documento
      const sections = contentRef.current.querySelectorAll('.pdf-section');
      
      // Inicializar o PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Para cada seção, gerar uma página do PDF
      let isFirstPage = true;
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        
        // Converter a seção para canvas
        const canvas = await html2canvas(section, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          windowWidth: 1000,
          windowHeight: section.scrollHeight,
        });
        
        // Converter o canvas para imagem
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Calcular dimensões
        const canvasRatio = canvas.height / canvas.width;
        const imgWidth = pdfWidth;
        const imgHeight = pdfWidth * canvasRatio;
        
        // Adicionar nova página, exceto para a primeira seção
        if (!isFirstPage) {
          pdf.addPage();
        }
        
        // Adicionar a imagem à página
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight > pdfHeight ? pdfWidth : imgHeight);
        
        isFirstPage = false;
      }
      
      // Salvar o PDF com o nome correto
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

  const generatePdf = async (showImages: boolean) => {
    try {
      setIsGenerating(true);
      setWithImages(showImages); // Atualiza o estado para controlar exibição de imagens
      setShowContent(true);
      handleClose();
      
      // Damos tempo para o DOM renderizar o conteúdo
      setTimeout(async () => {
        try {
          await generateMultipagePdf(showImages);
        } catch (err) {
          console.error('Erro durante a geração do PDF:', err);
          setSnackbarMessage(`Erro ao gerar PDF: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        } finally {
          setIsGenerating(false);
          setShowContent(false);
        }
      }, 1000); // Tempo suficiente para carregar imagens
    } catch (err) {
      console.error('Erro ao iniciar geração do PDF:', err);
      setIsGenerating(false);
      setShowContent(false);
      setSnackbarMessage(`Erro ao gerar PDF: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Garantindo que arrays nunca sejam nulos/undefined
  const imagensOrdenadas = Array.isArray(imovel.imagens) 
    ? [...imovel.imagens].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    : [];
  const fiscalizacoes = Array.isArray(imovel.fiscalizacoes) ? imovel.fiscalizacoes : [];
  const avaliacoes = Array.isArray(imovel.avaliacoes) ? imovel.avaliacoes : [];
  const hstUnidades = Array.isArray(imovel.hstUnidades) ? imovel.hstUnidades : [];
  const hstRegimes = Array.isArray(imovel.hstRegimes) ? imovel.hstRegimes : [];
  
  const featuredImage = imagensOrdenadas.find(img => img.isdefault) || imagensOrdenadas[0];
  const imovelTitle = getImovelTitle();

  // Componente de rodapé reutilizável com margens maiores
  const Footer = ({ pageNumber }: { pageNumber: number }) => (
    <div style={{ 
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '1px solid #cccccc',
      paddingTop: '5px',
      marginTop: '20px',
      fontSize: '8pt',
      color: '#555555',
      background: 'white',
      padding: '5px 35px', // Aumentei o padding lateral aqui
    }}>
      <div>Usuário: {usuario}</div>
      <div>Gerado em: {new Date().toLocaleString('pt-BR')}</div>
      <div>Página {pageNumber} de {TOTAL_PAGES}</div>
    </div>
  );

  return (
    <>
      <Button
        variant={variant}
        color={color}
        disabled={disabled || isGenerating}
        fullWidth={fullWidth}
        size={size}
        onClick={handleClick}
        endIcon={<ArrowDropDownIcon />}
        startIcon={isGenerating ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
      >
        {isGenerating ? 'Gerando PDF...' : 'Baixar PDF'}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={() => generatePdf(true)}>
          PDF Completo (com imagens)
        </MenuItem>
        <MenuItem onClick={() => generatePdf(false)}>
          PDF Simplificado (sem imagens)
        </MenuItem>
      </Menu>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* Conteúdo do PDF - oculto até ser necessário */}
      {showContent && (
        <div 
          ref={contentRef} 
          style={{ 
            position: 'absolute', 
            left: '-9999px', 
            top: '-9999px',
            width: '800px',
            background: '#ffffff',
            fontFamily: 'Roboto, Arial, sans-serif',
            color: '#333333',
            fontSize: '9pt',
          }}
        >
          {/* Primeira página - Informações Básicas */}
          <div className="pdf-section" style={{
            padding: '35px',
            paddingBottom: '70px', // Espaço extra para o rodapé
            position: 'relative',
            minHeight: '1123px' // Aproximadamente o tamanho de uma A4
          }}>
            {/* Cabeçalho */}
            <div style={{ 
              textAlign: 'center', 
              fontSize: '14pt', 
              fontWeight: 'bold', 
              color: '#1E3A8A',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: '1px solid #cccccc'
            }}>
              {imovelTitle}
            </div>
            
            {/* SEÇÃO 1: IDENTIFICAÇÃO E FOTOS */}
            <div style={{ 
              marginBottom: '12px',
              padding: '10px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}>
              <div style={{ 
                fontSize: '12pt', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1E3A8A',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '4px',
              }}>
                Identificação e Fotos
              </div>
              
              <div style={{ display: 'flex' }}>
                <div style={{ flex: withImages ? 1.5 : 1, paddingRight: '8px' }}>
                  <div style={{ display: 'flex', marginBottom: '5px' }}>
                    <div style={{ flex: 1, paddingRight: '4px' }}>
                      <div style={{ marginBottom: '5px' }}>
                        <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                          Matrícula
                        </div>
                        <div style={{ 
                          fontSize: '9pt', 
                          color: '#333333', 
                          borderBottom: '0.5px solid #f0f0f0',
                          paddingBottom: '2px',
                        }}>
                          {imovel.matricula || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 1, paddingLeft: '4px' }}>
                      <div style={{ marginBottom: '5px' }}>
                        <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                          Imóvel Ativo
                        </div>
                        <div style={{ 
                          fontSize: '9pt', 
                          color: '#333333', 
                          borderBottom: '0.5px solid #f0f0f0',
                          paddingBottom: '2px',
                        }}>
                          {imovel.situacao ? 'Sim' : 'Não'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', marginBottom: '5px' }}>
                    <div style={{ flex: 1, paddingRight: '4px' }}>
                      <div style={{ marginBottom: '5px' }}>
                        <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                          RIP Imóvel
                        </div>
                        <div style={{ 
                          fontSize: '9pt', 
                          color: '#333333', 
                          borderBottom: '0.5px solid #f0f0f0',
                          paddingBottom: '2px',
                        }}>
                          {imovel.ripimovel || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 1, paddingLeft: '4px' }}>
                      <div style={{ marginBottom: '5px' }}>
                        <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                          RIP Utilização
                        </div>
                        <div style={{ 
                          fontSize: '9pt', 
                          color: '#333333', 
                          borderBottom: '0.5px solid #f0f0f0',
                          paddingBottom: '2px',
                        }}>
                          {imovel.riputilizacao || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Nome
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {imovel.nome || 'N/A'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', marginBottom: '5px' }}>
                    <div style={{ flex: 1, paddingRight: '4px' }}>
                      <div style={{ marginBottom: '5px' }}>
                        <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                          Valor
                        </div>
                        <div style={{ 
                          fontSize: '9pt', 
                          color: '#333333', 
                          borderBottom: '0.5px solid #f0f0f0',
                          paddingBottom: '2px',
                        }}>
                          {formatValorBR(imovel.valorimovel)}
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 1, paddingLeft: '4px' }}>
                      <div style={{ marginBottom: '5px' }}>
                        <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                          Data do Imóvel
                        </div>
                        <div style={{ 
                          fontSize: '9pt', 
                          color: '#333333', 
                          borderBottom: '0.5px solid #f0f0f0',
                          paddingBottom: '2px',
                        }}>
                          {formatDateBR(imovel.dataimovel)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Exibir imagens apenas se withImages for true */}
                {withImages && (
                  <div style={{ flex: 1 }}>
                    {featuredImage?.url ? (
                      <img 
                        src={featuredImage.url} 
                        alt="Imagem principal do imóvel"
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          marginBottom: '8px',
                          backgroundColor: '#f0f0f0',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '200px',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '1px solid #e0e0e0',
                      }}>
                        <div style={{ color: '#666666', fontSize: '10pt', textAlign: 'center' }}>
                          Sem imagem
                        </div>
                      </div>
                    )}
                    
                    {imagensOrdenadas.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '5px' }}>
                        {imagensOrdenadas
                          .filter(img => img.url)
                          .slice(0, 4) // Limite de 4 miniaturas
                          .map((img, index) => (
                            <img 
                              key={index}
                              src={img.url} 
                              alt={`Miniatura ${index + 1}`}
                              style={{
                                width: '60px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '3px',
                                border: img.isdefault ? '2px solid #1976d2' : '1px solid #ccc',
                                margin: '2px',
                              }}
                            />
                          ))
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* SEÇÃO 2: LOCALIZAÇÃO */}
            <div style={{ 
              marginBottom: '12px',
              padding: '10px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}>
              <div style={{ 
                fontSize: '12pt', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1E3A8A',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '4px',
              }}>
                Localização
              </div>
              
              <div style={{ display: 'flex', marginBottom: '5px' }}>
                <div style={{ flex: 1, padding: '0 4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      CEP
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {imovel.cep || 'N/A'}
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '0 4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      País
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {getLookupName(imovel.idpais, lookups.paises)}
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '0 4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Estado
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {getLookupName(imovel.idestado, lookups.estados)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: '5px' }}>
                <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                  Município
                </div>
                <div style={{ 
                  fontSize: '9pt', 
                  color: '#333333', 
                  borderBottom: '0.5px solid #f0f0f0',
                  paddingBottom: '2px',
                }}>
                  {getLookupName(imovel.idmunicipio, lookups.municipios)}
                </div>
              </div>
              
              <div style={{ display: 'flex', marginBottom: '5px' }}>
                <div style={{ flex: 3, paddingRight: '4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Endereço
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {imovel.endereco || 'N/A'}
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, paddingLeft: '4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Número
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {imovel.numero || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: '5px' }}>
                <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                  Complemento
                </div>
                <div style={{ 
                  fontSize: '9pt', 
                  color: '#333333', 
                  borderBottom: '0.5px solid #f0f0f0',
                  paddingBottom: '2px',
                }}>
                  {imovel.complemento || 'N/A'}
                </div>
              </div>
              
              <div style={{ display: 'flex', marginBottom: '5px' }}>
                <div style={{ flex: 1, paddingRight: '4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Latitude
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {imovel.latitude || 'N/A'}
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, paddingLeft: '4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Longitude
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {imovel.longitude || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* SEÇÃO 3: CONTATO E REGISTRO */}
            <div style={{ display: 'flex', marginBottom: '12px' }}>
              {/* Contato */}
              <div style={{ 
                flex: 1, 
                marginRight: '8px',
                padding: '10px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
              }}>
                <div style={{ 
                  fontSize: '12pt', 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  color: '#1E3A8A',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '4px',
                }}>
                  Contato
                </div>
                
                <div style={{ marginBottom: '5px' }}>
                  <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                    E-mail
                  </div>
                  <div style={{ 
                    fontSize: '9pt', 
                    color: '#333333', 
                    borderBottom: '0.5px solid #f0f0f0',
                    paddingBottom: '2px',
                  }}>
                    {imovel.email || 'N/A'}
                  </div>
                </div>
              </div>
              
              {/* Registro Cartorial */}
              <div style={{ 
                flex: 2,
                padding: '10px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
              }}>
                <div style={{ 
                  fontSize: '12pt', 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  color: '#1E3A8A',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '4px',
                }}>
                  Registro Cartorial
                </div>
                
                <div style={{ display: 'flex', marginBottom: '5px' }}>
                  <div style={{ flex: 1, padding: '0 4px' }}>
                    <div style={{ marginBottom: '5px' }}>
                      <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                        Cartório
                      </div>
                      <div style={{ 
                        fontSize: '9pt', 
                        color: '#333333', 
                        borderBottom: '0.5px solid #f0f0f0',
                        paddingBottom: '2px',
                      }}>
                        {imovel.nomecartorio || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '0 4px' }}>
                    <div style={{ marginBottom: '5px' }}>
                      <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                        Nº Processo
                      </div>
                      <div style={{ 
                        fontSize: '9pt', 
                        color: '#333333', 
                        borderBottom: '0.5px solid #f0f0f0',
                        paddingBottom: '2px',
                      }}>
                        {imovel.nprocesso || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '0 4px' }}>
                    <div style={{ marginBottom: '5px' }}>
                      <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                        Ocupante
                      </div>
                      <div style={{ 
                        fontSize: '9pt', 
                        color: '#333333', 
                        borderBottom: '0.5px solid #f0f0f0',
                        paddingBottom: '2px',
                      }}>
                        {imovel.ocupante || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* SEÇÃO 4: GESTÃO E ÁREAS */}
            <div style={{ 
              marginBottom: '12px',
              padding: '10px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}>
              <div style={{ 
                fontSize: '12pt', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1E3A8A',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '4px',
              }}>
                Gestão e Áreas
              </div>
              
              <div style={{ display: 'flex', marginBottom: '5px' }}>
                <div style={{ flex: 1, paddingRight: '4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Unidade Gestora
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {getLookupName(imovel.idunidadegestora, lookups.unidades)}
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, paddingLeft: '4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Regime de Utilização
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {getRegimeDesc(imovel.idregimeutilizacao)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', marginBottom: '5px' }}>
                <div style={{ flex: 1, paddingRight: '4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Área Construída
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {formatArea(imovel.areaconstruida)}
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, paddingLeft: '4px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '8pt', color: '#666666', marginBottom: '2px' }}>
                      Área do Terreno
                    </div>
                    <div style={{ 
                      fontSize: '9pt', 
                      color: '#333333', 
                      borderBottom: '0.5px solid #f0f0f0',
                      paddingBottom: '2px',
                    }}>
                      {formatArea(imovel.areaterreno)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Rodapé fixo na página 1 */}
            <Footer pageNumber={1} />
          </div>
          
          {/* Segunda página - FISCALIZAÇÕES E AVALIAÇÕES JUNTAS */}
          <div className="pdf-section" style={{
            padding: '35px',
            paddingBottom: '70px', // Espaço extra para o rodapé
            position: 'relative',
            minHeight: '1123px' // Aproximadamente o tamanho de uma A4
          }}>
            {/* Cabeçalho */}
            <div style={{ 
              textAlign: 'center', 
              fontSize: '14pt', 
              fontWeight: 'bold', 
              color: '#1E3A8A',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: '1px solid #cccccc'
            }}>
              {`${imovelTitle} - Fiscalizações e Avaliações`}
            </div>
            
            {/* SEÇÃO 5: FISCALIZAÇÕES */}
            <div style={{ 
              marginBottom: '12px',
              padding: '10px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}>
              <div style={{ 
                fontSize: '12pt', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1E3A8A',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '4px',
              }}>
                Fiscalizações
              </div>
              
              {fiscalizacoes.length > 0 ? (
                <div style={{ 
                  width: '100%',
                  border: '1px solid #e0e0e0',
                  borderRadius: '3px',
                }}>
                  {/* Cabeçalho da tabela */}
                  <div style={{ 
                    display: 'flex', 
                    backgroundColor: '#f2f2f2',
                    borderBottom: '1px solid #e0e0e0',
                  }}>
                    <div style={{ 
                      flex: 1.5, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Data
                    </div>
                    <div style={{ 
                      flex: 2, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Fiscal
                    </div>
                    <div style={{ 
                      flex: 3, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Condições
                    </div>
                    <div style={{ 
                      flex: 3, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Observações
                    </div>
                  </div>
                  
                  {/* Linhas da tabela */}
                  {fiscalizacoes.map((f: any, index: number) => (
                    <div key={index} style={{ 
                      display: 'flex',
                      borderBottom: '1px solid #f0f0f0',
                    }}>
                      <div style={{ 
                        flex: 1.5, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {formatDateBR(f.datafiscalizacao)}
                      </div>
                      <div style={{ 
                        flex: 2, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {String(f.fiscalizador || 'N/A')}
                      </div>
                      <div style={{ 
                        flex: 3, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {String(f.condicoes || 'N/A')}
                      </div>
                      <div style={{ 
                        flex: 3, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {String(f.observacoes || 'N/A')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>Nenhuma fiscalização encontrada.</div>
              )}
            </div>
            
            {/* SEÇÃO 6: AVALIAÇÕES (Agora na mesma página) */}
            <div style={{ 
              marginBottom: '12px',
              padding: '10px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}>
              <div style={{ 
                fontSize: '12pt', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1E3A8A',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '4px',
              }}>
                Avaliações
              </div>
              
              {avaliacoes.length > 0 ? (
                <div style={{ 
                  width: '100%',
                  border: '1px solid #e0e0e0',
                  borderRadius: '3px',
                }}>
                  {/* Cabeçalho da tabela */}
                  <div style={{ 
                    display: 'flex', 
                    backgroundColor: '#f2f2f2',
                    borderBottom: '1px solid #e0e0e0',
                  }}>
                    <div style={{ 
                      flex: 1.5, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Data
                    </div>
                    <div style={{ 
                      flex: 2, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Avaliador
                    </div>
                    <div style={{ 
                      flex: 2, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Novo Valor
                    </div>
                    <div style={{ 
                      flex: 4, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Observações
                    </div>
                  </div>
                  
                  {/* Linhas da tabela */}
                  {avaliacoes.map((a: any, index: number) => (
                    <div key={index} style={{ 
                      display: 'flex',
                      borderBottom: '1px solid #f0f0f0',
                    }}>
                      <div style={{ 
                        flex: 1.5, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {formatDateBR(a.dataavaliacao)}
                      </div>
                      <div style={{ 
                        flex: 2, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {String(a.avaliador || 'N/A')}
                      </div>
                      <div style={{ 
                        flex: 2, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {formatValorBR(a.novovalor)}
                      </div>
                      <div style={{ 
                        flex: 4, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {String(a.observacoes || 'N/A')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>Nenhuma avaliação encontrada.</div>
              )}
            </div>
            
            {/* Rodapé fixo na página 2 */}
            <Footer pageNumber={2} />
          </div>
          
          {/* Terceira página - HISTÓRICOS */}
          <div className="pdf-section" style={{
            padding: '35px',
            paddingBottom: '70px', // Espaço extra para o rodapé
            position: 'relative',
            minHeight: '1123px' // Aproximadamente o tamanho de uma A4
          }}>
            {/* Cabeçalho */}
            <div style={{ 
              textAlign: 'center', 
              fontSize: '14pt', 
              fontWeight: 'bold', 
              color: '#1E3A8A',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: '1px solid #cccccc'
            }}>
              {`${imovelTitle} - Históricos`}
            </div>
            
            {/* SEÇÃO 7: HISTÓRICO DE UNIDADE GESTORA */}
            <div style={{ 
              marginBottom: '12px',
              padding: '10px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}>
              <div style={{ 
                fontSize: '12pt', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1E3A8A',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '4px',
              }}>
                Histórico de Unidade Gestora
              </div>
              
              {hstUnidades.length > 0 ? (
                <div style={{ 
                  width: '100%',
                  border: '1px solid #e0e0e0',
                  borderRadius: '3px',
                }}>
                  {/* Cabeçalho da tabela */}
                  <div style={{ 
                    display: 'flex', 
                    backgroundColor: '#f2f2f2',
                    borderBottom: '1px solid #e0e0e0',
                  }}>
                    <div style={{ 
                      flex: 3, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Unidade Gestora
                    </div>
                    <div style={{ 
                      flex: 2, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Data Início
                    </div>
                    <div style={{ 
                      flex: 2, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Data Fim
                    </div>
                  </div>
                  
                  {/* Linhas da tabela */}
                  {hstUnidades.map((h: any, index: number) => (
                    <div key={index} style={{ 
                      display: 'flex',
                      borderBottom: '1px solid #f0f0f0',
                    }}>
                      <div style={{ 
                        flex: 3, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {getLookupName(h.idunidadegestora, lookups.unidades)}
                      </div>
                      <div style={{ 
                        flex: 2, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {formatDateBR(h.dtinicio)}
                      </div>
                      <div style={{ 
                        flex: 2, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {h.dtfim ? formatDateBR(h.dtfim) : 'Atual'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>Nenhum histórico encontrado.</div>
              )}
            </div>
            
            {/* SEÇÃO 8: HISTÓRICO DE REGIME DE UTILIZAÇÃO */}
            <div style={{ 
              marginBottom: '12px',
              padding: '10px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}>
              <div style={{ 
                fontSize: '12pt', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1E3A8A',
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '4px',
              }}>
                Histórico de Regime de Utilização
              </div>
              
              {hstRegimes.length > 0 ? (
                <div style={{ 
                  width: '100%',
                  border: '1px solid #e0e0e0',
                  borderRadius: '3px',
                }}>
                  {/* Cabeçalho da tabela */}
                  <div style={{ 
                    display: 'flex', 
                    backgroundColor: '#f2f2f2',
                    borderBottom: '1px solid #e0e0e0',
                  }}>
                    <div style={{ 
                      flex: 3, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Regime
                    </div>
                    <div style={{ 
                      flex: 2, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Data Início
                    </div>
                    <div style={{ 
                      flex: 2, 
                      padding: '5px',
                      fontWeight: 'bold',
                      fontSize: '9pt',
                    }}>
                      Data Fim
                    </div>
                  </div>
                  
                  {/* Linhas da tabela */}
                  {hstRegimes.map((h: any, index: number) => (
                    <div key={index} style={{ 
                      display: 'flex',
                      borderBottom: '1px solid #f0f0f0',
                    }}>
                      <div style={{ 
                        flex: 3, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {getRegimeDesc(h.idregimeutilizacao)}
                      </div>
                      <div style={{ 
                        flex: 2, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {formatDateBR(h.dtinicio)}
                      </div>
                      <div style={{ 
                        flex: 2, 
                        padding: '5px',
                        fontSize: '9pt',
                      }}>
                        {h.dtfim ? formatDateBR(h.dtfim) : 'Atual'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>Nenhum histórico encontrado.</div>
              )}
            </div>
            
            {/* Rodapé fixo na página 3 */}
            <Footer pageNumber={3} />
          </div>
        </div>
      )}
    </>
  );
};

export default SafePdfButton;