# Hollow Reflections

Standalone anime pixel-art gacha RPG prototype with live combat, persistent progression, story missions, Challenges, Market, and Summoning.

## Run locally

```powershell
pnpm build
```

Open `hollowing-demo.html` after the build completes. It is disposable build output and is not tracked in Git.

## Verification

```powershell
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm verify
```

`pnpm verify` runs the content, engine, state, stage, renderer, PixelLab, legacy sprite, summon, standalone, runtime-art, and browser gates.

The raw PixelLab generation workbench, splash-art masters, and historical art rounds are intentionally excluded from Git. The approved runtime bundles live in `generated/pixellab-sprites.js` and `assets/splash-art-runtime/`, so the default art audit works from a clean clone. Contributors with the private splash-art masters can additionally run `pnpm verify:art:masters` after building.
