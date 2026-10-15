# Portal v4 · sistema visual (contrato para quien toca la interfaz)

Dirección: **"precisión tranquila"**. Una herramienta privada de operación y dinero entre socios.
Superficies limpias, un solo azul de marca para la acción, turquesa para lo que va bien, coral para lo que
urge, y paneles "tinta" (oscuros) solo en los momentos de marca. **Tema claro y oscuro** desde el día uno.

La base vive en `src/index.css` (tokens + componentes) y `src/components/ui.jsx` (piezas React).
Nadie fuera del integrador edita esos dos archivos: si te falta una clase, usá utilidades de Tailwind
con los tokens de abajo y anotá la necesidad en tu informe final.

## 1. Tokens (clases de Tailwind)

Todo color pasa por un token con valor claro y oscuro. **Nunca** uses la paleta fija de Tailwind
(`bg-white`, `bg-slate-100`, `text-slate-400`, `bg-amber-50`, `text-violet-700`, `border-amber-200`…):
en modo oscuro se ve roto.

Superficies y texto
- `bg-bg` (= `bg-paper`): fondo de página.
- `bg-surface`: tarjetas, hojas, barras, inputs. `bg-surface-2`: zonas hundidas y filas en hover. `bg-surface-3`: chips neutros, pulsado.
- `border-line` (hairline) · `border-line-strong` (hover, controles) · `divide-line`.
- `text-ink` (principal) · `text-ink-2` (secundario con peso) · `text-muted` (apoyo) · `text-muted-2` (placeholder, terciario).

Tonos (cada uno con `*`, `*-soft`, `*-ink`): `brand`, `teal`, `coral`, `amber`, `violet`, `slate`.
- `bg-{tono}`: color pleno (puntos, barras, botones sólidos con `text-white`).
- `bg-{tono}-soft` + `text-{tono}-ink`: fondo suave con texto legible en los dos temas. Es el patrón de chips, avisos y mosaicos.
- Alias históricos que siguen funcionando: `text-teal-dark` (= `teal-ink`), `bg-paper`, `text-ink-soft`.

Paneles tinta y contraste
- `bg-panel` / `bg-panel-2` / `text-panel-fg` / `text-panel-muted` / `border-panel-line`: panel oscuro en los dos temas (barra lateral, ingreso, "Pulso de inversiones"). Dentro, usá `text-white`, `bg-white/10`, `text-teal`.
- `bg-contrast text-contrast-fg`: pastilla de contraste (pestaña activa, `btn-dark`, toasts). Es tinta sobre blanco en claro y blanco sobre tinta en oscuro.
- `text-panel`: texto oscuro siempre (p. ej. botón blanco dentro de un panel tinta).

Sombras: `shadow-card` (reposo) · `shadow-raised` (hover, flotante) · `shadow-pop` (modales) · `shadow-brand` (botón primario) · `shadow-up` (barra inferior).

## 2. Mapa de migración (clase fija → token)

| Antes | Ahora |
|---|---|
| `bg-white` | `bg-surface` (salvo el mosaico del logo, que sigue blanco) |
| `bg-slate-50` / `hover:bg-slate-50` | `bg-surface-2` / `hover:bg-surface-2` |
| `bg-slate-100` / `hover:bg-slate-100` / `active:bg-slate-100` | `bg-surface-3` (y sus variantes) |
| `bg-slate-200` · `bg-slate-300` · `bg-slate-400` | `bg-line` · `bg-line-strong` · `bg-slate` |
| `text-slate-400` | `text-muted-2` |
| `text-slate-500/600/700` | `text-muted` o `text-ink-2` |
| `text-slate-300` (sobre panel oscuro) | `text-panel-muted` |
| `border-slate-300` / `hover:border-slate-300` | `border-line-strong` |
| `ring-white` (avatares) | `ring-surface` |
| `bg-amber-50` · `text-amber-600/700/800/900` · `border-amber-200` · `ring-amber-200/300` | `bg-amber-soft` · `text-amber-ink` · `border-amber/30` · `ring-amber/40` |
| `bg-amber-500` · `hover:bg-amber-100` | `bg-amber` · `hover:bg-amber/15` |
| `bg-violet-50` · `text-violet-600/700/800` · `border-violet-200` · `bg-violet-500` | `bg-violet-soft` · `text-violet-ink` · `border-violet/30` · `bg-violet` |
| `bg-ink text-white` (pastillas, pestañas) | `bg-contrast text-contrast-fg` |
| `bg-ink` como panel de marca | `card-panel` (o `shell-panel`) |
| `text-brand` como texto de enlace | `text-brand-ink` (o la clase `link`) |
| `text-coral` como texto | `text-coral-ink` (el color pleno `text-coral` solo en íconos) |
| `shadow-[0_1px_2px_rgba(…)]` | `shadow-card` |
| `bg-ink/45` (fondo de modal) | `bg-panel/55` |
| Colores fijos en SVG/Recharts (`#e2e8f0`, `#5b6b82`, `#071a36`) | `var(--line)`, `var(--muted)`, `var(--ink)`, `var(--brand)`, `var(--teal)` |

