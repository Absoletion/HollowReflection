from pathlib import Path
from collections import deque
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "assets"
    / "animations"
    / "brigga"
    / "pixellab-export-complete"
    / "Equipped_battle-read"
    / "animations"
)
OUTPUT = ROOT / "assets" / "animations" / "brigga"


def source_frames(animation):
    folder = SOURCE / animation / "south-west"
    return [
        Image.open(path).convert("RGBA")
        for path in sorted(folder.glob("frame_*.png"))
    ]


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


def remove_pale_generated_arc(image):
    result = image.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            r, g, b, a = pixels[x, y]
            if a and r >= 235 and g >= 235 and b >= 175:
                pixels[x, y] = (0, 0, 0, 0)
    return result


def align_bottom(image, target_y=242):
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image.copy()
    bottom = bbox[3] - 1
    delta = target_y - bottom
    result = Image.new("RGBA", image.size)
    result.alpha_composite(image, (0, delta))
    return result


def draw_fault(draw, points, core=(255, 245, 188, 255), glow=(255, 92, 18, 255)):
    draw.line(points, fill=(130, 28, 10, 210), width=7, joint="curve")
    draw.line(points, fill=glow, width=4, joint="curve")
    draw.line(points, fill=core, width=1, joint="curve")


def add_kegcracker_vfx(image, strength):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    if strength >= 1:
        draw_fault(draw, [(8, 226), (28, 218), (45, 225), (66, 207), (88, 214)])
        draw.line([(39, 220), (33, 203), (47, 192)], fill=(255, 115, 22, 255), width=2)
    if strength >= 2:
        for x, y in [(17, 202), (30, 194), (58, 199), (79, 188)]:
            draw.line((x - 3, y, x + 3, y), fill=(255, 237, 175, 255), width=1)
            draw.line((x, y - 3, x, y + 3), fill=(255, 92, 18, 255), width=1)
    return result


def add_blast_mark_vfx(image, stage):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    marks = [(25, 221), (55, 216), (85, 220), (114, 211)]
    for index, (x, y) in enumerate(marks[:stage]):
        draw.ellipse((x - 3, y - 2, x + 3, y + 2), fill=(112, 24, 12, 255))
        draw.line((x - 2, y, x + 2, y), fill=(255, 198, 70, 255), width=1)
        draw.point((x, y - 3), fill=(255, 246, 193, 255))
    return result


def add_blast_chain_vfx(image, stage):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    centers = [(21, 219), (48, 215), (77, 218), (106, 211)]
    for index, (x, y) in enumerate(centers):
        if index < stage:
            radius = 7 + (stage - index) * 2
            draw.ellipse(
                (x - radius, y - radius, x + radius, y + radius),
                fill=(135, 25, 9, 190),
            )
            draw.ellipse(
                (x - radius // 2, y - radius // 2, x + radius // 2, y + radius // 2),
                fill=(255, 104, 18, 235),
            )
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(255, 247, 204, 255))
        elif index == stage:
            draw.ellipse((x - 3, y - 2, x + 3, y + 2), fill=(255, 190, 50, 255))
    if stage:
        draw.line(
            [(centers[i][0], centers[i][1]) for i in range(min(stage + 1, len(centers)))],
            fill=(255, 83, 16, 220),
            width=2,
        )
    return result


def add_survey_fault_vfx(image, strength):
    result = image.copy()
    if not strength:
        return result
    draw = ImageDraw.Draw(result)
    draw_fault(
        draw,
        [(2, 232), (31, 225), (58, 231), (91, 217), (123, 225), (151, 211)],
        core=(255, 225, 135, 230),
        glow=(235, 68, 15, 230),
    )
    if strength > 1:
        draw.line((90, 219, 84, 201, 93, 189), fill=(255, 116, 25, 230), width=2)
    return result


