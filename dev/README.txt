Dev pipeline for hollowing-demo.html (ANIME STANDEE build, v4):

ACTIVE PARTS (assembled by dev/build-mobile.js, run from dev/):
- part-head-mobile.html: mobile shell CSS + SVG art (portraits/scenes/icons)
- sprites2/: NEW pixel-battler path — dev/sprites2/<key>.js (SPRITES['key']={w,h,pal,anims,anchor:'feet'}), 64x80,
  authored facing LEFT (party), drawn unflipped via dev/sprites/renderer.js (drawSprite/animFrame). build-mobile.js
  concats every sprites2/*.js (except verify2.js and the _build/_preview subfolders) + renderer.js; if sprites2/ has
  no sprite files it falls back to the dead SPRITES/drawSprite/animFrame shim. Run dev/sprites2/verify2.js to check
  integrity before building.
- battleart/: full-body anime standees <key>.png (see ../battleart-template.md) — glass-token fallback when absent
- cutins/: dedicated wide combat cut-ins keyed by unit/form; these never replace battle-body artwork
- rigparts/: transparent painted body components for canvas skeletal animation
- sprites/: RETIRED pixel pipeline (archive; sprite-viewer still builds from it)
- RENDER PRIORITY (mui3-stage.js drawInner): PAINTED RIG (currently awakened Hale) > PIXEL SPRITE (sprites2, if SPRITES[key].anims.idle exists) > full-body
  BATTLEART image > glass-token fallback. Pixel path skips the breathe scale (idle frames breathe on their own) and
  the hit white-flash overlay (hit frames carry their own flash pixels), but keeps lean rotation + hit jitter.
- engine-dev.js: pure combat, progression, reward, and save-normalization engine
- tests-dev.js: 179 assertions (node + window.runSelfTests()); GameState command tests cover permanent settlement, canonical gates, side missions, and migration.
- mui1.js: hub UI (castle Town, story/reward flow, dialogue, party and unit sheets)
- portraits/: drop <key>.png anime portraits here; build embeds them (see ../portrait-template.md)
- mui3-stage.js: GS-style canvas battle stage — anime standees w/ transform animation, particles, cut-ins (window.__stageFast() for QA)
- mui2-live.js: active live-combat UI (tap Skills, saved Auto Skill, Art/Burst swipe zones, role-based Arts gain, enemy cadence, pause/2x, QA hooks)
- mui2.js: archived round-based battle UI retained for reference
- BUILD MODES: `pnpm build` creates the production standalone (developer cheat and self-test surface omitted). Use `HOLLOW_BUILD=dev pnpm build` for a QA bundle with in-browser self-tests and the hidden test console.

PIXEL FORMAT V1: PIXEL-COMBAT-FORMAT.md and sprites2/unit.schema.json define the canonical 128x128 player-unit canvas,
left-facing direction, (64,116) feet anchor, 192x128 wide-action class, and independent 256x192 effect canvas.
Legacy 64x80 JavaScript-array sprites remain supported while existing units migrate.
TOOLS: sprites2/verify2.js (integrity gate for the new pixel path), sprites/verify.js (legacy integrity), sprites/build-viewer.js -> ../sprite-viewer.html (art inspection), sim-dev.js (legacy boss balance), live-sim.js (live encounter cadence)
SPEC: LIVE-COMBAT.md documents live controls, timing, migration rules, and next combat work.
PROGRESSION: PROGRESSION.md documents star tiers, level caps, evolution eligibility, and future Challenge materials.
TOWN/REWARDS: TOWN-AND-REWARDS.md documents building responsibilities, Gold, quest rewards, and XP.
LIBRARY: UNIT-LIBRARY.md documents permanent discoveries, silhouettes, and separate form pages.
SAVE: SAVE-SYSTEM.md documents the single autosave profile, migrations, transfer backups, and account-link boundary.
HALE VISUAL SLICE: HALE-VISUAL-SLICE.md documents the awakened portrait, Library art, cut-in channel, and story evolution reveal.
HALE RIG: HALE-RIG.md documents the layered canvas prototype, animation states, pivots, and fallback behavior.
LEGACY: part-head.html, part-ui1/2.js, build.js, patch1/2.js (desktop v1)
