# Consultas y tráfico del sitio

El sitio público (`jcanalytic.com`) se conecta con el portal por una sola puerta: `/ingest`. Por ahí llegan
dos cosas:

- **Consultas:** personas que dejaron su WhatsApp o correo. Aparecen en **Web → Consultas** (`/consultas`).
- **Medición de navegación:** qué secciones se leen, qué se toca y si se llega a los formularios. Se ve en
  **Web → Tráfico del sitio** (`/trafico`).

## Qué ve el equipo

**Consultas (`/consultas`)**
- La bandeja trae pestañas por estado: nueva, contactada, en conversación, cotizada, ganada, perdida y spam.
  También permite buscar y exportar a Excel (CSV con `;` y BOM).
- Cada consulta tiene botones de WhatsApp (con saludo listo), llamada y correo. Usar uno deja constancia y
  pasa la consulta a «Contactada».
- También se puede cambiar el estado, elegir quién está a cargo y fijar la próxima acción.
- Tiene notas internas y un historial completo.
- El **recorrido** de la visita muestra qué vio y qué tocó la persona antes de escribir.
- **Pasar a clientes** crea un prospecto en Clientes con su contacto. Si el nombre ya existe, ofrece
  vincular la consulta con esa ficha.
- Solo el admin puede borrar una consulta (por ejemplo, si la persona lo pide).
- Cada consulta nueva avisa a todo el equipo en el buzón y por push. La categoría es «Consultas de la web»
  y se puede apagar en Avisos.
- Los inversionistas no ven esta sección.

**Tráfico del sitio (`/trafico`)**, en periodos de 7, 30 o 90 días, muestra:
- visitas, personas aproximadas, tiempo promedio leyendo, porcentaje que tocó un CTA y consultas;
- visitas por día;
- **¿Llegan al llamado a la acción?**: embudo de entraron → vieron precios → bajaron a la mitad → tocaron
  WhatsApp, un paquete o contacto → empezaron un formulario → lo enviaron → dejaron sus datos;
- **¿Dónde se queda la gente?**: tiempo promedio por sección y qué porcentaje de visitas la vio;
- **¿Qué tocan?**: los botones y enlaces más usados, con la sección donde estaban;
- hasta dónde bajan, formularios (empezados contra enviados), fuentes (Google, Meta, ChatGPT, directo…),
  dispositivos, campañas (`utm_campaign`) y páginas más vistas.

## Cómo mide el sitio

`jcanalytics-app/src/seo/site-tracker.js`:
- Un id al azar por pestaña (`sessionStorage`). No hay cookies ni identificadores que duren entre visitas.
- **Secciones:** se mide la que cruza el centro de la pantalla, con un solo `IntersectionObserver`.
- **Scroll:** marcas de 25 / 50 / 75 / 100 %, con un listener pasivo y `requestAnimationFrame`.
- **Clics:** tipo (WhatsApp, paquete, contacto, menú, proyecto…) y texto visible del botón. **Nunca** se lee
  lo que alguien escribe en un campo.
- **Envío:** agrupado cada 15 s y al ocultar la página, con `sendBeacon` en `text/plain` (petición simple:
  sin preflight y sin cookies).
- **No mide** si el navegador pide «Do Not Track» o «Global Privacy Control», ni navegadores automatizados
  (el prerender, las pruebas y los bots).

El formulario de contacto suma un paso opcional, **«¿Cómo te contactamos?»**, con WhatsApp o correo:
- **«Continuar en WhatsApp»** sigue igual. Si la persona dejó su contacto, la consulta también llega al portal.
- **«Prefiero que me contacten»** exige WhatsApp o correo y guarda la consulta sin abrir WhatsApp.

## Seguridad

`portal/server/ingest.mjs`:
- **Orígenes:** solo acepta los del sitio, definidos en `PORTAL_SITE_ORIGINS`. Por defecto son
  `https://www.jcanalytic.com` y `https://jcanalytic.com`. Cualquier otro origen recibe 403 y no recibe
  encabezados CORS.
- **Sesiones:** no toca ninguna sesión. Las cookies del portal son `SameSite=Strict`, así que no viajan
  desde el sitio.
- **Validación:** cuerpo de 16 KB como máximo, campos con lista blanca y largos recortados. Un evento con
  tipo, sección o valor raro se descarta; el evento «lead» solo lo crea el servidor.
- **Límites:**
  - 5 consultas y 120 lotes de eventos cada 10 minutos por visitante;
  - tope diario de consultas (`PORTAL_MAX_DAILY_LEADS`, 300 por defecto);
  - un reenvío de la misma persona en 10 minutos completa la consulta en vez de duplicarla.
- **Bots:** hay un campo oculto que funciona como trampa y un tiempo mínimo de llenado. Si se activan, el
  servidor responde «ok» sin guardar nada.
- **Privacidad:** no se guarda IP ni navegador. Se guarda solo un identificador del día (hash con una sal
  aleatoria que cambia cada día) para contar personas aproximadas. Los eventos se borran solos a los
  180 días.

### Inyección de instrucciones (prompt injection)

Todo lo que escribe un visitante es **dato no confiable**:

1. **Se limpia** (`shared/leads.js`, `cleanVisitorText`). Se quitan los caracteres de control, las marcas
   de dirección bidi y los caracteres de ancho cero, que se usan para esconder texto. También se recortan
   los largos.
2. **Se marca.** Si parece instrucciones para una IA («ignore previous instructions», «system prompt»,
   «actuá como»…), código, spam o enlaces, la consulta muestra «Revisá antes de responder».
3. **Nunca llega a un modelo de IA.** Las consultas y el tráfico no se exponen por MCP: la conexión con
   Claude solo tiene herramientas explícitas de proyectos, tareas y clientes. Una prueba (`tests/leads.test.mjs`)
   falla si alguien las agrega. El asistente del sitio (`assistant-api`) tampoco recibe estos datos.
4. **Se muestra como texto.** React escapa todo y no se usa HTML crudo. Los enlaces de contacto se arman
   solo con el teléfono y el correo validados, nunca con un enlace que haya escrito el visitante.
5. **El Excel exportado neutraliza fórmulas:** una celda que empieza con `=`, `+`, `-` o `@` se guarda
   como texto.
6. **El aviso push** lleva el nombre y la necesidad, nunca el mensaje libre.

## Configuración

- **Portal (Railway):** no hace falta nada nuevo. Las tablas se crean solas al arrancar (migración 13).
  Variables opcionales:
  - `PORTAL_SITE_ORIGINS`: otros orígenes del sitio, separados por comas;
  - `PORTAL_MAX_DAILY_LEADS`: el tope diario de consultas.
- **Sitio (GitHub Pages):** usa `VITE_PORTAL_URL` (por defecto `https://portal.jcanalytic.com`). Para
  apuntar la medición a otra dirección existe `VITE_PORTAL_INGEST_URL`.

## Pruebas

- `npm test` → `tests/leads.test.mjs`: limpieza, trampas, límites, CORS, bandeja, permisos, analítica y que
  nada de esto pase por MCP.
- `npm run e2e:web`: en un navegador real, llega una consulta hostil por `/ingest` y el equipo la trabaja
  (contacto, nota, estado, cliente). Además revisa el tablero de tráfico en escritorio y celular.
- En el sitio, `npm run check:site` verifica dos cosas:
  - que la medición mande secciones, scroll, clics y formularios sin datos personales;
  - que «Prefiero que me contacten» llegue con los datos correctos.
