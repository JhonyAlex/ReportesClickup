const express = require('express');
require('dotenv').config();

const rutasTareas = require('./routes/tareas');

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoints disponibles para la consulta de tareas
const API_TAREAS_ENDPOINTS = ['/api_tareas', '/api_tareas.php'];

// Endpoint base para verificar funcionamiento
app.get('/', (req, res) => {
  res.send('API de reportes ClickUp funcionando');
});

// Registro de rutas principales
app.use(rutasTareas);
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
