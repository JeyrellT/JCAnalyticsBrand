# Consultas y tráfico del sitio

El sitio público (`jcanalytic.com`) se conecta con el portal por una sola puerta: `/ingest`. Por ahí llegan
dos cosas:

- **Consultas:** personas que dejaron su WhatsApp o correo. Aparecen en **Web → Consultas** (`/consultas`).
  Llegan por tres canales: «Formulario de contacto», «Paquete con precio» (en computadora los botones de
  WhatsApp abren un formulario corto con el paquete; el sitio lo mide como `contacto-rapido`) y «Pidió que lo
  contacten». Cada consulta trae el dispositivo (celular, tableta o escritorio).
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
- **Pasar a clientes** crea un prospecto en Clientes con su contacto. El nombre del cliente lo escribe el
  equipo; solo se sugiere el del visitante si la consulta no tiene marcas. Si el nombre ya existe, ofrece
  vincular la consulta con esa ficha.
- Solo el admin puede borrar una consulta (por ejemplo, si la persona lo pide).
- Cada consulta nueva avisa a todo el equipo en el buzón y por push. La categoría es «Consultas de la web»
  y se puede apagar en Avisos.
- Los inversionistas no ven esta sección.

**Tráfico del sitio (`/trafico`)**, en periodos de 7, 30 o 90 días, está pensado para decidir. Muestra:
- visitas, personas aproximadas, tiempo promedio leyendo, porcentaje que tocó un CTA y consultas, cada una
  **comparada con el periodo anterior** de igual largo (▲ / ▼ en %; la tasa de CTA, en puntos);
- **Qué hacer esta semana**: recomendaciones calculadas con reglas (ver abajo);
- visitas por día;
- **¿Llegan al llamado a la acción?**: embudo de entraron → vieron precios (sección `paquetes` u `oferta`) →
  bajaron a la mitad → tocaron WhatsApp, un paquete o contacto → empezaron un formulario → lo enviaron →
  dejaron sus datos;
- **Consultas: del clic a la venta**: las consultas del periodo por estado (llegaron → contactadas → en
  conversación → cotizadas → ganadas; perdidas y spam al pie), tasa de contacto, mediana de minutos hasta el
  primer contacto, tasa de cierre (ganadas ÷ ganadas + perdidas) y cuántas llevan más de 24 h sin atender,
  con listas por necesidad y por fuente (con las ganadas);
- **Páginas: dónde vale la pena trabajar**: cada página con visitas, tiempo leyendo, scroll al 50 %, tasa de
  CTA, consultas y un **veredicto**; tocar una fila abre su detalle (secciones, scroll, clics, fuentes y
  dispositivos de esa ruta) y «Excel (CSV)» exporta la tabla;
- **¿Dónde se queda la gente?**: tiempo promedio por sección y qué porcentaje de visitas la vio;
- **¿Qué CTA convierte?**: clics a CTA por sección, cuántas de esas visitas dejaron sus datos y la tasa;
- **¿Qué tocan?**: los botones y enlaces más usados, con la sección donde estaban;
- **¿Cuándo entran?**: mapa de calor de día de la semana × hora de Costa Rica, con el pico;
- hasta dónde bajan, formularios (empezados contra enviados), fuentes, dispositivos e idioma (cada uno con su
  tasa de CTA), campañas (`utm_campaign`).

### Veredicto por página

Los umbrales viven en `shared/leads.js` (`PAGE_THRESHOLDS`, `PAGE_VERDICTS`) y los usa también la interfaz:

| Veredicto | Cuándo |
|---|---|
| Pocos datos | menos de 10 visitas en el periodo: no se opina |
| Engancha | tiempo leyendo ≥ 60 s y tasa de CTA ≥ 8 % |
| Mucho tráfico, poca acción | al menos el 15 % de las visitas del sitio (y no menos de 10) con tasa de CTA < 3 % |
| Rebote | tiempo leyendo < 10 s y menos del 25 % baja a la mitad |
| Normal | el resto |

El tiempo leyendo de una página es la suma de sus secciones medidas dividida entre sus visitas. Las cifras de
cada página nunca superan sus propias visitas.

### Recomendaciones («Qué hacer esta semana»)

`buildInsights` (`shared/leads.js`) es una función pura sobre los agregados de la ruta; cada regla exige una
muestra mínima y, sin ella, no aparece. Se muestran como máximo ocho, primero las rojas:

| Regla | Mínimo | Tono |
|---|---|---|
| Consultas con más de 24 h sin respuesta | 1 | rojo, enlaza a Consultas |
| Visitas suben o bajan ≥ 20 % frente al periodo anterior | 20 visitas en el periodo anterior | verde si suben, ámbar si bajan |
| Página con veredicto «mucho tráfico, poca acción» | el veredicto | ámbar |
| Celular convierte menos de la mitad que escritorio (o al revés) | 30 visitas en cada dispositivo | ámbar / azul |
| Fuente con visitas y ninguna consulta | 25 visitas de esa fuente | ámbar |
| Sección que retiene ≥ 45 s pero la ve ≤ 30 % | 10 visitas en la sección | azul |
| Formulario que se abandona (enviados ÷ empezados < 40 %) | 10 inicios | ámbar |
| Ventana de 3 horas con ≥ 25 % de las visitas | 50 visitas | azul |
| Tasa de cierre | 5 consultas ganadas o perdidas | verde si ≥ 30 %, ámbar si no |

