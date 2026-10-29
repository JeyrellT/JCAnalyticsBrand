// Índice de una página de servicio con bloques de venta (separado de los componentes
// para que Fast Refresh funcione). El orden es el mismo que ServiceBody en JournalApp.jsx.
import { t } from '../../i18n/locale';
import { SERVICE_OFFERS } from '../../content/service-offers';

export const hasServiceOffer = (item) => Boolean(SERVICE_OFFERS[item?.id]);

/** Entradas del índice, en el orden en que aparecen los bloques; `sales` marca las de venta. */
export function serviceOutline(copy) {
  const [first, second, ...rest] = copy.sections;
  const extra = (id, es, en) => ({ id, heading: t(es, en), sales: true });
  return [
    extra('oferta', 'Precio y paquete', 'Price and package'),
    first,
    extra('senales', '¿Es para vos?', 'Is it for you?'),
    second,
    extra('calculadora', 'Calculadora de impacto', 'Impact calculator'),
    extra('incluye', 'Qué incluye', 'What is included'),
    ...rest,
    extra('como-trabajamos', 'Cómo trabajamos', 'How we work'),
    extra('ejemplo', 'Un ejemplo real', 'A real example'),
    extra('preguntas-servicio', 'Preguntas frecuentes', 'Frequently asked questions'),
  ].filter(Boolean);
}
