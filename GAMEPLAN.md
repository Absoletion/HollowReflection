# Hollow Reflection: Gameplan to v1.0

**Baseline:** main @ `a97b5de` (v0.47.0), remediation in flight on `integration/v0.48-remediation`
**Date:** 2026-07-18
**Locked decisions:** Four-unit parties are canonical. Finish line is the full 10-chapter story vision.

---

## Canonical decisions (amendments to the playbook)

1. **Party size: FOUR active combat units.** This overrides the playbook's five-unit recommendation. Main already enforces `PARTY_SIZE = 4`. Downstream corrections:
   - HR-015: Chapter 6 picker becomes Hale locked plus **three** owned picks. Fix the "Choose the Five" copy.
   - HR-027: encode four everywhere. Title, party editor, story builders, training copy, tutorials, encounter validator.
   - Audit any playbook acceptance test that says "exactly five units enter the battle."
2. All other playbook canonical decisions stand: live combat, STORY_REGISTRY authority, commit-before-apply, durable idempotency markers, summon gate after act1_9.
3. Update the playbook file itself with amendment #1 before Wave 2 starts, so no agent implements five-unit logic from the stale text.

---

## Current verified state (not aspirational)

Merged into `integration/v0.48-remediation`:

- Wave 0 contract doc
- HR-002 one-time legacy migration (partial Wave 1A, ~43 lines)
- Wave 1B UI runtime fixes
- Wave 1C CI gates

**Not started anywhere:** `completeMission`, `featureUnlocks`, `commitGameStateResult`, durable reward markers, encounter-identity validation (the core of Wave 1A). No branches for Waves 2, 3, 4, or 5.

**Critical path:** Wave 1A remainder. Every later phase builds on transactional mission settlement. Do not start Wave 2 story work until `completeMission` exists and is tested.

---

## Phase 0 — v0.48: Finish the remediation (current work)

Complete the playbook waves in order. This phase is done when the playbook's release acceptance matrix passes.

1. **Wave 1A remainder** (state integrity): `completeMission`, `commitGameStateResult`, durable `storyRewards` markers, encounter/battle-ID validation for Challenges, UUID transaction IDs. HR-004, 011, 012, 013, 019, 025, 026.
2. **Wave 2** (story authority): remove playable STEPS path, Home Continue from registry, `featureUnlocks` with summon gate, owned-plus-guest party builder, Chapter 6 picker at four units. HR-003, 005, 007, 008, 009, 010, 015, 018, 028, 050.
3. **Wave 3** (combat progression): profile-aware `newBattle`, level/star scaling, shared stat calculator for UI and battle, Cinnia Ascension honesty pass. HR-006, 014, 046, 049.
4. **Wave 5-lite** (release hygiene for v0.48): dev/prod build split, strip the Sigil cheat from prod, docs reconciliation, archive legacy files. HR-037, 041–045, 048.

Defer Wave 4 content (Chapter 4 authoring, side missions) into Phase 1. Fixing state while authoring content on top of it is how regressions happen.

**Exit criteria:** fresh profile navigates all tabs with zero errors; one clear advances one mission; rewards are atomic and idempotent; levels affect combat; `pnpm verify` and browser CI green from a clean clone.

---

## Phase 1 — v0.49–v0.50: Chapters 1–4 as a complete game

Make the existing scope feel finished before expanding it.

- **Chapter 4 authoring** (HR-031, 032): authored scenes for 4A/4B, protected-NPC encounter component for the rescue objective, Garrick recruitment implemented per the outline (he is in the Ch 4 cast list; build him as a real unit).
- **Side missions** (HR-033): Missing Caravan and A Cook's Errand through `completeMission`.
- **Economy close-out**: Glass Dust sink (HR-034), summon/market telemetry (HR-035), Nix banner policy decision encoded in data (HR-036).
- **Combat readability**: status popups/icons from typed events (HR-029), passive parity registry with CI classification (HR-030).
- **Balance pass**: with levels finally affecting combat, re-run summon and pacing simulations; tune Chapters 1–4 difficulty against leveled four-unit parties.

**Exit criteria:** no fallback dialogue in any live mission, no Coming Soon screens, no dead currencies, all passives classified. v0.50 is a game you could hand to someone.

---

