# JC Analytics

Sitio bilingüe: inglés en `/`, español en `/es/`. El selector de idioma vive en la barra de navegación y ambas versiones se generan como HTML estático para buscadores.

```sh
npm ci
npm run dev
```

Antes de publicar: `npm run lint`, `npm run build`, `npm run check:tools` y `npm run check:site`. El build necesita el Chromium de Puppeteer y debe generar 28 rutas de inicio, servicios e ideas en ambos idiomas. El catálogo contiene ocho artículos, dos de ellos con recursos prácticos locales. Ver [SEO, idiomas y publicación](docs/seo-and-languages.md) para mantenimiento, pruebas y pasos de Search Console.

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

## Ejemplos y recursos públicos

La sección de ejemplos utiliza conceptos e ilustraciones originales. No muestra proyectos, capturas, dominios ni resultados identificables de clientes. Los enlaces conducen a servicios y artículos propios.

Las capturas históricas se conservan fuera de `public/`, en el archivo local ignorado `_scripts/archive-public-assets/` de la raíz del repositorio. No deben copiarse a los recursos de publicación. La documentación visual pública omite prompts y detalles internos de producción.
