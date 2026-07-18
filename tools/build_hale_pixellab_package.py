from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dev" / "pixellab-pilot" / "output" / "hale-4star-approved" / "Equipped_for_combat" / "animations"
SPRITE_DIR = ROOT / "dev" / "sprites2"
QA_DIR = ROOT / "dev" / "pixellab-pilot" / "output" / "hale-4star-runtime-qa"

CANVAS = (256, 160)
ANCHOR = (128, 148)
ALPHA_THRESHOLD = 20

ANIMATIONS = {
    "idle": {"folder": "Combat_Idle_Southwest_V3", "fps": 6, "loop": True},
    "move": {"folder": "Combat_Movement_Southwest_V3", "fps": 8, "loop": True},
    "skill": {"folder": "Skill_Hollowglass_Slash_Southwest", "fps": 10, "loop": False,
              "events": [{"frame": 5, "type": "hit", "target": "primary"}, {"frame": 5, "type": "effect", "id": "cross_slash"}]},
    "arts": {"folder": "Arts_Fractured_Eclipse_Southwest", "fps": 9, "loop": False,
             "events": [{"frame": 5, "type": "effect", "id": "riftguard"}, {"frame": 5, "type": "sfx", "id": "hale_ward"}]},
    "burst": {"folder": "Burst_Hollow_Eclipse_Southwest_Repair", "fps": 8, "loop": False,
              "events": [{"frame": 4, "type": "hit", "target": "primary"}, {"frame": 4, "type": "effect", "id": "black_horizon"}, {"frame": 4, "type": "shake", "id": "heavy"}]},
    "hit": {"folder": "Hit_Reaction_Southwest_Repair", "fps": 8, "loop": False},
    "stagger": {"folder": "Flinch_Southwest_Repair", "fps": 8, "loop": False},
    "victory": {"folder": "Victory_Quiet_Resolve_Southwest", "fps": 6, "loop": False, "holdLast": True},
    "defeat": {"folder": "Defeat_Southwest_Repair", "fps": 6, "loop": False, "holdLast": True},
}


def alpha_bbox(image):
    return image.getchannel("A").point(lambda p: 255 if p >= ALPHA_THRESHOLD else 0).getbbox()


def load_frames(folder):
    path = SOURCE / folder / "south-west"
    files = sorted(path.glob("frame_*.png"))
    if not files:
        raise RuntimeError(f"No southwest frames found in {path}")
    return [Image.open(file).convert("RGBA") for file in files]


raw = {name: load_frames(cfg["folder"]) for name, cfg in ANIMATIONS.items()}
idle_bbox = alpha_bbox(raw["idle"][0])
if not idle_bbox:
    raise RuntimeError("Hale idle reference frame is empty")

# PixelLab keeps every state on the same 256px source canvas. One affine transform
# for the whole package preserves its motion while preventing per-state camera zoom.
base_w, base_h = idle_bbox[2] - idle_bbox[0], idle_bbox[3] - idle_bbox[1]
scale = min(232 / base_w, 112 / base_h)
source_center_x = (idle_bbox[0] + idle_bbox[2]) / 2
source_ground_y = idle_bbox[3]


def normalize(image):
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    resized = image.resize(size, Image.Resampling.NEAREST)
    x = round(ANCHOR[0] - source_center_x * scale)
    y = round(ANCHOR[1] - source_ground_y * scale)
    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    frame.alpha_composite(resized, (x, y))
    return frame


frames = {name: [normalize(frame) for frame in sequence] for name, sequence in raw.items()}
QA_DIR.mkdir(parents=True, exist_ok=True)
for name, sequence in frames.items():
    strip = Image.new("RGBA", (CANVAS[0] * len(sequence), CANVAS[1]), (0, 0, 0, 0))
    for index, frame in enumerate(sequence):
        strip.alpha_composite(frame, (index * CANVAS[0], 0))
    strip.save(QA_DIR / f"hale_4star_{name}_{len(sequence)}f.png")

