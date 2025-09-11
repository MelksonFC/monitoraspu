import * as topojsonServer from 'topojson-server';
import * as topojsonSimplify from 'topojson-simplify';
import { Topology, Objects } from 'topojson-specification'; // Importa 'Objects'

// --- Interfaces GeoJSON (sem alterações) ---
interface Polygon { type: 'Polygon'; coordinates: [number, number][][]; }
interface MultiPolygon { type: 'MultiPolygon'; coordinates: [number, number][][][]; }
type GeoJSONGeometry = Polygon | MultiPolygon;
interface GeoJSONFeature { type: 'Feature'; geometry: GeoJSONGeometry | null; properties: any; }
interface GeoJSONFeatureCollection { type: 'FeatureCollection'; features: GeoJSONFeature[]; }
type GeoJSONObject = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;

function extractCoordinates(geojson: GeoJSONObject | null): [number, number][] {
    if (!geojson) return [];
    switch (geojson.type) {
        case 'Polygon': return geojson.coordinates[0] || [];
        case 'MultiPolygon': return geojson.coordinates[0]?.[0] || [];
        case 'Feature': return extractCoordinates(geojson.geometry);
        case 'FeatureCollection':
            for(const feature of geojson.features) {
                const coords = extractCoordinates(feature.geometry);
                if (coords.length > 0) return coords;
            }
            break;
    }
    return [];
}

export async function simplifyAndConvertToTopoJSON(
  geojsonString: string,
  simplificationPercentage: number = 0.01
): Promise<{ simplifiedTopoJSON: string; originalCount: number }> {
    
  if (!geojsonString) {
    throw new Error("Dados de geometria não fornecidos.");
  }

  const geojsonData: GeoJSONObject = JSON.parse(geojsonString);
  const originalCount = extractCoordinates(geojsonData).length;

  if (originalCount === 0) {
    throw new Error("Não foi possível extrair coordenadas válidas do arquivo. Verifique se é um GeoJSON com um Polígono ou MultiPolígono.");
  }

  try {
    const topology = topojsonServer.topology({ collection: geojsonData });

    // CORREÇÃO: Adicionamos uma asserção de tipo para resolver o conflito de 'properties'
    const presimplified = topojsonSimplify.presimplify(topology as Topology<Objects<{}>>);
    
    const minWeight = topojsonSimplify.quantile(presimplified, simplificationPercentage);
    const simplifiedTopology = topojsonSimplify.simplify(presimplified, minWeight);
    const simplifiedTopoJSON = JSON.stringify(simplifiedTopology);

    return { simplifiedTopoJSON, originalCount };
  } catch (error) {
    console.error("Erro ao simplificar com TopoJSON:", error);
    throw new Error("Falha no processo de simplificação da geometria.");
  }
}