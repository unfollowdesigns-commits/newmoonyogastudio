# Brand files

Put the studio's logo here, then generate every size in one command:

```bash
python3 scripts/make-icons.py path/to/logo-square.png clients/<id>/brand
```

| File | Size | Used for |
|---|---|---|
| `logo.png` | 1024 | profile card |
| `logo-512.png` | 512 | header, sign-in |
| `icon-512.png`, `icon-192.png` | 512, 192 | Android home screen |
| `apple-icon.png` | 180 | iPhone home screen |
| `icon.png` | 64 | browser tab |

Start from a clean, square logo (PNG, transparent or plain background). If the studio only has an
Instagram screenshot, crop and clean it first — see how New Moon's was done in its folder.
