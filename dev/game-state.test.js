'use strict';

const assert = require('assert');
const Engine = require('./engine-dev.js');
const StoryRegistry = require('./story-registry.js');
const GameState = require('./game-state.js');

class Storage {
  constructor(values, failOnSet) { this.values = new Map(Object.entries(values || {})); this.failOnSet = failOnSet; this.sets = 0; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { if (++this.sets === this.failOnSet) throw new Error('injected storage failure'); this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
function battleResult(battleId, encounterId, party, overrides) {
  return Object.assign({ battleId, encounterId, victory: true, outcome: 'victory', elapsedMs: 1000, unitsDefeated: 0, breakCount: 0, burstUsed: false, eventHash: `hash:${battleId}`, party: party.slice() }, overrides || {});
}

const state = Engine.normalizeSaveState({ owned: ['hale', 'cinnia', 'tobin'], activeParty: ['hale'] });
const sideProgress = Engine.normalizeSaveState({ sideMissionProgress: { missing_caravan: { clearCount: 2, firstClear: true, rewardTier: 0, rewardedClears: 2 } } });
assert.deepStrictEqual(sideProgress.sideMissionProgress.missing_caravan, { clearCount: 2, firstClear: true, rewardTier: 0, rewardedClears: 2 });
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

const freshMissionState = Engine.normalizeSaveState({ owned: ['hale', 'cinnia', 'tobin'], activeParty: ['hale', 'cinnia', 'tobin'] });
const missionWin = battleResult('act1-3-win', 'act1_3', ['hale', 'cinnia', 'tobin', 'hearthgar']);
assert.strictEqual(GameState.completeMission(freshMissionState, 'act1_3', battleResult('act1-3-locked', 'act1_3', ['hale'], { outcome: 'victory' }), ['hale']).errorCode, 'LOCKED');
const missionState = Engine.normalizeSaveState({ ...freshMissionState, missionClears: { act1_1: true, act1_2: true }, act1MissionProgress: 2 });
const mission = GameState.completeMission(missionState, 'act1_3', missionWin, ['hale', 'cinnia', 'tobin', 'hearthgar']);
assert.strictEqual(mission.ok, true);
assert.strictEqual(missionState.gold, 0, 'mission commands do not mutate their input');
assert.strictEqual(mission.state.missionClears.act1_3, true);
assert.ok(mission.state.owned.includes('hearthgar'));
assert.strictEqual(mission.rewards[0].units.length, Engine.PARTY_SIZE);
assert.strictEqual(mission.state.gold, Engine.BATTLES.act1_3.rewards.first.gold);
assert.strictEqual(mission.state.sigils, Engine.BATTLES.act1_3.sigils);
const missionDuplicate = GameState.completeMission(mission.state, 'act1_3', missionWin, ['hale', 'cinnia', 'tobin', 'hearthgar']);
assert.strictEqual(missionDuplicate.rewards.length, 0);
assert.strictEqual(missionDuplicate.state.gold, mission.state.gold);
const missionRepeat = GameState.completeMission(mission.state, 'act1_3', { ...missionWin, battleId: 'act1-3-repeat' }, ['hale', 'cinnia', 'tobin', 'hearthgar']);
assert.strictEqual(missionRepeat.rewards[0].firstClear, false);
assert.strictEqual(missionRepeat.state.gold, mission.state.gold + Engine.BATTLES.act1_3.rewards.repeat.gold);
assert.strictEqual(missionRepeat.state.sigils, mission.state.sigils);
assert.strictEqual(GameState.completeMission(missionState, 'act1_3', { ...missionWin, encounterId: 'act1_2' }, ['hale']).errorCode, 'INVALID_RESULT');
assert.strictEqual(GameState.completeMission(missionState, 'act1_3', { ...missionWin, outcome: 'defeat', victory: false }, ['hale']).errorCode, 'INVALID_RESULT');
assert.strictEqual(GameState.completeMission(missionState, 'act1_3', { encounterId: 'act1_3', outcome: 'victory', victory: true }, ['hale']).errorCode, 'INVALID_RESULT');
assert.strictEqual(GameState.completeMission(missionState, 'act1_3', { ...missionWin, battleId: 'bad-party-1', party: ['hale', 'hale'] }, ['hale', 'hale']).errorCode, 'INVALID_RESULT');
assert.strictEqual(GameState.completeMission(missionState, 'act1_3', { ...missionWin, battleId: 'bad-party-2', party: ['nix'] }, ['nix']).errorCode, 'INVALID_PARTY');
assert.strictEqual(GameState.completeMission(missionState, 'act1_3', { ...missionWin, battleId: 'bad-party-3', party: [] }, []).errorCode, 'INVALID_PARTY');
assert.strictEqual(GameState.completeMission(missionState, 'act1_3', { ...missionWin, battleId: 'bad-party-4', party: ['hale', 'cinnia', 'tobin', 'hearthgar', 'nix'] }, ['hale', 'cinnia', 'tobin', 'hearthgar', 'nix']).errorCode, 'INVALID_RESULT');
assert.strictEqual(GameState.completeMission(missionState, 'act1_3', { ...missionWin, battleId: 'bad-party-5', party: ['fake'] }, ['fake']).errorCode, 'INVALID_RESULT');
const act1Through8 = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`act1_${i + 1}`, true]));
const summonUnlock = GameState.completeMission(Engine.normalizeSaveState({ missionClears: act1Through8, act1MissionProgress: 8 }), 'act1_9', battleResult('story-act1-9', null, ['hale', 'cinnia'], { outcome: 'victory' }), ['hale', 'cinnia']);
assert.strictEqual(summonUnlock.state.featureUnlocks.summon, true);
assert.strictEqual(summonUnlock.state.storyStep, 0, 'partial chapters do not advance story projection');
const chapterReady = Engine.normalizeSaveState({ missionClears: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`act1_${i + 1}`, true])), act1MissionProgress: 9 });
const chapterComplete = GameState.completeMission(chapterReady, 'act1_10', battleResult('act1-chapter-clear', 'act1_10', ['hale', 'cinnia', 'tobin', 'hearthgar']), ['hale', 'cinnia', 'tobin', 'hearthgar']);
assert.strictEqual(chapterComplete.state.act1MissionProgress, 10);
assert.strictEqual(chapterComplete.state.storyStep, 1);
const beforeAct4Finale = Object.fromEntries(StoryRegistry.chapters.flatMap(chapter => chapter.missions).filter(item => item.id !== 'act4_7').map(item => [item.id, true]));
const scriptedState = Engine.normalizeSaveState({ missionClears: beforeAct4Finale, storyStep: 3 });
const scriptedVictory = battleResult('act4-7-wrong', 'act4_7', ['hale'], { outcome: 'victory' });
assert.strictEqual(GameState.completeMission(scriptedState, 'act4_7', scriptedVictory, ['hale']).errorCode, 'INVALID_RESULT');
const scriptedLoss = GameState.completeMission(scriptedState, 'act4_7', battleResult('act4-7-scripted', 'act4_7', ['hale'], { outcome: 'scripted_loss', victory: false }), ['hale']);
assert.strictEqual(scriptedLoss.ok, true);
assert.strictEqual(scriptedLoss.state.storyStep, 4);

