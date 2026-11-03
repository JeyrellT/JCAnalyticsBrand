import { createContext } from 'react';

// Destino del botón de contacto. La portada usa su formulario (#contacto); las páginas de
// servicio con oferta usan el formulario corto (#contacto-servicio) y las demás definen el suyo.
// Vive aparte de ContactCTA.jsx para que Fast Refresh siga funcionando.
export const ContactTarget = createContext('#contacto');
