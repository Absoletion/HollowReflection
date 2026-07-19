# Hollow Reflection UI Kit implementation

The imported `Hollow Reflection UI Kit.dc.html` is retained as the visual handoff reference. Its Claude Design runtime (`support.js`, `<x-dc>`, and prototype-only loops) is intentionally not shipped in the game.

Implemented in the production demo:

- Still Basin summon banner uses the kit's Featured Reflection treatment, rotating basin rings, chips, and lacquer/glass panel chrome.
- Summon pulls now begin with a ripple/shatter reveal layer before the card flips.
- Shared colors, typography, spacing, and ornament remain driven by the existing mobile shell tokens so the Home, Town, Party, and Battle screens stay consistent.

Future screens should reuse the `hr-kit-*` classes in `dev/part-head-mobile.html` instead of copying prototype markup.
