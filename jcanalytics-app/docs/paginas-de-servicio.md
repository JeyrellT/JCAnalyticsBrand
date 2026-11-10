# Páginas de servicio: oferta, calculadora y consulta al portal

28 de octubre de 2026.

Las páginas de servicio (`/servicios/…` y `/en/services/…`; cinco desde noviembre de 2026, incluida marketing digital sin oferta) concentran la mayor parte de las visitas que
no llegan a la portada. Además del contenido editorial (cuándo tiene sentido, qué definimos, qué traer), cada una
muestra ahora una oferta concreta y da dos caminos para convertir la lectura en una consulta: WhatsApp con el
mensaje armado, o «prefiero que me contacten», que deja la consulta en el portal del equipo.

## Qué ve la persona

En este orden, con su `id` (lo usa el índice de la página y la medición del portal):

| Bloque | `id` | Qué hace |
| --- | --- | --- |
| Precio y paquete | `oferta` | Paquete con precio publicado, plazo, soporte y opción con IA. Por defecto el primero de la categoría; con `?p=<paquete>` (enlace de una tarjeta de la portada o de un anuncio) o con `utm_content` igual a la clave o a un alias del paquete, ese (misma regla que la portada: `adPackage` en `data/packages.js`). Al lado, los demás paquetes de la categoría («Ver este paquete» cambia la oferta sin recargar). Botón «Lo quiero · WhatsApp». |
| ¿Es para vos? | `senales` | Cinco situaciones habituales con casillas. El veredicto cambia según cuántas se marcan y lo marcado viaja en el mensaje. |
| Calculadora de impacto | `calculadora` | Con los números de la persona (veces, minutos, personas, costo por hora) calcula horas al mes, costo al año y en cuántos meses de ese costo se cubre el paquete. |
| Qué incluye | `incluye` | Alcance, opción con IA, exclusiones, soporte mensual y agregados con precio, tomados del tarifario compartido. |
| Cómo trabajamos | `como-trabajamos` | Primera conversación sin costo, precio fijo por escrito, avances cada 72 h en el portal de clientes y 30 días de soporte. Enlace al portal de clientes. |
| Un ejemplo real | `ejemplo` | Pantalla real de un proyecto del estudio, con enlace al explorador de la portada (`/?proyecto=<id>#proyecto`) y al sitio si es público. |
| Preguntas frecuentes | `preguntas-servicio` | Cuatro respuestas por servicio en `<details>` nativos. |
| Formulario corto | `contacto-servicio` | Nombre opcional, WhatsApp o correo y mensaje. «Continuar en WhatsApp» o «Prefiero que me contacten». |

En celular y tableta aparece una barra fija (`barra-cta`) con el precio, WhatsApp y «Que me contacten» cuando la
oferta deja de verse. En escritorio, la tarjeta del índice (`indice-cta`) cumple ese papel.

**Computadora.** Los botones de WhatsApp cambian de texto («Lo quiero», «Pedir cotización») y abren el
formulario corto (`src/components/ui/LeadDialog.jsx`, medido como `contacto-rapido`) con el mensaje ya armado;
la persona deja su WhatsApp o correo y la consulta llega al portal con canal «Paquete con precio», la
necesidad del servicio y el paquete. En el formulario de la página, «Enviar consulta» pasa a ser el botón
principal y «Seguir en WhatsApp Web» queda como enlace directo. Ver [estrategia de conversión](estrategia-conversion.md).

**Marketing** no tiene paquete de precio fijo (el plan mensual se arma con cada negocio). Desde el 10 de
noviembre de 2026 muestra bajo el titular un bloque propio (`contacto-servicio`) con el precio «desde» que ya
publicaba el texto y el botón «Armemos mi plan de marketing»; «Hablemos» apunta a ese bloque.

Todo el bloque comparte estado: lo que se marca en «¿Es para vos?» y lo que se calcula se agrega al mensaje de
WhatsApp y al texto de la consulta que llega al portal. La calculadora es una estimación con los números de la
persona; el texto lo dice y no promete ahorros.

## De dónde salen los datos

- **Precios, plazos, alcances, exclusiones y agregados:** `portal/shared/service-pricing.js`. Es la misma fuente
  de los paquetes de la portada y del portal. Si un precio cambia ahí, cambia en todas partes.
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

- **Consulta:** `POST /ingest/lead` con `channel: 'devolucion'`, la necesidad del paquete (`need`, en español:
  la misma con la que llega desde su tarjeta de la portada), el nombre del paquete en el tarifario (`package`),
  la página (`page`) y el mensaje con lo marcado y lo calculado. Aparece en **Web → Consultas** con su recorrido.
- **Mensaje:** el mismo de las tarjetas de la portada (`packageMessage`): «Hola JC Analytics, me interesa el
  paquete … ($… + IVA).», las señales marcadas, lo calculado, «¿Me confirman si calza con mi caso?» y la línea
  abierta «Mi negocio:» (o la frase de «Tu caso en una frase», si la persona la armó en la portada). El portal
  corta los mensajes en 600 caracteres: se mide el mensaje tal como sale (con la nota del anuncio) y se deja
  lugar para lo que la persona escriba del negocio; si con todo marcado no entra, las situaciones viajan por
  número («Me pasan las situaciones 1, 2 y 4 de las 5 de esta página.») en vez de cortarse.
- **Formulario:** el aviso dice qué campo corregir y lleva el foco ahí; al enviar, una confirmación con los tres
  pasos que siguen reemplaza al formulario y queda a la vista.
- **Medición:** cada bloque es una `<section id>`, así que el portal muestra tiempo y alcance por bloque en
  **Web → Tráfico del sitio**. Los botones llevan `data-track-label` legible («Oferta · WhatsApp · Automatización
  de procesos», «Barra · Que me contacten»…), y la barra fija declara su sección con `data-track-section`. El
  formulario se mide como `contacto-servicio`. Cada señal marcada llega con la clave de su página (`Señal ·
  web-development · 2 · sí`): la señal 2 es una frase distinta en cada servicio.
- **Anuncios:** los botones de WhatsApp llevan `data-package` (la clave del tarifario, igual que en la portada)
  y `data-value`, así que Google Ads, Meta y ChatGPT reciben el paquete y su precio como en la portada (ver
  [anuncios](anuncios.md)).

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

## Demo interactiva por servicio (2 de noviembre de 2026)

Las demos que vivían en la portada (sistemas, finanzas y dashboards, machine learning e IA, y marketing con
piezas reales) se muestran ahora dentro de la página de su servicio, entre la portada y el índice, con la misma
dirección de arte (`src/components/site/ServiceDemo.jsx`, cargado solo en esas páginas; la lista está en
`service-demos.js`). Sus botones de contacto llevan al formulario corto de la página cuando hay oferta y, en
marketing, a WhatsApp con el mensaje armado (`contact-target.js`). La página de marketing digital no tiene
oferta en `SERVICE_OFFERS`: muestra el contenido editorial, la demo y los precios publicados del cotizador.
