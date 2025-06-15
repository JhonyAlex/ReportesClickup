### 📚 Resumen completo del proyecto **“Reportes ClickUp API”** (estado al 15-jun-2025)

> **Objetivo**
> Montar un backend en **Heroku** (Node / Python → tú escogiste **PHP/flask-style** con archivos sueltos) que obtenga tareas de ClickUp, las almacene en caché y exponga dos endpoints públicos bajo tu dominio **`reportes.pigmea.click`**, consumibles por un GPT mediante un documento **OpenAPI 3.1** alojado en el mismo servidor.
>
> Esto reemplaza la prueba previa en Replit y elimina la dependencia de Cloudflare/Hostinger.

---

## 1 · Repositorio GitHub

* **URL:** `https://github.com/JhonyAlex/ReportesClickup`
* **Branch principal:** `main`
* **Deploy automático:** activado en Heroku -> **Deploy → GitHub → Enable Automatic Deploys**.

### Estructura mínima actual

```
ReportesClickup/
│
├── app.py                # (si usas Flask) *o* index.js si fuera Node
├── api_tareas.php        # Endpoint que lee la caché y responde JSON
├── actualizar_cache.php  # Endpoint que consulta ClickUp y sobre-escribe la caché
├── utils/
│   └── clickup.php       # Función reutilizable para llamar a ClickUp (opcional)
├── cache/
│   └── tareas_9015702015.json  # Archivo de caché (escrito por actualizar_cache.php)
├── Procfile              # web: heroku-php-apache2 .  (o  web: node index.js / gunicorn app:app)
├── composer.json         # (solo si tu proyecto PHP requiere dependencias)
├── package.json          # (si fuera Node)
├── requirements.txt      # (si fuera Python)
└── openapi_clickup_api.json  # Especificación OpenAPI 3.1 (canvas)
```

> **Nota Heroku:** El sistema de archivos es efímero; cada reinicio borra cambios. Para tu flujo (reportes diarios, revisión manual) te vale un archivo de caché local. Si necesitas persistencia garantizada, migra a PostgreSQL o S3.

---

## 2 · Heroku

* **App:** `pigmea-reports-api` (nombre interno)
  DOMINIO Heroku: `https://pigmea-reports-api.herokuapp.com`
  Custom Domain: **`https://reportes.pigmea.click`**

* **Config Vars**

  * `CLICKUP_TOKEN` → *tu token personal de ClickUp*
  * (Opcional) `PORT` lo asigna Heroku, pero tu app debe usarlo.

* **Procfile** (PHP):

  ```
  web: heroku-php-apache2 .
  ```

* **Buildpacks automáticos**: Heroku detecta PHP o Node según archivos presentes.

---

## 3 · DNS (Cloudflare / proveedor)

| Tipo  | Nombre                  | Destino                            | Proxy                                         |
| ----- | ----------------------- | ---------------------------------- | --------------------------------------------- |
| CNAME | `reportes.pigmea.click` | `pigmea-reports-api.herokuapp.com` | 🔵 Proxy OFF (o ON + regla “Bypass Security”) |

> Con **proxy ON** saltarás ciertos retos; si usas ON, añade una **Configuration Rule** → Bypass Security para `/api_tareas.php` y `/actualizar_cache.php`.

---

## 4 · Endpoints implementados

| Método | Ruta                                              | Descripción                                                                     |
| ------ | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/api_tareas.php?team_id=9015702015`              | Devuelve el JSON cacheado con tareas.                                           |
| GET    | `/actualizar_cache.php?team_id=9015702015&dias=7` | Llama a ClickUp, filtra últimas *N* días, guarda en `cache/tareas_{team}.json`. |

### Ejemplo de respuesta `/api_tareas.php`

```json
{
  "tasks": [
    {
      "id": "86c40dy0g",
      "name": "Carta de solicitud para Tigo",
      "description": "...",
      "status": { "status": "to do" },
      "date_created": "1749855034873",
      "url": "https://app.clickup.com/t/86c40dy0g"
    },
    ...
  ]
}
```

---

## 5 · Documento OpenAPI 3.1

* **Nombre en canvas:** `Openapi Clickup Api`
* **Ruta pública recomendada:**
  Coloca el archivo exportado como `openapi.json` en la raíz y quedará accesible via
  `https://reportes.pigmea.click/openapi.json`

