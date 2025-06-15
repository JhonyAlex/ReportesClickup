const fetch = require('node-fetch');
const { CLICKUP_API_BASE } = require('../config');

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
 * Obtiene las tareas de un equipo en ClickUp.
 * @param {string} teamId - ID del equipo.
 * @param {string} token - Token de autenticación.
 * @returns {Promise<object>} Tareas obtenidas.
 */
function obtenerTareas(teamId, token, params = {}) {
  return callClickUp(`/team/${teamId}/task`, token, params);
}

module.exports = {
  obtenerTareas,
};
