// ============================================================================
//  src/components/site/Footer.jsx
//  Footer oscuro con la marca a todo el ancho.
// ============================================================================
import { WEB_PROPERTIES } from '../../data/webProperties';
import { wa, EMAIL, PHONE, NAV_LINKS } from './links';

const Footer = () => (
  <footer className="bg-ink text-paper pt-16 sm:pt-24 pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-hidden">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-[15px]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40 mb-4">Menú</p>
          <ul className="space-y-2">
            {NAV_LINKS.map((l) => (
              <li key={l.href}><a href={l.href} className="text-paper/75 hover:text-lime transition-colors">{l.label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40 mb-4">Productos</p>
          <ul className="space-y-2">
            {WEB_PROPERTIES.map((p) => (
              <li key={p.id}><a href={p.url} target="_blank" rel="noopener" className="text-paper/75 hover:text-lime transition-colors">{p.name} ↗</a></li>
            ))}
          </ul>
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40 mb-4">Contacto</p>
          <ul className="space-y-2">
            <li><a href={wa()} target="_blank" rel="noreferrer" className="text-paper/75 hover:text-lime transition-colors">WhatsApp ↗</a></li>
            <li><a href={`mailto:${EMAIL}`} className="text-paper/75 hover:text-lime transition-colors ">{EMAIL}</a></li>
            <li><a href={`tel:+${PHONE}`} className="text-paper/75 hover:text-lime transition-colors">+506 7033 0596</a></li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40 mb-4">Estudio</p>
          <p className="text-paper/75">Heredia, Costa Rica</p>
          <p className="text-paper/40 mt-2">© {new Date().getFullYear()} JC Analytics</p>
        </div>
      </div>

      {/* Marca gigante a todo el ancho */}
      <a href="#top" aria-label="Volver arriba" className="block mt-16 sm:mt-24 pb-4 sm:pb-8 select-none">
        <span className="block font-display font-semibold tracking-[-0.06em] leading-[0.8] text-[15.5vw] xl:text-[14rem] text-paper/95 hover:text-lime transition-colors duration-500 whitespace-nowrap">
          JC Analytics
        </span>
      </a>
    </div>
  </footer>
);

export default Footer;
