from pathlib import Path
from PIL import Image
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("input")
parser.add_argument("output")
parser.add_argument("--size", type=int, default=256)
parser.add_argument("--padding", type=int, default=12)
parser.add_argument("--colors", type=int, default=0)
parser.add_argument("--target-height", type=int, default=0)
parser.add_argument("--ground-line", type=int, default=0)
args = parser.parse_args()

source = Image.open(args.input).convert("RGBA")
bbox = source.getchannel("A").point(lambda value: 255 if value >= 20 else 0).getbbox()
if not bbox:
    raise SystemExit("Input contains no visible pixels")

art = source.crop(bbox)
available = args.size - args.padding * 2
if args.target_height:
    scale = args.target_height / art.height
    if art.width * scale > available:
        raise SystemExit("Target height would exceed the horizontal safe area")
else:
    scale = min(available / art.width, available / art.height)
dimensions = (max(1, round(art.width * scale)), max(1, round(art.height * scale)))
art = art.resize(dimensions, Image.Resampling.NEAREST)

canvas = Image.new("RGBA", (args.size, args.size), (0, 0, 0, 0))
x = (args.size - dimensions[0]) // 2
ground_line = args.ground_line or (args.size - args.padding)
y = ground_line - dimensions[1]
if y < 0 or ground_line > args.size:
    raise SystemExit("Target height/ground line does not fit the canvas")
canvas.alpha_composite(art, (x, y))

output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
if args.colors:
    # Keep the final PNG in broadly compatible RGBA mode. Some downstream
    # image decoders reject indexed PNGs with palette transparency even though
    # desktop viewers accept them.
    canvas = canvas.quantize(colors=args.colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGBA")
canvas.save(output, optimize=True)
print(f"Prepared {output.name}: {dimensions[0]}x{dimensions[1]} art on {args.size}x{args.size} canvas, feet y={ground_line}")