## Phase 2 — v0.51–v0.60: Chapters 5 and 6, the mid-game arc

- **Design first**: write CHAPTER-5-OUTLINE.md and CHAPTER-6-OUTLINE.md at the quality of the Ch 4 outline. The legacy STEPS Chapter 6 content is reference material, not a spec.
- **Rebuild Ch 5–6 on the registry**: the legacy finale (squad picker, Hale awakening) becomes canonical registry missions with authored scenes.
- **Hale forced UnHollowed evolution** in Chapter 6 as a real combat-profile change, not a flag.
- **Cinnia's unique 5-star kit** (the deferred half of HR-014): design and implement the evolved kit the Ascension currently only implies.
- **New cast wave 1**: whatever units Ch 5–6 introduce. Budget roughly 70 runtime frames per unit through the PixelLab pipeline (initial cast averaged ~70).
- **Infrastructure gate, mandatory before this phase ships:** asset splitting and lazy loading (HR-038). The standalone is already 44 MB with a 34 MB sprite bundle at 10 units. Chapter-based sprite packs with lazy load, plus Git LFS for masters. At 10 chapters the monolith approach will not survive; pay this cost now while the asset count is still small.

**Exit criteria:** Ch 1–6 playable end to end as a coherent arc with a true climax; initial load within a defined budget on your actual phone.

---

## Phase 3 — v0.61–v0.90: Chapters 7–10, the full vision

The long pole. Structure it as one chapter per milestone, each shipped playable.

- **Design runway**: outline Ch 7–10 before implementing Ch 7. The seeds exist (Lowing Man in Ch 7, Glasswright's perspective as "Ch 10's problem", the Hollow Mirror, Aldric's fate). Resolve them on paper first so foreshadowing lands in the right chapters.
- **Per-chapter loop** (repeat 4 times): outline locked → encounters and any new mechanic component built and tested → new units/enemies through sprite pipeline → authored scenes → balance sim → chapter sprite pack → `pnpm verify` plus device check.
- **Boss engineering**: Glasswright and Hollow Mirror fights deserve bespoke mechanics. Build each as a tested reusable component, same pattern as the protected-NPC work in Phase 1.
- **Endgame systems** (pick conservatively, this is a personal game): post-story Challenge tiers reusing existing bosses, and a Glass Dust exchange refresh. Resist inventing new currencies.
- **Content scale estimate**: Ch 1 has 10 missions; registry currently has 32 across four chapters. Six more chapters at 7–10 missions each lands v1.0 near 75–90 missions, roughly 2.5x current encounter count and likely 8–15 new units/enemies with full sprite sets. Art production, not code, is the bottleneck; keep the PixelLab queue running ahead of implementation.

**Exit criteria per chapter:** no fallback scenes, validator green, chapter pack within asset budget, playable on device.

---

## Phase 4 — v1.0: Completion hardening

- Full release acceptance matrix re-run across all 10 chapters, including legacy-save migration from every schema version you ever saved.
- Performance pass on target device: cold load, battle memory, repeat-battle leaks.
- Final documentation truth pass (HR-043 discipline): one canonical spec set, everything else archived.
- Prod build with cheat/test surfaces stripped; tag v1.0.0.

---

## Standing rules (all phases)

1. **State before story, story before content, content before polish.** Never author reward-bearing content on unfixed settlement code.
2. **Every reward-bearing change goes through one transactional GameState command.** No exceptions, including side missions and endgame.
3. **The playbook's branch discipline continues past v0.48**: integration branch per version, scoped agent branches, PRs gated by `pnpm verify` and browser CI, protected main.
4. **Design docs are written before implementation and archived when superseded.** The HR-043 drift is how the four-vs-five party contradiction happened.
5. **Ship playable at every milestone.** Each version boundary is a complete game at its scope. If you stop at v0.60, you still have a finished six-chapter game.

## Immediate next actions

1. Amend the playbook: four-unit canonical decision, corrected HR-015/027 remediations and acceptance tests.
2. Finish Wave 1A on `fix/v048-state-integrity` (completeMission, commitGameStateResult, durable markers, encounter validation, UUIDs).
3. Merge 1A to integration, then open `fix/v048-canonical-story` for Wave 2.
4. Add this file to the repo root so agents plan against it.
