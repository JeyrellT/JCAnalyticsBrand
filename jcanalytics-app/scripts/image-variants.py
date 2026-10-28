"""Genera las variantes livianas de las capturas de proyectos.

Para cada public/projects/<id>/<pantalla>-desktop.webp (1600 px) crea -desktop-640.webp,
y para cada -mobile.webp (640 px) crea -mobile-320.webp. Correrlo después de agregar capturas:

    python3 scripts/image-variants.py
"""
import glob
from PIL import Image

for path in sorted(glob.glob('public/projects/*/*-desktop.webp')) + sorted(glob.glob('public/projects/*/*-mobile.webp')):
    desktop = path.endswith('-desktop.webp')
    width = 640 if desktop else 320
    out = path.replace('-desktop.webp', '-desktop-640.webp') if desktop else path.replace('-mobile.webp', '-mobile-320.webp')
    image = Image.open(path).convert('RGB')
    image.resize((width, round(image.height * width / image.width)), Image.LANCZOS).save(out, 'WEBP', quality=80, method=6)
    print(out)
