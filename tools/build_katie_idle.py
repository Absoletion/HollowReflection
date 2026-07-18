from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
src = Image.open(ROOT / "generated-art-round-11" / "katie_4star_idle_alpha_v2.png").convert("RGBA")
out_dir = ROOT / "generated-art-round-11"
sprite_dir = ROOT / "dev" / "sprites2"

cols, rows = 4, 2
cell_w, cell_h = src.width // cols, src.height // rows
frames = []
for i in range(8):
    x, y = (i % cols) * cell_w, (i // cols) * cell_h
    cell = src.crop((x, y, x + cell_w, y + cell_h))
    # The generator uses white gutters between magenta cells. Remove those
    # layout pixels before finding the art bounds.
    cleaned = []
    for r, g, b, a in cell.getdata():
        cleaned.append((r, g, b, 0) if r > 242 and g > 242 and b > 242 else (r, g, b, a))
    cell.putdata(cleaned)
    alpha = cell.getchannel("A")
    bbox = alpha.point(lambda p: 255 if p >= 20 else 0).getbbox()
    if not bbox:
        raise RuntimeError(f"empty frame {i}")
    art = cell.crop(bbox)
    scale = min(184 / art.width, 112 / art.height)
    size = (max(1, round(art.width * scale)), max(1, round(art.height * scale)))
    art = art.resize(size, Image.Resampling.NEAREST)
    frame = Image.new("RGBA", (192, 128), (0, 0, 0, 0))
    frame.alpha_composite(art, ((192 - size[0]) // 2, 116 - size[1]))
    frames.append(frame)

atlas = Image.new("RGBA", (192 * 8, 128), (0, 0, 0, 0))
for i, frame in enumerate(frames):
    atlas.alpha_composite(frame, (i * 192, 0))
atlas.save(out_dir / "katie_4star_idle_atlas_8f_v2.png")

# A shared indexed palette keeps every frame visually stable and compact in JS.
rgb = Image.new("RGB", atlas.size, (255, 0, 255))
rgb.paste(atlas.convert("RGB"), mask=atlas.getchannel("A"))
indexed = rgb.quantize(colors=63, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
raw_palette = indexed.getpalette()
used = sorted(set(indexed.getdata()))
magenta = min(used, key=lambda n: sum(abs(a-b) for a,b in zip(raw_palette[n*3:n*3+3], (255,0,255))))
chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@"
opaque = [n for n in used if n != magenta]
mapping = {n: chars[i] for i, n in enumerate(opaque)}
palette = {mapping[n]: "#%02x%02x%02x" % tuple(raw_palette[n*3:n*3+3]) for n in opaque}
pix = indexed.load()
encoded = []
for fi in range(8):
    rows_out = []
    for yy in range(128):
        line = []
        for xx in range(192):
            if atlas.getpixel((fi * 192 + xx, yy))[3] < 20:
                line.append(".")
            else:
                line.append(mapping.get(pix[fi * 192 + xx, yy], "."))
        rows_out.append("".join(line))
    encoded.append(rows_out)

js = "SPRITES['katie'] = {\n"
js += "w:192, h:128,\n"
js += "pal:" + json.dumps(palette, separators=(",", ":")) + ",\n"
js += "facing:'left', asymmetric:true, anchor:{x:96,y:116},\n"
js += "anims:{idle:" + json.dumps(encoded, separators=(",", ":")) + "},\n"
js += "meta:{idle:{fps:8,loop:true}}\n};\n"
(sprite_dir / "katie.js").write_text(js, encoding="utf-8")

manifest = {
    "format": "hollowing-pixel-unit-v1", "key": "katie", "form": "4star",
    "facing": "left", "asymmetric": True,
    "canvas": {"width": 192, "height": 128},
    "anchor": {"x": 96, "y": 116}, "visibleHeight": 100,
    "animations": {"idle": {"fps": 8, "loop": True, "frames": 8, "events": []}},
    "effects": {"canvas": {"width": 384, "height": 256}, "anchor": {"x": 192, "y": 192}},
    "notes": "Wide frames are intentional for the radiographic hammer. Effects are not hard-limited to this canvas."
}
(sprite_dir / "katie_4star.unit.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

(out_dir / "MANIFEST.md").write_text(
    "# Katie Pixel Combat Art — Round 11\n\n"
    "- `katie_4star_idle_chroma_v2.png`: regenerated 4×2 source matched to Cinnia's proportions.\n"
    "- `katie_4star_idle_alpha_v2.png`: transparent working source.\n"
    "- `katie_4star_idle_atlas_8f_v2.png`: normalized 8-frame, 192×128 runtime atlas.\n"
    "- Runtime sprite: `dev/sprites2/katie.js`.\n"
    "- Canonical facing: screen-left. Feet anchor: (96, 116).\n",
    encoding="utf-8"
)
print("Built Katie idle: 8 frames at 192x128")
