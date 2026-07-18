'use strict';
const assert = require('node:assert/strict');
const Engine = require('../dev/engine-dev.js');
const GameState = require('../dev/game-state.js');
let seed = 0x484f4c4c;
const rng = () => ((seed = Math.imul(seed ^ seed >>> 15, 1 | seed) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;
let fourStars = 0;
for (let account = 0; account < 10000; account++) {
  const result = GameState.performSummon(Engine.normalizeSaveState({ sigils: 90, storyStep: 1 }), 'standard', 10, rng, { transactionId: `sim:${account}` });
  assert(result.ok && result.rewards.length === 10);
  assert(result.rewards.some(x => x.rarity === 4), `account ${account} missed guarantee`);
  fourStars += result.rewards.filter(x => x.rarity === 4).length;
}
const rate = fourStars / 100000;
assert(rate > .24 && rate < .30, `four-star rate ${rate} outside expected guaranteed range`);
console.log(`Summon simulation: 10,000 accounts, guarantee intact, 4★ rate ${(rate * 100).toFixed(2)}%.`);
