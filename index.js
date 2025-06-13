const express = require('express');
const { obtenerTareas } = require('./utils/clickup'); // Funciones para la API de ClickUp
require('dotenv').config();

const app = express();
// Heroku proporciona el puerto en la variable PORT
const PORT = process.env.PORT || 3000;

// Endpoint base para verificar funcionamiento
app.get('/', (req, res) => {
  res.send('API de reportes ClickUp funcionando');
});

// Devuelve las tareas de un equipo especificado
app.get('/api_tareas', async (req, res) => {
  const { team_id: teamId } = req.query;
  const token = process.env.CLICKUP_TOKEN;

  if (!teamId || !token) {
    return res.status(400).json({
      error: 'Par\xC3\xA1metro team_id o token faltante'
    });
  }

  try {
    const data = await obtenerTareas(teamId, token);
    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: 'Error al consultar ClickUp',
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