all_frames = [frame for name in ANIMATIONS for frame in frames[name]]
atlas = Image.new("RGBA", (CANVAS[0] * len(all_frames), CANVAS[1]), (0, 0, 0, 0))
for index, frame in enumerate(all_frames):
    atlas.alpha_composite(frame, (index * CANVAS[0], 0))

rgb = Image.new("RGB", atlas.size, (255, 0, 255))
rgb.paste(atlas.convert("RGB"), mask=atlas.getchannel("A"))
indexed = rgb.quantize(colors=63, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
raw_palette = indexed.getpalette()
used = sorted(set(indexed.getdata()))
transparent_index = min(used, key=lambda n: sum(abs(a-b) for a, b in zip(raw_palette[n*3:n*3+3], (255, 0, 255))))
characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@"
opaque_indices = [index for index in used if index != transparent_index]
mapping = {index: characters[position] for position, index in enumerate(opaque_indices)}
palette = {mapping[index]: "#%02x%02x%02x" % tuple(raw_palette[index*3:index*3+3]) for index in opaque_indices}
pixels = indexed.load()

encoded = {}
offset = 0
for name in ANIMATIONS:
    encoded[name] = []
    for local_index, frame in enumerate(frames[name]):
        atlas_index = offset + local_index
        encoded[name].append([
            "".join("." if frame.getpixel((x, y))[3] < ALPHA_THRESHOLD else mapping.get(pixels[atlas_index * CANVAS[0] + x, y], ".") for x in range(CANVAS[0]))
            for y in range(CANVAS[1])
        ])
    offset += len(frames[name])

metadata = {}
for name, cfg in ANIMATIONS.items():
    metadata[name] = {key: value for key, value in cfg.items() if key != "folder"}

def foot_center(frame):
    points = []
    for y in range(CANVAS[1] - 16, CANVAS[1]):
        for x in range(CANVAS[0]):
            if frame.getpixel((x, y))[3] >= ALPHA_THRESHOLD:
                points.append(x)
    return sum(points) / len(points) if points else ANCHOR[0]

idle_centers = [foot_center(frame) for frame in frames["idle"]]
idle_reference = idle_centers[0]
root_offsets = {"idle": [round(idle_reference - center, 2) for center in idle_centers]}

javascript = "SPRITES['hale'] = {\n"
javascript += f"w:{CANVAS[0]}, h:{CANVAS[1]},\n"
javascript += "pal:" + json.dumps(palette, separators=(",", ":")) + ",\n"
javascript += "facing:'left', asymmetric:true, anchor:{x:128,y:148},\n"
javascript += "anims:{" + ",".join(name + ":" + json.dumps(encoded[name], separators=(",", ":")) for name in ANIMATIONS) + "},\n"
javascript += "rootOffsets:" + json.dumps(root_offsets, separators=(",", ":")) + ",\n"
javascript += "meta:" + json.dumps(metadata, separators=(",", ":")) + "\n};\n"
(SPRITE_DIR / "hale.js").write_text(javascript, encoding="utf-8")

unit_json = {
    "format": "hollowing-pixel-unit-v1", "key": "hale", "form": "4star",
    "facing": "left", "asymmetric": True,
    "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
    "anchor": {"x": ANCHOR[0], "y": ANCHOR[1]}, "visibleHeight": 112,
    "animations": {},
    "effects": {"canvas": {"width": 384, "height": 256}, "anchor": {"x": 192, "y": 192}}
}
for name, cfg in metadata.items():
    unit_json["animations"][name] = {**cfg, "frames": len(frames[name])}
(SPRITE_DIR / "hale_4star.unit.json").write_text(json.dumps(unit_json, indent=2) + "\n", encoding="utf-8")

print(f"Built approved southwest Hale package: {sum(len(sequence) for sequence in frames.values())} frames at scale {scale:.4f}")
