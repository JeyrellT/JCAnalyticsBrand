// Conectar con Claude (MCP): cada persona genera un token personal para que Claude
// (claude.ai, la app de escritorio o Claude Code) cree y consulte proyectos del portal
// con sus permisos. El token se muestra una sola vez. Ver docs/mcp-claude.md.
import { useState } from 'react';
import { Plug, Copy, Unplug, Globe, Terminal, Sparkles } from 'lucide-react';
import { useResource } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import { Modal, Field, IconTile, SectionHead, useAction, useToast, useConfirm } from './ui.jsx';

/** Bloque de texto para copiar (URL, comando o token). */
function CopyBlock({ label, value, done }) {
  const toast = useToast();
  const copy = () => {
    if (!navigator.clipboard) { toast('No se pudo copiar: copialo a mano.', 'error'); return; }
    navigator.clipboard.writeText(value).then(() => toast(done), () => toast('No se pudo copiar: copialo a mano.', 'error'));
  };
  return (
    <div className="card-panel flex items-start gap-2 p-3 font-mono text-[12.5px] leading-relaxed">
      <span className="relative min-w-0 flex-1 select-all break-all">{value}</span>
      <button type="button" className="tap relative flex shrink-0 items-center justify-center rounded-lg text-panel-muted transition hover:bg-white/10 hover:text-white" aria-label={`Copiar ${label}`} onClick={copy}>
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Instrucciones con el token recién creado: única vez que se muestra. */
function TokenResult({ result, onClose }) {
  const base = `${window.location.origin}${result.mcp_path}`;
  const command = `claude mcp add --transport http jc-portal ${base} --header "Authorization: Bearer ${result.token}"`;
  return (
    <Modal open onClose={onClose} title="Conexión creada" size="md" footer={<button type="button" className="btn btn-primary" onClick={onClose}>Listo, ya lo copié</button>}>
      <p className="text-sm text-muted">Copiá ahora lo que necesites: <strong className="text-ink">el token no se vuelve a mostrar</strong>. Quien lo tenga actúa como vos en el portal.</p>
      <section className="mt-4 space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Globe className="h-4 w-4 text-brand-ink" />claude.ai, app de escritorio o celular</h3>
        <p className="text-xs text-muted">Configuración → Conectores → Agregar conector personalizado. Nombre: "Portal JC". URL:</p>
        <CopyBlock label="URL del conector" value={`${base}/${result.token}`} done="URL del conector copiada" />
      </section>
      <section className="mt-4 space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Terminal className="h-4 w-4 text-brand-ink" />Claude Code (terminal)</h3>
        <CopyBlock label="comando" value={command} done="Comando copiado" />
      </section>
      <section className="mt-4 space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-brand-ink" />Probalo</h3>
        <p className="text-xs text-muted">En Claude: "Creá en el portal un proyecto Power BI para Uniquex, en curso, de US$420, con entrega el 30 de noviembre."</p>
      </section>
    </Modal>
  );
}

export function ClaudeConnectionCard() {
  const { data, reload } = useResource('/api/me/mcp-tokens');
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [name, setName] = useState('Claude');
  const [result, setResult] = useState(null);
  const tokens = data?.tokens ?? [];

  async function create(e) {
    e.preventDefault();
    const out = await run(() => api('/api/me/mcp-tokens', { method: 'POST', body: { name } }));
    if (out) { setResult(out); reload(); }
  }

  async function revoke(token) {
    const ok = await confirm({ title: `Revocar "${token.name}"`, message: 'Claude deja de tener acceso con esta conexión de inmediato.', confirmLabel: 'Revocar', tone: 'danger' });
    if (ok && await run(() => api(`/api/me/mcp-tokens/${token.id}`, { method: 'DELETE' }), { success: 'Conexión revocada' })) reload();
  }

  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="claude-title">
      <SectionHead flush id="claude-title" icon={Plug} tone="blue" title="Conectar con Claude"
        hint="Creá y consultá proyectos, clientes y tareas desde Claude, con tus permisos." />
      <form onSubmit={create} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
        <Field label="Nombre de la conexión" className="flex-1" hint="Para reconocerla después: Claude web, Claude Code, laptop…">
          {(id) => <input id={id} className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <button type="submit" className="btn btn-primary shrink-0" disabled={busy || name.trim().length < 2}><Plug className="h-4 w-4" />Generar conexión</button>
      </form>
      {tokens.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <IconTile icon={Plug} tone="slate" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.name} <span className="font-mono text-xs font-normal text-muted">…{t.hint}</span></p>
                <p className="text-xs text-muted">Creada {timeAgo(t.created_at)} · {t.last_used_at ? `último uso ${timeAgo(t.last_used_at)}` : 'sin usar'}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm min-h-11 sm:min-h-9" onClick={() => revoke(t)} disabled={busy}><Unplug className="h-3.5 w-3.5" />Revocar</button>
            </li>
          ))}
        </ul>
      )}
      {result && <TokenResult result={result} onClose={() => setResult(null)} />}
    </section>
  );
}
