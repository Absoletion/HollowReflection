# Tobin, the Tide-Reader — Sprite and Animation Production Brief

Status: canonical pre-generation brief. Do not submit production generations until the front reference and equipped state each pass silhouette and scale review.

## Canonical evidence

- `hollowing-roster.md`: Tobin is a small foundling boy, an earnest water-reader in an oversized scholar's coat, with three floating seawater orbs. His combat identity is information and enemy suppression, not direct force.
- `design/CHAPTER-1-OUTLINE.md`: he is proud of his gift, tags along without being asked, narrates fights to his water, and is still visibly a child whom Aldric defended when others called him too young.
- `design/CHAPTER-2-OUTLINE.md`: his comfortable certainty becomes anxiety when the water goes blank; he asks Aldric to promise he will return and quietly packs before the adults decide to leave.
- `design/CHAPTER-3-OUTLINE.md` and `design/CHAPTER-4-OUTLINE.md`: he reads increasingly thin, flat reality and is the first party member to see the figure in the water. Fear should interrupt his practiced composure without turning him into a sinister oracle.
- `dev/engine-dev.js`: 4-star Water Supporter. Passive `Still Water`; Skill `Dampen`; Arts `Read the Currents`; Burst `The Tide Confides`.
- `dev/story-registry.js`: starter/core-party unit whose speech is concise, literal, and gently strange.

## Personality translated into motion

Tobin is earnest first, uncanny second. He is a kid trying very hard to look like a proper scholar. His best animations contrast a small, careful body with water that moves with ancient confidence. He does not swagger, brood, or perform theatrical wizard poses. When frightened, he becomes still and watches the water; when pleased, his pride escapes as a small smile.

## Scale and reference lock

- Canvas: 256x256 transparent RGBA.
- Height band: **child, 142-148px visible height**, highest hair pixel to soles.
- Anchor: center x=128; feet locked at y=238.
- Proportions: compact anime child, head about 29-32% of visible height; short limbs; narrow shoulders; readable hands and boots. Do not place an adult body under a large head.
- The coat is four sizes too large: hem near the shins, sleeves visibly rolled in several thick cuffs, shoulders slightly dropped. It enlarges his clothing silhouette without making his body adult-sized.
- Front reference is perfectly orthographic and weaponless. The three water orbs are excluded from the base reference and added in the equipped/casting state so their scale and layering remain controllable.

## Front-facing weaponless 256x256 reference prompt

> Create a full-body, perfectly front-facing, weaponless anime pixel character master for Tobin, a young boy and Water-element tide-reader in a fantasy gacha action RPG. Use a 256x256 transparent canvas. Keep his feet centered and anchored at y=238, with a visible height of 145 pixels from highest hair pixel to soles. Match the compact anime proportions and crisp selective pixel outlines of the approved refreshed Cinnia reference, but preserve a genuinely child-sized body: large expressive head, narrow shoulders, short torso and limbs, small hands and boots. Tobin has an earnest youthful face, observant sea-blue eyes, and soft slightly untidy hair in a cool dark-auburn or deep slate-brown tone. He wears a formal navy scholar's coat four sizes too big, its sleeves rolled into six chunky cuffs, a pale shirt, small tide-blue neck ribbon, belted shorts or fitted trousers, dark stockings, and practical ankle boots. The oversized coat hangs near his shins and makes him look like a child borrowing an adult uniform. Arms relaxed and separated from the torso, empty hands visible, exactly two arms and two legs. No water orbs, staff, weapon, spell, aura, shadow, scenery, text, watermark, realistic anatomy, tall body, three-quarter rotation, duplicated limbs, cropped clothing, or chibi mascot proportions.

## Equipped combat state

- Direction: authored southwest three-quarter battle view, facing screen-left.
- Add exactly three palm-to-head-sized seawater orbs orbiting at shoulder/head height. They are perfectly round only while calm; motion may stretch them, but their total water volume stays consistent.
- Tobin holds no conventional weapon. One hand hovers near the nearest orb as if listening through his fingertips; the other gathers the oversized sleeve clear of his casting hand.
- Stance: feet apart but not aggressively wide, knees lightly bent, torso guarded behind the orbs. His face is focused, not bored.
- Preserve coat cuff count, coat length, child height, orb count, camera, and ground anchor in every state.

## Animation set

### Idle — Still-water listening

