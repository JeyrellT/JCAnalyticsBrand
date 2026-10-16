// Cliente de la API: mismo origen, cookie de sesión y encabezado anti-CSRF.
// La demo del navegador (demo/) cambia el transporte con setTransport(): las
// peticiones van a un backend en memoria en lugar de fetch, con la misma forma
// de respuesta y los mismos errores.

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error ?? `http_${status}`);
    this.status = status;
    this.data = data ?? {};
  }
}

const listeners = new Set();
/** Avisa cuando la sesión venció (401) para volver al login. */
export const onUnauthenticated = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/** fn(path, { method, body }) → Promise<{ status, data }>. null vuelve a usar fetch. */
let transport = null;
export const setTransport = (fn) => { transport = typeof fn === 'function' ? fn : null; };

let demo = null;
/** Activa el modo demo (datos ficticios). info: { personas, password } para el selector de personas. */
export const enableDemo = (info = {}) => { demo = { personas: [], password: '', ...info }; };
export const isDemo = () => demo !== null;
export const demoInfo = () => demo ?? { personas: [], password: '' };

async function viaFetch(path, method, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'X-Portal-Request': '1' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { error: 'network' });
  }
  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin JSON */ }
  return { status: res.status, data };
}

async function viaTransport(path, method, body) {
  try {
    const out = await transport(path, { method, body });
    return { status: out.status, data: out.data ?? null };
  } catch {
    throw new ApiError(0, { error: 'network' });
  }
}

const LOGIN_PATHS = ['/api/auth/login', '/api/client/auth/login'];

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, quiet?: boolean }} [o]  quiet: un 401 no cierra la sesión
 *        en pantalla (lo usa la detección inicial, que prueba la sesión del equipo y la del cliente).
 */
export async function api(path, { method = 'GET', body, quiet = false } = {}) {
  const { status, data } = transport ? await viaTransport(path, method, body) : await viaFetch(path, method, body);
  if (status < 200 || status > 299) {
    if (status === 401 && !quiet && !LOGIN_PATHS.some((p) => path.startsWith(p))) listeners.forEach((fn) => fn());
    throw new ApiError(status, data);
  }
  return data;
}

const MESSAGES = {
  network: 'Sin conexión con el portal. Revisá tu internet e intentá de nuevo.',
  invalid_credentials: 'Correo o contraseña incorrectos.',
  too_many_attempts: 'Demasiados intentos. Esperá 15 minutos antes de volver a probar.',
  unauthenticated: 'Tu sesión venció. Volvé a ingresar.',
  password_change_required: 'Primero cambiá tu contraseña temporal.',
  forbidden: 'No tenés permiso para esta acción.',
  csrf_blocked: 'La solicitud fue bloqueada por seguridad. Recargá la página.',
  not_found: 'No encontramos ese registro. Puede que alguien lo haya eliminado.',
  not_pending: 'Este movimiento ya fue resuelto por otra persona.',
  not_your_confirmation: 'Este movimiento lo debe confirmar otra persona.',
  cannot_annul: 'No podés anular este movimiento.',
  investment_closed: 'La inversión está cerrada: no admite movimientos.',
  investment_not_allowed: 'Administración debe habilitar esta inversión para que el inversionista pueda registrar nuevos aportes.',
  closed_period: 'Este período ya tiene un reparto o cierre. Registrá la corrección en un período abierto.',
  stale_preview: 'Los datos cambiaron desde la vista previa. Volvé a calcular el reparto antes de registrarlo.',
  policy_not_configured: 'Administración debe confirmar el acuerdo y sus beneficiarios antes de repartir.',
  payout_exceeds_available: 'El reparto supera la utilidad, el capital o la caja disponibles. Revisá los importes.',
  period_not_finished: 'El anticipo se registra después de finalizar el mes.',
  costs_not_reviewed: 'Falta revisar los costos de la campaña hasta el cierre del mes.',
  unclassified_returns: 'Hay retornos anteriores sin separar entre capital y ganancias. Primero deben clasificarse.',
  policy_locked: 'El acuerdo ya tiene repartos registrados. Conservá el porcentaje y las personas históricas.',
  unsettled_profit: 'Falta liquidar la utilidad disponible antes de guardar el cierre anual.',
  pending_settlements: 'Primero deben resolverse las confirmaciones u objeciones de los repartos del año.',
  year_not_finished: 'El cierre anual se registra después de terminar el año.',
  finance_distribution_required: 'Registrá las ganancias y el capital de esta campaña desde Finanzas y costos.',
  idempotency_conflict: 'Ese envío ya fue registrado con otros datos. Revisá el historial antes de repetirlo.',
  server_error: 'Algo falló en el servidor. Intentá de nuevo en un momento.',
  // v5: brief creativo y portal de clientes
  brief_locked: 'El brief ya fue enviado: su contenido quedó congelado. Para cambiarlo, el equipo debe pedir ajustes.',
  brief_closed: 'Este brief está cerrado o cancelado: ya no admite cambios.',
  invalid_transition: 'Ese cambio de estado no está permitido desde el estado actual.',
  conflict: 'Alguien guardó cambios mientras editabas. Recargá para ver la última versión.',
  already_decided: 'Este entregable ya tiene una decisión registrada.',
  approval_not_allowed: 'Tu usuario no tiene permiso para aprobar entregables. Pedíselo a tu ejecutivo de cuenta.',
  stale_version: 'Hay una versión más nueva de este entregable. Recargá antes de decidir.',
  deliverable_locked: 'El cliente ya decidió sobre este entregable: queda como registro y no se puede borrar.',
  too_many_drafts: 'Hay demasiados borradores abiertos. Enviá o cancelá alguno antes de crear otro.',
  too_many_requests: 'Demasiadas acciones seguidas. Esperá unos minutos.',
  // v6: configuración inicial del dueño
  setup_done: 'El portal ya está configurado. Ingresá con tu correo y contraseña.',
  setup_unavailable: 'El servidor no tiene un código de configuración válido (PORTAL_SETUP_CODE).',
};

export function errorMessage(error) {
  if (error instanceof ApiError) {
    if (error.data?.error === 'validation') return error.data.message ?? 'Revisá los datos ingresados.';
    return MESSAGES[error.data?.error] ?? MESSAGES[error.message] ?? 'No se pudo completar la acción.';
  }
  return 'No se pudo completar la acción.';
}
