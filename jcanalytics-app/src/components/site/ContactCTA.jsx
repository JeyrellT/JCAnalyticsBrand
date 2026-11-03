import { useContext } from 'react';
import { CTA } from './primitives';
import { prepareContact } from './links';
import { ContactTarget } from './contact-target';

export default function ContactCTA({ need = 'Sistema / backend', source = '', children, ...props }) {
  const href = useContext(ContactTarget);
  return <CTA {...props} href={href} onClick={() => prepareContact({ need, source })}>{children}</CTA>;
}
