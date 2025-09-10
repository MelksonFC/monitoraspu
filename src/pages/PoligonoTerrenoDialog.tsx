import React, { useEffect, useState, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
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

  const mapRef = useRef<Map>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  useEffect(() => {
    if (!open || !idimovel) return;

    const fg = featureGroupRef.current;
    if (fg) {
      fg.clearLayers(); // Limpa camadas antigas
    }

    setLoading(true);
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
          }
        } else {
          setPoligono(null);
          setCoords([]);
        }
      })
      .finally(() => setLoading(false));
  }, [open, idimovel]);

  // 2. NOVO EFEITO PARA INVALIDAR O TAMANHO DO MAPA
  useEffect(() => {
    // Se o diálogo não estiver aberto, não faça nada
    if (!open) {
      return;
    }

    // Usamos um pequeno timeout para garantir que o Dialog esteja 100% renderizado
    const timer = setTimeout(() => {
      const map = mapRef.current;
      if (map) {
        // Esta é a função mágica que corrige o problema
        map.invalidateSize();
      }
    }, 100); // 100ms é geralmente suficiente

    // Limpa o timeout se o componente for desmontado
    return () => clearTimeout(timer);
  }, [open]); // Dispare este efeito sempre que o 'open' mudar

  const handleMapCreated = (e: any) => {
    const { layer } = e;
    const pts = layer.getLatLngs()[0].map((latlng: L.LatLng) => [
      Number(latlng.lat),
      Number(latlng.lng),
    ]);
    setCoords(pts as [number, number][]);
  };

  const handleCoordChange = (idx: number, field: "lat" | "lng", value: string) => {
    const updated = coords.map((c, i) =>
      i === idx
        ? [field === "lat" ? Number(value) : c[0], field === "lng" ? Number(value) : c[1]]
        : c
    );
    setCoords(updated as [number, number][]);
  };

  const handleDeletePoint = (idx: number) => {
    setCoords(coords.filter((_, i) => i !== idx));
  };
  
  const handleAddPoint = () => {
    let center: [number, number];
    if (lat !== undefined && lng !== undefined) {
      center = [lat, lng];
    } else {
      center = [0, 0];
    }
    setCoords([...coords, center]);
  };

  const handleMovePoint = (idx: number, dir: "up" | "down") => {
    const updated = [...coords];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= coords.length) return;
    [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
    setCoords(updated);
  };

  const handleSave = async () => {
    // 3. VERIFICAÇÃO DE SEGURANÇA
    if (!usuario?.id) {
      alert("Usuário não autenticado. Por favor, faça login para salvar.");
      return;
    }
    if (coords.length < 3) {
      alert("Um polígono precisa de pelo menos 3 pontos.");
      return;
    }
    setLoading(true);
    
    // 4. USO DO ID DO USUÁRIO LOGADO
    const payload = {
      coordinates: coords,
      usermodified: usuario.id,
    };
    
    try {
      if (!poligono) {
        await axios.post(`${API_URL}/api/poligonosterreno`, {
          ...payload,
          idimovel,
          usercreated: usuario.id, // Uso do ID do usuário aqui
        });
      } else {
        await axios.put(`${API_URL}/api/poligonosterreno/${poligono.id}`, payload);
      }
      const res = await axios.get(`${API_URL}/api/poligonosterreno/imovel/${idimovel}`);
      const dados: PoligonoTerreno[] = (Array.isArray(res.data) ? res.data : []).map((p: any) => ({
        id: p.id,
        coordinates: p.area?.coordinates?.[0] ?? [],
      }));
      if (dados.length > 0) {
        setPoligono(dados[0]);
        setCoords(dados[0].coordinates);
      }
    } catch (error) {
      console.error("Erro ao salvar polígono:", error);
      alert("Falha ao salvar o polígono.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoligono = async () => {
    if (!poligono) return;
    if (!usuario?.id) { // Verificação de segurança também na exclusão
      alert("Usuário não autenticado. Por favor, faça login para excluir.");
      return;
    }
    if (window.confirm("Tem certeza que deseja excluir este polígono?")) {
      setLoading(true);
      try {
        await axios.delete(`${API_URL}/api/poligonosterreno/${poligono.id}`);
        setPoligono(null);
        setCoords([]);
      } catch (error) {
        console.error("Erro ao excluir polígono:", error);
        alert("Falha ao excluir o polígono.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth disableEnforceFocus>
      <DialogTitle>Polígono do Terreno</DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography>Carregando...</Typography>
        ) : (
          <>
            {!poligono && coords.length === 0 && (
              <Typography>Nenhum polígono cadastrado para este imóvel.</Typography>
            )}
            <Box sx={{ my: 2, p: 2, border: "1px solid #eee", borderRadius: 2, background: "#f8fafd" }}>
              <Typography variant="subtitle1" gutterBottom>
                {poligono ? "Editar Polígono" : "Criar Polígono"}
              </Typography>
              {!usuario?.id && <Alert severity="warning" sx={{mb: 2}}>Você precisa estar logado para salvar ou excluir um polígono.</Alert>}
              <Box sx={{ width: "100%", height: 300, mb: 2,
                "& .leaflet-container": { zIndex: 1, },
                "& .leaflet-draw-toolbar, & .leaflet-draw-tooltip": {
                  zIndex: 1400, 
                },
              }}>
                <MapContainer
                  center={
                    coords[0] ? coords[0] :
                    (lat !== undefined && lng !== undefined ? [lat, lng] : [-15.793889, -47.882778])
                  }
                  zoom={18}
                  style={{ height: "100%", width: "100%" }}
                  ref={mapRef}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {lat !== undefined && lng !== undefined && (
                    <Marker position={[lat, lng]}>
                      <Popup>Localização do imóvel</Popup>
                    </Marker>
                  )}
                  <FeatureGroup ref={featureGroupRef}>
                    <EditControl
                      position="topright"
                      onCreated={handleMapCreated}
                      draw={{
                        polygon: { 
                          shapeOptions: { color: 'blue' } 
                        },
                        polyline: false, 
                        rectangle: false, 
                        circle: false, 
                        marker: false, 
                        circlemarker: false,
                      }}
                      edit={{ remove: true }}
                    />
                    {coords.length > 0 && (
                      <Polygon positions={coords} pathOptions={{ color: "red" }} />
                    )}
                  </FeatureGroup>
                </MapContainer>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ordem</TableCell>
                    <TableCell>Latitude</TableCell>
                    <TableCell>Longitude</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {coords.map(([lat, lng], idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <TextField type="number" value={lat} onChange={(e) => handleCoordChange(idx, "lat", e.target.value)} size="small" variant="standard" />
                      </TableCell>
                      <TableCell>
                        <TextField type="number" value={lng} onChange={(e) => handleCoordChange(idx, "lng", e.target.value)} size="small" variant="standard" />
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => handleMovePoint(idx, "up")} disabled={idx === 0} size="small" sx={{minWidth: 30}}><ArrowUpwardIcon fontSize="small" /></Button>
                        <Button onClick={() => handleMovePoint(idx, "down")} disabled={idx === coords.length - 1} size="small" sx={{minWidth: 30}}><ArrowDownwardIcon fontSize="small" /></Button>
                        <Button color="error" onClick={() => handleDeletePoint(idx)} size="small" sx={{minWidth: 30}}><DeleteIcon fontSize="small" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button onClick={handleAddPoint} variant="outlined" startIcon={<AddIcon />} disabled={!usuario?.id}>
                  Adicionar ponto
                </Button>
                <Button variant="contained" color="primary" onClick={handleSave} disabled={!usuario?.id}>
                  Salvar
                </Button>
                {poligono && (
                  <Button variant="outlined" color="error" onClick={handleDeletePoligono} disabled={!usuario?.id}>
                    Excluir Polígono
                  </Button>
                )}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}