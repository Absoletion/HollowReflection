'use strict';

const EncounterComponents = (function () {
  const definitions = Object.freeze({
    fracture: Object.freeze({ id: 'fracture', description: 'Changes behavior and gains power below a health threshold.', defaults: Object.freeze({ threshold: 0.5, attackMultiplier: 1.25 }) }),
    echo: Object.freeze({ id: 'echo', description: 'Repeats a previously telegraphed action after a delay.', defaults: Object.freeze({ delayCycles: 1 }) }),
    glass_ward: Object.freeze({ id: 'glass_ward', description: 'Creates a barrier that is efficiently removed by Break damage.', defaults: Object.freeze({ shield: 180, breakMultiplier: 2 }) }),
    contagion: Object.freeze({ id: 'contagion', description: 'Applies a spreading debuff that can be cleansed or interrupted.', defaults: Object.freeze({ duration: 3, spreadAfter: 1 }) }),
    hollow_call: Object.freeze({ id: 'hollow_call', description: 'Summons or empowers lesser Hollowed enemies.', defaults: Object.freeze({ summonKey: 'calf', summonCount: 1 }) }),
    protected_npc: Object.freeze({ id: 'protected_npc', description: 'Battle fails if the protected objective reaches zero HP.', defaults: Object.freeze({ hp: 500 }) }),
  });
  function normalizeComponent(value) {
    if (typeof value === 'string') value = { id: value };
    if (!value || typeof value !== 'object') throw new Error('Encounter component must be an object or id string.');
    const definition = definitions[value.id];
    if (!definition) throw new Error(`Unknown encounter component: ${value.id}`);
    return Object.freeze({ ...definition.defaults, ...value, id: definition.id });
  }
  function normalizeList(values) { return Object.freeze((values || []).map(normalizeComponent)); }
  return Object.freeze({ definitions, normalizeComponent, normalizeList });
})();

if (typeof module !== 'undefined') module.exports = EncounterComponents;
