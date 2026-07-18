# Marlowe, the Foppish Blade — Canonical Sprite and Animation Brief

Status: production-ready brief; no image generation authorized by this document.

## Canonical read

Marlowe is a 4-star Water Attacker and former pirate captain. His comedy is a deliberate performance laid over real competence and fear. He fights with theatrical precision even when nobody is watching, becomes more effective when the rest of the party has set the stage, and talks more when frightened. The performance may crack after combat, but it must never make him look incompetent during an action.

Identity hierarchy:

1. Feathered tricorne, styled hair, pencil mustache, alert expressive eyes.
2. Slim fencer silhouette with foppish pirate coat, lace cuffs, fitted boots, and a controlled upright line.
3. Needle-thin rapier used like both a weapon and a conductor's baton.
4. Cerulean Water accents, polished steel, navy/teal cloth, cream lace, and one warm flamboyant accent.
5. A showman's invitation gesture: open off-hand, precise blade, chin lifted toward an imagined audience.

## Personality evidence

- `hollowing-roster.md`: foppish pirate duelist; former first blade; joined for applause; Flourish rewards acting after attacking allies.
- `design/CHAPTER-2-OUTLINE.md` Mission 2-4: fights with theatrical precision even without an audience; immediately notices an audience mid-parry; his legs shake only after hours of fighting.
- `design/CHAPTER-3-OUTLINE.md`: Marlowe tests the group, talks more when scared, then becomes uncharacteristically quiet as the road worsens.
- `design/CHAPTER-4-OUTLINE.md`: the comedy thins and finally dies; he is still the first to shout for everyone to move.
- `dev/engine-dev.js`: Riposte Stance, Coup de Grâce, Curtain Call, and Flourish are the implemented canonical kit.

Performance rule: flamboyance is the mask, precision is the truth. Do not animate him as a joke pirate, a coward, a clumsy swashbuckler, or a generic noble swordsman.

## Scale and anatomy lock

- Canvas: 256×256 transparent pixels.
- Proportion style: `compact-anime` matching refreshed Cinnia, Katie, and Hale.
- Height band: adult-standard/slender, 188–194px; production target 191px from highest feather/hair pixel to boot soles.
- Anchor: x=128; feet baseline y=238.
- Head plus hair should read near one quarter of the body, with mature anime anatomy, shortened torso, readable hands, and slim heroic legs.
- The tricorne feather may exceed the body-height measurement by up to 8px, but the underlying body must remain 191px.
- Equipment must never cause the body to be scaled down. Rapier and long coat tails use the full transparent safety area.

## Front-facing weaponless 256×256 reference prompt

> Full-body front-facing weaponless anime pixel character reference for Marlowe from Hollow Reflections, exact 256 by 256 transparent canvas. Compact mobile action-RPG anime proportions matching the supplied refreshed Cinnia reference: expressive head approximately one quarter of the figure, shortened torso, slim mature legs, readable hands and boots, not realistic and not chibi. Adult male foppish former pirate captain and elegant water-element fencer. Feathered tricorne, carefully styled hair, thin pencil mustache, bright self-aware eyes, fitted navy and deep-teal pirate duelist coat with short split tails, cream lace cuffs and cravat, polished silver trim, belts, fitted trousers, elegant sea boots. Straight-on orthographic view, shoulders and hips perfectly level, arms relaxed and fully separated from torso, hands empty and visible, feet parallel on one shared baseline. No rapier, scabbard, weapon, prop, water effect, pose rotation, three-quarter view, camera perspective, background, shadow, text, logo, frame, blur, antialiasing, or watermark. Crisp intentional opaque pixel clusters, hard edges, transparent background. Visible body target 191 pixels, centered x 128, boots on y 238; feather may extend slightly above the body target. Preserve anime head size and slim fencer anatomy.

## Equipped battle state

- Direction: Southwest/player three-quarter view, reading unmistakably toward screen-left.
- Add one canonical basket-hilt rapier and a narrow scabbard. Rapier length, guard, grip, and hand contact are immutable across ordinary frames.
- Combat pose: front foot aimed left, rear heel grounded, knees lightly flexed, torso tall, blade between Marlowe and the enemy. Off-hand is open behind or beside him for balance, not dangling.
- He looks ready to explode into a lunge. “Elegant” must never become passive or bored.
- Coat tails and feather provide secondary motion, but feet and camera remain locked.

## Animation acting and timing

### Idle — 8–10 frames, 8fps, loop

Grounded fencing guard. A controlled breath, tiny rapier-tip circle like a conductor setting tempo, feather and lace reacting one beat late, then a brief sideways glance toward the “audience.” Feet do not move. Head movement is at most 2px. End frame returns exactly to the first anchor and silhouette.

