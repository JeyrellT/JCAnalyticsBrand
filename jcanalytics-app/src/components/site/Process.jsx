// ============================================================================
//  src/components/site/Process.jsx
//  Tres pasos, una línea cada uno. Reemplaza la metodología 4D larga.
// ============================================================================
import { CTA, Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';

const STEPS = [
  { n: '01', title: 'Hablamos', line: '30 minutos. Sin costo.' },
  { n: '02', title: 'Construimos', line: 'Ves avances cada 72 h.' },
  { n: '03', title: 'Lanzamos', line: 'Con 30 días de soporte.' },
];

const Process = () => (
  <section id="proceso" className="scroll-mt-24 bg-paper text-ink py-20 sm:py-32">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
      <Label className="text-ink/50">(03) Proceso</Label>
      <h2 className="mt-4 mb-12 sm:mb-20 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
        <MaskLines lines={['Así de', <span key="b" className="font-serif italic font-normal">simple.</span>]} />
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.12}>
            <div className={`group h-full rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between min-h-[15rem] sm:min-h-[22rem] transition-colors duration-500 ${
              i === 2 ? 'bg-lime' : 'bg-white ring-1 ring-ink/10 hover:bg-ink hover:text-paper'
            }`}>
              <span className="font-display text-[5rem] sm:text-[7.5rem] font-semibold leading-none tracking-[-0.06em]">
                {s.n}
              </span>
              <div>
                <h3 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">{s.title}</h3>
                <p className={`mt-2 text-lg ${i === 2 ? 'text-ink/70' : 'text-ink/55 group-hover:text-paper/60'} transition-colors`}>{s.line}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.3} className="mt-10 sm:mt-14 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <CTA href={wa('Hola, quiero agendar la llamada gratis de 30 minutos.')} variant="ink" size="lg">
          Agendar llamada gratis
        </CTA>
        <span className="text-ink/50 text-[15px]">Respondemos en menos de 24 h.</span>
      </Reveal>
    </div>
  </section>
);

export default Process;
