// ============================================================================
//  server/routes/directory.mjs
//  Libro amarillo: directorio de prospección en frío (negocios a los que el
//  equipo llama para ofrecer servicios). Todo el equipo lo ve y lo edita; cada
//  llamada queda en el historial del contacto y en la bitácora.
//
//  Reglas:
//  - Un teléfono es único: importar el mismo número dos veces no duplica, completa
//    los datos vacíos del contacto existente y nunca pisa estado ni observaciones.
//  - Ediciones concurrentes: cada cambio sube `revision`; el PATCH acepta
//    `expected_revision` y, si alguien guardó antes, responde 409 con el contacto
//    vigente (bloqueo optimista).
//  - Borrar: el admin siempre; quien lo creó, solo si nadie lo ha llamado todavía.
//  - Una importación se puede deshacer: se borran solo los contactos que ella creó
//    y que nadie ha trabajado (sin llamadas y "Por llamar").
// ============================================================================

import { DIRECTORY_STATUS, DIRECTORY_FIELDS, IMPORT_MAX_ROWS, cleanPhone, phoneKey, fold } from '../../shared/directory.js';
import { fail, invalid, has, text, oneOf, id, dateOnly } from '../http.mjs';
import { transaction } from '../schema.mjs';

const EDITABLE = Object.keys(DIRECTORY_FIELDS);
const PHONE_FIELDS = new Set(['phone', 'phone_alt', 'whatsapp']);
/** Una importación por partes sigue abierta (acepta más filas) durante esta ventana. */
const IMPORT_WINDOW_MS = 2 * 3_600_000;

