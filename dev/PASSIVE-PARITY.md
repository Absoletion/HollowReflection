# Passive parity checklist

This table is the source-of-truth audit for unit passives. `Approximate` means the current engine expresses the intended gameplay direction but still needs a dedicated balance/assertion pass. `Cosmetic` means the text is flavor-only until a future mechanic is authored.

| Unit | Passive | Trigger | Engine hook | Exact/Approximate/Cosmetic | Test |
|---|---|---|---|---|---|
| Hale | Relentless Pursuit | Enemy below 50% HP | `dealToEnemy()` | Approximate | `dev/tests-dev.js` combat profile coverage |
| Hale (UnHollowed) | Hollow Sovereignty | Hale HP threshold | `dealToEnemy()` awakened branch | Approximate | `dev/tests-dev.js` awakened combat coverage |
| Cinnia | Seconds | Overheal from a heal | `heal()` adds `regen` | Approximate | `dev/tests-dev.js` heal/regen coverage |
| Tobin | Still Water | Battle intent read | `rollIntents()` / intent UI | Exact | `dev/tests-dev.js` intent coverage |
| Marlowe | Flourish | Allies attack earlier in cycle | `applyFlourish()` | Exact | `dev/tests-dev.js` sequencing coverage |
| Brant | Deadweight | Break damage resistance | `dealBreak()` floor comment | Approximate | `dev/tests-dev.js` break coverage |
| Nix | Bedside Manner (Terrible) | Ally below 30% HP | `heal()` multiplier | Exact | `dev/tests-dev.js` healing coverage |
| Brigga | Short Fuse | Target Break above half | `dealBreak()` multiplier | Exact | `dev/tests-dev.js` break coverage |
| Hearthgar | Stoked | Takes a hit | `dealToPlayer()` cinder increment and mitigation | Exact | `dev/tests-dev.js` tank coverage |
| Milla | Never Late | Ally reaches Arts threshold | `endRound()` / `liveAct()` energy rider | Exact | `dev/tests-dev.js` energy coverage |
| Katie | Lead Apron | Battle start | live battle initialization shield | Approximate | `dev/tests-dev.js` Katie shield scaling coverage |

Any row marked Approximate must receive a focused test before it is promoted to Exact. New passive text must be added here in the same change that adds its engine hook.
