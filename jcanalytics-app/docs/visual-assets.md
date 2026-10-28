# Recursos visuales de JC Analytics

La portada muestra proyectos reales con capturas de pantalla de cada sistema (`public/projects/`, ver [proyectos-reales.md](proyectos-reales.md)). Las ilustraciones conceptuales se reservan a los artículos y a las páginas de servicio.

## Recursos públicos

- `public/images/journal/data.webp`: ilustración editorial para datos y decisiones.
- `public/images/journal/systems.webp`: ilustración editorial para sistemas y experiencia web.
- `public/images/journal/intelligence.webp`: ilustración editorial para inteligencia artificial.
- `public/artwork/`: ilustraciones abstractas y recursos SVG de apoyo.
- `public/team/`: retratos del equipo propio de JC Analytics.
- `public/projects/<id>/`: capturas reales de los diez proyectos (escritorio 1600 px y móvil 640 px, WebP), tomadas con datos de demostración.

Los textos alternativos explican las ilustraciones informativas. Las imágenes decorativas no repiten el contenido del texto cercano. El movimiento respeta la preferencia de movimiento reducido.

## Publicación y privacidad

Las capturas de proyectos se toman de cada aplicación corriendo con datos de demostración o de semilla: nunca muestran clientes finales, pedidos, montos ni personas reales. Los nombres comerciales y dominios que aparecen son los de proyectos construidos por JC Analytics. No se presentan como evidencia de resultados de negocio; las cifras publicadas son del código (líneas, pruebas, endpoints), calculadas por `scripts/project-evidence.mjs`.

La herramienta `scripts/capture-sites.mjs` genera únicamente vistas previas de este sitio desde el servidor local y las guarda en el archivo privado `_scripts/archive-public-assets/`, que no forma parte de la compilación.

La documentación pública describe el uso y la procedencia conceptual de los recursos. Los prompts de producción y otros detalles internos quedan fuera del material publicable.

## Descripción de las ilustraciones

Las tres ilustraciones editoriales se crearon con la generación de imágenes integrada (`image_gen`). Comparten una dirección visual de render 3D editorial, materiales de vidrio, cobre y piedra, y composiciones sin texto, personas ni identidades de clientes. Su resolución es 1536 × 1024 píxeles. Se codificaron en WebP para publicación sin cambiar la escena.

Estas descripciones resumen los conceptos públicos; no reproducen prompts de producción ni procedimientos internos.

| Recurso público | Concepto visual | Uso editorial |
| --- | --- | --- |
| `/images/journal/systems.webp` | Tres losas de vidrio aqua translúcido, conectadas mediante una cinta de cobre y una esfera, sobre piedra caliza y fondo verde oscuro. | Sistemas conectados y experiencia digital. |
| `/images/journal/data.webp` | Lentes y prismas de color menta ordenan esferas de cobre dispersas en flujos paralelos sobre una base de piedra. | Organización de datos y lectura para decidir. |
| `/images/journal/intelligence.webp` | Una esfera luminosa de color menta, con acabado escarchado y arcos de cobre abiertos, sobre un puente de piedra. | Asistencia de IA y supervisión humana como metáfora visual. |

Son ilustraciones conceptuales: no muestran un sistema real, su arquitectura interna, información de clientes ni resultados medidos. Las formas y conexiones sirven a la narración editorial de cada tema.
