from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "assets"
    / "animations"
    / "marlowe"
    / "pixellab-export-complete"
    / "Rapier-equipped_comb"
    / "animations"
)
OUTPUT = ROOT / "assets" / "animations" / "marlowe"
BASE = (
    ROOT
    / "assets"
    / "character-references"
    / "marlowe-pixellab-equipped-southwest-v2.png"
)

DEEP_WATER = (10, 61, 105, 235)
WATER = (22, 158, 211, 245)
FOAM = (184, 245, 255, 255)
ROSE = (236, 109, 135, 245)


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


def keep_largest_component(image):
    components = connected_components(image)
    if not components:
        return image.copy()
    keep = set(components[0])
    result = Image.new("RGBA", image.size)
    source = image.load()
    target = result.load()
    for x, y in keep:
        target[x, y] = source[x, y]
    return result


def align_bottom(image, target_y=240):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image.copy()
    delta = target_y - (bbox[3] - 1)
    result = Image.new("RGBA", image.size)
    result.alpha_composite(image, (0, delta))
    return result


def clean(image):
    return align_bottom(keep_largest_component(image))


def draw_pixel_star(draw, x, y, radius=6, color=FOAM):
    draw.line((x - radius, y, x + radius, y), fill=color, width=1)
    draw.line((x, y - radius, x, y + radius), fill=color, width=1)
    if radius >= 5:
        draw.point((x - 2, y - 2), fill=WATER)
        draw.point((x + 2, y - 2), fill=WATER)
        draw.point((x - 2, y + 2), fill=WATER)
        draw.point((x + 2, y + 2), fill=WATER)


def add_tip_glint(image, stage):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    if stage in (1, 3):
        draw.point((22, 187), fill=WATER)
    elif stage == 2:
        draw_pixel_star(draw, 22, 187, 3)
    return result


def draw_water_arc(draw, box, start, end, width=3):
    draw.arc(box, start=start, end=end, fill=DEEP_WATER, width=width + 3)
    draw.arc(box, start=start, end=end, fill=WATER, width=width + 1)
    draw.arc(box, start=start, end=end, fill=FOAM, width=1)


def add_parry_vfx(image, stage):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    radii = [8, 15, 23, 31, 23, 13, 5]
    radius = radii[min(stage, len(radii) - 1)]
    cx, cy = 64, 137
    draw_water_arc(
        draw,
        (cx - radius, cy - radius, cx + radius, cy + radius),
        208,
        344,
        2,
    )
    if stage in (2, 3, 4):
        draw_pixel_star(draw, cx - radius + 2, cy + 2, 5 + (stage == 3) * 3)
    return result


