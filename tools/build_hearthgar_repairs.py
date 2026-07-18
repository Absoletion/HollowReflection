from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "animations" / "hearthgar"


def save_sequence(name, frames):
    target = SOURCE / name
    target.mkdir(parents=True, exist_ok=True)
    for old in target.glob("frame-*.png"):
        old.unlink()
    for index, frame in enumerate(frames):
        frame.save(target / f"frame-{index:02d}.png")
    return target


# PixelLab's otherwise excellent first defeat added a temporary vertical light
# rod in source frames 3-4.  The surrounding poses already provide a readable
# standing -> crouch -> protective kneel transition, so omitting those two bad
# in-betweens is cleaner than repainting Hearthgar's helmet anatomy.
def build_defeat():
    source = SOURCE / "defeat-covering-kneel-v1"
    approved_indices = [0, 1, 2, 5, 6, 7, 8]
    frames = [Image.open(source / f"frame-{index:02d}.png").convert("RGBA") for index in approved_indices]
    return save_sequence("defeat-covering-kneel-approved-v1", frames)


def build_stagger():
    # Reuse the clean authored body poses from defeat as a recoil-and-recover
    # sequence. PixelLab repeatedly attached lightbulbs and UI-like objects to
    # the helmet when asked for a stagger; these poses communicate the mechanic
    # without importing any of those artifacts.
    source = SOURCE / "defeat-covering-kneel-v1"
    approved_indices = [0, 1, 2, 5, 2, 1, 0]
    frames = [Image.open(source / f"frame-{index:02d}.png").convert("RGBA") for index in approved_indices]
    return save_sequence("stagger-one-knee-approved-v1", frames)


def build_victory():
    source = SOURCE / "victory-relieved-thumbs-up-v1"
    clean_reference = Image.open(source / "frame-03.png").convert("RGBA")
    clean_far_shoulder = clean_reference.crop((100, 0, 240, 115))
    frames = []
    for index in range(9):
        frame = Image.open(source / f"frame-{index:02d}.png").convert("RGBA")
        # Frames 4-8 contain a detached circular pseudo-icon above the far
        # shoulder. It is fully outside Hearthgar's anatomy, so removing this
        # fixed region preserves the excellent attached gauntlet gesture.
        if index >= 4:
            frame.paste(clean_far_shoulder, (100, 0))
        frames.append(frame)
    return save_sequence("victory-relieved-thumbs-up-approved-v1", frames)


def build_arts_gather():
    source = SOURCE / "arts-bank-gather-v2-clean"
    clean_reference = Image.open(source / "frame-00.png").convert("RGBA")
    starts = [(91, 91), (165, 91), (91, 172), (165, 172), (128, 91)]
    target = (128, 136)
    frames = []
    for index in range(9):
        frame = Image.open(source / f"frame-{index:02d}.png").convert("RGBA")
        # The generated charge motion is strong, but PixelLab replaced the five
        # Cinders with flames on the helmet and shoulders. Remove only bright
        # orange/yellow pixels above the visor, retaining all dark armor pixels.
        artifact_boxes = ((40, 0, 215, 110),)
        for left, top, right, bottom in artifact_boxes:
            clean_region = clean_reference.crop((left, top, right, bottom))
            frame.paste(clean_region, (left, top))

        # Five deterministic Cinder lights travel from authored armor sockets
        # into the furnace, then vanish as the core reaches full compression.
        if 1 <= index <= 6:
            progress = min(1.0, index / 6)
            draw = ImageDraw.Draw(frame)
            for sx, sy in starts:
                x = round(sx + (target[0] - sx) * progress)
                y = round(sy + (target[1] - sy) * progress)
                draw.rectangle((x - 2, y - 2, x + 2, y + 2), fill=(255, 74, 18, 225))
                draw.rectangle((x - 1, y - 1, x + 1, y + 1), fill=(255, 211, 62, 255))
        frames.append(frame)
    return save_sequence("arts-bank-gather-approved-v1", frames)


def barrier_layer(size, stage):
    """A deterministic pixel barrier: broad enough to read, never obscures the rig."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    if stage <= 0:
        return layer

    draw = ImageDraw.Draw(layer)
    stages = {
        1: ((3, 72, 103, 215), 80),
        2: ((-16, 52, 112, 229), 116),
        3: ((-34, 35, 119, 239), 154),
        4: ((-34, 35, 119, 239), 176),
        5: ((-34, 35, 119, 239), 176),
        6: ((-34, 35, 119, 239), 150),
    }
    box, alpha = stages[min(stage, 6)]
    # Two nested ember rims and a translucent heat plane.  Drawing before the
    # character keeps the forward gauntlet visibly in front of the barrier.
    # Left half of the ellipse sits between Hearthgar and the incoming threat.
    # The right half would be hidden by the rig and read as stray lines.
    draw.arc(box, start=90, end=270, fill=(255, 83, 24, alpha), width=6)
    inner = (box[0] + 7, box[1] + 7, box[2] - 7, box[3] - 7)
    draw.arc(inner, start=90, end=270, fill=(255, 188, 54, min(230, alpha + 38)), width=3)
    if stage >= 3:
        for y in range(72, 218, 24):
            draw.line((76, y, 91, y - 6), fill=(255, 123, 32, 68), width=2)
    return layer


def build_skill_lock():
    # Frame 5 is the last clean, fully attached bracing pose from the generated
    # step-in.  Holding it while an authored barrier forms prevents camera drift,
    # armor morph, detached fist halos, and the card-shaped PixelLab artifact.
    body = Image.open(SOURCE / "skill-brace-step-in-v1" / "frame-05.png").convert("RGBA")
    frames = []
    for stage in range(7):
        frame = Image.new("RGBA", body.size, (0, 0, 0, 0))
        frame.alpha_composite(barrier_layer(body.size, stage))
        frame.alpha_composite(body)
        # A restrained core pulse sells the armor locking without changing its
        # geometry.  It is deliberately confined to the existing furnace grate.
        if stage in (2, 3, 4):
            pulse = Image.new("RGBA", body.size, (0, 0, 0, 0))
            p = ImageDraw.Draw(pulse)
            pulse_alpha = {2: 55, 3: 88, 4: 55}[stage]
            p.rectangle((111, 112, 119, 145), fill=(255, 154, 34, pulse_alpha))
            frame.alpha_composite(pulse)
        frames.append(frame)
    return save_sequence("skill-brace-lock-authored-v1", frames)


def build_skill_step_in():
    # The opening six frames contain the complete alarm -> committed step. The
    # discarded tail is where PixelLab begins growing a vent-flame and detached
    # fist halos; the authored lock phase takes over from the same clean pose.
    source = SOURCE / "skill-brace-step-in-v1"
    frames = [Image.open(source / f"frame-{index:02d}.png").convert("RGBA") for index in range(6)]
    return save_sequence("skill-brace-step-in-approved-v1", frames)


if __name__ == "__main__":
    print(f"Built {build_defeat()}")
    print(f"Built {build_stagger()}")
    print(f"Built {build_victory()}")
    print(f"Built {build_arts_gather()}")
    print(f"Built {build_skill_step_in()}")
    print(f"Built {build_skill_lock()}")
