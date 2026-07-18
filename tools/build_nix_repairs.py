from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "assets"
    / "animations"
    / "nix"
    / "pixellab-export-complete"
    / "Battle-ready_medical"
    / "animations"
)
OUTPUT = ROOT / "assets" / "animations" / "nix"
BASE = (
    ROOT
    / "assets"
    / "character-references"
    / "nix-pixellab-equipped-southwest-v1.png"
)

DEEP = (7, 70, 78, 235)
MEDICAL = (74, 218, 205, 255)
FOAM = (205, 255, 240, 255)
MEDICINE = (105, 255, 173, 255)
DEBUFF = (94, 42, 124, 230)
BRASS = (190, 128, 52, 255)


def source_frames(animation):
    folder = SOURCE / animation / "south-west"
    frames = [
        Image.open(path).convert("RGBA")
        for path in sorted(folder.glob("frame_*.png"))
    ]
    if not frames:
        raise FileNotFoundError(folder)
    return frames


def components(image, threshold=8):
    alpha = image.getchannel("A")
    pixels = alpha.load()
    seen = set()
    found = []
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y] <= threshold or (x, y) in seen:
                continue
            queue = deque([(x, y)])
            seen.add((x, y))
            component = []
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for nx, ny in (
                    (cx + 1, cy),
                    (cx - 1, cy),
                    (cx, cy + 1),
                    (cx, cy - 1),
                ):
                    if (
                        0 <= nx < image.width
                        and 0 <= ny < image.height
                        and pixels[nx, ny] > threshold
                        and (nx, ny) not in seen
                    ):
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            found.append(component)
    return sorted(found, key=len, reverse=True)


def keep_largest(image):
    found = components(image)
    if not found:
        return image.copy()
    keep = set(found[0])
    result = Image.new("RGBA", image.size)
    src = image.load()
    dst = result.load()
    for x, y in keep:
        dst[x, y] = src[x, y]
    return result


def align_bottom(image, target_y=242):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image.copy()
    result = Image.new("RGBA", image.size)
    result.alpha_composite(image, (0, target_y - (bbox[3] - 1)))
    return result


def clean(image):
    return align_bottom(keep_largest(image))


def remove_generated_pale_magic(image):
    """Remove PixelLab's oversized pale spell strokes before authored VFX."""
    result = image.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            r, g, b, a = pixels[x, y]
            if a and r >= 175 and g >= 215 and b >= 175:
                pixels[x, y] = (0, 0, 0, 0)
    return result


def draw_star(draw, x, y, radius=5, color=FOAM):
    draw.line((x - radius, y, x + radius, y), fill=color, width=1)
    draw.line((x, y - radius, x, y + radius), fill=color, width=1)


def draw_bottle(draw, x, y, scale=1, color=MEDICINE):
    draw.rectangle((x + 2 * scale, y, x + 5 * scale, y + 2 * scale), fill=BRASS)
    draw.rectangle((x, y + 2 * scale, x + 7 * scale, y + 10 * scale), fill=DEEP)
    draw.rectangle((x + scale, y + 3 * scale, x + 6 * scale, y + 9 * scale), fill=color)
    draw.point((x + 2 * scale, y + 4 * scale), fill=FOAM)


def add_idle_vfx(image, stage):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    if stage in (2, 3, 4):
        draw_bottle(draw, 178, 95 - (stage == 3) * 2, 1)
    if stage == 3:
        draw_star(draw, 166, 83, 3, MEDICAL)
    return result


def add_move_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    length = 16 + int(64 * progress)
    draw.line((178, 223, min(252, 178 + length), 226), fill=DEEP, width=7)
    draw.line((178, 223, min(252, 178 + length), 226), fill=MEDICAL, width=3)
    draw.line((178, 220, min(252, 178 + length), 223), fill=FOAM, width=1)
    if stage % 2:
        draw.line((82, 232, 89, 226, 95, 231), fill=BRASS, width=2)
    return result


def add_select_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    x = int(169 - 45 * progress)
    y = int(105 - 24 * progress)
    draw_bottle(draw, x, y, 1)
    if stage >= total - 3:
        draw_star(draw, x + 3, y + 5, 4, MEDICAL)
    return result


def add_dose_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    x = int(116 - 92 * progress)
    y = int(130 - 22 * progress)
    draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=DEEP)
    draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=MEDICINE)
    draw.point((x - 1, y - 1), fill=FOAM)
    draw.arc((x - 21, y - 13, x + 26, y + 18), 180, 345, fill=MEDICAL, width=2)
    if progress > 0.5:
        for index in range(3):
            draw.ellipse((x + 14 + index * 7, y - 5 - index * 3,
                          x + 17 + index * 7, y - 2 - index * 3), fill=DEBUFF)
    return result


def add_lens_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    radius = 6 + int(30 * min(1, progress * 1.5))
    cx, cy = 48, 126
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=DEEP, width=5)
    draw.ellipse((cx - radius + 3, cy - radius + 3, cx + radius - 3, cy + radius - 3), outline=MEDICAL, width=2)
    draw.line((cx - radius + 5, cy, cx + radius - 5, cy), fill=FOAM, width=1)
    draw.line((cx, cy - radius + 5, cx, cy + radius - 5), fill=FOAM, width=1)
    return result


def add_compound_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    cx, cy = 118, 111
    reagents = [
        (cx - 18, cy - 8, MEDICINE),
        (cx + 18, cy - 8, MEDICAL),
        (cx, cy + 17, FOAM),
    ]
    visible = min(3, max(1, stage // 2 + 1))
    for index, (x, y, color) in enumerate(reagents[:visible]):
        draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=DEEP)
        draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=color)
        if stage >= 4:
            draw.line((x, y, cx, cy), fill=MEDICAL, width=1)
    if stage >= total - 3:
        draw.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), fill=MEDICINE)
        draw_star(draw, cx, cy, 8)
    return result


