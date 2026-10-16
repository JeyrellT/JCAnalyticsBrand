// ============================================================================
//  server/demo-data.mjs — datos de DEMOSTRACIÓN (sin dependencias de Node).
//  Los usa el seed local (HTTP) y la demo del navegador (llamada directa).
//  Todo pasa por la API real para ejercitar las mismas reglas de producción.
//  Montos, prospectos y mensajes son ficticios.
// ============================================================================

export const DEMO_PASSWORD = 'DemoPortal2026';
export const DEMO_DOMAIN = 'demo.jcanalytic.local';
/** Cuentas del portal de clientes de la demo (v5). */
export const DEMO_CLIENT_DOMAIN = 'clientes.demo.jcanalytic.local';

/**
 * @param {object} o
 * @param {object} o.db            base con prepare()/exec()
 * @param {string} o.passwordHash  hash de DEMO_PASSWORD para todas las cuentas
 * @param {(who: string) => Promise<(method: string, path: string, body?: object) => Promise<any>>} o.login
 *        inicia sesión como `who` (parte local del correo) y devuelve un cliente de la API
 * @param {(email: string) => Promise<(method: string, path: string, body?: object) => Promise<any>>} [o.loginClient]
 *        inicia sesión en el portal de clientes (v5); sin él no se siembra el portal de clientes
 * @param {number} [o.now]
 */
