# Hollow Reflections — Luna High Handoff

## Project and build

- Working title: **Hollow Reflections**. Replace visible instances of “Project Hollowing” or “Hollowing” with the new title when appropriate.
- Keep the internal save key `projectHollowing.singleSave` unchanged so existing saves survive the rename.
- Live standalone demo: `C:\Users\Clayn\OneDrive\Documents\Gacha Game\hollowing-demo.html`
- Current visible version: **v0.39.0**.
- The standalone file contains embedded assets and one persistent autosave profile.
- Before editing the live file, preserve a backup under the project’s `archives` folder.
- After editing, compile every inline script and verify that the sprite library is initialized with `var SPRITES = {};` before any `SPRITES[...]` assignment or `Object.assign(SPRITES, ...)` call.
- Preserve UTF-8. Do not round-trip the HTML through a tool that silently treats it as Windows-1252; that previously caused mojibake throughout the UI.

## Current completed animation work

- Cinnia and Katie have complete PixelLab animation libraries embedded in the demo and available in combat and the Unit Library animation viewer.
- The Unit Library preview must show one selected unit and one selected animation only.
- Available preview states include Idle, Move, Skill/Attack, Arts, Burst, Hit, Flinch/Stagger, Victory, and Defeat.
- Animation playback was deliberately slowed. Do not restore the earlier rapid frame cycling.
- Cinnia and Katie are the current style/energy benchmarks.
- Katie is a base **5-star Dark tank/breaker**.

## Character-generation source standard

Every character must begin with a clean PixelLab source reference before rotations, weapons, states, or animations are generated.

Required source image:

- Full-body anime pixel sprite.
- Exactly front-facing and visually symmetrical.
- Weaponless. Weapons are added later as a separate PixelLab state.
- Neutral standing pose with both arms visible and no duplicated limbs.
- Consistent proportions with the revised Cinnia sprite: stylized anime anatomy, not realistic anatomy and not tiny/chibi proportions.
- Entire body visible with generous padding around hair, cape, hands, and feet.
- Transparent background.
- No floor, shadow, aura, effects, text, border, logo, watermark, or props.
- Preserve defining clothing, armor, hairstyle, face, and color blocking, but keep small details readable at sprite scale.

Before spending credits on animations:

1. Generate and approve the front-facing weaponless character.
2. Generate the rotation set.
3. Inspect South and Southwest. Do not assume Southwest is always correct.
4. Generate the equipped combat state separately.
5. Approve proportions, weapon scale, silhouette, stance, and direction.
6. Generate one energetic attack as a pilot.
7. Only after the pilot passes should the remaining animations be generated.

PixelLab can run up to ten concurrent generations, but concurrency should only be used after the character, direction, weapon state, and animation language are locked.

## Character height standard

Canvas size and character height are separate concerns. Every PixelLab character should use a **256x256 canvas**, but the visible body is normalized against a shared ground line so characters can intentionally be adult-sized, short, or child-sized without drifting or being stretched inconsistently.

Reference coordinate system:

- Canvas: 256x256 pixels.
- Ground/feet line: y=238.
- Centerline: x=128 for front-facing references.
- Keep at least 8px of empty space above the tallest hair and at least 8px below the feet.
- Measure height from the topmost opaque pixel to the bottom of the feet, never from the canvas edges.

Height bands for the current cast:

- Adult baseline: 192px visible height. Use this for Hale and Cinnia unless a future design explicitly overrides it.
- Slightly short adult: 180px visible height. Katie may use this band; her shorter appearance is intentional.
- Young teen: 165-175px visible height.
- Child: 135-150px visible height. A child must remain visibly shorter while keeping the same 256px canvas and y=238 feet line.
- Large/tall adult: 200-208px visible height, only when supported by the character design.

Generation prompt addition:

> Use a fixed 256x256 transparent canvas, shared y=238 feet line, and exact target visible height of <TARGET> pixels from hair top to boot soles. Do not fill the canvas automatically. Preserve empty padding above the head and below the feet. Keep the target height identical across all directions and animation frames.

