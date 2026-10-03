import { CTA } from './primitives';
import { prepareContact } from './links';

export default function ContactCTA({ need = 'Sistema / backend', source = '', children, ...props }) {
  return <CTA {...props} href="#contacto" onClick={() => prepareContact({ need, source })}>{children}</CTA>;
}
