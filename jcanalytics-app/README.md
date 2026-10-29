# JC Analytics

Sitio bilingüe: español en `/`, inglés en `/en/`. El selector de idioma vive en la barra de navegación y ambas versiones se generan como HTML estático para buscadores.

```sh
npm ci
npm run dev
```

Antes de publicar: `npm run lint`, `npm run build`, `npm run check:tools` y `npm run check:site`. El build necesita el Chromium de Puppeteer y debe generar 28 rutas de inicio, servicios e ideas en ambos idiomas. El catálogo contiene ocho artículos, dos de ellos con recursos prácticos locales. Ver [SEO, idiomas y publicación](docs/seo-and-languages.md) para mantenimiento, pruebas y pasos de Search Console, y [páginas de servicio](docs/paginas-de-servicio.md) para la oferta, la calculadora y el formulario que deja consultas en el portal.

Contacto por dispositivo: en celular los botones abren WhatsApp; en computadora abren un formulario corto que deja la consulta en el portal, y la conversión de anuncios se mide al aceptarla. Regla, medición y pasos en Google Ads en [estrategia de conversión](docs/estrategia-conversion.md) y [anuncios](docs/anuncios.md).

El botón flotante de la asistente está disponible en todas las páginas. Consulta DeepSeek mediante una API privada en Railway y deriva al WhatsApp +506 7033-0596 cuando falta información o se solicita al equipo. Ejecutar también `npm run check:assistant` después del build. La configuración y el mantenimiento están en [la documentación de la API](../assistant-api/README.md). Al actualizar servicios o preguntas frecuentes, ejecutar `npm run sync:assistant` y publicar el backend actualizado.

## Base técnica: React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Proyectos reales (sección `#trabajo`)

La sección de proyectos muestra los diez repositorios que JC Analytics construye y opera, con tres evidencias por proyecto:

- **Capturas reales** en `public/projects/<id>/<pantalla>-{desktop,mobile}.webp`, tomadas de cada aplicación corriendo desde su repositorio con datos de demostración (escritorio 1440 px, móvil 390 px). El procedimiento está en [docs/proyectos-reales.md](docs/proyectos-reales.md).
- **Fragmentos de código** copiados textualmente de cada repositorio (`src/data/projectCode.js`), con la ruta del archivo.
- **Cifras calculadas** por `node scripts/project-evidence.mjs`, que recorre los repositorios hermanos y escribe `src/data/projects.evidence.json` (líneas, archivos, commits, páginas, endpoints, modelos, migraciones y pruebas). Volver a ejecutarlo cuando cambien los repositorios; el JSON se versiona para que el build no dependa de ellos.

Los textos de cada proyecto viven en `src/data/projects.js`. Describen lo que cada sistema hace hoy; no se afirman resultados de negocio que el cliente no haya publicado. Las ilustraciones conceptuales de `public/images/journal/` siguen reservadas a los artículos y servicios.
