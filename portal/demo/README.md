# Demo del portal en el navegador

`npm run build:demo` genera `demo-dist/portal-demo.html`: el portal completo en un
solo archivo, con el backend real corriendo en la pestaña y datos ficticios.

## Cómo funciona

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Entrada | `main.jsx` | Pantalla "Preparando la demo…", siembra, conecta la app y monta `<Root />` de `src/App.jsx`. |
| Base | `sqljs-adapter.js` | sql.js **asm.js** (`sql.js/dist/sql-asm.js`: JS puro, sin `.wasm` ni `eval`) con la API de `node:sqlite` que usa `server/`: `exec`, `prepare().get/all/run`, `close`. Reutiliza una sentencia por texto SQL para no agotar la memoria de SQLite. |
| Backend | `backend.js` | `migrate()` + `createContext()` + `createRouter()` + `registerRoutes()`, igual que `server/app.mjs`. `dispatch(path, { method, body })` hace lo de `handleApi`: rutas, permisos por rol, cuerpo JSON y `HttpError` → `{ status, data }`. Sesiones lógicas en memoria (la siembra entra como cada persona; quien mira usa `viewer`). |
| Shims | `shims/` | Reemplazan `node:crypto`, `node:os`, `node:path`, `node:util`, `node:fs/promises` y `server/auth.mjs` (scrypt → SHA-256 con sal; el resto de `auth.mjs` es el real). |
| Interfaz | `src/lib/api.js`, `src/lib/router.jsx`, `src/pages/Login.jsx` | `setTransport()` cambia fetch por `dispatch`; `setRouterMode('memory')` evita tocar `location`/`history` (los enlaces quedan como `#/ruta`); con `isDemo()` el login es un selector de personas. |

El build (`vite.demo.config.js` + `scripts/build-demo.mjs`) incrusta JS, CSS y el
logo, y escribe un **fragmento** para artefactos de claude.ai: empieza con
`<title>`, sigue con las fuentes de Google, `<style>`, `<div id="root">` y un
`<script type="module">`; sin `<!doctype>`, `<html>`, `<head>` ni `<body>`.

## Reglas para quien toque `server/`

- Los módulos de rutas, `context.mjs`, `schema.mjs`, `router.mjs`, `http.mjs`,
  `demo-data.mjs` y `shared/` también corren en el navegador: nada de `Buffer`,
  `process`, archivos ni red. Si una ruta importa otro `node:*`, el build avisa y
  lo reemplaza por un módulo que falla al usarse; agregá un shim en `shims/`.
- Las rutas nuevas se registran solo en `server/routes/index.mjs`: la demo llama a
  `registerRoutes()` y las toma sola.
- Las descargas se responden con `res.writeHead()/res.end()`; la demo captura el
  texto, pero en el artefacto los enlaces de descarga muestran "Disponible en el
  portal publicado".
- La siembra (`seedDemoData`) pasa por la API real: si una validación nueva la
  rompe, la demo muestra el error en la pantalla de carga.

## Restricciones del artefacto

Sin `fetch`/XHR (CSP `connect-src 'none'`), sin `eval`, sin `window.confirm/alert`,
sin service workers y solo `#anclas` como enlaces. El build falla si queda algún
archivo sin incrustar o si pasa de 16 MB.
