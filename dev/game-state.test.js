'use strict';

const assert = require('assert');
const Engine = require('./engine-dev.js');
const GameState = require('./game-state.js');

class Storage {
  constructor(values, failOnSet) { this.values = new Map(Object.entries(values || {})); this.failOnSet = failOnSet; this.sets = 0; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { if (++this.sets === this.failOnSet) throw new Error('injected storage failure'); this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const state = Engine.normalizeSaveState({ owned: ['hale', 'cinnia', 'tobin'], activeParty: ['hale'] });
const changed = GameState.setActiveParty(state, ['cinnia', 'hale'], { transactionId: 'tx_test' });
assert.strictEqual(changed.ok, true);
assert.deepStrictEqual(changed.state.activeParty, ['cinnia', 'hale']);
assert.strictEqual(GameState.setActiveParty(state, ['fake']).errorCode, 'UNKNOWN_ID');
const fullRoster = Engine.normalizeSaveState({ owned: ['hale', 'cinnia', 'tobin', 'katie', 'marlowe'], activeParty: ['hale'] });
assert.strictEqual(GameState.setActiveParty(fullRoster, fullRoster.owned).errorCode, 'LIMIT_REACHED');
const ai = GameState.setAIPreset(state, 'hale', 'burst', { transactionId: 'tx_ai' });
assert.strictEqual(ai.ok, true);
assert.strictEqual(ai.state.unitAI.hale.preset, 'burst');
assert.strictEqual(GameState.setAIPreset(state, 'hale', 'unknown').errorCode, 'UNKNOWN_ID');

const envelope = { schemaVersion: 1, gameVersion: '0.41.0', saveId: 'test', revision: 1, state };
const prior = JSON.stringify({ ...envelope, revision: 0 });
const storage = new Storage({ save: prior });
GameState.commitEnvelope(storage, 'save', envelope);
assert.strictEqual(storage.getItem('save.backup'), prior);
assert.strictEqual(JSON.parse(storage.getItem('save')).revision, 1);

const failing = new Storage({ save: prior }, 3);
assert.throws(() => GameState.commitEnvelope(failing, 'save', envelope), /injected storage failure/);
assert.strictEqual(failing.getItem('save'), prior);

let challengeState = Engine.normalizeSaveState({ owned: ['hale', 'cinnia', 'tobin'], activeParty: ['hale', 'cinnia'], storyStep: 1, unitProgress: { cinnia: { level: 70, stars: 4, xp: 0 } } });
const ember = GameState.completeChallenge(challengeState, 'ember_trial', { battleId: 'ember-1', victory: true, elapsedMs: 45000, unitsDefeated: 0, burstUsed: false });
assert.strictEqual(ember.ok, true);
assert.strictEqual(ember.state.challengeItems.ember_challenge_crest, 1);
assert.strictEqual(ember.state.challengeItems.challenge_essence, 6);
assert.strictEqual(ember.state.challengeProgress.ember_trial.mastery.no_defeats, true);
const duplicate = GameState.completeChallenge(ember.state, 'ember_trial', { battleId: 'ember-1', victory: true });
assert.strictEqual(duplicate.rewards.length, 0);
assert.strictEqual(duplicate.state.challengeItems.challenge_essence, 6);
const feast = GameState.completeChallenge(ember.state, 'feastkeeper_trial', { battleId: 'feast-1', victory: true, elapsedMs: 60000, unitsDefeated: 1, burstUsed: false });
assert.strictEqual(feast.state.challengeItems.feastkeeper_seal, 1);
assert.strictEqual(feast.state.challengeItems.challenge_essence, 13);
const emberRepeat = GameState.completeChallenge(feast.state, 'ember_trial', { battleId: 'ember-2', victory: true, unitsDefeated: 1, burstUsed: true });
const feastRepeat = GameState.completeChallenge(emberRepeat.state, 'feastkeeper_trial', { battleId: 'feast-2', victory: true, unitsDefeated: 1, burstUsed: true });
assert.ok(feastRepeat.state.challengeItems.challenge_essence >= 20, 'evolution pacing exceeds four clears');
const evolved = GameState.evolveUnit(feastRepeat.state, 'cinnia', { transactionId: 'evolve-cinnia' });
assert.strictEqual(evolved.ok, true);
assert.strictEqual(evolved.state.unitProgress.cinnia.stars, 5);
assert.strictEqual(evolved.state.libraryUnlocked['cinnia:5'], true);
assert.strictEqual(evolved.state.challengeItems.ember_challenge_crest, 0);
assert.strictEqual(Engine.migrateSaveEnvelope({ schemaVersion: 1, state: {} }).schemaVersion, 5);

let marketState = Engine.normalizeSaveState({ owned: ['hale', 'cinnia'], activeParty: ['hale'], storyStep: 1, gold: 2500 });
assert.strictEqual(GameState.purchaseMarketItem(marketState, 'essence_bundle', null, { transactionId: 'locked' }).errorCode, 'LOCKED');
const manual = GameState.purchaseMarketItem(marketState, 'training_manual', 'cinnia', { transactionId: 'manual-1' });
assert.strictEqual(manual.ok, true);
assert.strictEqual(manual.state.gold, 2000);
assert.ok(manual.state.unitProgress.cinnia.level > 1);
assert.strictEqual(manual.state.marketState.tier, 1);
assert.strictEqual(manual.state.economyLedger.length, 1);
const manualDuplicate = GameState.purchaseMarketItem(manual.state, 'training_manual', 'cinnia', { transactionId: 'manual-1' });
assert.strictEqual(manualDuplicate.state.gold, 2000);
const marketUnlocked = Engine.normalizeSaveState({ ...manual.state, challengeProgress: { ember_trial: { clearCount: 1, firstClear: true, bestTimeMs: 45000, mastery: {} } } });
const essence = GameState.purchaseMarketItem(marketUnlocked, 'essence_bundle', null, { transactionId: 'essence-1' });
assert.strictEqual(essence.ok, true);
assert.strictEqual(essence.state.challengeItems.challenge_essence, 2);
assert.strictEqual(GameState.purchaseMarketItem(essence.state, 'essence_bundle', null, { transactionId: 'essence-2' }).errorCode, 'LIMIT_REACHED');
const telemetry = GameState.recordTelemetry(essence.state, { event: 'challenge_result', challengeId: 'ember_trial', outcome: 'defeat', elapsedMs: 1234, unitsDefeated: 2 });
assert.strictEqual(telemetry.state.telemetry.at(-1).outcome, 'defeat');

let summonState = Engine.normalizeSaveState({ sigils: 1000, storyStep: 1 });
const rolls = [0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.9, 0.9];
const ten = GameState.performSummon(summonState, 'standard', 10, () => rolls.shift() ?? .9, { transactionId: 'summon-10' });
assert.strictEqual(ten.ok, true);
assert.strictEqual(ten.rewards.length, 10);
assert.ok(ten.rewards.some(x => x.rarity === 4), 'ten pull guarantees a four star');
assert.strictEqual(ten.state.summonHistory.length, 10);
assert.strictEqual(GameState.performSummon(ten.state, 'standard', 10, Math.random, { transactionId: 'summon-10' }).rewards.length, 0);
let capped = Engine.normalizeSaveState({ sigils: 20, owned: ['hale', 'cinnia', 'tobin', 'nix'], ranks: { nix: 5 }, summonState: { standard: { pullsSinceFourStar: 0, featuredMisses: 0 } } });
const dust = GameState.performSummon(capped, 'standard', 1, () => .9, { transactionId: 'dust' });
assert.strictEqual(dust.state.glassDust, 10);
const recruited = GameState.recruitStoryUnit(Engine.normalizeSaveState({ missionClears: { act1_3: true } }), 'hearthgar', 'act1_3');
assert.strictEqual(recruited.ok, true);
assert.ok(recruited.state.owned.includes('hearthgar'));
assert.strictEqual(GameState.recruitStoryUnit(recruited.state, 'hearthgar', 'act1_3').rewards.length, 0);
console.log('GameState tests: Challenge, Market, Summon, telemetry, migration, pacing, and evolution passed.');
