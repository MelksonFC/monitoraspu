import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, TextField, Table, TableHead, TableRow, TableCell, Alert, IconButton, Tooltip, LinearProgress, Collapse
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from "axios";
import { MapContainer, TileLayer, Polygon, Marker, FeatureGroup, Popup } from "react-leaflet";
import L, { Map } from "leaflet";
import { FixedSizeList as List } from 'react-window';
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { useAuth } from "../AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";

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
const BATCH_SIZE = 2000;
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

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
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const mapRef = useRef<Map>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !idimovel) return;
    setCoords([]);
    setLoading(true);
    setError(null);
    setImportSuccess(null);
    axios.get(`${API_URL}/api/poligonosterreno/imovel/${idimovel}`)
      .then((res) => {
        const dados: PoligonoTerreno[] = (Array.isArray(res.data) ? res.data : []).map((p: any) => ({
          id: p.id,
          coordinates: p.area?.coordinates?.[0] ?? [],
        }));
        if (dados.length > 0 && dados[0].coordinates.length > 0) {
          setPoligono(dados[0]);
          setCoords(dados[0].coordinates);
        } else {
          setPoligono(null);
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
        const polygonLayer = L.polygon(coords, { color: 'blue' });
        fg.addLayer(polygonLayer);
        map.fitBounds(polygonLayer.getBounds(), { padding: [50, 50] });
      } catch (e) {
        console.error("Erro ao desenhar polígono no Leaflet:", e);
        setError("Coordenadas inválidas para o desenho no mapa.");
      }
    }
  }, [coords]);

  const handleSave = () => {
    if (!usuario) return setError("Usuário não autenticado.");
    setLoading(true);
    setError(null);
    const data = { idimovel, coordinates: coords, usercreated: usuario.id, usermodified: usuario.id };
    const request = poligono
      ? axios.put(`${API_URL}/api/poligonosterreno/${poligono.id}`, data)
      : axios.post(`${API_URL}/api/poligonosterreno`, data);
    request
      .then(onClose)
      .catch((err) => setError(err.response?.data?.error || "Falha ao salvar o polígono."))
      .finally(() => setLoading(false));
  };

  const handleCoordChange = (index: number, value: string, latOrLng: 'lat' | 'lng') => {
    const newCoords = [...coords];
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      newCoords[index] = latOrLng === 'lat' ? [numValue, newCoords[index][1]] : [newCoords[index][0], numValue];
      setCoords(newCoords);
    }
  };

  const asyncParseCoordinates = async (fileContent: string): Promise<[number, number][]> => {
    const text = fileContent.trim();
    
    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.every(p => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number')) {
            return parsed as [number, number][];
        }
      } catch (e) { /* Fallback */ }
    }
    
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) throw new Error("Arquivo vazio ou em formato não reconhecido.");

    let newCoords: [number, number][] = [];
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      const processedBatch = batch.map((line, batchIndex) => {
        const parts = line.split(',');
        const lat = parseFloat(parts[0]?.trim());
        const lng = parseFloat(parts[1]?.trim());
        if (isNaN(lat) || isNaN(lng)) throw new Error(`Formato inválido na linha ${i + batchIndex + 1}`);
        return [lat, lng] as [number, number];
      });
      newCoords.push(...processedBatch);
      setImportProgress(Math.round(((i + batch.length) / lines.length) * 100));
      await yieldToMain();
    }
    return newCoords;
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setImportSuccess(null);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const newCoords = await asyncParseCoordinates(text);
        setCoords(newCoords);
        setImportSuccess(`${newCoords.length} coordenadas importadas com sucesso!`);
        setTimeout(() => setImportSuccess(null), 5000);
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

  const Row = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    const coord = coords[index];
    return (
      <TableRow style={style} key={index} component="div">
        <TableCell component="div"><TextField type="number" value={coord[0]} onChange={(e) => handleCoordChange(index, e.target.value, 'lat')} fullWidth variant="standard" /></TableCell>
        <TableCell component="div"><TextField type="number" value={coord[1]} onChange={(e) => handleCoordChange(index, e.target.value, 'lng')} fullWidth variant="standard" /></TableCell>
        <TableCell component="div">
            <IconButton size="small" disabled><ArrowUpwardIcon /></IconButton>
            <IconButton size="small" disabled><ArrowDownwardIcon /></IconButton>
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
            <Box sx={{ my: 1 }}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".json,.txt,.csv" />
              {isImporting ? (
                <Box sx={{ width: '100%' }}>
                  <LinearProgress variant="determinate" value={importProgress} />
                  <Typography variant="caption" display="block" textAlign="center">{`${importProgress}%`}</Typography>
                </Box>
              ) : (
                <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                  Importar de Arquivo
                </Button>
              )}
            </Box>
            <Box sx={{ flexGrow: 1, border: '1px solid #ccc', borderRadius: '4px' }}>
                <Table component="div" size="small">
                    <TableHead component="div">
                        <TableRow component="div">
                            <TableCell component="div">Latitude</TableCell>
                            <TableCell component="div">Longitude</TableCell>
                            <TableCell component="div">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
                <List
                    height={350}
                    itemCount={coords.length}
                    itemSize={53}
                    width="100%"
                >
                    {Row}
                </List>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={loading || isImporting}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading || isImporting || coords.length < 3}>
          {loading ? "Salvando..." : (poligono ? "Atualizar" : "Salvar")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}