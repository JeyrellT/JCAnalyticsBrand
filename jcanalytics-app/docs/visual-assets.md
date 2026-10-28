# Recursos visuales de JC Analytics

La portada muestra proyectos reales con capturas de pantalla de cada sistema (`public/projects/`, ver [proyectos-reales.md](proyectos-reales.md)). Las ilustraciones conceptuales se reservan a los artículos y a las páginas de servicio.

## Recursos públicos

- `public/projects/<proyecto>/<pantalla>-desktop.webp`: capturas reales de sistemas construidos por el
  estudio (datos de demostración). Son la portada de cada artículo y servicio (`image` en
  `src/content/*.js`); el pie de foto nombra el proyecto (`coverCredit()` en `src/JournalApp.jsx`).
- `public/marketing/`: piezas publicadas para clientes (La Burrada, Transporte Luz de Luna, Maison Valcour)
  y anuncios propios, usadas en la sección de marketing.
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

| Artículo o servicio | Portada real |
| --- | --- |
| Webs que ayudan a decidir · Desarrollo web | Menú en línea de La Burrada |
| Calidad de datos · Business intelligence | Analítica de ventas de La Burrada |
| Indicadores para decidir | Análisis gerencial de CAVIQ |
| Adoptar software | Tablet de cocina de La Burrada |
| Revisión humana en IA | Centro de análisis de Soporte 2.0 |
| Primera automatización · Automatización de procesos | Venta de mostrador de Multiagencia Gutiérrez |
| Comparar dos listas | Inventario de Multiagencia Gutiérrez |
| Evitar acciones duplicadas | Factura electrónica de Crimson Consulting |
| Mejora continua 2026 | Orquesta del taller de Maison Valcour |
| Automatizar sin tecnología | Mi taller de Soporte 2.0 |
| Congreso CICR | Vista general de CAVIQ |
| Agentes de IA y acceso | Alertas por rol de Transporte Luz de Luna |
| Integración de IA | Inicio del panel de Crimson Consulting |

Las portadas muestran sistemas reales con datos de demostración: no contienen información de clientes ni resultados medidos.
