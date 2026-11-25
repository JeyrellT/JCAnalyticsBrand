import { useContext } from 'react';
import { CTA } from './primitives';
import { prepareContact } from './links';
import { ContactTarget } from './contact-target';

// `need` solo se pasa cuando el botón pertenece a un servicio concreto (demos de las páginas de servicio).
// Sin él, el formulario no preselecciona nada.
export default function ContactCTA({ need = null, source = '', children, ...props }) {
  const href = useContext(ContactTarget);
  return <CTA {...props} href={href} onClick={() => prepareContact({ need, source })}>{children}</CTA>;
}
