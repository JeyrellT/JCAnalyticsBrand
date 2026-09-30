// ============================================================================
//  src/components/site/Services.jsx
//  Lista editorial de servicios sobre fondo oscuro. Una línea por servicio,
//  precio "desde" (sale de data/cotizador.js para no desincronizarse) y un
//  CTA que abre WhatsApp con el servicio ya escrito.
// ============================================================================
import { ArrowUpRight } from 'lucide-react';
import { SERVICES } from '../../data/cotizador';
import { Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';

// Miles con punto, igual que el resto del sitio ($2.000).
const fmt = (n) => `$${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const ROWS = [
  { name: 'Páginas web', desc: 'Tu marca, reservas y pedidos en línea.', from: SERVICES.pagina_web.priceMin },
  { name: 'Software a la medida', desc: 'Apps web, portales y sistemas internos.', from: SERVICES.software_medida.priceMin },
  { name: 'Dashboards', desc: 'Power BI conectado a tus datos.', from: SERVICES.power_bi.priceMin },
  { name: 'Automatización', desc: 'Excel, Power Automate y Python.', from: SERVICES.excel_vba.priceMin },
  { name: 'Fiscal y planilla', desc: 'Factura v4.4, CCSS y planilla CR.', from: SERVICES.fiscal_planilla.priceMin },
];

const Services = () => (
  <section id="servicios" className="scroll-mt-24 bg-ink text-paper py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] -mt-8 relative z-10">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 sm:mb-20">
        <div>
          <Label className="text-paper/45">(02) Servicios</Label>
          <h2 className="mt-4 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
            <MaskLines lines={['Lo que', <span key="b" className="font-serif italic font-normal text-lime">hacemos.</span>]} />
          </h2>
        </div>
        <Reveal delay={0.2}>
          <p className="max-w-xs text-paper/55 text-lg leading-snug">Precios reales, publicados. Sin letra chica.</p>
        </Reveal>
      </div>

      <ul className="border-t border-paper/15">
        {ROWS.map((r, i) => (
          <Reveal as="li" key={r.name} delay={i * 0.05} className="border-b border-paper/15">
            <a
              href={wa(`Hola, me interesa: ${r.name}. ¿Me ayudan a cotizar?`)}
              target="_blank"
              rel="noreferrer"
              className="service-row group relative grid grid-cols-[auto_1fr_auto] md:grid-cols-[3.5rem_minmax(0,1.5fr)_minmax(0,1fr)_7.5rem_3.5rem] items-center gap-x-4 sm:gap-x-8 gap-y-1 py-6 sm:py-8"
            >
              <span className="font-mono text-xs text-paper/40 self-start md:self-center pt-2 md:pt-0">0{i + 1}</span>
              <span className="font-display text-[clamp(1.7rem,4.6vw,3.6rem)] font-semibold tracking-[-0.03em] leading-none transition-transform duration-500 group-hover:translate-x-2">
                {r.name}
              </span>
              <span className="hidden md:block text-paper/55 text-[15px]">{r.desc}</span>
              <span className="col-start-2 md:col-start-auto font-mono text-sm text-lime whitespace-nowrap">
                desde {fmt(r.from)}
              </span>
              <span
                aria-hidden="true"
                className="row-start-1 col-start-3 md:row-start-auto md:col-start-auto grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-paper/20 group-hover:bg-lime group-hover:text-ink group-hover:border-lime transition-colors duration-300"
              >
                <ArrowUpRight size={22} className="transition-transform duration-300 group-hover:rotate-45" />
              </span>
            </a>
          </Reveal>
        ))}
      </ul>
    </div>
  </section>
);

export default Services;
