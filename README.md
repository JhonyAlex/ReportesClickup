# Reportes ClickUp

API sencilla para obtener tareas desde ClickUp lista para desplegar en Heroku.

## Uso

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` a `.env` y coloca tu `CLICKUP_TOKEN`.
3. Inicia el servidor:
   ```bash
   npm start
   ```

Una vez iniciado el servidor puedes consultar las tareas con los siguientes
endpoints equivalentes:

```
GET /api_tareas
GET /api_tareas.php
```

Recuerda proporcionar el parámetro `team_id`.
Puedes definir tu token en la variable de entorno `CLICKUP_TOKEN` o
especificarlo en la URL con el parámetro `token`.

Ejemplo de consulta directa:

```bash
curl "http://localhost:3000/api_tareas?team_id=123&token=TU_TOKEN"
```
