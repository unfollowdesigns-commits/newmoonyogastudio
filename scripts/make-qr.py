"""Branded QR code (SVG) for a studio: plum-style dots, gently rounded corners, logo in the centre.

Usage:  python3 scripts/make-qr.py <url> clients/<id>/brand/logo-512.png clients/<id>/qr/qr-code.svg [#colour]
Needs: pip install qrcode
Tested design limits (keep them, or phones may fail to scan):
  - error correction H, logo hole <= ~30% of the width
  - dots touching (r = .5), corners only slightly rounded (rx 1), quiet zone of 4 modules
"""
import qrcode, sys, base64
url, logo, out = sys.argv[1], sys.argv[2], sys.argv[3]
fg = sys.argv[4] if len(sys.argv) > 4 else "#6d5260"
q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=0)
q.add_data(url); q.make(fit=True)
m = q.get_matrix(); n = len(m)
# keep the version comfortable for a logo
quiet = 4; size = n + 2 * quiet
eyes = [(0, 0), (0, n - 7), (n - 7, 0)]
def in_eye(r, c): return any(er <= r < er + 7 and ec <= c < ec + 7 for er, ec in eyes)
# logo hole: ~ 24% of the code, rounded to whole modules, centred
hole = int(n * 0.29) | 1
h0 = (n - hole) // 2
def in_hole(r, c):
    cx = cy = (n - 1) / 2
    return (r - cy) ** 2 + (c - cx) ** 2 <= (hole / 2 + 0.6) ** 2
parts = []
for r in range(n):
    for c in range(n):
        if m[r][c] and not in_eye(r, c) and not in_hole(r, c):
            parts.append(f'<circle cx="{c+quiet+.5}" cy="{r+quiet+.5}" r=".5"/>')
for er, ec in eyes:
    x, y = ec + quiet, er + quiet
    # gently rounded corners: very round ones stop some phones from finding the code
    parts.append(f'<rect x="{x}" y="{y}" width="7" height="7" rx="1"/>')
    parts.append(f'<rect x="{x+1}" y="{y+1}" width="5" height="5" rx=".6" fill="#fcf9f7"/>')
    parts.append(f'<circle cx="{x+3.5}" cy="{y+3.5}" r="1.5"/>')
b64 = base64.b64encode(open(logo, "rb").read()).decode()
c = size / 2; lr = hole / 2 - 0.2
parts.append(f'<circle cx="{c}" cy="{c}" r="{lr+.35}" fill="#fcf9f7"/>')
parts.append(f'<clipPath id="lc"><circle cx="{c}" cy="{c}" r="{lr-.25}"/></clipPath>')
parts.append(f'<image href="data:image/png;base64,{b64}" x="{c-lr+.25}" y="{c-lr+.25}" width="{2*lr-.5}" height="{2*lr-.5}" clip-path="url(#lc)"/>')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" fill="{fg}">' + "".join(parts) + "</svg>"
open(out, "w").write(svg)
print("modules", n, "version", q.version, "hole", hole)
