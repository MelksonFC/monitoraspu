import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert, IconButton, Tooltip, CircularProgress
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from "axios";
import { MapContainer, TileLayer, Polygon, Marker, FeatureGroup, Popup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L, { Map } from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { useAuth } from "../AuthContext";
import { useState, useEffect, useRef } from "react";

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
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<Map>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !idimovel) return;

    const fg = featureGroupRef.current;
    if (fg) {
      fg.clearLayers();
    }

    setLoading(true);
    setError(null);
    axios
      .get(`${API_URL}/api/poligonosterreno/imovel/${idimovel}`)
      .then((res) => {
        const dados: PoligonoTerreno[] = (Array.isArray(res.data) ? res.data : []).map(
          (p: any) => ({
            id: p.id,
            coordinates: p.area?.coordinates?.[0] ?? [],
          })
        );
        if (dados.length > 0 && dados[0].coordinates.length > 0) {
          setPoligono(dados[0]);
          setCoords(dados[0].coordinates);
          if (fg) {
            const polygonLayer = L.polygon(dados[0].coordinates, { color: 'red' });
            fg.addLayer(polygonLayer);
            if (mapRef.current) {
              mapRef.current.fitBounds(polygonLayer.getBounds());
            }
          }
        } else {
          setPoligono(null);
          setCoords([]);
        }
      })
      .catch(() => setError("Falha ao carregar o polígono do imóvel."))
      .finally(() => setLoading(false));
  }, [open, idimovel]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [open]);

  const handleSave = () => {
    if (!usuario) {
      setError("Usuário não autenticado.");
      return;
    }
    setLoading(true);
    setError(null);

    const data = {
      idimovel,
      coordinates: coords,
      usercreated: usuario.id,
      usermodified: usuario.id,
    };

    const request = poligono
      ? axios.put(`${API_URL}/api/poligonosterreno/${poligono.id}`, data)
      : axios.post(`${API_URL}/api/poligonosterreno`, data);

    request
      .then(() => onClose())
      .catch((err) => {
        const message = err.response?.data?.error || "Falha ao salvar o polígono.";
        setError(message);
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = () => {
    if (!poligono) return;
    setLoading(true);
    setError(null);
    axios
      .delete(`${API_URL}/api/poligonosterreno/${poligono.id}`)
      .then(() => onClose())
      .catch(() => setError("Falha ao remover o polígono."))
      .finally(() => setLoading(false));
  };

  const handleAddCoord = () => {
    setCoords([...coords, [0, 0]]);
  };

  const handleCoordChange = (index: number, value: string, latOrLng: 'lat' | 'lng') => {
    const newCoords = [...coords];
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      newCoords[index] = latOrLng === 'lat'
        ? [numValue, newCoords[index][1]]
        : [newCoords[index][0], numValue];
      setCoords(newCoords);
    }
  };

  const handleRemoveCoord = (index: number) => {
    setCoords(coords.filter((_, i) => i !== index));
  };

  const moveCoord = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= coords.length) return;
    const newCoords = [...coords];
    [newCoords[index], newCoords[newIndex]] = [newCoords[newIndex], newCoords[index]];
    setCoords(newCoords);
  };

  const parseCoordinatesFromFile = (fileContent: string) => {
    setError(null);
    const text = fileContent.trim();

    // Tenta processar como JSON (lista de listas)
    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.every(p => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number')) {
          setCoords(parsed as [number, number][]);
          return;
        }
      } catch (e) {
        // Ignora o erro e tenta o próximo formato
      }
    }

    // Tenta processar como CSV (lat,lng por linha)
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 0 && lines.every(line => line.includes(','))) {
      const newCoords: [number, number][] = lines.map(line => {
        const parts = line.split(',');
        return [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
      });

      if (newCoords.every(c => !isNaN(c[0]) && !isNaN(c[1]))) {
        setCoords(newCoords);
        return;
      }
    }
    
    throw new Error("Formato de arquivo inválido. Use um array JSON de coordenadas [[lat, lng], ...] ou uma lista de 'lat,lng' por linha.");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        parseCoordinatesFromFile(text);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsImporting(false);
        if(event.target) {
          event.target.value = '';
        }
      }
    };
    reader.onerror = () => {
      setError("Falha ao ler o arquivo.");
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const center: [number, number] = (lat && lng) ? [lat, lng] : [-15.77972, -47.92972];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Polígono do Terreno</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1, height: '500px', minHeight: '300px' }}>
            <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }} ref={mapRef}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FeatureGroup ref={featureGroupRef}>
                <EditControl
                  position="topright"
                  onCreated={(e: any) => {
                    const layer = e.layer;
                    setCoords(layer.getLatLngs()[0].map((p: L.LatLng) => [p.lat, p.lng]));
                  }}
                  onEdited={(e: any) => {
                    const layers = e.layers;
                    layers.eachLayer((layer: any) => {
                      setCoords(layer.getLatLngs()[0].map((p: L.LatLng) => [p.lat, p.lng]));
                    });
                  }}
                  onDeleted={(e: any) => {
                    if (Object.keys(e.layers._layers).length === 0) {
                      setCoords([]);
                    }
                  }}
                  draw={{
                    rectangle: false,
                    circle: false,
                    marker: false,
                    circlemarker: false,
                    polyline: false,
                  }}
                />
                {coords.length > 2 && <Polygon positions={coords} color="blue" />}
              </FeatureGroup>
              {lat && lng && <Marker position={[lat, lng]}><Popup>Local do Imóvel</Popup></Marker>}
            </MapContainer>
          </Box>
          <Box sx={{ flex: 1, maxHeight: '500px', overflowY: 'auto' }}>
            <Typography variant="h6">Coordenadas</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 1 }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".json,.txt,.csv"
              />
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? "Importando..." : "Importar de Arquivo"}
              </Button>
              {isImporting && <CircularProgress size={24} />}
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Latitude</TableCell>
                  <TableCell>Longitude</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coords.map((coord, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        type="number"
                        value={coord[0]}
                        onChange={(e) => handleCoordChange(index, e.target.value, 'lat')}
                        fullWidth
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={coord[1]}
                        onChange={(e) => handleCoordChange(index, e.target.value, 'lng')}
                        fullWidth
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => moveCoord(index, 'up')} disabled={index === 0} size="small"><ArrowUpwardIcon /></IconButton>
                      <IconButton onClick={() => moveCoord(index, 'down')} disabled={index === coords.length - 1} size="small"><ArrowDownwardIcon /></IconButton>
                      <IconButton onClick={() => handleRemoveCoord(index)} size="small"><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button startIcon={<AddIcon />} onClick={handleAddCoord} sx={{ mt: 1 }}>
              Adicionar Ponto
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        {poligono && <Button onClick={handleDelete} color="error" disabled={loading}>Remover</Button>}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} color="secondary" disabled={loading}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading || coords.length < 3}>
          {loading ? "Salvando..." : (poligono ? "Atualizar" : "Salvar")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}