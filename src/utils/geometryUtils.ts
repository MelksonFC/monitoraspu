import * as topojsonServer from 'topojson-server';
import * as topojsonSimplify from 'topojson-simplify';
import { Topology, Objects} from 'topojson-specification';

// --- Interfaces GeoJSON (sem alterações) ---
interface Polygon { type: 'Polygon'; coordinates: [number, number][][]; }
interface MultiPolygon { type: 'MultiPolygon'; coordinates: [number, number][][][]; }
type GeoJSONGeometry = Polygon | MultiPolygon;
interface GeoJSONFeature { type: 'Feature'; geometry: GeoJSONGeometry | null; properties: any; }
interface GeoJSONFeatureCollection { type: 'FeatureCollection'; features: GeoJSONFeature[]; }
type GeoJSONObject = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;

function countCoordinates(geojson: GeoJSONObject | null): number {
  if (!geojson) return 0;
  switch (geojson.type) {
    case 'Polygon':
      return geojson.coordinates.reduce((sum, ring) => sum + ring.length, 0);
    case 'MultiPolygon':
      return geojson.coordinates.reduce((sum, polygon) =>
        sum + polygon.reduce((polySum, ring) => polySum + ring.length, 0), 0);
    case 'Feature':
      return countCoordinates(geojson.geometry);
    case 'FeatureCollection':
      return geojson.features.reduce((sum, feature) => sum + countCoordinates(feature), 0);
    default:
      return 0;
  }
}

export async function simplifyAndConvertToTopoJSON(
  geojsonString: string,
  simplificationPercentage: number = 0.01
): Promise<{ simplifiedTopoJSON: string; originalCount: number }> {
  
  if (!geojsonString) {
    throw new Error("Dados de geometria (GeoJSON string) não fornecidos.");
  }

  const geojsonData: GeoJSONObject = JSON.parse(geojsonString);
  const originalCount = countCoordinates(geojsonData);

  if (originalCount === 0) {
    throw new Error("Não foi possível extrair coordenadas válidas do GeoJSON.");
  }

  const geoJsonFeatureCollection: GeoJSONFeatureCollection = geojsonData.type === 'FeatureCollection'
    ? geojsonData
    : { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: geojsonData as GeoJSONGeometry, properties: {} }] };

  try {
    const topology = topojsonServer.topology({ collection: geoJsonFeatureCollection as any });
    
    // --- LÓGICA DE SIMPLIFICAÇÃO CORRIGIDA ---
    // Apenas simplifica se houver arcos para simplificar.
    if (topology.arcs.length > 0) {
        const presimplified = topojsonSimplify.presimplify(topology as Topology<Objects<{}>>);
        const minWeight = topojsonSimplify.quantile(presimplified, simplificationPercentage);

        // Verificação de segurança: Se minWeight for Infinity, significa que a simplificação
        // removeria tudo. Nesse caso, não simplificamos.
        if (Number.isFinite(minWeight)) {
            const simplifiedTopology = topojsonSimplify.simplify(presimplified, minWeight);
            const simplifiedTopoJSON = JSON.stringify(simplifiedTopology);
            return { simplifiedTopoJSON, originalCount };
        }
    }
    
    // Se a simplificação não for possível ou não for segura, retorna o TopoJSON original (não simplificado).
    console.warn("A simplificação não foi aplicada para evitar a criação de uma geometria vazia. O TopoJSON original foi retornado.");
    const originalTopoJSON = JSON.stringify(topology);
    return { simplifiedTopoJSON: originalTopoJSON, originalCount };

  } catch (error) {
    console.error("Erro durante o processo de simplificação para TopoJSON:", error);
    throw new Error("Falha no processo de simplificação da geometria.");
  }
}