# Diseño y recorrido comercial — JC Analytics

3 de octubre de 2026.

## Dirección aplicada

Se conserva la voz del sitio: voseo costarricense, titulares editoriales y la prioridad de sistemas → finanzas y dashboards → machine learning e IA → marketing. Se aplicaron los criterios de revisión de marca y UX copy a la interfaz real, sin modificar precios ni añadir testimonios o cifras de resultados.

## Cambios de comunicación

| Antes | Cambio aplicado | Motivo |
| --- | --- | --- |
| «Hagamos algo extraordinario» en la portada | «Conversemos sobre tu proyecto» + contexto de la primera conversación | Aclara la acción y el nivel de compromiso. |
| CTA de servicios que abrían conversaciones independientes | Contacto con servicio y sección de origen seleccionados | Mantiene el contexto del visitante. |
| Portafolio orientado principalmente a visitar otros sitios | CTA por proyecto y bloque «Tu siguiente gran paso» | Ofrece un paso hacia una consulta propia después de ver evidencia. |
| «Enviar por WhatsApp» | «Continuar en WhatsApp» + explicación del borrador | Describe el comportamiento real: abre un mensaje que el visitante revisa y envía. |
| Formulario con nombre y tipo de servicio | Objetivo opcional, nombre opcional y correo con el mismo borrador | Permite explicar la necesidad sin exigir datos adicionales. |
| Contacto sin detalle del recorrido | Tres pasos y dos preguntas frecuentes | Explica cómo se plantea el alcance y resuelve dudas de entrada. |

Los compromisos de 30 minutos sin costo y el tiempo de respuesta ya estaban presentes en el sitio; no son nuevas garantías creadas para esta revisión. Las demos continúan identificadas como ilustrativas. El formulario no envía mensajes automáticamente y no tiene un backend nuevo.

## Dirección de arte

- Vidrio salvia, metal cepillado, verde profundo y acento cobre.
- Arquitectura SVG con circuitos, conectores, tornillos, superficies biseladas y capas que responden a las pestañas.
- Lente SVG de IA con bisel metálico, retícula, satélites de estado y materiales con profundidad; respeta movimiento reducido.
- Imágenes v2 más detalladas y una nueva imagen de arcos para conectar el portafolio con la invitación a iniciar un proyecto.
- Variación de arte en el calendario y el cierre del reel, evitando repetir siempre la misma composición.

## Recursos finales

- [connected-materials-v2.webp](../public/artwork/connected-materials-v2.webp): 1200 × 800, 106 514 bytes.
- [creative-orbit-v2.webp](../public/artwork/creative-orbit-v2.webp): 900 × 1350, 89 236 bytes.
- [project-gateway.webp](../public/artwork/project-gateway.webp): 1200 × 800, 66 714 bytes.
- [system-architecture-v2.svg](../public/artwork/system-architecture-v2.svg).
- [neural-atlas-v2.svg](../public/artwork/neural-atlas-v2.svg).
- [campaign-orbit-v2.svg](../public/artwork/campaign-orbit-v2.svg).

Los SVG interactivos se implementan en [StudioIllustrations.jsx](../src/components/site/StudioIllustrations.jsx); las exportaciones son versiones estáticas reutilizables. Se conservaron las imágenes y los SVG anteriores.

## Generación de imágenes

Herramienta integrada **image_gen**, mediante la habilidad **imagegen**. Las dos primeras imágenes son ediciones de los originales locales; la tercera se generó desde cero. La conversión posterior a WebP solo ajustó resolución y compresión para web.

### Prompt final — materiales v2

Use case: precise-object-edit. Edit the supplied conceptual studio image for a premium software design website. Keep the original landscape composition, pale sage setting, mint glass and chrome material identity and three main stacked modules. Refine the three glass modules into a precise exploded architectural assembly with small air gaps, elegant thin brushed titanium frames, visible delicate translucent etched circuit routing and tiny metallic connector details within the glass. Keep the dark emerald sphere beside the base but give it beautiful clear layered refraction, change the little orange ball into a small polished copper-orange glass core inside the lowest module. Preserve the hovering chrome top slab; add very precise chamfered edges and realistic fine brushed finish. More sophisticated product photography, stronger directional natural light, realistic caustics, subtly tactile floor, crisp precision, exceptional material quality. Keep the image clean and restrained, all objects fully visible, softer background, useful negative margins. No text, logos, labels, UI, watermark, wires spilling outside the objects, or neon cyberpunk effect. Landscape 3:2.

### Prompt final — órbita v2

Use case: precise-object-edit. Refine the supplied portrait artwork for a high-end independent design studio campaign. Keep the spiral chrome ribbon, emerald glass orb, warm orange glass disc, their balanced placement, dark forest backdrop and the 2:3 portrait composition. Improve material quality: slender perfectly machined ribbon edges, crisp bright silver highlights with delicate brushing, emerald glass more clear and optically layered, luminous translucent honey-coral disc with fine bubbles. Replace the rough stacked stone base with three thin precise matte sage architectural plates with softly chamfered edges, subtle radial etching and a recessed brushed aluminum seam. Add very restrained caustic light ripples on the dark floor, deeper photographic contrast, beautifully controlled spotlight from upper left, premium tactile editorial photograph. Sculpture remains fully visible with the same generous dark negative space at top for HTML overlay. No text, logos, UI, watermarks. Sophisticated, quiet, precise, no sci-fi neon.

### Prompt final — siguiente proyecto

Use case: stylized-concept. Asset type: wide editorial banner for a premium software and design studio, used beside the call to action for a new project. Landscape 3:2 image. Create a sculptural architectural portal: three nested freestanding thick arches, outer brushed silver, middle translucent pale mint glass, inner dark emerald glass, standing on three ascending matte sage rectangular steps. A single slender polished copper-orange ribbon flows gracefully through the portals and toward the foreground, visual metaphor for an idea becoming a real system. Quiet pale sage studio floor and backdrop, soft diagonal sunlight, very realistic glass refraction and fine machining detail, delicate ground caustics, soft long shadows. Beautiful museum-scale product design installation, camera three-quarter angle from slightly above, centered composition with all arches fully in frame. Sophisticated minimal object photography, material depth, no text, logos, UI, watermarks, people, or buildings.

## Cómo evaluar el cambio

El objetivo es facilitar consultas más claras; todavía no se ha medido un aumento de ventas o conversiones. Al publicar, conviene comparar visitas al contacto, aperturas del borrador y conversaciones efectivamente recibidas. Una apertura de WhatsApp no equivale a un mensaje enviado ni a una venta. No se incorporó seguimiento nuevo de datos personales.
