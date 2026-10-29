// ============================================================================
//  src/components/site/contact-rules.js
//  Reglas de contacto compartidas por los formularios del sitio (portada, página
//  de servicio y formulario corto de computadora). Son las mismas del portal
//  (portal/shared/leads.js): el sitio avisa lo que el portal rechazaría.
// ============================================================================

/** Teléfono: dígitos, espacios, guiones, paréntesis y un "+" inicial; 8 a 15 dígitos. */
export const phoneOk = (value) => {
  const v = value.trim();
  const digits = v.replace(/\D/g, '');
  return /^\+?[\d\s\-()]+$/.test(v) && digits.length >= 8 && digits.length <= 15;
};

/** Correo con juego de caracteres estricto: sin ? ni & que se cuelen en un mailto. */
export const emailOk = (value) => /^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(value.trim());
