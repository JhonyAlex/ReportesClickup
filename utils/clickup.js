const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const { CLICKUP_API_BASE, CACHE_DIR } = require('../config');

/**
 * Realiza una solicitud a la API de ClickUp.
 * @param {string} endpoint - Endpoint a consultar.
 * @param {string} token - Token de autenticación para la API.
 * Devuelve el JSON recibido.
 * Lanza un error con la propiedad `status` cuando la respuesta no es exitosa.
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
      const error = new Error(`Error ${resp.status}`);
      error.status = resp.status;
      throw error;
    }
    return await resp.json();
  } catch (err) {
    // Propaga el mismo error para manejo posterior en las rutas
    throw err;
  }
}

/**
 * Lee la caché local de tareas.
 * @param {string} spaceId - Identificador del espacio.
 * @returns {Promise<object|null>} Datos del archivo o null si no existe.
 */
async function leerCache(spaceId) {
  try {
    const file = path.join(CACHE_DIR, `tareas_${spaceId}.json`);
    const contenido = await fs.readFile(file, 'utf8');
    return JSON.parse(contenido);
  } catch (err) {
    return null;
  }
}

/**
 * Guarda datos de tareas en la caché local.
 * @param {string} spaceId - Identificador del espacio.
 * @param {object} datos - Datos de tareas a almacenar.
 */
async function guardarCache(spaceId, datos) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, `tareas_${spaceId}.json`);
    await fs.writeFile(file, JSON.stringify(datos, null, 2));
  } catch (err) {
    // Silencia errores de escritura para no afectar la respuesta principal
    console.error('Error guardando caché:', err.message);
  }
}

/**
 * Obtiene las tareas de un espacio en ClickUp.
 * @param {string} spaceId - ID del espacio.
 * @param {string} token - Token de autenticación.
 * @returns {Promise<object>} Tareas obtenidas.
 */
async function obtenerTareas(spaceId, token, params = {}) {
  try {
    const datos = await callClickUp(`/space/${spaceId}/task`, token, params);
    await guardarCache(spaceId, datos);
    return datos;
  } catch (err) {
    const cache = await leerCache(spaceId);
    if (cache) {
      return cache;
    }
    throw err;
  }
}

module.exports = {
  obtenerTareas,
};
