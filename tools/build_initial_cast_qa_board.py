import base64
import io
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "generated" / "pixellab-sprites.js"
OUTPUT = ROOT / "assets" / "animations" / "initial-cast-final-qa-board.png"

UNITS = ["tobin", "hearthgar", "brigga", "marlowe", "brant", "milla", "nix"]
ANIMS = ["idle", "move", "skill", "arts", "burst", "hit", "stagger", "victory", "defeat"]

source = GENERATED.read_text(encoding="utf-8")
prefix = "Object.assign(SPRITES,"
start = source.index(prefix) + len(prefix)
end = source.index(");", start)
sprites = json.loads(source[start:end])

thumb = 92
label_h = 22
cell_w = thumb * 3 + 12
cell_h = thumb + label_h + 10
left = 96
top = 54
board = Image.new(
    "RGBA",
    (left + cell_w * len(ANIMS), top + cell_h * len(UNITS)),
    (10, 14, 22, 255),
)
draw = ImageDraw.Draw(board)
draw.text((10, 8), "Hollow Reflections - Remaining Initial Cast Final Animation QA", fill=(238, 242, 250, 255))

for column, anim in enumerate(ANIMS):
    draw.text((left + column * cell_w + 5, 30), anim.upper(), fill=(121, 211, 226, 255))

edge_contacts = []
for row, unit in enumerate(UNITS):
    sprite = sprites[unit]
    draw.text((8, top + row * cell_h + 40), unit.upper(), fill=(255, 214, 91, 255))
    for column, anim in enumerate(ANIMS):
        x0 = left + column * cell_w
        y0 = top + row * cell_h
        draw.rectangle((x0, y0, x0 + cell_w - 2, y0 + cell_h - 2), outline=(39, 51, 70, 255), width=1)
        frames = sprite["anims"].get(anim)
        if not frames:
            draw.text((x0 + 8, y0 + 42), "N/A", fill=(98, 108, 124, 255))
            continue
        indices = [0, len(frames) // 2, len(frames) - 1]
        for slot, index in enumerate(indices):
            payload = frames[index].split(",", 1)[1]
            frame = Image.open(io.BytesIO(base64.b64decode(payload))).convert("RGBA")
            alpha = frame.getchannel("A")
            if (
                alpha.crop((0, 0, frame.width, 1)).getbbox()
                or alpha.crop((0, frame.height - 1, frame.width, frame.height)).getbbox()
                or alpha.crop((0, 0, 1, frame.height)).getbbox()
                or alpha.crop((frame.width - 1, 0, frame.width, frame.height)).getbbox()
            ):
                edge_contacts.append(f"{unit}.{anim}[{index}]")
            preview = frame.resize((thumb, thumb), Image.Resampling.NEAREST)
            px = x0 + 4 + slot * thumb
            py = y0 + label_h
            board.alpha_composite(preview, (px, py))
            draw.text((px + 3, y0 + 4), str(index), fill=(205, 213, 226, 255))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
board.convert("RGB").save(OUTPUT, quality=95)
print(f"Wrote {OUTPUT}")
print(json.dumps({
    "units": len(UNITS),
    "animationColumns": len(ANIMS),
    "sampledFrames": sum(
        3
        for unit in UNITS
        for anim in ANIMS
        if sprites[unit]["anims"].get(anim)
    ),
    "edgeContacts": edge_contacts,
}, indent=2))
