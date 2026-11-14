# Disegna l'icona dell'app (icon-192.png, icon-512.png): musetto del cane arancio segnavia su verde bosco.
# Uso: python tools/make_icon.py   (disegno grande e poi rimpicciolito, così i bordi restano lisci)
from PIL import Image, ImageDraw
import os

BG, FG = (29, 79, 60), (255, 138, 85)
N = 4096

def cubic(p0, p1, p2, p3, n=60):
    return [tuple((1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t**2*c + t**3*d for a, b, c, d in zip(p0, p1, p2, p3))
            for t in [i/n for i in range(n+1)]]

img = Image.new("RGB", (N, N), BG)
d = ImageDraw.Draw(img)

# orecchie che pendono ai lati (piene)
def ear(sx):
    m = lambda p: (2048 + sx*(p[0]-2048), p[1])
    pts = cubic((1500, 1180), (950, 1120), (700, 1900), (930, 2560)) + cubic((930, 2560), (1050, 2800), (1330, 2700), (1380, 2380))[1:] \
        + cubic((1380, 2380), (1420, 2000), (1420, 1600), (1500, 1180))[1:]
    d.polygon([m(p) for p in pts], fill=FG)
ear(1); ear(-1)

# testa: contorno spesso
box = [1350, 1080, 2746, 3000]
d.ellipse(box, outline=FG, width=200)
# occhi
for x in (1760, 2336):
    d.ellipse([x-125, 1820-125, x+125, 1820+125], fill=FG)
# naso e bocca
d.ellipse([2048-230, 2330-160, 2048+230, 2330+160], fill=FG)
d.rounded_rectangle([2048-55, 2400, 2048+55, 2700], radius=55, fill=FG)

here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for s in (192, 512):
    img.resize((s, s), Image.LANCZOS).save(os.path.join(here, f"icon-{s}.png"), optimize=True)
print("icone salvate")