PixelLab v3 may still vary the result. Before approving a character, measure the South and Southwest rotations and record the actual visible height. If they differ from the target, normalize the source/frames by scaling around the feet anchor—not by cropping, moving the ground line, or changing the canvas size. Store the intended height as character metadata (`targetHeightPx`) and use it to calculate the renderer scale.

Never use a larger or smaller canvas to represent height differences. The canvas, ground line, and anchor stay uniform; only the approved character's visible body height changes.

## Battle orientation and canvas rules

- Party sprites should appear mostly **left-facing** in battle; enemies should face right.
- PixelLab’s South view often gives the desired three-quarter combat presentation. Southwest may face too far left. Judge each character visually.
- Use a stable world-space anchor at the feet. The feet and body center must not drift between frames.
- Keep a fixed camera, fixed canvas, fixed character scale, and fixed ground line for every frame.
- Never zoom, crop, pan, rotate, or recenter the camera during an animation.
- Motion must come from the character and effects—not from moving the camera.
- The character’s resting foot position must return to the exact starting coordinate at the end of a loop.
- Allow effects to exceed the character cell or logical sprite bounds. Arts and Bursts must not have an artificial effect-size limit.
- Give oversized weapons and capes enough padding. Hale’s sword/cape, Cinnia’s pan-staff, and Katie’s hammer previously clipped because their canvases were too tight.
- Never resize the character between frames. Apparent zoom was a major defect in earlier sheets.
- Prevent adjacent-frame bleed. Every exported frame must be isolated and clean.

## Strict combat-animation prompt rules

PixelLab tends to generate passive, bored movement unless the prompt explicitly defines urgency, force, anticipation, impact, and recovery. Every combat prompt should contain all of the following concepts:

- **Urgent battle animation**, not a demonstration or casual motion.
- Strong anticipation pose before the strike or cast.
- Explosive acceleration into the action.
- Clear contact/impact frame with strong silhouette.
- Follow-through showing weight and momentum.
- Controlled recovery into the exact original combat stance.
- Stable camera, stable scale, stable ground line, stable feet anchor.
- No idle pauses in the middle of the attack.
- No lazy swing, weak wrist motion, slow flourish, dance-like movement, or casual parry.
- Preserve the weapon’s exact shape, length, head size, grip, and material in every frame.
- No weapon morphing, shrinking, bending, disappearing, or transforming unless explicitly part of the ability.
- Do not let limbs, hair, cape, or weapon disappear.
- No duplicated limbs or detached hands.
- Effects may be large, but must not obscure the character’s key action poses throughout the entire animation.

Reusable prompt core:

> Create an urgent, high-impact combat animation for a side-view anime pixel RPG. Begin in the approved equipped combat stance with a fixed feet anchor, fixed ground line, fixed camera, and identical character scale in every frame. Show a strong anticipation pose, explosive acceleration, a clearly readable impact frame, forceful follow-through, and a controlled recovery to the exact starting stance. Preserve the character’s anatomy, outfit, face, hair, cape, and weapon design exactly. Keep the weapon’s shape, length, proportions, grip, and orientation physically consistent in every frame. No camera movement, zoom, cropping, recentering, sprite drift, adjacent-frame bleed, duplicated limbs, missing body parts, weapon morphing, passive motion, lazy swing, or casual flourish. This is a dangerous live battle, so the movement must feel decisive, fast, and powerful.

Animation-specific requirements:

- **Idle:** a battle-ready guard, not relaxed standing. Knees remain slightly flexed, weight is distributed for immediate movement, the weapon stays in a usable guard/strike position, and the character makes only subtle breathing, cape, and controlled guard adjustments. No horizontal drift; weapon remains braced and consistent.
- **Move:** purposeful combat run/advance; alternating leg cycle must be clear; no repeated leg pose that causes stutter or limping.
- **Skill:** compact and fast; clear hit frame; designed to loop back quickly into control.
- **Arts:** larger anticipation and effects than Skill; maintain character scale; effect buildup must not crop at the top or sides.
- **Burst:** maximum spectacle and impact; allow battlefield-scale effects; keep the character readable at key poses; no camera shake simulated by moving or resizing the sprite.
- **Hit:** one readable recoil and recovery; do not loop unnaturally.
- **Flinch/Stagger:** stronger interruption than Hit; stable scale; no sudden kneeling zoom.
- **Victory:** transition once into a held final pose. The final pose should persist until the battle exits rather than replaying the entire animation.
- **Defeat:** play once, hold briefly if needed, then despawn the unit. Never loop the fall.

