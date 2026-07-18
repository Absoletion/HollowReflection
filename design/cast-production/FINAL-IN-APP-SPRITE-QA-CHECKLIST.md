# Final In-App Sprite QA Checklist

**Build under review:** `hollowing-demo.html`  
**Scope:** Tobin, Hearthgar, Brigga, Marlowe, Brant, Milla, and Nix  
**Promotion rule:** do not copy this build into the live `Gacha Game` folder until every applicable item below passes.

## 1. Unit Library preview

Open one unit at a time. The preview must display only the selected unit and only the selected animation.

For every listed animation:

- [ ] The preview starts from the correct unit and form.
- [ ] The character reads toward screen-left. Tobin is the documented legacy South-facing exception.
- [ ] Scale remains stable from first frame through recovery.
- [ ] Feet and body anchor do not drift, jump, or cause a camera-like zoom.
- [ ] No adjacent-frame bleed, hard canvas-edge contact, clipped weapon, disappearing body part, or transformed equipment.
- [ ] Skill, Arts, and Burst previews include their complete authored effects.
- [ ] Effects may exceed the character silhouette without resizing or moving the character.
- [ ] Victory reaches and holds its terminal pose.
- [ ] Defeat reaches and holds its terminal pose rather than looping or standing back up.
- [ ] Attack is not shown as a duplicate menu entry when it is byte-identical to Skill.

### Tobin — Tide-Reader

- [ ] Idle
- [ ] Move
- [ ] Dampen — Skill
- [ ] Read the Currents — Arts
- [ ] The Tide Confides — Burst
- [ ] Hit
- [ ] Stagger
- [ ] Victory
- [ ] Defeat

Personality read: quiet certainty, patient water motion, child stature, no frantic casting.

### Hearthgar — Ember-Golem

- [ ] Idle
- [ ] Move
- [ ] Brace the Hearth — Skill
- [ ] Bank the Coals — Arts
- [ ] Open the Furnace — Burst
- [ ] Hit
- [ ] Stagger
- [ ] Victory
- [ ] Defeat

Personality read: fear remains visible before he commits; every defensive action becomes planted, brave, and protective.

### Brigga — Demolitionist

- [ ] Idle
- [ ] Move
- [ ] Kegcracker — Skill
- [ ] Blast Mining — Arts
- [ ] Grand Opening — Burst
- [ ] Hit
- [ ] Stagger
- [ ] Victory
- [ ] Defeat

Personality read: deliberate geological measurement followed by confident, precisely placed demolition.

### Marlowe — Foppish Blade

- [ ] Idle
- [ ] Move
- [ ] Riposte Stance — Skill
- [ ] Coup de Grâce — Arts
- [ ] Curtain Call — Burst
- [ ] Hit
- [ ] Stagger
- [ ] Victory
- [ ] Defeat

Personality read: theatrical control backed by real fencing skill; Curtain Call must read as exactly five committed contacts.

### Brant — Anchor

- [ ] Idle
- [ ] Move
- [ ] Anchor Drop — Skill
- [ ] Keelhaul — Burst
- [ ] Hit
- [ ] Stagger
- [ ] Victory
- [ ] Defeat

Brant intentionally has no Arts animation. Personality read: weight, restraint, rope tension, and absolute stops rather than flourish.

### Milla — Courier

- [ ] Idle
- [ ] Move
- [ ] Hand-Off — Skill
- [ ] Express Route — Arts
- [ ] Special Delivery — Burst
- [ ] Hit
- [ ] Stagger
- [ ] Victory
- [ ] Defeat

Personality read: urgent optimism and exact delivery timing. Idle must not walk in place; parcels and satchel must remain consistent.

### Nix — Apothecary

- [ ] Idle
- [ ] Move
- [ ] Bitter Draught — Skill
- [ ] Panacea — Burst
- [ ] Hit
- [ ] Stagger
- [ ] Victory
- [ ] Defeat

Nix intentionally has no Arts animation. Personality read: impatient clinical precision; the mobility chair, tail, medicine rack, and dosing equipment remain mechanically coherent.

## 2. Live-combat presentation

Use the animation test mission or another non-destructive staging encounter.

- [ ] Player units occupy the left side and read toward screen-left according to the current production convention.
- [ ] Enemies occupy the opposing side and face toward the party.
- [ ] Child, dwarf, compact-adult, standard-adult, large-adult, seated-rig, and towering-suit height differences remain visible.
- [ ] Party spacing prevents weapons, bodies, and effects from obscuring adjacent units.
- [ ] Skill reactions remain visible for their full authored duration.
- [ ] Arts and Burst effects do not force camera zoom or resize the acting unit.
- [ ] The combat UI remains usable during large effects.
- [ ] Victory animations finish and hold until the result/exit flow.
- [ ] Defeat animations finish at near-full opacity, then fade/despawn once; they do not loop.
- [ ] Result overlays do not interrupt terminal animations.

## 3. Sign-off record

Record any failure with:

1. Unit and animation.
2. Whether it occurred in Unit Library or live combat.
3. Approximate frame/moment.
4. Screenshot or short recording when possible.
5. Expected result versus observed result.

When every box passes, update each production record’s in-app QA field from `pending` to `passed`, update P8 in `INITIAL-CAST-COMPLETION-MANIFEST.md`, rerun the automated audit suite, and only then consider promotion.
