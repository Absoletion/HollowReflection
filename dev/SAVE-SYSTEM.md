# Hollow Reflections — Save System v0.9

## Player-facing behavior

- Hollow Reflections uses one canonical local save profile.
- The profile is loaded automatically when the app opens.
- Changed state is written automatically every 1.5 seconds when needed.
- The app also forces a save when it is hidden, closed, or returned to a hub screen.
- The title screen displays save identity, last-save time, story progress, library progress, and account-link status.
- Players can export the complete save as JSON and import that backup on another installation.
- Erasing the save requires an explicit confirmation.

## Persisted state

The save includes Gold, Guild Sigils, cosmetic ranks, owned units, the ordered active-party formation, unit level/experience/rarity, Challenge materials, evolution unlocks, Unit Library discoveries, story progress, Hale's awakened state, the last hub screen, and combat preferences such as Auto Skill, Auto Arts, Auto Burst, and visual playback speed.

Transient presentation state—open menus, battle timers, temporary combat HP, animation state, and the hidden developer click counter—is not saved.

## Version survival

The stored envelope has a schema version independent of the visible game version. Every load passes through migration and validation before it reaches gameplay. Missing fields receive safe defaults, unknown roster/library identifiers are discarded, numeric values are clamped, and older Hale awakening flags migrate into the current rarity and library records.

The v0.9 additions are backward compatible: saves without Gold or unit XP load both values at zero, while max-level units cannot retain unusable overflow XP. Malformed local data is copied to a timestamped recovery key before a clean save is created. A save created by a newer unsupported schema is never overwritten.

## Account linking

The save envelope already reserves a stable save ID and an `accountLink` record. Actual account linking and cloud recovery are not active because the standalone build has no authentication provider or server-side save service. The title screen reports this honestly as “Not linked.”

When a backend is selected, it should authenticate the player, bind the stable save ID to the account, upload encrypted/versioned envelopes, resolve revision conflicts, and provide recovery without changing the local gameplay state schema.