def add_administer_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    x = int(113 - 83 * progress)
    y = int(118 - 10 * progress)
    draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=DEEP)
    draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=FOAM)
    draw.line((118, 119, x, y), fill=MEDICAL, width=3)
    if progress > 0.62:
        radius = 8 + int(26 * (progress - 0.62) / 0.38)
        draw.ellipse((31 - radius, 116 - radius, 31 + radius, 116 + radius), outline=MEDICINE, width=3)
        draw_star(draw, 31, 116, 7)
    return result


def dim_frame(image, amount):
    rgb = ImageEnhance.Brightness(image.convert("RGB")).enhance(amount)
    result = rgb.convert("RGBA")
    result.putalpha(image.getchannel("A"))
    return result


def write_frames(folder_name, frames):
    folder = OUTPUT / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("frame-*.png"):
        old.unlink()
    for index, frame in enumerate(frames):
        frame.save(folder / f"frame-{index:02d}.png")


base = align_bottom(Image.open(BASE).convert("RGBA"))

idle = [add_idle_vfx(base, stage) for stage in (0, 1, 2, 3, 4, 3, 2, 1)]
write_frames("idle-impatient-triage-approved-v1", idle)

move_source = source_frames("Nix_Powered_Medical_Response_Southwest")
move = [
    add_move_vfx(clean(frame), index, len(move_source))
    for index, frame in enumerate(move_source)
]
write_frames("move-powered-medical-response-approved-v1", move)

select_source = source_frames("Nix_Bitter_Draught_Select_Southwest")
select = [
    add_select_vfx(clean(frame), index, len(select_source))
    for index, frame in enumerate(select_source)
]
write_frames("skill-bitter-draught-select-approved-v1", select)

dose_source = source_frames("Nix_Bitter_Draught_Dose_Southwest")
dose = [
    add_dose_vfx(clean(remove_generated_pale_magic(frame)), index, len(dose_source))
    for index, frame in enumerate(dose_source)
]
dose.extend([dose[-1], dose[-1]])
write_frames("skill-bitter-draught-dose-approved-v1", dose)

diagnose_source = source_frames("Nix_Panacea_Diagnose_Southwest")
diagnose = [
    add_lens_vfx(clean(frame), index, len(diagnose_source))
    for index, frame in enumerate(diagnose_source)
]
write_frames("burst-panacea-diagnose-approved-v1", diagnose)

compound_source = source_frames("Nix_Panacea_Compound_Southwest")
compound = [
    add_compound_vfx(clean(frame), index, len(compound_source))
    for index, frame in enumerate(compound_source)
]
write_frames("burst-panacea-compound-approved-v1", compound)

administer_source = source_frames("Nix_Panacea_Administer_Southwest")
administer_indices = (0, 3, 4, 5, 6, 7, 8)
administer = [
    add_administer_vfx(
        clean(remove_generated_pale_magic(administer_source[source_index])),
        index,
        len(administer_indices),
    )
    for index, source_index in enumerate(administer_indices)
]
administer.extend([administer[-1], administer[-1]])
write_frames("burst-panacea-administer-approved-v1", administer)

# Keep every secured bottle in the rack; the raw hit launched one as debris.
hit_source = source_frames("Nix_Hit_Southwest")
hit = [clean(hit_source[index]) for index in (0, 1, 2, 1, 0)]
write_frames("hit-chair-jolt-approved-v1", hit)

# Later raw frames rotated the entire chair toward the camera. Keep only the
# Southwest recoil and add a deterministic brake spark at maximum displacement.
stagger_source = source_frames("Nix_Stagger_Southwest")
stagger = [clean(stagger_source[index]) for index in (0, 1, 2, 1, 0)]
draw = ImageDraw.Draw(stagger[2])
for x, y in ((83, 230), (88, 224), (94, 232)):
    draw.line((x, y, x - 4, y - 5), fill=BRASS, width=2)
write_frames("stagger-brake-skid-approved-v1", stagger)

victory_source = source_frames("Nix_Victory_Clinical_Check_Southwest")
victory = [clean(frame) for frame in victory_source]
for index in range(5, len(victory)):
    draw = ImageDraw.Draw(victory[index])
    draw_star(draw, 105, 100, 3, MEDICINE)
victory.extend([victory[-1], victory[-1], victory[-1]])
write_frames("victory-clinical-check-approved-v1", victory)

# Remove generated text and explosive flashes. The chair loses power in
# controlled stages while Nix remains at the emergency control; the final
# dimmed pose is held instead of looping or disappearing.
defeat_source = source_frames("Nix_Defeat_Emergency_Control_Southwest")
defeat_indices = (0, 1, 5, 6, 7, 8)
defeat = []
for output_index, source_index in enumerate(defeat_indices):
    frame = clean(defeat_source[source_index])
    frame = dim_frame(frame, 1.0 - output_index * 0.09)
    draw = ImageDraw.Draw(frame)
    for light in range(max(0, 5 - output_index)):
        draw.rectangle((176 + light * 4, 101, 178 + light * 4, 103), fill=MEDICAL)
    defeat.append(frame)
defeat.extend([defeat[-1], defeat[-1], defeat[-1], defeat[-1]])
write_frames("defeat-emergency-powerdown-approved-v1", defeat)

print("Built Nix approved Southwest animation library.")
