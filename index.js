const express = require('express');
require('dotenv').config();

const rutasTareas = require('./routes/tareas');

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint base para verificar funcionamiento
app.get('/', (_, res) => {
  res.send('API de reportes ClickUp funcionando\n');
});

// Registro de rutas principales
app.use(rutasTareas);
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
