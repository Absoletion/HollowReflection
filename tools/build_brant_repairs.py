from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "assets"
    / "animations"
    / "brant"
    / "pixellab-export-complete"
    / "Battle-ready_anchor"
    / "animations"
)
OUTPUT = ROOT / "assets" / "animations" / "brant"

DEEP_WATER = (8, 55, 91, 235)
WATER = (22, 132, 184, 245)
FOAM = (188, 239, 245, 255)
IRON = (91, 103, 111, 255)
SPARK = (246, 203, 112, 255)


def source_frames(animation):
    folder = SOURCE / animation / "south-west"
    frames = [
        Image.open(path).convert("RGBA")
        for path in sorted(folder.glob("frame_*.png"))
    ]
    if not frames:
        raise FileNotFoundError(folder)
    return frames


def connected_components(image, threshold=8):
    alpha = image.getchannel("A")
    pixels = alpha.load()
    seen = set()
    components = []
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
            components.append(component)
    return sorted(components, key=len, reverse=True)


def keep_large_components(image, minimum=12):
    components = connected_components(image)
    keep = {
        point
        for component in components
        if len(component) >= minimum
        for point in component
    }
    result = Image.new("RGBA", image.size)
    source = image.load()
    target = result.load()
    for x, y in keep:
        target[x, y] = source[x, y]
    return result


def align_bottom(image, target_y=243):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image.copy()
    delta = target_y - (bbox[3] - 1)
    result = Image.new("RGBA", image.size)
    result.alpha_composite(image, (0, delta))
    return result


def clean(image):
    return align_bottom(keep_large_components(image))


def pixel_star(draw, x, y, radius=5):
    draw.line((x - radius, y, x + radius, y), fill=SPARK, width=1)
    draw.line((x, y - radius, x, y + radius), fill=FOAM, width=1)


def add_anchor_drop_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    if progress < 0.45:
        return result
    force = min(1.0, (progress - 0.45) / 0.35)
    cx, cy = 49, 226
    radius = 8 + int(44 * force)
    draw.arc(
        (cx - radius, cy - radius // 3, cx + radius, cy + radius // 3),
        185,
        355,
        fill=DEEP_WATER,
        width=7,
    )
    draw.arc(
        (cx - radius, cy - radius // 3, cx + radius, cy + radius // 3),
        185,
        355,
        fill=WATER,
        width=3,
    )
    draw.line((8, 232, 34, 225, 58, 232, 86, 222), fill=IRON, width=3)
    if force > 0.45:
        pixel_star(draw, cx, cy - 3, 7)
        for x, y in ((20, 207), (34, 198), (70, 202), (84, 190)):
            draw.line((x, y, x - 3, y - 7), fill=FOAM, width=1)
    return result


def add_keelhaul_vfx(image, stage, total, phase):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    if phase == "cast":
        length = 24 + int(132 * progress)
        y = 148 - int(15 * progress)
        draw.line((126, 150, max(4, 126 - length), y), fill=IRON, width=3)
        draw.line((126, 150, max(4, 126 - length), y), fill=SPARK, width=1)
        if progress > 0.68:
            pixel_star(draw, max(5, 126 - length), y, 6)
    elif phase == "drag":
        wake = 35 + int(165 * progress)
        draw.line((5, 226, min(250, 5 + wake), 220), fill=DEEP_WATER, width=9)
        draw.line((5, 226, min(250, 5 + wake), 220), fill=WATER, width=4)
        draw.line((5, 224, min(250, 5 + wake), 218), fill=FOAM, width=1)
        for index in range(1 + int(progress * 5)):
            x = 22 + index * 31
            draw.arc((x, 205, x + 24, 229), 195, 345, fill=FOAM, width=1)
    else:
        radius = max(5, int(48 * (1.0 - progress)))
        draw.arc((42 - radius, 214 - radius // 2, 42 + radius, 214 + radius // 2),
                 190, 350, fill=WATER, width=3)
    return result


def write_frames(folder_name, frames):
    folder = OUTPUT / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("frame-*.png"):
        old.unlink()
    for index, frame in enumerate(frames):
        frame.save(folder / f"frame-{index:02d}.png")


idle_source = source_frames("Brant_Planted_Anchor_Idle_Southwest")
idle = [clean(idle_source[index]) for index in range(min(8, len(idle_source)))]
write_frames("idle-planted-anchor-approved-v1", idle)

move_source = source_frames("Brant_Heavy_Haul_Advance_Southwest")
move = [clean(move_source[index]) for index in (0, 1, 2, 3, 4, 5, 6, 7)]
write_frames("move-heavy-haul-approved-v1", move)

load_source = source_frames("Brant_Anchor_Drop_Load_Southwest")
impact_source = source_frames("Brant_Anchor_Drop_Impact_Southwest")
skill_source = [
    *[clean(load_source[index]) for index in (0, 1, 2, 3, 4, 5)],
    *[clean(impact_source[index]) for index in (4, 5, 6, 7, 8)],
]
skill = [
    add_anchor_drop_vfx(frame, index, len(skill_source))
    for index, frame in enumerate(skill_source)
]
skill.extend([skill[-1], skill[-1]])
write_frames("skill-anchor-drop-approved-v1", skill)

cast_source = source_frames("Brant_Keelhaul_Cast_Southwest")
cast = [
    add_keelhaul_vfx(clean(frame), index, len(cast_source), "cast")
    for index, frame in enumerate(cast_source)
]
write_frames("burst-keelhaul-cast-approved-v1", cast)

drag_source = source_frames("Brant_Keelhaul_Drag_Southwest")
drag = [
    add_keelhaul_vfx(clean(frame), index, len(drag_source), "drag")
    for index, frame in enumerate(drag_source)
]
write_frames("burst-keelhaul-drag-approved-v1", drag)

recover_source = source_frames("Brant_Keelhaul_Recover_Southwest")
recover = [
    add_keelhaul_vfx(clean(frame), index, len(recover_source), "recover")
    for index, frame in enumerate(recover_source)
]
recover.extend([recover[-1], recover[-1]])
write_frames("burst-keelhaul-recover-approved-v1", recover)

# PixelLab turned the raw hit reaction into a one-legged running pose. Keep the
# compact recoil beats and return to the exact guard instead.
hit_source = source_frames("Brant_Hit_Southwest")
hit = [clean(hit_source[index]) for index in (0, 1, 2, 1, 0)]
write_frames("hit-compact-recoil-approved-v1", hit)

stagger_source = source_frames("Brant_Stagger_Anchor_Brace_Southwest")
stagger = [clean(stagger_source[index]) for index in (0, 1, 2, 3, 4, 3, 1, 0)]
write_frames("stagger-anchor-brace-approved-v1", stagger)

victory_source = source_frames("Brant_Victory_Check_Southwest")
victory = [clean(frame) for frame in victory_source]
victory.extend([victory[-1], victory[-1], victory[-1]])
write_frames("victory-quiet-check-approved-v1", victory)

# The generated defeat recovered to standing. End on the lowest stable brace
# and hold it until the battle result screen exits.
defeat_source = source_frames("Brant_Defeat_Barrier_Southwest")
defeat = [clean(defeat_source[index]) for index in (0, 1, 2, 3, 4)]
defeat.extend([defeat[-1], defeat[-1], defeat[-1], defeat[-1]])
write_frames("defeat-anchor-barrier-approved-v1", defeat)

print("Built Brant approved Southwest animation library.")
