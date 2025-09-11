// @ts-ignore - O mapshaper pode não ter tipos perfeitos, então ignoramos o erro de importação dele.
import { applyCommands } from 'mapshaper';

// --- DEFINIÇÕES DE TIPO GEOJSON CORRIGIDAS E MAIS ESPECÍFICAS ---

// Tipos de Geometria individuais
interface Polygon {
    type: 'Polygon';
    coordinates: [number, number][][]; // Array de anéis lineares
}

interface MultiPolygon {
    type: 'MultiPolygon';
    coordinates: [number, number][][][];
}

// Uma união de todos os tipos de geometria que nos interessam
type GeoJSONGeometry = Polygon | MultiPolygon;

// Feature e FeatureCollection agora usam os tipos de geometria mais específicos
interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry | null;
  properties: any;
}

interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}

// A união principal que representa qualquer objeto GeoJSON válido
type GeoJSONObject = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;


/**
 * Extrai coordenadas de várias estruturas GeoJSON.
 * @param {object} geojson O objeto GeoJSON.
 * @returns {Array} Um array de coordenadas [lng, lat].
 */
function extractCoordinates(geojson: GeoJSONObject | null): [number, number][] {
  if (!geojson) return [];
  
  // O switch/case agora funciona porque os tipos são literais (ex: 'Polygon') e não uma string genérica.
  switch (geojson.type) {
    case 'Polygon':
      // Se o tipo é 'Polygon', TypeScript sabe que geojson.coordinates existe.
      return geojson.coordinates[0] || []; // Retorna o anel exterior
    case 'MultiPolygon':
      // Se o tipo é 'MultiPolygon', TypeScript sabe que geojson.coordinates existe.
      return geojson.coordinates[0]?.[0] || []; // Retorna o anel exterior do primeiro polígono
    case 'Feature':
      // Se o tipo é 'Feature', TypeScript sabe que geojson.geometry existe.
      return extractCoordinates(geojson.geometry);
    case 'FeatureCollection':
      // Se o tipo é 'FeatureCollection', TypeScript sabe que geojson.features existe.
      for(const feature of geojson.features) {
          const coords = extractCoordinates(feature.geometry);
          if (coords.length > 0) return coords;
      }
      break;
  }
  return [];
}


/**
 * Simplifica uma geometria GeoJSON usando o Mapshaper e a converte para TopoJSON.
 * @param {string} geojsonString Os dados da geometria em formato de string.
 * @param {number} percentage A porcentagem de simplificação (ex: 1 para 1%).
 * @returns {Promise<{simplifiedTopoJSON: string, originalCount: number}>} Uma Promise que resolve com o TopoJSON e a contagem original de vértices.
 */
export async function simplifyAndConvertToTopoJSON(
  geojsonString: string, 
  percentage: number = 1
): Promise<{ simplifiedTopoJSON: string; originalCount: number }> {
  
  if (!geojsonString) {
    throw new Error("Dados de geometria não fornecidos.");
  }

  const geojsonData: GeoJSONObject = JSON.parse(geojsonString);
  const originalCoords = extractCoordinates(geojsonData);
  const originalCount = originalCoords.length;

  if (originalCount === 0) {
    throw new Error("Não foi possível extrair coordenadas válidas do arquivo. Verifique se é um GeoJSON com um Polígono ou MultiPolígono.");
  }

  const command = `-simplify ${percentage}% keep-shapes -o format=topojson`;

  try {
    const input = { 'input.json': geojsonString };
    const result = await applyCommands(command, input);
    const simplifiedTopoJSON = result['output.json'].toString('utf-8');
    
    return { simplifiedTopoJSON, originalCount };

  } catch (error) {
    console.error("Erro ao simplificar a geometria com Mapshaper:", error);
    throw new Error("Falha no processo de simplificação do Mapshaper.");
  }
}