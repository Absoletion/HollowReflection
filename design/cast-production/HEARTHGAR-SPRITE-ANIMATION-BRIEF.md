# Hearthgar, the Ember-Golem — Sprite and Animation Production Brief

Status: canonical pre-generation brief. Hearthgar is a bonded teenager inside a golem suit; the suit is part of his persistent character silhouette and must remain in the weaponless master.

## Canonical evidence

- `hollowing-roster.md`: a hulking matte-black iron ember-golem with deep-red furnace light in its cracks and a scrawny teenager's nervous eyes visible through the visor. The armor means its promise even when his voice shakes.
- `hollowing-roster.md`: he survived by sleeping inside a derelict furnace-golem and woke bonded to it. His mechanical identity is pain converted into party protection, distinct from retaliation-first tanks.
- `design/CHAPTER-1-OUTLINE.md`: Hearthgar apologizes repeatedly when the suit bumps the dinner table, hides from a construct while “standing guard,” worries his furnace cannot handle a Burst, and is deeply moved that Aldric repaired it while he slept.
- `design/CHAPTER-2-OUTLINE.md`: he tries too hard to sound relaxed and says “normal” repeatedly. Fear is explicit; standing anyway is his courage.
- `design/CHAPTER-3-OUTLINE.md`: his bulk naturally makes him the rearguard. Across later chapters, increasingly frightening scenes should make his eyes anxious while his body remains between danger and the party.
- `dev/engine-dev.js`: 4-star Fire Defender. Passive `Stoked` builds Cinders when hit; Skill `Brace the Hearth` intercepts attacks; Arts `Bank the Coals` consumes Cinders for party shields; Burst `Open the Furnace` taunts and retaliates.
- `dev/story-registry.js`: starter/core-party protector whose nervous speech contrasts his enormous armored presence.

## Personality translated into motion

Hearthgar's armor is intimidating; Hearthgar is not. His motion should always show a half-beat of uncertainty followed by commitment. He checks allies, braces too early, flinches inside impacts, and then refuses to yield. Do not animate him as a rage monster, confident knight, robot, or bumbling coward. The emotional thesis is: scared, standing, protecting.

## Scale and reference lock

- Canvas: 256x256 transparent RGBA.
- Height band: **large/tall armored unit, 204-208px visible height**, top of suit to soles.
- Anchor: center x=128; feet locked at y=238.
- Neutral width: 92-112px; braced combat width may reach 132px before separate VFX. He is the largest initial-cast body silhouette.
- Maintain the same face/pixel-detail density as Cinnia. Apparent size comes from suit height, broad furnace torso, pauldrons, and huge gauntlets—not realistic micro-head proportions.
- The bonded ember-golem suit remains in the front “weaponless” reference. No handheld weapon is added. His protected teen face is represented only by two nervous human eyes in the visor slit; never show an empty robot face or a full exposed adult head.

## Front-facing weaponless 256x256 reference prompt

> Create a full-body, perfectly front-facing, weaponless anime pixel character master for Hearthgar, a nervous teenage boy permanently bonded inside a hulking Fire-element ember-golem suit for a fantasy gacha action RPG. Use a 256x256 transparent canvas. Center the suit at x=128, feet anchored at y=238, with 206 pixels visible height from armored crown to soles. Match the crisp pixel clusters, selective dark outlines, compact anime readability, and material rendering of the approved refreshed Cinnia reference. The silhouette is a towering broad furnace-golem in matte black iron with dark gunmetal edges, massive rounded pauldrons, oversized protective gauntlets, thick greaves, and a deep armored torso built around a sealed furnace door. Narrow cracks and vents glow deep red and ember orange. Through a slim visor slit, show only a scrawny teenager's nervous human eyes, large and expressive enough to read at sprite scale. The armor is old, repaired, and practical, with a few careful brass replacement seals that imply someone maintains it. Symmetrical straight-on neutral stance, both empty gauntlets visible and slightly separated, exactly two arms and two legs. No axe, sword, shield, handheld weapon, flames, aura, smoke, ground shadow, scenery, text, watermark, exposed adult face, robot eyes, realistic tiny head, three-quarter rotation, duplicated armor, or cropped feet.

## Equipped combat state

- Direction: authored southwest three-quarter view, facing screen-left.
- No external weapon. His gauntlets, shoulder plates, furnace core, and planted body are the combat equipment.
- Battle stance: lead foot forward, knees flexed, one open gauntlet extended toward allies as a barrier, rear fist near the furnace. He occupies space deliberately despite anxious eyes.
- Furnace vents glow at a low idle. Five discrete Cinder indicators sit around the core/upper torso and illuminate one at a time as stacks accrue.
- Preserve suit dimensions, visor-eye placement, furnace-door construction, repair patches, and Cinder locations across every animation.

## Animation set

### Idle — Scared, still standing

- 8-frame loop at 7-8 fps.
- Feet, camera, and armor mass remain fixed. Furnace glow rises and falls like slow breathing.
- Hearthgar's eyes flick briefly toward the party, then back to the enemy. One gauntlet tightens by a pixel; a shoulder vent gives one restrained ember.
- Armor should feel extremely heavy without bobbing. No bored swaying or roaring.

