from pathlib import Path
from PIL import Image
import sys

folder = Path(sys.argv[1])
out = Path(sys.argv[2])
frames = []
for path in sorted(folder.glob('*.png'), key=lambda p: int(p.stem)):
    frames.append(Image.open(path).convert('RGBA'))
if not frames:
    raise SystemExit('No frames found')
frames[0].save(out, save_all=True, append_images=frames[1:], duration=140, loop=0, disposal=2)
print(out)
