const express = require('express');
const { obtenerTareas } = require('../utils/clickup');
const { API_TAREAS_ENDPOINTS, DAY_MS } = require('../config');

const router = express.Router();

/**
 * Extrae el token de la consulta o de las variables de entorno.
 * @param {import('express').Request} req
 * @returns {string | undefined} Token encontrado.
 */
function obtenerToken(req) {
  return req.query.token || process.env.CLICKUP_TOKEN;
}

/**
 * Maneja la obtenci\xC3\xB3n de tareas desde ClickUp.
 * Requiere el par\xC3\xA1metro `team_id` y un token v\xC3\xA1lido en la configuraci\xC3\xB3n
 * o en la consulta.
 */
async function manejarApiTareas(req, res) {
  const { team_id: teamId, token: _unused, dias, ...rest } = req.query;
  const token = obtenerToken(req);

  if (!teamId || !token) {
    return res.status(400).json({
      error: 'Par\xC3\xA1metro team_id o token faltante'
    });
  }

  const params = { ...rest };
  if (dias) {
    const diasNum = Number(dias);
    if (!Number.isNaN(diasNum) && diasNum > 0) {
      params.date_updated_gt = Date.now() - diasNum * DAY_MS;
    }
  }

  try {
    const datos = await obtenerTareas(teamId, token, params);
    res.json(datos);
  } catch (err) {
    res.status(500).json({
      error: 'Error al consultar ClickUp',
      details: err.message
    });
  }
}

router.get(API_TAREAS_ENDPOINTS, manejarApiTareas);

module.exports = router;
