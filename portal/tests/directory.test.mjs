// Libro amarillo: API (alta, duplicados, llamadas, importación, deshacer, permisos,
// exportación) y lectura de archivos (CSV, .xlsx real comprimido, encabezados flexibles).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.mjs';
import { rowsFromSheet, parseCsv, parseStatus, extractPhones, cleanPhone, headerField, contactLinks } from '../shared/directory.js';
import { readXlsx, SpreadsheetError } from '../src/lib/xlsx.js';

let env;
let ids;

before(async () => {
  env = await startServer();
  ids = {
    admin: env.addUser('jeyrell@jc.test', 'Jeyrell', 'admin'),
    alex: env.addUser('alex@jc.test', 'Alex', 'socio'),
    hillary: env.addUser('hillary@jc.test', 'Hillary', 'colaborador'),
    angel: env.addUser('angel@jc.test', 'Ángel', 'inversionista'),
  };
});
after(() => env.close());

async function as(email) {
  const c = env.client();
  assert.equal((await c.login(email)).status, 200);
  return c;
}

// ── Utilidades compartidas ──────────────────────────────────────────────────

test('teléfonos de Costa Rica: extrae, formatea y no repite', () => {
  assert.deepEqual(extractPhones('+506 4000-1111 y +506 8000-2222'), ['40001111', '80002222']);
  assert.deepEqual(extractPhones('Tel 2400 3333 / WA 85004444 / 2400-3333'), ['24003333', '85004444']);
  assert.deepEqual(extractPhones(24003333), ['24003333'], 'un número guardado como número en Excel');
  assert.equal(cleanPhone('+50688005555'), '8800-5555');
  assert.equal(cleanPhone('+1 (305) 555-01'), '+1 (305) 555-01', 'un número raro se conserva');
  assert.equal(cleanPhone('   '), null);
});

test('redes y sitio web: solo hay botón cuando hay un enlace real, con su red', () => {
  const links = (social, website) => contactLinks({ social, website }).map((l) => [l.kind, l.label, l.url]);
  assert.deepEqual(links('facebook.com/sodaprueba · instagram.com/soda_prueba', 'sodaprueba.rest (sin verificar)'), [
    ['site', 'Sitio web', 'https://sodaprueba.rest/'],
    ['facebook', 'Facebook', 'https://facebook.com/sodaprueba'],
    ['instagram', 'Instagram', 'https://instagram.com/soda_prueba'],
  ]);
  assert.deepEqual(links('Facebook Soda Prueba · TikTok @sodaprueba · IG @soda.prueba'), [
    ['tiktok', 'TikTok', 'https://www.tiktok.com/@sodaprueba'],
    ['instagram', 'Instagram', 'https://www.instagram.com/soda.prueba'],
  ], 'una cuenta con @ se abre en su red; el nombre suelto de Facebook no da enlace');
  assert.deepEqual(links('linktr.ee/sodaprueba, https://www.instagram.com/soda_prueba/'), [
    ['link', 'linktr.ee', 'https://linktr.ee/sodaprueba'],
    ['instagram', 'Instagram', 'https://www.instagram.com/soda_prueba/'],
  ]);
  for (const nothing of ['TikTok', 'Instagram · Facebook', 'TikTok #SodaPrueba', 'Uber Eats', '@sodaprueba', 'Menú en Google Sites', 'S.A.', null]) {
    assert.deepEqual(links(nothing, nothing), [], `sin botón para ${nothing}`);
  }
});

test('estados escritos a mano se reconocen sin confundir "no interesado" con "interesado"', () => {
  assert.equal(parseStatus('No interesado'), 'no_interesado');
  assert.equal(parseStatus('Interesada'), 'interesado');
  assert.equal(parseStatus('NO CONTESTÓ'), 'no_contesta');
  assert.equal(parseStatus('Volver a llamar'), 'volver_a_llamar');
  assert.equal(parseStatus('Por llamar'), 'pendiente');
  assert.equal(parseStatus('Número malo'), 'numero_malo');
  assert.equal(parseStatus('algo raro'), null);
});

