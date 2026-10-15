// "Instalá el portal en tu celular": botón Instalar (Chrome/Edge en Android y compu)
// o tres pasos visuales (iPhone/iPad con Safari). Se oculta solo si ya está instalada.
//   <InstallBanner />  aviso compacto (inicio), con "Ahora no" recordado en este navegador
//   <InstallCard />    versión completa (Avisos y app)
import { useState } from 'react';
import { Share, PlusSquare, Smartphone, Download, EllipsisVertical, CheckCircle2, Info } from 'lucide-react';
import { useInstallState, promptInstall, dismissInstall } from '../lib/pwa.js';
import { Sheet, SheetHeader } from './QuickActions.jsx';
import { IconTile, cx, useToast } from './ui.jsx';
import logoMark from '../assets/logo-mark.webp';

const STEPS = {
  ios: [
    { icon: Share, title: 'Tocá Compartir', hint: 'El cuadrito con la flecha ↑ en Safari. Si no lo ves, tocá ··· y luego Compartir.' },
    { icon: PlusSquare, title: 'Elegí "Agregar a inicio"', hint: 'Bajá un poco en la lista. Si aparece "Abrir como app web", dejalo activado.' },
    { icon: Smartphone, title: 'Abrí JC Portal desde el ícono', hint: 'Ahí mismo activás los avisos.' },
  ],
  android: [
    { icon: EllipsisVertical, title: 'Tocá el menú ⋮ de Chrome', hint: 'Arriba a la derecha.' },
    { icon: PlusSquare, title: 'Elegí "Instalar app"', hint: 'En algunos celulares dice "Agregar a pantalla principal".' },
    { icon: Smartphone, title: 'Abrí JC Portal desde el ícono', hint: 'Se abre como una app, sin las barras del navegador.' },
  ],
};

const GUIDES = [
  { value: 'ios', label: 'iPhone o iPad' },
  { value: 'android', label: 'Android' },
];

