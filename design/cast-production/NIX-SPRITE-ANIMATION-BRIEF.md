# Nix, the Apothecary — Sprite and Animation Production Brief

Status: canonical pre-generation brief. Nix does not yet appear in the current Chapter 1-4 draft scenes; her roster biography and implemented kit are therefore the authority until her Chapter 3 recruitment is reconciled with the revised story outline.

## Canonical evidence

- `hollowing-roster.md`: a scowling mermaid apothecary in a wheeled brass tank-chair, with medicine bottles racked like artillery shells and unnecessary pince-nez. She survived the Hollowing of her reef. Her abrasion is grief translated into irritation, and her exceptional single-target healing comes from refusing to lose one more person.
- `hollowing-roster.md`: intended Chapter 3 recruit, but the current `design/CHAPTER-3-OUTLINE.md` does not yet contain her recruitment scene. Do not invent story-specific costume damage or Hollowglass infection until that scene is authored.
- `dev/engine-dev.js`: 3-star Water Healer. Passive `Bedside Manner (Terrible)` gives +50% healing below 30% HP; Skill `Bitter Draught` strongly heals and cleanses; Burst `Panacea` fully heals one ally and grants brief debuff immunity. She intentionally has no Arts ability.
- Her roster quote — “Drink it. Yes, all of it. Yes, it tastes like that on purpose.” — is the acting key: decisive care delivered with zero bedside sweetness.

## Personality translated into motion

Nix is never a whimsical mermaid, bubbly potion seller, or cackling poison witch. She is a battlefield clinician whose impatience hides terror of another preventable loss. Her gestures are economical, practiced, and forceful. She may look annoyed at the patient, but every animation prioritizes their survival. Her tank-chair should move like compact medical machinery, not a throne or wheelchair gag.

## Scale and reference lock

- Canvas: 256x256 transparent RGBA.
- Height band: **seated compact adult, 178-186px overall chair silhouette**, base of wheels to highest hair/fin. Her anatomical torso/head scale matches an adult 192px unit; apparent height is reduced by the seated mermaid posture.
- Anchor: center x=128; lowest wheel contact at y=238.
- Width target: 104-128px in neutral front reference. Width comes from brass tank-chair and bottle racks, not from enlarging her head or torso.
- The tank-chair is mobility support and life-support environment, not a weapon; it remains in the “weaponless” master reference. Her hands are empty. Removable bottles, injectors, and articulated dispensers are added/activated in the equipped medical state.
- Lower body remains a mermaid tail contained safely in a clear/brass water tank or supported basin integrated into the chair. Do not generate human legs.

## Front-facing weaponless 256x256 reference prompt

> Create a full-body, perfectly front-facing, weaponless anime pixel character master for Nix, an adult mermaid apothecary and Water-element healer in a fantasy gacha action RPG. Use a 256x256 transparent canvas. Center the complete wheeled apparatus at x=128 with wheel contact at y=238 and an overall visible silhouette 182 pixels tall. Match the compact anime proportions, expressive head size, crisp pixel clusters, and selective outlines of the approved refreshed Cinnia reference. Nix has a sharp scowling adult face, tired sea-green eyes, practical dark teal hair pinned away from her work, small fin-like ears, and delicate brass pince-nez she does not need. She wears a fitted reef-healer coat in deep teal and cream with rolled clinical sleeves, brass clasps, waterproof gloves, and a short high collar. Her mermaid tail is visible curled safely inside a compact transparent-water brass tank-chair on sturdy wheels; the chair is functional medical machinery with a low back, side rails, brakes, and empty mounting sockets. Her seated torso remains upright and anatomically compact. Both empty hands visible, no handheld weapon, no loose medicine bottles, no syringe, no spell, no aura. Exactly two arms, one continuous mermaid tail, and no human legs. No throne, steampunk excess, sexualized shell clothing, cheerful expression, realistic anatomy, three-quarter rotation, duplicated limbs, cropped wheels, shadow, scenery, text, or watermark.

## Equipped combat state

- Direction: authored southwest three-quarter view, facing screen-left.
- Bottle racks deploy along the chair's back and non-camera side like orderly medical cartridges, not explosives. Keep 5-7 clearly separated silhouettes rather than noisy dozens.
- One articulated brass dosing arm/medical wand may fold from the chair; Nix controls it with one hand while the other selects a bottle.
- Chair wheels angle into a braced stance with the forward brake planted. Tail and water tank remain consistent and readable.
- Expression: narrowed clinical focus. She is ready to move toward an injured ally, not waiting passively.

## Animation set

### Idle — Impatient triage

