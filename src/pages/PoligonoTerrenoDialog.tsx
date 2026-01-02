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
import { useAuth } from "@/AuthContext";
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

  const clearState = useCallback(() => {
    setCoords([]);
    setPoligono(null);
    setSimplifiedTopoJSON(null);
    setSimplificationInfo(null);
    setError(null);
    setLoading(false);
    setIsImporting(false);
  }, []);

  // --- CORREÇÃO PRINCIPAL ---
  // A dependência 'poligono' foi removida. A função agora é estável.
  const reprocessAndSetGeometry = useCallback(async (newCoords: [number, number][], infoMessage?: string) => {
    if (newCoords.length < 3) {
      setSimplifiedTopoJSON(null);
      setSimplificationInfo(infoMessage || null);
      return;
    }
    const closedCoords = [...newCoords, newCoords[0]];
    const geojsonFeature = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [closedCoords] } };
    
    try {
      const geojsonString = JSON.stringify(geojsonFeature);
      const { simplifiedTopoJSON: newSimplifiedData, originalCount } = await simplifyAndConvertToTopoJSON(geojsonString, 0.01);
      
      setSimplifiedTopoJSON(newSimplifiedData);
      
      if (infoMessage) {
        setSimplificationInfo(infoMessage.replace('{originalCount}', originalCount.toString()));
      }
    } catch (err) {
      setError("Falha ao processar a geometria.");
      setSimplifiedTopoJSON(null);
    }
  }, []); // A lista de dependências agora está vazia, tornando a função estável.

  useEffect(() => {
    if (!open || !idimovel) return;
    
    clearState();
    setImportSuccess(null);
    setLoading(true);

    axios.get(`${API_URL}/api/poligonosterreno/imovel/${idimovel}`)
      .then((res) => {
        const dados = (Array.isArray(res.data) ? res.data : []).map((p: any) => ({
          id: p.id,
          coordinates: p.area?.coordinates?.[0] ?? [],
        }));
        if (dados.length > 0 && dados[0].coordinates.length > 0) {
          const loadedCoords = dados[0].coordinates;
          const last = loadedCoords[loadedCoords.length - 1];
          const first = loadedCoords[0];
          if (last[0] === first[0] && last[1] === first[1]) {
            loadedCoords.pop();
          }
          setPoligono(dados[0]);
          setCoords(loadedCoords);
          reprocessAndSetGeometry(loadedCoords, "Geometria carregada. Modifique para atualizar."); // Mensagem inicial
        }
      })
      .catch(() => setError("Falha ao carregar o polígono do imóvel."))
      .finally(() => setLoading(false));
  // A dependência `reprocessAndSetGeometry` agora é estável, quebrando o loop.
  }, [open, idimovel, reprocessAndSetGeometry, clearState]);
  
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
    if (coords.length < 3) return;

    const leafletCoords: [number, number][] = coords.map(c => [c[1], c[0]]);
    const polygonLayer = L.polygon(leafletCoords, { color: 'blue' });
    fg.addLayer(polygonLayer);
    
    // Apenas ajusta o zoom se houver coordenadas
    if (leafletCoords.length > 0) {
      map.fitBounds(polygonLayer.getBounds(), { padding: [50, 50] });
    }
  }, [coords]);

  const handleSave = () => {
    if (!usuario) return setError("Usuário não autenticado.");
    if (!simplifiedTopoJSON) return setError("Não há dados de geometria para salvar.");

    setLoading(true);
    setError(null);

    const data = { idimovel, geometria: simplifiedTopoJSON, formato: 'TopoJSON', usercreated: usuario.id, usermodified: usuario.id };

    const request = poligono
      ? axios.put(`${API_URL}/api/poligonosterreno/${poligono.id}`, data)
      : axios.post(`${API_URL}/api/poligonosterreno`, data);

    request
      .then(() => {
        setImportSuccess("Polígono salvo com sucesso!");
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setTimeout(onClose, 1500);
      })
      .catch((err) => setError(err.response?.data?.error || "Falha ao salvar o polígono."))
      .finally(() => setLoading(false));
  };

  const handleDeletePolygon = () => {
    if (!poligono) return;
    if (!window.confirm("Tem certeza que deseja excluir todo o polígono deste imóvel? Esta ação não pode ser desfeita.")) return;

    setLoading(true);
    setError(null);

    axios.delete(`${API_URL}/api/poligonosterreno/${poligono.id}`)
      .then(() => {
        setImportSuccess("Polígono excluído com sucesso!");
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        clearState();
      })
      .catch(() => setError("Falha ao excluir o polígono."))
      .finally(() => setLoading(false));
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
        const geojsonData = JSON.parse(text);
        const originalCoords = (geojsonData.features?.[0]?.geometry?.coordinates?.[0] || geojsonData.coordinates?.[0] || []) as [number, number][];
        if (originalCoords.length === 0) throw new Error("Não foi possível encontrar coordenadas no arquivo.");
        
        const last = originalCoords[originalCoords.length - 1];
        const first = originalCoords[0];
        if (last && first && last[0] === first[0] && last[1] === first[1]) {
            originalCoords.pop();
        }
        setCoords(originalCoords);
        reprocessAndSetGeometry(originalCoords, `Geometria importada e otimizada. Valide e salve.`);
      } catch (err: any) {
        setError(err.message);
        setCoords([]);
      } finally {
        setIsImporting(false);
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  const handleCoordAction = useCallback((newCoords: [number, number][]) => {
    setCoords(newCoords);
    setSimplificationInfo("Geometria modificada. Pronto para salvar/atualizar.");
    reprocessAndSetGeometry(newCoords);
  }, [reprocessAndSetGeometry]);

  const handleRemoveCoord = (indexToRemove: number) => {
    handleCoordAction(coords.filter((_, index) => index !== indexToRemove));
  };

  const handleInvertCoords = () => {
    if (coords.length === 0) return;
    handleCoordAction(coords.map(([lng, lat]) => [lat, lng]));
  };

  const handleCoordChange = (index: number, value: string, latOrLng: 'lat' | 'lng') => {
    const newCoords = [...coords];
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      newCoords[index] = latOrLng === 'lat' ? [newCoords[index][0], numValue] : [numValue, newCoords[index][1]];
      handleCoordAction(newCoords);
    }
  };

  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const coord = coords[index];
    return (
      <TableRow style={style} key={index} component="div">
        <TableCell component="div" sx={{ borderBottom: 'none', paddingY: 0.5 }}>
            <TextField type="number" defaultValue={coord[0]} onBlur={(e) => handleCoordChange(index, e.target.value, 'lng')} fullWidth variant="standard" />
        </TableCell>
        <TableCell component="div" sx={{ borderBottom: 'none', paddingY: 0.5 }}>
            <TextField type="number" defaultValue={coord[1]} onBlur={(e) => handleCoordChange(index, e.target.value, 'lat')} fullWidth variant="standard" />
        </TableCell>
        <TableCell component="div" sx={{ borderBottom: 'none', paddingY: 0.5, width: '60px', textAlign: 'right' }}>
            <IconButton size="small" onClick={() => handleRemoveCoord(index)}>
                <DeleteIcon fontSize="small" />
            </IconButton>
        </TableCell>
      </TableRow>
    );
  }, [coords, handleCoordChange, handleRemoveCoord]);

  const center: [number, number] = (lat && lng) ? [lat, lng] : [-15.77972, -47.92972];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Polígono do Terreno</DialogTitle>
      <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
        <Collapse in={!!error}><Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert></Collapse>
        <Collapse in={!!importSuccess}><Alert severity="success" sx={{ mb: 2 }} onClose={() => setImportSuccess(null)}>{importSuccess}</Alert></Collapse>
        <Collapse in={!!simplificationInfo}><Alert severity="info" sx={{ mb: 2 }}>{simplificationInfo}</Alert></Collapse>
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
              {isImporting ? <Box sx={{ width: '100%' }}><LinearProgress /></Box> : (
                <>
                  <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>Importar GeoJSON</Button>
                  <Tooltip title="Inverter Longitude/Latitude"><IconButton onClick={handleInvertCoords} disabled={coords.length === 0}><SwapHorizIcon /></IconButton></Tooltip>
                </>
              )}
            </Box>
            <Box sx={{ flexGrow: 1, border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                <Table component="div" size="small">
                    <TableHead component="div"><TableRow component="div"><TableCell component="div">Longitude</TableCell><TableCell component="div">Latitude</TableCell><TableCell component="div" sx={{ width: '60px' }}>Ações</TableCell></TableRow></TableHead>
                </Table>
                <List height={350} itemCount={coords.length} itemSize={40} width="100%">{Row}</List>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
        {poligono && (<Button onClick={handleDeletePolygon} color="error" disabled={loading || isImporting}>Excluir Polígono</Button>)}
        <Box>
            <Button onClick={onClose} color="secondary" disabled={loading || isImporting}>Cancelar</Button>
            <Button onClick={handleSave} variant="contained" disabled={loading || isImporting || !simplifiedTopoJSON}>{loading ? "Salvando..." : (poligono ? "Atualizar" : "Salvar")}</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
