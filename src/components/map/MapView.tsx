import { MapContainer, TileLayer, Marker, Tooltip, useMap, ZoomControl, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import type { PathOptions, LatLngExpression } from 'leaflet';
import { useEffect, useRef } from 'react';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import type { ImovelComCoordenadas } from '../../pages/MapPage';

// Estilos necessários
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// 1. Criamos os ícones usando SVG para fácil customização de cor e tamanho.
// Ícone padrão (azul)
const defaultIconSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1976D2" width="28px" height="28px">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`;

// Ícone selecionado (vermelho, maior e com sombra)
const selectedIconSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#D32F2F" width="42px" height="42px" style="filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4));">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`;

// 2. Função para criar ícones do Leaflet a partir do nosso SVG.
const createLeafletIcon = (svg: string, size: [number, number]) => {
  return L.divIcon({
    html: svg,
    className: '', // Remove a classe padrão para não ter bordas/fundo
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]], // Aponta a "ponta" do ícone para a coordenada
  });
};

// 3. Criamos as instâncias dos nossos dois ícones.
const defaultIcon = createLeafletIcon(defaultIconSVG, [28, 28]);
const selectedIcon = createLeafletIcon(selectedIconSVG, [42, 42]);

// Estilo para o polígono selecionado
const selectedPolygonStyle: PathOptions = {
  color: '#D32F2F',      // Cor da borda (vermelho)
  weight: 3,            // Espessura da borda
  opacity: 0.8,         // Opacidade da borda
  fillColor: '#D32F2F',  // Cor do preenchimento
  fillOpacity: 0.3,     // Opacidade do preenchimento
};

// O seu MapController continua exatamente o mesmo, ele já ajuda na experiência!
function MapController({ imoveis, selectedImovel, selectedPolygon }: { imoveis: ImovelComCoordenadas[], selectedImovel: ImovelComCoordenadas | null, selectedPolygon: any | null }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (imoveis.length === 0) return;
    const bounds = new L.LatLngBounds(
      imoveis.map(imovel => [parseFloat(imovel.latitude!), parseFloat(imovel.longitude!)])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, imoveis]);

  // Efeito para focar no imóvel ou no polígono selecionado
  useEffect(() => {
    if (selectedPolygon && selectedPolygon.geometry) {
      const geoJsonLayer = L.geoJSON(selectedPolygon);
      map.flyToBounds(geoJsonLayer.getBounds(), { padding: [50, 50] });
    } else if (selectedImovel?.latitude && selectedImovel?.longitude) {
      map.flyTo([parseFloat(selectedImovel.latitude), parseFloat(selectedImovel.longitude)], 16);
    }
  }, [map, selectedImovel, selectedPolygon]);

  return null;
}

interface MapViewProps {
  imoveis: ImovelComCoordenadas[];
  selectedImovel: ImovelComCoordenadas | null;
  onMarkerClick: (imovel: ImovelComCoordenadas) => void;
  selectedPolygon: any | null;
}

export default function MapView({ imoveis, selectedImovel, onMarkerClick, selectedPolygon }: MapViewProps) {
  const position: LatLngExpression = [-15.77972, -47.92972];
  const geoJsonRef = useRef<L.GeoJSON>(null);

  useEffect(() => {
    geoJsonRef.current?.bringToFront();
  }, [selectedPolygon]);

  return (
    <MapContainer center={position} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ZoomControl position="bottomright" />

      {/* 4. Renderiza o polígono se ele existir */}
      {selectedPolygon && (
        <GeoJSON
          key={selectedImovel?.idimovel} // Chave para forçar a recriação ao mudar de imóvel
          data={selectedPolygon}
          style={selectedPolygonStyle}
          ref={geoJsonRef}
        />
      )}

      <MarkerClusterGroup>
        {imoveis.map(imovel => (
          imovel.latitude && imovel.longitude && (
            <Marker
              key={imovel.idimovel}
              position={[parseFloat(imovel.latitude), parseFloat(imovel.longitude)]}
              // --- INÍCIO DA MELHORIA ---
              // 4. Aplica o ícone correto com base na seleção.
              icon={selectedImovel?.idimovel === imovel.idimovel ? selectedIcon : defaultIcon}
              // 5. Aumenta o zIndex para o marcador selecionado ficar na frente dos outros.
              zIndexOffset={selectedImovel?.idimovel === imovel.idimovel ? 1000 : 0}
              // --- FIM DA MELHORIA ---
              eventHandlers={{
                click: () => {
                  onMarkerClick(imovel);
                },
              }}
            >
              <Tooltip>
                <b>{imovel.nome}</b><br />
                Matrícula: {imovel.matricula}<br />
                Endereço: {imovel.endereco}, {imovel.numero}<br />
                RIP Imóvel: {imovel.ripimovel || 'N/A'}<br />
                RIP Utilização: {imovel.riputilizacao || 'N/A'}
              </Tooltip>
            </Marker>
          )
        ))}
      </MarkerClusterGroup>

      <MapController imoveis={imoveis} selectedImovel={selectedImovel} selectedPolygon={selectedPolygon} />
    </MapContainer>
  );
}