from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "assets"
    / "animations"
    / "milla"
    / "pixellab-export-complete"
    / "Preserve_Milla_exact"
    / "animations"
)
OUTPUT = ROOT / "assets" / "animations" / "milla"
BASE = (
    ROOT
    / "assets"
    / "character-references"
    / "milla-pixellab-equipped-southwest-clean-v2.png"
)

DEEP_THUNDER = (128, 76, 12, 235)
THUNDER = (255, 196, 36, 255)
HOT = (255, 248, 190, 255)
ROUTE = (97, 225, 255, 245)
PARCEL = (210, 89, 39, 255)
PARCEL_DARK = (91, 40, 27, 255)


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


def align_bottom(image, target_y=239):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image.copy()
    result = Image.new("RGBA", image.size)
    result.alpha_composite(image, (0, target_y - (bbox[3] - 1)))
    return result


def clean(image):
    return align_bottom(keep_largest(image))


def draw_star(draw, x, y, radius=5, color=HOT):
    draw.line((x - radius, y, x + radius, y), fill=color, width=1)
    draw.line((x, y - radius, x, y + radius), fill=color, width=1)


def draw_parcel(draw, x, y, scale=1):
    width = 10 * scale
    height = 8 * scale
    draw.rectangle((x, y, x + width, y + height), fill=PARCEL_DARK)
    draw.rectangle((x + scale, y + scale, x + width - scale, y + height - scale), fill=PARCEL)
    draw.line((x + width // 2, y + scale, x + width // 2, y + height - scale), fill=HOT, width=scale)
    draw.line((x + scale, y + height // 2, x + width - scale, y + height // 2), fill=THUNDER, width=scale)


def add_idle_accent(image, stage):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    if stage in (2, 3, 4):
        x = 158 + (stage - 3)
        y = 226 - (stage == 3) * 2
        draw.line((x, y, x + 5, y - 5), fill=DEEP_THUNDER, width=3)
        draw.line((x, y, x + 5, y - 5), fill=THUNDER, width=1)
    if stage == 3:
        draw_star(draw, 180, 145, 3, ROUTE)
    return result


def add_route_trail(image, stage, total, strength=1):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    length = int((26 + 92 * progress) * strength)
    y = 190 - int(18 * progress)
    draw.line((150, y, min(252, 150 + length), y + 8), fill=DEEP_THUNDER, width=7)
    draw.line((150, y, min(252, 150 + length), y + 8), fill=THUNDER, width=3)
    draw.line((150, y - 2, min(252, 150 + length), y + 6), fill=HOT, width=1)
    if stage % 2:
        draw.line((165, 225, 171, 217, 177, 220), fill=ROUTE, width=2)
    return result


def add_delivery_parcel(image, stage, total, large=False):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    x = int(118 - 70 * progress)
    y = int(128 - 15 * progress)
    draw_parcel(draw, x, y, 2 if large else 1)
    if stage >= total // 2:
        draw_star(draw, x, y + 3, 4 + (2 if large else 0))
    return result


def add_compound_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    cx, cy = 104, 131
    radius = 5 + int(15 * progress)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=DEEP_THUNDER, width=4)
    draw.ellipse((cx - radius + 3, cy - radius + 3, cx + radius - 3, cy + radius - 3), outline=THUNDER, width=2)
    if stage >= total - 3:
        draw_parcel(draw, cx - 10, cy - 8, 2)
        draw_star(draw, cx, cy, 7)
    return result


def add_finish_vfx(image, stage, total):
    result = add_delivery_parcel(image, stage, total, large=True)
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    if progress > 0.5:
        radius = 7 + int(38 * (progress - 0.5) * 2)
        cx, cy = 43, 124
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=THUNDER, width=4)
        draw.ellipse((cx - radius + 5, cy - radius + 5, cx + radius - 5, cy + radius - 5), outline=ROUTE, width=2)
        draw_star(draw, cx, cy, 9)
    return result


def write_frames(folder_name, frames):
    folder = OUTPUT / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("frame-*.png"):
        old.unlink()
    for index, frame in enumerate(frames):
        frame.save(folder / f"frame-{index:02d}.png")


base = align_bottom(Image.open(BASE).convert("RGBA"))

# The generated idle walked in place. Keep Milla visibly impatient through
# scarf/boot accents while her feet remain locked to the exact identity pose.
idle = [add_idle_accent(base, stage) for stage in (0, 1, 2, 3, 4, 3, 2, 1)]
write_frames("idle-ready-route-approved-v1", idle)

# PixelLab's requested idle accidentally supplied the cleanest local running
# cycle. It becomes the movement source after alignment and detached-artifact
# cleanup.
move_source = source_frames("Milla_Ready_Route_Idle_Southwest")
move = [clean(frame) for frame in move_source[:8]]
write_frames("move-courier-sprint-approved-v1", move)

launch_source = source_frames("Milla_Hand-Off_Launch_Southwest")
launch = [
    add_route_trail(clean(frame), index, len(launch_source))
    for index, frame in enumerate(launch_source)
]
write_frames("skill-hand-off-launch-approved-v1", launch)

deliver_source = source_frames("Milla_Hand-Off_Deliver_Southwest")
deliver = [
    add_delivery_parcel(clean(frame), index, len(deliver_source))
    for index, frame in enumerate(deliver_source)
]
deliver.extend([deliver[-1], deliver[-1]])
write_frames("skill-hand-off-deliver-approved-v1", deliver)

first_source = source_frames("Milla_Express_Route_First_Delivery_Southwest")
first = [
    add_route_trail(clean(frame), index, len(first_source), 1)
    for index, frame in enumerate(first_source)
]
first[-3:] = [
    add_delivery_parcel(frame, index, 3)
    for index, frame in enumerate(first[-3:])
]
write_frames("arts-express-route-first-approved-v1", first)

second_source = source_frames("Milla_Express_Route_Second_Delivery_Southwest")
second_indices = (0, 1, 3, 4, 5, 6, 7, 8)
second = [
    add_delivery_parcel(clean(second_source[source_index]), index, len(second_indices))
    for index, source_index in enumerate(second_indices)
]
write_frames("arts-express-route-second-approved-v1", second)

stop_source = source_frames("Milla_Express_Route_Stop_Southwest")
stop = [clean(frame) for frame in stop_source]
stop.extend([stop[-1], stop[-1]])
write_frames("arts-express-route-stop-approved-v1", stop)

compound_source = source_frames("Milla_Special_Delivery_Compound_Southwest")
compound = [
    add_compound_vfx(clean(frame), index, len(compound_source))
    for index, frame in enumerate(compound_source)
]
write_frames("burst-special-delivery-compound-approved-v1", compound)

# Replace the generated giant wing-shapes with a readable courier launch and
# deterministic thunder route.
route_source = source_frames("Milla_Special_Delivery_Route_Southwest")
route_indices = (0, 5, 6, 7, 8, 6, 7, 8)
route = [
    add_route_trail(clean(route_source[source_index]), index, len(route_indices), 2)
    for index, source_index in enumerate(route_indices)
]
write_frames("burst-special-delivery-route-approved-v1", route)

# The generated finish turned front-facing. Reuse the strongest Southwest
# physical hand-off poses and author the full-gauge delivery climax.
finish_indices = (2, 3, 4, 5, 6, 7, 8)
finish = [
    add_finish_vfx(clean(deliver_source[source_index]), index, len(finish_indices))
    for index, source_index in enumerate(finish_indices)
]
finish.extend([finish[-1], finish[-1]])
write_frames("burst-special-delivery-finish-authored-v1", finish)

# Raw hit lifted the entire satchel over her head. Restrict it to the compact
# shoulder recoil before the prop mutation begins.
hit_source = source_frames("Milla_Hit_Southwest")
hit = [clean(hit_source[index]) for index in (0, 1, 2, 3, 2, 1, 0)]
write_frames("hit-satchel-protect-approved-v1", hit)

stagger_source = source_frames("Milla_Stagger_Southwest")
stagger = [clean(frame) for frame in stagger_source]
write_frames("stagger-broken-momentum-approved-v1", stagger)

victory_source = source_frames("Milla_Victory_Ledger_Southwest")
victory = [clean(frame) for frame in victory_source]
victory.extend([victory[-1], victory[-1], victory[-1]])
write_frames("victory-route-ledger-approved-v1", victory)

# PixelLab's defeat placed the satchel down and stood upright. Preserve the
# early protective collapse, lower the deepest attached-satchel crouch into a
# stable kneeling guard, and hold it.
defeat_source = source_frames("Milla_Defeat_Satchel_Guard_Southwest")
defeat = [clean(defeat_source[index]) for index in (0, 1, 2, 3)]
low = Image.new("RGBA", defeat[-1].size)
low.alpha_composite(defeat[-1], (0, 19))
defeat.extend([low, low, low, low])
write_frames("defeat-satchel-guard-approved-v1", defeat)

print("Built Milla approved Southwest animation library.")