### Move — Protective rearguard advance

- 8-frame loop at 9-10 fps.
- Heavy, deliberate screen-left steps with readable heel-to-toe weight transfer. Torso stays between enemy and party.
- Opposite gauntlet remains slightly extended as if shepherding allies behind him; vents puff only on footfalls.
- Avoid repeated leg positions, limp-like timing, ground sliding, exaggerated stomping comedy, or camera shake baked into frames.

### Skill — Brace the Hearth

- 12-16 frames in `step-in` and `brace` phases if needed.
- Hearthgar sees an ally threatened, gives one visible flash of alarm, then lunges one heavy step across their line.
- He plants both feet, lowers his center, crosses one gauntlet before the furnace and spreads the other arm as a wall. Armor locks click from boots upward.
- A compact red-orange barrier plane forms behind his arm and in front of the party; incoming direction is clearly intercepted toward him.
- Gameplay read: taunt/guarded redirect for one cycle. This is protection, not a punch or self-only guard.

### Arts — Bank the Coals

- 16-24 frames in `gather` and `shield` phases.
- Lit Cinder indicators detach as ember motes in an exact count matching current stacks and spiral into the furnace core.
- Hearthgar presses both palms to the furnace door and visibly strains; vents seal, glow compresses to near-black, then releases outward as one broad heat-ring.
- The heat-ring divides into individual ember-edged shields around each living ally. Hearthgar's core returns to its low idle and Cinder indicators extinguish.
- Gameplay read: consumes accumulated pain to protect the entire party. Never imply healing or fire damage.

### Burst — Open the Furnace

- 24-36 frames in three phases: `fear`, `open`, `answer`.
- Brief close acting beat without camera zoom: his eyes widen and he checks the allies behind him. He plants harder and chooses to stay.
- Chest locks release in sequence; the furnace door opens into a white-hot orange core bounded by black iron. A towering heat silhouette rises behind him like a protective giant, not a demon.
- He spreads both arms and draws every enemy's attention with a concussive furnace roar. Each anticipated hit produces a short retaliatory ember arc from the open core toward the attacker.
- End in a sustained open-furnace defensive pose, ready to take hits; runtime retaliation VFX can repeat independently without looping the whole Burst.
- Gameplay read: all-enemy taunt plus retaliation. Rule-of-cool scale is encouraged through separate full-stage effects.

### Hit

- 4-6 frames. The suit takes the blow squarely; armor compresses by 1-2px, one foot digs in, and exactly one new Cinder indicator ignites.
- Eyes flinch, then refocus. Do not make ordinary hits throw the two-ton suit backward.

### Stagger / Flinch

- 6-9 frames. A severe impact drives Hearthgar to one knee; one gauntlet catches the ground while the other stays between danger and the party.
- Furnace sputters but does not change size or detach. He begins pushing upright in the final frames.

### Victory

- 10-14 frames; hold final pose until battle exit.
- Hearthgar remains braced for one extra beat, realizes the danger is over, then vents a relieved puff. His eyes soften as he turns slightly to check the party and gives an awkward small thumbs-up with an enormous gauntlet.
- The humor comes from scale contrast, never from falling over or damaging the environment.

### Defeat

- 10-14 frames; non-looping and hold last frame.
- Hearthgar uses his remaining strength to kneel facing the enemy, one arm still forming cover. The furnace dims from orange to deep red; his eyes remain visible and conscious behind the visor.
- Never explode the furnace, eject the teenager, show a corpse, or collapse him backward onto allies.

## VFX palette and shape language

- Matte iron `#17191D`
- Gunmetal `#343840`
- Banked coal red `#5E1717`
- Furnace crimson `#A5271F`
- Ember orange `#EF6A24`
- White-hot core `#FFE2A1`
- Repair brass `#9B713A`
- Shield edge `#FF9A42` fading into smoke-dark transparent interiors
- Shapes: furnace rectangles/arches, riveted planes, concentric heat distortion, coal motes, heavy semicircular shields. Avoid holy-gold light, magma-rock skin, teal Hollowglass, cute robot icons, and uncontrolled wildfire.

## Hard prohibitions and QA

- No frame-to-frame zoom, camera motion, baseline drift, body scale change, armor-part duplication, or changing furnace geometry.
- No realistic tiny head. The visor and eyes must remain readable at combat scale while preserving the giant suit silhouette.
- No external shield or weapon unless later canon explicitly adds one. His body is the wall.
- Cinder count must be authored/runtime-driven from zero to five; no random extra embers presented as stack indicators.
- Keep full pauldrons, gauntlets, feet, and braced arm inside the body canvas with generous padding. Full-stage Burst heat belongs to separate VFX canvases.
- Suit movement is heavy but not slow-motion boredom. Anticipation should be brief; commitment should be decisive.
- First and last loop frames must share feet anchor, furnace center, visor position, and silhouette scale.

