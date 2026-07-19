'use strict';

const ChallengeData = (function () {
  const items = Object.freeze({
    hollowglass_shard: 'Hollowglass Shard',
    beastheart_core: 'Beastheart Core',
    challenge_essence: 'Challenge Essence',
    ember_challenge_crest: 'Ember Challenge Crest',
    feastkeeper_seal: "Feastkeeper's Seal",
  });
  const challenges = Object.freeze({
    ember_trial: {
      id: 'ember_trial', name: 'Ember Trial', encounterId: 'challenge_ember',
      description: 'Break an ember-fed construct before it overwhelms the line.',
      unlock: { mission: 'act1_10' },
      firstClear: { gold: 250, items: { ember_challenge_crest: 1, challenge_essence: 4 } },
      repeatClear: { gold: 250, items: { challenge_essence: 4 } },
      mastery: [{ id: 'no_defeats', name: 'Unscorched', evaluator: 'no_defeats', reward: { challenge_essence: 2 } }],
    },
    feastkeeper_trial: {
      id: 'feastkeeper_trial', name: 'Feastkeeper Trial', encounterId: 'challenge_feastkeeper',
      description: 'Endure the Feastkeeper and deny it a final course.',
      unlock: { challenge: 'ember_trial' },
      firstClear: { gold: 300, items: { feastkeeper_seal: 1, challenge_essence: 5 } },
      repeatClear: { gold: 300, items: { challenge_essence: 5 } },
      mastery: [{ id: 'no_burst', name: 'Measured Heat', evaluator: 'no_burst', reward: { challenge_essence: 2 } }],
    },
  });
  return Object.freeze({ items, challenges });
})();

if (typeof module !== 'undefined') module.exports = ChallengeData;
