# Brigga — Character and Animation Production Brief

**Production status:** Canonical brief approved for reference generation; no production image has been generated yet.  
**Runtime key:** `brigga`  
**Library form:** 3-star base form; no evolution is currently designated.  
**Element / role:** Fire / Breaker  
**Subtitle:** Brigga, the Demolitionist  
**Story recruitment:** Chapter 4, Mission 4-4, “The Geologist.”

## 1. Canonical source ruling

Use the following precedence when sources disagree:

1. `design/CHAPTER-4-OUTLINE.md` and `dev/story-registry.js` for current story continuity.
2. `dev/engine-dev.js` for currently playable kit behavior, costs, rarity, and stats.
3. `hollowing-roster.md` for character identity, visual motifs, and intended kit fantasy.

The roster codex still says Brigga is recruited in Chapter 2 and refers to her fracture lesson as Chapter 5. Those lines predate the revised story. Current canon places her at Greywick in Chapter 4 and unlocks her after Mission 4-4. Do not depict her as an established guild member in her base-form art: she is an independent demolitionist who happens to be moving in the same direction.

## 2. Character thesis

Brigga is a geologist who happens to solve field problems with explosives. She is not a random, manic bomber. Her apparent recklessness comes from understanding structures so quickly that everyone else sees the impact before they see the calculation.

She is blunt, self-contained, practical, dryly funny, and intensely curious. She treats Greywick’s horror as a specimen because analysis is how she remains useful under pressure. Her restraint matters: when faced with the central Hollowglass formation, she refuses to crack it until she knows whether it is the source or the containment. Every pose should carry the same sequence:

**observe → locate the fault → commit completely → inspect the result.**

Her humor is delivered without asking for a laugh. Her combat confidence is professional rather than showy. She is willing to stand inside the blast radius because she has already calculated it.

## 3. Canonical appearance

- Squat adult dwarf woman with a broad, low center of gravity. She must read as a compact adult, never a child or chibi mascot.
- Soot-blacked cheeks and forearms, with a few clean streaks where goggles or fingers have passed.
- Vivid scorched-orange hair arranged in two dense, singed buns. The buns are compact and asymmetrically frayed, not large pigtails.
- Heavy brows, alert eyes, and a resting expression of analytical impatience.
- Fire-resistant work shirt beneath a dark leather demolition apron.
- Apron loops hold capped fuses, chalk, a folding rule, wedges, and small sealed powder charges. These are identity accessories, not loose weapons.
- Reinforced gloves, practical trousers, broad mining boots, and modest iron protection at knees and forearms.
- Palette: soot black, charcoal iron, dark umber leather, furnace orange, dull brass, and small ember-yellow accents.
- Hollowglass cyan is reserved for material she is examining or breaking. It is not part of her clothing palette.

Avoid a pristine fantasy blacksmith look, ornate knight armor, comedy-sized goggles over her eyes, an uncontrolled pyromaniac grin, or proportions that make the head larger than the accepted anime standard.

## 4. Scale and anatomy contract

- Source canvas: **256 × 256 transparent PNG**.
- Front-reference foot anchor: **(128, 238)**.
- Target visible body height: **160 px** from highest hair pixel to shared foot baseline.
- Approved range after rotation generation: **156–164 px**.
- Head height: **24–27%** of visible body height.
- Width comes from her dwarf build, layered workwear, and equipment; do not increase her height to make her feel strong.
- Hands and feet remain large enough to read at battle scale, but preserve the established compact anime anatomy used by Cinnia and Hale.
- The maul and explosive effects may exceed the body-height envelope. Canvas size never defines character height.

Relative scale: Brigga is visibly shorter than Cinnia (192 px standard adult) and Katie (180 px compact adult), while still having adult facial anatomy and heavier shoulders, forearms, hands, thighs, and boots.

## 5. Reference-generation gates

### Gate A — weaponless identity reference

