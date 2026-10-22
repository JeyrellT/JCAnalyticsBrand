// ============================================================================
//  server/whatsapp/bot.mjs
//  Motor de conversación del asistente de WhatsApp. PURO: estado + mensaje +
//  datos del portal → respuestas + estado nuevo. Sin base, sin red, sin reloj
//  propio (todo se inyecta), así se prueba con conversaciones completas.
//
//  Principios (docs/whatsapp.md):
//    · Las respuestas salen de textos aprobados y de datos reales del portal
//      (proyectos, entregables, reuniones). Nunca inventa precios, fechas ni promesas.
//    · Pide una cosa a la vez; máximo dos burbujas por turno.
//    · Si no entiende dos veces, o la persona lo pide, pasa el caso al equipo.
//    · Español de Costa Rica (voseo), sin emojis, como el resto del portal.
// ============================================================================

// ── Normalización tolerante ─────────────────────────────────────────────────

const ABBREVIATIONS = {
  q: 'que', k: 'que', xq: 'porque', pq: 'porque', porq: 'porque', tb: 'tambien', tmb: 'tambien',
  xfa: 'por favor', porfa: 'por favor', pls: 'por favor', plis: 'por favor',
  ola: 'hola', holi: 'hola', holis: 'hola', bns: 'buenas', wenas: 'buenas', buenass: 'buenas',
  dnd: 'donde', cdo: 'cuando', info: 'informacion', reu: 'reunion', reus: 'reuniones',
  wsp: 'whatsapp', wasap: 'whatsapp', ok: 'ok', okis: 'ok', oki: 'ok', grax: 'gracias', grs: 'gracias', grcs: 'gracias',
  pa: 'para', x: 'por', d: 'de', tqm: 'gracias',
};

/** Palabras clave contra las que se corrigen faltas de ortografía (distancia de Levenshtein). */
const VOCABULARY = [
  'proyecto', 'proyectos', 'avance', 'avances', 'entregable', 'entregables', 'aprobar', 'aprobacion', 'revisar',
  'reunion', 'reuniones', 'agenda', 'servicio', 'servicios', 'cotizacion', 'cotizar', 'precio', 'precios',
  'persona', 'alguien', 'asesor', 'ejecutivo', 'urgente', 'emergencia', 'gracias', 'buenas', 'hola', 'estado',
  'factura', 'facturas', 'pago', 'queja', 'reclamo', 'activar', 'avisos', 'cliente', 'opciones', 'menu',
];
/** Nunca se "corrigen" (la corrección cambiaría el sentido). */
const PROTECTED = new Set(['personas', 'personal', 'pago', 'pagos', 'precio', 'precios', 'proyecto', 'proyectos', 'esta', 'estas', 'nada', 'cada']);

function levenshtein(a, b) {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
    }
  }
  return prev[b.length];
}

function correct(word) {
  if (word.length < 5 || PROTECTED.has(word) || VOCABULARY.includes(word) || /\d/.test(word)) return word;
  let best = word;
  let bestDistance = Infinity;
  for (const candidate of VOCABULARY) {
    if (Math.abs(candidate.length - word.length) > 2) continue;
    const tolerance = word.length >= 8 && candidate[0] === word[0] ? 2 : 1;
    const d = levenshtein(word, candidate);
    if (d <= tolerance && d < bestDistance) { best = candidate; bestDistance = d; }
  }
  return best;
}

