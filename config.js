// Configuración centralizada de constantes.
// Cualquier cambio en las rutas o base de la API debe realizarse aquí.

const path = require('path');

/** Rutas equivalentes para consultar las tareas */
const API_TAREAS_ENDPOINTS = ['/api_tareas', '/api_tareas.php'];

/** Rutas para actualizar manualmente la caché */
const ACTUALIZAR_CACHE_ENDPOINTS = ['/actualizar_cache', '/actualizar_cache.php'];

/** URL base para todas las llamadas a la API de ClickUp */
const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

/** Milisegundos que conforman un día (24 h) */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Directorio donde se guarda la cache de tareas */
const CACHE_DIR = path.join(__dirname, 'cache');

module.exports = {
  API_TAREAS_ENDPOINTS,
  ACTUALIZAR_CACHE_ENDPOINTS,
  CLICKUP_API_BASE,
  DAY_MS,
  CACHE_DIR,
};
