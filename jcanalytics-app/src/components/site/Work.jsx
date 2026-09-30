// ============================================================================
//  src/components/site/Work.jsx
//  Portafolio: sitios reales en línea. En hover la captura larga se desplaza
//  como si alguien estuviera haciendo scroll; cada card abre el sitio en vivo.
// ============================================================================
import { ArrowUpRight } from 'lucide-react';
import { WEB_PROPERTIES, CLIENT_SITES, DEMO_SITES } from '../../data/webProperties';
import { CTA, Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';

// Orden editorial: los más visuales primero y alternando tamaños.
const FEATURED = ['barberxcr', 'uniquexcr', 'laburradacr', 'glowstudiocr', 'tallerticos', 'cotizadorvip'];
const ALL = [...WEB_PROPERTIES, ...CLIENT_SITES];
const SITES = FEATURED.map((id) => ALL.find((s) => s.id === id)).filter(Boolean);

// Patrón de la grilla (12 columnas en desktop): grande + chica, chica + grande…
const SPANS = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7', 'lg:col-span-7', 'lg:col-span-5'];

const WorkCard = ({ site, index, span }) => (
  <Reveal delay={(index % 2) * 0.12} className={`${span}`}>
    <a
      href={site.url}
      target="_blank"
      rel="noopener"
      className="work-card group block"
      style={{ '--accent': site.accent }}
    >
      <div className="relative rounded-[1.25rem] sm:rounded-[1.75rem] overflow-hidden bg-neutral-200 aspect-[4/3] lg:aspect-auto lg:h-[clamp(26rem,36vw,34rem)]">
        {/* Captura larga (1200×2400): en hover se desplaza hacia abajo */}
        <img
          src={site.shot}
          alt={`Captura de ${site.name}`}
          width={1200}
          height={2400}
          loading="lazy"
          decoding="async"
          className="work-card__shot absolute inset-x-0 top-0 w-full h-auto"
        />
        <div className="absolute inset-0 ring-1 ring-inset ring-ink/10 rounded-[inherit] pointer-events-none" />
        {/* Botón "Ver en vivo": aparece en hover (siempre visible en táctil) */}
        <span className="work-card__cta absolute right-3 top-3 sm:right-4 sm:top-4 inline-flex items-center gap-1.5 rounded-full bg-ink text-paper pl-4 pr-1.5 h-10 text-sm font-semibold">
          Ver en vivo
          <span className="grid place-items-center w-7 h-7 rounded-full bg-lime text-ink">
            <ArrowUpRight size={15} strokeWidth={2.4} />
          </span>
        </span>
      </div>
      <div className="pt-4 sm:pt-5">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
          <span className="w-2 h-2 rounded-full" style={{ background: site.accent }} />
          {site.sector}
        </span>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h3 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight leading-none">
            {site.name}
          </h3>
          <span className="hidden sm:inline shrink-0 text-sm text-ink/45 group-hover:text-ink transition-colors">{site.domain.replace(/^www\./, '')} ↗</span>
        </div>
        <p className="mt-2 text-ink/55 text-[15px] leading-snug">{site.tagline}</p>
      </div>
    </a>
  </Reveal>
);

const Work = () => (
  <section id="trabajo" className="scroll-mt-24 bg-paper text-ink py-20 sm:py-32">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 sm:mb-16">
        <div>
          <Label className="text-ink/50">(01) Trabajo</Label>
          <h2 className="mt-4 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
            <MaskLines lines={['En línea.', <span key="b" className="font-serif italic font-normal">Abrilos.</span>]} />
          </h2>
        </div>
        <Reveal delay={0.2}>
          <CTA href={wa('Hola, vi su portafolio y quiero un sitio así para mi negocio.')} variant="ink">
            Quiero uno así
          </CTA>
        </Reveal>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-12 sm:gap-y-16">
        {SITES.map((s, i) => (
          <WorkCard key={s.id} site={s} index={i} span={SPANS[i] ?? 'lg:col-span-6'} />
        ))}
      </div>

      {/* Demos: apps y dashboards para trastear — una sola fila compacta */}
      <Reveal className="mt-16 sm:mt-24 border-t border-ink/10 pt-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-10">
          <Label className="text-ink/50 shrink-0">Demos para probar →</Label>
          <div className="flex flex-wrap gap-2.5">
            {DEMO_SITES.map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener"
                className="tap-press group inline-flex items-center gap-2.5 rounded-full border border-ink/15 hover:border-ink hover:bg-ink hover:text-paper pl-4 pr-2 h-11 text-[15px] font-medium transition-colors"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: d.accent }} />
                {d.name}
                <ArrowUpRight size={16} className="opacity-50 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

export default Work;
