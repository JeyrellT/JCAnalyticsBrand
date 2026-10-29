# Estrategia de conversión por dispositivo

29 de octubre de 2026.

## Resumen

El sitio ya traía clics baratos (Google Ads: CTR 19,6 % y USD 1,12 por clic; Meta: CPC USD 0,45) pero casi
ninguna consulta medida. Las causas estaban en el sitio y en la medición, no en las pujas:

- La única conversión que llegaba a Google Ads era el clic a un enlace de WhatsApp. La mitad de los clics de
  la campaña de Google venían de computadora, donde ese enlace abre WhatsApp Web (exige sesión iniciada con el
  teléfono) y mucha gente abandona. Ni Google ni Meta se enteraban de los formularios: «Prefiero que me
  contacten» y el formulario de las páginas de servicio no enviaban ningún evento a las plataformas.
- Un clic a WhatsApp es intención, no una consulta. En celular es el camino natural; en computadora era el
  único camino y el peor.

La regla nueva es una sola: **en celular, WhatsApp; en computadora, un formulario corto que deja la consulta
en el portal del equipo.** La conversión que se le reporta a Google Ads, Meta y ChatGPT Ads es la consulta
aceptada por el portal (persona con WhatsApp o correo), además del clic a WhatsApp en celular.

## Qué ve la persona

**Celular y tableta (puntero táctil).** Igual que antes: «Lo quiero · WhatsApp», «Cotizar por WhatsApp» y
el botón flotante abren WhatsApp con el mensaje armado. «Prefiero que me contacten» sigue dejando la consulta
en el portal y, novedad, ahora cuenta como consulta captada en las tres plataformas.

**Computadora (mouse).** Los mismos botones cambian de texto («Lo quiero», «Pedir cotización», «Escribinos»)
y, al hacer clic, abren el formulario corto en lugar de WhatsApp Web:

1. El mensaje que habría ido a WhatsApp (paquete, precio, señales marcadas, calculadora, de qué anuncio vino)
   ya está escrito en el formulario; la persona solo deja su WhatsApp o correo (uno de los dos) y, si quiere,
   su nombre.
2. Al enviar, la consulta llega a **Web → Consultas** del portal con canal «Paquete con precio» (si venía de
   un botón de paquete) o «Formulario de contacto», la necesidad del servicio, la página y el dispositivo.
3. Quien sí usa WhatsApp Web tiene el enlace «Prefiero WhatsApp Web» a la vista, antes y después de enviar.
   Ese enlace es directo y cuenta como clic a WhatsApp, como siempre.

El formulario de contacto de la portada y el de las páginas de servicio también cambian de botón principal en
computadora: «Enviar consulta» manda; «Seguir en WhatsApp Web» queda como alternativa. Si la persona no deja
contacto, se le pide; nunca se abre WhatsApp Web sin avisar.

«Computadora» es un navegador cuyo puntero principal es fino y tiene *hover* (`(hover: hover) and
(pointer: fine)`): laptops y escritorios, con o sin pantalla táctil secundaria. Los navegadores automatizados
(prerender, pruebas) se tratan como celular para que el HTML estático no cambie; las pruebas fuerzan el modo
computadora redefiniendo `navigator.webdriver`.

## Qué recibe cada plataforma

- **Clic a WhatsApp en celular** (o enlace directo en computadora): Google Ads conversión «Clic WhatsApp»
  + evento `contact_click`; Meta `Contact`; ChatGPT `lead_created`. Sin cambios.
- **Clic a WhatsApp en computadora** (abre el formulario corto): Google `contact_click` con `cta_mode: form`,
  sin conversión; Meta `Contact`; ChatGPT nada. Es intención, todavía no consulta.
- **Consulta aceptada por el portal** (formulario corto, «Prefiero que me contacten», formulario de contacto
  en computadora, formulario de la página de servicio): Google Ads conversión «Envío de formulario» con el
  valor del paquete (o USD 10) + evento `lead_submit`; Meta `Lead` con el paquete y su precio; ChatGPT
  `lead_created`.
- **Celular, formulario de contacto con WhatsApp o correo escrito**: abre WhatsApp (cuenta «Clic WhatsApp»)
  y además deja la consulta en el portal (Meta `Lead`, sin segunda conversión de Google).

Las plataformas nunca reciben nombre, teléfono, correo ni texto libre: solo canal, sección, paquete, idioma y
fuente del tráfico. La consulta completa vive únicamente en el portal.

### La acción «Envío de formulario» en Google Ads

Mientras la cuenta no tenga una acción propia para formularios, los envíos cuentan en «Clic WhatsApp», así
ninguna consulta queda fuera del aprendizaje de la campaña. Para separarlas:

1. Google Ads → Objetivos → Conversiones → Nueva acción → Sitio web → «Enviar formulario de clientes
   potenciales» → objetivo **Contactos**, acción **principal**, contar **una por clic**, valor USD 10 (o «usar
   valores diferentes» para recibir el precio del paquete que el sitio ya envía).
2. Copiar la **etiqueta** de la acción: lo que va después de `AW-18237462818/` en el `send_to`.
3. En GitHub: Settings → Secrets and variables → Actions → Variables → `ADS_FORM_LABEL` = esa etiqueta. El
   siguiente deploy (`deploy.yml` la pasa como `VITE_ADS_FORM_LABEL`) empieza a enviar la conversión nueva.
   Localmente, la misma variable va en `.env`.
4. La acción «Enviar formulario de clientes potenciales» que hoy aparece **Inactiva** se puede borrar o
   reutilizar como esta misma acción; lo que importa es que el `send_to` del sitio coincida con su etiqueta.

