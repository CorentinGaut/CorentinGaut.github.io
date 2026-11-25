#!/usr/bin/env python3
"""Extrait une figure d'une diapositive PDF pour les pages de cours.

Usage : crop_slide.py fichier.pdf page x0 y0 x1 y1 sortie.webp
x0..y1 sont des fractions (0-1) de la largeur / hauteur de la page.
"""
import subprocess, sys, tempfile, os
from PIL import Image

pdf, page, x0, y0, x1, y1, out = sys.argv[1], int(sys.argv[2]), *map(float, sys.argv[3:7]), sys.argv[7]
with tempfile.TemporaryDirectory() as d:
    # mutool embarque les polices de base (Times, Helvetica…) que poppler ne trouve pas toujours
    subprocess.run(['mutool', 'draw', '-q', '-r', '200', '-o', os.path.join(d, 'p.png'), pdf, str(page)], check=True, stderr=subprocess.DEVNULL)
    im = Image.open(os.path.join(d, 'p.png')).convert('RGB')
W, H = im.size
im = im.crop((round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H)))
if im.width > 900:
    im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
im.save(out, quality=82, method=6)
print(out, im.size)
