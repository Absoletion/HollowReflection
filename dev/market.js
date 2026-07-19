'use strict';

const MarketData = (function () {
  const items = Object.freeze({
    training_manual: {
      id: 'training_manual', name: 'Guild Training Manual', price: 500, limit: 3,
      description: 'Immediately grants 300 XP to one owned unit.', effect: { xp: 300 },
    },
    essence_bundle: {
      id: 'essence_bundle', name: 'Challenge Essence Bundle', price: 800, limit: 1,
      description: 'Emergency evolution smoothing. Requires an Ember Trial clear.',
      unlock: { challenge: 'ember_trial' }, effect: { item: 'challenge_essence', quantity: 2 },
    },
    glassdust_sigils: {
      id: 'glassdust_sigils', name: 'Hollowglass Exchange', price: 1, limit: 5,
      description: 'Trade 10 Glass Dust and 1 Gold for 15 Guild Sigils.', effect: { dust: 10, sigils: 15 },
    },
  });
  return Object.freeze({ items });
})();

if (typeof module !== 'undefined') module.exports = MarketData;
