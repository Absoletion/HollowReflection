from pathlib import Path
from PIL import Image, ImageDraw
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("frames")
parser.add_argument("output")
parser.add_argument("--duration", type=int, default=110)
args = parser.parse_args()

source = Path(args.frames)
output = Path(args.output)
files = sorted(source.glob("frame-*.png"))
if not files:
    files = sorted(source.glob("frame_*.png"))
if not files:
    raise SystemExit(f"No PNG frames found in {source}")

frames = [Image.open(file).convert("RGBA") for file in files]
backgrounds = []
for frame in frames:
    background = Image.new("RGBA", frame.size, (20, 25, 35, 255))
    background.alpha_composite(frame)
    backgrounds.append(background.convert("P", palette=Image.Palette.ADAPTIVE, colors=255))

output.parent.mkdir(parents=True, exist_ok=True)
backgrounds[0].save(
    output,
    save_all=True,
    append_images=backgrounds[1:],
    duration=args.duration,
    loop=0,
    disposal=2,
)

cell_w, cell_h = frames[0].size
strip = Image.new("RGBA", (cell_w * len(frames), cell_h + 24), (20, 25, 35, 255))
draw = ImageDraw.Draw(strip)
for index, frame in enumerate(frames):
    strip.alpha_composite(frame, (index * cell_w, 0))
    draw.text((index * cell_w + 6, cell_h + 5), str(index), fill=(235, 240, 250, 255))
strip.save(output.with_suffix(".png"))

print(f"Built {output.name} and {output.with_suffix('.png').name} from {len(frames)} frames")