test('encabezados flexibles: tildes, mayúsculas y paréntesis', () => {
  assert.equal(headerField('Nombre del negocio'), 'name');
  assert.equal(headerField('TELÉFONO'), 'phone');
  assert.equal(headerField('Teléfono (principal)'), 'phone');
  assert.equal(headerField('Cantón'), 'canton');
  assert.equal(headerField('Dirección / referencia'), 'address');
  assert.equal(headerField('N°'), null);
});

test('una hoja con título arriba, varios teléfonos por celda y filas repetidas', () => {
  const matrix = [
    ['Libro de contactos · Alajuela y Heredia'],
    [],
    ['N°', 'Nombre del negocio', 'Cantón', 'Teléfono', 'WhatsApp', 'Estado', 'Próxima llamada', 'Facebook', 'Instagram'],
    [1, 'Burger Uno (prueba)', 'Alajuela', '+506 4000-1111 · +506 8000-2222 · 2222-3333', null, 'Interesado', 46337, 'fb.com/ejemplo', 'ig/ejemplo'],
    [2, 'Food Truck Prueba', 'Alajuela', '2440-6666', '8888-0000', 'No contesta', '15/11/2026'],
    [3, '', 'Grecia', '2490-7777'],
    [4, 'Burger Uno repetido', 'Alajuela', '4000 1111'],
    [5, 'Soda sin teléfono', 'Barva'],
    [6, 'Solo WhatsApp', 'Naranjo', null, '8943-9504'],
  ];
  const { rows, skipped, headerRow } = rowsFromSheet(matrix);
  assert.equal(headerRow, 2);
  assert.equal(rows.length, 4);
  const [abgb, fusion, soda, onlyWa] = rows;
  assert.equal(onlyWa.phone, '8943-9504', 'sin teléfono, se llama al WhatsApp');
  assert.equal(abgb.phone, '4000-1111');
  assert.equal(abgb.phone_alt, '8000-2222');
  assert.match(abgb.observations, /Otros teléfonos: 2222-3333/);
  assert.equal(abgb.status, 'interesado');
  assert.equal(abgb.next_call_at, '2026-11-11', 'fecha numérica de Excel (46337)');
  assert.equal(abgb.social, 'fb.com/ejemplo · ig/ejemplo', 'dos columnas de redes se juntan');
  assert.equal(abgb.row, 4);
  assert.equal(fusion.whatsapp, '8888-0000');
  assert.equal(fusion.next_call_at, '2026-11-15', 'fecha escrita día/mes/año');
  assert.equal(soda.phone, null);
  assert.deepEqual(skipped.map((s) => s.row), [6, 7]);
  assert.match(skipped[1].reason, /Repetido en el archivo \(igual a la fila 4\)/);
});

test('CSV con ; comillas, BOM y apóstrofo protector', () => {
  const csv = '\uFEFFNombre del negocio;Teléfono;Observaciones\r\n"Pizza; la ""mejor""";\'+506 2445-0023;"Línea 1\nLínea 2"\r\n';
  const m = parseCsv(csv);
  assert.deepEqual(m[0], ['Nombre del negocio', 'Teléfono', 'Observaciones']);
  assert.deepEqual(m[1], ['Pizza; la "mejor"', '+506 2445-0023', 'Línea 1\nLínea 2']);
  assert.equal(rowsFromSheet(m).rows[0].phone, '2445-0023');
  assert.deepEqual(parseCsv('a,b\n1,2')[1], ['1', '2'], 'detecta la coma');
});

