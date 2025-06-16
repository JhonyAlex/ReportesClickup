const express = require('express');
const { obtenerTareas } = require('../utils/clickup');
const {
  API_TAREAS_ENDPOINTS,
  ACTUALIZAR_CACHE_ENDPOINTS,
  DAY_MS,
} = require('../config');

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
 * Construye los parámetros necesarios para las llamadas a ClickUp.
 * @param {import('express').Request} req
 * @returns {{teamId: string, token: string, params: Record<string, any>}|null}
 */
function obtenerParametros(req) {
  const {
    team_id: teamId,
    token: _unused,
    dias,
    prefix,
    fecha,
    timezone,
    ...rest
  } = req.query;
  const token = obtenerToken(req);
  if (!teamId || !token) {
    return null;
  }
  const params = { ...rest };
  if (dias) {
    const diasNum = Number(dias);
    if (!Number.isNaN(diasNum) && diasNum > 0) {
      params.date_updated_gt = Date.now() - diasNum * DAY_MS;
    }
  }
  const filtro = { prefix, fecha, timezone };
  return { teamId, token, params, filtro };
}

/**
 * Maneja la obtenci\xC3\xB3n de tareas desde ClickUp.
 * Requiere el par\xC3\xA1metro `team_id` y un token v\xC3\xA1lido en la configuraci\xC3\xB3n
 * o en la consulta.
 */
async function manejarApiTareas(req, res) {
  const data = obtenerParametros(req);
  if (!data) {
    return res.status(400).json({ error: 'Par\xC3\xA1metro team_id o token faltante' });
  }

  const { teamId, token, params, filtro } = data;

  try {
    const datos = await obtenerTareas(teamId, token, params, filtro);
    res.json(datos);
  } catch (err) {
    res.status(500).json({
      error: 'Error al consultar ClickUp',
      details: err.message,
    });
  }
}

/**
 * Actualiza la cach\xC3\xA9 local solicitando los datos a ClickUp.
 */
async function manejarActualizarCache(req, res) {
  const data = obtenerParametros(req);
  if (!data) {
    return res.status(400).json({ error: 'Par\xC3\xA1metro team_id o token faltante' });
  }

  const { teamId, token, params, filtro } = data;
  try {
    await obtenerTareas(teamId, token, params, filtro);
    res.json({ success: true, message: 'Cache actualizada' });
  } catch (err) {
    res.status(500).json({
      error: 'Error al actualizar la cache',
      details: err.message,
    });
  }
}

router.get(API_TAREAS_ENDPOINTS, manejarApiTareas);
router.get(ACTUALIZAR_CACHE_ENDPOINTS, manejarActualizarCache);

module.exports = router;
