// ============================================================================
//  src/components/site/PortalAccess.jsx
//  Accesos al portal privado (clientes, inversionistas y equipo). En la barra
//  de escritorio es un botón "Acceso" que despliega los tres ingresos; en el
//  menú móvil y en el pie se muestran como lista. Cada enlace abre el portal
//  con su tipo de acceso ya elegido.
// ============================================================================

import { useEffect, useId, useRef, useState } from 'react';
import { LockKeyhole, ChevronDown, ArrowUpRight, Building2, Landmark, Users } from 'lucide-react';
import { PORTAL_ACCESSES } from './links';
import '../../styles/portal-access.css';
import { t } from '../../i18n/locale';

const ICONS = { cliente: Building2, inversionista: Landmark, equipo: Users };

/** Lista de los tres accesos (menú móvil, desplegable y pie). */
export const PortalAccessList = ({ className = '', onNavigate, compact = false }) => (
  <ul className={`portal-access-list ${compact ? 'portal-access-list--compact' : ''} ${className}`}>
    {PORTAL_ACCESSES.map(({ key, href, label, detail }) => {
      const Icon = ICONS[key];
      return (
        <li key={key}>
          <a href={href} onClick={onNavigate} data-access={key}>
            <span className="portal-access-list__icon" aria-hidden="true"><Icon size={18} strokeWidth={1.8} /></span>
            <span className="portal-access-list__text">{label}{!compact && <small>{detail}</small>}</span>
            <ArrowUpRight className="portal-access-list__arrow" size={16} aria-hidden="true" />
          </a>
        </li>
      );
    })}
  </ul>
);

/** Botón "Acceso" de la barra de escritorio con su panel desplegable. */
const PortalAccess = () => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Al salir con Tab del componente, el panel se cierra.
  const onBlur = (event) => { if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false); };

  return (
    <div className="portal-access" ref={rootRef} onBlur={onBlur}>
      <button ref={buttonRef} type="button" className="jca-nav-portal" aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen((value) => !value)} title={t('Acceso a clientes, inversionistas y equipo', 'Client, investor and team access')}>
        <LockKeyhole size={16} strokeWidth={2} aria-hidden="true" /><span>{t('Acceso', 'Sign in')}</span>
        <ChevronDown className="portal-access__chevron" size={14} aria-hidden="true" />
      </button>
      <div id={panelId} className="portal-access__panel" hidden={!open}>
        <p className="portal-access__title">{t('Ingresá a tu portal', 'Sign in to your portal')}</p>
        <PortalAccessList onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );
};

export default PortalAccess;
