const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const {
  CLICKUP_API_BASE,
  CACHE_DIR,
  DEFAULT_PAGE_SIZE,
  TASK_FIELDS,
  DESCRIPTION_MAX_LENGTH,
} = require('../config');

/**
 * Realiza una solicitud a la API de ClickUp.
 * @param {string} endpoint - Endpoint a consultar.
 * @param {string} token - Token de autenticación para la API.
 * @returns {Promise<object>} Respuesta JSON de la API.
 */
async function callClickUp(endpoint, token, params = {}) {
  const url = new URL(`${CLICKUP_API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  try {
    const resp = await fetch(url.toString(), {
      headers: { Authorization: token },
    });
    if (!resp.ok) {
      throw new Error(`Error ${resp.status}`);
    }
    return await resp.json();
  } catch (err) {
    throw new Error(`Fallo al conectar con ClickUp: ${err.message}`);
  }
}

/**
 * Lee la caché local de tareas.
 * @param {string} teamId - Identificador del equipo.
 * @returns {Promise<object|null>} Datos del archivo o null si no existe.
 */
async function leerCache(teamId) {
  try {
    const file = path.join(CACHE_DIR, `tareas_${teamId}.json`);
    const contenido = await fs.readFile(file, 'utf8');
    return JSON.parse(contenido);
  } catch (err) {
    return null;
  }
}

/**
 * Guarda datos de tareas en la caché local.
 * @param {string} teamId - Identificador del equipo.
 * @param {object} datos - Datos de tareas a almacenar.
 */
async function guardarCache(teamId, datos) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, `tareas_${teamId}.json`);
    await fs.writeFile(file, JSON.stringify(datos, null, 2));
  } catch (err) {
    // Silencia errores de escritura para no afectar la respuesta principal
    console.error('Error guardando caché:', err.message);
  }
}

/**
 * Devuelve solo los campos necesarios de una tarea.
 * @param {object} tarea - Objeto de tarea completo recibido de ClickUp.
 * @returns {object} Tarea con campos reducidos.
 */
function filtrarCampos(tarea) {
  const resultado = {};
  TASK_FIELDS.forEach((campo) => {
    if (campo in tarea) {
      let valor = tarea[campo];
      if (
        (campo === 'description' || campo === 'text_content') &&
        typeof valor === 'string' &&
        valor.length > DESCRIPTION_MAX_LENGTH
      ) {
        valor = `${valor.slice(0, DESCRIPTION_MAX_LENGTH)}...`;
      }
      resultado[campo] = valor;
    }
  });
  return resultado;
}

/**
 * Obtiene las tareas de un equipo en ClickUp.
 * @param {string} teamId - ID del equipo.
 * @param {string} token - Token de autenticación.
 * @returns {Promise<object>} Tareas obtenidas.
 */
async function obtenerTareas(teamId, token, params = {}) {
  const consulta = { page_size: DEFAULT_PAGE_SIZE, ...params };
  try {
    const datos = await callClickUp(`/team/${teamId}/task`, token, consulta);
    const tareasReducidas = (datos.tasks || []).map(filtrarCampos);
    const respuesta = { ...datos, tasks: tareasReducidas };
    await guardarCache(teamId, respuesta);
    return respuesta;
  } catch (err) {
    const cache = await leerCache(teamId);
    if (cache) {
      return cache;
    }
    throw err;
  }
}

module.exports = {
  obtenerTareas,
};