const envelope = { schemaVersion: 1, gameVersion: '0.41.0', saveId: 'test', revision: 1, state };
const prior = JSON.stringify({ ...envelope, revision: 0 });
const storage = new Storage({ save: prior });
GameState.commitEnvelope(storage, 'save', envelope);
assert.strictEqual(storage.getItem('save.backup'), prior);
assert.strictEqual(JSON.parse(storage.getItem('save')).revision, 1);

const missionEnvelope = { schemaVersion: Engine.SAVE_SCHEMA_VERSION, gameVersion: '0.48.0', saveId: 'mission-test', revision: 1, state: mission.state };
const missionStorage = new Storage();
GameState.commitEnvelope(missionStorage, 'mission-save', missionEnvelope);
const reloadedMission = Engine.migrateSaveEnvelope(JSON.parse(missionStorage.getItem('mission-save'))).state;
const duplicateAfterReload = GameState.completeMission(reloadedMission, 'act1_3', missionWin, ['hale', 'cinnia', 'tobin', 'hearthgar']);
assert.strictEqual(duplicateAfterReload.rewards.length, 0);
assert.strictEqual(duplicateAfterReload.state.gold, mission.state.gold);
assert.strictEqual(duplicateAfterReload.state.sigils, mission.state.sigils);

const failing = new Storage({ save: prior }, 3);
assert.throws(() => GameState.commitEnvelope(failing, 'save', envelope), /injected storage failure/);
assert.strictEqual(failing.getItem('save'), prior);

