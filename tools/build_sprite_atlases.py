#!/usr/bin/env python3
"""Build deterministic atlas-v2 packs from declared frame folders."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

def natural(path):
    import re
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r'(\d+)', path.name)]

def rgba_hash(image):
    return hashlib.sha256(image.convert('RGBA').tobytes()).hexdigest()

def frame_paths(path):
    files = sorted(Path(path).glob('frame_*.png'), key=natural)
    return files or sorted(Path(path).glob('frame-*.png'), key=natural)

def trim(image, gutter):
    alpha = image.getchannel('A')
    box = alpha.getbbox()
    if not box:
        raise ValueError('empty alpha frame')
    cropped = image.crop(box)
    w, h = cropped.size
    packed = Image.new('RGBA', (w + gutter * 2, h + gutter * 2))
    packed.paste(cropped, (gutter, gutter))
    # Extrude edges so bilinear sampling cannot bleed transparent pixels.
    for x in range(w):
        packed.putpixel((x + gutter, 0), cropped.getpixel((x, 0)))
        packed.putpixel((x + gutter, h + gutter), cropped.getpixel((x, h - 1)))
    for y in range(h):
        packed.putpixel((0, y + gutter), cropped.getpixel((0, y)))
        packed.putpixel((w + gutter, y + gutter), cropped.getpixel((w - 1, y)))
    packed.putpixel((0, 0), cropped.getpixel((0, 0)))
    packed.putpixel((w + gutter, 0), cropped.getpixel((w - 1, 0)))
    packed.putpixel((0, h + gutter), cropped.getpixel((0, h - 1)))
    packed.putpixel((w + gutter, h + gutter), cropped.getpixel((w - 1, h - 1)))
    return packed, box

def pack(items, max_size, gutter):
    pages, page = [], Image.new('RGBA', (max_size, max_size))
    x = y = row_h = 0
    placements = {}
    for key, image in items:
        w, h = image.size
        if w > max_size or h > max_size:
            raise ValueError(f'{key} exceeds {max_size}px page size')
        if x + w > max_size:
            x, y, row_h = 0, y + row_h, 0
        if y + h > max_size:
            pages.append(page); page = Image.new('RGBA', (max_size, max_size)); x = y = row_h = 0
        page.paste(image, (x, y)); placements[key] = (len(pages), x, y, w, h)
        x += w; row_h = max(row_h, h)
    pages.append(page)
    return pages, placements

def build(source, output, manifest_path, max_size, gutter):
    spec = json.loads(Path(source).read_text(encoding='utf-8'))
    key = spec['key']; animations = spec['animations']; unique = {}; occurrences = {}
    for name, cfg in animations.items():
        if 'aliasOf' in cfg:
            occurrences[name] = {'aliasOf': cfg['aliasOf']}; continue
        paths = cfg.get('paths') or [cfg['path']]
        frames = []
        for path in paths:
            found = frame_paths(path)
            if not found: raise FileNotFoundError(f'no frames for {key}.{name}: {path}')
            for file in found:
                with Image.open(file) as opened:
                    image = opened.convert('RGBA')
                packed, box = trim(image, gutter); digest = rgba_hash(image)
                if digest not in unique: unique[digest] = {'image': packed, 'box': box}
                frames.append((digest, box))
        timeline = []
        for digest, box in frames:
            timeline.append({'texture': digest, 'durationMs': round(1000 / float(cfg.get('playbackFps', cfg.get('sourceFps', 8))))})
        occurrences[name] = {'timeline': timeline, 'loop': bool(cfg.get('loop', False)), 'sourceFps': cfg.get('sourceFps', 8), 'playbackFps': cfg.get('playbackFps', cfg.get('sourceFps', 8))}
    items = sorted(((digest, data['image']) for digest, data in unique.items()), key=lambda item: item[0])
    pages, placements = pack(items, max_size, gutter)
    output = Path(output); output.mkdir(parents=True, exist_ok=True)
    page_records = []
    for index, page in enumerate(pages):
        data = __import__('io').BytesIO(); page.save(data, format='PNG', optimize=False, compress_level=9)
        digest = hashlib.sha256(data.getvalue()).hexdigest()[:8]
        filename = f'{key}-core-{digest}.png'; (output / filename).write_bytes(data.getvalue())
        page_records.append({'id': f'{key}-core-{index}', 'file': filename, 'width': max_size, 'height': max_size, 'sha256': hashlib.sha256(data.getvalue()).hexdigest()})
    frames = {}
    for digest, data in unique.items():
        page_index, x, y, w, h = placements[digest]; box = data['box']
        frames[digest] = {'page': page_records[page_index]['id'], 'source': {'x': x, 'y': y, 'w': w, 'h': h}, 'pivot': {'x': gutter + (spec['anchor']['x'] - box[0]), 'y': gutter + (spec['anchor']['y'] - box[1])}, 'hash': digest}
    manifest = {'format': 'atlas-v2', 'key': key, 'sourceCanvas': spec['sourceCanvas'], 'anchor': spec['anchor'], 'renderScale': spec.get('renderScale', 1), 'gutter': gutter, 'pages': page_records, 'frames': frames, 'animations': {}}
    for name, value in occurrences.items():
        if 'aliasOf' in value: manifest['animations'][name] = value; continue
        manifest['animations'][name] = {'timeline': [{'frame': frames[item['texture']], 'durationMs': item['durationMs']} for item in value['timeline']], 'loop': value['loop'], 'sourceFps': value['sourceFps'], 'playbackFps': value['playbackFps']}
    Path(manifest_path).parent.mkdir(parents=True, exist_ok=True); Path(manifest_path).write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    registry = {'format': 'atlas-v2-registry', 'packs': sorted([p.name for p in output.glob('*.json') if p.name != 'registry.json'] + [Path(manifest_path).name])}
    (output / 'registry.json').write_text(json.dumps(registry, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return manifest

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--source', required=True); parser.add_argument('--output', required=True); parser.add_argument('--manifest', required=True); parser.add_argument('--max-page-size', type=int, default=2048); parser.add_argument('--gutter', type=int, default=2)
    args = parser.parse_args(); manifest = build(args.source, args.output, args.manifest, args.max_page_size, args.gutter); print(json.dumps({'ok': True, 'key': manifest['key'], 'pages': len(manifest['pages']), 'frames': len(manifest['frames'])}))

if __name__ == '__main__': main()
