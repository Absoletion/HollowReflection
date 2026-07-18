# Milla, the Courier — Canonical Sprite and Animation Brief

Status: production-ready brief; no image generation authorized by this document.

## Canonical read

Milla is a 4-star Thunder Supporter, Vessia's fastest frontier courier, and the party's route intelligence. She is energetic, practical, sharp, and responsible—not airheaded comic relief. Even at rest she is mid-task. Her magic is logistics made visible: Energy reaches exactly the person who needs it, exactly when it is needed. Beneath the speed, she remembers every person and every stop on her roads.

Identity hierarchy:

1. Compact young-adult courier silhouette pitched slightly forward, as if the next step has already begun.
2. Winged boots, static-charged short cloak, and overstuffed cross-body delivery satchel.
3. Route tags, sealed parcels, ledger slips, and messenger hardware—never a conventional weapon.
4. Golden-yellow/white Thunder core with cyan-blue edge sparks; practical courier reds/browns and a bright readable scarf/cloak.
5. Alert eyes that constantly locate the next recipient, exit, or road.

## Personality evidence

- `hollowing-roster.md`: courier girl mid-stride even while standing; winged boots, overstuffed satchel, static cloak; unofficial intelligence network; entire kit is targeted Energy logistics.
- `design/CHAPTER-2-OUTLINE.md`: freelance courier, fastest in Vessia, never stops moving even behind the counter; refuses to scout alone because she is “fast, not stupid”; joins because the dead roads are her life.
- `design/CHAPTER-3-OUTLINE.md`: remembers names and routines at every stop, recognizes the Hollowing as something “wearing” wood, and insists on present tense for missing people.
- `design/CHAPTER-4-OUTLINE.md`: spots tracks first, identifies routes and people from evidence, maps escape paths, then leads the party out of Greywick.
- `dev/engine-dev.js`: Never Late, Hand-Off, Express Route, and Special Delivery are the canonical implemented kit. Her abilities empower allies rather than attack enemies.

Performance rule: speed is expertise, not chaos. She can be witty and urgent, but never ditzy, careless with parcels, or unaware of danger.

## Scale and anatomy lock

- Canvas: 256×256 transparent pixels.
- Proportion style: `compact-anime`, matching refreshed Cinnia, Katie, and Hale.
- Height band: short/light adult, 178–186px; production target 183px from highest hair pixel to boot soles.
- Anchor: x=128; feet baseline y=238.
- Expressive anime head at roughly 25–27% of the figure, compact torso, slim athletic limbs, readable hands, and slightly oversized winged boots.
- Shorter height is intentional and must not be achieved by chibi proportions or a larger relative head than the established compact-anime range.
- Cloak/static trails and route VFX may extend far outside the body. Never scale her body down to fit trails.

## Front-facing weaponless 256×256 reference prompt

> Full-body front-facing weaponless anime pixel character reference for Milla from Hollow Reflections, exact 256 by 256 transparent canvas. Compact mobile action-RPG anime proportions matching the supplied refreshed Cinnia reference: expressive head approximately one quarter of the figure, shortened torso, slim athletic young-adult limbs, readable hands, slightly oversized practical boots, not realistic and not super-deformed chibi. Short young-adult female frontier courier with alert intelligent eyes and wind-swept practical hair, fitted travel tunic and shorts or narrow trousers, layered courier jacket, bright scarf or short static-charged cloak, fingerless gloves, belts and sealed route tags, distinctive winged boots. Practical warm courier browns/reds with golden-yellow, white, and restrained cyan Thunder accents. Straight-on orthographic view, shoulders and hips perfectly level, both empty arms fully separated from torso, empty hands visible, feet parallel on one shared baseline. No satchel, parcel, ledger, weapon, staff, blade, lightning effect, running pose, pose rotation, three-quarter view, camera perspective, background, shadow, text, logo, frame, blur, antialiasing, or watermark. Crisp intentional opaque pixel clusters, hard edges, transparent background. Visible body target 183 pixels, centered x 128, boots on y 238. Preserve mature compact-anime anatomy despite her shorter stature.

## Equipped battle state

- Direction: Southwest/player three-quarter view, reading toward screen-left.
- Add one canonical overstuffed cross-body courier satchel with fixed strap path, flap, seals, and small route-ledger pocket. Add the charged short cloak/scarf and exact winged-boot construction.
- No conventional weapon. Her free hand is ready to pull a delivery charge; the other secures the satchel or points along a route.
- Combat stance: knees flexed, front foot already lifting, torso forward but balanced, eyes on the intended ally. She must look ready to sprint, not casually standing.
- Satchel remains attached and consistent. Papers/parcels are spawned as separate action props, not permanently duplicated around her.

## Animation acting and timing

### Idle — 8–10 frames, 8–9fps, loop

A contained “ready to go” cycle: heel bounce, winged-boot feather twitch, quick scan from enemy to allies, one hand checks the satchel flap, cloak gains a tiny static pulse. Feet return to the exact baseline and x anchor. She may appear restless without drifting left, marching in place, or moving the camera.

### Combat movement — 8–12 frames, 12–14fps, loop