let challengeState = Engine.normalizeSaveState({ owned: ['hale', 'cinnia', 'tobin'], activeParty: ['hale', 'cinnia'], missionClears: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`act1_${i + 1}`, true])), unitProgress: { cinnia: { level: 70, stars: 4, xp: 0 } } });
const ember = GameState.completeChallenge(challengeState, 'ember_trial', battleResult('ember-1', 'challenge_ember', ['hale', 'cinnia'], { elapsedMs: 45000 }));
assert.strictEqual(ember.ok, true);
assert.strictEqual(ember.state.challengeItems.ember_challenge_crest, 1);
assert.strictEqual(ember.state.challengeItems.challenge_essence, 6);
assert.strictEqual(ember.state.challengeProgress.ember_trial.mastery.no_defeats, true);
const duplicate = GameState.completeChallenge(ember.state, 'ember_trial', battleResult('ember-1', 'challenge_ember', ['hale', 'cinnia']));
assert.strictEqual(duplicate.rewards.length, 0);
assert.strictEqual(duplicate.state.challengeItems.challenge_essence, 6);
const feast = GameState.completeChallenge(ember.state, 'feastkeeper_trial', battleResult('feast-1', 'challenge_feastkeeper', ['hale', 'cinnia'], { elapsedMs: 60000, unitsDefeated: 1 }));
assert.strictEqual(feast.state.challengeItems.feastkeeper_seal, 1);
assert.strictEqual(feast.state.challengeItems.challenge_essence, 13);
const emberRepeat = GameState.completeChallenge(feast.state, 'ember_trial', battleResult('ember-2', 'challenge_ember', ['hale', 'cinnia'], { unitsDefeated: 1, burstUsed: true }));
const feastRepeat = GameState.completeChallenge(emberRepeat.state, 'feastkeeper_trial', battleResult('feast-2', 'challenge_feastkeeper', ['hale', 'cinnia'], { unitsDefeated: 1, burstUsed: true }));
assert.ok(feastRepeat.state.challengeItems.challenge_essence >= 20, 'evolution pacing exceeds four clears');
assert.strictEqual(GameState.completeChallenge(challengeState, 'ember_trial', battleResult('ember-wrong', 'not_ember', ['hale', 'cinnia'])).errorCode, 'INVALID_RESULT');
const evolved = GameState.evolveUnit(feastRepeat.state, 'cinnia', { transactionId: 'evolve-cinnia' });
assert.strictEqual(evolved.ok, true);
assert.strictEqual(evolved.state.unitProgress.cinnia.stars, 5);
assert.strictEqual(evolved.state.libraryUnlocked['cinnia:5'], true);
assert.strictEqual(evolved.state.challengeItems.ember_challenge_crest, 0);
assert.strictEqual(Engine.migrateSaveEnvelope({ schemaVersion: 1, state: {} }).schemaVersion, 7);

let marketState = Engine.normalizeSaveState({ owned: ['hale', 'cinnia'], activeParty: ['hale'], missionClears: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`act1_${i + 1}`, true])), gold: 2500 });
assert.strictEqual(GameState.purchaseMarketItem(marketState, 'essence_bundle', null, { transactionId: 'market:locked' }).errorCode, 'LOCKED');
const manual = GameState.purchaseMarketItem(marketState, 'training_manual', 'cinnia', { transactionId: 'market:manual-1' });
assert.strictEqual(manual.ok, true);
assert.strictEqual(manual.state.gold, 2000);
assert.ok(manual.state.unitProgress.cinnia.level > 1);
assert.strictEqual(manual.state.marketState.tier, 1);
assert.strictEqual(manual.state.economyLedger.length, 1);
assert.strictEqual(manual.state.telemetry.at(-1).event, 'market_settlement');
const manualDuplicate = GameState.purchaseMarketItem(manual.state, 'training_manual', 'cinnia', { transactionId: 'market:manual-1' });
assert.strictEqual(manualDuplicate.state.gold, 2000);
const dustExchange = GameState.purchaseMarketItem(Engine.normalizeSaveState({ ...manual.state, glassDust: 10 }), 'glassdust_sigils', null, { transactionId: 'market:dust-1' });
assert.strictEqual(dustExchange.ok, true);
assert.strictEqual(dustExchange.state.glassDust, 0);
assert.strictEqual(dustExchange.state.sigils, 15);
assert.strictEqual(GameState.purchaseMarketItem(manual.state, 'glassdust_sigils', null, { transactionId: 'market:dust-empty' }).errorCode, 'INSUFFICIENT_DUST');
const cappedMarketState = Engine.normalizeSaveState({ owned: ['hale', 'cinnia'], activeParty: ['hale'], missionClears: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`act1_${i + 1}`, true])), gold: 2500, unitProgress: { cinnia: { level: 70, stars: 4, xp: 0 } } });
const cappedManual = GameState.purchaseMarketItem(cappedMarketState, 'training_manual', 'cinnia', { transactionId: 'market:manual-capped' });
assert.strictEqual(cappedManual.errorCode, 'LEVEL_CAP_REACHED');
assert.strictEqual(cappedMarketState.gold, 2500);
assert.strictEqual(cappedMarketState.marketState.purchases.training_manual, undefined);
const marketUnlocked = Engine.normalizeSaveState({ ...manual.state, challengeProgress: { ember_trial: { clearCount: 1, firstClear: true, bestTimeMs: 45000, mastery: {} } } });
const essence = GameState.purchaseMarketItem(marketUnlocked, 'essence_bundle', null, { transactionId: 'market:essence-1' });
assert.strictEqual(essence.ok, true);
assert.strictEqual(essence.state.challengeItems.challenge_essence, 2);
assert.strictEqual(GameState.purchaseMarketItem(essence.state, 'essence_bundle', null, { transactionId: 'market:essence-2' }).errorCode, 'LIMIT_REACHED');
const telemetry = GameState.recordTelemetry(essence.state, { event: 'challenge_result', challengeId: 'ember_trial', outcome: 'defeat', elapsedMs: 1234, unitsDefeated: 2 });
assert.strictEqual(telemetry.state.telemetry.at(-1).outcome, 'defeat');

