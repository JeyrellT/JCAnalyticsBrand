// Aplica el tema guardado (claro/oscuro) antes de pintar, para que no haya destello.
// Es un archivo aparte porque la CSP del portal no permite scripts en línea. Ver src/lib/theme.js.
(function () {
  try {
    var t = localStorage.getItem('jcp:theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = dark ? '#070e1b' : '#071a36';
  } catch (e) { /* sin almacenamiento */ }
})();
