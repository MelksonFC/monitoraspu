import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, TextField, Table, TableHead, TableRow, TableCell, Alert, IconButton, Tooltip, LinearProgress, Collapse
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import axios from "axios";
import { MapContainer, TileLayer, Polygon, FeatureGroup, Popup, Marker } from "react-leaflet";
import L, { Map } from "leaflet";
import { FixedSizeList as List } from 'react-window';
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { useAuth } from "../AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
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
  // --- NOVOS ESTADOS ---
  const [simplifiedTopoJSON, setSimplifiedTopoJSON] = useState<string | null>(null);
  const [simplificationInfo, setSimplificationInfo] = useState<string | null>(null);
  // -------------------
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
    setImportSuccess(null);
    setLoading(false);
    setIsImporting(false);
  };

  useEffect(() => {
    if (!open || !idimovel) return;
    clearState();
    setLoading(true);
    axios.get(`${API_URL}/api/poligonosterreno/imovel/${idimovel}`)
      .then((res) => {
        // Lógica para carregar polígonos existentes (agora pode vir como TopoJSON)
        // Por enquanto, vamos manter a lógica GeoJSON simples que você tinha.
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
        const polygonLayer = L.polygon(coords.map(c => [c[1], c[0]]), { color: 'blue' }); // Invertido para [lat, lng]
        fg.addLayer(polygonLayer);
        map.fitBounds(polygonLayer.getBounds(), { padding: [50, 50] });
      } catch (e) {
        console.error("Erro ao desenhar polígono no Leaflet:", e);
        setError("Coordenadas inválidas para o desenho no mapa.");
      }
    }
  }, [coords]);

  // --- FUNÇÃO DE SALVAR ATUALIZADA ---
  const handleSave = () => {
    if (!usuario) return setError("Usuário não autenticado.");
    if (!simplifiedTopoJSON) return setError("Não há dados simplificados para salvar. Por favor, importe um arquivo primeiro.");

    setLoading(true);
    setError(null);

    // Envia o TopoJSON simplificado
    const data = { 
      idimovel, 
      geometria: simplifiedTopoJSON, 
      formato: 'TopoJSON', // Informa ao backend o formato dos dados
      usercreated: usuario.id, 
      usermodified: usuario.id 
    };

    const request = poligono
      ? axios.put(`${API_URL}/api/poligonosterreno/${poligono.id}`, data)
      : axios.post(`${API_URL}/api/poligonosterreno`, data);

    request
      .then(() => {
        setImportSuccess("Polígono salvo com sucesso!");
        setTimeout(onClose, 1500); // Fecha o dialog após sucesso
      })
      .catch((err) => setError(err.response?.data?.error || "Falha ao salvar o polígono."))
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
      // Note: O estado `coords` armazena [lng, lat]
      newCoords[index] = latOrLng === 'lat' ? [newCoords[index][0], numValue] : [numValue, newCoords[index][1]];
      setCoords(newCoords);
    }
  };
  
  // --- FUNÇÃO DE UPLOAD DE ARQUIVO ATUALIZADA ---
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limpa estados anteriores
    clearState();
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        // Simplifica e extrai os dados em um único passo
        const { simplifiedTopoJSON, originalCount } = await simplifyAndConvertToTopoJSON(text, 1);
        
        // Extrai as coordenadas originais para visualização
        const geojsonData = JSON.parse(text);
        const originalCoords = (geojsonData.features?.[0]?.geometry?.coordinates?.[0] || geojsonData.coordinates?.[0] || []) as [number, number][];

        if (originalCoords.length === 0) {
            throw new Error("Não foi possível encontrar coordenadas no arquivo. Verifique se é um GeoJSON com um Polígono.");
        }
        
        setCoords(originalCoords);
        setSimplifiedTopoJSON(simplifiedTopoJSON);
        setSimplificationInfo(`Geometria simplificada de ${originalCount} para uma versão otimizada (1%). Valide o desenho e salve.`);

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

  // Ajustado para mostrar Lng/Lat, pois é o padrão GeoJSON
  const Row = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    const coord = coords[index];
    const cellSx = { borderBottom: 'none' };
    return (
      <TableRow style={style} key={index} component="div">
        <TableCell component="div" sx={cellSx}>
            <TextField type="number" value={coord[0]} onChange={(e) => handleCoordChange(index, e.target.value, 'lng')} fullWidth variant="standard" />
        </TableCell>
        <TableCell component="div" sx={cellSx}>
            <TextField type="number" value={coord[1]} onChange={(e) => handleCoordChange(index, e.target.value, 'lat')} fullWidth variant="standard" />
        </TableCell>
        <TableCell component="div" sx={cellSx}>
            <IconButton size="small" disabled><DeleteIcon /></IconButton>
        </TableCell>
      </TableRow>
    );
  }, [coords]);

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
        {/* --- NOVA MENSAGEM DE SIMPLIFICAÇÃO --- */}
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
                            <TableCell component="div">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
                <List height={350} itemCount={coords.length} itemSize={53} width="100%">
                    {Row}
                </List>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={loading || isImporting}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading || isImporting || !simplifiedTopoJSON}>
          {loading ? "Salvando..." : (poligono ? "Atualizar" : "Salvar")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}