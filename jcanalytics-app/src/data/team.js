// ============================================================================
//  src/data/team.js
//  EQUIPO · las personas reales detrás de JC Analytics. Un solo lugar para
//  nombre, rol, área, bio corta, habilidades y fotos, que consumen:
//    · components/site/Team.jsx    → sección #equipo (retratos 3:4)
//    · components/site/Contact.jsx → avatares del cierre ("te responde el equipo")
//    · components/site/Social.jsx  → la cara del servicio de redes
//
//  IMÁGENES en public/:
//    avatar   → 400×400 (cara), para círculos pequeños
//    portrait → public/team/*.webp 720×960 (3:4), para las cards grandes
// ============================================================================

const pub = (file) => import.meta.env.BASE_URL + file;

export const TEAM = [
  {
    id: 'jeyrell',
    name: 'Jeyrell Tardencilla',
    first: 'Jeyrell',
    role: 'Fundador · Data & Automation',
    area: 'Sistemas y automatización',
    bio: 'Diseña el sistema completo: el modelo de datos, la automatización y la lógica fiscal que lo hace funcionar solo.',
    skills: ['Power BI', 'Python', 'Power Automate', 'Factura v4.4'],
    does: 'diseña el sistema',
    avatar: pub('jeyrell-tardencilla.webp'),
    portrait: pub('team/jeyrell-tardencilla.webp'),
    portraitBg: '#ffffff',
    accent: '#d4ff3a',
    wa: 'Hola Jeyrell, quiero conversar sobre automatizar un proceso.',
  },
  {
    id: 'catalina',
    name: 'Catalina González',
    first: 'Catalina',
    role: 'Operaciones & CX',
    area: 'Operación y clientes',
    bio: 'Coordina cada entrega y la relación con el cliente: que el avance llegue cada 72 horas y que nadie se quede esperando.',
    skills: ['Gestión de proyectos', 'Soporte', 'Procesos', 'Calidad'],
    does: 'cuida la operación',
    avatar: pub('kathalina-gonzales.webp'),
    portrait: pub('team/kathalina-gonzales.webp'),
    portraitBg: '#ffffff',
    accent: '#c0764f',
    wa: 'Hola Catalina, tengo una consulta sobre un proyecto.',
  },
  {
    id: 'alex',
    name: 'Alex Benedict',
    first: 'Alex',
    role: 'Implementación',
    area: 'Desarrollo web y despliegue',
    bio: 'Construye y publica: sitios con reservas, integraciones con tus sistemas y la puesta en producción con tu dominio.',
    skills: ['React', 'Integraciones', 'Despliegue', 'WhatsApp API'],
    does: 'lo construye',
    avatar: pub('alex-benedict.webp'),
    portrait: pub('team/alex-benedict.webp'),
    portraitBg: '#ffffff',
    accent: '#8b5cf6',
    wa: 'Hola Alex, quiero una página web para mi negocio.',
  },
  {
    id: 'hillary',
    name: 'Hillary Porras',
    first: 'Hillary',
    role: 'Community Manager',
    area: 'Redes sociales y publicidad',
    bio: 'Lleva tus redes de punta a punta: atención a clientes, diseño publicitario, creación de contenido y seguimiento de campañas en Meta Ads.',
    skills: ['Meta Ads', 'Diseño publicitario', 'Contenido y video', 'Atención al cliente'],
    does: 'lo cuenta en redes',
    avatar: pub('hillary-porras.webp'),
    portrait: pub('team/hillary-porras.webp'),
    portraitBg: '#1a1612',
    accent: '#ff5a00',
    wa: 'Hola Hillary, quiero que manejen las redes sociales de mi negocio.',
  },
];

export const byId = (id) => TEAM.find((t) => t.id === id);
