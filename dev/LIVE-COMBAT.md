# Hollow Reflections — Live Combat v0.8

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
- **Auto modes:** Skill, Arts, and Burst can be enabled independently and persist between sessions. Burst takes priority at full gauge when both special modes are active. Automation pauses during manual gestures and respects battle locks.
- **Gesture commands:** tap the Skill button; swipe a unit upward and release after the Art snap point; drag farther and release after the Burst snap point. Dragging back below the Art point cancels.
- Art and Burst remain available as conventional command-tray buttons for accessibility and precise play.

Hale's awakened form continues to replace Arts with Hollowglass blades. Leech Edge restores one blade each time its cooldown completes. His normal and awakened sprites remain the completed Fable versions.

## Encounter migration

Legacy enemy HP is scaled for live field time, while encounter attack values are tuned separately. Current automated targets are approximately:

- Chapter 1: 34 seconds
- Chapter 2: 34–38 seconds
- Chapter 3 scripted loss: 11 seconds
- Chapter 6 boss: about 69 seconds

The Chapter 6 near-wipe now grants one stronger Hollowglass grace pulse. This creates enough recovery time for Skill-only combat before the guided finale.

## Identity boundary

The system adopts the readable cadence common to real-time mobile party RPGs, but Hollow Reflections keeps original terminology, interface composition, characters, effects, encounter rules, and visual assets.

## Next combat work

- Give every roster member a finished animated battler.
- Add equipment commands only after the core Skill/Art/Burst cadence is stable.
- Add per-unit AI presets and an optional Auto-Arts setting.
- Expand hit-stop, damage numbers, status popups, and telegraph effects.
- Balance all squad combinations through player testing, not simulation alone.
