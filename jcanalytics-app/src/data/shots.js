// Capturas de proyectos en dos tamaños (ver scripts/image-variants.py).
/**
 * srcSet de una captura: versión liviana (640 px escritorio · 320 px celular) + la original.
 * Con `sizes`, el navegador descarga y decodifica solo la que necesita: una miniatura
 * de 94 px ya no ocupa la RAM de una imagen de 1600×1000.
 */
export function shotSrcSet(url) {
  if (url?.endsWith('-desktop.webp')) return `${url.replace(/-desktop\.webp$/, '-desktop-640.webp')} 640w, ${url} 1600w`;
  if (url?.endsWith('-mobile.webp')) return `${url.replace(/-mobile\.webp$/, '-mobile-320.webp')} 320w, ${url} 640w`;
  return undefined;
}
