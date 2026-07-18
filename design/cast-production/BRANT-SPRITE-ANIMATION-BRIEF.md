# Brant, the Anchor — Canonical Sprite and Animation Brief

Status: production-ready brief; no image generation authorized by this document.

## Canonical read

Brant is a 4-star Water Breaker, Marlowe's former first mate, and the physical reason both men survived. He speaks rarely, notices practical details, and expresses loyalty through action. His animation language is planted weight: he does not pose for attention, he makes space safe by occupying it. Every movement should imply that the anchor, chain, enemy, and ground all have real mass.

Identity hierarchy:

1. Barrel-chested older sailor with gray mutton chops and a steady, unsmiling face.
2. Broad first-mate silhouette, thick forearms, sea-weathered coat/vest, reinforced boots, and rope-work motifs.
3. Full-size iron ship anchor on six feet of heavy chain.
4. Deep ocean blue, weathered iron, rope brown, muted sea green, and restrained foam-white highlights.
5. Low center of gravity and a constant protective relationship to the party/Marlowe.

## Personality evidence

- `hollowing-roster.md`: barrel-chested first mate, anchor on six feet of chain, eleven words a chapter, stayed out of loyalty; Deadweight guarantees meaningful break.
- `design/CHAPTER-2-OUTLINE.md` Mission 2-4: silent and immovable, fights back-to-back with Marlowe, keeps him alive through mass; “Anchor held.”
- `design/CHAPTER-3-OUTLINE.md`: becomes progressively quieter as fear grows; he is the first to notice the wheat does not move in the wind.
- `design/CHAPTER-4-OUTLINE.md`: comedy is gone; he identifies a full-force greataxe cut, carries Wren during the retreat, and remains the party's physical support.
- `dev/engine-dev.js`: Anchor Drop and Keelhaul are the complete implemented kit; there is intentionally no Arts ability.

Performance rule: Brant is simple, not stupid; quiet, not vacant; heavy, not slow-minded. His eyes should keep evaluating the battlefield even when the body barely moves.

## Scale and anatomy lock

- Canvas: 256×256 transparent pixels.
- Proportion style: `compact-anime`, sharing the same facial/pixel-detail scale as refreshed Cinnia, Katie, and Hale.
- Height band: tall-heavy adult, 196–202px; production target 199px from highest hair/headwear pixel to boot soles.
- Anchor: x=128; feet baseline y=238.
- Heavy armor/body mass increases width, never head-to-body realism. Preserve an expressive anime head near 23–25% of the figure.
- Target shoulder width is deliberately broad, but hands remain readable rather than grotesquely oversized.
- Anchor and chain may exceed the body silhouette and use separate VFX/action canvases. Never shrink Brant to make the anchor fit.

## Front-facing weaponless 256×256 reference prompt

> Full-body front-facing weaponless anime pixel character reference for Brant from Hollow Reflections, exact 256 by 256 transparent canvas. Compact mobile action-RPG anime proportions matching the supplied refreshed Cinnia reference: expressive mature anime head approximately one quarter of the figure, shortened powerful torso, broad but stylized shoulders, sturdy legs, readable hands and boots, not realistic and not chibi. Tall barrel-chested older male former pirate first mate, gray mutton chops, short weathered hair, calm observant eyes, practical dark-ocean first-mate coat over reinforced vest, rolled or armored sleeves, rope-knot details, broad belt, weathered trousers, iron-capped sea boots, muted navy, sea green, rope brown, and iron palette. Straight-on orthographic view, shoulders and hips perfectly level, both empty arms fully separated from torso, open empty hands visible, feet parallel on one shared baseline. No anchor, chain, rope coil across torso, weapon, prop, water effect, pose rotation, three-quarter view, camera perspective, background, shadow, text, logo, frame, blur, antialiasing, or watermark. Crisp intentional opaque pixel clusters and transparent background. Visible body target 199 pixels, centered x 128, boots on y 238. Preserve compact anime head size; body width communicates mass without realistic tiny-head anatomy.

## Equipped battle state

- Direction: Southwest/player three-quarter view, facing screen-left.
- Add one canonical full-size dark iron ship anchor attached to exactly six feet of thick chain. Lock anchor head shape, fluke angle, stock, shaft width, link size, and chain attachment before animation.
- Brant holds the chain with both hands in a braced low stance; the anchor rests forward-left or hangs just clear of the ground. Chain has a believable catenary curve and never passes through his body.
- Feet are wider than shoulder width, knees bent, torso between party and enemy. His readiness is tension, not fidgeting.
- Use a 256×256 character canvas plus independent chain/anchor smear and impact layers where needed. Do not crop equipment or reduce body scale.

## Animation acting and timing

### Idle — 8–10 frames, 7–8fps, loop

