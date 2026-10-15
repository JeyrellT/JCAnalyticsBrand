// ============================================================================
//  components/brief/useBriefEditor.js
//  Estado del formulario del brief compartido por el equipo y el cliente:
//  borrador local, cambios sin guardar, errores (del servidor y al intentar
//  guardar o enviar) y sincronización con lo que llega del servidor sin pisar
//  lo que la persona está escribiendo. Las llamadas a la API las hace la página.
// ============================================================================
import { useCallback, useMemo, useState } from 'react';
import { BRIEF_TITLE_MAX, briefChecklist, briefCompleteness, canonicalJson, leadTimeProblem, normalizeBriefData } from '../../../shared/brief.js';
import { contentKey, editableData, firstField, inlineMessage, serverFieldErrors } from './brief-ui.js';

const fromBrief = (brief) => ({ title: brief.title ?? '', data: editableData(brief.data) });

function titleProblem(title) {
  const t = (title ?? '').trim();
  if (t.length < 3) return 'Ponele un nombre al requerimiento (mínimo 3 caracteres).';
  if (t.length > BRIEF_TITLE_MAX) return `Máximo ${BRIEF_TITLE_MAX} caracteres.`;
  return null;
}

/**
 * @param {object} o
 * @param {object|null} o.brief   brief del servidor (con data) o null al crear
 * @param {{title?: string, data?: object}} [o.initial]  valores iniciales al crear
 * @param {string} o.today  AAAA-MM-DD
 * @param {number} o.leadDays
 * @param {boolean} [o.urgent]  brief marcado urgente (se salta el plazo mínimo)
 */
export function useBriefEditor({ brief, initial, today, leadDays, urgent = false }) {
  const [draft, setDraft] = useState(() => (brief ? fromBrief(brief) : { title: initial?.title ?? '', data: editableData(initial?.data) }));
  // Contenido del servidor sobre el que se apoya el borrador (y su updated_at para el bloqueo optimista).
  const [base, setBase] = useState(() => (brief
    ? { key: contentKey(brief.title, brief.data), updatedAt: brief.updated_at }
    : { key: contentKey(initial?.title, initial?.data), updatedAt: null }));
  const [seen, setSeen] = useState(brief?.updated_at ?? null);
  const [stale, setStale] = useState(false);
  const [attempt, setAttempt] = useState(null); // null | 'save' | 'submit'
  const [serverErrors, setServerErrors] = useState({});

  const normalized = useMemo(() => normalizeBriefData(draft.data), [draft.data]);
  const key = useMemo(() => canonicalJson({ title: draft.title.trim(), data: normalized.data }), [draft.title, normalized]);
  const dirty = key !== base.key || normalized.errors.length > 0;

  // Llegó otra versión del servidor (guardado, comentario, cambio de responsable, recarga…).
  if (brief && brief.updated_at !== seen) {
    setSeen(brief.updated_at);
    const serverKey = contentKey(brief.title, brief.data);
    if (serverKey === base.key || serverKey === key) {
      // Solo cambió la ficha (o el servidor ya tiene lo mismo que el borrador): se conserva lo escrito.
      setBase({ key: serverKey, updatedAt: brief.updated_at });
    } else if (!dirty) {
      setDraft(fromBrief(brief));
      setBase({ key: serverKey, updatedAt: brief.updated_at });
      setStale(false);
    } else {
      // Otra persona cambió el contenido mientras había cambios sin guardar acá.
      setStale(true);
    }
  }

  const shape = useMemo(() => {
    const out = {};
    for (const e of normalized.errors) if (!out[e.field]) out[e.field] = e.message;
    return out;
  }, [normalized]);
  const checks = useMemo(() => briefChecklist(normalized.data, { title: draft.title }), [normalized, draft.title]);
  const completeness = useMemo(() => briefCompleteness(normalized.data, { title: draft.title }), [normalized, draft.title]);
  const problems = useMemo(() => checks.filter((c) => !c.ok), [checks]);
  const leadProblem = useMemo(() => (today ? leadTimeProblem(normalized.data, { today, leadDays, urgent }) : null), [normalized, today, leadDays, urgent]);

  /** Errores que se muestran: los del servidor y, tras un intento, los de forma y los pendientes para enviar. */
  const errorsFor = useCallback((kind) => {
    const out = {};
    if (kind) {
      const t = titleProblem(draft.title);
      if (t) out.title = t;
      Object.assign(out, shape);
    }
    if (kind === 'submit') for (const p of problems) if (!out[p.field]) out[p.field] = inlineMessage(p);
    return out;
  }, [draft.title, shape, problems]);
  const errors = useMemo(() => ({ ...errorsFor(attempt), ...serverErrors }), [errorsFor, attempt, serverErrors]);

  const clearServerError = (field) => setServerErrors((e) => {
    const hit = Object.keys(e).filter((k) => k === field || k.startsWith(`${field}.`));
    if (!hit.length) return e;
    const next = { ...e };
    for (const k of hit) delete next[k];
    return next;
  });

  const setData = (data, field) => {
    setDraft((d) => ({ ...d, data }));
    if (field) clearServerError(field);
  };
  const setTitle = (title) => {
    setDraft((d) => ({ ...d, title }));
    clearServerError('title');
  };

  /** Valida antes de llamar a la API. Devuelve { ok, field } con el primer campo a corregir. */
  function prepare(kind) {
    setAttempt(kind);
    const keys = Object.keys(errorsFor(kind));
    if (kind === 'submit' && leadProblem) keys.push('send_start');
    return keys.length ? { ok: false, field: firstField(keys) } : { ok: true };
  }

  /** Cuerpo para la API: título limpio y datos normalizados (sin filas vacías ni campos que no aplican). */
  const payload = () => ({ title: draft.title.trim(), data: normalized.data });

  /** El servidor confirmó un guardado: el borrador pasa a ser la base (con lo normalizado si nadie siguió escribiendo). */
  const markSaved = useCallback((saved, sentKey) => {
    const serverKey = contentKey(saved.title, saved.data);
    setSeen(saved.updated_at);
    setBase({ key: serverKey, updatedAt: saved.updated_at });
    setStale(false);
    setServerErrors({});
    setAttempt(null);
    setDraft((d) => (canonicalJson({ title: d.title.trim(), data: normalizeBriefData(d.data).data }) === sentKey ? fromBrief(saved) : d));
  }, []);

  /** Descarta lo escrito y vuelve a lo último del servidor. */
  const discard = useCallback((fresh) => {
    if (!fresh) return;
    setDraft(fromBrief(fresh));
    setBase({ key: contentKey(fresh.title, fresh.data), updatedAt: fresh.updated_at });
    setSeen(fresh.updated_at);
    setStale(false);
    setServerErrors({});
    setAttempt(null);
  }, []);

  /** Error de la API: marca los campos (400) o el conflicto de edición (409). */
  const applyError = useCallback((error) => {
    const map = serverFieldErrors(error);
    setServerErrors(map);
    if (error?.data?.error === 'conflict') setStale(true);
    return firstField(Object.keys(map));
  }, []);

  return {
    draft, setTitle, setData, dirty, stale, attempt, errors, checks, problems, completeness, leadProblem,
    key, updatedAt: base.updatedAt, prepare, payload, markSaved, discard, applyError,
  };
}
