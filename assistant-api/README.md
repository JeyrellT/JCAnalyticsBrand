# Asistente de JC Analytics

API de Node.js para el chat del sitio. El navegador envía las consultas a Railway; únicamente el servidor utiliza `DEEPSEEK_API_KEY` para conectarse a DeepSeek. No utiliza bases de datos ni guarda conversaciones. Los logs contienen códigos de diagnóstico, sin mensajes ni claves.

## Producción

- Proyecto Railway: `jcanalytics-assistant` (`6319757f-48b8-4380-bc09-72565224121d`).
- Servicio: `assistant-api` (`515f69d0-cc44-4354-b9c3-383e4fe224b7`), entorno `production`.
- Endpoint público: `https://assistant-api-production-0d9b.up.railway.app/api/chat`.
- Estado: `GET /health`, devuelve 200 si existe la variable de la clave.
- Inicio: `npm start`, con el puerto que proporciona Railway.
- Railway tiene configurado `/health` como healthcheck, 30 segundos de espera y hasta tres reinicios ante fallos.

Las variables privadas están en Railway. `DEEPSEEK_MODEL` selecciona `deepseek-flash`. `ALLOWED_ORIGINS` permite los dominios del sitio y de GitHub Pages; no acepta comodines. `MAX_DAILY_REQUESTS` limita a 500 llamadas al modelo por día UTC de forma predeterminada. Hay además un máximo de 12 consultas por IP cada diez minutos y seis solicitudes simultáneas. Los contadores viven en memoria y se reinician al reiniciar el proceso; usar una sola réplica. Al llegar al límite, la interfaz ofrece WhatsApp.

Para actualizar el backend, desde esta carpeta vinculada al servicio:

```sh
railway up . --path-as-root --service assistant-api
```

La configuración de inicio y healthcheck reside en el servicio de Railway. No depende de archivos `railway.json` obsoletos.

## Información y derivación

`knowledge.json` se genera desde los servicios y las preguntas frecuentes públicas. Al cambiar esa información, ejecutar desde `jcanalytics-app`:

```sh
npm run sync:assistant
```

Incluir el archivo generado en el cambio y volver a desplegar la API. El modelo recibe instrucciones para no inventar precios, horarios, garantías, disponibilidad ni estados de proyectos. Devuelve JSON con `reply` y `handoff`. Las consultas que requieren confirmación o información desconocida ofrecen continuar por WhatsApp al **+506 7033-0596**, con las últimas tres preguntas precargadas. También hay acceso directo al equipo y derivación si falla la API. El visitante confirma el envío en WhatsApp.

La conversación vive en memoria en la pestaña; al recargar se borra. Las consultas enviadas al chat se procesan por DeepSeek, como indica la interfaz. No se envían mensajes de WhatsApp automáticamente.

## Desarrollo local

Desde esta carpeta, copiar `.env.example` a `.env`, completar la clave localmente y agregar a `ALLOWED_ORIGINS` la URL exacta de Vite, por ejemplo `http://localhost:5173`:

```sh
node --env-file=.env server.mjs
```

En otra terminal, ejecutar `npm run dev` desde `jcanalytics-app`. Vite reenvía `/api/chat` al puerto 3001. La variable pública opcional `VITE_ASSISTANT_API_URL` permite otro endpoint. **Nunca colocar la clave de DeepSeek en una variable `VITE_`, en `public/` ni en el repositorio.**

## Verificación

Desde `jcanalytics-app`, después del build:

```sh
npm run check:assistant
```

Prueba el contrato HTTP, validación, CORS, límites, errores del proveedor y derivación. Las pruebas del navegador comprueban español e inglés a 1440, 390 y 320 píxeles, navegación por teclado, conservación del chat al cerrarlo, enlaces de WhatsApp con contexto y acceso desde servicios y artículos. Utilizan respuestas simuladas y no consumen la API ni envían mensajes. Las capturas se guardan en `_scripts/assistant-review/`, fuera de los recursos públicos.