`text-white` queda bien sobre sólidos saturados (`bg-brand`, `bg-coral`, `bg-teal-ink`) y dentro de paneles tinta.

## 3. Vocabulario de componentes

CSS (`src/index.css`)
- `card` · `card-pad` · `card-hover` (sube en hover) · `card-sunken` · `card-panel` (tinta con resplandor).
- `btn` + `btn-primary` (degradado de marca con sombra) · `btn-outline` · `btn-ghost` · `btn-dark` · `btn-teal` · `btn-danger` · `btn-soft` · tamaños `btn-sm` · `btn-lg` · `btn-icon`.
- `input` (con flecha propia en `select`) · `label` · `hint`.
- `chip` + `tone-{slate|blue|teal|amber|red|violet|ink}` · `dot-{tono}`.
- `icon-tile` (+ `icon-tile-sm` / `icon-tile-lg`) + `tile-{tono}` · `tile-brand` (degradado azul→turquesa).
- `eyebrow` · `section-title` · `section-head` · `kpi-value` · `num` (números en Bricolage, tabulares).
- `row` (fila de lista interactiva) · `link` · `track` (barra de progreso) · `glass` · `skeleton` · `grid-dots` / `grid-dots-light`.
- Movimiento: `animate-rise` · `animate-pop` · `animate-fade` · `animate-float` · `stagger` (los hijos entran escalonados) · `pulse-dot`.

React (`src/components/ui.jsx`)
- `IconTile({ icon, tone, size })` · `SectionHead({ icon, tone, title, hint, action, id, flush })` · `Stat({ label, value, hint, tone, icon })` (mosaico + barra de tono al pie).
- `PageHeader({ eyebrow, title, subtitle, actions, icon, tone, back })` · `EmptyState({ icon, tone, title, action })` · `RowArrow` · `Badge` · `Avatar` · `AvatarStack` · `ProgressBar` · `Tabs` · `Modal` · `Field` · `Select`.
- `ThemeToggle` · `ThemePicker` (en `src/lib/theme.js`: `useTheme()`).

Patrones
- Encabezado de página: `PageHeader` con `eyebrow` + `icon` + `tone` de la sección.
- Sección en tarjeta: `<section className="card overflow-hidden"><SectionHead flush icon tone title hint action /> …filas con divide-line…</section>`.
- Lista de filas enlazables: `<Link className="group row min-h-14 px-4 py-3 sm:px-5">… <RowArrow /></Link>`.
- Indicadores: grilla de `Stat` envuelta en `stagger`.
- Estado vacío: `EmptyState` con ícono y tono de la sección.
- Momentos de marca (dinero de socios, resumen hero): `card-panel`.
- Acción principal de la pantalla: un solo `btn-primary`; el resto `btn-outline` / `btn-ghost`.

## 4. Reglas

- Celular primero: áreas táctiles de 44 px (`tap`), sin desbordes horizontales, textos truncados con `min-w-0`.
- Un solo `h1` por página (lo usan las pruebas); no cambies textos visibles que ya existen (títulos, botones, etiquetas de formularios): `tests/e2e.mjs` los busca por rol y nombre.
- No agregues dependencias. No toques `server/`, `shared/`, `tests/`, `src/index.css`, `src/components/ui.jsx`, `src/components/Layout.jsx` ni archivos de otra área.
- Verificá en los dos temas y en los dos anchos antes de dar por terminado:
  `npx vite build --outDir /tmp/dist-<area>` y luego `PORTAL_DIST=/tmp/dist-<area> node scripts/capturas.mjs /tmp/cap-<area> --tema=light --solo=…` (y `--tema=dark`).
- `npm run lint` debe pasar.