let summonState = Engine.normalizeSaveState({ sigils: 1000, missionClears: Object.fromEntries([
  ...Array.from({ length: 10 }, (_, i) => [`act1_${i + 1}`, true]),
  ...Array.from({ length: 8 }, (_, i) => [`act2_${i + 1}`, true]),
  ['act3_1', true], ['act3_2', true], ['act3_3', true],
]) });
const beforeNixGate = Engine.normalizeSaveState({ missionClears: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`act1_${i + 1}`, true])) });
assert(Engine.bannerPool(beforeNixGate, 'standard', 3).some(entry => entry.id === 'nix'), 'Nix remains available in the standard banner policy');
const nixGate = Engine.normalizeSaveState({ missionClears: Object.fromEntries([
  ...Array.from({ length: 10 }, (_, i) => [`act1_${i + 1}`, true]),
  ...Array.from({ length: 8 }, (_, i) => [`act2_${i + 1}`, true]),
  ['act3_1', true], ['act3_2', true], ['act3_3', true],
]) });
assert(Engine.bannerPool(nixGate, 'standard', 3).some(entry => entry.id === 'nix'), 'Nix remains available after Chapter 3 progression');
const rolls = [0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.9, 0.9];
const ten = GameState.performSummon(summonState, 'standard', 10, () => rolls.shift() ?? .9, { transactionId: 'summon:10' });
assert.strictEqual(ten.ok, true);
assert.strictEqual(ten.rewards.length, 10);
assert.ok(ten.rewards.some(x => x.rarity === 4), 'ten pull guarantees a four star');
assert.strictEqual(ten.state.summonHistory.length, 10);
assert.strictEqual(ten.state.telemetry.at(-1).event, 'summon_settlement');
assert.strictEqual(ten.state.telemetry.at(-1).pulls, 10);
assert.strictEqual(GameState.performSummon(ten.state, 'standard', 10, Math.random, { transactionId: 'summon:10' }).rewards.length, 0);
let capped = Engine.normalizeSaveState({ sigils: 20, missionClears: Object.fromEntries([
  ...Array.from({ length: 10 }, (_, i) => [`act1_${i + 1}`, true]),
  ...Array.from({ length: 8 }, (_, i) => [`act2_${i + 1}`, true]),
  ['act3_1', true], ['act3_2', true], ['act3_3', true],
]), owned: ['hale', 'cinnia', 'tobin', 'nix'], ranks: { nix: 5 }, summonState: { standard: { pullsSinceFourStar: 0, featuredMisses: 0 } } });
const dust = GameState.performSummon(capped, 'standard', 1, () => .9, { transactionId: 'summon:dust' });
assert.strictEqual(dust.state.glassDust, 10);
const recruited = GameState.recruitStoryUnit(Engine.normalizeSaveState({ missionClears: { act1_1: true, act1_2: true, act1_3: true } }), 'hearthgar', 'act1_3');
assert.strictEqual(recruited.ok, true);
assert.ok(recruited.state.owned.includes('hearthgar'));
assert.strictEqual(GameState.recruitStoryUnit(recruited.state, 'hearthgar', 'act1_3').rewards.length, 0);
let replayState = Engine.normalizeSaveState({ missionClears: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`act1_${i + 1}`, true])), owned: ['hale', 'cinnia', 'tobin'], activeParty: ['hale'] });
const originalChallengeResult = battleResult('permanent-ember', 'challenge_ember', ['hale']);
const originalChallenge = GameState.completeChallenge(replayState, 'ember_trial', originalChallengeResult);
assert.strictEqual(originalChallenge.ok, true);
replayState = Engine.normalizeSaveState({ ...originalChallenge.state, completedTransactions: Array.from({ length: 100 }, (_, i) => `noise:${i}`) });
assert.strictEqual(replayState.completedTransactions.includes('challenge:ember_trial:permanent-ember'), false);
assert.strictEqual(replayState.settledBattles['challenge:ember_trial:permanent-ember'], true);
assert.strictEqual(GameState.completeChallenge(replayState, 'ember_trial', originalChallengeResult).rewards.length, 0);
const overrideA = GameState.completeChallenge(replayState, 'ember_trial', battleResult('override-battle', 'challenge_ember', ['hale']), { transactionId: 'ctx-a' });
const overrideB = GameState.completeChallenge(overrideA.state, 'ember_trial', battleResult('override-battle', 'challenge_ember', ['hale']), { transactionId: 'ctx-b' });
assert.strictEqual(overrideB.rewards.length, 0);
assert.strictEqual(GameState.completeChallenge(replayState, 'ember_trial', { battleId: 'incomplete', encounterId: 'challenge_ember', victory: true }).errorCode, 'INVALID_RESULT');
assert.strictEqual(GameState.performSummon(Engine.normalizeSaveState({ sigils: 100 }), 'standard', 1, () => 0, { transactionId: 'summon:test:locked' }).errorCode, 'LOCKED');
const canonicalUnlocked = Engine.normalizeSaveState({ missionClears: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`act1_${i + 1}`, true])) });
assert.strictEqual(Engine.challengeUnlocked(canonicalUnlocked, 'ember_trial'), true);
assert.strictEqual(Engine.marketRestockTier(canonicalUnlocked), 1);
const forgedLegacyStep = Engine.normalizeSaveState({ storyStep: 1, missionClears: {} });
assert.strictEqual(Engine.challengeUnlocked(forgedLegacyStep, 'ember_trial'), false);
assert.strictEqual(Engine.marketRestockTier(forgedLegacyStep), 0);
assert.strictEqual(StoryRegistry.missions.act1_1.partyMode, 'fixed');
const badFixedParty = GameState.completeMission(Engine.normalizeSaveState({ owned: ['hale', 'cinnia', 'tobin'] }), 'act1_1', battleResult('fixed-bad', 'act1_1', ['hale', 'cinnia']), ['hale', 'cinnia']);
assert.strictEqual(badFixedParty.errorCode, 'INVALID_PARTY');
const beforeSideUnlock = Engine.normalizeSaveState({ owned: ['hale'], activeParty: ['hale'] });
assert.strictEqual(Engine.sideMissionUnlocked(beforeSideUnlock, 'missing_caravan'), false);
let sideState = Engine.normalizeSaveState({ missionClears: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`act1_${i + 1}`, true])), owned: ['hale'], activeParty: ['hale'] });
assert.strictEqual(Engine.sideMissionUnlocked(sideState, 'missing_caravan'), true);
const sideResult = battleResult('side-one', 'side_caravan', ['hale']);
const sideClear = GameState.completeSideMission(sideState, 'missing_caravan', sideResult, ['hale']);
assert.strictEqual(sideClear.ok, true);
assert.strictEqual(GameState.completeSideMission(sideClear.state, 'missing_caravan', sideResult, ['hale']).rewards.length, 0);
sideState = sideClear.state;
for (let i = 0; i < 2; i++) sideState = GameState.completeSideMission(sideState, 'missing_caravan', battleResult(`side-${i + 2}`, 'side_caravan', ['hale']), ['hale']).state;
assert.strictEqual(GameState.completeSideMission(sideState, 'missing_caravan', battleResult('side-four', 'side_caravan', ['hale']), ['hale']).errorCode, 'LIMIT_REACHED');
const invalidCommandState = { ...Engine.normalizeSaveState({}), gold: -500 };
assert.strictEqual(GameState.setActiveParty(invalidCommandState, ['hale']).errorCode, 'SAVE_VALIDATION_FAILED');
console.log('GameState tests: Challenge, Market, Summon, telemetry, migration, pacing, and evolution passed.');
