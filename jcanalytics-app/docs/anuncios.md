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

El sitio distingue dos cosas: la **intención** (tocar WhatsApp, correo o teléfono) y la **consulta captada**
(la persona dejó WhatsApp o correo y el portal del equipo la aceptó). En celular los botones abren WhatsApp;
en computadora abren un formulario corto, porque WhatsApp Web exige sesión iniciada y ahí se perdían las
consultas. Detalle y criterios en [estrategia de conversión](estrategia-conversion.md).

| Acción en el sitio | Google Ads | Meta | ChatGPT |
| --- | --- | --- | --- |
| Visita | (gtag config) | `PageView` | `page_viewed` |
| Página de servicio | | `ViewContent` | `contents_viewed` |
| Clic a WhatsApp en celular (o enlace directo en computadora) | conversión "Clic WhatsApp" ($10) + evento `contact_click` | `Contact` | `lead_created` |
| "Lo quiero" de un paquete en celular | lo mismo + `package_id`, `package_value`, `traffic_source` | `Contact` con `content_name` = paquete, `value` = precio | `lead_created` |
| Clic a WhatsApp en computadora (abre el formulario corto) | solo `contact_click` con `cta_mode: form` | `Contact` | — |
| Consulta aceptada por el portal (formulario corto, "Prefiero que me contacten", formulario de contacto en computadora, formulario de la página de servicio) | conversión "Envío de formulario" con el precio del paquete (o $10) + evento `lead_submit` | `Lead` con `content_name` = paquete o formulario, `value` = precio | `lead_created` |
| Formulario de contacto en celular con WhatsApp o correo escrito | "Clic WhatsApp" (abre WhatsApp); la consulta también queda en el portal | `Contact` + `Lead` | `lead_created` (una sola) |

Nunca viajan nombres, teléfonos, correos ni texto libre: solo canal, sección, paquete, idioma y fuente.

### Conversión "Envío de formulario" en Google Ads

Mientras no exista una acción propia, los envíos de formulario cuentan en "Clic WhatsApp" (la etiqueta de
respaldo). Para separarlos:

1. Objetivos → Conversiones → Nueva acción → Sitio web → "Enviar formulario de clientes potenciales" → objetivo
   **Contactos**, acción **principal**, contar **una por clic**, valor $10 o "usar valores diferentes" (el sitio
   envía el precio del paquete).
2. Copiá la **etiqueta**: lo que sigue a `AW-18237462818/` en el `send_to` de la acción.
3. GitHub → Settings → Secrets and variables → Actions → Variables → `ADS_FORM_LABEL` = esa etiqueta. El
   siguiente deploy la compila como `VITE_ADS_FORM_LABEL` (`deploy.yml`). En local va en `.env`.
4. Verificá con Tag Assistant entrando al sitio directo (sin pasar por el anuncio): en computadora, "Lo quiero"
   → formulario → "Enviar consulta" debe disparar el hit con la etiqueta nueva; con emulación de celular, el
   mismo botón abre WhatsApp y dispara "Clic WhatsApp".

## 3. Pendientes de configuración (en cada plataforma, no en el código)

- **Google Ads:** crear la acción "Envío de formulario" y definir `ADS_FORM_LABEL` (arriba). La acción
  "Enviar formulario de clientes potenciales" que figura **Inactiva** se puede reutilizar para esto.
- **Google Ads:** la conversión "Clic WhatsApp" usa un valor fijo de $10. Si querés que Google puje por los paquetes más caros, cambiá la acción a "usar valores diferentes" y enviá `package_value` como valor; hacelo entre campañas para no reiniciar el aprendizaje a mitad de una.
- **ChatGPT Ads:** el píxel sigue en `debug:true` (`index.html`). Cuando confirmes en Ads Manager que llegan `page_viewed` y `lead_created`, cambialo a `false`.
- **Meta:** optimizá las campañas de conversión por `Lead` (consulta real) cuando haya al menos 10 por semana; mientras, por `Contact`.
- Un clic a WhatsApp es intención, no venta. Para medir ventas reales, anotá en el CRM la línea "(Vi el anuncio en …)" de cada chat que se convierte en cliente. Las consultas que entran por formulario ya traen fuente, campaña y dispositivo en el portal.