## Hale — locked character direction

### Four-star form

- Display name/subtitle: **Hale, Adventurer**.
- Element: **Dark**, not Hollow.
- Role: pure damage attacker. Remove tank, barrier, healing, guarding, and party-protection functions.
- At this point in the story, Hale does not control Hollow powers. His techniques use martial skill and Dark energy only.
- Passive: **Relentless Pursuit** — 20% more damage to enemies below 50% HP.
- Skill: **Cross Slash** — rapid two-hit overhead combination; 2,400% Dark physical damage; restores 25 Arts energy; Dark resistance -15% for 10 seconds; 8-second cooldown.
- Arts: **Black Horizon** — explosive advancing Dark sword attack; 14,000% AoE Dark physical damage; Hale ATK +50% for 15 seconds; final hit deals 50% more damage below 50% enemy HP.
- Burst: **Nightmare’s End** — concentrated darkness detonated through the enemy formation; 32,000% AoE Dark physical damage; ignores 35% defense; 50% more damage below 30% enemy HP; moderate Break.

Four-star animation briefs:

- Cross Slash: a very fast, forceful two-hit overhead combination. It must not look like two lazy swings.
- Black Horizon: Hale launches forward and cuts through the target line, leaving a broad black-purple rupture. No Hollow teal or glass fractures.
- Nightmare’s End: Hale levels/points the blade, compresses Dark energy, then releases a violent battlefield-wide black-purple explosion.

The cleaned PixelLab source reference is:

`C:\Users\Clayn\OneDrive\Documents\Gacha Game\dev\pixellab-pilot\references\hale-4star-front-weaponless-transparent.png`

It is full-body, front-facing, weaponless, transparent, and already has the Gemini background/logo removed.

### Five-star form

- Display name/subtitle: **Hale, UnHollowed**.
- This is where Dark power integrates with controlled teal Hollow influence.
- Passive: **Hollow Sovereignty** — +30% Dark damage and +20% critical damage; both double below 50% HP.
- Skill: **Fracture Edge** — approved concept.
- Arts: **Event Horizon** — approved concept.
- Burst: **Shatterfall: Hollow Reflection** — approved name and concept.
- Visual language: purple Dark energy fractured by teal Hollow light, especially through the sword, left arm, and neck scar.
- Do not generate this form’s final animation library until the four-star pipeline and combat integration are proven.

## Immediate next milestone

1. Send the cleaned four-star Hale reference to PixelLab.
2. Approve rotations and choose South or Southwest based on the resulting equipped combat stance.
3. Add his sword as a separate state, with a braced combat posture.
4. Generate **Cross Slash only** as the pilot animation using the strict energetic prompt.
5. Inspect for camera movement, scale changes, clipping, drift, weapon inconsistency, weak impact, and adjacent-frame bleed.
6. Once Cross Slash passes, generate Idle, Move, Black Horizon, Nightmare’s End, Hit, Flinch/Stagger, Victory, and Defeat.
7. Integrate the revised four-star kit and animations into combat and the Unit Library.
8. Update visible branding to Hollow Reflections without changing the legacy save-storage key.

## Known project cautions

- The current demo is a very large standalone HTML file with embedded base64 assets. Avoid broad search-and-replace operations across giant data lines.
- Use UTF-8 explicitly for every read/write.
- Do not remove `var SPRITES = {};`.
- Preserve unrelated user changes and archive before replacing the live build.
- After integration, test both normal combat and every animation in the Unit Library viewer.
- Existing Cinnia/Katie animations are the quality baseline; Hale should meet or exceed their urgency and impact.
