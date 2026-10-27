# Libro amarillo

Directorio de prospección por teléfono: los negocios a los que el equipo llama para ofrecer servicios.
Ruta `/libro-amarillo` (menú **Empresa**, "Más" en el celular y Ctrl/⌘ K).

## Quién lo usa

Todo el equipo con sesión (admin, socios y colaboradores) ve y edita el libro. Los inversionistas y los
clientes no tienen acceso. No es público a propósito: los datos incluyen celulares de dueños de negocio
(Ley 8968) y un directorio editable sin login se puede borrar o ensuciar.

## Flujo de la persona que llama

1. **Hoy toca llamar** muestra las llamadas de hoy y las atrasadas (no contesta, volver a llamar, interesado).
2. Busca por nombre, teléfono, cantón, tipo de comida u observación; filtra por estado, provincia, cantón,
   "Míos" (asignados a mí) o "Toca hoy". El índice A–Z filtra por la inicial.
3. Abre la ficha, toca el teléfono (marca con +506) o WhatsApp.
4. Marca cómo terminó la llamada, escribe qué pasó y, si aplica, la fecha de la próxima llamada.
   Cada llamada queda en el historial del contacto y en la Bitácora. Quien llama queda como responsable
   si nadie lo tenía.
5. **Observaciones** es el campo permanente del contacto ("el dueño atiende después de las 3 p. m.").

Estados: Por llamar, No contesta, Volver a llamar, Interesado, Ya es cliente, No interesado, Número malo.
Los tres cierres (cliente, no interesado, número malo) borran la próxima llamada.

## Importar un Excel

Botón **Importar Excel** (o Ctrl K → "Importar contactos al libro amarillo").

- Acepta `.xlsx` y `.csv` (separador `;` o `,`). Lee la hoja "Contactos" o "Libro amarillo"; si no existe, la primera.
- Busca la fila de encabezados en las primeras 15 filas, así que un título arriba no estorba.
- Encabezados reconocidos (sin importar tildes ni mayúsculas): Nombre del negocio, Tipo de comida, Provincia,
  Cantón, Distrito, Dirección / referencia, Teléfono, Teléfono 2, WhatsApp, Redes sociales (o Facebook e
  Instagram por separado), Sitio web, Fuente, Oportunidad, Estado, Observaciones, Próxima llamada.
  Los demás se ignoran. "Descargar plantilla" baja un CSV con las columnas.
- Varios números en una celda se reparten: el 1.º es el principal, el 2.º el alterno, el resto va a observaciones.
  Si solo hay WhatsApp, ese número es también el de llamar.
- Vista previa antes de importar: contactos listos, sin teléfono y filas omitidas (sin nombre o repetidas en el archivo).
- **Sin duplicados:** el teléfono principal (8 dígitos) es la llave. Si el negocio ya está, solo se completan los
  campos vacíos; el estado, las observaciones y el responsable que puso el equipo nunca se pisan.
- Se envía por partes de 40 filas (el servidor acepta hasta 100 por envío y 64 kB por petición).
- **Deshacer importación** (quien la hizo o el admin): borra los contactos que creó ese archivo y que nadie ha
  llamado. Los que ya se trabajaron se conservan.

El lector de `.xlsx` (`src/lib/xlsx.js`) no tiene dependencias: descomprime con `DecompressionStream` y solo
lee valores. Se evitó el paquete `xlsx` de npm (sin mantenimiento y con avisos de seguridad); la CSP del
portal tampoco permite cargarlo de un CDN. No lee `.xls` (Excel 97-2003): pide guardarlo como `.xlsx`.

## Exportar

**Descargar** baja `libro-amarillo-AAAA-MM-DD.csv` con separador `;`, BOM UTF-8 y fórmulas neutralizadas,
incluyendo estado, observaciones, último comentario, número de llamadas y responsable.

## Reglas del servidor (`server/routes/directory.mjs`)

| Ruta | Acceso | Qué hace |
|---|---|---|
| `GET /api/directory` | equipo | Contactos, últimas 12 importaciones y la fecha de hoy (Costa Rica) |
| `GET /api/directory/:id` | equipo | Contacto con sus últimas 100 llamadas |
| `POST /api/directory` | equipo | Alta; 409 `duplicate` si el teléfono ya existe |
| `PATCH /api/directory/:id` | equipo | Edición; con `expected_revision` responde 409 `conflict` si alguien guardó antes |
| `DELETE /api/directory/:id` | admin, o quien lo creó si nadie lo ha llamado | Borra con su historial |
| `POST /api/directory/:id/calls` | equipo | Registra una llamada y actualiza estado, último comentario y próxima llamada |
| `POST /api/directory/import` | equipo | Importa una parte; la primera crea la importación, las siguientes envían `import_id` (misma persona, 2 h) |
| `DELETE /api/directory/imports/:id` | admin o quien importó | Deshace la importación |
| `GET /api/directory/export.csv` | equipo | Exportación a Excel |

Tablas (migración 12): `directory_entries`, `directory_calls` y `directory_imports`. `phone_key` guarda los
8 dígitos del teléfono principal para detectar duplicados; `revision` sube con cada cambio (bloqueo optimista).

## Verificación

```sh
npm test            # incluye tests/directory.test.mjs: teléfonos, encabezados, CSV, .xlsx real, API, permisos
npm run lint
npm run build
```
