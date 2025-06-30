// Configuración centralizada de constantes.
// Cualquier cambio en las rutas o base de la API debe realizarse aquí.

const path = require('path');

/** Rutas equivalentes para consultar las tareas */
const API_TAREAS_ENDPOINTS = ['/api_tareas', '/api_tareas.php'];

/** Rutas para actualizar manualmente la caché */
const ACTUALIZAR_CACHE_ENDPOINTS = ['/actualizar_cache', '/actualizar_cache.php'];

/** Rutas para obtener tareas de todas las listas en una carpeta */
const CARPETA_TAREAS_ENDPOINTS = ['/tareas_carpeta', '/tareas_carpeta.php'];

/** URL base para todas las llamadas a la API de ClickUp */
const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

/** Milisegundos que conforman un día (24 h) */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Directorio donde se guarda la cache de tareas */
const CACHE_DIR = path.join(__dirname, 'cache');

// Número máximo de tareas a solicitar por defecto
const DEFAULT_PAGE_SIZE = 50;

// Incluir subtareas en las consultas por defecto
const DEFAULT_INCLUDE_SUBTASKS = true;

// Campos mínimos a conservar de cada tarea para reducir la respuesta
const TASK_FIELDS = [
  'id',
  'custom_id',
  'name',
  'text_content',
  'description',
  'status',
  'date_created',
  'date_updated',
  'due_date',
  'creator',
  'assignees',
  'url',
];

// Máximo de caracteres permitidos en las descripciones
const DESCRIPTION_MAX_LENGTH = 500;

// Número máximo de comentarios que se consultarán por tarea
const COMMENTS_PAGE_SIZE = 20;

module.exports = {
  API_TAREAS_ENDPOINTS,
  ACTUALIZAR_CACHE_ENDPOINTS,
  CARPETA_TAREAS_ENDPOINTS,
  CLICKUP_API_BASE,
  DAY_MS,
  CACHE_DIR,
  DEFAULT_PAGE_SIZE,
  DEFAULT_INCLUDE_SUBTASKS,
  TASK_FIELDS,
  DESCRIPTION_MAX_LENGTH,
  COMMENTS_PAGE_SIZE,
};
