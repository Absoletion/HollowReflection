from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
src = Image.open(ROOT / "generated-art-round-12" / "hale_4star_idle_alpha_v1.png").convert("RGBA")
out_dir = ROOT / "generated-art-round-12"
sprite_dir = ROOT / "dev" / "sprites2"

frames = []
cell_w, cell_h = src.width // 4, src.height // 2

def remove_detached_neighbors(cell):
    """Keep the character component and only very-near secondary effect clusters."""
    a = cell.getchannel("A")
    px = a.load()
    seen = set()
    comps = []
    for yy in range(cell.height):
        for xx in range(cell.width):
            if px[xx, yy] < 20 or (xx, yy) in seen:
                continue
            stack = [(xx, yy)]
            seen.add((xx, yy))
            comp = []
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)):
                    if 0 <= nx < cell.width and 0 <= ny < cell.height and px[nx, ny] >= 20 and (nx, ny) not in seen:
                        seen.add((nx, ny)); stack.append((nx, ny))
            comps.append(comp)
    if not comps:
        return cell
    main = max(comps, key=len)
    mx0=min(x for x,y in main); mx1=max(x for x,y in main)
    my0=min(y for x,y in main); my1=max(y for x,y in main)
    keep = set(main)
    for comp in comps:
        if len(comp) < 3:
            continue
        x0=min(x for x,y in comp); x1=max(x for x,y in comp)
        y0=min(y for x,y in comp); y1=max(y for x,y in comp)
        dx=max(mx0-x1-1, x0-mx1-1, 0)
        dy=max(my0-y1-1, y0-my1-1, 0)
        if max(dx,dy) <= 10:
            keep.update(comp)
    data = list(cell.getdata())
    for yy in range(cell.height):
        for xx in range(cell.width):
            if (xx,yy) not in keep:
                r,g,b,_ = data[yy*cell.width+xx]
                data[yy*cell.width+xx] = (r,g,b,0)
    cell.putdata(data)
    return cell

for i in range(8):
    x, y = (i % 4) * cell_w, (i // 4) * cell_h
    cell = src.crop((x, y, x + cell_w, y + cell_h))
    # Neighboring sword trails intrude through the right edge of several
    # generated cells. The accepted Hale pose does not occupy this gutter.
    edge = list(cell.getdata())
    for yy in range(cell.height):
        for xx in range(cell.width - 100, cell.width):
            r,g,b,_ = edge[yy*cell.width+xx]
            edge[yy*cell.width+xx] = (r,g,b,0)
    cell.putdata(edge)
    cell = remove_detached_neighbors(cell)
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
atlas.save(out_dir / "hale_4star_idle_atlas_8f_v1.png")

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
    encoded.append([
        "".join(
            "." if atlas.getpixel((fi * 192 + xx, yy))[3] < 20
            else mapping.get(pix[fi * 192 + xx, yy], ".")
            for xx in range(192)
        ) for yy in range(128)
    ])

js = "SPRITES['hale'] = {\n"
js += "w:192, h:128,\n"
js += "pal:" + json.dumps(palette, separators=(",", ":")) + ",\n"
js += "facing:'left', asymmetric:true, anchor:{x:96,y:116},\n"
js += "anims:{idle:" + json.dumps(encoded, separators=(",", ":")) + "},\n"
js += "meta:{idle:{fps:8,loop:true}}\n};\n"
(sprite_dir / "hale.js").write_text(js, encoding="utf-8")

manifest = {
    "format": "hollowing-pixel-unit-v1", "key": "hale", "form": "4star",
    "facing": "left", "asymmetric": True,
    "canvas": {"width": 192, "height": 128},
    "anchor": {"x": 96, "y": 116}, "visibleHeight": 100,
    "animations": {"idle": {"fps": 8, "loop": True, "frames": 8, "events": []}},
    "effects": {"canvas": {"width": 256, "height": 192}, "anchor": {"x": 128, "y": 144}}
}
(sprite_dir / "hale_4star.unit.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

(out_dir / "ROUND-12-MANIFEST.md").write_text(
    "# Round 12 — Hale 4-star Pixel Idle\n\n"
    "- Source supplied by the project owner.\n"
    "- Canonical form: Hale, Adventurer (4-star).\n"
    "- Facing: screen-left. Runtime canvas: 192x128. Feet anchor: (96, 116).\n"
    "- Eight-frame idle at 8 fps.\n",
    encoding="utf-8"
)
print("Built Hale idle: 8 frames at 192x128")
