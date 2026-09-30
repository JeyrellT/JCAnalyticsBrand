// ============================================================================
//  src/components/site/Team.jsx
//  Las personas, en grande. Retratos 3:4 con nombre, rol, una línea de bio,
//  habilidades y un enlace directo a WhatsApp con la persona. Los datos viven
//  en data/team.js.
// ============================================================================
import { ArrowUpRight } from 'lucide-react';
import { TEAM } from '../../data/team';
import { Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';

const TeamCard = ({ person, index }) => (
  <Reveal delay={(index % 4) * 0.08} className="group flex flex-col">
    <div className="relative rounded-[1.25rem] sm:rounded-[1.75rem] overflow-hidden aspect-[3/4]" style={{ background: person.portraitBg }}>
      <img
        src={person.portrait}
        alt={`${person.name}, ${person.role}`}
        width={720}
        height={960}
        loading="lazy"
        decoding="async"
        className="team-portrait block w-full h-full object-cover object-top"
      />
      <span className="hidden sm:inline-block absolute left-4 top-4 font-mono text-[11px] uppercase tracking-[0.16em] bg-paper/90 backdrop-blur text-ink rounded-full px-3 py-1.5">
        {person.area}
      </span>
      <span aria-hidden="true" className="absolute inset-0 ring-1 ring-inset ring-ink/10 rounded-[inherit] pointer-events-none" />
    </div>
    <div className="pt-4 sm:pt-5 flex flex-col flex-1">
      <h3 className="font-display text-2xl sm:text-[1.75rem] font-semibold tracking-tight leading-none">{person.name}</h3>
      <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">{person.role}</p>
      <p className="mt-3 text-ink/65 text-[15px] leading-snug">{person.bio}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {person.skills.map((s) => (
          <li key={s} className="rounded-full border border-ink/15 px-2.5 py-1 text-[12px] font-medium text-ink/70">{s}</li>
        ))}
      </ul>
      <a
        href={wa(person.wa)}
        target="_blank"
        rel="noreferrer"
        className="mt-auto pt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink underline underline-offset-4 decoration-ink/25 hover:decoration-ink"
      >
        Escribile a {person.first}
        <ArrowUpRight size={16} />
      </a>
    </div>
  </Reveal>
);

const Team = () => (
  <section id="equipo" className="scroll-mt-24 bg-paper text-ink py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] -mt-8 relative z-40">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 sm:mb-16">
        <div>
          <Label className="text-ink/50">(05) Equipo</Label>
          <h2 className="mt-4 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
            <MaskLines lines={['Las personas', <span key="b" className="font-serif italic font-normal">detrás.</span>]} />
          </h2>
        </div>
        <Reveal delay={0.2}>
          <p className="max-w-xs text-ink/55 text-lg leading-snug">
            Cuatro personas, sin intermediarios. Con la que hablás es la que hace el trabajo.
          </p>
        </Reveal>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">
        {TEAM.map((p, i) => (
          <TeamCard key={p.id} person={p} index={i} />
        ))}
      </div>

      <Reveal delay={0.2} className="mt-14 sm:mt-20 border-t border-ink/10 pt-8">
        <p className="font-display text-[clamp(1.4rem,3vw,2.2rem)] font-semibold tracking-tight leading-snug max-w-4xl">
          {TEAM.map((p, i) => (
            <span key={p.id}>
              <span className="text-ink">{p.first}</span>{' '}
              <span className="font-serif italic font-normal text-ink/60">{p.does}</span>
              {i < TEAM.length - 2 ? ', ' : i === TEAM.length - 2 ? ' y ' : '.'}
            </span>
          ))}
        </p>
      </Reveal>
    </div>
  </section>
);

export default Team;
