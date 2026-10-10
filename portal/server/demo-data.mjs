// ============================================================================
//  server/demo-data.mjs — datos de DEMOSTRACIÓN (sin dependencias de Node).
//  Los usa el seed local (HTTP) y la demo del navegador (llamada directa).
//  Todo pasa por la API real para ejercitar las mismas reglas de producción.
//  Montos, prospectos y mensajes son ficticios.
// ============================================================================

export const DEMO_PASSWORD = 'DemoPortal2026';
export const DEMO_DOMAIN = 'demo.jcanalytic.local';

/**
 * @param {object} o
 * @param {object} o.db            base con prepare()/exec()
 * @param {string} o.passwordHash  hash de DEMO_PASSWORD para todas las cuentas
 * @param {(who: string) => Promise<(method: string, path: string, body?: object) => Promise<any>>} o.login
 *        inicia sesión como `who` (parte local del correo) y devuelve un cliente de la API
 * @param {number} [o.now]
 */
export async function seedDemoData({ db, passwordHash, login, now: nowArg }) {
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

  // ── Proyectos ─────────────────────────────────────────────────────────────
  const P = {};
  const project = async (key, api, body, lastUpdateHoursAgo) => {
    P[key] = (await api('POST', '/api/projects', body)).project.id;
    if (lastUpdateHoursAgo != null) db.prepare('UPDATE projects SET last_update_at = ?, sla_started_at = ? WHERE id = ?').run(iso(-lastUpdateHoursAgo), iso(-lastUpdateHoursAgo - 24 * 7), P[key]);
  };
  await project('burrada', cata, { name: 'Pedidos en línea La Burrada', client: 'La Burrada Street Food', kind: 'cliente', service: 'pagina_web', status: 'en_curso', owner_id: U.alex, start_date: day(-18), due_date: day(9), value_amount: 46_350_000, currency: 'CRC', contact_name: 'Dueño La Burrada', contact_phone: '+506 8888-0000', url: 'https://www.laburradacr.com/', description: 'Menú digital, carrito sin cuenta y confirmación por WhatsApp. Fase 2: panel de pedidos para cocina.' }, 81);
  await project('uniquex', cata, { name: 'Landing narrativa Uniquex', client: 'Uniquex Costa Rica', kind: 'cliente', service: 'pagina_web', status: 'en_revision', owner_id: U.alex, start_date: day(-30), due_date: day(3), value_amount: 61_800_000, currency: 'CRC', url: 'https://uniquexcr.com/landing', description: 'Recorrido de un día en la casa con escenas interactivas y agenda de visita técnica.' }, 52);
  await project('vip', jey, { name: 'Cotizador Comercial VIP', client: 'Freight forwarder VIP', kind: 'cliente', service: 'software_medida', status: 'soporte', owner_id: U.jeyrell, start_date: day(-75), due_date: day(-26), delivered_at: day(-25), value_amount: 2_800_00, currency: 'USD', description: 'Cotizador FCL/LCL/aéreo/terrestre, routing order de 5 hitos y scorecard gerencial.' });
  await project('roble', cata, { name: 'Dashboard financiero Ferretería El Roble', client: 'Ferretería El Roble (prospecto)', kind: 'cliente', service: 'power_bi', status: 'prospecto', owner_id: U.jeyrell, value_amount: 180_000_00, currency: 'CRC', description: 'Ventas, margen por categoría y cuentas por cobrar. Pendiente sesión de alcance.' });
  await project('barber', jey, { name: 'BarberXCR · crecimiento', kind: 'producto', service: 'producto_saas', status: 'en_curso', owner_id: U.jeyrell, start_date: day(-60), url: 'https://barberxcr.com/', description: 'Plataforma de reservas para barberías. Meta: 25 barberías activas a fin de año.' });
  await project('taller', alex, { name: 'Taller Ticos · lanzamiento talleres', kind: 'producto', service: 'producto_saas', status: 'en_curso', owner_id: U.alex, start_date: day(-20), due_date: day(40), url: 'https://www.tallerticos.com/' });
  await project('marca', hil, { name: 'Contenido y pauta JC Analytics', kind: 'interno', service: 'community_manager', status: 'en_curso', owner_id: U.hillary, description: 'Calendario mensual, reels de casos y campañas Meta Ads.' });

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

  // ── Avances a clientes ────────────────────────────────────────────────────
  await cata('POST', `/api/projects/${P.vip}/updates`, { channel: 'reunion', note: 'Entrega formal y capacitación al equipo comercial. Inicia soporte de 30 días.' });

  // ── Agenda ────────────────────────────────────────────────────────────────
  const appts = [
    [cata, { title: 'Sesión de alcance · Ferretería El Roble', kind: 'alcance', status: 'confirmada', starts_at: crAt(0, 15), ends_at: crAt(0, 16), meeting_url: 'https://meet.google.com/abc-defg-hij', project_id: P.roble, contact_name: 'Gerente El Roble', contact_phone: '+506 8800-1122', attendees: [U.jeyrell, U.catalina] }],
    [alex, { title: 'Demo del panel de cocina', kind: 'demo', starts_at: crAt(1, 10), ends_at: crAt(1, 10, 45), location: 'La Burrada, San Pedro', project_id: P.burrada, contact_name: 'Dueño La Burrada', contact_phone: '+506 8888-0000', attendees: [U.alex, U.catalina] }],
    [jey, { title: 'Reunión semanal de socios', kind: 'interna', status: 'confirmada', starts_at: crAt(2, 8), ends_at: crAt(2, 9), meeting_url: 'https://meet.google.com/jca-socios-sem', notes: 'Revisar portafolio de inversiones y pipeline.', attendees: [U.jeyrell, U.catalina, U.alex, U.socio5] }],
    [cata, { title: 'Entrega landing Uniquex', kind: 'entrega', starts_at: crAt(3, 14), ends_at: crAt(3, 15), project_id: P.uniquex, attendees: [U.alex, U.catalina] }],
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

  return { users: people.map(([email, name, role]) => ({ email, name, role })) };
}