### Combat movement — 8–10 frames, 10–12fps, loop

Fast advancing fencing steps toward screen-left: compact heel-to-toe footwork, blade protecting his center, coat tails streaming. No runway sprint, moonwalk, cross-legged stumble, limp, or repeated-leg stutter. Root translation belongs to the runtime; the local cycle returns to x=128/y=238.

### Skill — Riposte Stance — 10–14 frames activation plus hold/counter follow-up

Activation: one sharp retreating half-step without root drift, rapier snaps across his body, off-hand invites the enemy forward, eyes narrow, and a thin water arc closes into a parry ring. Finish in a tense held guard rather than returning immediately to idle.

Author the optional `riposte_counter` follow-up separately: enemy strike meets the blade, a bright steel/water spark marks contact, Marlowe redirects it by inches, then answers with one immediate surgical thrust. The counter must feel faster and less showy than his Arts. If the stance expires untouched, use a restrained shrug/rapier salute (`riposte_refund`), never a full attack.

### Arts — Coup de Grâce — 16–22 frames, 18–21fps, one hit

Marlowe measures the target for two anticipation frames, compresses low, then launches a truly fast full-extension lunge. The rapier and body form one clean diagonal. A cerulean line seems to lag behind the blade and catches up at impact; debuffed targets gain a brief water-crack accent. Recovery is a precise pullback and small blade salute. The hit event lands at maximum extension. No floaty thrust, repeated poking, or camera zoom.

### Burst — Curtain Call — 26–36 frames, 20–24fps, five authored hit events

A five-thrust finale with readable escalation rather than five duplicated jabs:

1. Low-line entry thrust.
2. Rising diagonal thrust.
3. Reversing cross-body thrust.
4. Near-invisible straight thrust marked by a water afterimage.
5. Full-stage finishing thrust that collapses the prior four cerulean lines into one star-shaped impact.

He pivots and finishes with a compact bow/rapier flourish only after the fifth hit. The bow is confident, not comedic; if the story tone is severe, the final expression stays grim. Full Flourish is communicated by four small water “stage lights” or ally-colored motes joining before the finale.

### Hit — 4–6 frames, 14–16fps

A tight shoulder recoil and one lost breath while the rapier stays between him and the enemy. He is surprised, not helpless. Feet remain planted.

### Flinch/Stagger — 6–9 frames, 12–14fps

Parry line breaks, torso folds slightly, rear foot skids no more than 3px locally, feather snaps forward. He immediately searches for his guard again. Never kneel unless defeated.

### Victory — 10–16 frames, 10–12fps, hold last

Wipe rapier with one lace cuff, sheath it cleanly, acknowledge the party/audience with a small bow. After the pose lands, reveal one honest exhausted breath before the held final frame. Do not loop the bow or drift.

### Defeat — 9–14 frames, 10–12fps, hold/despawn

Rapier point catches the ground, one knee lowers, posture finally loses its theatrical line, and the hat shadows his eyes. He stays recognizable and keeps hold of the weapon. Hold the final pose until runtime despawn; never loop, bounce, shrink, or disappear mid-animation.

## VFX and audio direction

- Water is an elegant precision instrument: narrow cerulean ribbons, droplets pulled into straight lines, clean circular parry rings, and bright white-blue contact sparks.
- Avoid tidal waves, ice, Hollowglass cyan shards, purple Dark energy, or amorphous blue fog.
- Riposte: single high steel note plus a water-glass “ting.”
- Coup de Grâce: compressed foot launch, needle-fast air cut, one wet crystalline impact.
- Curtain Call: five rising metallic notes and five distinct hit confirmations, fifth resolving like a stage chord; never one undifferentiated explosion.

## Non-negotiable generation prohibitions

- No camera movement, crop change, sprite zoom, body rescale, head-size change, or baseline change between frames.
- No root drift, foot sliding, idle translation, disappearing frames, duplicated limbs, adjacent-cell bleed, or chroma fringe.
- No rapier morphing, shortening, thickening, swapping hands, bending like a whip, or changing basket guard.
- No realistic anatomy, tiny head, overlong torso, oversized hands, super-deformed chibi proportions, or visual style drift.
- No lazy sword swings, broad saber chops, acrobat flips, pistol, second sword, magic staff, or generic pirate swagger.
- Character layer and VFX layer remain separable. Oversized Burst VFX may exceed the unit canvas and must never force Marlowe smaller.

## Acceptance gate

At 1× scale, a silhouette-only read must say “elegant pirate fencer.” Every attack must show exact rapier contact and a stable 191px body. Riposte must read as invitation → contact → answer; Arts as one decisive lunge; Burst as exactly five escalating thrusts. The final frame of every loop/non-loop must preserve the shared anchor and approved anime proportions.
