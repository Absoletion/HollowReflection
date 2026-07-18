# Hale 4★ Painted Battle Rig v0.11.1

## Runtime structure

The standalone build embeds `dev/rigparts/*.webp` as the `RIGPARTS` asset map. `mui3-stage.js` loads all required awakened-Hale parts asynchronously. Rendering switches to the painted rig only after every required texture reports complete; otherwise the existing pixel sprite remains active.

Every new battle receives the persistent `META.haleAwakened` state. Completed Chapter Six saves also repair a missing legacy awakening flag during normalization. This ensures replays and later battles begin with Hale's 4★ model and true kit instead of silently recreating his original form.

Required parts:

- Head
- Torso
- Pelvis/waist armor
- Left and right arms
- Left and right hands
- Left and right legs
- Center, left, and right cape panels
- Canonical sword

The separate front/rear hair extractions are preserved for later deformation work but the current head component already contains the complete hair silhouette.

## Draw order

1. Cape side and center panels
2. Legs
3. Pelvis
4. Torso
5. Arms
6. Head
7. Sword
8. Hands over the grip/joints
9. Existing live blade-orbit effects

## Animation states

- **Idle:** independent cape sway, planted-leg counter motion, torso breathing, arm drift, and head movement.
- **Skill/attack:** torso commitment, shoulder rotation, broad sword arc, hand follow-through, and delayed cape movement.
- **Art/Burst cast:** casting arm rises while the torso/head anticipate the effect; the dedicated cut-in remains a separate overlay.
- **Hit:** whole-stage jitter plus rig-specific head/torso recoil and flash.
- **Defeat:** the complete skeleton rotates and lowers from its feet anchor with reduced opacity.

Animation clocks are initialized only when a state begins, preventing attack and cast timelines from resetting on every rendered frame.

## Replacement and refinement

Each component has a stable key such as `hale_awakened_head` or `hale_awakened_sword`. A corrected painted part can replace its WebP without changing combat logic. Future refinement priorities are hidden joint overlaps, elbow/shoulder caps, a purpose-painted weapon hand, separate hair deformation, and additional cape folds.
