import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "splash-art"
OUTPUT = ROOT / "assets" / "splash-art-runtime"


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    inputs = sorted(SOURCE.glob("*_splash_main.png"))
    if not inputs:
        raise RuntimeError(f"No splash masters found in {SOURCE}")

    source_bytes = 0
    runtime_bytes = 0
    for input_path in inputs:
        output_path = OUTPUT / f"{input_path.stem}.webp"
        source_bytes += input_path.stat().st_size
        with Image.open(input_path) as image:
            image = image.convert("RGB")
            image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            image.save(output_path, "WEBP", quality=88, method=6)
        runtime_bytes += output_path.stat().st_size

    print(json.dumps({
        "ok": True,
        "assets": len(inputs),
        "sourceBytes": source_bytes,
        "runtimeBytes": runtime_bytes,
        "reductionPercent": round((1 - runtime_bytes / source_bytes) * 100, 1),
        "output": str(OUTPUT),
    }, indent=2))


if __name__ == "__main__":
    main()
