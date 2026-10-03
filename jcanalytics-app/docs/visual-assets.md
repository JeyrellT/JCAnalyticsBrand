# Recursos visuales originales — JC Analytics

Fecha: 3 de octubre de 2026.

Dirección: vidrio verde, cromo, papel salvia y un acento coral; coherente con la portada «Sistemas con carácter». Se mantienen los titulares y textos principales de sistemas, IA y marketing.

## Archivos finales

- [connected-materials.webp](../public/artwork/connected-materials.webp) — 1000 × 667 px, 38 030 bytes. Imagen del ejemplo web.
- [creative-orbit.webp](../public/artwork/creative-orbit.webp) — 800 × 1200 px, 66 384 bytes. Arte del reel y del calendario.
- [system-architecture.svg](../public/artwork/system-architecture.svg) — ilustración de arquitectura por capas, versión estática reutilizable.
- [neural-atlas.svg](../public/artwork/neural-atlas.svg) — recorrido de datos, modelo y salida, versión estática reutilizable.
- [campaign-orbit.svg](../public/artwork/campaign-orbit.svg) — motivo vectorial para piezas de marketing.

Las versiones interactivas de los SVG están en [StudioIllustrations.jsx](../src/components/site/StudioIllustrations.jsx). Cambian con las pestañas y la ejecución del ejemplo de IA. Las imágenes se cargan de forma diferida; los originales generados se preservaron y las versiones para web se redimensionaron y comprimieron sin alterar su composición.

## Generación

Modo utilizado: herramienta integrada **image_gen** mediante la habilidad **imagegen**, sin CLI ni API externa configurada. No se usaron las capturas del usuario como imágenes a modificar: sirvieron para identificar las secciones. Las imágenes son conceptuales originales, no fotografías de proyectos o instalaciones reales.

### Prompt final — connected-materials

Use case: stylized-concept. Asset type: original editorial visual inside a premium software and design studio's website showcase. Create a landscape 3:2 high-end architectural still-life: a sculptural modular assembly of three stacked translucent pale mint glass cubes, one brushed silver rectangular slab floating slightly apart above them, one smoked emerald glass sphere nestled at the base, a single small warm coral-orange sphere offset foreground. Precise engineered details, beautiful refractions, subtle caustics and real shadows on a pale warm sage studio floor, muted pale sage seamless background. Architectural model photography, close three-quarter view, tactile premium materials, meticulous bevelled edges, light from upper left, sophisticated art direction. Entire assembly centered in frame with generous breathing room around its silhouette, no cropping objects. This is a conceptual image for the connection of interface, backend and data; no literal computers. No text, no typography, no logos, no UI, no watermark. Palette sage, chrome, translucent mint, one tiny orange accent. Striking realistic 3D product render with editorial quality, not cartoon.

### Prompt final — creative-orbit

Use case: stylized-concept. Asset type: portrait 2:3 editorial artwork for an original creative studio marketing reel. Create a striking tactile abstract still life, a single generous chrome ribbon curling like a fluid spiral around one translucent emerald glass orb and one smaller warm coral-orange disc, over a layered pale pistachio paper plinth. Deep ink green seamless background, dramatic controlled studio side-light, beautiful liquid silver highlights, micro-textures and believable shadows, sophisticated editorial art direction for an independent design and software studio. Main sculpture occupies center lower two-thirds, with dark green negative space at top and soft shadow falloff below so white UI text can be composited later. Slight low camera perspective. Contemporary collectible design object, highly realistic 3D render, artistic photography. Muted emerald and sage, chrome silver, orange accent. No letters, no typography, no logos, no UI, no watermark. Clean silhouette, detailed materiality, no clutter.

## SVG

Autoría mediante código SVG local, sin dependencias añadidas. Las tres exportaciones incluyen sus gradientes y geometría. El HTML adyacente conserva la descripción accesible de cada ejemplo; la ilustración decorativa no duplica la lectura del contenido. El movimiento respeta la preferencia de movimiento reducido.
