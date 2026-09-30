// ============================================================================
//  src/components/site/Contact.jsx
//  Cierre en lima: titular gigante + mini-formulario de 2 pasos que arma el
//  mensaje de WhatsApp. Menos campos = más conversaciones iniciadas.
// ============================================================================
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import { wa, EMAIL } from './links';

const NEEDS = ['Página web', 'Software / app', 'Dashboard', 'Automatización', 'Otro'];

const TEAM = [
  { name: 'Jeyrell Tardencilla', role: 'Data & Automation', img: 'jeyrell-tardencilla.webp' },
  { name: 'Catalina González', role: 'Operaciones & CX', img: 'kathalina-gonzales.webp' },
  { name: 'Alex Benedict', role: 'Implementación', img: 'alex-benedict.webp' },
];

const Contact = () => {
  const [need, setNeed] = useState('Página web');
  const [name, setName] = useState('');

  const href = wa(
    `Hola, soy ${name.trim() || '(nombre)'}. Me interesa: ${need}. ¿Hablamos?`,
  );

  return (
    <section id="contacto" className="scroll-mt-24 bg-lime text-ink pt-20 sm:pt-32 pb-16 sm:pb-24 rounded-t-[2rem] sm:rounded-t-[3rem] -mt-8 relative z-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <Label className="text-ink/60">(05) Contacto</Label>
        <h2 className="mt-4 font-display font-semibold tracking-[-0.05em] leading-[0.86] text-[clamp(3.6rem,15vw,13rem)]">
          <MaskLines lines={['¿Hablamos?']} />
        </h2>

        <div className="mt-10 sm:mt-16 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-16 items-end">
          {/* Mini-formulario → WhatsApp */}
          <Reveal>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                window.open(href, '_blank', 'noopener');
              }}
              className="space-y-6"
            >
              <fieldset>
                <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/60 mb-3">Necesito</legend>
                <div className="flex flex-wrap gap-2">
                  {NEEDS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNeed(n)}
                      aria-pressed={need === n}
                      className={`tap-press h-11 px-5 rounded-full text-[15px] font-medium border transition-colors ${
                        need === n ? 'bg-ink text-lime border-ink' : 'border-ink/25 hover:border-ink'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-col sm:flex-row gap-3">
                <label htmlFor="contacto-nombre" className="sr-only">Tu nombre</label>
                <input
                  id="contacto-nombre"
                  type="text"
                  autoComplete="name"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 min-w-0 h-14 sm:h-16 rounded-full bg-transparent border border-ink/30 focus:border-ink px-6 text-lg placeholder:text-ink/45 outline-none"
                />
                <button
                  type="submit"
                  className="tap-press group inline-flex items-center justify-between gap-4 h-14 sm:h-16 rounded-full bg-ink text-paper pl-7 pr-2.5 text-lg font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Enviar por WhatsApp
                  <span className="grid place-items-center w-11 h-11 rounded-full bg-lime text-ink" aria-hidden="true">
                    <ArrowUpRight size={20} strokeWidth={2.4} />
                  </span>
                </button>
              </div>
              <p className="text-ink/60 text-[15px]">
                ¿Preferís correo?{' '}
                <a href={`mailto:${EMAIL}`} className="font-semibold underline underline-offset-4 decoration-ink/30 hover:decoration-ink">
                  {EMAIL}
                </a>
              </p>
            </form>
          </Reveal>

          {/* Equipo: caras reales, sin biografías */}
          <Reveal delay={0.15}>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {TEAM.map((t) => (
                  <img
                    key={t.name}
                    src={import.meta.env.BASE_URL + t.img}
                    alt={t.name}
                    title={`${t.name} · ${t.role}`}
                    width={400}
                    height={400}
                    loading="lazy"
                    decoding="async"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover object-top ring-4 ring-lime bg-ink/10"
                  />
                ))}
              </div>
              <p className="text-[15px] leading-snug text-ink/70">
                Te responde el equipo,<br />
                <span className="font-semibold text-ink">no un bot.</span>
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
