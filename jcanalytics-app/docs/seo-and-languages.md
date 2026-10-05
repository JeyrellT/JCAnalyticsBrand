# SEO e idiomas

La URL determina el idioma. El inicio en inglés vive en `https://www.jcanalytic.com/`; la variante española, en `https://www.jcanalytic.com/es/`. El selector visible EN/ES usa enlaces reales, conserva parámetros y fragmentos y lleva a la traducción del mismo contenido. No se redirige automáticamente por ubicación, cookies ni idioma del navegador.

## Las 28 rutas públicas

| Contenido | Inglés | Español | Total |
| --- | --- | --- | --- |
| Inicio | `/` | `/es/` | 2 |
| Índice editorial | `/insights/` | `/es/ideas/` | 2 |
| Ocho guías | `/insights/{slug}/` | `/es/ideas/{slug}/` | 16 |
| Cuatro servicios | `/services/{slug}/` | `/es/servicios/{slug}/` | 8 |

`src/content/catalog.js` reúne el contenido y `src/seo/routes.js` genera las rutas y sus equivalencias. El catálogo es la fuente para el prerender y el sitemap: al agregar una guía o servicio completo en ambos idiomas se incorporan sus dos documentos. Las 28 rutas corresponden al catálogo actual.

## Implementación

- `src/i18n/locale.js` conserva los textos con `t(es, en)`. Los valores internos de servicios, anchors, precios y tasas se mantienen estables.
- `src/seo/site.js` genera título, descripción, canonical propio, alternates `en`, `es` y `x-default`, Open Graph y Twitter por página. Las descripciones del inicio invitan a explorar servicios e ideas; los ejemplos conceptuales visibles no se presentan como proyectos de clientes.
- El JSON-LD describe Organization, WebSite y WebPage. Cada guía individual tiene Article, autoría de JC Analytics como organización y su fecha editorial real. Los servicios tienen Service y el índice editorial, CollectionPage e ItemList. Las páginas interiores incluyen BreadcrumbList. No se agregan reseñas, resultados, dirección exacta ni fechas comerciales inventadas.
- La FAQ de inicio comparte su contenido con el módulo SEO; no se utiliza como promesa de resultados enriquecidos.
- `vite.config.js` aplica el SEO de la ruta también en desarrollo. `scripts/prerender.mjs` guarda HTML completo para las 28 páginas y detiene el build ante errores o contenido incompleto. El HTML conserva también las hojas de estilos locales cargadas por los módulos de cada ruta, para mantener el diseño sin JavaScript. La generación bloquea solicitudes externas y analítica.
- El sitemap incluye las 28 URLs canónicas, sus variantes recíprocas y `x-default` al contenido equivalente en inglés. Solo los artículos aportan fechas de publicación o modificación verificables.
- `public/robots.txt` permite rastreo e indica el sitemap. `public/404.html` contiene `noindex`; en producción no se usa un fallback SPA que convierta rutas inexistentes en páginas válidas.
- La animación decorativa 3D se carga después de la prioridad inicial en escritorio. En móvil y con movimiento reducido se conserva la figura SVG sin cargar Three.js.
- `src/seo/analytics.js` registra `contact_click` con canal, idioma y sección en la etiqueta Google existente. Representa intención de contacto, no una venta ni un mensaje confirmado. No envía nombre, email ni contenido libre del formulario.

## Descubrimiento en funciones de IA

El contenido importante queda disponible como texto HTML, enlazado desde el sitio y asociado a una URL estable. Los títulos, preguntas, referencias públicas y datos estructurados describen el mismo contenido que ve la persona. Son recursos para comprender las páginas; no incorporan afirmaciones de clientes ni instrucciones ocultas dirigidas a asistentes.

