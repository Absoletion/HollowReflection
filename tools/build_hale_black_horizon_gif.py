from pathlib import Path
import shutil
import sys

from PIL import Image


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: build_hale_black_horizon_gif.py <bundle-dir> <output-gif>")

    bundle = Path(sys.argv[1])
    output = Path(sys.argv[2])
    animation_root = (
        bundle
        / "Equipped_four-star_c"
        / "animations"
    )

    segments = [
        ("Hale_4-Star_Black_Horizon_Charge_Southwest", 0, [90, 70, 65, 60, 60, 60, 70, 75, 65]),
        ("Hale_4-Star_Black_Horizon_Sweep_Southwest_v2_Seam", 1, [55, 55, 60, 75, 95, 105, 105, 70]),
        ("Hale_4-Star_Black_Horizon_Detonation_Southwest_v2", 1, [55, 65, 40, 45, 75, 105, 120, 260]),
    ]

    frames = []
    durations = []
    backdrop = (8, 6, 17, 255)
    selected_paths = []
    for name, first_frame, segment_durations in segments:
        paths = sorted((animation_root / name / "south-west").glob("frame_*.png"))
        if len(paths) != 9:
            raise RuntimeError(f"Expected 9 frames for {name}, found {len(paths)}")
        paths = paths[first_frame:]
        if len(segment_durations) != len(paths):
            raise RuntimeError(f"Duration mismatch for {name}")
        for path, duration in zip(paths, segment_durations):
            source = Image.open(path).convert("RGBA")
            canvas = Image.new("RGBA", source.size, backdrop)
            canvas.alpha_composite(source)
            frames.append(canvas.convert("RGB"))
            durations.append(duration)
            selected_paths.append(path)

    output.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=False,
        disposal=2,
    )

    doubled = output.with_name(output.stem + "_2x.gif")
    enlarged = [frame.resize((512, 512), Image.Resampling.NEAREST) for frame in frames]
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
    for index, source_path in enumerate(selected_paths):
        shutil.copy2(source_path, frame_dir / f"frame_{index:03d}.png")

    print(f"wrote {output} ({len(frames)} frames)")
    print(f"wrote {doubled} (2x preview)")
    print(f"wrote {frame_dir} (transparent source frames)")


if __name__ == "__main__":
    main()
