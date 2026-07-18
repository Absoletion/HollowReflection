# Hollow Reflections - Live Combat v0.47

This replaces the round-based battle screen while retaining the existing unit kits, damage rules, Break system, boss scripts, and story outcomes.

## Cadence

- Units act through player-triggered Skills; there is no recurring basic auto attack.
- Enemies act on their own encounter timer.
- Buffs, regeneration, Guarded cover, and round-authored passives advance on five-second effect cycles.
- Pause opens Continue and Exit Battle options; exiting requires confirmation and grants no rewards.
- Visual playback cycles through 0.5x, 0.75x, 1x, and 1.5x without changing combat timers. The preference persists, and leaving the tab pauses automatically.

## Player commands

- **Skill:** independent recast timer; restores Arts by role (Supporter 60, Healer 50, Attacker/Defender 45, Breaker 35).
- **Art:** costs 200 Arts.
- **Burst:** costs 300 Arts.
- **Guarded:** selected Defender abilities apply this status to allies. Single-target hits are intercepted by the Defender at reduced damage; area attacks are not redirected.
- Each field card exposes Skill, Art, and Burst buttons; selecting a unit still opens its full command tray.
- **Auto tiers:** Skill, Arts, and Burst can be enabled independently and persist between sessions. These toggles determine which actions Auto may consider.
- **Per-unit AI:** Unit Details offers Balanced, Break, Sustain, Burst, and Manual Reserve presets. Each unit scores available actions according to its preset, battlefield health, Break state, cooldowns, and enabled Auto tiers.
- **Gesture commands:** tap the Skill button; swipe a unit upward and release after the Art snap point; drag farther and release after the Burst snap point. Dragging back below the Art point cancels.
- Art and Burst remain available as conventional command-tray buttons for accessibility and precise play.

Both Hale forms now use the standard Arts-energy system. Hale's 4-star kit is purely Dark; Hollow influence begins with his 5-star form.

## AI diagnostics

The live battle keeps the latest 80 Auto decisions, including rejected candidates, scores, target, preset, and final selection. Developers can inspect them with `window.__liveBattle.aiTrace()`.

## Encounter migration

Legacy enemy HP is scaled for live field time, while encounter attack values are tuned separately. Current automated targets are approximately:

- Chapter 1: 34 seconds
- Chapter 2: 34-38 seconds
- Chapter 3 scripted loss: 11 seconds
- Chapter 6 boss: about 69 seconds

The Chapter 6 near-wipe grants one stronger grace pulse, creating enough recovery time for Skill-only combat before the guided finale.

## Identity boundary

The system adopts the readable cadence common to real-time mobile party RPGs, but Hollow Reflections keeps original terminology, interface composition, characters, effects, encounter rules, and visual assets.

## Next combat work

- Complete the passive inventory and parity audit.
- Add an optional visible developer panel for AI traces.
- Give every roster member a finished animated battler.
- Add equipment commands only after the core Skill/Art/Burst cadence is stable.
- Balance all squad combinations through player testing, not simulation alone.
