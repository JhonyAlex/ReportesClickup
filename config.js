// Configuración centralizada de constantes.
// Cualquier cambio en las rutas o base de la API debe realizarse aquí.

/** Rutas equivalentes para consultar las tareas */
const API_TAREAS_ENDPOINTS = ['/api_tareas', '/api_tareas.php'];

/** URL base para todas las llamadas a la API de ClickUp */
const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

module.exports = {
  API_TAREAS_ENDPOINTS,
  CLICKUP_API_BASE,
};
