'use strict';

const PassiveRegistry = Object.freeze({
  hale: { id:'relentless_pursuit', name:'Relentless Pursuit', classification:'exact', hook:'shared_damage_multiplier', test:'tests-dev.js: low-HP Hale passive' },
  cinnia: { id:'seconds', name:'Seconds', classification:'exact', hook:'overheal_resolution', test:'tests-dev.js: Cinnia overheal' },
  tobin: { id:'still_water', name:'Still Water', classification:'exact', hook:'intent_preview', test:'tests-dev.js: intent visibility' },
  marlowe: { id:'flourish', name:'Flourish', classification:'exact', hook:'shared_damage_multiplier', test:'tests-dev.js: sequencing coverage' },
  brant: { id:'deadweight', name:'Deadweight', classification:'approximate', hook:'break_damage_floor', test:'tests-dev.js: break coverage' },
  nix: { id:'bedside_manner', name:'Bedside Manner (Terrible)', classification:'exact', hook:'heal_multiplier', test:'tests-dev.js: healing coverage' },
  brigga: { id:'short_fuse', name:'Short Fuse', classification:'exact', hook:'break_damage_multiplier', test:'tests-dev.js: break coverage' },
  hearthgar: { id:'stoked', name:'Stoked', classification:'exact', hook:'hit_reaction_mitigation', test:'tests-dev.js: tank coverage' },
  milla: { id:'never_late', name:'Never Late', classification:'exact', hook:'energy_threshold', test:'tests-dev.js: energy coverage' },
  katie: { id:'lead_apron', name:'Lead Apron', classification:'approximate', hook:'battle_start_shield', test:'tests-dev.js: Katie shield coverage' },
});

if (typeof module !== 'undefined') module.exports = PassiveRegistry;