def add_refund_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    radius = max(3, int(24 * (1.0 - abs(progress - 0.5) * 1.6)))
    cx, cy = 118, 151
    draw_water_arc(
        draw,
        (cx - radius, cy - radius, cx + radius, cy + radius),
        180,
        350,
        2,
    )
    for index in range(max(0, 4 - abs(stage - total // 2))):
        draw.point((cx + 16 + index * 4, cy - 7 - index * 3), fill=FOAM)
    return result


def add_measure_vfx(image, stage):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    radius = 8 + stage * 5
    cx, cy = 59, 144
    draw_water_arc(
        draw,
        (cx - radius, cy - radius, cx + radius, cy + radius),
        190,
        342,
        2,
    )
    if stage >= 3:
        draw.line((89, 135, 41, 129), fill=DEEP_WATER, width=4)
        draw.line((89, 135, 41, 129), fill=WATER, width=2)
        draw.point((39, 129), fill=FOAM)
    return result


def add_lunge_vfx(image, stage, total):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    progress = stage / max(1, total - 1)
    if progress > 0.35:
        length = int(35 + 92 * min(1, (progress - 0.35) / 0.45))
        y = 132 - int(10 * progress)
        draw.line((105, y, 105 - length, y - 5), fill=DEEP_WATER, width=7)
        draw.line((105, y, 105 - length, y - 5), fill=WATER, width=4)
        draw.line((105, y, 105 - length, y - 5), fill=FOAM, width=1)
        if progress > 0.66:
            draw_pixel_star(draw, max(8, 105 - length), y - 5, 8)
    return result


def add_thrust_vfx(image, strike_index, contact=False, final=False):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    contacts = [
        (54, 124),
        (43, 149),
        (48, 105),
        (35, 171),
        (29, 132),
    ]
    x, y = contacts[strike_index]
    offsets = [(83, 8), (95, -5), (88, 18), (100, -13), (116, 0)]
    dx, dy = offsets[strike_index]
    draw.line((x + dx, y + dy, x, y), fill=DEEP_WATER, width=8)
    draw.line((x + dx, y + dy, x, y), fill=WATER, width=4)
    draw.line((x + dx, y + dy, x, y), fill=FOAM, width=1)
    if contact:
        draw_pixel_star(draw, x, y, 7 + strike_index)
        for mote in range(strike_index):
            mx = x + 9 + mote * 7
            my = y - 13 - (mote % 2) * 7
            draw.point((mx, my), fill=ROSE if mote % 2 else FOAM)
    if final:
        for radius in (14, 25, 39):
            draw_water_arc(
                draw,
                (x - radius, y - radius, x + radius, y + radius),
                195,
                345,
                2,
            )
        draw_pixel_star(draw, x, y, 16)
        for mx, my in ((85, 70), (111, 60), (138, 72), (161, 58)):
            draw_pixel_star(draw, mx, my, 3, ROSE)
    return result


def add_victory_vfx(image, stage):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    if stage >= 2:
        for index, (x, y) in enumerate(((80, 83), (111, 67), (145, 78), (173, 61))):
            if index <= stage - 2:
                draw_pixel_star(draw, x, y, 3, ROSE if index % 2 else FOAM)
    return result


def write_frames(folder_name, frames):
    folder = OUTPUT / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("frame-*.png"):
        old.unlink()
    for index, frame in enumerate(frames):
        frame.save(folder / f"frame-{index:02d}.png")
    return folder


base = clean(Image.open(BASE).convert("RGBA"))

# PixelLab's "minimal" idle became a sequence of unrelated flourishes. A
# locked production idle is deliberately stable: combat-ready guard, subtle
# weapon glint, and no camera or foot drift.
idle = [add_tip_glint(base, stage) for stage in (0, 1, 2, 3, 2, 1, 0, 0)]
write_frames("idle-fencing-guard-approved-v1", idle)

move = [clean(frame) for frame in source_frames("Marlowe_Fencing_Advance_Southwest")]
write_frames("move-fencing-advance-approved-v1", move)

invitation_source = source_frames("Marlowe_Riposte_Invitation_Southwest")
invitation = [
    add_parry_vfx(clean(frame), index)
    for index, frame in enumerate(invitation_source)
]
write_frames("skill-riposte-invitation-approved-v1", invitation)

counter_source = source_frames("Marlowe_Riposte_Counter_Southwest")
counter_indices = [0, 1, 2, 3, 4, 5, 6, 3, 1, 0]
counter = [
    add_parry_vfx(clean(counter_source[source_index]), output_index)
    for output_index, source_index in enumerate(counter_indices)
]
write_frames("skill-riposte-counter-approved-v1", counter)

refund_source = source_frames("Marlowe_Riposte_Refund_Southwest")
refund_indices = [0, 1, 2, 3, 4, 5, 6, 3, 1, 0]
refund = [
    add_refund_vfx(
        clean(refund_source[source_index]),
        output_index,
        len(refund_indices),
    )
    for output_index, source_index in enumerate(refund_indices)
]
write_frames("skill-riposte-refund-approved-v1", refund)

# The generated measure phase failed. Author it from the approved guard so the
# Arts still has a readable calculation beat before the explosive lunge.
measure = [add_measure_vfx(base, stage) for stage in range(6)]
write_frames("arts-coup-de-grace-measure-authored-v1", measure)

lunge_source = source_frames("Marlowe_Coup_de_Grace_Lunge_Southwest")
lunge = [
    add_lunge_vfx(clean(frame), index, len(lunge_source))
    for index, frame in enumerate(lunge_source)
]
lunge.extend([lunge[-1], lunge[-1]])
write_frames("arts-coup-de-grace-lunge-approved-v1", lunge)

# Curtain Call is an authored five-contact sequence. Raw poses remain the
# acting source, while the contact timing and water trails are deterministic.
entry = source_frames("Marlowe_Curtain_Call_Entry_Southwest")
reversal = source_frames("Marlowe_Curtain_Call_Reversal_Southwest")
finale = source_frames("Marlowe_Curtain_Call_Finale_Southwest")
thrust_sources = [
    (entry, [0, 1, 2, 1]),
    (entry, [1, 2, 3, 1]),
    (reversal, [0, 1, 2, 1]),
    (counter_source, [0, 1, 2, 1]),
    (lunge_source, [1, 2, 5, 6]),
]
burst = []
for strike_index, (frames, indices) in enumerate(thrust_sources):
    for beat, source_index in enumerate(indices):
        burst.append(
            add_thrust_vfx(
                clean(frames[source_index]),
                strike_index,
                contact=beat == 2,
                final=strike_index == 4 and beat == 2,
            )
        )
for stage, source_index in enumerate((6, 7, 8)):
    burst.append(add_victory_vfx(clean(finale[source_index]), stage + 2))
burst.extend([burst[-1], burst[-1]])
write_frames("burst-curtain-call-five-strike-authored-v1", burst)

# The raw hit reaction transformed into an attack after frame two. The compact
# recoil below preserves identity and returns cleanly to guard.
hit_source = source_frames("Marlowe_Hit_Southwest")
hit = [clean(hit_source[index]) for index in (0, 1, 2, 1, 0)]
write_frames("hit-tight-recoil-approved-v1", hit)

stagger_source = source_frames("Marlowe_Stagger_Southwest")
stagger = [clean(stagger_source[index]) for index in (0, 1, 2, 3, 7, 8)]
write_frames("stagger-heavy-balance-loss-approved-v1", stagger)

victory_source = source_frames("Marlowe_Victory_Southwest")
victory = [
    add_victory_vfx(clean(victory_source[index]), output_index)
    for output_index, index in enumerate((0, 1, 2, 3, 4, 5, 6))
]
victory.extend([victory[-1], victory[-1], victory[-1]])
write_frames("victory-curtain-bow-approved-v1", victory)

defeat_source = source_frames("Marlowe_Defeat_Southwest")
defeat = [clean(defeat_source[index]) for index in (0, 1, 2, 3, 4, 5, 6)]
defeat.extend([defeat[-1], defeat[-1], defeat[-1]])
write_frames("defeat-kneeling-exhaustion-approved-v1", defeat)

print("Built Marlowe approved Southwest animation library.")
