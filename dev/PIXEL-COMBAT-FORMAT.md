# Pixel Combat Format v1

The production art rules are defined in `design/HOLLOW-REFLECTION-STRICT-PIXEL-SPRITE-GUIDELINE.md`. When this technical format and the art guideline differ, the strict art guideline controls visual proportions and quality.

This format replaces painted battle standees with frame-animated pixel units while retaining high-detail art for dialogue, unit screens, the Library, summons, and Arts/Burst cut-ins.

The supplied Grand Summoners reference uses tightly packed, variable-sized source regions rather than one universal frame rectangle. Its ordinary figures read at roughly 80–100 pixels tall, while attacks and effects occupy substantially larger bounds. Hollowing keeps those visual proportions but uses predictable canvases and metadata.

## Direction

- Player units are authored facing screen-left.
- Enemies are authored facing screen-right.
- A generic or symmetrical sprite may be mirrored by the renderer.
- Asymmetric characters and important enemies require separately authored directions. Hale's scar, armor asymmetry, cape markings, and weapon construction must never be reversed merely to change sides.

## Canvas classes

| Class | Canvas | Typical visible figure | Anchor | Use |
| --- | ---: | ---: | --- | --- |
| Unit | 256×160 px | 80–100 px tall | feet at (128, 148) | Weapon-safe character animations |
| Legacy unit | 128×128 or 192×128 px | same body scale | legacy feet anchor | Migration fallback only |
| Effect-default | 256×192 px | variable | origin at (128, 144) | Common Skills and reusable effects |
| Cut-in | 1536×1024 source | high detail | UI-defined | Arts/Burst illustration |

The 256×160 production canvas includes transparent safety room for greatswords, pan-staves, hammers, lunges, and broad smears. Frames use transparent backgrounds, integer pixel placement, nearest-neighbor rendering, and no baked drop shadow. Ground shadows belong to the stage renderer.

The effect-default canvas is a convenience, not a limit. Arts and Bursts may use oversized atlases, multiple synchronized effect layers, tiled sequences, full-stage world-space effects, or camera-space overlays. Effect metadata records each asset's own dimensions and origin; the renderer must not clip effects to the unit or default-effect canvas.

## Pixel language

- Native pixel art, not a downscaled painting.
- One-pixel dark outer contour at native resolution where the silhouette needs separation.
- Three to five value steps per major material.
- Selective highlights rather than smooth gradients.
- Exaggerated hair, weapon, cape, and effect arcs for readability.
- Preserve the unit's recognizable palette and silhouette at 1× scale.

## Required animation set

| Animation | Suggested frames | Playback |
| --- | ---: | ---: |
| `idle` | 6–8 | 6 fps, loop |
| `move` | 6–8 | 8 fps, loop |
| `skill` | 10–16 | 12 fps maximum |
| `arts` | 16–28 | 12 fps maximum |
| `burst` | 20–40 | 12 fps maximum |
| `hit` | 3–5 | 10 fps maximum |
| `stagger` | 5–8 | 10 fps maximum |
| `victory` | 8–16 | 8 fps maximum |
| `defeat` | 8–14 | 8 fps maximum, hold last frame |

Not every move needs unique body frames. Effects, stage movement, hit-stop, camera shake, and additive flashes are independent layers.

## Unit package

```text
sprites2/<unit-key>/
  unit.json
  body/
    idle.webp
    move.webp
    skill.webp
    arts.webp
    burst.webp
    hit.webp
    stagger.webp
    victory.webp
    defeat.webp
  effects/
    skill.webp
    arts.webp
    burst.webp
```

The current JavaScript pixel arrays remain supported during migration. New units should use animation metadata with per-animation FPS, looping, frame dimensions, anchor, and timed events. Runtime playback enforces the table's caps even when older authored metadata requests a higher rate; action windows expand to show every frame rather than truncating the sequence.

## Event contract

Damage and effects occur on authored frames, not immediately when the combat button is pressed.

```json
{
  "id": "skill",
  "fps": 18,
  "loop": false,
  "events": [
    { "frame": 2, "type": "sfx", "id": "weapon_whoosh" },
    { "frame": 6, "type": "effect", "id": "cinnia_skill_fire" },
    { "frame": 7, "type": "hit", "target": "primary" }
  ]
}
```

## First reference unit

Cinnia 4-star is the first complete package. Her canonical combat sprite faces left. Her frying-pan staff may use the 192×128 unit-wide class, while fire, impact rings, and Arts/Burst flames use independent 256×192 effect atlases.

Cinnia is fundamentally a magic character. The frying pan is a staff and casting focus, not her normal melee weapon. Her reference Skill uses a playful cooking flip to launch a fireball from the pan bowl; character motion, projectile travel, impact VFX, and damage timing remain separate synchronized layers.
