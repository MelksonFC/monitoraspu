import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, TextField, Table, TableHead, TableRow, TableCell, Alert, IconButton, Tooltip, LinearProgress, Collapse
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import axios from "axios";
import { MapContainer, TileLayer, FeatureGroup, Popup, Marker } from "react-leaflet";
import L, { Map } from "leaflet";
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { useAuth } from "../AuthContext";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { simplifyAndConvertToTopoJSON } from "../utils/geometryUtils";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type PoligonoTerreno = {
  id: number;
  coordinates: [number, number][];
};

const API_URL = import.meta.env.VITE_API_URL;

export default function PoligonoTerrenoDialog({
  open,
  onClose,
  idimovel,
  lat,
  lng,
}: {
  open: boolean;
  onClose: () => void;
  idimovel: number;
  lat?: number;
  lng?: number;
}) {
  const { usuario } = useAuth();
  const [poligono, setPoligono] = useState<PoligonoTerreno | null>(null);
  const [coords, setCoords] = useState<[number, number][]>([]);
  const [simplifiedTopoJSON, setSimplifiedTopoJSON] = useState<string | null>(null);
  const [simplificationInfo, setSimplificationInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const mapRef = useRef<Map>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearState = () => {
    setCoords([]);
    setPoligono(null);
    setSimplifiedTopoJSON(null);
    setSimplificationInfo(null);
    setError(null);
    // Não limpe a mensagem de sucesso aqui para que ela possa ser exibida após a exclusão
    setLoading(false);
    setIsImporting(false);
  };

  useEffect(() => {
    if (!open || !idimovel) return;
    clearState();
    setImportSuccess(null); // Limpa o sucesso ao abrir
    setLoading(true);
    axios.get(`${API_URL}/api/poligonosterreno/imovel/${idimovel}`)
      .then((res) => {
        const dados = (Array.isArray(res.data) ? res.data : []).map((p: any) => ({
          id: p.id,
          coordinates: p.area?.coordinates?.[0] ?? [],
        }));
        if (dados.length > 0 && dados[0].coordinates.length > 0) {
          setPoligono(dados[0]);
          setCoords(dados[0].coordinates);
        }
      })
      .catch(() => setError("Falha ao carregar o polígono do imóvel."))
      .finally(() => setLoading(false));
  }, [open, idimovel]);
  
  useEffect(() => {
    if (open && mapRef.current) {
      const timer = setTimeout(() => mapRef.current?.invalidateSize(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const fg = featureGroupRef.current;
    const map = mapRef.current;
    if (!fg || !map) return;

    fg.clearLayers();
    if (coords.length > 2) {
      try {
        const leafletCoords: [number, number][] = coords.map(c => [c[1], c[0]]);
        const polygonLayer = L.polygon(leafletCoords, { color: 'blue' });
        fg.addLayer(polygonLayer);
        map.fitBounds(polygonLayer.getBounds(), { padding: [50, 50] });
      } catch (e) {
        console.error("Erro ao desenhar polígono no Leaflet:", e);
        setError("Coordenadas inválidas para o desenho no mapa.");
      }
    }
  }, [coords]);

  useEffect(() => {
  // Roda esta lógica sempre que as coordenadas mudarem.
  const reprocessCoordinates = async () => {
    // Só processa se tivermos um polígono válido (mais de 2 pontos)
    if (coords.length < 3) {
      setSimplifiedTopoJSON(null); // Limpa se o polígono se tornar inválido
      return;
    }

    // GeoJSON exige que o primeiro e o último ponto sejam idênticos (polígono fechado).
    const closedCoords = [...coords, coords[0]];

    // Monta um objeto GeoJSON que a nossa função de simplificação entende.
    const geojsonFeature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [closedCoords], // GeoJSON espera um array de anéis
      },
    };

    try {
      // Converte para string e chama a função de simplificação
      const geojsonString = JSON.stringify(geojsonFeature);
      const { simplifiedTopoJSON: newSimplifiedData } = await simplifyAndConvertToTopoJSON(geojsonString, 0.01);
      
      // Atualiza o estado com a nova geometria, habilitando o botão "Atualizar"
      setSimplifiedTopoJSON(newSimplifiedData);
      setSimplificationInfo("Pronto para salvar as alterações.");

    } catch (err) {
      console.error("Falha ao reprocessar coordenadas:", err);
      setError("Não foi possível processar as coordenadas editadas.");
      setSimplifiedTopoJSON(null); // Desabilita o botão em caso de erro
    }
  };

  reprocessCoordinates();
}, [coords]); // A "magia" acontece aqui: este código roda sempre que 'coords' muda.

  const handleSave = () => {
    if (!usuario) return setError("Usuário não autenticado.");
    if (!simplifiedTopoJSON) return setError("Não há dados simplificados para salvar. Por favor, importe um arquivo primeiro.");

    setLoading(true);
    setError(null);

    const data = { 
      idimovel, 
      geometria: simplifiedTopoJSON, 
      formato: 'TopoJSON', 
      usercreated: usuario.id, 
      usermodified: usuario.id 
    };

    // --- LOG DE DEPURAÇÃO ADICIONADO AQUI ---
    //console.log("Dados enviados para o backend:", data);
    //console.log("String 'geometria' (TopoJSON):", simplifiedTopoJSON);
    // --- FIM DO LOG ---

    const request = poligono
      ? axios.put(`${API_URL}/api/poligonosterreno/${poligono.id}`, data)
      : axios.post(`${API_URL}/api/poligonosterreno`, data);

    request
      .then(() => {
        setImportSuccess("Polígono salvo com sucesso!");
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setTimeout(onClose, 1500);
      })
      .catch((err) => setError(err.response?.data?.error || "Falha ao salvar o polígono."))
      .finally(() => setLoading(false));
  };

  // NOVO: Função para excluir o polígono inteiro
  const handleDeletePolygon = () => {
  if (!poligono) return;

  if (!window.confirm("Tem certeza que deseja excluir todo o polígono deste imóvel? Esta ação não pode ser desfeita.")) {
    return;
  }

  setLoading(true);
  setError(null);

  axios.delete(`${API_URL}/api/poligonosterreno/${poligono.id}`)
    .then(() => {
      setImportSuccess("Polígono excluído com sucesso!");

      // Remove o foco do botão "Excluir" antes de a UI reagir.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      
      clearState(); 
    })
    .catch(() => setError("Falha ao excluir o polígono."))
    .finally(() => setLoading(false));
};

  const handleInvertCoords = () => {
    if (coords.length === 0) return;
    const invertedCoords = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
    setCoords(invertedCoords);
  };

  const handleCoordChange = (index: number, value: string, latOrLng: 'lat' | 'lng') => {
    const newCoords = [...coords];
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      newCoords[index] = latOrLng === 'lat' ? [newCoords[index][0], numValue] : [numValue, newCoords[index][1]];
      setCoords(newCoords);
    }
  };

  // NOVO: Função para remover uma coordenada específica
  const handleRemoveCoord = (indexToRemove: number) => {
    const newCoords = coords.filter((_, index) => index !== indexToRemove);
    setCoords(newCoords);
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearState();
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const { simplifiedTopoJSON, originalCount } = await simplifyAndConvertToTopoJSON(text, 0.01);
        
        const geojsonData = JSON.parse(text);
        const originalCoords = (geojsonData.features?.[0]?.geometry?.coordinates?.[0] || geojsonData.coordinates?.[0] || []) as [number, number][];

        if (originalCoords.length === 0) {
            throw new Error("Não foi possível encontrar coordenadas no arquivo. Verifique se é um GeoJSON com um Polígono.");
        }
        
        setCoords(originalCoords);
        setSimplifiedTopoJSON(simplifiedTopoJSON);
        setSimplificationInfo(`Geometria simplificada de ${originalCount} para uma versão otimizada. Valide o desenho e salve.`);

      } catch (err: any) {
        setError(err.message);
        setCoords([]);
      } finally {
        setIsImporting(false);
        if (event.target) event.target.value = '';
      }
    };
    reader.onerror = () => {
      setError("Falha ao ler o arquivo.");
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const coord = coords[index];
    const cellSx = { borderBottom: 'none', paddingY: 0.5 };
    return (
      <TableRow style={style} key={index} component="div">
        <TableCell component="div" sx={cellSx}>
            <TextField type="number" value={coord[0]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCoordChange(index, e.target.value, 'lng')} fullWidth variant="standard" />
        </TableCell>
        <TableCell component="div" sx={cellSx}>
            <TextField type="number" value={coord[1]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCoordChange(index, e.target.value, 'lat')} fullWidth variant="standard" />
        </TableCell>
        <TableCell component="div" sx={{...cellSx, width: '60px', textAlign: 'right' }}>
            {/* ALTERADO: Ativa o botão de exclusão da coordenada */}
            <IconButton size="small" onClick={() => handleRemoveCoord(index)}>
                <DeleteIcon fontSize="small" />
            </IconButton>
        </TableCell>
      </TableRow>
    );
  }, [coords, handleCoordChange, handleRemoveCoord]); // ALTERADO: Adiciona dependências

  const center: [number, number] = (lat && lng) ? [lat, lng] : [-15.77972, -47.92972];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Polígono do Terreno</DialogTitle>
      <DialogContent>
        <Collapse in={!!error}>
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
        </Collapse>
        <Collapse in={!!importSuccess}>
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setImportSuccess(null)}>{importSuccess}</Alert>
        </Collapse>
        <Collapse in={!!simplificationInfo}>
            <Alert severity="info" sx={{ mb: 2 }}>{simplificationInfo}</Alert>
        </Collapse>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1, height: '500px', minHeight: '300px' }}>
            <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }} ref={mapRef}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FeatureGroup ref={featureGroupRef} />
              {lat && lng && <Marker position={[lat, lng]}><Popup>Local do Imóvel</Popup></Marker>}
            </MapContainer>
          </Box>
          <Box sx={{ flex: 1, maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6">Coordenadas</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".json,.geojson" />
              {isImporting ? (
                <Box sx={{ width: '100%' }}><LinearProgress /></Box>
              ) : (
                <>
                  <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                    Importar GeoJSON
                  </Button>
                  <Tooltip title="Inverter Longitude/Latitude em todos os pontos">
                    <span>
                      <IconButton onClick={handleInvertCoords} disabled={coords.length === 0}>
                        <SwapHorizIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}
            </Box>
            <Box sx={{ flexGrow: 1, border: '1px solid #ccc', borderRadius: '4px' }}>
                <Table component="div" size="small">
                    <TableHead component="div">
                        <TableRow component="div">
                            <TableCell component="div">Longitude</TableCell>
                            <TableCell component="div">Latitude</TableCell>
                            <TableCell component="div" sx={{ width: '60px' }}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
                <List height={350} itemCount={coords.length} itemSize={40} width="100%">
                    {Row}
                </List>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}> {/* ALTERADO: para alinhar os botões */}
        {/* NOVO: Botão para excluir o polígono inteiro */}
        {poligono && (
            <Button onClick={handleDeletePolygon} color="error" disabled={loading || isImporting}>
                Excluir Polígono
            </Button>
        )}
        <Box>
            <Button onClick={onClose} color="secondary" disabled={loading || isImporting}>Cancelar</Button>
            <Button onClick={handleSave} variant="contained" disabled={loading || isImporting || !simplifiedTopoJSON}>
              {loading ? "Salvando..." : (poligono ? "Atualizar" : "Salvar")}
            </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}