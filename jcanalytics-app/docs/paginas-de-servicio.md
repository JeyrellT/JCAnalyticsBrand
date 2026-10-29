# Páginas de servicio: oferta, calculadora y consulta al portal

28 de octubre de 2026.

Las cuatro páginas de servicio (`/servicios/…` y `/en/services/…`) concentran la mayor parte de las visitas que
no llegan a la portada. Además del contenido editorial (cuándo tiene sentido, qué definimos, qué traer), cada una
muestra ahora una oferta concreta y da dos caminos para convertir la lectura en una consulta: WhatsApp con el
mensaje armado, o «prefiero que me contacten», que deja la consulta en el portal del equipo.

## Qué ve la persona

En este orden, con su `id` (lo usa el índice de la página y la medición del portal):

| Bloque | `id` | Qué hace |
| --- | --- | --- |
| Precio y paquete | `oferta` | Paquete principal con precio publicado, plazo, soporte, opción con IA y un segundo paquete «de otra escala». Botón «Lo quiero · WhatsApp». |
| ¿Es para vos? | `senales` | Cinco situaciones habituales con casillas. El veredicto cambia según cuántas se marcan y lo marcado viaja en el mensaje. |
| Calculadora de impacto | `calculadora` | Con los números de la persona (veces, minutos, personas, costo por hora) calcula horas al mes, costo al año y en cuántos meses de ese costo se cubre el paquete. |
| Qué incluye | `incluye` | Alcance, opción con IA, exclusiones, soporte mensual y agregados con precio, tomados del tarifario compartido. |
| Cómo trabajamos | `como-trabajamos` | Primera conversación sin costo, precio fijo por escrito, avances cada 72 h en el portal de clientes y 30 días de soporte. Enlace al portal de clientes. |
| Un ejemplo real | `ejemplo` | Pantalla real de un proyecto del estudio, con enlace al explorador de la portada (`/?proyecto=<id>#trabajo`) y al sitio si es público. |
| Preguntas frecuentes | `preguntas-servicio` | Cuatro respuestas por servicio en `<details>` nativos. |
| Formulario corto | `contacto-servicio` | Nombre opcional, WhatsApp o correo y mensaje. «Continuar en WhatsApp» o «Prefiero que me contacten». |

En celular y tableta aparece una barra fija (`barra-cta`) con el precio, WhatsApp y «Que me contacten» cuando la
oferta deja de verse. En escritorio, la tarjeta del índice (`indice-cta`) cumple ese papel.

Todo el bloque comparte estado: lo que se marca en «¿Es para vos?» y lo que se calcula se agrega al mensaje de
WhatsApp y al texto de la consulta que llega al portal. La calculadora es una estimación con los números de la
persona; el texto lo dice y no promete ahorros.

## De dónde salen los datos

- **Precios, plazos, alcances, exclusiones y agregados:** `portal/shared/service-pricing.js`. Es la misma fuente
  del cotizador, de los paquetes de la portada y del portal. Si un precio cambia ahí, cambia en todas partes.
- **Texto de venta por servicio:** `src/content/service-offers.js` (`SERVICE_OFFERS`). Por servicio: los dos
  paquetes (`packages`), el proyecto y la pantalla del ejemplo (`example`), los campos y la fórmula de la
  calculadora (`calculator`) y, en `es` y `en`, señales, títulos de la calculadora y preguntas frecuentes.
  `WORK_PROMISES` tiene los compromisos de «Cómo trabajamos» y `EXTRA_LABELS_EN` las etiquetas en inglés de los
  agregados (el tarifario solo las tiene en español).
- **Proyectos y capturas:** `src/data/projects.js` (ver [proyectos reales](proyectos-reales.md)).
- **Componentes:** `src/components/site/ServiceSales.jsx`; el índice en `src/components/site/service-outline.js`;
  estilos en `src/styles/service-offer.css`. `JournalApp.jsx` los intercala con las secciones editoriales.

Para agregar un servicio con oferta basta una entrada nueva en `SERVICE_OFFERS` con el mismo `id` del servicio
en `src/content/services.js`. Sin entrada, la página se muestra como antes (solo contenido editorial).

## Qué llega al portal

- **Consulta:** `POST /ingest/lead` con `channel: 'devolucion'`, la necesidad del servicio (`need`, en español),
  el nombre del paquete principal (`package`), la página (`page`) y el mensaje con lo marcado y lo calculado.
  Aparece en **Web → Consultas** con su recorrido.
- **Medición:** cada bloque es una `<section id>`, así que el portal muestra tiempo y alcance por bloque en
  **Web → Tráfico del sitio**. Los botones llevan `data-track-label` legible («Oferta · WhatsApp · Automatización
  de procesos», «Barra · Que me contacten»…), y la barra fija declara su sección con `data-track-section`. El
  formulario se mide como `contacto-servicio`.
- **Anuncios:** los botones de WhatsApp llevan `data-package` y `data-value`, así que Google Ads, Meta y ChatGPT
  reciben el paquete y su precio como en la portada (ver [anuncios](anuncios.md)).

## Verificación

`npm run check:site` comprueba, para cada página de servicio y en los dos idiomas:

- sin JavaScript: el precio y el paquete en el HTML estático, las cinco señales, el resultado de la calculadora,
  alcance y exclusiones iguales al tarifario, el enlace al portal de clientes, la captura real, las preguntas
  nativas, el formulario propio y los enlaces del índice;
- con JavaScript (automatización de procesos, 1440 y 390 px): marcar una señal cambia el veredicto y el mensaje,
  cambiar la calculadora cambia las horas y el mensaje, «Prefiero que me contacten» exige contacto y envía la
  consulta con la necesidad, el paquete, la página y el texto marcado, y la barra fija aparece en celular.

Los envíos al portal se responden dentro de la prueba; ningún mensaje sale a internet.

## Lo que no se afirma

No hay testimonios, cifras de clientes ni promesas de resultados. La calculadora muestra el costo del trabajo
manual con los números que escribe la persona y en cuántos meses de ese costo se cubre el paquete; no estima un
ahorro ni un retorno garantizado.
