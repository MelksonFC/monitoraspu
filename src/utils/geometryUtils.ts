import * as topojsonServer from 'topojson-server';
import * as topojsonSimplify from 'topojson-simplify';
import { Topology, Objects } from 'topojson-specification';

// --- Interfaces GeoJSON ---
interface Polygon { type: 'Polygon'; coordinates: [number, number][][]; }
interface MultiPolygon { type: 'MultiPolygon'; coordinates: [number, number][][][]; }
type GeoJSONGeometry = Polygon | MultiPolygon;
interface GeoJSONFeature { type: 'Feature'; geometry: GeoJSONGeometry | null; properties: any; }
interface GeoJSONFeatureCollection { type: 'FeatureCollection'; features: GeoJSONFeature[]; }
type GeoJSONObject = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;

// Função para contar coordenadas (sem alterações)
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

/*
 * Valida se um objeto é uma geometria GeoJSON válida (Polygon ou MultiPolygon).
 * @param obj O objeto a ser validado.
 * @returns true se for uma geometria válida.
 */
function isValidGeometry(obj: any): obj is GeoJSONGeometry {
    return obj && (obj.type === 'Polygon' || obj.type === 'MultiPolygon') && Array.isArray(obj.coordinates);
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
    throw new Error("Não foi possível extrair coordenadas válidas do GeoJSON de entrada.");
  }

  let featureCollection: GeoJSONFeatureCollection;

  // --- LÓGICA DE CONSTRUÇÃO CORRIGIDA ---
  // Garante que estamos sempre trabalhando com uma FeatureCollection válida.
  if (geojsonData.type === 'FeatureCollection') {
    featureCollection = geojsonData;
  } else if (geojsonData.type === 'Feature' && isValidGeometry(geojsonData.geometry)) {
    featureCollection = { type: 'FeatureCollection', features: [geojsonData] };
  } else if (isValidGeometry(geojsonData)) {
    // Se a entrada for apenas uma geometria, encapsula em uma Feature e FeatureCollection.
    featureCollection = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: geojsonData, properties: {} }]
    };
  } else {
    // Se a entrada não for nenhum dos formatos esperados, lança um erro claro.
    throw new Error('O GeoJSON de entrada não é uma FeatureCollection, Feature com geometria válida, ou uma Geometria (Polygon/MultiPolygon) válida.');
  }

  try {
    // Converte a FeatureCollection garantidamente válida para TopoJSON.
    const topology = topojsonServer.topology({ collection: featureCollection });
    
    // A lógica de simplificação segura que implementamos antes continua aqui.
    if (topology.arcs.length > 0) {
        const presimplified = topojsonSimplify.presimplify(topology as Topology<Objects<{}>>);
        const minWeight = topojsonSimplify.quantile(presimplified, simplificationPercentage);

        if (Number.isFinite(minWeight)) {
            const simplifiedTopology = topojsonSimplify.simplify(presimplified, minWeight);
            return { simplifiedTopoJSON: JSON.stringify(simplifiedTopology), originalCount };
        }
    }
    
    console.warn("A simplificação não foi aplicada para evitar a criação de uma geometria vazia. O TopoJSON original foi retornado.");
    return { simplifiedTopoJSON: JSON.stringify(topology), originalCount };

  } catch (error) {
    console.error("Erro durante o processo de simplificação para TopoJSON:", error);
    throw new Error("Falha no processo de simplificação da geometria.");
  }
}