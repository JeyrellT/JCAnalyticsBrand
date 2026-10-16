// Política de contraseñas del lado de la interfaz: mismo criterio que server/auth.mjs.
/** Contraseñas de diccionario o repetidas. */
export const WEAK = /password|contrase[nñ]a|qwerty|asdfgh|123456|abc123|jcanalytic|(.)\1{4,}/i;

/** Requisitos para mostrar en vivo bajo el campo de contraseña. */
export function passwordChecks(pw = '') {
  const weak = WEAK.test(pw);
  return [
    { ok: pw.length >= 10, text: '10 caracteres o más' },
    { ok: /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(pw) && /\d/.test(pw), text: 'Letras y al menos un número' },
    { ok: pw.length > 0 && !weak, bad: weak, text: 'Nada fácil de adivinar: sin “password”, “123456” ni “jcanalytic”' },
  ];
}