- Quiet 8-frame loop at 7-8 fps.
- Feet and camera remain immovable. Torso breathes by at most 1px.
- The three orbs orbit slowly on different shallow arcs while maintaining stable volume and never crossing his face.
- Tobin glances from the enemy to one orb; the final frame returns seamlessly to the first.
- Acting note: alert curiosity and rehearsed seriousness, not boredom.

### Move — Small body, purposeful pace

- 8-frame loop at 10-12 fps.
- Quick, short strides toward screen-left; oversized coat and rolled sleeves lag by 1-2 frames.
- Orbs stream into a protective triangular formation and keep pace without dragging the camera.
- No skipping comedy, adult-length strides, foot sliding, double-step stutter, or coat-induced limb disappearance.

### Skill — Dampen

- 10-14 frames, or two stitched phases if the generator is limited to 8 frames.
- Tobin snaps one palm toward the target. One orb darts low and bursts into a heavy ribbon around the enemy's striking arm/weapon, visibly weighing it down.
- The other two orbs hold a small defensive screen near him. Finish with a firm downward hand press and a compact water impact.
- Gameplay read: single enemy ATK down. It should feel clever, fast, and suppressive rather than damaging.

### Arts — Read the Currents

- 16-24 frames split into `read` and `ward` phases if needed.
- All three orbs stop dead. Tobin draws them into a vertical water lens; fleeting silhouettes/attack lines appear inside it.
- He recognizes the answer, then sweeps one hand sideways. The lens divides into four thin current-rings that pass over the party and settle as pale-blue defensive ripples.
- End with Tobin pointing decisively toward the predicted danger.
- Gameplay read: enemy intents revealed, party DEF up. Information must be visible before protection spreads.

### Burst — The Tide Confides

- 24-32 frames in three phases: `silence`, `confession`, `pressure`.
- Soundless stillness first: orbs flatten into three mirror-like water discs around Tobin, with his reflection briefly visible in each.
- The discs merge into a towering circular plane of deep water behind him. Tobin leans close as if hearing a secret, eyes widening once, then answers with one calm nod.
- He closes his hand. The water plane folds forward into crushing concentric currents around all enemies, leaving dark-blue pressure rings and exposed pale fault-lines.
- Gameplay read: major enemy ATK reduction plus increased damage taken. Do not turn it into a tsunami damage spell or cheerful splash attack.

### Hit

- 4-6 frames. A startled shoulder recoil and one involuntary step, with the nearest orb splashing into a brief shield.
- His face shows surprise before resolve. No comic flailing.

### Stagger / Flinch

- 6-8 frames. Tobin drops to one hand or knee as all three orbs lose shape and splash toward the ground.
- He shields his head with a rolled sleeve, then looks urgently for the water. Do not make him disappear inside the coat.

### Victory

- 8-12 frames; hold final pose until exit.
- Tobin straightens his oversized collar, tries to look professionally composed, then one orb shows the defeated enemy and he permits a small proud smile.
- The three orbs settle like patient moons. No jumping celebration.

### Defeat

- 8-12 frames; non-looping, hold last frame and despawn only when battle rules call for it.
- The orbs spill harmlessly as Tobin sinks into a seated/kneeling pose, coat pooling around him. He remains visible, breathing, one hand resting in the water.
- Never depict drowning, crystallization, or death.

## VFX palette and shape language

- Deep tide blue `#174C73`
- Clear ocean blue `#2E91C4`
- Bright aqua `#65D8E8`
- Foam highlight `#D8FAFF`
- Prophetic deep indigo `#28345F`
- Intent/fault-line accent `#A7F4FF`
- Shapes: perfectly still discs, circular ripples, suspended droplets, thin current-lines, water lenses. Avoid ice crystals, lightning, generic blue fire, and Hollowglass teal fractures.

## Hard prohibitions and QA

- No frame-to-frame zoom, camera shake, baseline drift, left/right slide, body resizing, or changing child proportions.
- No adult height, long legs, broad adult shoulders, seductive styling, or toddler/chibi mascot anatomy.
- Exactly three water orbs in equipped ordinary frames; never duplicate, lose, or randomly resize them.
- Do not obscure his face with water, coat sleeves, or effects.
- Keep all body pixels fully opaque; VFX remains a separate synchronized layer where possible.
- Maintain generous transparent safety padding. Effects may exceed the body canvas through separate atlases; never shrink Tobin to fit a large Burst.
- First and last idle/move frames must align at the same feet anchor and center of mass.

