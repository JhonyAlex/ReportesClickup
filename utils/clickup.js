const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const {
  CLICKUP_API_BASE,
  CACHE_DIR,
  DEFAULT_PAGE_SIZE,
  TASK_FIELDS,
  DESCRIPTION_MAX_LENGTH,
  COMMENTS_PAGE_SIZE,
  DAY_MS,
} = require('../config');

/**
 * Realiza una solicitud a la API de ClickUp.
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
    if (!resp.ok) throw new Error(`Error ${resp.status}`);
    return await resp.json();
  } catch (err) {
    throw new Error(`Fallo al conectar con ClickUp: ${err.message}`);
  }
}

/**
 * Lee la caché local de tareas.
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
 */
async function guardarCache(teamId, datos) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, `tareas_${teamId}.json`);
    await fs.writeFile(file, JSON.stringify(datos, null, 2));
  } catch (err) {
    console.error('Error guardando caché:', err.message);
  }
}

/**
 * Devuelve solo los campos necesarios de una tarea.
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
 * Obtiene todos los comentarios y los filtra por fecha si se indica.
 */
async function obtenerComentariosFiltrados(taskId, token, fechaFiltro) {
  try {
    const datos = await callClickUp(`/task/${taskId}/comment`, token, {
      page_size: COMMENTS_PAGE_SIZE,
      reverse: true,
    });

    const comentarios = Array.isArray(datos.comments) ? datos.comments : datos;

    return comentarios
      .map((c) => ({
        text: c.comment_text || c.text || '',
        date: Number(c.date || c.date_created || 0),
        date_iso: new Date(Number(c.date || c.date_created || 0)).toISOString(),
      }))
      .filter((c) => {
        if (!fechaFiltro) return true;
        return c.date_iso.startsWith(fechaFiltro); // compara YYYY-MM-DD
      });
  } catch (err) {
    console.error('Error obteniendo comentarios:', err.message);
    return [];
  }
}

/**
 * Convierte una fecha local (YYYY-MM-DD) a timestamp UTC.
 */
function fechaLocalAUTC(fechaStr, tz) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d) - tz * 3600 * 1000;
}

/**
 * Filtra las tareas por prefijo y rango de fechas locales.
 */
function filtrarTareas(
  tareas,
  { prefix, fecha, fecha_inicio, fecha_fin, timezone } = {}
) {
  let filtradas = Array.from(tareas);

  if (prefix) {
    filtradas = filtradas.filter(
      (t) => typeof t.custom_id === 'string' && t.custom_id.startsWith(prefix)
    );
  }

  const tz = Number(timezone) || 0;
  let inicio;
  let fin;

  if (fecha) {
    inicio = fechaLocalAUTC(fecha, tz);
    fin = inicio + DAY_MS - 1;
  } else if (fecha_inicio || fecha_fin) {
    const desde = fecha_inicio || fecha_fin;
    const hasta = fecha_fin || fecha_inicio;
    inicio = fechaLocalAUTC(desde, tz);
    fin = fechaLocalAUTC(hasta, tz) + DAY_MS - 1;
  }

  if (inicio !== undefined) {
    filtradas = filtradas.filter((t) => {
      const actualizada = Number(t.date_updated);
      const coment = t.last_comment ? Number(t.last_comment.date) : 0;
      const enRango = (valor) => valor >= inicio && valor <= fin;
      return enRango(actualizada) || enRango(coment);
    });
  }

  return filtradas;
}

/**
 * Obtiene las tareas desde ClickUp o la caché local.
 */
async function obtenerTareas(teamId, token, params = {}, filtro = {}) {
  const consulta = { page_size: DEFAULT_PAGE_SIZE, ...params };
  try {
    const datos = await callClickUp(`/team/${teamId}/task`, token, consulta);
    let tareasReducidas = (datos.tasks || []).map(filtrarCampos);
    tareasReducidas = filtrarTareas(tareasReducidas, { prefix: filtro.prefix });

    await Promise.all(
      tareasReducidas.map(async (t) => {
        const comentarios = await obtenerComentariosFiltrados(t.id, token, filtro.fecha);
        t.comentarios_actualizados = comentarios;
        if (comentarios.length > 0) {
          t.last_comment = comentarios[0]; // por compatibilidad
        }
      })
    );

    tareasReducidas = filtrarTareas(tareasReducidas, filtro);
    const respuesta = { ...datos, tasks: tareasReducidas };
    await guardarCache(teamId, respuesta);
    return respuesta;
  } catch (err) {
    const cache = await leerCache(teamId);
    if (cache) {
      const filtradas = filtrarTareas(cache.tasks || [], filtro);
      return { ...cache, tasks: filtradas };
    }
    throw err;
  }
}

module.exports = {
  obtenerTareas,
};