- 8-frame loop at 7-8 fps.
- Chair, wheels, and camera remain fixed. Tank water makes a subtle 1px circulation loop.
- Nix checks one bottle against the light, taps her pince-nez into place, and looks back toward the party.
- Bottle count and rack positions stay stable. Acting is vigilant impatience, not boredom.

### Move — Powered medical response

- 8-frame loop at 10-12 fps.
- Chair rolls swiftly toward screen-left with controlled wheel rotation and a small forward lean; a brief water wake and brass suspension compression sell speed.
- Bottles stay locked in their rack. Tail does not become legs or propel the chair like a fish.
- No hopping chassis, wheel-size morphing, sideways camera drift, or comic runaway-chair motion.

### Skill — Bitter Draught

- 12-16 frames, split into `select` and `dose` phases if needed.
- Nix identifies the chosen ally, plucks a dark aqua bottle without looking, snaps its seal, and sends it through the articulated dosing arm or a compact water-guided arc.
- The medicine lands as a sharp medicinal splash, then pulls dark debuff motes out of the ally and seals them inside the emptied bottle.
- Finish with Nix pointing firmly as if ordering the ally back into formation.
- Gameplay read: strong single-target heal plus cleanse. The bitter medicine color must remain distinct from poison/damage VFX.

### Arts — Intentionally absent

- Nix's canonical 3-star kit has only Skill and Burst. Do not invent an Arts mechanic or production animation.
- The animation tester should label this slot `No Arts — simple kit` or omit it for Nix. If a UI contract absolutely requires a preview state, use a non-gameplay `Triage` flourish derived from idle and clearly mark it unavailable; it must never consume or imply 200 Energy.

### Burst — Panacea

- 20-28 frames in `diagnose`, `compound`, and `administer` phases.
- Nix brakes hard beside the chosen ally. Bottle racks unfold in a precise semicircle while she scans the patient through a circular water lens.
- She combines three brilliant reagents in midair using water pressure, compressing them into one white-aqua dose. A large clean medical sigil locks over the ally as the dose lands.
- The ally is restored by an upward pulse from feet to head; hostile motes shatter at the edge of a clear immunity shell.
- End on Nix's relieved half-second exhale immediately hidden by an irritated glasses adjustment.
- Gameplay read: one ally fully healed and briefly immune to debuffs. Never depict a party-wide heal.

### Hit

- 4-6 frames. Chair suspension jolts, water sloshes, and Nix grips the rail while one brake catches.
- Bottle rack stays intact. She glares toward the attacker before settling.

### Stagger / Flinch

- 6-8 frames. Both brakes skid; chair rotates no more than a few degrees; bottles rattle in sequence.
- Nix folds protectively over the tank controls, then forces the chair square again. No ejection, overturned chair, or slapstick spill.

### Victory

- 8-12 frames; hold final pose.
- Nix checks the nearest ally first, confirms they are breathing, then cleans one instrument and adjusts her pince-nez with a grumpy, satisfied huff.
- Celebration is professional relief, not cheering.

### Defeat

- 8-12 frames; non-looping and hold final.
- Chair loses power gradually, bottle-rack lights shutting down one by one. Nix lowers herself against the tank rim but keeps one hand on the emergency control.
- Tank remains intact and full; never depict shattered glass, drained water, suffocation, tail injury, or death.

## VFX palette and shape language

- Deep reef teal `#145A62`
- Medicinal aqua `#42C9C6`
- Clean water highlight `#C9FFFF`
- Brass midtone `#A97732`
- Brass light `#E4C16B`
- Bitter-draught blue-green `#3D9B7C`
- Panacea core `#F5FFF0` with pale aqua perimeter
- Cleansed debuffs: muted violet/charcoal motes pulled inward, never bright poison green.
- Shapes: measured rings, bottle silhouettes, dosage ticks, water lenses, clinical cross/reef motifs. Avoid modern hospital text, radiation symbols, explosive shells, random gears, and Hollowglass cracks.

## Hard prohibitions and QA

- No frame-to-frame zoom, camera movement, baseline drift, wheel drift in idle, chair resizing, or changing seated anatomy.
- Never add human legs. Never remove, break, or radically redesign the water tank/chair between animations.
- Bottles do not morph into weapons; articulated medical hardware retains exact construction and attachment points.
- Nix remains an adult. Do not make her childlike because her seated silhouette is shorter.
- Maintain complete wheel and tail visibility with generous safety padding. Large Panacea VFX belongs on separate atlases.
- No cheerful idol poses, witch cackling, sexy mermaid posing, slapstick chair antics, or cruelty toward the patient.
- First and last loop frames must share wheel contact, chassis center, and tank-water level.

