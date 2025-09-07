import React, { useMemo, useRef, useState } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, ListItemAvatar, Avatar, Typography, Divider, IconButton, Select, FormControl, InputLabel, MenuItem, Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import type { ImovelComCoordenadas } from '../../pages/MapPage';
import ImageIcon from '@mui/icons-material/Image';
import { useAuth } from '../../AuthContext';
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
    const { usuario } = useAuth();
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
        <Box sx={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper', boxShadow: 4, borderLeft: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
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
                        <Typography variant="subtitle1" gutterBottom>
                            Nenhum imóvel encontrado
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
                                <ListItem id={`imovel-item-${imovel.idimovel}`} disablePadding sx={{ backgroundColor: selectedImovel?.idimovel === imovel.idimovel ? 'action.hover' : 'transparent', transition: 'background-color 0.3s', alignItems: 'flex-start', pt: 0.0, pb: 0.0 }}
                                    secondaryAction={
                                        <IconButton edge="end" aria-label="editar imóvel" onClick={() => handleEdit(imovel.idimovel)} sx={{mt: 1}}>
                                            <SettingsIcon />
                                        </IconButton>
                                    }
                                >
                                    <ListItemButton onClick={() => onImovelSelect(imovel)} sx={{ alignItems: 'flex-start' }}>
                                        <ListItemAvatar sx={{ mt: 0.5 }}>
                                            <Avatar variant="rounded" src={getDefaultImage(imovel)} sx={{ width: 60, height: 60, mr: 2 }}><ImageIcon /></Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={<Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>{imovel.nome}</Typography>}
                                            secondary={
                                                <Typography component="span" variant="body2" color="text.secondary">
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
                                <Divider variant="fullWidth" component="li" />
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Box>
        </Box>
    );
}