Almost motionless but never dead: chest breath, grip tightening, one chain link settling, eyes scanning past the enemy toward Marlowe/the party. Weight shifts vertically by at most 1px. Both boots remain fixed. Anchor may settle once, never bob like foam.

### Combat movement — 8–10 frames, 9–11fps, loop

Purposeful advancing haul toward screen-left. Brant steps under the anchor's weight while pulling the chain close to his center; the anchor glides/hops with delayed secondary motion. Each step lands heavily and cleanly. No limp, repeated-leg stutter, floating anchor, treadmill slide, or camera bounce.

### Skill — Anchor Drop — 14–20 frames, 16–19fps, one hit

The single biggest per-hit break action must have a clear three-part weight story:

1. Brant sinks low and draws chain hand-over-hand, loading the anchor behind/above him.
2. Hips and shoulders drive one explosive overhead arc; arms do not swing independently of the torso.
3. Anchor lands flukes-first with one brutal stop. The ground buckles before water erupts outward.

The hit event occurs on the first fully planted impact frame. Hold that frame slightly longer in metadata, then recover by wrenching the anchor free. Brant does not jump, spin repeatedly, or shout theatrically. The force comes from leverage and certainty.

### Arts — intentionally absent

Brant has no canonical Arts in roster or engine data. The unit tester must hide or disable the Arts option rather than reusing Skill/Burst or inventing a move. If the combat system later requires a third special, design approval is required before generation.

### Burst — Keelhaul — 26–36 frames across authored phases, 20–23fps, one massive damage/break hit

Recommended phase contract:

- `keelhaul_cast`: Brant pivots, pays out chain, and hurls the anchor past/through the enemy with a low horizontal release.
- `keelhaul_drag`: boots dig trenches, chain snaps taut, then Brant hauls with his full back/hips and drags the anchor through the target from behind. This is the damage/break event.
- `keelhaul_recover`: anchor tears free in spray and fragments; Brant arrests its return without being pulled off balance.

The target is visually caught between anchor and Brant. Chain tension must be readable before the drag. A deep-water wake and steel sparks stretch across the lane; effect size has no hard maximum. Never teleport the anchor, reverse the chain attachment, or treat the chain like a glowing ribbon.

### Hit — 4–6 frames, 13–15fps

Shoulder takes the blow, torso compresses, one boot grinds backward by at most 2px. Brant never drops the chain from an ordinary hit.

### Flinch/Stagger — 6–9 frames, 11–13fps

First real disruption: anchor bites the ground as an emergency brace, knees fold, chain jerks taut, then he recovers his wall-like stance. He may look toward the party before himself.

### Victory — 8–12 frames, 9–11fps, hold last

Set anchor down with a final iron thud, rest both hands on the chain/shaft, check that everyone is standing, then give one small approving nod. No boast, flex, roaring laugh, or repeated celebration. Hold the final planted pose.

### Defeat — 10–14 frames, 9–11fps, hold/despawn

Use the anchor to resist falling, sink to one knee, then sit weight back against it while still forming a physical barrier. Chain remains in hand. Hold the final frame until runtime despawn; no loop, bounce, shrink, or mid-animation disappearance.

## VFX and audio direction

- Water is deep mass and displaced volume: dark blue pressure rings, low foam, heavy spray, and brief white cores at impact—not elegant ribbons or magical tidal casting.
- Steel sparks and fractured ground are separate from Water VFX. Chain remains opaque physical metal.
- Anchor Drop audio: chain haul, low swing rush, iron/stone concussion, short bass pressure wave.
- Keelhaul audio: links paying out in rhythm, sharp tension snap, sustained grinding drag, final sub-bass break crack.
- Keep effects readable around a very wide silhouette. No Hollowglass cyan shards, purple Dark aura, lightning, or fire.

## Non-negotiable generation prohibitions

- No camera movement, crop change, sprite zoom, body rescale, head-size change, or baseline change.
- No root drift, foot sliding, idle translation, disappearing frames, duplicated limbs, adjacent-cell bleed, or chroma fringe.
- No anchor or chain morphing, shrinking, changing fluke count, changing link scale, detaching without an authored throw, passing through Brant, or swapping hands arbitrarily.
- No realistic tiny-head strongman anatomy, giant hands, chibi dwarf proportions, inflated muscles, or style drift.
- No floaty hammer swing, wrestler leap, spinning anime tornado, magical staff casting, comedy pratfall, or talkative victory acting.
- Character, chain/anchor smear, ground impact, and water VFX must remain separable. Large effects must not force the unit smaller.

## Acceptance gate

At 1× scale, silhouette alone must read “massive sailor with anchor,” while the face remains in the same anime scale family as Cinnia. Skill must communicate one incomparable downward break hit. Burst must clearly show throw → chain tension → drag-through. Every ordinary frame preserves the 199px body, y=238 baseline, stable anchor construction, and Brant's quiet protective intent.