Según Google, AI Overviews y AI Mode usan los fundamentos habituales de SEO. Una página debe estar indexada y ser elegible para mostrarse con un fragmento en Google Search; no se exige un archivo especial de IA ni un tipo adicional de schema.org. Cumplirlo no garantiza rastreo, indexación, selección como fuente ni aparición en una respuesta. Este proyecto no trata `llms.txt` como requisito de Google ni como mecanismo para asegurar menciones. [Referencia oficial de Google sobre funciones de IA](https://developers.google.com/search/docs/appearance/ai-features).

El tráfico de esas funciones se integra en el tipo de búsqueda Web del informe de rendimiento de Search Console. Un clic registrado por la web no identifica por sí solo qué experiencia de búsqueda lo originó. [Medición y controles de funciones de IA](https://developers.google.com/search/docs/appearance/ai-features).

Para ChatGPT, `OAI-SearchBot` es el rastreador de búsqueda; `GPTBot` corresponde al posible uso de contenido para entrenar modelos. Son controles independientes: permitir búsqueda no exige permitir entrenamiento. El `User-agent: *` con `Allow: /` actual permite ambos; no constituye una exclusión del entrenamiento. `ChatGPT-User` realiza visitas iniciadas por usuarios y no determina la elegibilidad de ChatGPT Search. [Documentación oficial de los agentes de OpenAI](https://developers.openai.com/api/docs/bots).

Para Claude, `Claude-SearchBot` ayuda al buscador y `Claude-User` recupera páginas a petición de personas; `ClaudeBot` es el agente relacionado con entrenamiento. La regla global actual permite estos tres agentes. Anthropic documenta controles independientes mediante `robots.txt`. [Documentación oficial de los rastreadores de Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler).

Estas reglas permiten el acceso desde el sitio, pero no demuestran que cada agente lo haya rastreado. Tampoco garantizan indexación, selección como fuente, citas o recomendaciones de JC Analytics en ChatGPT o Claude. Las reglas de acceso del alojamiento también deben permitir las solicitudes legítimas.

## Desarrollo y verificación

```sh
npm ci
npm run dev
npm run lint
npm run build
npm run check:tools
npm run check:site
```

Puppeteer está declarado y fijado en el lockfile. Si el entorno bloquea scripts de instalación o carece de Chromium, instalarlo con `npx puppeteer browsers install chrome` antes del build. La compilación requiere navegador y no publica silenciosamente una SPA vacía.

El prerender comprueba un h1 por página. Para inicio requiere contacto y seis preguntas frecuentes; para páginas interiores, `#main-content` con más de 800 caracteres. `check:site` revisa el HTML estático, idiomas, metadatos, selector, móvil, imágenes y los flujos de contacto y cotización, sin enviar mensajes. También prueba los dos recursos prácticos en inglés y español a 390 y 1440 px: comparación de listas, escenarios de reintento y descargas, sin enviar datos de entrada a red o analítica. Las tarjetas, los grids adaptables y los controles de ambas herramientas se comprueban también con JavaScript desactivado.

GitHub Actions ejecuta lint, build y comprobaciones para pull requests dirigidos a `main`, pushes a `main` y ejecuciones manuales. Los pull requests no suben artefactos de Pages, configuran Pages ni despliegan. Esos pasos se limitan a un push a `main` o una ejecución manual sobre `main`; los permisos de publicación pertenecen al job de despliegue. Las ejecuciones de PR tienen grupos de concurrencia distintos del despliegue de producción.

## Después de publicar

1. Comprobar el HTML inicial y el acceso directo a inicio, índices, guías y servicios en ambos idiomas, incluidos enlaces e imágenes.
2. En Search Console, enviar `https://www.jcanalytic.com/sitemap.xml` e inspeccionar URLs representativas de los cuatro tipos de página. La verificación de propiedad y la solicitud de indexación requieren acceso a la cuenta y no quedan realizadas por editar código.
3. Revisar consultas, impresiones, clics e intención de contacto por idioma. Evaluar Core Web Vitals con datos de usuarios reales cuando estén disponibles; las pruebas locales no son mediciones de campo.
4. Mantener servicios, precios, traducciones y referencias actualizados. Documentar fechas editoriales reales y revisar la privacidad antes de incorporar contenido. La guía `docs/content-publication.md` describe el mantenimiento del catálogo.
5. La configuración remota de GitHub Pages se verificó en modo de despliegue por rama (`build_type: legacy`). El intento de cambiarla a `workflow` no fue aceptado por la API con el acceso disponible; la fuente no se considera corregida. La espera heredada de 150 segundos se conserva por compatibilidad hasta completar y verificar ese cambio. La espera no sustituye la configuración correcta de Pages.

Las posiciones, la indexación y la adquisición de clientes dependen también del contenido, la competencia, los enlaces, el mercado y el seguimiento comercial.

## Referencias oficiales

- [Sitios multilingües de Google](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Versiones de idioma y hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [SEO para JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Datos estructurados Article](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Workflows personalizados de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