def add_grand_opening_impact(image, stage):
    effect = Image.new("RGBA", image.size)
    draw = ImageDraw.Draw(effect)
    core_x, core_y = 43, 221
    radius = [4, 9, 17, 29, 43, 58, 48, 34][stage]
    if stage <= 5:
        draw.ellipse(
            (core_x - radius, core_y - radius, core_x + radius, core_y + radius),
            outline=(116, 22, 10, max(80, 230 - stage * 16)),
            width=max(2, 7 - stage // 2),
        )
        inner = max(3, radius // 2)
        draw.ellipse(
            (core_x - inner, core_y - inner, core_x + inner, core_y + inner),
            outline=(255, 90, 13, 245),
            width=max(2, 5 - stage // 2),
        )
    if stage <= 4:
        ray = 10 + stage * 7
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1)):
            draw.line(
                (core_x, core_y, core_x + dx * ray, core_y + dy * ray),
                fill=(255, 143, 25, 235),
                width=max(1, 4 - stage // 2),
            )
        draw.ellipse(
            (core_x - 4, core_y - 4, core_x + 4, core_y + 4),
            fill=(255, 250, 218, 255),
        )
    fracture = [
        (0, 232),
        (28, 224),
        (61, 233),
        (94, 211),
        (130, 220),
        (165, 197),
        (205, 211),
        (255, 183),
    ]
    draw_fault(draw, fracture)
    for index in range(min(stage + 1, 6)):
        x = 67 + index * 29
        height = 12 + index * 7
        draw.polygon(
            [(x - 6, 229), (x, 229 - height), (x + 7, 229)],
            fill=(88, 45, 34, 255),
        )
        draw.line((x, 225, x, 229 - height), fill=(255, 111, 24, 255), width=2)
    for index in range(stage * 2):
        x = 25 + ((index * 37 + stage * 13) % 205)
        y = 205 - ((index * 19 + stage * 7) % 68)
        draw.rectangle((x, y, x + 2, y + 2), fill=(255, 104, 18, 220))
    result = effect
    result.alpha_composite(image)
    return result


def write_frames(folder_name, frames):
    folder = OUTPUT / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames):
        frame.save(folder / f"frame-{index:02d}.png")
    return folder


idle = [
    align_bottom(keep_largest_component(frame))
    for frame in source_frames("Brigga_Combat_Idle_Southwest")[:8]
]
write_frames("idle-reading-fault-southwest-v1", idle)

move = [
    align_bottom(keep_largest_component(frame))
    for frame in source_frames("Brigga_Combat_Move_Southwest")
]
write_frames("move-heavy-scuttle-southwest-v1", move)

commit = [
    keep_largest_component(remove_pale_generated_arc(keep_largest_component(frame)))
    for frame in source_frames("Brigga_Grand_Opening_Commit_Southwest")
]

skill = [
    keep_largest_component(frame)
    for frame in source_frames("Brigga_Kegcracker_Sight_Southwest")[:5]
]
skill.extend(commit[2:8])
skill[-2] = add_kegcracker_vfx(skill[-2], 1)
skill[-1] = add_kegcracker_vfx(skill[-1], 2)
write_frames("skill-kegcracker-approved-v1", skill)

arts_mark_source = source_frames("Brigga_Blast_Mining_Mark_Southwest")
arts_mark = [
    add_blast_mark_vfx(
        keep_largest_component(arts_mark_source[index]),
        min(4, max(0, output_index - 2)),
    )
    for output_index, index in enumerate([0, 1, 2, 3, 4, 5, 6, 8])
]
write_frames("arts-blast-mining-mark-approved-v1", arts_mark)

arts_fire_source = source_frames("Brigga_Blast_Mining_Fire_Southwest")
arts_fire = []
for output_index, source_index in enumerate([0, 3, 4, 5, 6, 7, 8]):
    cleaned = keep_largest_component(arts_fire_source[source_index])
    arts_fire.append(add_blast_chain_vfx(cleaned, min(4, output_index)))
write_frames("arts-blast-mining-fire-approved-v1", arts_fire)

survey_source = source_frames("Brigga_Grand_Opening_Survey_Southwest")
survey = []
for index, frame in enumerate(survey_source):
    survey.append(add_survey_fault_vfx(keep_largest_component(frame), max(0, index - 6)))
write_frames("burst-grand-opening-survey-approved-v1", survey)

write_frames("burst-grand-opening-commit-approved-v1", commit[:7])

impact_base = commit[6]
impact = [add_grand_opening_impact(impact_base, index) for index in range(8)]
write_frames("burst-grand-opening-impact-authored-v1", impact)

hit = [
    keep_largest_component(frame)
    for frame in source_frames("Brigga_Hit_Southwest")
]
write_frames("hit-irritated-recoil-approved-v1", hit)

stagger_source = source_frames("Brigga_Stagger_Southwest")
stagger = [
    keep_largest_component(stagger_source[index])
    for index in [0, 1, 2, 6, 7, 8]
]
write_frames("stagger-maul-brace-approved-v1", stagger)

victory = [
    keep_largest_component(frame)
    for frame in source_frames("Brigga_Victory_Southwest")
]
write_frames("victory-record-results-approved-v1", victory)

defeat_source = source_frames("Brigga_Defeat_Southwest")
defeat = [
    keep_largest_component(defeat_source[index])
    for index in [0, 1, 2, 3, 4, 7, 8]
]
write_frames("defeat-kneeling-by-maul-approved-v1", defeat)

print("Built Brigga approved Southwest animation library.")
