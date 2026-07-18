# Signature Weapon Repair Pass — v0.38

Completed repairs:

- Hale 4-star: Skill, Arts, and Burst now render on the 256×160 weapon-safe canvas. The greatsword point and cape tails remain inside the render area in every audited frame.
- Cinnia 4-star: Attack and Burst use the expanded canvas, preserving the pan head, shaft, and staff butt. The pan remains a casting focus rather than changing into another prop.
- Katie 4-star: Skill, Arts, and Burst retain the same radiography hammer: scan chamber, cat display, shaft, counterweight, and hanging tools. The large rectangular image in Arts is classified as projected scan VFX and is not substituted weapon geometry.
- All non-idle sequences received capped temporal registration corrections of no more than two source pixels per frame. This removes isolated horizontal shake without cancelling lunges, recoil, knockback, or pose changes.
- Katie Arts and Burst preview at 6 FPS by default.

Acceptance checks:

1. No weapon, cape, strap, or hanging tool reaches the 256×160 canvas boundary.
2. Feet anchor remains `(128,148)` for Hale, Cinnia, and Katie.
3. Nearest-neighbor rendering remains enabled; no blur or frame interpolation is introduced.
4. Registration corrections are finite, frame-matched, and limited to ±2 pixels outside the separately stabilized idle loops.