export async function seedDemoData({ db, passwordHash, login, loginClient = null, now: nowArg }) {
  const now = nowArg ?? Date.now();
  const iso = (offsetHours) => new Date(now + offsetHours * 3_600_000).toISOString();
  const day = (offsetDays) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date(now + offsetDays * 86_400_000));
  /** Fecha/hora local de Costa Rica (UTC−6) a ISO. */
  const crAt = (offsetDays, hour, minute = 0) => new Date(`${day(offsetDays)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-06:00`).toISOString();


  const hash = passwordHash;
  const people = [
    ['jeyrell@demo.jcanalytic.local', 'Jeyrell Tardencilla', 'admin', '#0065df', '+506 7033-0596'],
    ['catalina@demo.jcanalytic.local', 'Catalina González', 'socio', '#c0764f', null],
    ['alex@demo.jcanalytic.local', 'Alex Benedict', 'socio', '#8b5cf6', null],
    ['hillary@demo.jcanalytic.local', 'Hillary Porras', 'colaborador', '#ff5a00', null],
    ['socio5@demo.jcanalytic.local', 'Socio Inversionista', 'socio', '#00a6b2', null],
    // v6: inversionista externo (solo ve su portal de inversiones).
    ['angel@demo.jcanalytic.local', 'Ángel Mora', 'inversionista', '#e8b32c', '+506 8700-1234'],
  ];
  const U = {};
  for (const [email, name, role, color, phone] of people) {
    U[email.split('@')[0]] = Number(db.prepare(`INSERT INTO users (email, name, role, color, phone, password_hash, must_change_password, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)`).run(email, name, role, color, phone, hash, iso(-24 * 40)).lastInsertRowid);
  }

  const as = login;
  const jey = await as('jeyrell');
  const cata = await as('catalina');
  const alex = await as('alex');
  const hil = await as('hillary');
  const s5 = await as('socio5');

  // ── Clientes ──────────────────────────────────────────────────────────────
  const C = {};
  const client = async (key, api, body) => { C[key] = (await api('POST', '/api/clients', body)).client.id; };
  await client('burrada', cata, { name: 'La Burrada Street Food', sector: 'Restaurante', status: 'activo', contact_name: 'Dueño La Burrada', contact_phone: '+506 8888-0000', owner_id: U.catalina, notes: 'Comida callejera en San Pedro. Pedidos por WhatsApp; quieren panel de cocina en la fase 2.' });
  await client('uniquex', cata, { name: 'Uniquex Costa Rica', sector: 'Domótica', status: 'activo', contact_name: 'Gerencia Uniquex', owner_id: U.alex, notes: 'Automatización residencial. La landing narrativa debe generar visitas técnicas.' });
  await client('vip', jey, { name: 'Freight forwarder VIP', sector: 'Logística', status: 'activo', contact_name: 'Gerencia comercial VIP', owner_id: U.jeyrell, notes: 'Agencia de carga internacional (FCL/LCL, aéreo y terrestre). En soporte de 30 días.' });
  await client('roble', cata, { name: 'Ferretería El Roble', sector: 'Ferretería', status: 'prospecto', contact_name: 'Gerente El Roble', contact_phone: '+506 8800-1122', owner_id: U.catalina, notes: 'Prospecto: dashboard de ventas, margen y cuentas por cobrar.' });
  await client('sonrisa', cata, { name: 'Clínica Dental Sonrisa Plena', sector: 'Salud', status: 'prospecto', contact_name: 'Administración Sonrisa Plena', contact_phone: '+506 8000-4321', contact_email: 'administracion@sonrisaplena.example', owner_id: U.catalina, notes: 'Prospecto ficticio de la demo: agenda en línea y recordatorios por WhatsApp.' });

  // ── Proyectos (con cliente del directorio y equipo por rol) ───────────────
  const P = {};
  const project = async (key, api, body, lastUpdateHoursAgo) => {
    P[key] = (await api('POST', '/api/projects', body)).project.id;
    if (lastUpdateHoursAgo != null) db.prepare('UPDATE projects SET last_update_at = ?, sla_started_at = ? WHERE id = ?').run(iso(-lastUpdateHoursAgo), iso(-lastUpdateHoursAgo - 24 * 7), P[key]);
  };
  const team = (...pairs) => pairs.map(([userId, role]) => ({ user_id: userId, role }));
  await project('burrada', cata, { name: 'Pedidos en línea La Burrada', client_id: C.burrada, kind: 'cliente', service: 'pagina_web', status: 'en_curso', owner_id: U.alex, start_date: day(-18), due_date: day(9), value_amount: 46_350_000, currency: 'CRC', contact_name: 'Dueño La Burrada', contact_phone: '+506 8888-0000', url: 'https://www.laburradacr.com/', description: 'Menú digital, carrito sin cuenta y confirmación por WhatsApp. Fase 2: panel de pedidos para cocina.', members: team([U.catalina, 'comercial'], [U.hillary, 'contenido']) }, 81);
  await project('uniquex', cata, { name: 'Landing narrativa Uniquex', client_id: C.uniquex, kind: 'cliente', service: 'pagina_web', status: 'en_revision', owner_id: U.alex, start_date: day(-30), due_date: day(3), value_amount: 61_800_000, currency: 'CRC', url: 'https://uniquexcr.com/landing', description: 'Recorrido de un día en la casa con escenas interactivas y agenda de visita técnica.', members: team([U.catalina, 'comercial'], [U.hillary, 'diseno']) }, 52);
  await project('vip', jey, { name: 'Cotizador Comercial VIP', client_id: C.vip, kind: 'cliente', service: 'software_medida', status: 'soporte', owner_id: U.jeyrell, start_date: day(-75), due_date: day(-26), delivered_at: day(-25), value_amount: 2_800_00, currency: 'USD', description: 'Cotizador FCL/LCL/aéreo/terrestre, routing order de 5 hitos y scorecard gerencial.', members: team([U.alex, 'desarrollo'], [U.catalina, 'soporte']) });
  await project('roble', cata, { name: 'Dashboard financiero Ferretería El Roble', client_id: C.roble, kind: 'cliente', service: 'power_bi', status: 'prospecto', owner_id: U.jeyrell, value_amount: 180_000_00, currency: 'CRC', description: 'Ventas, margen por categoría y cuentas por cobrar. Pendiente sesión de alcance.', members: team([U.catalina, 'comercial']) });
  await project('barber', jey, { name: 'BarberXCR · crecimiento', kind: 'producto', service: 'producto_saas', status: 'en_curso', owner_id: U.jeyrell, start_date: day(-60), url: 'https://barberxcr.com/', description: 'Plataforma de reservas para barberías. Meta: 25 barberías activas a fin de año.', members: team([U.alex, 'desarrollo'], [U.socio5, 'comercial'], [U.hillary, 'contenido']) });
  await project('taller', alex, { name: 'Taller Ticos · lanzamiento talleres', kind: 'producto', service: 'producto_saas', status: 'en_curso', owner_id: U.alex, start_date: day(-20), due_date: day(40), url: 'https://www.tallerticos.com/', members: team([U.jeyrell, 'datos']) });
  await project('marca', hil, { name: 'Contenido y pauta JC Analytics', kind: 'interno', service: 'community_manager', status: 'en_curso', owner_id: U.hillary, description: 'Calendario mensual, reels de casos y campañas Meta Ads.', members: team([U.catalina, 'comercial']) });

  // ── Líneas de servicio: líder y equipo (solo el admin las edita) ──────────
  const services = [
    ['software_medida', U.alex, [U.jeyrell], 'Sistemas internos, cotizadores y portales a la medida del proceso del cliente.'],
    ['pagina_web', U.alex, [U.hillary, U.catalina], 'Sitios y plataformas web con pedidos, reservas o agenda integrada.'],
    ['fiscal_planilla', U.jeyrell, [U.catalina], 'Planillas, cargas sociales y declaraciones de Costa Rica automatizadas.'],
    ['power_bi', U.jeyrell, [U.catalina], 'Tableros de ventas, margen y cobro conectados a las fuentes del cliente.'],
    ['python_pipeline', U.jeyrell, [U.alex], 'Extracción, limpieza y carga de datos programada en Python.'],
    ['alteryx_knime', U.jeyrell, [], 'Flujos de preparación de datos en Alteryx o KNIME.'],
    ['power_automate', U.jeyrell, [U.alex], 'Aprobaciones, formularios y alertas con Power Automate y Power Apps.'],
    ['excel_vba', U.jeyrell, [U.catalina], 'Macros y plantillas de Excel que eliminan trabajo manual repetido.'],
    ['doc_generation', U.catalina, [U.jeyrell], 'Contratos, cotizaciones y reportes generados a partir de datos.'],
    ['analisis_tfg', U.catalina, [U.jeyrell], 'Acompañamiento de análisis de datos para tesis y proyectos académicos.'],
    ['community_manager', U.hillary, [U.catalina], 'Calendario de contenido, publicaciones y pauta en redes.'],
    ['video_edicion', U.hillary, [], 'Reels y videos cortos de casos, productos y testimonios.'],
    ['producto_saas', U.jeyrell, [U.socio5, U.alex], 'Productos propios del estudio: BarberXCR, Taller Ticos y los que vengan.'],
  ];
  for (const [key, leadId, members, description] of services) await jey('PATCH', `/api/services/${key}`, { lead_id: leadId, members, description });
  // Los avisos de asignación inicial no ensucian el buzón de la demo.
  db.prepare("UPDATE notifications SET read_at = ? WHERE kind = 'service' AND read_at IS NULL").run(iso(0));

  // ── Tablero ───────────────────────────────────────────────────────────────
  const tasks = [
    [cata, { title: 'Panel de pedidos para cocina (fase 2)', project_id: P.burrada, assignee_id: U.alex, status: 'en_progreso', priority: 'alta', due_date: day(4) }],
    [cata, { title: 'Probar carrito en iPhone SE y Android gama baja', project_id: P.burrada, assignee_id: U.catalina, status: 'por_hacer', priority: 'media', due_date: day(2) }],
    [alex, { title: 'Enviar avance de 72 h con video del flujo de pedido', project_id: P.burrada, assignee_id: U.catalina, status: 'por_hacer', priority: 'urgente', due_date: day(-1) }],
    [alex, { title: 'Ajustar escena de portones (feedback cliente)', project_id: P.uniquex, assignee_id: U.alex, status: 'revision', priority: 'alta', due_date: day(1) }],
    [cata, { title: 'Agendar visita técnica de prueba con el cliente', project_id: P.uniquex, assignee_id: U.catalina, status: 'hecho', priority: 'media' }],
    [jey, { title: 'Corregir redondeo de flete LCL en el cotizador', project_id: P.vip, assignee_id: U.jeyrell, status: 'en_progreso', priority: 'urgente', due_date: day(0) }],
    [jey, { title: 'Manual de uso del scorecard gerencial', project_id: P.vip, assignee_id: U.catalina, status: 'por_hacer', priority: 'media', due_date: day(5) }],
    [cata, { title: 'Preparar preguntas de alcance para El Roble', project_id: P.roble, assignee_id: U.jeyrell, status: 'por_hacer', priority: 'alta', due_date: day(1) }],
    [jey, { title: 'Recordatorios automáticos por WhatsApp para citas', project_id: P.barber, assignee_id: U.alex, status: 'backlog', priority: 'media' }],
    [jey, { title: 'Onboarding de 3 barberías nuevas de Heredia', project_id: P.barber, assignee_id: U.socio5, status: 'en_progreso', priority: 'alta', due_date: day(6) }],
    [alex, { title: 'Validar odómetro con IA en fotos nocturnas', project_id: P.taller, assignee_id: U.alex, status: 'backlog', priority: 'baja' }],
    [hil, { title: 'Reel: así pide un cliente en La Burrada', project_id: P.marca, assignee_id: U.hillary, status: 'en_progreso', priority: 'media', due_date: day(3) }],
    [hil, { title: 'Reporte mensual Meta Ads septiembre', project_id: P.marca, assignee_id: U.hillary, status: 'hecho', priority: 'media' }],
    [jey, { title: 'Actualizar tipo de cambio BCCR en el portal', assignee_id: U.jeyrell, status: 'por_hacer', priority: 'baja', due_date: day(7) }],
  ];
  for (const [api, body] of tasks) await api('POST', '/api/tasks', body);

  // ── Tareas recurrentes y preferencias de avisos (v3) ──────────────────────
  // Las tareas las crea la automatización "tareas_recurrentes" el día que toca (06:00 CR).
  await hil('POST', '/api/recurring-tasks', { title: 'Calendario de contenido de la semana', frequency: 'semanal', weekday: 1, assignee_id: U.hillary, project_id: P.marca, priority: 'alta', due_in_days: 1 });
  await jey('POST', '/api/recurring-tasks', { title: 'Revisar pendientes de socios y tipo de cambio', frequency: 'semanal', weekday: 5, assignee_id: U.jeyrell });
  await cata('POST', '/api/recurring-tasks', { title: 'Reporte mensual de avance a clientes activos', frequency: 'mensual', monthday: 1, assignee_id: U.catalina, priority: 'alta', due_in_days: 3 });
  await alex('POST', '/api/recurring-tasks', { title: 'Respaldo y revisión de servidores', frequency: 'mensual', monthday: 15, assignee_id: U.alex, project_id: P.barber, active: false });
  await hil('PATCH', '/api/me/notification-prefs', { digest_time: '08:00', quiet_start: '20:00' });
  await s5('PATCH', '/api/me/notification-prefs', { categories: { tareas: false, proyectos: false } });

  // ── Avances a clientes ────────────────────────────────────────────────────
  await cata('POST', `/api/projects/${P.vip}/updates`, { channel: 'reunion', note: 'Entrega formal y capacitación al equipo comercial. Inicia soporte de 30 días.' });

  // ── Agenda ────────────────────────────────────────────────────────────────
  const appts = [
    [cata, { title: 'Sesión de alcance · Ferretería El Roble', kind: 'alcance', status: 'confirmada', starts_at: crAt(0, 15), ends_at: crAt(0, 16), meeting_url: 'https://meet.google.com/abc-defg-hij', project_id: P.roble, client_id: C.roble, attendees: [U.jeyrell, U.catalina] }],
    [alex, { title: 'Demo del panel de cocina', kind: 'demo', starts_at: crAt(1, 10), ends_at: crAt(1, 10, 45), location: 'La Burrada, San Pedro', project_id: P.burrada, client_id: C.burrada, attendees: [U.alex, U.catalina] }],
    [jey, { title: 'Reunión semanal de socios', kind: 'interna', status: 'confirmada', starts_at: crAt(2, 8), ends_at: crAt(2, 9), meeting_url: 'https://meet.google.com/jca-socios-sem', notes: 'Revisar portafolio de inversiones y pipeline.', attendees: [U.jeyrell, U.catalina, U.alex, U.socio5] }],
    [cata, { title: 'Entrega landing Uniquex', kind: 'entrega', starts_at: crAt(3, 14), ends_at: crAt(3, 15), project_id: P.uniquex, client_id: C.uniquex, attendees: [U.alex, U.catalina] }],
    [cata, { title: 'Sesión de alcance · Clínica Sonrisa Plena', kind: 'alcance', starts_at: crAt(5, 10), ends_at: crAt(5, 11), meeting_url: 'https://meet.google.com/jca-sonrisa-alc', client_id: C.sonrisa, notes: 'Primera sesión sin costo: agenda en línea y recordatorios.', attendees: [U.catalina, U.jeyrell] }],
    [hil, { title: 'Sesión de fotos para contenido', kind: 'otro', starts_at: crAt(4, 9), ends_at: crAt(4, 11), location: 'Oficina', attendees: [U.hillary, U.alex] }],
    [jey, { title: 'Seguimiento soporte Cotizador VIP', kind: 'seguimiento', status: 'realizada', starts_at: crAt(-2, 11), ends_at: crAt(-2, 11, 30), project_id: P.vip, attendees: [U.jeyrell] }],
  ];
  for (const [api, body] of appts) await api('POST', '/api/appointments', body);

  // ── Inversiones ───────────────────────────────────────────────────────────
  const inv = async (api, body) => (await api('POST', '/api/investments', body)).investment.id;
  const barberInv = await inv(jey, { name: 'BarberXCR · capital de crecimiento', category: 'producto_propio', currency: 'CRC', project_id: P.barber, target_amount: 1_500_000_00, expected_return_pct: 35, expected_date: day(180), description: 'Pauta, onboarding presencial y mejoras de producto para llegar a 25 barberías.' });
  const adsInv = await inv(cata, { name: 'Pauta Meta Ads · cuarto trimestre', category: 'marketing', currency: 'CRC', target_amount: 450_000_00, expected_date: day(80) });
  const infraInv = await inv(alex, { name: 'Servidores y dominios 2026', category: 'equipo', currency: 'USD', target_amount: 600_00 });
  await inv(alex, { name: 'Taller Ticos · red de talleres', category: 'producto_propio', status: 'propuesta', currency: 'CRC', project_id: P.taller, target_amount: 2_000_000_00, description: 'Propuesta: aporte para visitar 40 talleres de la GAM.' });

  const mov = async (api, investmentId, body) => (await api('POST', `/api/investments/${investmentId}/movements`, body)).movement.id;
  const confirm = (api, movementId, message) => api('POST', `/api/movements/${movementId}/confirm`, { message });

  // Aportes a BarberXCR (confirmados por otro socio, con mensaje de vuelta).
  await confirm(cata, await mov(jey, barberInv, { type: 'aporte', partner_id: U.jeyrell, amount: 600_000_00, date: day(-58), reference: 'SINPE 81233', message: 'Aporte inicial para pauta y onboarding.' }), 'Recibido en la cuenta del proyecto ✓');
  await confirm(jey, await mov(cata, barberInv, { type: 'aporte', partner_id: U.catalina, amount: 400_000_00, date: day(-57), reference: 'SINPE 81301', message: 'Mi parte del capital de crecimiento.' }), 'Recibido, gracias Cata.');
  await confirm(jey, await mov(alex, barberInv, { type: 'aporte', partner_id: U.alex, amount: 300_000_00, date: day(-50), message: 'Transferencia BN, aporte de Alex.' }), 'Confirmado en estado de cuenta.');
  await confirm(jey, await mov(s5, barberInv, { type: 'aporte', partner_id: U.socio5, amount: 200_000_00, date: day(-45), reference: 'SINPE 90122', message: 'Me sumo a BarberXCR.' }), 'Bienvenido, recibido ✓');
  // Primer retorno repartido según capital.
  const dist1 = await jey('POST', `/api/investments/${barberInv}/distribute`, { amount: 180_000_00, date: day(-15), message: 'Primer retorno: 14 barberías con suscripción activa en septiembre.' });
  const apis = { [U.jeyrell]: jey, [U.catalina]: cata, [U.alex]: alex, [U.socio5]: s5 };
  for (const m of dist1.movements) {
    const confirmer = m.partner_id === U.jeyrell ? cata : apis[m.partner_id];
    await confirm(confirmer, m.id, m.partner_id === U.jeyrell ? 'Depositado a Jeyrell, verificado.' : 'Me llegó ✓ gracias.');
  }
  // Segundo retorno: algunos ya confirmaron, otros pendientes (aparecen en el buzón).
  const dist2 = await jey('POST', `/api/investments/${barberInv}/distribute`, { amount: 95_000_00, date: day(-1), message: 'Retorno de octubre (primera quincena).' });
  for (const m of dist2.movements.filter((x) => x.partner_id === U.catalina)) await confirm(cata, m.id, 'Recibido por SINPE ✓');

  // Pauta: un aporte confirmado y otro pendiente de confirmar.
  await confirm(jey, await mov(cata, adsInv, { type: 'aporte', partner_id: U.catalina, amount: 150_000_00, date: day(-10), message: 'Pauta de octubre (Reels La Burrada y BarberXCR).' }), 'Recibido. Hillary ya cargó la campaña.');
  await mov(alex, adsInv, { type: 'aporte', partner_id: U.alex, amount: 100_000_00, date: day(-2), reference: 'SINPE 77310', message: 'Mi parte de la pauta de noviembre.' });

  // Infraestructura en dólares con tipo de cambio guardado.
  await confirm(jey, await mov(alex, infraInv, { type: 'aporte', partner_id: U.alex, amount: 240_00, fx_rate: 512.4, date: day(-30), message: 'Railway + dominios anual (factura adjunta en Drive).' }), 'Recibido ✓');
  await confirm(alex, await mov(jey, infraInv, { type: 'aporte', partner_id: U.jeyrell, amount: 240_00, fx_rate: 512.4, date: day(-30), message: 'Mi mitad de infraestructura.' }), 'Recibido ✓');

  await cata('POST', `/api/investments/${barberInv}/notes`, { body: 'Llegamos a 14 barberías. Propongo reinvertir 20 % del próximo retorno en pauta local en Heredia.' });

  // ── Inversionista externo (v6) ────────────────────────────────────────────
  // El admin habilita cada inversión: una con historial y otra disponible para explorar.
  await jey('PUT', `/api/investments/${barberInv}/access`, { allowed_investor_ids: [U.angel] });
  await jey('PUT', `/api/investments/${infraInv}/access`, { allowed_investor_ids: [U.angel] });
  // Ángel entró a BarberXCR después de los repartos: un aporte confirmado y otro esperando SU confirmación.
  const angel = await as('angel');
  const angelFirst = await mov(jey, barberInv, { type: 'aporte', partner_id: U.angel, amount: 500_000_00, date: day(-12), reference: 'SINPE 66120', message: 'Aporte de Ángel para la expansión a Heredia.' });
  await angel('POST', `/api/investor/movements/${angelFirst}/confirm`, { message: 'Enviado desde mi cuenta BN ✓' });
  await mov(jey, barberInv, { type: 'aporte', partner_id: U.angel, amount: 250_000_00, date: day(-1), reference: 'SINPE 70211', message: 'Segundo tramo acordado en la reunión del lunes.' });

  // ── Finanzas de ejemplo: campañas ficticias, nunca datos del negocio real ──
  const [demoYear, demoMonth] = day(0).slice(0, 7).split('-').map(Number);
  const priorMonth = new Date(Date.UTC(demoYear, demoMonth - 2, 1)).toISOString().slice(0, 7);
  for (const [category, label, revenue, ads, delivery] of [
    ['meta_ads', 'Meta Ads', 120_000_00, 18_000_00, 54_000_00],
    ['google_ads', 'Google Ads', 86_000_00, 12_000_00, 39_000_00],
  ]) {
    const campaign = (await jey('POST', '/api/investments', { name: `${label} · ejemplo demo`, category, currency: 'CRC',
      description: 'Datos ficticios para explorar el libro de ventas, costos y anticipos. No representan resultados reales ni una rentabilidad ofrecida.' })).investment;
    await jey('PUT', `/api/investments/${campaign.id}/access`, { allowed_investor_ids: [U.angel] });
    await confirm(jey, await mov(cata, campaign.id, { type: 'aporte', partner_id: U.catalina, amount: 30_000_00,
      date: `${priorMonth}-01`, message: 'DEMO: aporte ficticio para aprender el flujo de confirmación.' }), 'DEMO: confirmación de ejemplo, sin transferencia real.');
    for (const [kind, categoryKey, amount, paid, labelText, date] of [
      ['revenue', 'sale', revenue, true, 'Venta cobrada', '19'],
      ['expense', 'ads', ads, true, 'Publicidad pagada', '12'],
      ['expense', 'delivery', delivery, false, 'Entrega pendiente de pago', '20'],
    ]) await jey('POST', '/api/finance/entries', { kind, category: categoryKey, amount, paid, currency: 'CRC',
      date: `${priorMonth}-${date}`, description: `DEMO · ${labelText} · ${label}`, investment_id: campaign.id, service_key: 'pagina_web' });
    // Requiere configuración y revisión explícitas del admin antes de cualquier anticipo.
    await jey('PUT', `/api/finance/policies/${campaign.id}`, { year: Number(priorMonth.slice(0, 4)), configured: false,
      rate_bps: 2000, beneficiary_ids: [U.catalina, U.angel], reserve_amount: 0, costs_reviewed_through: null });
  }
  await jey('POST', '/api/finance/costing', { name: 'DEMO · costeo de un sitio web', service_key: 'pagina_web', currency: 'USD',
    units: 1, price_per_unit: 570_00, margin_bps: 3000,
    costs: [{ label: 'Diseño y desarrollo de ejemplo', category: 'labor', amount: 290_00 }, { label: 'Herramientas de ejemplo', category: 'software', amount: 35_00 }] });

  // v7: enlaces de registro: uno abierto para socios (2 de 5 cupos usados) y uno personal pendiente.
  await jey('POST', '/api/invites', { kind: 'team', role: 'socio', max_uses: 5, days: 30, label: 'Socios fundadores 2026', message: '¡Bienvenidos! Cualquier duda me escriben al WhatsApp.' });
  await jey('POST', '/api/invites', { kind: 'team', role: 'inversionista', name: 'Mariana Solís', days: 14 });
  const openInvite = db.prepare("SELECT * FROM invites WHERE label = 'Socios fundadores 2026'").get();
  for (const [n, [name, mail]] of [['Daniela Vargas', 'daniela@demo.jcanalytic.local'], ['Ricardo Mena', 'ricardo@demo.jcanalytic.local']].entries()) {
    const userId = Number(db.prepare(`INSERT INTO users (email, name, role, color, password_hash, must_change_password, created_at)
      VALUES (?, ?, 'socio', ?, ?, 0, ?)`).run(mail, name, n ? '#39b51c' : '#e694ae', hash, iso(-24 * (3 - n))).lastInsertRowid);
    db.prepare('INSERT INTO invite_uses (invite_id, user_id, name, email, used_at) VALUES (?, ?, ?, ?, ?)').run(openInvite.id, userId, name, mail, iso(-24 * (3 - n)));
  }
  db.prepare('UPDATE invites SET uses = 2 WHERE id = ?').run(openInvite.id);

  const clients = loginClient ? await seedClientPortal({ db, hash, iso, day, U, C, P, cata, alex, loginClient }) : [];
  return { users: people.map(([email, name, role]) => ({ email, name, role })), clients };
}