The fastest player-unit locomotion: low purposeful sprint toward screen-left, compact stride, strong arm drive, cloak and satchel following one beat late. The local loop remains centered while runtime supplies translation. Leg positions must progress cleanly with no duplicate contact pose, stutter, skating, or size pumping.

### Passive reaction — Never Late — 6–9 frames, 16–18fps, optional overlay-safe action

Milla notices the ally's almost-full gauge, pulls one small charged route token without looking, and flicks it along a yellow-white lightning line. It clicks into the ally's gauge like a delivered seal. This should be short enough not to halt combat and may play as an upper-body overlay/afterimage. One activation per battle; no offensive hit reaction.

### Skill — Hand-Off — 12–18 frames, 17–20fps, one ally receives +2 Energy

Milla snaps open the satchel, grabs a compact glowing “charge parcel,” drives into a sprinter start, and crosses the gap in one urgent streak. At the ally, she plants, physically slaps/passes the parcel into their hand or gauge, points them forward, and rebounds to her anchor. Contact must be unmistakable. Use a route-line afterimage for travel; never teleport, vanish completely, or attack an enemy.

### Arts — Express Route — 18–26 frames, 20–23fps, two recipients

Two deliveries, one continuous route. Milla marks both allies with small route seals, then accelerates through a crisp angled/figure-eight path. First hand-off is low and fast; she redirects off a lightning foothold and delivers the second overhead or cross-body. Two distinct Energy arrival pulses must match the two recipients. Finish in a sliding three-point stop and immediate ready posture. Her body may use afterimages but at least one solid Milla silhouette remains readable throughout.

### Burst — Special Delivery — 26–38 frames across phases, 21–24fps, one ally to full Energy plus ATK up

This is support spectacle, not an enemy explosion:

1. Milla opens the satchel and compresses multiple route charges into one brilliant sealed parcel.
2. Winged boots flare; golden route lines map every possible path across the full stage.
3. She chooses the shortest line and launches with maximum urgency, momentarily outrunning her own cloak/static afterimage.
4. She drives the parcel into the chosen ally's gauge. The gauge fills in three rapid beats, then a bold upward arrow/attack crest ignites behind the ally.
5. Milla passes through, brakes in a shower of harmless sparks, looks back to confirm receipt, and gives one crisp “go” gesture.

The recipient is the climax. Do not frame Milla as dealing damage. Full-stage route VFX are allowed and must remain on separate canvases.

### Hit — 4–6 frames, 15–17fps

Quick shoulder twist, satchel protected instinctively, one boot catches her balance. She checks the parcel before herself. Feet remain anchored locally.

### Flinch/Stagger — 6–9 frames, 13–15fps

Momentum breaks: cloak whips past, satchel swings, one knee nearly touches down, then winged boots spark to arrest the fall. No spinout, camera shake, or disappearing frame.

### Victory — 10–16 frames, 11–13fps, hold last

Confirm every ally is standing, stamp/check the final delivery in a small ledger, snap it shut, and lean forward ready for the next route. A quick satisfied smile is appropriate; a long cheer is not. Hold the final “next job” stance without looping or drift.

### Defeat — 9–14 frames, 10–12fps, hold/despawn

Boot sparks fail, Milla stumbles to one knee while catching the satchel before it hits the ground, then braces over it protectively. One loose route slip settles beside her. Hold the final frame until runtime despawn; never loop, bounce, shrink, or erase her mid-sequence.

## VFX and audio direction

- Thunder is speed/logistics: golden-white cores, cyan edge sparks, straight map routes, waypoint diamonds, wax-seal/parcel motifs, and controlled boot arcs.
- Route lines can cross the whole stage but should not look like random lightning strikes. Each line must connect caster, waypoint, and recipient.
- Never Late: tiny notification chime plus electric zip.
- Hand-Off: satchel snap, fast foot launch, single delivery click, rising Energy tone.
- Express Route: two spatially distinct zip/click confirmations.
- Special Delivery: accelerating rhythmic footbeats, route-map arpeggio, three gauge-fill tones, strong but clean buff resolve.
- No purple Hollow energy, fire, ice, giant attack blast, enemy hit spark, or damage-shaped impact crater.

## Non-negotiable generation prohibitions

- No camera movement, crop change, sprite zoom, body rescale, head-size change, or baseline change.
- No root drift, idle translation, foot sliding, duplicated stride frames, stutter, disappearing frames, duplicated limbs, adjacent-cell bleed, or chroma fringe.
- No satchel morphing, changing sides, strap relocation, changing size, detached floating bag, or unmotivated parcel duplication.
- No realistic runner anatomy, tiny head, overlong limbs, child/chibi anatomy, exaggerated breasts, oversized hands, or style drift.
- No sword, staff, gun, offensive spell blast, enemy-targeted strike, careless parcel toss, slapstick trip, or idle laziness.
- Character, action props, route trails, recipient pulses, and full-stage Burst effects remain separable. Oversized VFX must not force Milla smaller.

## Acceptance gate

At 1× scale, silhouette alone must read “fast courier,” not thief, lightning mage, or child. Her shorter 183px height must preserve the same anime anatomy family as Cinnia. Skill must show one physical hand-off, Arts exactly two deliveries, and Burst one spectacular full-charge delivery plus attack buff. All motion returns to x=128/y=238 with no drift, and the target ally—not an enemy—is always the visual destination.
