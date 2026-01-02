import { useState, useMemo } from 'react'; // <-- CORREÇÃO 1: 'React' removido da importação.
import { Dialog, DialogContent, DialogTitle, DialogActions, Button, Box } from '@mui/material';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet'; // <-- CORREÇÃO 2: Importação de valor separada.
import type { LatLngExpression } from 'leaflet'; // <-- CORREÇÃO 2: Importação de tipo separada.

// Importa o CSS obrigatório do Leaflet
import 'leaflet/dist/leaflet.css';

// Corrige o problema do ícone padrão do marcador
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

interface MapaLeafletProps {
  open: boolean;
  onClose: () => void;
  latInicial: number;
  lngInicial: number;
  onLocationChange: (lat: number, lng: number) => void;
}

// Componente interno para capturar eventos de clique no mapa
function MapEvents({ onMarkerMove }: { onMarkerMove: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMarkerMove(e.latlng);
    },
  });
  return null;
}

export default function MapaLeaflet({
  open,
  onClose,
  latInicial,
  lngInicial,
  onLocationChange,
}: MapaLeafletProps) {
  const initialPosition: LatLngExpression = [latInicial, lngInicial];
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression>(initialPosition);

  const eventHandlers = useMemo(
    () => ({
      dragend(e: L.DragEndEvent) {
        setMarkerPosition(e.target.getLatLng());
      },
    }),
    [],
  );

  const handleConfirm = () => {
    const pos = markerPosition as L.LatLng;
    onLocationChange(pos.lat, pos.lng);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Ajuste a Localização no Mapa</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, height: '60vh', width: '100%' }}>
          <MapContainer
            center={initialPosition}
            zoom={15}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker
              draggable={true}
              eventHandlers={eventHandlers}
              position={markerPosition}
            />
            <MapEvents onMarkerMove={(latlng) => setMarkerPosition(latlng)} />
          </MapContainer>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained">
          Confirmar Localização
        </Button>
      </DialogActions>
    </Dialog>
  );
}