export function directoryRoutes(route, ctx) {
  const { db } = ctx;

  const SELECT = `SELECT d.*, u.name assigned_name, u.color assigned_color, c.name created_by_name
    FROM directory_entries d LEFT JOIN users u ON u.id = d.assigned_to LEFT JOIN users c ON c.id = d.created_by`;
  const getEntry = (entryId) => db.prepare(`${SELECT} WHERE d.id = ?`).get(entryId) ?? fail(404, 'not_found');

  const assignable = (userId) => {
    if (userId == null) return null;
    if (!db.prepare("SELECT 1 FROM users WHERE id = ? AND active = 1 AND role <> 'inversionista'").get(userId)) invalid('assigned_to', 'Persona no encontrada.');
    return userId;
  };

  /** Valida un campo de texto del contacto; los teléfonos se guardan con formato "8888-0000". */
  function field(key, value) {
    const v = text(value, key, { max: DIRECTORY_FIELDS[key], ...(key === 'name' ? { min: 2, required: true } : {}) });
    return PHONE_FIELDS.has(key) ? cleanPhone(v) : v;
  }

  /** Otro contacto con el mismo teléfono principal (o, sin teléfono, mismo nombre y cantón). */
  function findDuplicate(entry, exceptId = 0) {
    if (entry.phone_key) {
      return db.prepare('SELECT id, name FROM directory_entries WHERE phone_key = ? AND id <> ? LIMIT 1').get(entry.phone_key, exceptId) ?? null;
    }
    return db.prepare('SELECT id, name, canton FROM directory_entries WHERE phone_key IS NULL AND id <> ?').all(exceptId)
      .find((r) => fold(r.name) === fold(entry.name) && fold(r.canton) === fold(entry.canton)) ?? null;
  }

  function readBody(body, current = null) {
    const out = {};
    for (const key of EDITABLE) {
      if (has(body, key)) out[key] = field(key, body[key]);
      else out[key] = current ? current[key] : null;
    }
    if (!out.name) invalid('name', 'Campo requerido.');
    if (has(body, 'status')) out.status = oneOf(body.status, 'status', DIRECTORY_STATUS, { required: true });
    else out.status = current?.status ?? 'pendiente';
    if (has(body, 'assigned_to')) out.assigned_to = current && body.assigned_to === current.assigned_to ? current.assigned_to : assignable(id(body.assigned_to, 'assigned_to'));
    else out.assigned_to = current?.assigned_to ?? null;
    if (has(body, 'next_call_at')) out.next_call_at = dateOnly(body.next_call_at, 'next_call_at');
    else out.next_call_at = current?.next_call_at ?? null;
    out.phone_key = phoneKey(out.phone);
    return out;
  }

  const COLUMNS = [...EDITABLE, 'status', 'assigned_to', 'next_call_at', 'phone_key'];
  const insertEntry = (e, userId, importId = null) => {
    const at = ctx.nowIso();
    return Number(db.prepare(`INSERT INTO directory_entries (${COLUMNS.join(', ')}, import_id, created_by, created_at, updated_at)
      VALUES (${COLUMNS.map(() => '?').join(', ')}, ?, ?, ?, ?)`).run(...COLUMNS.map((k) => e[k] ?? null), importId, userId, at, at).lastInsertRowid);
  };

  // ── Lectura ───────────────────────────────────────────────────────────────
  route('GET', '/api/directory', 'user', () => {
    const entries = db.prepare(`${SELECT} ORDER BY d.name COLLATE NOCASE, d.id`).all();
    const imports = db.prepare(`SELECT i.*, u.name user_name,
        (SELECT COUNT(*) FROM directory_entries d WHERE d.import_id = i.id) still_linked
      FROM directory_imports i LEFT JOIN users u ON u.id = i.user_id ORDER BY i.created_at DESC, i.id DESC LIMIT 12`).all();
    return { entries, imports, today: ctx.today() };
  });

  route('GET', '/api/directory/:id', 'user', ({ params }) => {
    const entry = getEntry(params.id);
    const calls = db.prepare(`SELECT k.*, u.name user_name, u.color user_color FROM directory_calls k
      LEFT JOIN users u ON u.id = k.user_id WHERE k.entry_id = ? ORDER BY k.created_at DESC, k.id DESC LIMIT 100`).all(entry.id);
    return { entry, calls };
  });

  // ── Alta, edición y baja ──────────────────────────────────────────────────
  route('POST', '/api/directory', 'user', ({ user, body }) => {
    const e = readBody(body);
    const dup = findDuplicate(e);
    if (dup) fail(409, 'duplicate', { field: 'phone', message: `Ya está en el libro: ${dup.name}.`, entry_id: dup.id });
    const entryId = insertEntry(e, user.id);
    ctx.log(user.id, 'directory', entryId, 'created', `${user.name} agregó ${e.name} al libro amarillo`);
    return { entry: getEntry(entryId) };
  });

  route('PATCH', '/api/directory/:id', 'user', ({ user, body, params }) => {
    const current = db.prepare('SELECT * FROM directory_entries WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    if (body.expected_revision != null && Number(body.expected_revision) !== current.revision) {
      fail(409, 'conflict', { message: 'Alguien más guardó cambios en este contacto. Revisá la versión actual.', entry: getEntry(current.id) });
    }
    const e = readBody(body, current);
    const dup = e.phone_key !== current.phone_key || fold(e.name) !== fold(current.name) ? findDuplicate(e, current.id) : null;
    if (dup) fail(409, 'duplicate', { field: 'phone', message: `Ese teléfono ya es de ${dup.name}.`, entry_id: dup.id });
    db.prepare(`UPDATE directory_entries SET ${COLUMNS.map((k) => `${k} = ?`).join(', ')}, revision = revision + 1, updated_at = ? WHERE id = ?`)
      .run(...COLUMNS.map((k) => e[k] ?? null), ctx.nowIso(), current.id);
    const changes = [];
    if (e.status !== current.status) changes.push(`estado → ${DIRECTORY_STATUS[e.status].label}`);
    if (e.assigned_to !== current.assigned_to) changes.push('reasignado');
    ctx.log(user.id, 'directory', current.id, 'updated', `${user.name} editó ${e.name} en el libro amarillo${changes.length ? ` (${changes.join(', ')})` : ''}`);
    return { entry: getEntry(current.id) };
  });

  route('DELETE', '/api/directory/:id', 'user', ({ user, params }) => {
    const current = db.prepare('SELECT * FROM directory_entries WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    const own = current.created_by === user.id && current.call_count === 0;
    if (user.role !== 'admin' && !own) fail(403, 'forbidden', { message: 'Solo la administración borra contactos ya trabajados. Marcalo como "Número malo" o "No interesado".' });
    db.prepare('DELETE FROM directory_entries WHERE id = ?').run(current.id);
    ctx.log(user.id, 'directory', current.id, 'deleted', `${user.name} borró ${current.name} del libro amarillo`);
    return { ok: true };
  });

  // ── Llamadas ──────────────────────────────────────────────────────────────
  route('POST', '/api/directory/:id/calls', 'user', ({ user, body, params }) => {
    const current = db.prepare('SELECT * FROM directory_entries WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    const outcome = oneOf(body.outcome, 'outcome', DIRECTORY_STATUS, { required: true });
    if (outcome === 'pendiente') invalid('outcome', 'Elegí cómo terminó la llamada.');
    const note = text(body.note, 'note', { max: 1000 });
    const next = dateOnly(body.next_call_at, 'next_call_at');
    if (next && next < ctx.today()) invalid('next_call_at', 'La próxima llamada no puede quedar en el pasado.');
    const at = ctx.nowIso();
    transaction(db, () => {
      db.prepare('INSERT INTO directory_calls (entry_id, user_id, outcome, note, created_at) VALUES (?, ?, ?, ?, ?)').run(current.id, user.id, outcome, note, at);
      // Un cierre (cliente, no interesado, número malo) ya no lleva próxima llamada.
      const keepsNext = ['no_contesta', 'volver_a_llamar', 'interesado'].includes(outcome);
      db.prepare(`UPDATE directory_entries SET status = ?, last_note = COALESCE(?, last_note), last_call_at = ?, call_count = call_count + 1,
        next_call_at = ?, assigned_to = COALESCE(assigned_to, ?), revision = revision + 1, updated_at = ? WHERE id = ?`)
        .run(outcome, note, at, keepsNext ? next : null, user.id, at, current.id);
    });
    ctx.log(user.id, 'directory', current.id, 'called', `${user.name} llamó a ${current.name}: ${DIRECTORY_STATUS[outcome].label}`);
    return { entry: getEntry(current.id) };
  });

  // ── Importación desde Excel/CSV ───────────────────────────────────────────
  // El navegador lee el archivo y manda las filas en partes de hasta IMPORT_MAX_ROWS.
  // La primera parte crea la importación; las siguientes envían su import_id.
  route('POST', '/api/directory/import', 'user', ({ user, body }) => {
    if (!Array.isArray(body.rows) || !body.rows.length) invalid('rows', 'No hay filas para importar.');
    if (body.rows.length > IMPORT_MAX_ROWS) invalid('rows', `Máximo ${IMPORT_MAX_ROWS} filas por envío.`);
    const fileName = text(body.file_name, 'file_name', { max: 160 }) ?? 'Archivo sin nombre';
    let importId = id(body.import_id, 'import_id');
    if (importId) {
      const batch = db.prepare('SELECT * FROM directory_imports WHERE id = ?').get(importId);
      if (!batch || batch.user_id !== user.id || batch.undone_at || Date.parse(ctx.nowIso()) - Date.parse(batch.created_at) > IMPORT_WINDOW_MS) {
        invalid('import_id', 'La importación ya cerró. Volvé a subir el archivo.');
      }
    }

    const result = { inserted: 0, merged: 0, skipped: 0, errors: [] };
    transaction(db, () => {
      if (!importId) {
        importId = Number(db.prepare('INSERT INTO directory_imports (file_name, user_id, created_at) VALUES (?, ?, ?)').run(fileName, user.id, ctx.nowIso()).lastInsertRowid);
      }
      body.rows.forEach((raw, index) => {
        const rowNumber = Number.isSafeInteger(raw?.row) ? raw.row : index + 1;
        let e;
        try {
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid('row', 'Fila inválida.');
          // Estado o fecha irreconocibles no tumban la fila: quedan "Por llamar" y sin fecha.
          const clean = { ...raw };
          if (!DIRECTORY_STATUS[clean.status]) delete clean.status;
          try { dateOnly(clean.next_call_at, 'next_call_at'); } catch { delete clean.next_call_at; }
          delete clean.assigned_to;
          e = readBody(clean);
        } catch (error) {
          result.errors.push({ row: rowNumber, message: error.extra?.message ?? 'Fila inválida.', field: error.extra?.field ?? null });
          return;
        }
        const dup = findDuplicate(e);
        if (!dup) {
          insertEntry(e, user.id, importId);
          result.inserted += 1;
          return;
        }
        // Ya existe: solo se completan los datos que faltan. El trabajo del equipo
        // (estado, observaciones, asignación) nunca se pisa con un archivo.
        const current = db.prepare('SELECT * FROM directory_entries WHERE id = ?').get(dup.id);
        const fill = EDITABLE.filter((k) => k !== 'name' && k !== 'observations' && !current[k] && e[k]);
        if (!current.observations && e.observations) fill.push('observations');
        if (!fill.length) { result.skipped += 1; return; }
        db.prepare(`UPDATE directory_entries SET ${fill.map((k) => `${k} = ?`).join(', ')}, revision = revision + 1, updated_at = ? WHERE id = ?`)
          .run(...fill.map((k) => e[k]), ctx.nowIso(), current.id);
        result.merged += 1;
      });
      db.prepare(`UPDATE directory_imports SET rows_total = rows_total + ?, inserted = inserted + ?, merged = merged + ?,
        skipped = skipped + ? WHERE id = ?`).run(body.rows.length, result.inserted, result.merged, result.skipped + result.errors.length, importId);
    });
    // Una sola línea en la bitácora por archivo: se registra con la primera parte y se actualiza el resumen al final.
    if (body.last !== false) {
      const batch = db.prepare('SELECT * FROM directory_imports WHERE id = ?').get(importId);
      ctx.log(user.id, 'directory', importId, 'imported',
        `${user.name} importó "${batch.file_name}" al libro amarillo: ${batch.inserted} nuevos, ${batch.merged} completados, ${batch.skipped} sin cambios`);
    }
    return { import_id: importId, ...result };
  });

  route('DELETE', '/api/directory/imports/:id', 'user', ({ user, params }) => {
    const batch = db.prepare('SELECT * FROM directory_imports WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    if (user.role !== 'admin' && batch.user_id !== user.id) fail(403, 'forbidden');
    if (batch.undone_at) fail(409, 'already_undone', { message: 'Esa importación ya se deshizo.' });
    const removed = transaction(db, () => {
      const { changes } = db.prepare("DELETE FROM directory_entries WHERE import_id = ? AND call_count = 0 AND status = 'pendiente'").run(batch.id);
      db.prepare('UPDATE directory_imports SET undone_at = ? WHERE id = ?').run(ctx.nowIso(), batch.id);
      return Number(changes);
    });
    const kept = db.prepare('SELECT COUNT(*) n FROM directory_entries WHERE import_id = ?').get(batch.id).n;
    ctx.log(user.id, 'directory', batch.id, 'import_undone', `${user.name} deshizo la importación "${batch.file_name}": ${removed} contactos borrados${kept ? `, ${kept} se conservan porque ya se trabajaron` : ''}`);
    return { removed, kept };
  });

  // ── Excel: el libro completo con el trabajo de llamadas (separador ; y BOM UTF-8) ──
  route('GET', '/api/directory/export.csv', 'user', ({ user, res }) => {
    const rows = db.prepare(`${SELECT} ORDER BY d.province, d.canton, d.name COLLATE NOCASE`).all();
    const cell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita inyección de fórmulas en Excel
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Nombre del negocio', 'Tipo de comida', 'Provincia', 'Cantón', 'Distrito', 'Dirección / referencia', 'Teléfono', 'Teléfono 2', 'WhatsApp',
      'Redes sociales', 'Sitio web', 'Fuente', 'Oportunidad', 'Estado', 'Observaciones', 'Último comentario', 'Llamadas', 'Última llamada', 'Próxima llamada', 'Asignado a'];
    const lines = rows.map((r) => [r.name, r.category, r.province, r.canton, r.district, r.address, r.phone, r.phone_alt, r.whatsapp, r.social, r.website,
      r.source, r.opportunity, DIRECTORY_STATUS[r.status]?.label, r.observations, r.last_note, r.call_count, r.last_call_at?.slice(0, 10), r.next_call_at,
      r.assigned_name].map(cell).join(';'));
    ctx.log(user.id, 'directory', null, 'exported', `${user.name} descargó el libro amarillo (${rows.length} contactos)`);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="libro-amarillo-${ctx.today()}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.end(`\uFEFF${[header.join(';'), ...lines].join('\r\n')}\r\n`);
  });
}