Generate one full-body, perfectly front-facing anime pixel character on a 256 × 256 transparent canvas. Arms must be relaxed and clearly separated from the torso. Both hands must be visible. No maul, rock pick, explosion, ground shadow, text, logo, border, or environmental background. Apron tools may remain secured in their loops.

The reference fails if it has even a slight three-quarter rotation, duplicated limbs, unequal leg length, hidden hands, a childlike face, or non-pixel painted rendering.

### Gate B — PixelLab base and rotations

Create the PixelLab character from the approved weaponless reference. Generate rotations before spending animation tokens. Inspect South and South-West at 1× scale, but **Southwest is the mandatory production battle facing** for Brigga and every character produced from Hearthgar onward. Southwest must preserve all of the following:

- party-facing-left readability;
- both hands and the forward shoulder remain legible;
- face and apron tools do not collapse into the torso;
- body remains inside the 156–164 px approved height range;
- no change to hair buns, apron layout, or anatomy.

If Southwest fails these checks, regenerate or repair the rotations. Do not substitute South as the production direction.

### Gate C — equipped combat state

Add the weapon only as a separate PixelLab state. The base character remains unchanged.

**Powder-keg maul:** a two-handed demolition maul roughly twice Brigga’s body mass in silhouette, with a dark iron keg-shaped head, reinforced bands, a blunt striking face, a compact fuse housing, and a long wrapped haft. It must look engineered and usable, not like a barrel glued to a stick. Preserve one canonical head-to-haft ratio across every frame.

Combat stance: knees bent, feet planted wide, torso slightly forward, maul carried low and ready to rise into a fault-line strike. She is alert and eager, not idle, bored, or struggling with the weapon.

## 6. Personality-to-motion rules

- **Low center of gravity:** acceleration comes from hips and legs, not arm-only swings.
- **Economy before impact:** windups contain one short measuring or sighting beat, never aimless flourish.
- **Absolute commitment:** attack releases use the whole body and strong follow-through.
- **No fear of recoil:** she rides the impact, then immediately studies what changed.
- **Dry confidence:** neutral mouth or a small satisfied half-smile; no perpetual manic grin.
- **Readable weight:** the maul leads or lags her body according to momentum. It never floats, shrinks, bends, or changes construction.
- **Stable camera:** body scale, anchor, and framing do not zoom between frames.

## 7. Required animation set

All effects are separate synchronized layers. Large effects may exceed the 256 × 256 character canvas without any hard size limit. `attack` may alias `skill` in the runtime because Hollow Reflections has no automatic basic attack.

### Combat Idle — 8 frames, 8 fps, loop

Wide planted stance with the maul resting low but ready. Brigga briefly narrows one eye at the target, shifts one glove on the haft, and lets a single fuse ember pulse. Her feet and maul contact point do not drift. The loop should communicate that she is reading a wall, not waiting for entertainment.

### Combat Move — 8 frames, 10–12 fps, loop

A quick, heavy forward scuttle with bent knees. She carries the maul balanced near its center rather than dragging it. Short strides, decisive torso lean, stable head height, no repeated leg pose, and no limp. The tool roll and hair buns may bounce by one or two pixels.

### Skill — Kegcracker — 12–16 frames, 16–18 fps

Brigga sights a fault line for one sharp beat, steps in, and delivers a compact diagonal maul strike directly through it. The motion is fast and technically precise, with a short recoil and immediate recovery. The authored hit occurs when the maul face crosses the target line.

VFX: a narrow furnace-orange fracture with a brief iron spark and a small break-chip burst. It is a surgical breach, not a giant explosion.

Runtime intent: single target, 72 damage and 35 break in the current build. The roster language says Kegcracker “ignores a chunk” of the guard bar, while the current engine represents this as a strong flat break hit rather than a distinct bypass rule. Resolve that mechanics wording before final UI text; it does not change the required visual hit.

### Arts — Blast Mining — 18–24 frames, 18–22 fps

Brigga marks several structural points in rapid succession: one chalk/fuse placement gesture, a low sweep that sends compact charges across the enemy line, then a heel pivot as she snaps or lights the firing cord. Detonations travel across the line in a deliberate chain. She watches the sequence rather than turning away from it.

