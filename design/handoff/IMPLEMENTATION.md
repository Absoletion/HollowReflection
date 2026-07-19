# Hollow Reflection UI Kit implementation

The imported `Hollow Reflection UI Kit.dc.html` is retained as the visual handoff reference. Its Claude Design runtime (`support.js`, `<x-dc>`, and prototype-only loops) is intentionally not shipped in the game.

Implemented in the production demo:

- Still Basin summon banner uses the kit's Featured Reflection treatment, rotating basin rings, chips, and lacquer/glass panel chrome.
- Summon pulls now begin with a ripple/shatter reveal layer before the card flips.
- Shared colors, typography, spacing, and ornament remain driven by the existing mobile shell tokens so the Home, Town, Party, and Battle screens stay consistent.
- Shared chrome is now applied to the Home ticker, Town panel, party/library cards, quest cards, unit cards, battle action tray, and screen headers.
- Home now carries a featured Hale reflection layer plus event/daily cards, matching the kit lobby hierarchy without adding non-functional navigation.
- Summon now uses a full featured splash card and live pity meter before the existing pull/reveal controls.
- Unit Library now exposes working element filter chips; undiscovered silhouettes remain locked and filtering never removes their records.
- Unit Library now supports live Index, Rarity, and Name sorting alongside the element filters.
- Save/title, reward/evolution, market, dialogue, pause/log, and unit-detail surfaces now share the same lacquer, glass, and silver treatment.

Future screens should reuse the `hr-kit-*` classes in `dev/part-head-mobile.html` instead of copying prototype markup.
