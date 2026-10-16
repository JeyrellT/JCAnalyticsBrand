// ============================================================================
//  shared/invites.js
//  Enlaces de registro (v7): el admin comparte un enlace y cada persona se da
//  de alta sola (nombre, correo, WhatsApp y su propia contraseña). Lo usan el
//  servidor, la demo del navegador y la interfaz.
//
//  · Personal: lleva el nombre de UNA persona y sirve una sola vez ("agregar solo con el nombre").
//  · Abierto: un enlace para un grupo (p. ej. "Socios fundadores") con un máximo de registros.
// ============================================================================

/** A qué se registra quien abre el enlace. */
export const INVITE_KINDS = {
  team: { label: 'Equipo', hint: 'Socios, colaboradores, inversionistas o administradores.' },
  client: { label: 'Cliente', hint: 'Personas de un cliente: entran a su portal de clientes.' },
};

/** Límites duros (el servidor los valida; la interfaz los usa en sus selectores). */
export const INVITE_LIMITS = {
  maxUses: 200,          // registros por enlace
  maxDays: 90,           // vigencia máxima
  adminMaxDays: 7,       // un enlace de administrador: personal, una sola vez y corto
  defaultDays: 14,
};

/** Opciones rápidas de vigencia (días). */
export const INVITE_DURATIONS = [1, 3, 7, 14, 30, 90];

/** Opciones rápidas de cupo para enlaces abiertos. */
export const INVITE_USE_PRESETS = [1, 3, 5, 10, 25, 50];

export const INVITE_STATUS = {
  activo: { label: 'Activo', tone: 'teal' },
  agotado: { label: 'Completo', tone: 'blue' },
  vencido: { label: 'Vencido', tone: 'amber' },
  revocado: { label: 'Desactivado', tone: 'slate' },
};

/** Estado de un enlace a partir de su fila (now en ISO o ms). */
export function inviteStatus(invite, now = Date.now()) {
  const at = typeof now === 'number' ? now : Date.parse(now);
  if (invite.revoked_at) return 'revocado';
  if (invite.uses >= invite.max_uses) return 'agotado';
  if (invite.expires_at && Date.parse(invite.expires_at) <= at) return 'vencido';
  return 'activo';
}

/** Ruta pública del registro (la interfaz le antepone el origen). */
export const invitePath = (token) => `/registro/${token}`;

/** Un token de enlace: base64url, 32+ caracteres. Se valida antes de tocar la base. */
export const isInviteToken = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{32,64}$/.test(value);
