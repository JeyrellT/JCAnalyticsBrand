# Anuncios: cómo enlazar Google Ads, Meta Ads y ChatGPT Ads al sitio

La portada está pensada para la visita que llega de un anuncio: titular con la oferta, botón verde de WhatsApp arriba, paquetes con precio justo debajo y un botón "Lo quiero · WhatsApp" por paquete. El mensaje de WhatsApp ya va escrito y termina con la plataforma y campaña del anuncio, por ejemplo:

```
Hola JC Analytics, quiero el paquete Dashboard inicial ($135). ¿Qué necesitan para empezar?

(Vi el anuncio en Google · dashboards-oct)
```

La plataforma se recuerda 30 días en el navegador de la persona, así que si vuelve otro día sin hacer clic en el anuncio, el chat igual dice de dónde vino.

## 1. URL de destino por anuncio

Agregá `?p=<paquete>` para que ese paquete aparezca primero, marcado "El que viste en el anuncio", y el botón del hero ya pida ese paquete.

| Paquete | `p=` |
| --- | --- |
| Web con reservas ($570) | `web` |
| Dashboard inicial ($135) | `dashboard` |
| Excel y reportes ($60) | `excel` |
| Automatización ($165) | `automatizacion` |
| Chatbot de atención ($180) | `chatbot` |
| Software a medida ($540) | `software` |
| CRM ($270) | `crm` |
| Inventario ($390) | `inventario` |
| Power BI de gestión ($240) | `powerbi` |
| Asistente de IA documental ($420) | `ia` |

Los precios salen de `portal/shared/service-pricing.js`; si cambian ahí, cambian en la página y en el mensaje.

**Google Ads** (sufijo de URL final, a nivel de cuenta o campaña):

```
utm_source=google&utm_medium=cpc&utm_campaign={_campaign}
```

Con el seguimiento automático activo, Google agrega `gclid` solo; el sitio lo reconoce aunque falte `utm_source`. Definí el parámetro personalizado `{_campaign}` en cada campaña (por ejemplo `web-oct`), y en la URL final del anuncio poné `https://www.jcanalytic.com/?p=web`.

**Meta Ads** (parámetros de URL del anuncio):

```
utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

URL del sitio web: `https://www.jcanalytic.com/?p=web` (español; el inglés está en `/en/?p=web`). Meta agrega `fbclid` solo.

**ChatGPT Ads**: ChatGPT agrega `utm_source=chatgpt.com`. Usá la URL con `?p=` y, si la plataforma lo permite, `&utm_campaign=nombre`.

## 2. Qué mide cada píxel

| Acción en el sitio | Google Ads | Meta | ChatGPT |
| --- | --- | --- | --- |
| Visita | (gtag config) | `PageView` | `page_viewed` |
| Página de servicio | | `ViewContent` | `contents_viewed` |
| Cualquier clic a WhatsApp | conversión "Clic WhatsApp" ($10) + evento `contact_click` | `Contact` | `lead_created` |
| "Lo quiero" de un paquete | lo mismo + `package_id`, `package_value`, `traffic_source` | `Contact` con `content_name` = paquete, `value` = precio | `lead_created` |
| Formulario enviado | conversión | `Lead` | `lead_created` |

## 3. Pendientes de configuración (en cada plataforma, no en el código)

- **ChatGPT Ads:** el píxel sigue en `debug:true` (`index.html`). Cuando confirmes en Ads Manager que llegan `page_viewed` y `lead_created`, cambialo a `false`.
- **Google Ads:** la conversión "Clic WhatsApp" usa un valor fijo de $10. Si querés que Google puje por los paquetes más caros, cambiá la acción a "usar valores diferentes" y enviá `package_value` como valor; hacelo entre campañas para no reiniciar el aprendizaje a mitad de una.
- **Meta:** optimizá las campañas de conversión por el evento `Contact`.
- Un clic a WhatsApp es intención, no venta. Para medir ventas reales, anotá en el CRM la línea "(Vi el anuncio en …)" de cada chat que se convierte en cliente.
