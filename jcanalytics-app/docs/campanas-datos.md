# Campañas: datos exactos para cargar en cada plataforma

3 de noviembre de 2026. Todo lo que está aquí sale del código del sitio (`index.html`, `src/seo/analytics.js`,
`src/seo/attribution.js`, `src/data/packages.js`, `src/content/services.js`) y del tarifario compartido
`portal/shared/service-pricing.js`. Si un precio o una página cambia ahí, hay que actualizar la campaña.

## Qué cambió en el sitio el 3 de noviembre de 2026

- El cotizador en vivo (`/#cotizar`) salió de la portada. Un anuncio o enlace que todavía apunte a
  `https://www.jcanalytic.com/#cotizar` abre la portada arriba, sin error, pero no muestra ningún cotizador.
  Reemplazá esos destinos por la página de la categoría (tabla siguiente).
- El hero de la portada muestra pantallas reales de proyectos dentro de una laptop (computadora) o de un
  teléfono (celular). No cambia ninguna URL ni ningún evento de medición.
- Los precios publicados siguen en la portada (`/#paquetes`) y en cada página de servicio, que además tiene
  la calculadora con los números de la persona, las señales «¿es para vos?» y el formulario corto.

## 1. URL de destino por categoría

| Categoría | URL final (español) | URL final (inglés) | Paquete principal de la página | Segundo paquete |
| --- | --- | --- | --- | --- |
| Webs y sistemas | `https://www.jcanalytic.com/servicios/desarrollo-web-costa-rica/` | `https://www.jcanalytic.com/en/services/web-development-costa-rica/` | Web con reservas · $570 | Software a medida · $540 |
| Automatización | `https://www.jcanalytic.com/servicios/automatizacion-de-procesos/` | `https://www.jcanalytic.com/en/services/business-process-automation/` | Automatización de procesos · $165 | Excel y reportes · $60 |
| Finanzas y dashboards | `https://www.jcanalytic.com/servicios/dashboards-power-bi-costa-rica/` | `https://www.jcanalytic.com/en/services/power-bi-dashboards-costa-rica/` | Dashboard inicial · $135 | Power BI de gestión · $240 |
| Inteligencia artificial | `https://www.jcanalytic.com/servicios/integracion-ia-costa-rica/` | `https://www.jcanalytic.com/en/services/ai-integration-costa-rica/` | Asistente de IA documental · $420 | Chatbot de atención · $180 |
| Marketing | `https://www.jcanalytic.com/servicios/marketing-digital-costa-rica/` | `https://www.jcanalytic.com/en/services/digital-marketing-costa-rica/` | Sin paquete (botón a WhatsApp) | — |
| Portada (genérica) | `https://www.jcanalytic.com/` | `https://www.jcanalytic.com/en/` | Seis destacados en `#paquetes` | — |

Desde el 10 de noviembre de 2026 cada página acepta `?p=<paquete>` para abrir en un paquete que no sea el
principal (por ejemplo `/servicios/desarrollo-web-costa-rica/?p=crm` para CRM comercial inicial, o `?p=inventario`).
La tabla completa de paquetes por página está en [anuncios](anuncios.md).

Precios en USD, pago único, IVA aparte. Las páginas de servicio disparan además `ViewContent` (Meta) y
`contents_viewed` (ChatGPT); la portada no.

## 2. Parámetro `?p=` (solo en la portada)

Pone ese paquete primero en `#paquetes`, lo marca «El que viste en el anuncio» y arma el mensaje de WhatsApp
con ese paquete. En la primera pantalla aparece el nombre sin precio (acuerdo del 31 de octubre de 2026).

| Paquete | Precio | `p=` (cualquiera de estos valores) |
| --- | --- | --- |
| Web con reservas | $570 | `web`, `pagina`, `sitio`, `reservas`, `website` |
| Software a medida | $540 | `software`, `sistema`, `app` |
| Automatización de procesos | $165 | `automatizacion`, `automation`, `automate`, `procesos` |
| Dashboard inicial | $135 | `dashboard`, `reporte`, `kpi` |
| Power BI de gestión | $240 | `powerbi`, `bi`, `gestion` |
| Asistente de IA documental | $420 | `ia`, `ai`, `asistente`, `documentos` |
| Chatbot de atención | $180 | `chatbot`, `bot`, `atencion` |
| Excel y reportes automatizados | $60 | `excel`, `vba`, `reportes` |
| CRM comercial inicial | $270 | `crm`, `ventas`, `clientes` |
| Inventario inicial | $390 | `inventario`, `bodega`, `stock` |

El sitio lee, en este orden, `p`, `paquete` y `utm_content`. Ojo con Meta: si `utm_content={{ad.name}}` y
el anuncio se llama exactamente `web`, `ia`, `crm`, `bot`, etc., la portada preselecciona ese paquete. Usá
nombres de anuncio que no coincidan con un alias (por ejemplo `web-video-1`) salvo que lo quieras así.

## 3. Parámetros de URL por plataforma (copiar tal cual)

**Google Ads** — sufijo de URL final (cuenta o campaña), con el parámetro personalizado `{_campaign}` definido
en cada campaña (por ejemplo `web-nov`):

```
utm_source=google&utm_medium=cpc&utm_campaign={_campaign}
```

Con el seguimiento automático, Google agrega `gclid` (o `gbraid`/`wbraid`); el sitio lo reconoce aunque falte
`utm_source`. URL final del anuncio: la página de la categoría, por ejemplo
`https://www.jcanalytic.com/servicios/desarrollo-web-costa-rica/`.

