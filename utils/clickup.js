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

 * Consulta los comentarios de una tarea y devuelve el último disponible.
 * @param {string} taskId Identificador de la tarea en ClickUp.
 * @param {string} token Token de autenticación para la API.
 * @returns {Promise<{text:string,date:number}|null>} Último comentario o null.
 */
async function obtenerUltimoComentario(taskId, token) {
  try {
    const datos = await callClickUp(`/task/${taskId}/comment`, token, {
      page_size: COMMENTS_PAGE_SIZE,
      reverse: true, // Request comments newest first
    });
    const lista = Array.isArray(datos.comments) ? datos.comments : datos;
    if (!Array.isArray(lista) || lista.length === 0) return null;
    let ultimo = null;
    for (const c of lista) {
      const fecha = Number(c.date || c.date_created || 0);
      if (!ultimo || fecha > ultimo.date) {
        ultimo = {
          text: c.comment_text || c.text || '',
          date: fecha,
        };
      }
    }
    return ultimo;
  } catch (err) {
    console.error('Error obteniendo comentarios:', err.message);
    return null;
  }
}

/**
 * Filtra las tareas por prefijo de ID y fecha local.
 * @param {Array<object>} tareas Lista de tareas a filtrar.
 * @param {object} opciones Opciones de filtrado.
 * @param {string} [opciones.prefix] Prefijo que debe contener `custom_id`.
 * @param {string} [opciones.fecha] Fecha en formato YYYY-MM-DD a comparar con `date_updated`.
 * @param {number|string} [opciones.timezone] Diferencia horaria en horas respecto a UTC.
 * @returns {Array<object>} Tareas filtradas.
 */
function filtrarTareas(tareas, { prefix, fecha, timezone } = {}) {
  let filtradas = Array.from(tareas);

  if (prefix) {
    filtradas = filtradas.filter(
      (t) => typeof t.custom_id === 'string' && t.custom_id.startsWith(prefix)
    );
  }

  if (fecha) {
    const tz = Number(timezone) || 0; // horas
    const [y, m, d] = fecha.split('-').map(Number);
    const inicio = Date.UTC(y, m - 1, d) - tz * 3600 * 1000;
    const fin = inicio + DAY_MS - 1;
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
 * Obtiene las tareas de un equipo en ClickUp.
 * @param {string} teamId - ID del equipo.
 * @param {string} token - Token de autenticación.
 * @returns {Promise<object>} Tareas obtenidas.
 */
async function obtenerTareas(teamId, token, params = {}, filtro = {}) {
  const consulta = { page_size: DEFAULT_PAGE_SIZE, ...params };
  try {
    const datos = await callClickUp(`/team/${teamId}/task`, token, consulta);
    let tareasReducidas = (datos.tasks || []).map(filtrarCampos);
    tareasReducidas = filtrarTareas(tareasReducidas, { prefix: filtro.prefix });

    await Promise.all(
      tareasReducidas.map(async (t) => {
        const ultimo = await obtenerUltimoComentario(t.id, token);
        if (ultimo) {
          t.last_comment = ultimo;
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