### Paths definidos

* **`/api_tareas.php`** (GET) → `obtenerTareas`
* **`/actualizar_cache.php`** (GET) → `actualizarCache`

Incluye parámetros, ejemplos y códigos 200 / 400 / 500.

---

## 6 · Flujo de uso con GPT

1. **Publica** `openapi.json` en la URL indicada.
2. En **ChatGPT → “Create a GPT”**:

   * Tools → “Add your API” → pega `https://reportes.pigmea.click/openapi.json`.
   * Añade instrucciones (ej.: “Cuando el usuario pida *tareas recientes*, llama a `obtenerTareas` con `team_id`=`9015702015`”).
3. Prueba diálogos:

   * *“Actualiza la caché de Pigmea y dame las tareas de los últimos 3 días.”* → GPT invoca `actualizarCache`, luego `obtenerTareas`.

---

## 7 · Próximos pasos sugeridos

| Prioridad | Acción                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| 🔵        | **Subir** `actualizar_cache.php` y carpeta `cache/` al repo (si aún no está).                                        |
| 🔵        | **Comprobar** en Heroku logs (`heroku logs --tail`) que la escritura en caché no lance permisos.                     |
| 🟢        | Exportar la especificación OpenAPI a un archivo plano `openapi.json` y confirmar que se sirve desde `/openapi.json`. |
| 🟢        | Añadir autenticación simple (token query o header) si requieres seguridad extra.                                     |
| 🟢        | (Opcional) Programar un **Heroku Scheduler** cada noche para llamar internamente a `actualizar_cache.php`.           |
| 🟢        | (Opcional) Migrar caché a PostgreSQL si necesitas persistencia entre restarts.                                       |

---

## 8 · Archivos esenciales (contenido de ejemplo)

### `api_tareas.php`

```php
<?php
header("Content-Type: application/json");
$team = $_GET['team_id'] ?? null;
if (!$team) { echo json_encode(["error"=>"team_id requerido"]); exit; }

$cache = __DIR__ . "/cache/tareas_{$team}.json";
if (!file_exists($cache)) { echo json_encode(["error"=>"Cache no encontrado"]); exit; }

echo file_get_contents($cache);
```

### `actualizar_cache.php`

```php
<?php
header("Content-Type: application/json");
$team = $_GET['team_id'] ?? null;
$dias = intval($_GET['dias'] ?? 7);
$token = getenv("CLICKUP_TOKEN");
if (!$team || !$token) { echo json_encode(["error"=>"team_id o token faltante"]); exit; }

$desde = time() - $dias*86400;
$url = "https://api.clickup.com/api/v2/team/$team/task?archived=false&date_updated_gt=$desde";
$opts = [ "http"=>["header"=>"Authorization: $token\r\n"] ];
$json = file_get_contents($url, false, stream_context_create($opts));

file_put_contents(__DIR__."/cache/tareas_{$team}.json", $json);
echo json_encode(["success"=>true,"message"=>"Cache actualizado"]);
```

### `Procfile`

```
web: heroku-php-apache2 .
```

---

## 9 · Puntos de control

| Verificación     | Comando / URL                                                                  | Resultado esperado     |
| ---------------- | ------------------------------------------------------------------------------ | ---------------------- |
| Heroku responde  | `curl -I https://reportes.pigmea.click/`                                       | `HTTP/2 200`           |
| Endpoint JSON    | `https://reportes.pigmea.click/api_tareas.php?team_id=9015702015`              | Lista de tareas        |
| Actualizar caché | `https://reportes.pigmea.click/actualizar_cache.php?team_id=9015702015&dias=3` | `{"success":true,...}` |
| OpenAPI          | `https://reportes.pigmea.click/openapi.json`                                   | Archivo JSON           |

---

Con esto tienes **todo el contexto técnico** para duplicar el proyecto en otro chat, documentar o continuar evolucionando la solución.
