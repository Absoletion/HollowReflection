# Hollow Reflection — Strict Pixel Sprite Guideline

Version 1.0. This document governs all player-unit and enemy combat sprites. Cinnia 4-star is the primary style authority. Corrected Katie 4-star and Hale, Adventurer are secondary references. High-detail portraits and concept art are identity references only; they are never to be downscaled directly.

## 1. Non-negotiable visual target

- Native hand-authored pixel art with hard-edged clusters.
- Compact mobile action-RPG anatomy, not realistic anatomy and not super-deformed chibi.
- Head height: 23–27% of the visible standing figure.
- Total visible standing height: 88–100 pixels, measured from highest hair pixel to the shared foot baseline.
- Broad, readable silhouette. Character identity must remain recognizable at 1x scale.
- Shortened torso and limbs; enlarged head, hair mass, hands, footwear, and signature equipment.
- One-pixel outer contour at native resolution where separation is required.
- No smooth digital-paint gradients, vector edges, subpixel placement, blur, or resampled line art.

## 2. Direction and staging

- **Mandatory production direction:** every newly generated player-unit combat sprite, equipped state, and animation uses PixelLab **Southwest**, reading toward screen-left in a three-quarter view.
- The front-facing weaponless 256x256 master remains the identity input only; it is not a combat-facing frame.
- South, front, and other rotations may be generated or inspected only for diagnostic comparison. They are never substituted for Southwest in a production combat package.
- If Southwest fails anatomy, scale, silhouette, equipment, or clipping review, regenerate or repair Southwest rather than selecting another direction.
- Existing completed non-Southwest libraries are legacy assets and remain unchanged until that character is intentionally regenerated.
- Enemies face screen-right in a three-quarter view.
- Feet use a common baseline at y=116.
- Production character canvas: 256x160, anchor (128,148).
- Legacy 128x128 and 192x128 sheets are migration sources only; new or repaired frames use 256x160.
- Canvas migration must not change body scale. Added area is transparent weapon/cape safety space.
- Keep at least 24 transparent pixels between ordinary visible art and each horizontal canvas edge. Smears may enter this margin, but signature weapons must never terminate at the frame boundary.
- Asymmetric characters require authored facing. Never mirror scars, emblems, weapon construction, armor asymmetry, or readable symbols.

## 3. Anatomy lock

Use these ranges for a neutral standing pose:

| Measurement | Target |
| --- | ---: |
| Visible figure height | 88–100 px |
| Head plus hair | 22–27 px |
| Shoulder width | 22–34 px |
| Eye line | 7–10 px below top of face mass |
| Hand mass | 3–5 px |
| Foot length | 7–11 px |
| Foot baseline | y=116 |

Heavy armor increases width, not height. Large characters may exceed shoulder width, but their facial and pixel-detail scale must remain consistent with Cinnia.

## 4. Pixel construction

- Work at final native resolution or at an exact integer multiple, then reduce with nearest-neighbor only.
- Pixel clusters must be intentional. Avoid isolated single pixels except sparks, eyes, and deliberate material glints.
- Curves use stepped clusters with consistent rhythm; avoid noisy stair-stepping.
- Outer contours use the darkest local material color rather than universal pure black everywhere.
- Interior lines are lighter and less continuous than the silhouette contour.
- No semitransparent pixels in body art. Alpha is either 0 or 255.
- Semitransparency is permitted only in separate VFX layers.
- No baked ground shadow, glow halo, environment lighting, text, watermark, border, or frame divider.

## 5. Palette and materials

- Recommended unit palette: 32–56 opaque colors. Hard maximum: 63 runtime symbols.
- Each major material uses 3–5 value steps: shadow, local color, light, and optional specular accent.
- Skin uses 3–4 steps plus optional cheek or injury accent.
- Hair uses grouped highlight shapes, never strand-by-strand noise.
- Metal uses sharp value jumps and small high-value glints.
- Cloth uses broader value ramps and fewer specular pixels.
- Leather uses warm midtones with restrained highlights.
- Magic uses one saturated core color, a pale hot center, and a dark complementary boundary when appropriate.
- Preserve the concept palette hierarchy, but simplify minor color variations.

## 6. Identity hierarchy

When detail must be removed, preserve features in this order:

