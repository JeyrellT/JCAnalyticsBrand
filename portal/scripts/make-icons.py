#!/usr/bin/env python3
# ============================================================================
#  scripts/make-icons.py — íconos de la app instalable (PWA) del portal.
#
#  Uso (desde portal/):
#      python3 scripts/make-icons.py                 # logo por defecto
#      python3 scripts/make-icons.py ruta/al/logo.png
#
#  Necesita Pillow (pip install pillow). Escribe en public/icons/:
#      icon-192.png, icon-512.png      ícono general (cuadro redondeado azul tinta)
#      maskable-512.png                Android: fondo completo, logo dentro de la zona segura (80 %)
#      apple-touch-icon-180.png        iPhone/iPad: sin transparencia (iOS redondea las esquinas)
#      badge-96.png                    Android: glifo blanco sobre transparente (barra de estado)
#      shortcut-*.png (96)             accesos directos del ícono (mantener presionado)
#
#  El logo de origen: el primero que exista entre la ruta dada, el logo en alta del
#  sitio público (../jcanalytics-app/public/LogoMark.png) y src/assets/logo-mark.webp.
#  Si cambian los íconos, subí la versión de CACHE en public/sw.js.
# ============================================================================

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'icons'
SOURCES = [
    ROOT.parent / 'jcanalytics-app' / 'public' / 'LogoMark.png',  # 794×983, mismo logo en alta
    ROOT / 'src' / 'assets' / 'logo-mark.webp',                   # 162×200
]

INK = (7, 26, 54)            # #071a36 (theme_color)
SS = 4                       # supermuestreo para bordes suaves


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def load_logo(path):
    logo = Image.open(path).convert('RGBA')
    bbox = logo.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return logo.crop(bbox) if bbox else logo


def fit(logo, height):
    """Escala el logo a una altura dada (ancho proporcional)."""
    width = max(1, round(logo.width * height / logo.height))
    return logo.resize((width, round(height)), Image.LANCZOS)


def paste_center(canvas, layer, dy=0):
    x = (canvas.width - layer.width) // 2
    y = (canvas.height - layer.height) // 2 + dy
    canvas.alpha_composite(layer, (x, y))


def rounded_tile(size, color, radius_ratio):
    """Cuadro redondeado con bordes suavizados (supermuestreo)."""
    big = Image.new('L', (size * SS, size * SS), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, size * SS - 1, size * SS - 1), radius=round(size * SS * radius_ratio), fill=255)
    mask = big.resize((size, size), Image.LANCZOS)
    tile = Image.new('RGBA', (size, size), color + (0,))
    tile.putalpha(mask)
    return tile


def glow(size, strength=34):
    """Brillo radial muy suave arriba (da profundidad al fondo tinta)."""
    small = 64
    layer = Image.new('L', (small, small), 0)
    px = layer.load()
    cx, cy, r = small * 0.5, small * 0.3, small * 0.75
    for y in range(small):
        for x in range(small):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / r
            px[x, y] = round(max(0.0, 1 - d) ** 2 * strength)
    layer = layer.resize((size, size), Image.BICUBIC)
    out = Image.new('RGBA', (size, size), (0, 101, 223, 0))
    out.putalpha(layer)
    return out


