"""Generates fictional test images for the portfolio e2e test (no real photos)."""
import os
from PIL import Image, ImageDraw
D = os.path.join(os.path.dirname(__file__), 'fixtures')
os.makedirs(D, exist_ok=True)

def grad(w, h, a, b):
    im = Image.new('RGB', (w, h))
    dr = ImageDraw.Draw(im)
    for x in range(w):
        t = x / (w - 1)
        dr.line([(x, 0), (x, h)], fill=tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)))
    return im, dr

# Large cover (3000x1400) — must be resized to 1600 px on upload
im, dr = grad(3000, 1400, (42, 31, 110), (15, 157, 154))
w = 3000
dr.rectangle([1250, 560, 1750, 1060], outline=(255, 255, 255), width=14)
dr.polygon([(1200, 580), (1500, 330), (1800, 580)], outline=(255, 255, 255), width=14)
for cx, cy, col in [(500, 400, (126, 224, 221)), (2400, 360, (255, 210, 122)), (2550, 900, (255, 107, 92))]:
    dr.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], outline=(255, 255, 255), width=12)
    dr.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], fill=col)
dr.line([(560, 400), (1250, 400)], fill=(255, 255, 255), width=10)
im.save(os.path.join(D, 'cover-homesense.png'))

im, dr = grad(1600, 800, (22, 18, 42), (59, 37, 184))
pts = [(0, 600), (200, 600), (300, 350), (600, 350), (800, 650), (1100, 650), (1300, 300), (1600, 300)]
dr.line(pts, fill=(91, 61, 245), width=28)
dr.line([(0, 720), (500, 720), (700, 250), (1000, 250), (1200, 500), (1600, 500)], fill=(15, 157, 154), width=24)
for (x, y), c in zip([(300, 350), (800, 650), (1300, 300)], [(255, 255, 255), (255, 107, 92), (255, 210, 122)]):
    dr.ellipse([x - 30, y - 30, x + 30, y + 30], fill=c)
im.save(os.path.join(D, 'cover-transit.png'))

# Illustrated avatar (not a photo)
im = Image.new('RGB', (800, 800), (237, 232, 255))
dr = ImageDraw.Draw(im)
dr.ellipse([150, 560, 650, 1100], fill=(91, 61, 245))
dr.ellipse([250, 170, 550, 520], fill=(40, 28, 40))
dr.ellipse([280, 220, 520, 500], fill=(198, 140, 100))
dr.rectangle([240, 260, 290, 640], fill=(40, 28, 40)); dr.rectangle([510, 260, 560, 640], fill=(40, 28, 40))
dr.ellipse([340, 330, 365, 355], fill=(40, 28, 40)); dr.ellipse([435, 330, 460, 355], fill=(40, 28, 40))
dr.arc([360, 380, 440, 440], 20, 160, fill=(120, 50, 40), width=8)
im.save(os.path.join(D, 'avatar-priya.png'))

for i, (a, b) in enumerate([((255, 107, 92), (255, 210, 122)), ((15, 157, 154), (126, 224, 221)), ((91, 61, 245), (22, 18, 42))]):
    im, dr = grad(1200, 900, a, b)
    dr.rounded_rectangle([200, 200, 1000, 700], 40, outline=(255, 255, 255), width=12)
    dr.text((240, 230), f'Sample screenshot {i + 1}', fill=(255, 255, 255))
    im.save(os.path.join(D, f'shot-{i + 1}.png'))
print('fixtures ok')
