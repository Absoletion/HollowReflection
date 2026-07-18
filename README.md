# Hollow Reflections

Standalone anime pixel-art gacha RPG prototype with live combat, persistent progression, story missions, Challenges, Market, and Summoning.

## Run locally

```powershell
node dev/build-mobile.js
```

Open `hollowing-demo.html` after the build completes.

## Verification

```powershell
node dev/tests-dev.js
node dev/game-state.test.js
node tools/summon-simulation.js
node dev/build-mobile.js
node tools/validate_standalone_update.js hollowing-demo.html
node tools/browser-smoke.js
```

The raw PixelLab generation workbench and historical art rounds are intentionally excluded from Git. The approved runtime sprite bundle lives in `generated/pixellab-sprites.js`.
