# Hale 4★ Visual Slice v0.11

## Integrated artwork

- `portraits/hale_awakened.webp`: transparent awakened dialogue and unit-sheet portrait.
- `portraits/hale_awakened_library.webp`: dedicated close portrait for Hale's unlocked 4★ Unit Library page.
- `cutins/hale_awakened.webp`: wide Arts/Burst cut-in. Cut-ins use a separate embedded asset map and cannot replace battle-body artwork.

The runtime build embeds these files as data URLs so the project remains a standalone HTML application.

## Behavior

- Dialogue automatically uses the awakened portrait after Hale's permanent Chapter Six evolution.
- Hale's unlocked 4★ Library page uses the dedicated high-resolution portrait while locked pages remain silhouettes.
- The unit detail sheet uses the transparent awakened portrait.
- Hale's awakened Arts and Burst actions display the wide key-art cut-in; other units retain the existing Burst fallback.
- The first Chapter Six clear presents a full-screen 3★ → 4★ story-awakening reveal before the victory dialogue.
- Replays and migrated saves do not repeat the permanent evolution reveal.

## Battle rig

The generated rig-parts atlas was converted into individual transparent WebP components and assembled by the canvas stage renderer. Awakened Hale now uses independent cape, lower-body, torso, arms, hands, head, and sword transforms for idle, attack, cast, hit, and defeat states. The existing awakened pixel sprite remains an automatic fallback until every painted texture has loaded or if a part is unavailable.

This is a custom in-game canvas rig, not a Spine/Live2D project. The source generation still lacks artist-painted hidden overlaps and ideal joint caps, so future art refinement can replace individual components without changing the animation API.
