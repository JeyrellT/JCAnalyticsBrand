// Cliente de la API: mismo origen, cookie de sesión y encabezado anti-CSRF.

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

export async function api(path, { method = 'GET', body } = {}) {
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
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/login')) listeners.forEach((fn) => fn());
    throw new ApiError(res.status, data);
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
  server_error: 'Algo falló en el servidor. Intentá de nuevo en un momento.',
};

export function errorMessage(error) {
  if (error instanceof ApiError) {
    if (error.data?.error === 'validation') return error.data.message ?? 'Revisá los datos ingresados.';
    return MESSAGES[error.data?.error] ?? MESSAGES[error.message] ?? 'No se pudo completar la acción.';
  }
  return 'No se pudo completar la acción.';
}
