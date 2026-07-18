from pathlib import Path
from urllib.request import urlopen
import sys

base = sys.argv[1].rstrip('/')
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for i in range(9):
    data = urlopen(f'{base}/{i}.png').read()
    (out / f'{i}.png').write_bytes(data)
    print(i, len(data))