def app_icon(logo, size, *, logo_ratio, radius_ratio=None):
    """Logo centrado sobre tinta. radius_ratio=None → fondo completo (sin transparencia)."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    if radius_ratio is None:
        canvas.alpha_composite(Image.new('RGBA', (size, size), INK + (255,)))
    else:
        canvas.alpha_composite(rounded_tile(size, INK, radius_ratio))
    shine = glow(size)
    if radius_ratio is not None:
        shine.putalpha(Image.composite(shine.getchannel('A'), Image.new('L', (size, size), 0), canvas.getchannel('A')))
    canvas.alpha_composite(shine)
    paste_center(canvas, fit(logo, size * logo_ratio))
    return canvas


def badge(logo, size=96, logo_ratio=0.86):
    """Silueta blanca del logo sobre transparente (Android solo usa el canal alfa)."""
    mark = fit(logo, size * logo_ratio)
    alpha = mark.getchannel('A')
    white = Image.new('RGBA', mark.size, (255, 255, 255, 0))
    white.putalpha(alpha)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    paste_center(canvas, white)
    return canvas


# ── Glifos de los accesos directos (trazos estilo lucide, cuadrícula de 24) ──
GLYPHS = {
    # Nueva tarea: lista con checks
    'tarea': [
        [(3, 7), (5, 9), (9, 5)], [(3, 17), (5, 19), (9, 15)],
        [(13, 6), (21, 6)], [(13, 12), (21, 12)], [(13, 18), (21, 18)],
    ],
    # Agendar cita: calendario con +
    'cita': [
        ('rect', (3, 4, 21, 22), 2.5),
        [(8, 2), (8, 6)], [(16, 2), (16, 6)], [(3, 10), (21, 10)],
        [(12, 13.5), (12, 18.5)], [(9.5, 16), (14.5, 16)],
    ],
    # Buzón: bandeja de entrada
    'buzon': [
        [(2, 12), (5.5, 5), (18.5, 5), (22, 12), (22, 19), (20.5, 20.5), (3.5, 20.5), (2, 19), (2, 12)],
        [(2, 12), (8, 12), (10, 15), (14, 15), (16, 12), (22, 12)],
    ],
    # Registrar avance: tendencia hacia arriba
    'avance': [
        [(2, 17), (8.5, 10.5), (13.5, 15.5), (22, 7)],
        [(16, 7), (22, 7), (22, 13)],
    ],
}
SHORTCUT_COLORS = {'tarea': '#0065df', 'cita': '#07838c', 'buzon': '#071a36', 'avance': '#39b51c'}


def shortcut_icon(name, size=96):
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((0, 0, big - 1, big - 1), fill=hex_rgb(SHORTCUT_COLORS[name]) + (255,))
    box = big * 0.5                    # el glifo ocupa el 50 % central (seguro si Android lo recorta)
    unit = box / 24
    off = (big - box) / 2
    width = round(2.1 * unit)
    pt = lambda p: (off + p[0] * unit, off + p[1] * unit)  # noqa: E731
    for shape in GLYPHS[name]:
        if isinstance(shape, tuple) and shape[0] == 'rect':
            _, (x0, y0, x1, y1), r = shape
            draw.rounded_rectangle((*pt((x0, y0)), *pt((x1, y1))), radius=r * unit, outline='white', width=width)
            continue
        points = [pt(p) for p in shape]
        draw.line(points, fill='white', width=width, joint='curve')
        for x, y in points:          # puntas y uniones redondeadas
            draw.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill='white')
    return img.resize((size, size), Image.LANCZOS)


def main():
    given = [Path(sys.argv[1])] if len(sys.argv) > 1 else []
    source = next((p for p in given + SOURCES if p.is_file()), None)
    if source is None:
        sys.exit('No encontré el logo de origen.')
    logo = load_logo(source)
    OUT.mkdir(parents=True, exist_ok=True)

    outputs = {
        'icon-192.png': app_icon(logo, 192, logo_ratio=0.64, radius_ratio=0.22),
        'icon-512.png': app_icon(logo, 512, logo_ratio=0.64, radius_ratio=0.22),
        # Zona segura de Android: círculo de radio 40 %. El logo (0,81:1) a 56 % de alto queda adentro.
        'maskable-512.png': app_icon(logo, 512, logo_ratio=0.56),
        'apple-touch-icon-180.png': app_icon(logo, 180, logo_ratio=0.64).convert('RGB'),
        'badge-96.png': badge(logo),
    }
    for name in GLYPHS:
        outputs[f'shortcut-{name}-96.png'] = shortcut_icon(name)

    for name, image in outputs.items():
        image.save(OUT / name, optimize=True)
        print(f'  {name:<26} {image.width}×{image.height}  {(OUT / name).stat().st_size / 1024:.1f} KB')
    print(f'Listo: {len(outputs)} íconos en {OUT.relative_to(ROOT)} (logo: {source.name}).')


if __name__ == '__main__':
    main()