1. Overall silhouette and posture.
2. Hair shape and face markers.
3. Signature weapon or casting focus.
4. Dominant costume color blocks.
5. Major armor asymmetry, cape, hat, ears, tail, or other defining mass.
6. One or two emblematic motifs.
7. Small jewelry, fasteners, writing, and surface decoration.

Never solve crowding by making the whole sprite smaller. Simplify low-priority details first.

## 7. Weapon and prop lock

- Establish one canonical weapon drawing before producing action animation.
- Blade length, head size, shaft thickness, grip positions, and ornament placement must remain stable.
- Weapons may rotate, foreshorten, or use authored smear frames; they may not morph between ordinary frames.
- Casting implements remain the same physical object during magic animations.
- Detached charms and straps use simplified two- or three-position secondary motion.
- Very large attacks use independent effect canvases and must not force the unit sprite to shrink.

## 8. Animation timing

| Animation | Frames | Default fps | Loop |
| --- | ---: | ---: | --- |
| Idle | 8 | 8 | Yes |
| Move | 8 | 10–12 | Yes |
| Skill | 10–16 | 15–18 | No |
| Arts | 16–28 | 18–22 | No |
| Burst | 24–40 | 20–24 | No |
| Hit | 4 | 14–16 | No |
| Stagger | 6 | 12–14 | No |
| Victory | 8–16 | 10–12 | No; hold last if needed |
| Defeat | 8–14 | 10–12 | No; hold last |

Timing is metadata-driven. Do not duplicate frames merely to slow an animation. Important poses should be held by playback timing or explicit repeated frames only when required by the runtime.

## 9. Eight-frame idle specification

1. Neutral grounded pose.
2. One-pixel torso or shoulder rise.
3. Peak inhale; weapon remains stable.
4. Hair, cape, skirt, or tabard shifts by 1–2 pixels.
5. Character-specific glow or equipment accent brightens.
6. Small scan, ember, pulse, or shimmer crosses the accent.
7. Body and secondary elements settle.
8. Transitional pose leading cleanly into frame 1.

Feet may not slide. The head may move no more than two pixels vertically in a standard idle. Weapon proportions and hand contacts must remain unchanged.

## 10. Effects and combat readability

- Character frames, projectiles, impacts, and full-stage effects are separate synchronized layers.
- Effects have no hard maximum dimensions.
- Small Skills should remain readable without obscuring the caster.
- Arts may cross the combat lane and use camera shake or cut-ins.
- Bursts may use full-stage overlays and oversized atlases.
- Damage is applied on the authored hit event, not when the input is pressed.
- Use cyan Hollowglass only where the character or ability calls for it; do not apply it as a universal style filter.

## 11. AI-generation sheet contract

When generating source sheets, require:

- Exactly 8 equal cells in a strict 4x2 grid for idle.
- Uniform solid #FF00FF background across cells and gutters.
- No white dividers, labels, guides, text, shadows, or watermark.
- Identical camera, body scale, facing, baseline, palette, and equipment construction in every frame.
- Entire body and equipment inside each cell.
- Cinnia's accepted sprite sheet supplied as the primary style/proportion reference.
- Character concept art supplied only as the identity reference.

Generated output is source material, not automatically production-ready. It must pass cleanup, normalization, palette reduction, and visual QA.

## 12. Required QA checklist

A sheet fails if any answer is no:

- Does the player unit use the approved Southwest production direction and read toward screen-left?
- Is visible body height within the approved range?
- Does the head occupy roughly one quarter of the figure?
- Does the unit match Cinnia's pixel density at 1x scale?
- Are feet locked to y=116?
- Is the signature weapon identical across ordinary frames?
- Are armor, scars, emblems, and accessories on the correct side?
- Are all body pixels fully opaque and background pixels fully transparent?
- Is there at least six pixels of ordinary-frame safety padding?
- Are there no watermarks, dividers, stray components, or chroma fringe?
- Does the first frame transition cleanly from the final frame?
- Is the animation readable at 1x without relying on the portrait?

## 13. Current canonical references

- Primary: Cinnia 4-star complete combat package.
- Hale 4-star: **Hale, Adventurer** — compact silver-armored swordsman.
- Hale 5-star: **Hale, UnHollowed** — the former ornate 4-star design, with stronger Dark/Hollow influence.
- Katie 4-star: heavy Dark defender with radiographic hammer; width comes from armor and equipment, not increased height.
