// Servicios cuya página incluye la demo interactiva que antes vivía en la portada
// (reunión del 31 de octubre de 2026: la portada se acorta y cada categoría se explica
// a fondo en su propia página). Separado de ServiceDemo.jsx para no cargar sus estilos
// en las páginas que no lo necesitan.
export const SERVICE_DEMOS = ['web-development', 'business-intelligence', 'ai-integration', 'digital-marketing'];
export const hasServiceDemo = (id) => SERVICE_DEMOS.includes(id);
