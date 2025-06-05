// --- Importa las dependencias necesarias ---
const express = require("express");
const fetch = require("node-fetch"); // Usa node-fetch v2
require("dotenv").config(); // Lee el archivo .env

// --- Crea la app de Express ---
const app = express();
const PORT = process.env.PORT || 3000;

function parseFechaSegura(fechaOriginal) {
  if (!fechaOriginal) return null;
  const fecha = new Date(fechaOriginal);
  if (isNaN(fecha)) return null;
  return new Date(
    fecha.toLocaleString("en-US", { timeZone: "Europe/Madrid" })
  ).toISOString().split("T")[0];
}


// --- Endpoint raíz para comprobar que todo funciona ---
app.get("/", (req, res) => {
  res.send("Servidor Express activo!");
});

    app.get("/api/tareas", async (req, res) => {
      const token = process.env.ACCESS_TOKEN;
      const espacioId = req.query.espacio_id;


      // Si no hay parámetros, 30 días atrás por defecto
      const hastaParam = req.query.hasta;
      const hasta = hastaParam ? new Date(hastaParam + "T23:59:59").getTime() : Date.now();
      const desdeParam = req.query.desde; // ej: 2024-05-01
      const desde = desdeParam ? new Date(desdeParam + "T00:00:00").getTime() : (Date.now() - 30 * 24 * 60 * 60 * 1000);

      const incluirActividad = req.query.incluir_actividad === "true";
      const incluirComentarios = req.query.incluir_comentarios === "true";
      const diasActividad = parseInt(req.query.dias_actividad || "15");
      const desdeActividad = Date.now() - diasActividad * 24 * 60 * 60 * 1000;

      if (!token) return res.status(500).json({ error: "Falta el ACCESS_TOKEN en .env" });
      if (!espacioId) return res.status(400).json({ error: "Falta el parámetro espacio_id" });

      try {
        let todasLasListas = [];

    // 1. Traer carpetas (folders) del espacio
    const carpetasResp = await fetch(`https://api.clickup.com/api/v2/space/${espacioId}/folder`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const carpetasData = await carpetasResp.json();
    console.log("Respuesta de carpetas:", JSON.stringify(carpetasData, null, 2));
    const carpetas = carpetasData.folders || [];

    // 2. Para cada carpeta, traer sus listas
    for (const carpeta of carpetas) {
      for (const lista of (carpeta.lists || [])) {
        todasLasListas.push({
          ...lista,
          folder: { id: carpeta.id, name: carpeta.name }
        });
      }
    }

    // 3. Traer listas sueltas (listas fuera de carpetas visibles o en "hidden")
    const listasResp = await fetch(`https://api.clickup.com/api/v2/space/${espacioId}/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listasData = await listasResp.json();
    console.log("Respuesta de listas sueltas:", JSON.stringify(listasData, null, 2));
    const listasSolas = listasData.lists || [];

    // 👉 Aquí agregamos TODAS las listas sueltas, aunque tengan folder "hidden"
    todasLasListas = todasLasListas.concat(listasSolas);

    // Debug: ver cuántas listas en total se encontraron
    console.log("Total de listas encontradas:", todasLasListas.length);

        // --- Parámetros para el filtrado ---
        const diasParam = req.query.dias;
        const dias = diasParam && Number(diasParam) > 0 ? parseInt(diasParam) : 8; // Por defecto 8 días
        const fechaLimite = Date.now() - dias * 24 * 60 * 60 * 1000;

        let todasTareas = [];

        // --- Consulta eficiente de tareas por fecha de actualización ---
        for (const lista of todasLasListas) {
          const tareasResp = await fetch(
          `https://api.clickup.com/api/v2/list/${lista.id}/task?include_closed=true&date_updated_gt=${fechaLimite}`,

            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );


          const tareasData = await tareasResp.json();
          const tareas = tareasData.tasks || [];
          if (!tareas.length) continue;
          todasTareas = todasTareas.concat(
            tareas.map(t => ({
              ...t,
              lista_id: lista.id,
              lista_nombre: lista.name,
              carpeta_id: lista.folder?.id || null,
              carpeta_nombre: lista.folder?.name || null
            }))
          );
        }

        // --- Log para depuración ---
        console.log(`Total tareas encontradas en el rango de ${dias} días: ${todasTareas.length}`);

        // --- Filtrado interno por fechas exactas (si se especifica) ---
        if (desdeParam && hastaParam) {
          const desdeTimestamp = new Date(desdeParam + "T00:00:00").getTime();
          const hastaTimestamp = new Date(hastaParam + "T23:59:59").getTime();
          todasTareas = todasTareas.filter(t => {
            const fechaTarea = Number(t.date_updated);
            return fechaTarea >= desdeTimestamp && fechaTarea <= hastaTimestamp;
          });
          console.log(`Tareas después del filtro interno por fecha exacta: ${todasTareas.length}`);
        }

        // --- Si no hay tareas, responde mensaje claro ---
        if (!todasTareas.length) {
          return res.json({
            tareas: [],
            mensaje: "No se encontraron tareas actualizadas o comentadas en el rango de fechas solicitado."
          });
        }


    // Ordena tareas por fecha de actualización (más reciente primero)
        todasTareas.sort((a, b) => Number(b.date_updated) - Number(a.date_updated));


        
        // --- NUEVO: filtro por rango de fecha ---
        const filtradas = todasTareas.filter(t => {
          if (!t.date_updated) return false;
          const fechaTarea = Number(t.date_updated);
          return fechaTarea >= desde && fechaTarea <= hasta;
        });

    // Procesa tareas filtradas, añadiendo opcionalmente actividades y comentarios
    const procesadas = [];
    for (const t of filtradas) {
      const tarea = {
        id: t.id,
        nombre: t.name,
        estado: t.status?.status || t.status?.name || "Sin estado",
        responsables: (t.assignees || []).map(a => a.username || a.email || a.name),
        actualizada: new Date(Number(t.date_updated)).toISOString(),
        descripcion: t.description || "",
        campos_personalizados: t.custom_fields || [],
        lista_id: t.lista_id,
        lista_nombre: t.lista_nombre,
        carpeta_id: t.carpeta_id,
        carpeta_nombre: t.carpeta_nombre
      };

      // Historial de actividades
      // Historial de actividades
      if (incluirActividad) {
        try {
          const historyResp = await fetch(`https://api.clickup.com/api/v2/task/${t.id}/history`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const historyData = await historyResp.json();
          const historial = historyData.history || [];
          tarea.actividades = historial
            .filter(a => {
              const ts = Number(a.date);
              const fechaActividad = new Date(ts);
              const fechaLocal = new Date(
                fechaActividad.toLocaleString("en-US", { timeZone: "Europe/Madrid" })
              );
              const fechaYMD = fechaLocal.toISOString().split("T")[0];
              const fechaDesdeYMD = new Date(desde).toISOString().split("T")[0];
              const fechaHastaYMD = new Date(hasta).toISOString().split("T")[0];
              return fechaYMD >= fechaDesdeYMD && fechaYMD <= fechaHastaYMD;
            })
            .sort((a, b) => Number(b.date) - Number(a.date))
            .map(a => ({
              fecha: new Date(Number(a.date)).toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
              tipo: a.type,
              usuario: a.username || "(desconocido)",
              descripcion: a.description || ""
            }));
        } catch (err) {
          console.error(`Error obteniendo historial de la tarea ${t.id}:`, err.message);
          tarea.actividades = [];
        }
      }


      // Comentarios
      if (incluirComentarios) {
        try {
          const comentariosResp = await fetch(`https://api.clickup.com/api/v2/task/${t.id}/comment`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const comentariosData = await comentariosResp.json();
          const comentarios = comentariosData.comments || [];
          tarea.comentarios = comentarios
          .filter(c => {
            const ts = Number(c.date);
            const fechaComentario = new Date(ts);

            // Convertimos a fecha local de España (solo YYYY-MM-DD)
            const fechaLocal = new Date(
              fechaComentario.toLocaleString("en-US", { timeZone: "Europe/Madrid" })
            );
            const fechaYMD = fechaLocal.toISOString().split("T")[0]; // "2025-05-29"

            // Convertimos también los rangos a YYYY-MM-DD
            const fechaDesdeYMD = new Date(desde).toISOString().split("T")[0];
            const fechaHastaYMD = new Date(hasta).toISOString().split("T")[0];

            return fechaYMD >= fechaDesdeYMD && fechaYMD <= fechaHastaYMD;
          })
          .sort((a, b) => Number(b.date) - Number(a.date))
          .map(c => ({
            fecha: new Date(Number(c.date)).toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
            autor: c.user?.username || c.user?.email || "(desconocido)",
            contenido: c.comment_text?.trim() || "(sin contenido)"
          }));


        } catch (err) {
          console.error(`Error obteniendo comentarios de la tarea ${t.id}:`, err.message);
          tarea.comentarios = [];
        }
      }

      procesadas.push(tarea);
    }
        // --- Filtro final por fecha exacta (comentarios o actividades) ---
        const fechaDesdeYMD = new Date(desde).toISOString().split("T")[0]; // ej: "2025-05-23"
        const fechaHastaYMD = new Date(hasta).toISOString().split("T")[0];

        const tareasFiltradasPorFechaExacta = procesadas.filter(tarea => {
          const coincideComentario = tarea.comentarios?.some(c => {
            const fechaYMD = parseFechaSegura(c.fecha);
            if (!fechaYMD) return false;
            return fechaYMD >= fechaDesdeYMD && fechaYMD <= fechaHastaYMD;
          });



          const coincideActividad = tarea.actividades?.some(a => {
            const fechaYMD = parseFechaSegura(a.fecha);
            if (!fechaYMD) return false;
            return fechaYMD >= fechaDesdeYMD && fechaYMD <= fechaHastaYMD;
          });



          const fechaYMD = parseFechaSegura(tarea.actualizada);
          const coincideActualizacion = fechaYMD && fechaYMD >= fechaDesdeYMD && fechaYMD <= fechaHastaYMD;



          return coincideComentario || coincideActividad || coincideActualizacion;
        });


    // Si no hay tareas en el rango, responde con mensaje especial
    if (procesadas.length === 0) {
      if (todasTareas.length === 0) {
        return res.json({
          tareas: [],
          mensaje: `No se encontraron tareas en el espacio con ID ${espacioId}.`
        });
      } else {
        const ultima = todasTareas[0];
        return res.json({
          tareas: [],
          mensaje: `No hay tareas actualizadas en los últimos ${dias} días. Última tarea modificada: "${ultima.name}" el ${new Date(Number(ultima.date_updated)).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`,
          ultima_tarea: {
            id: ultima.id,
            nombre: ultima.name,
            actualizada: new Date(Number(ultima.date_updated)).toISOString(),
            estado: ultima.status?.status || ultima.status?.name || "Sin estado"
          }
        });
      }
    }

    // Si hay tareas, responde normalmente
        // Si hay tareas, responde con el filtro final aplicado
        if (tareasFiltradasPorFechaExacta.length === 0) {
          return res.json({
            tareas: [],
            mensaje: `No se encontraron tareas con actividad en el rango del ${fechaDesdeYMD} al ${fechaHastaYMD}.`
          });
        }

        res.json(tareasFiltradasPorFechaExacta);


  } catch (err) {
    console.error("Error en /api/tareas:", err);
    res.status(500).send({ error: "Error al consultar tareas" });
  }
});
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});