**Meta Ads** — parámetros de URL del anuncio:

```
utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

Meta agrega `fbclid` solo. El sitio también reconoce `utm_source` con `facebook`, `instagram`, `fb`, `ig` o
`meta`.

**ChatGPT Ads** — ChatGPT agrega `utm_source=chatgpt.com`. Si la plataforma lo permite, sumá
`&utm_campaign=<nombre>`; también se reconoce `openai` como fuente.

Ejemplo completo (Meta, categoría web, español):

```
https://www.jcanalytic.com/servicios/desarrollo-web-costa-rica/?utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

La fuente y la campaña se guardan 30 días en el navegador de la persona (`jc_attr`), sin datos personales.
Por eso el WhatsApp termina con «(Vi el anuncio en Google · web-nov)» aunque la persona vuelva otro día sin
pasar por el anuncio, y la consulta del portal trae fuente, campaña y dispositivo.

## 4. Identificadores y eventos de cada píxel

| Plataforma | Identificador | Dónde vive |
| --- | --- | --- |
| Google Ads (gtag) | `AW-18237462818` | `index.html` |
| Conversión «Clic WhatsApp» | `AW-18237462818/5C2RCMSwvaIdEKKypvhD` · valor fijo $10 | `src/seo/analytics.js` |
| Conversión «Envío de formulario» | Etiqueta pendiente: variable `ADS_FORM_LABEL` en GitHub (Settings → Variables). Mientras no exista, cuenta en «Clic WhatsApp» con el precio del paquete o $10 | `deploy.yml` → `VITE_ADS_FORM_LABEL` |
| Meta Pixel «JC Analytics - Web» | `2307996859950052` | `index.html` |
| Verificación de dominio Meta | `lgrz3qhw170u8dhn1s2k1ti2qnr76r` | `index.html` |
| ChatGPT Ads pixel | `CbYXHw9JHB8KahpH3ayu1Z` · todavía con `debug: true` | `index.html` |

Qué recibe cada plataforma por acción (sin nombres, teléfonos, correos ni texto libre):

| Acción | Google Ads | Meta | ChatGPT |
| --- | --- | --- | --- |
| Visita | `config` | `PageView` | `page_viewed` |
| Página de servicio | — | `ViewContent` (`content_category: service`) | `contents_viewed` |
| Clic a WhatsApp en celular (o enlace directo en computadora) | conversión «Clic WhatsApp» $10 + evento `contact_click` | `Contact` (`content_name` = paquete o canal, `value` = precio) | `lead_created` |
| Clic a WhatsApp en computadora (abre el formulario corto) | solo `contact_click` con `cta_mode: form` | `Contact` | — |
| Consulta aceptada por el portal (formulario corto, «Prefiero que me contacten», formularios de contacto y de servicio) | conversión «Envío de formulario» con el precio del paquete (o $10) + evento `lead_submit` | `Lead` (`content_name`, `value`) | `lead_created` |

Parámetros de los eventos `contact_click` y `lead_submit` en Google: `contact_channel` (whatsapp, email,
phone), `cta_mode` (form), `form_id`, `site_language` (es, en), `section_id` (sección de la página, por
ejemplo `paquetes`, `oferta`, `contacto`), `traffic_source` (Google, Meta, ChatGPT o directo), `package_id`,
`package_value` y `contact_line` (a o b). Sirven para segmentar en Google Ads o GA4 sin tocar el código.

## 5. Líneas de WhatsApp y mensajes

| Línea | Número | Quién la ve |
| --- | --- | --- |
| `a` | +506 7033 0596 | La mitad de las visitas (sorteo 50/50 al primer ingreso, se conserva en visitas siguientes) |
| `b` | +506 8864 6581 | La otra mitad |

Para probar una línea: `?wa_line=a` o `?wa_line=b` en cualquier URL del sitio. El evento `contact_line`
dice cuál recibió cada contacto. Los mensajes van prearmados, por ejemplo:

```
Hola JC Analytics, me interesa el paquete Web con reservas ($570 + IVA).
¿Me confirman si calza con mi caso y qué necesitan para empezar?

(Vi el anuncio en Google · web-nov)
```

En computadora los mismos botones abren el formulario corto en lugar de WhatsApp Web y la consulta llega al
portal (ver [estrategia de conversión](estrategia-conversion.md)).

## 6. Dónde revisar resultados

- **Portal → Web → Consultas**: cada consulta con canal, necesidad, paquete, página, dispositivo, fuente y
  campaña.
- **Portal → Web → Tráfico del sitio** (7 días): formularios empezados contra enviados, tasa de CTA por
  dispositivo y qué sección convierte.
- **Google Ads**: conversiones en «Clic WhatsApp» (celular) y «Envío de formulario» (computadora, cuando
  exista la etiqueta). Las metas de costo por consulta y el criterio para cambiar la puja están en
  [estrategia de conversión](estrategia-conversion.md).

## 7. Pendientes en las plataformas (no en el código)

1. Google Ads: crear la acción «Envío de formulario» y cargar su etiqueta en `ADS_FORM_LABEL` (pasos en
   [anuncios](anuncios.md)).
2. ChatGPT Ads: cuando lleguen `page_viewed` y `lead_created` al Ads Manager, pasar `debug` a `false` en
   `index.html`.
3. Meta: optimizar por `Lead` cuando haya al menos 10 por semana; mientras, por `Contact`.
4. Revisar en cada plataforma que ninguna URL final siga apuntando a `/#cotizar`.
