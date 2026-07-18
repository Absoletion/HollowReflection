from pathlib import Path

root = Path(__file__).resolve().parents[1]
html_path = root / "hollowing-demo.html"
bundle_path = root / "generated" / "pixellab-sprites.js"
marker = "/*__PIXELLAB_SPRITES__*/"

html = html_path.read_text(encoding="utf-8-sig")
bundle = bundle_path.read_text(encoding="utf-8")
generated_marker = "/* GENERATED: approved PixelLab combat libraries. */"
renderer_marker = "\n\n\n'use strict';\n// renderer.js"
if html.count(marker) == 1:
    html = html.replace(marker, bundle)
elif html.count(generated_marker) == 1 and html.count(renderer_marker) == 1:
    start = html.index(generated_marker)
    end = html.index(renderer_marker, start)
    html = html[:start] + bundle.rstrip() + html[end:]
else:
    raise RuntimeError("Could not locate the PixelLab bundle marker or generated bundle block")
html_path.write_text(html, encoding="utf-8")
print(f"Embedded PixelLab bundle; HTML is {html_path.stat().st_size:,} bytes")