### Detalle por página

`GET /api/analytics/page?path=<ruta>&days=<7|30|90>` devuelve, para una sola ruta: visitas, vistas,
tiempo leyendo, secciones (con alcance relativo a las visitas de esa página), scroll, clics, fuentes,
dispositivos, consultas y visitas por día. La ruta se valida con la misma regla que la ingesta
(`SITE_PATH_RE`): otra cosa responde 400.

### Alerta en Inicio

El centro de operaciones (`GET /api/dashboard`) devuelve `web_leads: { new, unattended_24h }` y agrega una
alerta roja cuando hay consultas con más de 24 h sin respuesta, o una azul cuando solo hay nuevas. Los
inversionistas no acceden ni al inicio del equipo ni a la analítica.

### Resumen semanal de tráfico

La automatización `resumen_semanal_trafico` (`server/automations.mjs`, categoría «Resumen») manda cada lunes a
las 8:00 de Costa Rica (hora ajustable en `/automatizaciones`) un aviso a la administración y a los socios
activos, en el buzón y por push, con:

- las visitas de los últimos 7 días y su variación frente a los 7 anteriores (lo mismo que muestra «7 días» en
  Tráfico del sitio al abrirlo ese lunes);
- las consultas nuevas de esos 7 días y cuántas siguen «nuevas» sin que nadie las contacte, lleguen cuando
  lleguen;
- la mejor y la peor página según su veredicto (engancha > normal > mucho tráfico, poca acción > rebote;
  «pocos datos» no compite);
- la primera recomendación de `buildInsights` («Qué hacer»).

Las cifras salen de `computeAnalytics` (`server/analytics.mjs`), la misma función que responde
`GET /api/analytics`. No se envía si no hubo visitas ni consultas en esos 7 días, y sale una sola vez por
semana (deduplicación `traffic-week:<lunes>`): «Probar ahora» después del envío responde que ya salió. Si el
portal estuvo apagado todo el lunes, esa semana no se envía. Los colaboradores y los inversionistas no lo
reciben.

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
  - 5 consultas y 120 lotes de eventos cada 10 minutos por IP, y 12 consultas por IP al día. Cambiar de
    navegador no da un cupo nuevo;
  - tope diario de consultas (`PORTAL_MAX_DAILY_LEADS`, 300 por defecto) y de eventos
    (`PORTAL_MAX_DAILY_EVENTS`, 200.000 por defecto);
  - un reenvío desde la misma visita en 10 minutos completa la consulta en vez de duplicarla. No cambia el
    nombre ni el mensaje original: lo nuevo queda como nota y las marcas de revisión se suman.
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
5. **El Excel exportado neutraliza fórmulas.** Todas las celdas van entre comillas. Una celda que empieza
   con `=`, `+`, `-` o `@`, aunque tenga espacios antes o vaya después de un separador, se guarda como texto.
6. **El aviso push** lleva el nombre y la necesidad, nunca el mensaje libre.

## Configuración

- **Portal (Railway):** no hace falta nada nuevo. Las tablas se crean solas al arrancar (migración 13).
  Variables opcionales:
  - `PORTAL_SITE_ORIGINS`: otros orígenes del sitio, separados por comas;
  - `PORTAL_MAX_DAILY_LEADS`: el tope diario de consultas.
  - `PORTAL_MAX_DAILY_EVENTS`: el tope diario de eventos de navegación.
- **Sitio (GitHub Pages):** usa `VITE_PORTAL_URL` (por defecto `https://portal.jcanalytic.com`). Para
  apuntar la medición a otra dirección existe `VITE_PORTAL_INGEST_URL`.

## Pruebas

- `npm test` → `tests/leads.test.mjs`: limpieza, trampas, límites, CORS, bandeja, permisos, analítica y que
  nada de esto pase por MCP; `tests/analytics.test.mjs`: periodo anterior y variaciones, veredictos por página,
  mapa de horas en hora de Costa Rica, CTA por sección, embudo de consultas, reglas de recomendaciones,
  detalle por página y la alerta de consultas en el inicio; `tests/api-v3.test.mjs`: el resumen semanal de
  tráfico sale el lunes a la hora, una sola vez por semana, con las cifras, no sale sin datos y no llega a
  colaboradores ni inversionistas.
- `npm run e2e:web`: en un navegador real, llega una consulta hostil por `/ingest` y el equipo la trabaja
  (contacto, nota, estado, cliente). Además revisa el tablero de tráfico en escritorio y celular:
  recomendaciones, variación, páginas con veredicto y su detalle, mapa de horas, CTA por sección y embudo de
  consultas, sin desbordes horizontales.
- En el sitio, `npm run check:site` verifica dos cosas:
  - que la medición mande secciones, scroll, clics y formularios sin datos personales;
  - que «Prefiero que me contacten» llegue con los datos correctos.
