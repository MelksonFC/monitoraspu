import * as topojsonServer from 'topojson-server';
import * as topojsonSimplify from 'topojson-simplify';
import { Topology, Objects } from 'topojson-specification';

// --- Interfaces GeoJSON ---
// Estas interfaces definem a estrutura dos objetos GeoJSON que esperamos receber.
interface Polygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

interface MultiPolygon {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

type GeoJSONGeometry = Polygon | MultiPolygon;

interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry | null;
  properties: any;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Um objeto GeoJSON pode ser uma geometria, uma feature ou uma coleção de features.
type GeoJSONObject = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;

/**
 * Conta o número total de vértices (pontos de coordenadas) em um objeto GeoJSON.
 * Esta função navega recursivamente pela estrutura do GeoJSON.
 * @param geojson O objeto GeoJSON para analisar.
 * @returns O número total de vértices.
 */
function countCoordinates(geojson: GeoJSONObject | null): number {
  if (!geojson) return 0;

  switch (geojson.type) {
    case 'Polygon':
      // Soma o número de pontos em cada anel do polígono.
      return geojson.coordinates.reduce((sum, ring) => sum + ring.length, 0);

    case 'MultiPolygon':
      // Soma o número de pontos para cada polígono dentro do multipolígono.
      return geojson.coordinates.reduce((sum, polygon) =>
        sum + polygon.reduce((polySum, ring) => polySum + ring.length, 0), 0);

    case 'Feature':
      // Se for uma Feature, contamos as coordenadas de sua geometria.
      return countCoordinates(geojson.geometry);

    case 'FeatureCollection':
      // Se for uma coleção, somamos as contagens de cada feature.
      return geojson.features.reduce((sum, feature) => sum + countCoordinates(feature), 0);

    default:
      return 0;
  }
}

/**
 * Simplifica uma geometria GeoJSON e a converte para o formato TopoJSON.
 * @param geojsonString A string contendo os dados GeoJSON.
 * @param simplificationPercentage Um valor de 0 a 1 que define a intensidade da simplificação.
 *                                 Valores menores (ex: 0.01) simplificam mais.
 *                                 Valores maiores (ex: 0.8) preservam mais detalhes.
 * @returns Um objeto com o TopoJSON simplificado em formato de string e a contagem original de vértices.
 */
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
    throw new Error("Não foi possível extrair coordenadas válidas do GeoJSON. Verifique se o arquivo contém um Polígono ou MultiPolígono.");
  }

  // O TopoJSON funciona melhor com uma FeatureCollection, então garantimos que a entrada seja tratada como uma.
  // A chave 'collection' será o nome do objeto na topologia.
  const geoJsonFeatureCollection: GeoJSONFeatureCollection = geojsonData.type === 'FeatureCollection'
    ? geojsonData
    : { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: geojsonData as GeoJSONGeometry, properties: {} }] };

  try {
    // 1. Converte o GeoJSON para a estrutura de topologia básica.
    const topology = topojsonServer.topology({ collection: geoJsonFeatureCollection as any });

    // 2. Pré-simplifica a topologia. Este passo calcula a "importância" de cada ponto (vértice).
    // Usamos uma asserção de tipo para garantir a compatibilidade com a biblioteca de simplificação.
    const presimplified = topojsonSimplify.presimplify(topology as Topology<Objects<{}>>);
    
    // 3. Calcula o limiar de simplificação. Pontos com "importância" menor que este valor serão removidos.
    // O 'quantile' determina o valor de corte com base no percentual fornecido.
    const minWeight = topojsonSimplify.quantile(presimplified, simplificationPercentage);

    // 4. Aplica a simplificação final usando o limiar calculado.
    const simplifiedTopology = topojsonSimplify.simplify(presimplified, minWeight);
    
    const simplifiedTopoJSON = JSON.stringify(simplifiedTopology);

    return { simplifiedTopoJSON, originalCount };
  } catch (error) {
    console.error("Erro durante o processo de simplificação para TopoJSON:", error);
    throw new Error("Falha no processo de simplificação da geometria.");
  }
}