# Hollow Reflections — Unit Library v0.6.1

The Unit Library is a permanent discovery record separate from the player's current owned roster.

## Discovery rules

- Every roster character has a base-form page.
- Undiscovered pages appear as black silhouettes with their names and details hidden.
- A base page unlocks the first time the player owns that character.
- Removing a character from the active roster does not remove their discovered page.
- Each designated evolved or awakened form has its own page and its own discovery state.
- A form page unlocks when that evolution or awakening occurs, not merely when the base unit is acquired.

The current library contains twelve pages: nine base units, Hale's 4★ Hollowglass Awakening, Hale's undesigned future 5★ form, and Cinnia's planned 5★ Battle-Cook Awakening.

Hale's 4★ page unlocks at the exact Chapter Six transformation event. His 5★ page and Cinnia's 5★ page remain silhouetted until those future evolutions are implemented and earned.

## State boundary

`libraryUnlocked` stores discoveries independently from `owned`. Code that grants a new unit records its base page immediately, while evolution code records the corresponding form page. Neither operation ever removes an existing discovery.

This discovery state is included in the single versioned autosave profile. It survives browser refreshes, app restarts, roster removal, save export/import, and compatible version migrations.
