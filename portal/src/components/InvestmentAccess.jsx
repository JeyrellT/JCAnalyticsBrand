import { useId, useState } from 'react';
import { ArrowUpRight, Check, Handshake, History, KeyRound, LoaderCircle, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api, errorMessage } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { Avatar, Modal, useAction } from './ui.jsx';
import '../styles/investment-access.css';

const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
const sameIds = (a, b) => a.length === b.length && a.every((id) => b.includes(id));

/** Mounted only for an administrator, after they explicitly open the editor. */
function AccessEditor({ investmentId, investmentName, onClose, onSaved }) {
  const { data, error, reload } = useResource(`/api/investments/${investmentId}/access`);
  if (!data) return (
    <Modal open title="Acceso de inversionistas" size="lg" onClose={onClose}>
      <div className="investment-access-editor ia-load" role={error ? 'alert' : 'status'}>
        {error ? <><ShieldCheck size={25} /><p>{errorMessage(error)}</p><button type="button" className="btn btn-outline" onClick={reload}>Reintentar</button></> : <><LoaderCircle size={24} className="animate-spin" /><p>Cargando permisos de esta inversión…</p></>}
      </div>
    </Modal>
  );
  return <AccessForm data={data} investmentId={investmentId} investmentName={investmentName} onClose={onClose} onSaved={onSaved} />;
}

function AccessForm({ data, investmentId, investmentName, onClose, onSaved }) {
  const formId = useId();
  const [selected, setSelected] = useState(() => [...data.allowed_investor_ids]);
  const [search, setSearch] = useState('');
  const [saveError, setSaveError] = useState('');
  const [run, busy] = useAction();
  const investors = [...data.investors].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'es'));
  const visible = investors.filter((person) => normalize(person.name).includes(normalize(search)));
  const dirty = !sameIds(selected, data.allowed_investor_ids);
  const added = selected.filter((id) => !data.allowed_investor_ids.includes(id)).length;
  const removed = data.allowed_investor_ids.filter((id) => !selected.includes(id)).length;
  const close = () => { if (!busy) onClose(); };

  function toggle(id) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    setSaveError('');
  }

  async function save(event) {
    event.preventDefault();
    if (busy || !dirty) return;
    setSaveError('');
    const result = await run(() => api(`/api/investments/${investmentId}/access`, {
      method: 'PUT', body: { allowed_investor_ids: selected },
    }), { success: 'Acceso de inversionistas actualizado', onError: (_error, message) => setSaveError(message) });
    if (result) { onSaved(); onClose(); }
  }

  return (
    <Modal open title="Acceso de inversionistas" size="lg" onClose={close}
      footer={<>
        <div className="investment-access-footer" aria-live="polite">
          <strong>{selected.length} {selected.length === 1 ? 'permiso asignado' : 'permisos asignados'}</strong>
          <span>{dirty ? `${added} por habilitar · ${removed} por quitar` : 'Sin cambios pendientes'}</span>
        </div>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={close}>Cancelar</button>
        <button type="submit" form={formId} className="btn btn-primary" disabled={busy || !dirty}>
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{busy ? 'Guardando…' : 'Guardar acceso'}
        </button>
      </>}>
      <form id={formId} className="investment-access-editor" onSubmit={save} aria-busy={busy}>
        <div className="ia-editor-intro">
          <span className="ia-editor-icon"><KeyRound size={23} strokeWidth={1.5} /></span>
          <div><p>ESTA IDEA, CON LAS PERSONAS QUE ELIJÁS</p><h3>{investmentName}</h3><span>Seleccioná quién puede verla en su catálogo y registrar nuevos aportes mientras esté abierta.</span></div>
        </div>
        <div className="ia-team-rule"><Handshake size={18} /><p><strong>Los socios tienen acceso a todas las inversiones.</strong><span>Este permiso se administra por separado para cada inversionista.</span></p></div>
        {investors.length > 0 ? <>
          <label className="ia-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Buscar inversionista</span><input type="search" placeholder="Buscar por nombre…" value={search} onChange={(event) => setSearch(event.target.value)} disabled={busy} /><span>{visible.length} de {investors.length}</span></label>
          <fieldset className="ia-people" disabled={busy}>
            <legend className="sr-only">Inversionistas con permiso para esta inversión</legend>
            {visible.map((person) => {
              const checked = selected.includes(person.id);
              return <label key={person.id} className={`ia-person${checked ? ' ia-person-selected' : ''}${!person.active ? ' ia-person-inactive' : ''}`}>
                <Avatar name={person.name} color={person.color} size={36} />
                <span className="ia-person-copy"><strong>{person.name}</strong><span>{!person.active ? 'Cuenta inactiva · el permiso no reactiva la cuenta' : checked ? 'Con acceso a esta inversión' : 'Sin acceso a nuevos aportes'}</span></span>
                <input type="checkbox" aria-label={`Habilitar a ${person.name}`} checked={checked} disabled={!person.active && !data.allowed_investor_ids.includes(person.id)} onChange={() => toggle(person.id)} />
              </label>;
            })}
          </fieldset>
          {!visible.length && <div className="ia-empty-search"><Search size={24} /><p>No encontramos ese nombre.</p><button type="button" onClick={() => setSearch('')}>Limpiar búsqueda<X size={13} /></button></div>}
        </> : <div className="ia-empty"><Users size={30} strokeWidth={1.3} /><h3>Todavía no hay inversionistas.</h3><p>Primero agregá su cuenta. Después podés habilitarla en las inversiones que elijás.</p><Link className="btn btn-outline" to="/equipo?agregar=inversionista"><UserPlus size={16} />Agregar inversionista</Link></div>}
        <p className="ia-history-note"><History size={17} /><span>Quitar el permiso bloquea nuevos aportes. La persona conserva su historial, sus mensajes y las confirmaciones de movimientos existentes.</span></p>
        {saveError && <p className="ia-save-error" role="alert">{saveError} Tus cambios siguen aquí para volver a intentar.</p>}
      </form>
    </Modal>
  );
}

export default function InvestmentAccess({ investmentId, investmentName, allowedInvestorIds = [], onSaved }) {
  const { isAdmin } = useSession();
  const [editing, setEditing] = useState(false);
  return (
    <section className="investment-access" aria-labelledby={`investment-access-${investmentId}`}>
      <div className="ia-card-heading"><span className="ia-card-icon"><KeyRound size={20} strokeWidth={1.6} /></span><div><span>PERSONAS Y PERMISOS</span><h2 id={`investment-access-${investmentId}`}>Acceso de inversionistas</h2></div></div>
      <p className="ia-card-description">Cada inversionista explora y aporta a las inversiones que la administración le habilita.</p>
      <div className="ia-card-rule"><Handshake size={17} /><span>Los socios tienen acceso a todas las inversiones.</span><Check size={15} /></div>
      {isAdmin ? <>
        <div className="ia-card-count"><strong>{allowedInvestorIds.length}</strong><span>{allowedInvestorIds.length === 1 ? 'permiso asignado' : 'permisos asignados'}<small>para esta inversión</small></span><ShieldCheck size={25} strokeWidth={1.3} /></div>
        <button type="button" className="ia-manage" onClick={() => setEditing(true)}>Administrar acceso<ArrowUpRight size={17} /></button>
      </> : <p className="ia-admin-note"><ShieldCheck size={15} />La administración gestiona estos permisos.</p>}
      {isAdmin && editing && <AccessEditor investmentId={investmentId} investmentName={investmentName} onClose={() => setEditing(false)} onSaved={onSaved} />}
    </section>
  );
}
