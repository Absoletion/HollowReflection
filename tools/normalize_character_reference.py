from pathlib import Path
import argparse
from PIL import Image


parser = argparse.ArgumentParser()
parser.add_argument("input")
parser.add_argument("output")
parser.add_argument("--height", type=int, required=True)
parser.add_argument("--feet-y", type=int, default=238)
parser.add_argument("--center-x", type=int, default=128)
parser.add_argument("--canvas", type=int, default=256)
parser.add_argument("--colors", type=int, default=128)
args = parser.parse_args()

source = Image.open(args.input).convert("RGBA")
alpha = source.getchannel("A")
bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
if not bbox:
    raise SystemExit("Input contains no visible pixels.")

subject = source.crop(bbox)
scale = args.height / subject.height
width = max(1, round(subject.width * scale))
subject = subject.resize((width, args.height), Image.Resampling.NEAREST)

if args.colors:
    alpha = subject.getchannel("A")
    rgb = subject.convert("RGB").quantize(
        colors=args.colors,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    subject = rgb.convert("RGBA")
    subject.putalpha(alpha)

canvas = Image.new("RGBA", (args.canvas, args.canvas))
x = args.center_x - width // 2
y = args.feet_y - args.height + 1
canvas.alpha_composite(subject, (x, y))

output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
canvas.save(output)

print(
    f"Wrote {output} | source bbox={bbox} | normalized={width}x{args.height} "
    f"| feet y={args.feet_y} | center x={args.center_x}"
)
