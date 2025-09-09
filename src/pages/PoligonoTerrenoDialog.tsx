import React, { useEffect, useState, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, TextField, Table, TableHead, TableRow, TableCell, TableBody
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import axios from "axios";
import { MapContainer, TileLayer, Polygon, Marker, FeatureGroup, Popup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

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
  const [poligono, setPoligono] = useState<PoligonoTerreno | null>(null);
  const [coords, setCoords] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);

  // Referência para o FeatureGroup (necessário para EditControl)
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  // Carrega polígono ao abrir
  useEffect(() => {
    if (!open) return;
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
        if (dados.length > 0) {
          setPoligono(dados[0]);
          setCoords(dados[0].coordinates);
        } else {
          setPoligono(null);
          setCoords([]);
        }
      })
      .finally(() => setLoading(false));
  }, [open, idimovel]);

  // Mapa: ao desenhar polígono, atualiza coords
  const handleMapCreated = (e: any) => {
    if (e.layer instanceof window.L.Polygon) {
      const pts = e.layer.getLatLngs()[0].map((latlng: any) => [
        Number(latlng.lat),
        Number(latlng.lng),
      ]);
      setCoords(pts);
    }
  };

  // Edita ponto manualmente
  const handleCoordChange = (idx: number, field: "lat" | "lng", value: string) => {
    const updated = coords.map((c, i) =>
      i === idx
        ? [field === "lat" ? Number(value) : c[0], field === "lng" ? Number(value) : c[1]]
        : c
    );
    setCoords(updated as [number, number][]);
  };

  // Exclui ponto
  const handleDeletePoint = (idx: number) => {
    setCoords(coords.filter((_, i) => i !== idx));
  };

  // Adiciona ponto manual
  const handleAddPoint = () => {
    setCoords([...coords, [0, 0]]);
  };

  // Mover ponto para cima/baixo
  const handleMovePoint = (idx: number, dir: "up" | "down") => {
    const updated = [...coords];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= coords.length) return;
    [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
    setCoords(updated);
  };

  // Salvar polígono novo ou editado
  const handleSave = async () => {
    if (coords.length < 3) {
      alert("Um polígono precisa de pelo menos 3 pontos.");
      return;
    }
    setLoading(true);
    if (!poligono) {
      await axios.post(`${API_URL}/api/poligonosterreno`, {
        idimovel,
        coordinates: coords,
        usercreated: 1,
        usermodified: 1,
      });
    } else {
      await axios.put(`${API_URL}/api/poligonosterreno/${poligono.id}`, {
        coordinates: coords,
        usermodified: 1,
      });
    }
    // Recarrega polígono
    const res = await axios.get(`${API_URL}/api/poligonosterreno/imovel/${idimovel}`);
    const dados: PoligonoTerreno[] = (Array.isArray(res.data) ? res.data : []).map((p: any) => ({
      id: p.id,
      coordinates: p.area?.coordinates?.[0] ?? [],
    }));
    if (dados.length > 0) {
      setPoligono(dados[0]);
      setCoords(dados[0].coordinates);
    } else {
      setPoligono(null);
      setCoords([]);
    }
    setLoading(false);
  };

  // Excluir polígono
  const handleDeletePoligono = async () => {
    if (!poligono) return;
    setLoading(true);
    await axios.delete(`${API_URL}/api/poligonosterreno/${poligono.id}`);
    setPoligono(null);
    setCoords([]);
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
              <Box sx={{ width: "100%", height: 300, mb: 2 }}>
                <MapContainer
                  center={
                    coords[0] ? coords[0] :
                    (lat !== undefined && lng !== undefined ? [lat, lng] : [-15.793889, -47.882778])
                  }
                  zoom={18}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {/* Marker do imóvel */}
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
                        polygon: true,
                        polyline: false,
                        rectangle: false,
                        circle: false,
                        marker: false,
                        circlemarker: false,
                      }}
                      edit={{ edit: false, remove: false }}
                      //featureGroup={featureGroupRef.current}
                    />
                    {coords.length > 0 && (
                      <>
                        <Polygon positions={coords.map((c) => [c[0], c[1]])} pathOptions={{ color: "red" }} />
                        {coords.map((c, i) => (
                          <Marker key={i} position={[c[0], c[1]]} />
                        ))}
                      </>
                    )}
                  </FeatureGroup>
                </MapContainer>
              </Box>
              {/* Lista editável dos pontos */}
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
                        <TextField
                          type="number"
                          value={lat}
                          onChange={(e) => handleCoordChange(idx, "lat", e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={lng}
                          onChange={(e) => handleCoordChange(idx, "lng", e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => handleMovePoint(idx, "up")} disabled={idx === 0} size="small">
                          <ArrowUpwardIcon fontSize="small" />
                        </Button>
                        <Button
                          onClick={() => handleMovePoint(idx, "down")}
                          disabled={idx === coords.length - 1}
                          size="small"
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </Button>
                        <Button color="error" onClick={() => handleDeletePoint(idx)} size="small">
                          <DeleteIcon fontSize="small" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button onClick={handleAddPoint} variant="outlined" startIcon={<AddIcon />}>
                  Adicionar ponto
                </Button>
                <Button variant="contained" color="primary" onClick={handleSave}>
                  Salvar
                </Button>
                {poligono && (
                  <Button variant="outlined" color="error" onClick={handleDeletePoligono}>
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