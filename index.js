const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

/**
 * Obtiene las tareas de un equipo en ClickUp.
 * @param {string} teamId - ID del equipo en ClickUp.
 * @param {string} token - Token de autenticaci\xC3\xB3n para la API.
 * @returns {Promise<object>} Respuesta JSON de ClickUp con la lista de tareas.
 */
async function obtenerTareas(teamId, token) {
  const url = `${CLICKUP_API_BASE}/team/${teamId}/task`;
  const resp = await fetch(url, { headers: { Authorization: token } });
  return resp.json();
}

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('API de reportes ClickUp funcionando');
});

// Devuelve las tareas de un equipo especificado
app.get('/api_tareas', async (req, res) => {
  const { team_id: teamId } = req.query;
  const token = process.env.CLICKUP_TOKEN;

  if (!teamId || !token) {
    return res.status(400).json({
      error: 'Par\xC3\xA1metro team_id o token faltante'
    });
  }

  try {
    const data = await obtenerTareas(teamId, token);
    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: 'Error al consultar ClickUp',
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
