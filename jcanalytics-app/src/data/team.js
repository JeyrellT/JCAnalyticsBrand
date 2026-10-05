import { t } from '../i18n/locale';

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
    role: t("Fundador · Data & Automation", "Founder · Data & Automation"),
    area: t("Sistemas y automatización", "Systems and automation"),
    bio: t("Diseña el sistema completo: el modelo de datos, la automatización y la lógica fiscal que lo hace funcionar solo.", "Designs the complete system: the data model, automation and tax logic that keep it running on its own."),
    skills: ['Power BI', 'Python', 'Power Automate', t("Factura v4.4", "E-invoicing v4.4")],
    does: t("diseña el sistema", "designs the system"),
    avatar: pub('jeyrell-tardencilla.webp'),
    portrait: pub('team/jeyrell-tardencilla.webp'),
    portraitBg: '#ffffff',
    accent: '#d4ff3a',
    wa: t("Hola Jeyrell, quiero conversar sobre automatizar un proceso.", "Hi Jeyrell, I'd like to discuss automating a process."),
  },
  {
    id: 'catalina',
    name: 'Catalina González',
    first: 'Catalina',
    role: t("Operaciones & CX", "Operations & CX"),
    area: t("Operación y clientes", "Operations and clients"),
    bio: t("Coordina cada entrega y la relación con el cliente: que el avance llegue cada 72 horas y que nadie se quede esperando.", "Coordinates every delivery and client relationship, making sure updates arrive every 72 hours and nobody is left waiting."),
    skills: [t("Gestión de proyectos", "Project management"), t("Soporte", "Support"), t("Procesos", "Processes"), t("Calidad", "Quality")],
    does: t("cuida la operación", "keeps operations on track"),
    avatar: pub('kathalina-gonzales.webp'),
    portrait: pub('team/kathalina-gonzales.webp'),
    portraitBg: '#ffffff',
    accent: '#c0764f',
    wa: t("Hola Catalina, tengo una consulta sobre un proyecto.", "Hi Catalina, I have a question about a project."),
  },
  {
    id: 'alex',
    name: 'Alex Benedict',
    first: 'Alex',
    role: t("Implementación", "Implementation"),
    area: t("Desarrollo web y despliegue", "Web development and deployment"),
    bio: t("Construye y publica: sitios con reservas, integraciones con tus sistemas y la puesta en producción con tu dominio.", "Builds and launches websites with booking, integrations with your systems and production deployment on your domain."),
    skills: ['React', t("Integraciones", "Integrations"), t("Despliegue", "Deployment"), 'WhatsApp API'],
    does: t("lo construye", "builds it"),
    avatar: pub('alex-benedict.webp'),
    portrait: pub('team/alex-benedict.webp'),
    portraitBg: '#ffffff',
    accent: '#8b5cf6',
    wa: t("Hola Alex, quiero una página web para mi negocio.", "Hi Alex, I'd like a website for my business."),
  },
  {
    id: 'hillary',
    name: 'Hillary Porras',
    first: 'Hillary',
    role: 'Community Manager',
    area: t("Redes sociales y publicidad", "Social media and advertising"),
    bio: t("Lleva tus redes de punta a punta: atención a clientes, diseño publicitario, creación de contenido y seguimiento de campañas en Meta Ads.", "Manages your social media from start to finish: customer service, ad design, content creation and campaign tracking in Meta Ads."),
    skills: ['Meta Ads', t("Diseño publicitario", "Ad design"), t("Contenido y video", "Content and video"), t("Atención al cliente", "Customer service")],
    does: t("lo cuenta en redes", "shares it on social"),
    avatar: pub('hillary-porras.webp'),
    portrait: pub('team/hillary-porras.webp'),
    portraitBg: '#1a1612',
    accent: '#ff5a00',
    wa: t("Hola Hillary, quiero que manejen las redes sociales de mi negocio.", "Hi Hillary, I'd like you to manage my business's social media."),
  },
];

export const byId = (id) => TEAM.find((t) => t.id === id);