/** Pasos numerados con ícono (sirven para iPhone y para Android sin botón de instalar). */
export function InstallSteps({ platform = 'ios', className }) {
  return (
    <div className={className}>
      <ol className="space-y-2">
        {STEPS[platform].map((step, i) => (
          <li key={step.title} className="card-sunken flex items-start gap-3 p-3">
            <span className="relative shrink-0">
              <IconTile icon={step.icon} tone="blue" className="bg-surface shadow-card" />
              <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-contrast text-[11px] font-bold text-contrast-fg ring-2 ring-surface-2">{i + 1}</span>
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-sm font-semibold text-ink">{step.title}</span>
              <span className="block text-xs leading-relaxed text-muted">{step.hint}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ¿Lo abriste desde WhatsApp u otra app? Primero abrilo en {platform === 'ios' ? 'Safari' : 'Chrome'}.
      </p>
    </div>
  );
}

function useInstallAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function install() {
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === 'accepted') toast('¡Listo! Abrí JC Portal desde el ícono en tu pantalla de inicio.');
    else if (outcome === 'error') toast('No se pudo instalar. Probá desde el menú del navegador.', 'error');
  }
  return [install, busy];
}

/** Versión completa para "Avisos y app". */
export function InstallCard({ className }) {
  const state = useInstallState();
  const [install, busy] = useInstallAction();
  const [guide, setGuide] = useState(state.platform === 'android' ? 'android' : 'ios');

  if (state.installed) {
    return (
      <div className={cx('flex items-start gap-3 rounded-2xl bg-teal-soft p-3 text-teal-ink', className)}>
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-semibold">{state.standalone ? 'Ya usás la app instalada.' : '¡Listo, quedó instalada!'}</span>{' '}
          Abrila siempre desde el ícono JC Portal.
        </p>
      </div>
    );
  }

  if (state.canInstall) {
    const where = state.platform === 'desktop' ? 'esta compu' : 'tu celular';
    return (
      <div className={className}>
        <p className="text-sm text-muted">Queda como una app en {where}: abre directo, a pantalla completa y con avisos al instante.</p>
        <button type="button" onClick={install} disabled={busy} className="btn btn-primary tap mt-3 w-full text-base">
          <Download className="h-5 w-5" aria-hidden="true" />Instalar el portal
        </button>
      </div>
    );
  }

  if (!state.demo && state.platform !== 'desktop') {
    return (
      <div className={className}>
        <p className="mb-3 text-sm text-muted">Tres pasos y queda como una app, con avisos al instante.</p>
        <InstallSteps platform={state.platform} />
      </div>
    );
  }

  // Compu sin instalación directa, o la demo: vista previa de los pasos de cada celular.
  return (
    <div className={className}>
      <p className="mb-3 text-sm text-muted">
        {state.demo
          ? 'En la demo no se puede instalar. En el portal publicado, cada persona ve el botón Instalar (Android) o estos pasos (iPhone):'
          : 'Abrí el portal en tu celular y seguí estos pasos:'}
      </p>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1" role="tablist" aria-label="Tipo de celular">
        {GUIDES.map((g) => (
          <button key={g.value} type="button" role="tab" aria-selected={guide === g.value} onClick={() => setGuide(g.value)}
            className={cx('tap rounded-lg px-3 text-sm font-semibold transition', guide === g.value ? 'bg-contrast text-contrast-fg shadow-card' : 'text-muted hover:text-ink')}>
            {g.label}
          </button>
        ))}
      </div>
      <InstallSteps platform={guide} />
    </div>
  );
}

/** Aviso compacto para el inicio. No aparece si ya está instalada, en la demo, ni tras "Ahora no". */
export function InstallBanner({ className }) {
  const state = useInstallState();
  const [install, busy] = useInstallAction();
  const [showSteps, setShowSteps] = useState(false);
  const mobile = state.platform !== 'desktop';
  if (state.installed || state.demo || state.dismissed || (!state.canInstall && !mobile)) return null;
  const steps = state.platform === 'ios' ? 'ios' : 'android';

  return (
    <section aria-label="Instalar el portal" className={cx('card animate-rise flex items-start gap-3 border-brand/20 bg-linear-to-r from-brand-soft to-teal-soft p-3 sm:items-center sm:p-4', className)}>
      <img src={logoMark} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1.5 shadow-card sm:h-12 sm:w-12" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-bold leading-tight text-ink">{mobile ? 'Instalá el portal en tu celular' : 'Instalá el portal en esta compu'}</p>
        <p className="mt-0.5 text-xs text-muted sm:text-sm">Se abre como app y te avisa al instante de tareas, citas y confirmaciones.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {state.canInstall ? (
            <button type="button" onClick={install} disabled={busy} className="btn btn-primary tap">
              <Download className="h-4 w-4" aria-hidden="true" />Instalar
            </button>
          ) : (
            <button type="button" onClick={() => setShowSteps(true)} className="btn btn-primary tap" aria-haspopup="dialog">
              <Smartphone className="h-4 w-4" aria-hidden="true" />Ver cómo
            </button>
          )}
          <button type="button" onClick={dismissInstall} className="btn btn-ghost tap">Ahora no</button>
        </div>
      </div>
      {showSteps && (
        <Sheet label="Instalar el portal" onClose={() => setShowSteps(false)}>
          <SheetHeader title="Instalá el portal" hint="Tres pasos y queda como una app en tu celular." onClose={() => setShowSteps(false)} />
          <div className="px-5 pb-5 pt-1">
            <InstallSteps platform={steps} />
            <button type="button" onClick={() => setShowSteps(false)} className="btn btn-dark tap mt-4 w-full">Entendido</button>
          </div>
        </Sheet>
      )}
    </section>
  );
}

/** <InstallPrompt variant="banner" | "full" /> */
export default function InstallPrompt({ variant = 'banner', className }) {
  return variant === 'full' ? <InstallCard className={className} /> : <InstallBanner className={className} />;
}