// ── Lector de .xlsx ─────────────────────────────────────────────────────────

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes) => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
async function deflate(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
/** ZIP mínimo (como el que escribe Excel): archivos comprimidos con deflate y directorio central. */
async function zip(files) {
  const enc = new TextEncoder();
  const parts = []; const central = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const raw = enc.encode(content); const data = await deflate(raw); const nameBytes = enc.encode(name);
    const local = new Uint8Array(30 + nameBytes.length); const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(8, 8, true); v.setUint32(14, crc32(raw), true);
    v.setUint32(18, data.length, true); v.setUint32(22, raw.length, true); v.setUint16(26, nameBytes.length, true); local.set(nameBytes, 30);
    const cd = new Uint8Array(46 + nameBytes.length); const w = new DataView(cd.buffer);
    w.setUint32(0, 0x02014b50, true); w.setUint16(10, 8, true); w.setUint32(16, crc32(raw), true); w.setUint32(20, data.length, true);
    w.setUint32(24, raw.length, true); w.setUint16(28, nameBytes.length, true); w.setUint32(42, offset, true); cd.set(nameBytes, 46);
    parts.push(local, data); central.push(cd); offset += local.length + data.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22); const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, central.length, true); e.setUint16(10, central.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

test('lee un .xlsx: hoja "Contactos", textos compartidos, en línea, números y entidades XML', async () => {
  const bytes = await zip({
    'xl/workbook.xml': '<workbook><sheets><sheet name="Instrucciones" sheetId="1" r:id="rId1"/><sheet name="Contactos" sheetId="2" r:id="rId2"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
    'xl/sharedStrings.xml': '<sst><si><t>Nombre del negocio</t></si><si><t>Teléfono</t></si><si><r><t>Pollos </t></r><r><t xml:space="preserve">Kleavers &amp; Co</t></r></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>No es esta hoja</t></is></c></row></sheetData></worksheet>',
    'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>'
      + '<row r="3"><c r="A3" t="s"><v>2</v></c><c r="C3"><v>24603236</v></c></row>'
      + '<row r="4"><c r="A4" t="inlineStr"><is><t>Soda &#233;xito</t></is></c><c r="C4" t="str"><v>8888-0000</v></c></row></sheetData></worksheet>',
  });
  const { matrix, sheet, sheets } = await readXlsx(bytes);
  assert.equal(sheet, 'Contactos');
  assert.deepEqual(sheets, ['Instrucciones', 'Contactos']);
  assert.equal(matrix[0][0], 'Nombre del negocio');
  assert.equal(matrix[0][2], 'Teléfono', 'respeta la columna C aunque falte B');
  assert.deepEqual(matrix[1], [], 'fila 2 vacía');
  assert.equal(matrix[2][0], 'Pollos Kleavers & Co');
  assert.equal(matrix[2][2], 24603236);
  assert.equal(matrix[3][0], 'Soda éxito');
  const { rows } = rowsFromSheet(matrix);
  assert.deepEqual(rows.map((r) => [r.name, r.phone]), [['Pollos Kleavers & Co', '2460-3236'], ['Soda éxito', '8888-0000']]);
});

test('archivos que no son .xlsx se rechazan con un mensaje claro', async () => {
  await assert.rejects(readXlsx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0])), (e) => e instanceof SpreadsheetError && /antiguo/.test(e.message));
  await assert.rejects(readXlsx(new TextEncoder().encode('hola')), SpreadsheetError);
});

// ── API ─────────────────────────────────────────────────────────────────────

