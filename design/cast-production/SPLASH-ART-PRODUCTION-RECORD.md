# Main Cast Splash-Art Production Record

**Status:** staging first pass, pending direct visual approval in the Unit Library, Party, Summon, and combat portrait layouts.  
**Date:** 2026-07-16  
**Source matrix:** `MAIN-CAST-SPLASH-ART-MATRIX.md`  
**Prompting reference:** `AI_Splash_Art_Prompting_Guide.pdf`, supplied by the user.

## Shared generation controls

- Premium detailed anime-gacha pull art rather than battle-sprite proportions.
- Square crop-safe composition with face and upper torso remaining useful for icons.
- Character-specific line of action, contrapposto, negative space, foreshortening, backdrop, and emotional read.
- Three VFX depth layers and material-aware cast lighting.
- Controlled neutral/material/element hierarchy with a small near-white effect core.
- No title text, checkerboard, logo, watermark, or UI frame.
- Icons use deterministic crops of the same splash master in the runtime. They are not separately regenerated faces.

## Staging assets

| Runtime identity | Splash master |
| --- | --- |
| Hale 4-star, Adventurer | `assets/splash-art/hale_4star_splash_main.png` |
| Hale 5-star, UnHollowed | `assets/splash-art/hale_5star_splash_main.png` |
| Cinnia 4-star | `assets/splash-art/cinnia_4star_splash_main.png` |
| Cinnia 5-star, Flaming Harvest Cook | `assets/splash-art/cinnia_5star_splash_main.png` |
| Katie 5-star | `assets/splash-art/katie_5star_splash_main.png` |
| Tobin 4-star | `assets/splash-art/tobin_4star_splash_main.png` |
| Hearthgar 4-star | `assets/splash-art/hearthgar_4star_splash_main.png` |
| Brigga 3-star | `assets/splash-art/brigga_3star_splash_main.png` |
| Marlowe 4-star | `assets/splash-art/marlowe_4star_splash_main.png` |
| Brant 4-star | `assets/splash-art/brant_4star_splash_main.png` |
| Milla 4-star | `assets/splash-art/milla_4star_splash_main.png` |
| Nix 3-star | `assets/splash-art/nix_3star_splash_main.png` |

## Corrections already applied

### Hale 5-star

The initial pass was rejected because excessive edge ornament made nearly every contour appear rough, and the sword was not physically held. The current staging revision uses broader cel-painted shapes and a continuous sword construction with Hale's closed right-hand grip visibly wrapped around the hilt.

This revision remains subject to direct approval for overall armor sharpness and ornament density.

### Hearthgar

The initial splash exposed too much of the pilot's face. The current revision encloses the teenager in the bonded suit and restricts the identity read to nervous eyes behind the armored visor slit.

### Nix

The initial lower body was undersized. A second pass enlarged the tail but intersected the front glass and formed implausible coils. The current revision uses one substantial adult-mermaid tail in a single readable S-curve, entirely submerged behind a deeper continuous glass tank.

## Runtime integration

- `dev/build-mobile.js` embeds the assets as `SPLASHART`.
- `tools/build_splash_art_runtime.py` preserves the lossless masters and exports optimized 1024×1024 WebP runtime copies under `assets/splash-art-runtime/`.
- `dev/mui1.js` maps each unit/form to its splash and defines deterministic icon crop coordinates.
- Unit Details use the full composed square splash.
- Party, formation editor, Unit Library, Summon results, and live-combat unit cards use face crops from the same source.
- Existing `PORTRAITS` remain available for dialogue and as fallbacks.
- Cinnia's 5-star splash is embedded for future evolution support but is not exposed as a playable form until progression data adds that form.

## Current automated evidence

- Standalone validator: passed.
- Engine self-tests: 158/158 passed.
- PixelLab sprite contracts: passed.
- Standalone splash keys embedded: 12/12.

## Direct visual approval checklist

- Full splash remains centered and useful on the Unit Details page.
- Face crop includes eyes, hair silhouette, and one identity accessory.
- Icons look uniform in scale without forcing identical compositions.
- Summon cards remain legible behind their captions.
- No icon crop is dominated by a weapon, effect core, or empty background.
- Hale 5-star sword grip and armor surface treatment pass user approval.
- Hearthgar's visor reads as two anxious human eyes, not a fully exposed face.
- Nix's tail remains entirely behind the glass and reads as a powerful adult-mermaid lower body.