/** Minúsculas, sin tildes, solo [a-z0-9 ], abreviaturas expandidas y faltas comunes corregidas; envuelto en espacios. */
export function normalize(input) {
  const base = String(input ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ').replace(/ñ/g, 'n').replace(/\s+/g, ' ').trim();
  if (!base) return ' ';
  const words = base.split(' ').map((w) => ABBREVIATIONS[w] ?? w).join(' ').split(' ').map(correct);
  return ` ${words.join(' ')} `;
}

// ── Intenciones ─────────────────────────────────────────────────────────────

const NEGATION = / (no|ningun|ninguna|nada de|sin) (tengo |hay |es |esta )?(ningun |ninguna )?(problema|urgencia|queja|apuro|prisa)/;

export const INTENTS = {
  saludo: / (hola|buenas|buenos dias|buen dia|saludos|que tal|hey|pura vida) /,
  gracias: / (gracias|muchas gracias|muy amable|se agradece|mil gracias) /,
  adios: / (adios|chao|hasta luego|nos vemos|bye|hasta pronto) /,
  menu: / (menu|opciones|ayuda|inicio|empezar|que puedo hacer|que podes hacer) /,
  robot: / (bot|robot|maquina|automatico|inteligencia artificial|sos real|es real|sos una persona|eres una persona) /,
  persona: / (hablar con|persona|alguien|asesor|ejecutivo|humano|llamar|llamen|llamenme|contactar|comunicarme|hablar) /,
  urgente: / (urgente|emergencia|urgencia|se cayo|esta caido|caida|no funciona|no sirve|no carga|dejo de funcionar|lo antes posible) /,
  queja: / (queja|reclamo|molesto|molesta|pesimo|mal servicio|inaceptable|nadie me responde|nadie contesta|no me contestan) /,
  proyectos: / (proyecto|proyectos|estado|avance|avances|como va|como vamos|progreso|etapa|etapas|como van) /,
  aprobar: / (aprobar|aprobacion|entregable|entregables|revisar|revision|por aprobar|pendiente de aprobar) /,
  reuniones: / (reunion|reuniones|agenda|cita|citas|llamada programada|meeting|cuando nos reunimos) /,
  servicios: / (servicio|servicios|que hacen|que ofrecen|ofrecen|cotizacion|cotizar|cotizan|precio|precios|cuanto cuesta|cuanto vale|presupuesto) /,
  soyCliente: / (soy cliente|ya soy cliente|activar|vincular|avisos por whatsapp|recibir avisos) /,
  factura: / (factura|facturas|pago|pagos|cobro|cobros|sinpe|transferencia) /,
};

const ASSENT = /^ (ok|okey|okay|listo|perfecto|dale|va|vale|entendido|de acuerdo|genial|excelente|super|bien|muy bien|si|claro|ya|ah ok|aja|mmm|mm|ah) $/;
export const isAssent = (norm) => ASSENT.test(norm) || norm.trim() === '';
export const isUrgent = (norm) => INTENTS.urgente.test(norm) && !NEGATION.test(norm);
export const isComplaint = (norm) => INTENTS.queja.test(norm) && !NEGATION.test(norm);

/** Botones de WhatsApp: título de 20 caracteres o menos. */
export const BUTTONS_CLIENT = ['Mis proyectos', 'Por aprobar', 'Reuniones', 'Hablar con alguien'];
export const BUTTONS_GUEST = ['Servicios', 'Soy cliente', 'Hablar con alguien'];

// ── Vincular y permisos (los ejecuta el orquestador; aquí solo se reconocen) ──

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const LINK_CODE_LENGTH = 6;
const LINK_RE = new RegExp(`^\\s*activar\\s+([${CODE_ALPHABET}${CODE_ALPHABET.toLowerCase()}]{${LINK_CODE_LENGTH}})\\s*$`, 'i');

/** "ACTIVAR K7Q4M2" → "K7Q4M2"; si no es un mensaje de activación, null. */
export function parseLinkCode(raw) {
  const m = LINK_RE.exec(String(raw ?? ''));
  return m ? m[1].toUpperCase() : null;
}

/** Código nuevo con el alfabeto sin caracteres ambiguos (sin 0/O ni 1/I/L). `random` devuelve bytes. */
export function newLinkCode(randomBytesFn) {
  const bytes = randomBytesFn(LINK_CODE_LENGTH);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** 'out' (AVISOS NO / BAJA), 'in' (AVISOS SI) o null. */
export function optIntent(raw) {
  const norm = normalize(raw);
  if (/^ (avisos no|no avisos|no mas avisos|baja|stop|darme de baja|dar de baja|no quiero avisos|no quiero recibir avisos|cancelar avisos) $/.test(norm)) return 'out';
  if (/^ (avisos si|si avisos|quiero avisos|reactivar avisos) $/.test(norm)) return 'in';
  return null;
}

// ── Textos ──────────────────────────────────────────────────────────────────

const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || '';

/** Elige al azar sin repetir la última frase de ese grupo. */
function pick(state, group, options, rand) {
  const last = state.last?.[group];
  const pool = options.length > 1 ? options.filter((o) => o !== last) : options;
  const choice = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  state.last = { ...(state.last ?? {}), [group]: choice };
  return choice;
}

/** Saludo según la hora de Costa Rica (UTC−6 fijo). */
function greetingFor(ms) {
  const h = new Date(ms - 6 * 3_600_000).getUTCHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const dateFmt = new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
/** "martes 14 de octubre, 10:00 a. m." sin el doble punto de "a. m.." ni espacios raros. */
export const formatWhen = (iso) => dateFmt.format(new Date(iso)).replace(/\s+/g, ' ').replace(/\.\./g, '.');

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const owner = (facts) => firstName(facts.ownerName) || 'el equipo';
/** "a Catalina" o "al equipo" (nunca "a el equipo"). */
const toOwner = (facts) => (firstName(facts.ownerName) ? `a ${firstName(facts.ownerName)}` : 'al equipo');

function projectsText(facts) {
  const list = (facts.projects ?? []).slice(0, 5);
  if (!list.length) return 'Por ahora no tenés proyectos activos en el portal.';
  const lines = list.map((p) => {
    const steps = p.milestones_total ? `, ${p.milestones_done} de ${p.milestones_total} etapas` : '';
    const next = p.next_milestone ? `. Sigue: ${p.next_milestone}` : '';
    return `• ${p.name}: ${p.status_label}${steps}${next}.`;
  });
  const extra = facts.projects.length > list.length ? `\n(Y ${plural(facts.projects.length - list.length, 'proyecto más', 'proyectos más')} en tu portal.)` : '';
  return `${list.length === 1 ? 'Tu proyecto' : 'Tus proyectos'}:\n${lines.join('\n')}${extra}`;
}

function approvalsText(facts) {
  const list = facts.toApprove ?? [];
  if (!list.length) return 'No tenés entregables esperando tu aprobación. Cuando el equipo comparta uno, te aviso por aquí.';
  const lines = list.slice(0, 5).map((d) => `• ${d.title}${d.project_name ? ` (${d.project_name})` : ''}`);
  const how = facts.canApprove === false ? 'Los puede aprobar otra persona de tu empresa desde el portal.' : 'Los revisás y aprobás desde tu portal, en Entregables.';
  return `${plural(list.length, 'entregable espera', 'entregables esperan')} tu revisión:\n${lines.join('\n')}\n${how}`;
}

function meetingsText(facts) {
  const list = facts.meetings ?? [];
  if (!list.length) return `No hay reuniones agendadas. Si querés coordinar una, se lo paso ${toOwner(facts)}.`;
  const lines = list.slice(0, 3).map((m) => `• ${m.title}: ${formatWhen(m.starts_at)}${m.meeting_url ? ' (en línea)' : m.location ? ` en ${m.location}` : ''}`);
  return `${list.length === 1 ? 'Tu próxima reunión' : 'Tus próximas reuniones'}:\n${lines.join('\n')}`;
}

// ── Estado ──────────────────────────────────────────────────────────────────

const STEPS = { motivo: true };
const EMPTY_STATE = Object.freeze({ step: null, fails: 0, greeted: false, last: {} });

/** Lee el estado guardado validando campo por campo (nunca se confía en el JSON tal cual). */
export function readState(raw) {
  let parsed = {};
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw ?? {}; } catch { parsed = {}; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
  const last = {};
  if (parsed.last && typeof parsed.last === 'object' && !Array.isArray(parsed.last)) {
    for (const [k, v] of Object.entries(parsed.last)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (typeof v === 'string' && v.length <= 400 && /^[a-z_]{1,20}$/.test(k)) last[k] = v;
    }
  }
  return {
    step: typeof parsed.step === 'string' && Object.hasOwn(STEPS, parsed.step) ? parsed.step : null,
    fails: Number.isInteger(parsed.fails) && parsed.fails >= 0 && parsed.fails < 10 ? parsed.fails : 0,
    greeted: parsed.greeted === true,
    last,
  };
}

// ── Motor ───────────────────────────────────────────────────────────────────

/**
 * @param {object} prev     estado guardado (readState)
 * @param {object} input    { text, media?: { type } }
 * @param {object} o
 * @param {number} o.now    reloj (ms)
 * @param {object} o.facts  { linked, name, clientName, ownerName, canApprove, projects, toApprove, meetings }
 * @param {() => number} [o.rand]
 * @returns {{ replies: {text: string, buttons?: string[]}[], state: object, handoff?: { reason: string, urgent: boolean, summary: string } }}
 */
export function respond(prev, input, { now, facts, rand = Math.random }) {
  const saved = readState(prev);
  const state = { ...EMPTY_STATE, ...saved, last: { ...saved.last } };
  const text = String(input?.text ?? '').trim().slice(0, 1000);
  const norm = normalize(text);
  const linked = !!facts?.linked;
  const menu = linked ? BUTTONS_CLIENT : BUTTONS_GUEST;
  const name = firstName(facts?.name);
  const out = (replies, extra = {}) => ({ replies, state, ...extra });
  const handoff = (reason, summary, { urgent = false, reply } = {}) => {
    state.step = null;
    state.fails = 0;
    const message = reply ?? pick(state, 'handoff', [
      `Listo, ya le avisé ${toOwner(facts)}. Te escribe por aquí en cuanto pueda.`,
      `Perfecto, se lo paso ${toOwner(facts)}. Te contesta por este mismo chat.`,
    ], rand);
    return out([{ text: message }], { handoff: { reason, urgent, summary: summary.slice(0, 500) } });
  };

  // Adjuntos (fotos, documentos, audios): siempre los revisa una persona.
  if (input?.media) {
    const label = { IMAGEN: 'una foto', AUDIO: 'un audio', VIDEO: 'un video', DOCUMENTO: 'un documento', STICKER: 'un sticker' }[input.media.type] ?? 'un archivo';
    if (input.media.type === 'STICKER' && !text) return out([]);
    const reply = input.media.type === 'AUDIO'
      ? `Gracias. Todavía no puedo escuchar audios, así que se lo paso ${toOwner(facts)}. Si es algo rápido, también me lo podés escribir.`
      : `Gracias, lo recibí. Se lo paso ${toOwner(facts)} para que lo revise.`;
    return handoff('adjunto', `Envió ${label}${text ? `: ${text}` : '.'}`, { reply });
  }

  // "ok", "listo", "aja": no se contesta (el asentimiento no pide respuesta).
  if (isAssent(norm) && !state.step) return out([]);

  // ── Interrupciones (en cualquier paso) ──
  if (isUrgent(norm)) {
    return handoff('urgente', text, {
      urgent: true,
      reply: `Entendido, lo marco como urgente y le aviso ${toOwner(facts)} ya mismo. Te escribe por aquí lo antes posible.`,
    });
  }
  if (isComplaint(norm)) {
    return handoff('queja', text, {
      urgent: true,
      reply: `Lamento la molestia${name ? `, ${name}` : ''}. Ya le pasé tu mensaje ${toOwner(facts)} para que lo atienda personalmente.`,
    });
  }
  if (INTENTS.robot.test(norm) && /\?|^ (sos|eres|es) /.test(` ${text.toLowerCase()} `)) {
    return out([{
      text: `Soy el asistente automático de JC Analytics. Te ayudo con el estado de tus proyectos y, si preferís, te paso con una persona del equipo.`,
      buttons: menu,
    }]);
  }

  // ── Paso activo: se está pidiendo el motivo para pasarlo al equipo ──
  if (state.step === 'motivo') {
    if (isAssent(norm) || INTENTS.saludo.test(norm) && norm.split(' ').filter(Boolean).length <= 2) {
      return out([{ text: '¿Me contás en un mensaje qué necesitás? Así se lo paso completo al equipo.' }]);
    }
    return handoff('persona', text);
  }

  // ── Pedir una persona ──
  if (INTENTS.persona.test(norm) || norm === ' hablar con alguien ') {
    // Si ya trae el motivo ("necesito hablar con alguien sobre la factura de octubre"), se pasa directo.
    const rest = norm.replace(INTENTS.persona, ' ').replace(/ (quiero|quisiera|necesito|podria|puedo|me gustaria|con|un|una|del|equipo|por favor) /g, ' ').trim();
    if (rest.split(' ').filter((w) => w.length > 2).length >= 3) return handoff('persona', text);
    state.step = 'motivo';
    return out([{ text: pick(state, 'motivo', [
      `Claro. ¿Me contás en un mensaje qué necesitás? Se lo paso ${toOwner(facts)}.`,
      `Con gusto te paso con ${owner(facts)}. Contame en un mensaje de qué se trata.`,
    ], rand) }]);
  }

  // ── Información del portal (los pagos van primero: "el pago del proyecto" lo ve una persona) ──
  if (INTENTS.factura.test(norm)) {
    return handoff('pagos', text, { reply: `Los temas de facturas y pagos los ve una persona del equipo. Ya le pasé tu mensaje ${toOwner(facts)}.` });
  }
  if (INTENTS.proyectos.test(norm) || norm === ' mis proyectos ') {
    if (!linked) return notLinked();
    state.fails = 0;
    return out([{ text: projectsText(facts) }, { text: '¿Te ayudo con algo más?', buttons: ['Por aprobar', 'Reuniones', 'Hablar con alguien'] }]);
  }
  if (INTENTS.aprobar.test(norm)) {
    if (!linked) return notLinked();
    state.fails = 0;
    return out([{ text: approvalsText(facts) }, { text: '¿Algo más?', buttons: ['Mis proyectos', 'Reuniones', 'Hablar con alguien'] }]);
  }
  if (INTENTS.reuniones.test(norm)) {
    if (!linked) return notLinked();
    state.fails = 0;
    return out([{ text: meetingsText(facts) }, { text: '¿Te ayudo con algo más?', buttons: ['Mis proyectos', 'Por aprobar', 'Hablar con alguien'] }]);
  }
  if (INTENTS.servicios.test(norm)) {
    state.fails = 0;
    return out([
      { text: 'En JC Analytics hacemos sistemas y páginas web, datos y reportes (BI), automatización de procesos, apoyo fiscal, marketing y formación.' },
      { text: 'Cada proyecto se cotiza según lo que necesitás. ¿Querés que alguien del equipo te contacte para conversarlo?', buttons: ['Hablar con alguien', 'Soy cliente'] },
    ]);
  }
  if (INTENTS.soyCliente.test(norm)) {
    state.fails = 0;
    if (linked) return out([{ text: `Ya tenés este número vinculado${facts.clientName ? ` a ${facts.clientName}` : ''}, así que te llegan los avisos del portal por aquí.`, buttons: menu }]);
    return out([
      { text: 'Para recibir los avisos de tu servicio por WhatsApp, entrá a tu portal de clientes, abrí Mi cuenta y tocá "Activar avisos por WhatsApp".' },
      { text: 'Eso te da un código para enviarme por aquí. ¿Te ayudo con algo más?', buttons: ['Servicios', 'Hablar con alguien'] },
    ]);
  }

  // ── Conversación ──
  if (INTENTS.gracias.test(norm) || INTENTS.adios.test(norm)) {
    state.fails = 0;
    return out([{ text: pick(state, 'cierre', ['Con gusto. Si necesitás algo más, escribime por aquí.', 'Para servirte. Aquí estoy si necesitás algo.'], rand) }]);
  }
  if (INTENTS.saludo.test(norm) || INTENTS.menu.test(norm) || !state.greeted) {
    const first = !state.greeted;
    state.greeted = true;
    state.fails = 0;
    const hello = `${greetingFor(now)}${name ? `, ${name}` : ''}.`;
    const intro = linked
      ? `${hello} Soy el asistente de JC Analytics${facts.clientName ? ` para ${facts.clientName}` : ''}.`
      : `${hello} Soy el asistente de JC Analytics.`;
    const ask = linked ? '¿En qué te ayudo? Puedo contarte cómo van tus proyectos, qué tenés por aprobar o tus próximas reuniones.' : '¿En qué te ayudo?';
    // Si el primer mensaje traía algo más que un saludo y no se entendió, se ofrece el menú igual.
    if (first || INTENTS.saludo.test(norm)) return out([{ text: intro }, { text: ask, buttons: menu }]);
    return out([{ text: ask, buttons: menu }]);
  }

  // ── No entendió ──
  state.fails += 1;
  if (state.fails >= 2) {
    return handoff('no_entendio', text, { reply: `Prefiero no adivinar: te paso con ${owner(facts)} para que te ayude mejor. Te escribe por aquí.` });
  }
  return out([{ text: 'No te entendí bien. ¿Me lo decís de otra forma o elegís una opción?', buttons: menu }], { notUnderstood: true });

  function notLinked() {
    state.fails = 0;
    return out([
      { text: 'Para darte esa información necesito saber que este número es tuyo. Activalo desde tu portal de clientes, en Mi cuenta → "Activar avisos por WhatsApp".' },
      { text: '¿Querés que te pase con alguien del equipo mientras tanto?', buttons: ['Hablar con alguien', 'Servicios'] },
    ]);
  }
}

/** Respuesta al intentar vincular el número con un código del portal. */
export function linkReply(result, { name, clientName } = {}) {
  if (result === 'linked') {
    return [
      { text: `Listo${firstName(name) ? `, ${firstName(name)}` : ''}. Este número quedó vinculado${clientName ? ` a ${clientName}` : ''} y te van a llegar por aquí los avisos de tu portal.` },
      { text: 'Si en algún momento no los querés recibir, escribí AVISOS NO. ¿Te ayudo con algo más?', buttons: BUTTONS_CLIENT },
    ];
  }
  if (result === 'blocked') return [{ text: 'Hubo demasiados intentos con códigos que no coinciden. Probá de nuevo mañana o pedile ayuda a tu ejecutivo de cuenta.' }];
  return [{ text: 'Ese código no coincide o ya venció. Generá uno nuevo en tu portal, en Mi cuenta → "Activar avisos por WhatsApp", y enviámelo tal cual.' }];
}

export function optReply(result) {
  if (result === 'out') return [{ text: 'Listo, ya no te vamos a enviar avisos por WhatsApp. Los seguís viendo en tu portal. Si cambiás de idea, escribí AVISOS SI.' }];
  if (result === 'in') return [{ text: 'Listo, vuelven a llegarte los avisos de tu portal por aquí. Para pausarlos, escribí AVISOS NO.' }];
  return [{ text: 'Este número todavía no está vinculado a una cuenta del portal. Activalo desde Mi cuenta en tu portal de clientes.' }];
}

/** Máximo dos burbujas: todo menos la última va junto en un párrafo; la última lleva la pregunta y los botones. */
export function groupBubbles(replies) {
  const list = replies.filter((r) => r?.text?.trim());
  if (list.length <= 2) return list.map(clean);
  const last = list.at(-1);
  return [clean({ text: list.slice(0, -1).map((r) => r.text).join('\n\n') }), clean(last)];
}
const clean = (r) => ({ ...r, text: r.text.replace(/[ \t]{2,}/g, ' ').replace(/\.\./g, '.').trim() });

/** Tiempo de "escribiendo…" según el largo (1,5 s + 50 ms por letra, ±10 %, entre 2 y 8 s). */
export function typingDelay(text, rand = Math.random) {
  return Math.round(Math.max(2000, Math.min(8000, (1500 + String(text).length * 50) * (0.9 + rand() * 0.2))));
}
