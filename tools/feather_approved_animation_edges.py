from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ANIMATION_ROOT = ROOT / "assets" / "animations"
FOLDERS = {
    "tobin": (
        "idle-still-water-listening-v1", "move-purposeful-pace-v1",
        "skill-dampen-pilot-v1", "arts-read-phase-v1", "arts-ward-phase-v2",
        "burst-silence-phase-v1", "burst-confession-phase-v1",
        "burst-pressure-phase-v1", "hit-v1", "flinch-stagger-v1",
        "victory-v1", "defeat-v1",
    ),
    "hearthgar": (
        "idle-scared-still-standing-v1", "move-protective-rearguard-v1",
        "skill-brace-step-in-approved-v1", "skill-brace-lock-authored-v1",
        "arts-bank-gather-approved-v1", "arts-bank-shield-v1",
        "burst-open-furnace-fear-v1", "burst-open-furnace-open-v1",
        "burst-open-furnace-answer-v1", "hit-cinder-ignite-v1",
        "stagger-one-knee-approved-v1",
        "victory-relieved-thumbs-up-approved-v1",
        "defeat-covering-kneel-approved-v1",
    ),
    "brigga": None,
    "marlowe": None,
    "brant": None,
    "milla": None,
    "nix": None,
}
RAMP = (0, 48, 96, 144, 192, 224)


def edge_contact(alpha):
    width, height = alpha.size
    return (
        alpha.crop((0, 0, width, 1)).getbbox()
        or alpha.crop((0, height - 1, width, height)).getbbox()
        or alpha.crop((0, 0, 1, height)).getbbox()
        or alpha.crop((width - 1, 0, width, height)).getbbox()
    )


def feather(image):
    result = image.copy()
    pixels = result.load()
    width, height = result.size
    for distance, cap in enumerate(RAMP):
        for y in range(height):
            for x in (distance, width - 1 - distance):
                r, g, b, a = pixels[x, y]
                if a > cap:
                    pixels[x, y] = (r, g, b, cap)
        for x in range(width):
            for y in (distance, height - 1 - distance):
                r, g, b, a = pixels[x, y]
                if a > cap:
                    pixels[x, y] = (r, g, b, cap)
    return result


changed = []
for unit, explicit_folders in FOLDERS.items():
    unit_root = ANIMATION_ROOT / unit
    if not unit_root.exists():
        continue
    folders = (
        [unit_root / name for name in explicit_folders]
        if explicit_folders
        else [
            folder for folder in unit_root.iterdir()
            if folder.is_dir()
            and ("approved" in folder.name or "authored" in folder.name)
            and not folder.name.startswith("previews-")
        ]
    )
    for folder in folders:
        if not folder.is_dir():
            continue
        for path in sorted(folder.glob("frame-*.png")):
            image = Image.open(path).convert("RGBA")
            if edge_contact(image.getchannel("A")):
                feather(image).save(path)
                changed.append(str(path.relative_to(ROOT)))

print(f"Feathered {len(changed)} approved frames with hard canvas-edge contact.")
for path in changed:
    print(path)