/**
 * Portal de clientes (v5): accesos, etapas, avances, entregables, documentos y
 * briefs. El brief "Giveaway Tacos" replica el formato CREATIVIDAD que usa JC.
 */
async function seedClientPortal({ db, hash, iso, day, U, C, P, cata, alex, loginClient }) {
  const accounts = [
    [C.burrada, `laburrada@${DEMO_CLIENT_DOMAIN}`, 'Dueño La Burrada', 'Gerente general', '+506 8888-0000', 1],
    [C.burrada, `marketing.laburrada@${DEMO_CLIENT_DOMAIN}`, 'Marketing La Burrada', 'Redes y promociones', null, 0],
    [C.uniquex, `uniquex@${DEMO_CLIENT_DOMAIN}`, 'Gerencia Uniquex', 'Gerente comercial', null, 1],
  ];
  for (const [clientId, email, name, title, phone, canApprove] of accounts) {
    db.prepare(`INSERT INTO client_accounts (client_id, email, name, title, phone, can_approve, password_hash, must_change_password, active, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`).run(clientId, email, name, title, phone, canApprove, hash, U.catalina, iso(-24 * 20));
  }

  // ── Etapas de cada proyecto (lo que el cliente ve como avance) ────────────
  const stage = (api, projectId, title, status, dueDate, description = null) => api('POST', `/api/projects/${projectId}/milestones`, { title, status, due_date: dueDate, description });
  await stage(cata, P.burrada, 'Alcance y menú digital', 'completado', day(-14), 'Categorías, fotos y precios del menú validados.');
  await stage(cata, P.burrada, 'Diseño del carrito sin cuenta', 'completado', day(-6));
  await stage(alex, P.burrada, 'Desarrollo y pruebas en celulares', 'en_curso', day(4), 'Confirmación de pedido por WhatsApp y pruebas en Android/iPhone.');
  await stage(cata, P.burrada, 'Publicación y capacitación', 'pendiente', day(9));
  await stage(alex, P.uniquex, 'Guion del recorrido', 'completado', day(-24));
  await stage(alex, P.uniquex, 'Escenas interactivas', 'completado', day(-5));
  await stage(alex, P.uniquex, 'Revisión del cliente', 'en_curso', day(2));
  await stage(alex, P.uniquex, 'Publicación y medición', 'pendiente', day(5));
  // Avance ya comunicado (misma hora que el último avance sembrado: no altera el semáforo de 72 h).
  db.prepare('INSERT INTO project_updates (project_id, user_id, channel, note, created_at) VALUES (?, ?, ?, ?, ?)').run(
    P.burrada, U.catalina, 'whatsapp', 'El carrito sin cuenta ya funciona en pruebas. Esta semana conectamos la confirmación por WhatsApp.', iso(-81),
  );

  // ── Documentos compartidos ────────────────────────────────────────────────
  const doc = (body) => cata('POST', `/api/clients/${C.burrada}/documents`, body);
  await doc({ title: 'Propuesta y alcance firmados', url: 'https://docs.example.com/laburrada/propuesta-firmada.pdf', category: 'contrato', project_id: P.burrada });
  await doc({ title: 'Factura electrónica · anticipo 50 %', url: 'https://docs.example.com/laburrada/fe-anticipo.pdf', category: 'facturacion', note: 'Pagada. Saldo contra entrega.' });
  await doc({ title: 'Manual de marca La Burrada', url: 'https://docs.example.com/laburrada/manual-de-marca', category: 'marca' });

  // ── Briefs ────────────────────────────────────────────────────────────────
  const owner = await loginClient(`laburrada@${DEMO_CLIENT_DOMAIN}`);
  // 1) El brief del formato CREATIVIDAD, enviado por el cliente: queda "por revisar" para el equipo.
  const giveaway = (await owner('POST', '/api/client/briefs', {
    title: 'Giveaway Tacos · promoción de octubre',
    data: {
      brand: 'La Burrada',
      materials: ['email', 'redes_post', 'redes_historias'],
      objective: 'conversion',
      kpi_target: '150 pedidos por WhatsApp durante la promoción',
      offer: 'Giveaway de tacos y descuentos de temporada.',
      key_message: 'Desarrollar estrategia que comunique la promoción "Giveaway Tacos". Mensaje enfocado en generar demanda, destacar la promoción con una introducción agresiva. Priorizar urgencia, visibilidad de la oferta y CTA fuerte a compra inmediata.',
      cta: 'Pedí ya por WhatsApp',
      tone: 'urgente',
      social_accounts: 'La Burrada · GIVEAWAY TACOS',
      database_segment: 'Segmentación con mayor alcance. Subject lines con un hook de alto impacto enfocado en la promoción y la innovación.',
      links: [
        { label: 'WhatsApp', url: 'https://wa.me/50688880000' },
        { label: 'Facebook', url: 'https://www.facebook.com/laburradacr' },
        { label: 'Sitio web', url: 'https://www.laburradacr.com/' },
      ],
      includes_creative: true,
      editable_format: 'template',
      send_setup: true,
      test_email: `pruebas.laburrada@${DEMO_CLIENT_DOMAIN}`,
      send_start: day(6),
      send_end: day(15),
      is_contest: true,
      disclaimer: 'Promoción válida durante las fechas indicadas o hasta agotar existencias. Participan mayores de 18 años. Aplican restricciones.',
      rights_confirmed: true,
    },
  })).brief;
  await owner('POST', `/api/client/briefs/${giveaway.id}/submit`, {});
  await owner('POST', `/api/client/briefs/${giveaway.id}/comments`, { body: 'Si se puede, que el primer correo salga el lunes temprano.' });

  // 2) Un brief del equipo ya aprobado y en producción, con entregable por aprobar.
  const seasonal = (await cata('POST', '/api/briefs', {
    client_id: C.burrada, project_id: P.burrada, title: 'Menú de temporada · historias semanales',
    data: {
      materials: ['redes_historias', 'reels_video'], objective: 'engagement', offer: 'Platillos de temporada con 10 % los miércoles.',
      key_message: 'Mostrar los platillos nuevos con video corto, cercano y apetitoso; invitar a probarlos esta semana.',
      tone: 'cercano', social_accounts: 'Instagram y Facebook de La Burrada', includes_creative: true, editable_format: 'ambos',
      send_start: day(4), send_end: day(30), rights_confirmed: true,
    },
  })).brief;
  await cata('POST', `/api/briefs/${seasonal.id}/submit`, {});
  await cata('POST', `/api/briefs/${seasonal.id}/transition`, { to: 'aprobado' });
  await cata('POST', `/api/briefs/${seasonal.id}/transition`, { to: 'en_produccion' });
  await cata('POST', `/api/briefs/${seasonal.id}/comments`, { body: 'Hillary graba el jueves en el local; confirmar horario con el dueño.', internal: true });

  // ── Entregables ───────────────────────────────────────────────────────────
  const share = (api, body) => api('POST', '/api/deliverables', body);
  const proto = (await share(alex, { client_id: C.burrada, project_id: P.burrada, title: 'Prototipo del carrito', description: 'Flujo completo: menú → carrito → confirmación.', url: 'https://www.laburradacr.com/?demo=carrito' })).deliverable;
  await owner('POST', `/api/client/deliverables/${proto.id}/decision`, { decision: 'aprobado', version: 1, note: '¡Muy claro y rápido!' });
  await share(cata, { client_id: C.burrada, project_id: P.burrada, brief_id: seasonal.id, title: 'Historias semana 1 · menú de temporada', description: '4 historias + 1 reel de 20 s.', url: 'https://docs.example.com/laburrada/historias-semana-1' });
  await share(alex, { client_id: C.uniquex, project_id: P.uniquex, title: 'Landing narrativa · versión 2', description: 'Incluye los ajustes de la escena de portones.', url: 'https://uniquexcr.com/landing?v=2' });

  // Los avisos de la siembra al equipo quedan leídos, salvo el brief por revisar.
  db.prepare("UPDATE notifications SET read_at = ? WHERE kind = 'deliverable' AND read_at IS NULL").run(iso(0));
  return accounts.map(([, email, name]) => ({ email, name }));
}
