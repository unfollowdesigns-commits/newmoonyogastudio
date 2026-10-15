"""Makes every icon a studio needs from one square logo.

Usage:  python3 scripts/make-icons.py path/to/logo.png clients/<id>/brand
Needs Pillow (pip install pillow). Start from a square PNG, at least 1024x1024.
"""
import sys
from pathlib import Path
from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
logo = Image.open(src).convert("RGBA")
w, h = logo.size
side = min(w, h)
logo = logo.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))

SIZES = {
    "logo.png": 1024,        # big version (profile card)
    "logo-512.png": 512,     # header, sign-in
    "icon-512.png": 512,     # phone home screen (Android)
    "icon-192.png": 192,     # phone home screen (Android)
    "apple-icon.png": 180,   # phone home screen (iPhone)
    "icon.png": 64,          # browser tab
}
for name, size in SIZES.items():
    logo.resize((size, size), Image.LANCZOS).save(out / name)
    print("✓", out / name)