## Qué cambió en el código

- `src/hooks/useDesktop.js`: la regla de dispositivo, en un solo lugar.
- `src/components/ui/LeadDialog.jsx` + `src/styles/lead-dialog.css`: el formulario corto. Se monta una vez
  para todo el sitio (`main.jsx`) e intercepta los enlaces `wa.me` en computadora; `data-wa-direct` los deja
  pasar (pie de página, asistente, enlaces «Prefiero WhatsApp Web»). El formulario se mide como
  `contacto-rapido` en el portal.
- `src/seo/analytics.js`: dos funciones en vez de un listener implícito. `trackContactIntent` (clic a
  WhatsApp, correo, teléfono) y `trackLeadCaptured` (consulta aceptada por el portal). La etiqueta de la
  conversión de formulario sale de `VITE_ADS_FORM_LABEL`, con «Clic WhatsApp» como respaldo.
- `Contact.jsx`, `ServiceSales.jsx`, `Packages.jsx`, `Hero.jsx`, `Work.jsx`: textos y botón principal según
  dispositivo; `data-need` y `data-package-label` en los botones de paquete para que la consulta llegue al
  portal con necesidad y paquete legibles; `data/packages.js` declara la necesidad de cada paquete.
- `src/components/site/contact-rules.js`: validación de teléfono y correo compartida (antes duplicada), igual
  a la del portal.
- Portal: `FORM_NAMES` reconoce `contacto-rapido` en el recorrido y en Tráfico. La ingesta no cambió: el
  canal `paquete` ya existía y la consulta trae `device`, así que la bandeja ya muestra celular/escritorio.
- `.github/workflows/deploy.yml`: pasa `vars.ADS_FORM_LABEL` al build.

## Cómo saber si funciona

**Portal → Web → Tráfico del sitio** (periodo de 7 días):

- Formularios: `contacto-rapido` empezados contra enviados. Objetivo: al menos la mitad de quienes lo abren lo
  envían. Si es menos, el mensaje prellenado o el pedido de contacto está asustando: probar con el campo de
  mensaje plegado.
- Dispositivos: tasa de CTA y consultas de escritorio contra celular. Antes, escritorio no dejaba consultas
  medibles; en dos semanas debería dejar al menos tantas por visita como celular.
- ¿Qué CTA convierte?: las secciones `paquetes`, `oferta`, `indice-cta` y `contacto` deberían aparecer con
  consultas, no solo con clics.

**Google Ads**, a los 30–50 clics con el seguimiento validado:

- Conversiones > 0 en «Clic WhatsApp» (celular) y en «Envío de formulario» (computadora). Si computadora
  sigue en cero con 20 clics de ese dispositivo, revisar en Tag Assistant que el hit salga al enviar el
  formulario (abrir el sitio directo, sin pasar por el anuncio, para no ensuciar la campaña).
- Costo por consulta objetivo: USD 11–24 (1 consulta cada 10–20 clics). Con 5–10 consultas por semana ya se
  puede cambiar la puja a «Maximizar conversiones»; antes no.
- Presupuesto: no subirlo hasta tener ese costo por consulta. El 80 % de impresiones perdidas por presupuesto
  garantiza que, cuando se suba, llega más tráfico del mismo tipo.

**Meta**: optimizar el conjunto de anuncios por `Lead` (ahora sí es una consulta real) o mantener `Contact`
si el volumen de `Lead` es menor a 10 por semana. Verificar en Eventos de prueba que `Lead` llega al enviar el
formulario corto.

## Validación técnica

`npm run check:site` cubre, en español e inglés:

- Celular/automatizado (como antes): los botones abren WhatsApp; el formulario de contacto abre WhatsApp y
  registra «Clic WhatsApp»; «Prefiero que me contacten» exige contacto, deja la consulta en el portal y ahora
  se verifica que dispare `lead_submit`, una conversión de Google Ads, `Lead` en Meta y `lead_created` en
  ChatGPT sin datos personales.
- Computadora (`navigator.webdriver` forzado en `false`): «Lo quiero» abre el formulario corto sin salir de la
  página ni abrir WhatsApp Web; el clic se registra como intención (`cta_mode: form`) sin conversión; sin
  contacto no se envía nada; con contacto la consulta llega con canal `paquete`, paquete, necesidad, página y
  mensaje, y la conversión sale con el valor del paquete; el enlace «Prefiero WhatsApp Web» queda disponible;
  el formulario de contacto envía al portal en vez de abrir WhatsApp Web; un enlace `data-wa-direct` no abre
  el formulario y cuenta como clic a WhatsApp; en la página de servicio la consulta lleva la necesidad, el
  paquete y las señales marcadas.

Ningún envío sale a internet durante las pruebas: el portal se responde en la misma prueba y las plataformas
de anuncios se reemplazan por registros en memoria.

## Supuestos y límites

- La regla de dispositivo es una heurística de puntero. Una tableta con mouse verá el formulario; una laptop
  táctil con mouse también. En ambos casos WhatsApp Web sigue a un clic.
- El respaldo de la etiqueta de conversión hace que, hasta configurar `ADS_FORM_LABEL`, celular y computadora
  cuenten en la misma acción «Clic WhatsApp». Es intencional: antes se contaba menos, no más.
- Dos conversiones de Google Ads en menos de 3 s se deduplican (un doble clic no cuenta dos veces).
- El mensaje que viaja en la consulta se recorta a 600 caracteres, el límite del portal.
- No se afirma un aumento de conversiones: lo que cambia es que ahora se pueden medir y que computadora deja
  de depender de WhatsApp Web. La evidencia saldrá del portal y de Google Ads en las próximas dos semanas.