test('alta, duplicado por teléfono y permisos de acceso', async () => {
  const hil = await as('hillary@jc.test');
  const r = await hil.post('/api/directory', { name: 'Hamburguesas Prueba', canton: 'Alajuela', province: 'Alajuela', phone: '+506 2430-8888' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.entry.phone, '2430-8888');
  assert.equal(r.data.entry.phone_key, '24308888');
  assert.equal(r.data.entry.status, 'pendiente');

  const dup = await hil.post('/api/directory', { name: 'Hamburguesas Prueba 2', phone: '2430 8888' });
  assert.equal(dup.status, 409);
  assert.equal(dup.data.error, 'duplicate');
  assert.equal(dup.data.entry_id, r.data.entry.id);

  assert.equal((await hil.post('/api/directory', { name: 'X' })).status, 400, 'nombre muy corto');
  assert.equal((await hil.post('/api/directory', { name: 'Soda', status: 'inventado' })).status, 400);
  // Un inversionista no entra a la operación.
  assert.equal((await (await as('angel@jc.test')).get('/api/directory')).status, 403);
  assert.equal((await env.client().get('/api/directory')).status, 401);
});

test('registrar llamadas: estado, comentario, próxima llamada y bitácora', async () => {
  const hil = await as('hillary@jc.test');
  const { entry } = (await hil.post('/api/directory', { name: 'Taquería Fátima', phone: '2262-9264', canton: 'Heredia' })).data;
  const today = env.ctx.today();

  assert.equal((await hil.post(`/api/directory/${entry.id}/calls`, { outcome: 'pendiente' })).status, 400);
  assert.equal((await hil.post(`/api/directory/${entry.id}/calls`, { outcome: 'volver_a_llamar', next_call_at: '2020-01-01' })).status, 400);

  const tomorrow = env.ctx.today(1);
  let res = await hil.post(`/api/directory/${entry.id}/calls`, { outcome: 'volver_a_llamar', note: 'Habló con el dueño, llamar el lunes', next_call_at: tomorrow });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(res.data.entry.status, 'volver_a_llamar');
  assert.equal(res.data.entry.call_count, 1);
  assert.equal(res.data.entry.next_call_at, tomorrow);
  assert.equal(res.data.entry.assigned_to, ids.hillary, 'quien llama queda como responsable si nadie lo tenía');
  assert.equal(res.data.entry.last_note, 'Habló con el dueño, llamar el lunes');

  // Un cierre limpia la próxima llamada y conserva el último comentario si no se escribe otro.
  res = await hil.post(`/api/directory/${entry.id}/calls`, { outcome: 'no_interesado', next_call_at: tomorrow });
  assert.equal(res.data.entry.status, 'no_interesado');
  assert.equal(res.data.entry.next_call_at, null);
  assert.equal(res.data.entry.call_count, 2);
  assert.equal(res.data.entry.last_note, 'Habló con el dueño, llamar el lunes');

  const detail = (await hil.get(`/api/directory/${entry.id}`)).data;
  assert.deepEqual(detail.calls.map((c) => c.outcome), ['no_interesado', 'volver_a_llamar']);
  assert.equal(detail.calls[1].user_name, 'Hillary');
  const log = (await hil.get('/api/activity?entity=directory')).data.activity;
  assert.ok(log.some((a) => a.action === 'called' && /Taquería Fátima: No interesado/.test(a.summary)));
  assert.ok(today);
});

test('edición con bloqueo optimista y validación de duplicados', async () => {
  const hil = await as('hillary@jc.test');
  const alex = await as('alex@jc.test');
  const { entry } = (await hil.post('/api/directory', { name: 'Ke Burgers', phone: '6401-5258' })).data;

  const first = await alex.patch(`/api/directory/${entry.id}`, { observations: 'Atiende la dueña de noche', expected_revision: entry.revision });
  assert.equal(first.status, 200);
  assert.equal(first.data.entry.revision, entry.revision + 1);
  // Hillary todavía tiene la versión vieja abierta: su guardado no pisa el de Alex.
  const stale = await hil.patch(`/api/directory/${entry.id}`, { observations: 'Otra cosa', expected_revision: entry.revision });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.error, 'conflict');
  assert.equal(stale.data.entry.observations, 'Atiende la dueña de noche');

  const other = (await hil.post('/api/directory', { name: 'Garage 28', phone: '8911-6679' })).data.entry;
  const clash = await hil.patch(`/api/directory/${other.id}`, { phone: '6401 5258' });
  assert.equal(clash.status, 409);
  assert.equal(clash.data.error, 'duplicate');

  const assign = await hil.patch(`/api/directory/${other.id}`, { assigned_to: ids.angel });
  assert.equal(assign.status, 400, 'no se asigna a un inversionista');
});

