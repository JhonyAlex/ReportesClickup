const fetch = require('node-fetch');

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

/**
 * Realiza una solicitud a la API de ClickUp.
 * @param {string} endpoint - Endpoint a consultar.
 * @param {string} token - Token de autenticación para la API.
 * @returns {Promise<object>} Respuesta JSON de la API.
 */
async function callClickUp(endpoint, token) {
  const url = `${CLICKUP_API_BASE}${endpoint}`;
  const resp = await fetch(url, { headers: { Authorization: token } });
  if (!resp.ok) {
    throw new Error(`Error ${resp.status}`);
  }
  return resp.json();
}

/**
 * Obtiene las tareas de un equipo en ClickUp.
 * @param {string} teamId - ID del equipo.
 * @param {string} token - Token de autenticación.
 * @returns {Promise<object>} Tareas obtenidas.
 */
function obtenerTareas(teamId, token) {
  return callClickUp(`/team/${teamId}/task`, token);
}

module.exports = {
  obtenerTareas,
};
