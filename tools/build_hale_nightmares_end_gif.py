from pathlib import Path
import shutil
import sys

from PIL import Image, ImageFilter


def recolor_dark_vfx(source: Image.Image) -> Image.Image:
    image = source.convert("RGBA")
    pixels = image.load()
    width, height = image.size

    seed = Image.new("L", image.size, 0)
    seed_pixels = seed.load()
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            cyan = g > 135 and b > 135 and ((g - r) > 15 or (b - r) > 20)
            magenta = r > 145 and b > 120 and g < 165
            if cyan or magenta:
                seed_pixels[x, y] = 255

    nearby_effect = seed.filter(ImageFilter.MaxFilter(9))
    nearby_pixels = nearby_effect.load()
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            cyan = g > 135 and b > 135 and ((g - r) > 15 or (b - r) > 20)
            magenta = r > 145 and b > 120 and g < 165
            white_core = r > 215 and g > 215 and b > 215 and nearby_pixels[x, y] > 0
            if cyan:
                intensity = max(g, b) / 255.0
                pixels[x, y] = (int(68 + 28 * intensity), int(28 + 18 * intensity), int(128 + 62 * intensity), a)
            elif magenta:
                intensity = max(r, b) / 255.0
                pixels[x, y] = (int(118 + 42 * intensity), int(34 + 18 * intensity), int(170 + 58 * intensity), a)
            elif white_core:
                pixels[x, y] = (154, 92, 230, a)
    return image


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: build_hale_nightmares_end_gif.py <bundle-dir> <output-gif>")

    bundle = Path(sys.argv[1])
    output = Path(sys.argv[2])
    root = bundle / "Equipped_four-star_c" / "animations"

    pursuit = root / "Hale_4-Star_Nightmares_End_Dark_Pursuit_Southwest" / "south-west"
    execution = root / "Hale_4-Star_Nightmares_End_Execution_Rush_Southwes" / "south-west"
    finisher_candidates = sorted(root.glob("Hale_4-Star_Nightmares_End_Final_Rupture_Southwest-*"))
    if not finisher_candidates:
        raise RuntimeError("Impact-hold finisher directory was not found")
    finisher = finisher_candidates[-1] / "south-west"

    segments = [
        (pursuit, 0, [85, 50, 42, 38, 38, 38, 45, 50, 55], False),
        (execution, 1, [45, 48, 52, 65, 55, 68, 72, 85], False),
        (finisher, 1, [42, 42, 45, 55, 80, 150, 175, 280], True),
    ]

    preview_frames = []
    durations = []
    transparent_frames = []
    backdrop = (8, 6, 17, 255)

    for directory, first_frame, frame_durations, recolor in segments:
        paths = sorted(directory.glob("frame_*.png"))[first_frame:]
        if len(paths) != len(frame_durations):
            raise RuntimeError(f"Duration mismatch for {directory}")
        for path, duration in zip(paths, frame_durations):
            sprite = Image.open(path).convert("RGBA")
            if recolor:
                sprite = recolor_dark_vfx(sprite)
            transparent_frames.append(sprite)
            canvas = Image.new("RGBA", sprite.size, backdrop)
            canvas.alpha_composite(sprite)
            preview_frames.append(canvas.convert("RGB"))
            durations.append(duration)

    output.parent.mkdir(parents=True, exist_ok=True)
    preview_frames[0].save(
        output,
        save_all=True,
        append_images=preview_frames[1:],
        duration=durations,
        loop=0,
        optimize=False,
        disposal=2,
    )

    doubled = output.with_name(output.stem + "_2x.gif")
    enlarged = [frame.resize((512, 512), Image.Resampling.NEAREST) for frame in preview_frames]
    enlarged[0].save(
        doubled,
        save_all=True,
        append_images=enlarged[1:],
        duration=durations,
        loop=0,
        optimize=False,
        disposal=2,
    )

    frame_dir = output.with_name(output.stem + "_frames")
    if frame_dir.exists():
        shutil.rmtree(frame_dir)
    frame_dir.mkdir(parents=True)
    for index, frame in enumerate(transparent_frames):
        frame.save(frame_dir / f"frame_{index:03d}.png")

    print(f"wrote {output} ({len(preview_frames)} frames)")
    print(f"wrote {doubled} (2x preview)")
    print(f"wrote {frame_dir} (transparent processed frames)")


if __name__ == "__main__":
    main()
