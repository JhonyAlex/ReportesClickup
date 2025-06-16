const express = require('express');
const path = require('path');
require('dotenv').config();

const rutasTareas = require('./routes/tareas');

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint base para verificar funcionamiento
app.get('/', (_, res) => {
  res.send('API de reportes ClickUp funcionando\n');
});

// Documento OpenAPI para integraci\xC3\xB3n con GPT Actions
app.get('/openapi.json', (_, res) => {
  res.sendFile(path.join(__dirname, 'openapi.json'));
});

// Registro de rutas principales
app.use(rutasTareas);
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