test('importar por partes: nuevos, completados sin pisar el trabajo, errores por fila y deshacer', async () => {
  const hil = await as('hillary@jc.test');
  const alex = await as('alex@jc.test');
  // Ya existe y Hillary ya la trabajó.
  const pirata = (await hil.get('/api/directory')).data.entries.find((e) => e.name === 'Hamburguesas Prueba');
  await hil.patch(`/api/directory/${pirata.id}`, { status: 'interesado', observations: 'Quiere cotización' });

  const part1 = await hil.post('/api/directory/import', {
    file_name: 'libro.xlsx', last: false,
    rows: [
      { row: 2, name: 'Food Truck Prueba', phone: '2440-6666', canton: 'Alajuela' },
      { row: 3, name: 'Hamburguesas Prueba', phone: '2430-8888', status: 'no_interesado', observations: 'Del archivo', category: 'Hamburguesas' },
      { row: 4, name: 'Z', phone: '2222-1111' },
      { row: 5, name: 'Soda Tío Mano', phone: '2446-5605', status: 'raro', next_call_at: '31/31/2026' },
    ],
  });
  assert.equal(part1.status, 200, JSON.stringify(part1.data));
  assert.deepEqual([part1.data.inserted, part1.data.merged, part1.data.skipped], [2, 1, 0]);
  assert.deepEqual(part1.data.errors.map((e) => e.row), [4]);
  const importId = part1.data.import_id;

  // La segunda parte solo la puede continuar quien empezó la importación.
  assert.equal((await alex.post('/api/directory/import', { import_id: importId, rows: [{ name: 'Otra', phone: '2000-0000' }] })).status, 400);
  const part2 = await hil.post('/api/directory/import', { file_name: 'libro.xlsx', import_id: importId, rows: [{ row: 6, name: 'Food Truck Prueba', phone: '2440 6666' }, { row: 7, name: 'Pizza Loca', phone: '8707-3635' }] });
  assert.deepEqual([part2.data.inserted, part2.data.merged, part2.data.skipped], [1, 0, 1]);
  assert.equal((await hil.post('/api/directory/import', { rows: new Array(101).fill({ name: 'Fila' }) })).status, 400, 'tope por envío');

  const list = (await hil.get('/api/directory')).data;
  const pirataNow = list.entries.find((e) => e.id === pirata.id);
  assert.equal(pirataNow.status, 'interesado', 'el archivo no pisa el estado');
  assert.equal(pirataNow.observations, 'Quiere cotización', 'ni las observaciones');
  assert.equal(pirataNow.category, 'Hamburguesas', 'pero completa lo que faltaba');
  assert.equal(list.entries.find((e) => e.name === 'Soda Tío Mano').status, 'pendiente');
  const batch = list.imports.find((i) => i.id === importId);
  assert.deepEqual([batch.rows_total, batch.inserted, batch.merged, batch.skipped], [6, 3, 1, 2]);

  // Se trabaja un contacto importado; al deshacer, ese se conserva.
  const fusion = list.entries.find((e) => e.name === 'Food Truck Prueba');
  await hil.post(`/api/directory/${fusion.id}/calls`, { outcome: 'no_contesta' });
  assert.equal((await alex.del(`/api/directory/imports/${importId}`)).status, 403, 'solo quien importó o el admin');
  const undo = await hil.del(`/api/directory/imports/${importId}`);
  assert.equal(undo.status, 200);
  assert.deepEqual([undo.data.removed, undo.data.kept], [2, 1]);
  const after = (await hil.get('/api/directory')).data.entries.map((e) => e.name);
  assert.ok(after.includes('Food Truck Prueba') && after.includes('Hamburguesas Prueba'));
  assert.ok(!after.includes('Pizza Loca') && !after.includes('Soda Tío Mano'));
  assert.equal((await hil.del(`/api/directory/imports/${importId}`)).status, 409);
});

test('borrar: el creador solo si nadie llamó; el admin siempre', async () => {
  const hil = await as('hillary@jc.test');
  const admin = await as('jeyrell@jc.test');
  const fresh = (await hil.post('/api/directory', { name: 'Cevichitos', phone: '2430-2664' })).data.entry;
  assert.equal((await hil.del(`/api/directory/${fresh.id}`)).status, 200);

  const worked = (await hil.post('/api/directory', { name: 'Lobitos Pizza', phone: '2445-0023' })).data.entry;
  await hil.post(`/api/directory/${worked.id}/calls`, { outcome: 'no_contesta' });
  const denied = await hil.del(`/api/directory/${worked.id}`);
  assert.equal(denied.status, 403);
  assert.match(denied.data.message, /Número malo/);
  assert.equal((await admin.del(`/api/directory/${worked.id}`)).status, 200);
  assert.equal((await admin.get(`/api/directory/${worked.id}`)).status, 404);
});

test('exportación a Excel: BOM, separador ; y fórmulas neutralizadas', async () => {
  const hil = await as('hillary@jc.test');
  await hil.post('/api/directory', { name: '=HYPERLINK("evil")', phone: '2000-1234', observations: 'Dijo "hola"; volver' });
  const res = await fetch(`${env.base}/api/directory/export.csv`, { headers: { cookie: hil.cookie } });
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], 'BOM para que Excel lea las tildes');
  const body = new TextDecoder().decode(bytes);
  assert.match(body, /^Nombre del negocio;Tipo de comida;Provincia;Cantón/);
  assert.match(body, /'=HYPERLINK/);
  assert.match(body, /"Dijo ""hola""; volver"/);
});
