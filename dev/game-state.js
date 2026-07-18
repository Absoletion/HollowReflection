'use strict';

const GameState = (function (E) {
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
  function appendTelemetry(state, fact) { state.telemetry.push(fact); state.telemetry = state.telemetry.slice(-100); }
  function appendLedger(state, entry) { state.economyLedger.push(entry); state.economyLedger = state.economyLedger.slice(-100); }
  function execute(command, state, mutate, context) {
    try {
      const before = E.normalizeSaveState(state), draft = clone(before);
      E.validateSaveState(before);
      const payload = mutate(draft) || {};
      E.validateSaveState(draft);
      return {
        ok: true, command,
        transactionId: context && context.transactionId || `tx_${Date.now().toString(36)}`,
        state: E.normalizeSaveState(draft),
        deltas: payload.deltas || {}, rewards: payload.rewards || [], uiEvents: payload.uiEvents || [],
        saveVersion: E.SAVE_SCHEMA_VERSION,
      };
    } catch (error) {
      return { ok: false, command, errorCode: error.code || 'SAVE_VALIDATION_FAILED', message: error.message, deltas: {}, rewards: [], uiEvents: [], saveVersion: E.SAVE_SCHEMA_VERSION };
    }
  }
  function setActiveParty(state, party, context) {
    return execute('setActiveParty', state, draft => {
      if (!Array.isArray(party) || !party.length || party.length > 5) fail('LIMIT_REACHED', 'Choose one to five units.');
      const next = [...new Set(party)];
      if (next.length !== party.length || next.some(id => !draft.owned.includes(id))) fail('UNKNOWN_ID', 'The formation contains an unavailable unit.');
      const before = draft.activeParty;
      draft.activeParty = next;
      return { deltas: { activeParty: { before, after: next } }, uiEvents: ['party_updated'] };
    }, context);
  }
  function setAIPreset(state, unitId, presetId, context) {
    return execute('setAIPreset', state, draft => {
      if (!E.UNITS[unitId] || !draft.owned.includes(unitId)) fail('UNKNOWN_ID', 'The unit is unavailable.');
      if (!E.AI_PRESETS[presetId]) fail('UNKNOWN_ID', 'Unknown AI preset.');
      const before = (draft.unitAI[unitId] || {}).preset || 'balanced';
      draft.unitAI[unitId] = { preset: presetId };
      return { deltas: { unitId, preset: { before, after: presetId } }, uiEvents: ['ai_preset_updated'] };
    }, context);
  }
  function completeChallenge(state, challengeId, result, context) {
    const transactionId = context && context.transactionId || result && result.battleId && `challenge:${challengeId}:${result.battleId}`;
    return execute('completeChallenge', state, draft => {
      const cfg = E.CHALLENGES[challengeId];
      if (!cfg) fail('UNKNOWN_ID', 'Unknown Challenge.');
      if (!E.challengeUnlocked(draft, challengeId)) fail('LOCKED', 'This Challenge is still locked.');
      if (!result || result.victory !== true) fail('NOT_CLEARED', 'Rewards require a victory.');
      if (!transactionId) fail('MISSING_TRANSACTION', 'The battle result has no settlement ID.');
      if (draft.completedTransactions.includes(transactionId)) return { uiEvents: ['settlement_duplicate'] };
      const progress = draft.challengeProgress[challengeId] || { clearCount: 0, firstClear: false, bestTimeMs: 0, mastery: {} };
      const first = progress.clearCount === 0, bundle = first ? cfg.firstClear : cfg.repeatClear, rewards = [];
      draft.gold += bundle.gold || 0;
      if (bundle.gold) rewards.push({ type: 'gold', quantity: bundle.gold });
      for (const [id, quantity] of Object.entries(bundle.items || {})) {
        draft.challengeItems[id] = (draft.challengeItems[id] || 0) + quantity;
        rewards.push({ type: 'item', id, quantity });
      }
      for (const masteryId of E.evaluateChallengeMastery(cfg, result)) {
        if (progress.mastery[masteryId]) continue;
        progress.mastery[masteryId] = true;
        const rule = cfg.mastery.find(x => x.id === masteryId);
        for (const [id, quantity] of Object.entries(rule.reward || {})) {
          draft.challengeItems[id] = (draft.challengeItems[id] || 0) + quantity;
          rewards.push({ type: 'item', id, quantity, mastery: masteryId });
        }
      }
      progress.clearCount++;
      progress.firstClear = true;
      const time = Math.max(0, Math.floor(result.elapsedMs || 0));
      if (time && (!progress.bestTimeMs || time < progress.bestTimeMs)) progress.bestTimeMs = time;
      draft.challengeProgress[challengeId] = progress;
      draft.completedTransactions.push(transactionId);
      draft.completedTransactions = draft.completedTransactions.slice(-100);
      if (challengeId === 'ember_trial') draft.evolutionUnlocks.cinnia = true;
      appendTelemetry(draft, { event: 'challenge_clear', challengeId, outcome: 'victory', elapsedMs: time, unitsDefeated: result.unitsDefeated || 0, breakCount: result.breakCount || 0 });
      rewards.forEach((reward, index) => appendLedger(draft, { id: `${transactionId}:${index}`, type: 'challenge_reward', gold: reward.type === 'gold' ? reward.quantity : 0, itemId: reward.id || '', quantity: reward.type === 'item' ? reward.quantity : 0 }));
      return { deltas: { challengeId, clearCount: progress.clearCount, firstClear: first }, rewards, uiEvents: ['challenge_settled'] };
    }, { transactionId });
  }
  function recordTelemetry(state, fact, context) {
    return execute('recordTelemetry', state, draft => {
      const event = String(fact && fact.event || '');
      if (!['challenge_attempt', 'challenge_result', 'challenge_settlement_failed'].includes(event)) fail('UNKNOWN_ID', 'Unknown telemetry event.');
      const challengeId = String(fact.challengeId || '');
      if (!E.CHALLENGES[challengeId]) fail('UNKNOWN_ID', 'Unknown Challenge.');
      appendTelemetry(draft, { event, challengeId, outcome: String(fact.outcome || ''), elapsedMs: Math.max(0, Math.floor(fact.elapsedMs || 0)), unitsDefeated: Math.max(0, Math.floor(fact.unitsDefeated || 0)), breakCount: Math.max(0, Math.floor(fact.breakCount || 0)) });
      return {};
    }, context);
  }
  function purchaseMarketItem(state, itemId, targetUnit, context) {
    const transactionId = context && context.transactionId || `market:${itemId}:${Date.now().toString(36)}`;
    return execute('purchaseMarketItem', state, draft => {
      const item = E.MARKET_ITEMS[itemId];
      if (!item) fail('UNKNOWN_ID', 'Unknown Market item.');
      if (!E.marketItemUnlocked(draft, itemId)) fail('LOCKED', 'This item is still locked.');
      if (draft.completedTransactions.includes(transactionId)) return { uiEvents: ['settlement_duplicate'] };
      const tier = E.marketRestockTier(draft);
      if (draft.marketState.tier !== tier) draft.marketState = { tier, purchases: {} };
      const bought = draft.marketState.purchases[itemId] || 0;
      if (bought >= item.limit) fail('LIMIT_REACHED', 'Sold out until the next story restock.');
      if (draft.gold < item.price) fail('INSUFFICIENT_FUNDS', 'Not enough Gold.');
      const rewards = [];
      if (item.effect.xp) {
        if (!targetUnit || !draft.owned.includes(targetUnit)) fail('UNKNOWN_ID', 'Choose an owned unit for the manual.');
        if (!draft.unitProgress[targetUnit]) draft.unitProgress[targetUnit] = { level: 1, stars: E.UNIT_PROGRESSION[targetUnit].baseStars, xp: 0 };
        const gain = E.grantUnitXP(draft.unitProgress[targetUnit], item.effect.xp);
        rewards.push({ type: 'xp', unit: targetUnit, quantity: item.effect.xp, levelsGained: gain.levelsGained });
      }
      if (item.effect.item) {
        draft.challengeItems[item.effect.item] = (draft.challengeItems[item.effect.item] || 0) + item.effect.quantity;
        rewards.push({ type: 'item', id: item.effect.item, quantity: item.effect.quantity });
      }
      draft.gold -= item.price;
      draft.marketState.purchases[itemId] = bought + 1;
      draft.completedTransactions.push(transactionId); draft.completedTransactions = draft.completedTransactions.slice(-100);
      appendLedger(draft, { id: transactionId, type: 'market_purchase', gold: -item.price, itemId, quantity: 1 });
      return { deltas: { gold: -item.price, purchases: draft.marketState.purchases[itemId] }, rewards, uiEvents: ['market_purchase'] };
    }, { transactionId });
  }
  function performSummon(state, bannerId, count, rng, context) {
    const transactionId = context && context.transactionId || `summon:${bannerId}:${Date.now().toString(36)}`;
    rng = typeof rng === 'function' ? rng : Math.random;
    return execute('performSummon', state, draft => {
      const banner = E.BANNERS[bannerId], cost = banner && banner.cost[count];
      if (!banner || !cost) fail('UNKNOWN_ID', 'Unknown banner or pull count.');
      if (draft.completedTransactions.includes(transactionId)) return { uiEvents: ['settlement_duplicate'] };
      if (draft.sigils < cost) fail('INSUFFICIENT_FUNDS', 'Not enough Sigils.');
      const family = draft.summonState[banner.family], rewards = [];
      const pick = pool => { let n = Math.max(0, Math.min(.999999999, Number(rng()) || 0)) * pool.reduce((a, x) => a + x.weight, 0); for (const x of pool) if ((n -= x.weight) < 0) return x; return pool[pool.length - 1]; };
      for (let i = 0; i < count; i++) {
        const four = family.pullsSinceFourStar >= banner.guaranteeAt - 1 || rng() < banner.fourStarRate;
        let pool = E.bannerPool(draft, bannerId, four ? 4 : 3), chosen;
        if (!pool.length) fail('LOCKED', 'This banner has no available units yet.');
        if (four && pool.some(x => x.id === banner.featured) && (family.featuredMisses || rng() < banner.featuredRate)) chosen = pool.find(x => x.id === banner.featured);
        else chosen = pick(pool);
        if (four) { family.pullsSinceFourStar = 0; family.featuredMisses = chosen.id === banner.featured ? 0 : 1; } else family.pullsSinceFourStar++;
        const newUnit = !draft.owned.includes(chosen.id), rarity = E.UNIT_PROGRESSION[chosen.id].baseStars;
        let dust = 0;
        if (newUnit) { draft.owned.push(chosen.id); draft.unitProgress[chosen.id] = { level: 1, stars: rarity, xp: 0 }; draft.libraryUnlocked[`${chosen.id}:base`] = true; }
        else if ((draft.ranks[chosen.id] || 0) < 5) draft.ranks[chosen.id] = (draft.ranks[chosen.id] || 0) + 1;
        else { dust = rarity === 4 ? 20 : 10; draft.glassDust += dust; }
        const reward = { type: 'unit', unitId: chosen.id, rarity, newUnit, rank: draft.ranks[chosen.id] || 0, dust };
        rewards.push(reward); draft.summonHistory.push({ transactionId, bannerId, unitId: chosen.id, rarity, newUnit, rank: reward.rank, dust });
      }
      draft.sigils -= cost; draft.summonHistory = draft.summonHistory.slice(-100); draft.completedTransactions.push(transactionId); draft.completedTransactions = draft.completedTransactions.slice(-100);
      return { deltas: { sigils: -cost }, rewards, uiEvents: ['summon_complete'] };
    }, { transactionId });
  }
  function recruitStoryUnit(state, unitId, missionId, context) {
    const transactionId = `recruit:${missionId}:${unitId}`;
    return execute('recruitStoryUnit', state, draft => {
      if (!E.UNITS[unitId]) fail('UNKNOWN_ID', 'Unknown story unit.');
      if (!draft.missionClears[missionId]) fail('LOCKED', 'Recruitment mission is not cleared.');
      if (draft.completedTransactions.includes(transactionId)) return { uiEvents: ['settlement_duplicate'] };
      const rarity = E.UNIT_PROGRESSION[unitId].baseStars, newUnit = !draft.owned.includes(unitId); let dust = 0;
      if (newUnit) { draft.owned.push(unitId); draft.unitProgress[unitId] = { level: 1, stars: rarity, xp: 0 }; draft.libraryUnlocked[`${unitId}:base`] = true; }
      else if ((draft.ranks[unitId] || 0) < 5) draft.ranks[unitId] = (draft.ranks[unitId] || 0) + 1;
      else { dust = rarity === 4 ? 20 : 10; draft.glassDust += dust; }
      draft.completedTransactions.push(transactionId); draft.completedTransactions = draft.completedTransactions.slice(-100);
      return { rewards: [{ type: 'unit', unitId, rarity, newUnit, rank: draft.ranks[unitId] || 0, dust }], uiEvents: ['story_recruitment'] };
    }, { transactionId: context && context.transactionId || transactionId });
  }
  function evolutionEligibility(state, key) {
    const draft = E.normalizeSaveState(state), cfg = E.UNIT_PROGRESSION[key], progress = draft.unitProgress[key], evo = cfg && cfg.evolution;
    if (!cfg || !draft.owned.includes(key)) return { ok: false, errorCode: 'UNKNOWN_ID', message: 'Unit is unavailable.' };
    if (!evo || evo.forcedStory || evo.planned || (progress && progress.stars >= cfg.maxStars)) return { ok: false, errorCode: 'LIMIT_REACHED', message: 'No manual evolution is available.' };
    const p = progress || { level: 1, stars: cfg.baseStars, xp: 0 };
    if (evo.unlock && !draft.evolutionUnlocks[key]) return { ok: false, errorCode: 'LOCKED', message: 'The evolution recipe is locked.' };
    if (p.level < E.LEVEL_CAPS[p.stars]) return { ok: false, errorCode: 'LEVEL_REQUIRED', message: 'The unit must be at max level.' };
    for (const [id, quantity] of Object.entries(evo.materials || {})) if ((draft.challengeItems[id] || 0) < quantity) return { ok: false, errorCode: 'MATERIALS_REQUIRED', message: 'Evolution materials are missing.' };
    return { ok: true };
  }
  function evolveUnit(state, key, context) {
    return execute('evolveUnit', state, draft => {
      const eligibility = evolutionEligibility(draft, key);
      if (!eligibility.ok) fail(eligibility.errorCode, eligibility.message);
      const cfg = E.UNIT_PROGRESSION[key], evo = cfg.evolution, p = draft.unitProgress[key];
      for (const [id, quantity] of Object.entries(evo.materials || {})) draft.challengeItems[id] -= quantity;
      const before = p.stars;
      p.stars = evo.toStars; p.xp = 0;
      draft.libraryUnlocked[`${key}:${p.stars}`] = true;
      return { deltas: { unit: key, stars: { before, after: p.stars } }, uiEvents: ['unit_evolved'] };
    }, context);
  }
  function commitEnvelope(storage, key, envelope) {
    const tempKey = key + '.tmp', backupKey = key + '.backup';
    const serialized = JSON.stringify(envelope), previous = storage.getItem(key);
    E.migrateSaveEnvelope(JSON.parse(serialized), { strict: true });
    try {
      storage.setItem(tempKey, serialized);
      if (storage.getItem(tempKey) !== serialized) throw new Error('Temporary save verification failed.');
      if (previous !== null) storage.setItem(backupKey, previous);
      storage.setItem(key, serialized);
      if (storage.getItem(key) !== serialized) throw new Error('Active save verification failed.');
      storage.removeItem(tempKey);
      return true;
    } catch (error) {
      try { if (previous !== null && storage.getItem(key) !== previous) storage.setItem(key, previous); } catch (ignore) {}
      throw error;
    }
  }
  return Object.freeze({ execute, setActiveParty, setAIPreset, completeChallenge, recordTelemetry, purchaseMarketItem, performSummon, recruitStoryUnit, evolutionEligibility, evolveUnit, commitEnvelope });
})(typeof Engine !== 'undefined' ? Engine : require('./engine-dev.js'));

if (typeof module !== 'undefined') module.exports = GameState;