VFX: multiple small orange-white mining charges linked by ember lines, followed by staggered debris cones and a readable break pulse on every enemy. Cyan fragments appear only when Hollowglass targets are struck.

Runtime intent: area damage and break against every living enemy.

### Burst — Grand Opening — 28–40 frames, 20–24 fps

Use two or three stitched phases if PixelLab’s per-generation frame limit prevents the full choreography.

1. **Survey:** Brigga plants a wedge or taps the ground, sees the full fault network, and gives a tiny knowing grin.
2. **Commit:** she whips the keg-maul overhead with full-body rotation, jumps or drives down from a powerful heel rise, and strikes the primary fault.
3. **Opening:** a massive fracture races beneath the target and erupts upward in a controlled demolition. She holds the impact pose through the first shockwave, then settles with the maul on her shoulder.

VFX: an unrestricted full-lane orange fracture, deep-red pressure ring, rising rock/Hollowglass slabs, white-hot impact core, and a secondary party-facing energy pulse only if the attack causes stagger. Camera shake belongs on impact, not throughout the sequence.

Runtime intent: 120 damage and 65 break to one enemy. If Brigga causes the stagger, all living party members gain one Energy bar.

### Hit — 4–6 frames, 14–16 fps

A compact shoulder recoil while both boots remain planted. She grimaces more at the interrupted measurement than the pain. The maul keeps its size and hand contact.

### Flinch / Stagger — 6–8 frames, 12–14 fps

One knee dips and the maul head catches her weight against the ground. A loose fuse goes dark. She recovers into the battle-ready stance without a scale change.

### Victory — 10–14 frames, 10–12 fps, hold last

Brigga rests the maul upright, wipes one soot streak with the back of her glove, then pulls out chalk or a small notebook to record the fracture result. End on a satisfied half-smile while she studies the battlefield, not the audience. Sustain the final pose until the result screen exits.

### Defeat — 8–12 frames, 10–12 fps, hold last

The maul drops first under its own weight. Brigga falls to one knee, catches herself against the haft, then settles seated or kneeling beside it. No loop, no disappearance during the sequence, and no comedic explosion. The runtime may despawn her only after the held final frame and battle-state transition.

## 8. VFX and audio identity

Brigga’s effects are industrial Fire, distinct from Cinnia’s warm cooking flame:

- primary: furnace orange, deep ember red, white-hot impact core;
- shapes: fault lines, wedges, powder flashes, pressure rings, directional debris;
- sound: stone tap, chalk scrape, fuse hiss, dense iron impact, short pressure thump, then debris;
- Kegcracker uses one dry crack;
- Blast Mining uses a deliberately timed chain;
- Grand Opening uses a momentary low-frequency vacuum before the main detonation.

Avoid generic fireballs, magical casting circles, random fireworks, lingering smoke that hides the hit, or cyan energy unless Hollowglass itself is breaking.

## 9. Production acceptance checklist

- Canonical Chapter 4 identity and recruitment are reflected in the design.
- Front weaponless reference passes straight-on anatomy QA at 160 px target height.
- South and South-West rotations are compared before selecting a combat direction.
- Equipped state preserves the approved body, height, clothing, and facial identity.
- The maul has one locked construction and never clips, morphs, shrinks, or changes hands.
- Idle and move loops have no drift, limp, duplicated pose, or camera motion.
- Skill, Arts, and Burst feel urgent and forceful at 1× playback.
- Every damage/break event has an authored impact frame.
- Effects remain separate from body frames and can exceed the unit canvas.
- Hit, flinch, victory, and defeat do not zoom or bleed from adjacent frames.
- Victory holds its final pose; defeat holds once and does not loop.
- Complete set is visible per-animation in the Unit Library tester and in live combat.
- Source IDs, prompts, direction choice, scale measurement, frame rates, event frames, and local export paths are recorded in the cast completion manifest.
