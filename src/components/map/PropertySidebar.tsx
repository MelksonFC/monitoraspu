import React, { useMemo, useRef, useState } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, ListItemAvatar, Avatar, Typography, Divider, IconButton, Select, FormControl, InputLabel, MenuItem, Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import type { ImovelComCoordenadas } from '../../pages/MapPage';
import ImageIcon from '@mui/icons-material/Image';
import { formatValorBR } from '../../pages/ImovelForm';

type SortOption = 'nome' | 'valorimovel' | 'ripimovel';

interface PropertySidebarProps {
  imoveis: ImovelComCoordenadas[];
  onImovelSelect: (imovel: ImovelComCoordenadas) => void;
  selectedImovel: ImovelComCoordenadas | null;
  onClearFilters: () => void; 
  isFilterApplied: boolean; 
}

export default function PropertySidebar({ imoveis, onImovelSelect, selectedImovel, onClearFilters, isFilterApplied }: PropertySidebarProps) {
    const navigate = useNavigate();
    const listRef = useRef<HTMLUListElement>(null);
    const [sortOption, setSortOption] = useState<SortOption>('nome');

    const sortedImoveis = useMemo(() => {
        const sorted = [...imoveis];
        sorted.sort((a, b) => {
            switch (sortOption) {
                case 'valorimovel':
                    return (b.valorimovel || 0) - (a.valorimovel || 0);
                case 'ripimovel':
                    return (a.ripimovel || '').localeCompare(b.ripimovel || '');
                case 'nome':
                default:
                    return a.nome.localeCompare(b.nome);
            }
        });
        return sorted;
    }, [imoveis, sortOption]);

    const handleEdit = (imovelId: number) => {
        navigate(`/imovel/${imovelId}`);
    };

    const getDefaultImage = (imovel: ImovelComCoordenadas) => {
        const defaultImg = imovel.imagens?.find(img => img.isdefault) || imovel.imagens?.[0];
        return defaultImg?.url;
    };

    return (
        <Box className="bg-card text-foreground" sx={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: 4, borderLeft: '1px solid', borderColor: 'hsl(var(--border))' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'hsl(var(--border))', flexShrink: 0 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'hsl(var(--foreground))' }}>
                    Imóveis ({imoveis.length})
                </Typography>
                <FormControl fullWidth size="small">
                    <InputLabel id="sort-by-label">Ordenar por</InputLabel>
                    <Select labelId="sort-by-label" id="sort-by-select" value={sortOption} label="Ordenar por" onChange={(e) => setSortOption(e.target.value as SortOption)}>
                        <MenuItem value="nome">Classe</MenuItem>
                        <MenuItem value="valorimovel">Valor do Imóvel</MenuItem>
                        <MenuItem value="ripimovel">RIP do Imóvel</MenuItem>
                    </Select>
                </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 auto', overflowY: 'auto' }}>
                {imoveis.length === 0 && isFilterApplied ? (
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'hsl(var(--foreground))' }}>
                            Nenhum imóvel encontrado
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'hsl(var(--muted-foreground))' }}>
                            Tente ajustar os seus filtros ou limpe a busca para ver todos os imóveis.
                        </Typography>
                        <Button variant="outlined" onClick={onClearFilters}>
                            Limpar Filtros
                        </Button>
                    </Box>
                ) : (
                    <List ref={listRef}>
                        {sortedImoveis.map((imovel) => (
                            <React.Fragment key={imovel.idimovel}>
                                <ListItem id={`imovel-item-${imovel.idimovel}`} disablePadding sx={{ backgroundColor: selectedImovel?.idimovel === imovel.idimovel ? 'hsl(var(--accent))' : 'transparent', transition: 'background-color 0.3s', alignItems: 'flex-start', pt: 0.0, pb: 0.0 }}
                                    secondaryAction={
                                        <IconButton edge="end" aria-label="editar imóvel" onClick={() => handleEdit(imovel.idimovel)} sx={{mt: 1}}>
                                            <SettingsIcon />
                                        </IconButton>
                                    }
                                >
                                    <ListItemButton onClick={() => onImovelSelect(imovel)} sx={{ alignItems: 'flex-start', '&:hover': { backgroundColor: 'hsl(var(--accent) / 0.5)' } }}>
                                        <ListItemAvatar sx={{ mt: 0.5 }}>
                                            <Avatar variant="rounded" src={getDefaultImage(imovel)} sx={{ width: 60, height: 60, mr: 2 }}><ImageIcon /></Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={<Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', color: 'hsl(var(--foreground))' }}>{imovel.nome}</Typography>}
                                            secondary={
                                                <Typography component="span" variant="body2" sx={{ color: 'hsl(var(--muted-foreground))' }}>
                                                    <div>RIP Imóvel: {imovel.ripimovel || 'N/A'}</div>
                                                    <div>Valor: {imovel.valorimovel ? `R$ ${formatValorBR(imovel.valorimovel)}` : 'N/A'}</div>
                                                    <div>{imovel.endereco}{imovel.numero ? `, ${imovel.numero}` : ''}</div>
                                                    {imovel.complemento && <div>{imovel.complemento}</div>}
                                                    <div>{imovel.Municipio?.nome}/{imovel.Municipio?.Estado?.uf}</div>
                                                </Typography>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                                <Divider variant="fullWidth" component="li" sx={{ borderColor: 'hsl(var(--border))' }} />
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Box>
        </Box>
    );
}
