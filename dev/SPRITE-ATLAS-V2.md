# Sprite Atlas v2

The current migration keeps `frame-image-v1` as the compatibility format and adds `atlas-v2` as a source-rectangle format. Both are consumed through `SpriteRuntime`; Stage and Unit Library do not inspect storage details.

## Contract

- Source canvas: 256×256, shared feet anchor `{x:128,y:238}`.
- Frames are RGBA, alpha-trimmed, unrotated, and packed with a 2px extruded gutter.
- Pivots preserve the original canvas anchor after trimming.
- Pages are deterministic PNGs, content-hashed, and at most 2048×2048.
- Timelines retain every occurrence and store `durationMs`; aliases resolve by name.
- `frame-image-v1` remains the fallback while each atlas pack is verified.

## Commands

```text
HOLLOW_PYTHON tools/build_sprite_atlases.py --source assets/sprite-atlas-sources/tobin.json --output assets/sprite-atlas-runtime --manifest assets/sprite-atlas-runtime/tobin.json --max-page-size 2048 --gutter 2
pnpm validate:atlases
```

`SpriteRuntime.ensureBattleReady()` loads required pages before Stage starts. Failed pages return structured `loading`/`error` status and Stage uses the existing fallback token, so combat remains playable.

The Tobin pack is the pilot. No combat timing, damage timing, effects, enemy formats, or art files are changed by the migration.
