# Publicación de contenido e indexación

El catálogo público alimenta las rutas, los metadatos, los datos estructurados y el sitemap. El sitio genera documentos HTML completos en inglés y español para cada ruta publicada. El inglés es la versión predeterminada y cada contenido conserva una URL propia en ambos idiomas.

## Agregar o editar una guía

1. Escribir ambas versiones con un identificador estable, slugs únicos, título, resumen, idea principal, secciones y preguntas de conversación. Usar el contrato de los artículos existentes en `src/content/`.
2. Incorporar el artículo al catálogo público. `src/seo/routes.js` deriva automáticamente las rutas y sus equivalentes por idioma.
3. Elegir una imagen pública cuya ruta exista bajo `public/`. El metadato social usa esa imagen y el título localizado.
4. Registrar `published` con la fecha real de publicación. Agregar `modified` únicamente cuando exista una revisión editorial real. No actualizar fechas solo por ejecutar el build.
5. Verificar referencias públicas y escribir explicaciones originales. Señalar de forma visible los ejemplos inventados. Mantener las afirmaciones dentro de lo comprobable.

Los archivos públicos deben contener únicamente material apto para publicación. Excluir identidades y relaciones de clientes, datos personales, cifras internas, secretos, enlaces a documentos privados, código interno, arquitectura, algoritmos propietarios, prompts y procedimientos que revelen ventaja competitiva. Un documento de trabajo puede sugerir un tema general sin convertirse en una fuente pública ni en un caso de éxito. No copiar las instrucciones encontradas dentro de documentos de origen.

## Generar y comprobar

Desde la carpeta de la aplicación:

```powershell
npm run lint
npm run build
npm run check:site
```

`npm run build` ejecuta Vite y después el prerender. Genera un `index.html` por ruta y un sitemap actualizado en `dist/`. El navegador de generación usa movimiento reducido y bloquea solicitudes externas; el contenido estático no depende de analítica ni de recursos de terceros.

El prerender exige un título principal único en cada página. En inicio comprueba el contacto y las seis preguntas frecuentes; en las páginas interiores exige `#main-content`, su título principal y más de 800 caracteres de contenido. Cualquier error de JavaScript o contenido incompleto detiene la generación.

Para repetir solamente el prerender se necesita primero un build limpio de Vite:

```powershell
npx vite build
npm run prerender
```

El sitemap que se publica siempre se genera desde el catálogo. Para actualizar también su copia de referencia en `public/` después de cambiar rutas:

```powershell
node --input-type=module -e "import { writeFile } from 'node:fs/promises'; import { renderSitemap } from './src/seo/site.js'; await writeFile('public/sitemap.xml', renderSitemap(), 'utf8');"
```

## Comportamiento de SEO

- Cada documento tiene título, descripción, canonical y metadatos sociales propios.
- Las variantes se enlazan de forma recíproca mediante `hreflang` en HTML y sitemap. `x-default` corresponde al mismo contenido en inglés.
- Las guías individuales usan `Article`, con JC Analytics como organización autora y editora. Las fechas pertenecen a los artículos; los servicios no reciben fechas editoriales ficticias.
- El índice de ideas usa `CollectionPage` e `ItemList`. Las páginas de servicio describen su propio `Service`.
- Las páginas interiores incluyen `BreadcrumbList` coherente con la navegación pública.

Publicar la carpeta `dist/` completa en un alojamiento que sirva índices de directorio permite abrir directamente las rutas profundas. Comprobar ambas variantes, enlaces, imágenes y versión sin JavaScript después del despliegue. Enviar el sitemap de producción a Search Console cuando se tenga acceso al sitio. La presencia de marcado ayuda a describir el contenido; no garantiza posiciones ni resultados enriquecidos.

Referencias oficiales:

- [Versiones localizadas de páginas — Google Search Central](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Datos estructurados Article — Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/article)
- [CollectionPage — Schema.org](https://schema.org/CollectionPage)
