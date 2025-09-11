import { applyCommands } from 'mapshaper';

/**
 * Extrai coordenadas de várias estruturas GeoJSON.
 * @param {object} geojson O objeto GeoJSON.
 * @returns {Array} Um array de coordenadas [lng, lat].
 */
function extractCoordinates(geojson) {
  if (!geojson || !geojson.type) return [];
  
  switch (geojson.type) {
    case 'Polygon':
      return geojson.coordinates[0]; // Retorna o anel exterior
    case 'MultiPolygon':
      return geojson.coordinates[0][0]; // Retorna o anel exterior do primeiro polígono
    case 'Feature':
      if (geojson.geometry) {
        return extractCoordinates(geojson.geometry);
      }
      break;
    case 'FeatureCollection':
      if (geojson.features && geojson.features.length > 0) {
        // Pega a geometria do primeiro "feature" que tiver uma
        for(const feature of geojson.features) {
            if (feature.geometry) {
                const coords = extractCoordinates(feature.geometry);
                if (coords.length > 0) return coords;
            }
        }
      }
      break;
    default:
      return [];
  }
  return [];
}


/**
 * Simplifica uma geometria GeoJSON usando o Mapshaper e a converte para TopoJSON.
 * @param {string} geojsonString Os dados da geometria em formato de string.
 * @param {number} percentage A porcentagem de simplificação (ex: 1 para 1%).
 * @returns {Promise<{simplifiedTopoJSON: string, originalCount: number}>} Uma Promise que resolve com o TopoJSON e a contagem original de vértices.
 */
export async function simplifyAndConvertToTopoJSON(geojsonString, percentage = 1) {
  if (!geojsonString) {
    throw new Error("Dados de geometria não fornecidos.");
  }

  const geojsonData = JSON.parse(geojsonString);
  const originalCoords = extractCoordinates(geojsonData);
  const originalCount = originalCoords.length;

  if (originalCount === 0) {
    throw new Error("Não foi possível extrair coordenadas válidas do arquivo.");
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