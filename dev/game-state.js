'use strict';

const GameState = (function (E, Registry) {
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
  function appendTelemetry(state, fact) { state.telemetry.push(fact); state.telemetry = state.telemetry.slice(-100); }
  function appendLedger(state, entry) { state.economyLedger.push(entry); state.economyLedger = state.economyLedger.slice(-100); }
  function rememberRecentTransaction(state, transactionId) {
    if (!transactionId) return;
    state.completedTransactions.push(transactionId);
    state.completedTransactions = [...new Set(state.completedTransactions)].slice(-100);
  }
  function requireOperationId(context, expectedPrefix) {
    const id = context && context.transactionId;
    if (typeof id !== 'string' || !id || id.length > 192) fail('MISSING_TRANSACTION', 'This operation requires a valid transaction ID.');
    if (!id.startsWith(`${expectedPrefix}:`)) fail('INVALID_TRANSACTION', `Transaction ID must begin with ${expectedPrefix}:.`);
    return id;
  }
  function battleSettlementId(domain, contentId, result) {
    if (!result || typeof result.battleId !== 'string' || !result.battleId || result.battleId.length > 96) fail('INVALID_RESULT', 'Battle result requires a valid battle ID.');
    return `${domain}:${contentId}:${result.battleId}`;
  }
  function validateBattleResult(result, expectedEncounter, expectedParty) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) fail('INVALID_RESULT', 'Battle result is missing.');
    if (typeof result.battleId !== 'string' || !result.battleId || result.battleId.length > 96) fail('INVALID_RESULT', 'Battle result requires a valid battle ID.');
    if ((result.encounterId || null) !== (expectedEncounter || null)) fail('INVALID_RESULT', 'Battle result does not match the encounter.');
    if (typeof result.victory !== 'boolean') fail('INVALID_RESULT', 'Battle result requires an explicit victory flag.');
    if (!Number.isSafeInteger(result.elapsedMs) || result.elapsedMs < 0 || result.elapsedMs > 86400000) fail('INVALID_RESULT', 'Battle result has an invalid elapsed time.');
    if (!Number.isSafeInteger(result.unitsDefeated) || result.unitsDefeated < 0 || result.unitsDefeated > E.PARTY_SIZE) fail('INVALID_RESULT', 'Battle result has an invalid defeated-unit count.');
    if (!Number.isSafeInteger(result.breakCount) || result.breakCount < 0 || result.breakCount > 999) fail('INVALID_RESULT', 'Battle result has an invalid Break count.');
    if (typeof result.burstUsed !== 'boolean') fail('INVALID_RESULT', 'Battle result requires an explicit Burst-used flag.');
    if (typeof result.eventHash !== 'string' || !result.eventHash || result.eventHash.length > 128) fail('INVALID_RESULT', 'Battle result requires an event hash.');
    if (!Array.isArray(result.party) || result.party.length > E.PARTY_SIZE || new Set(result.party).size !== result.party.length || result.party.some(id => !E.UNITS[id])) fail('INVALID_RESULT', 'Battle result has an invalid party snapshot.');
    if (expectedParty && JSON.stringify(result.party) !== JSON.stringify(expectedParty)) fail('INVALID_RESULT', 'Battle result party does not match the launched party.');
  }
  function validateOwnedParty(draft, party) {
    if (!Array.isArray(party) || !party.length || party.length > E.PARTY_SIZE || new Set(party).size !== party.length) fail('INVALID_PARTY', `Choose one to ${E.PARTY_SIZE} unique units.`);
    if (party.some(id => !E.UNITS[id] || !draft.owned.includes(id))) fail('INVALID_PARTY', 'The party contains an unavailable unit.');
  }
  function battleAlreadySettled(draft, settlementId) { return !!draft.settledBattles[settlementId]; }
  function markBattleSettled(draft, settlementId) { draft.settledBattles[settlementId] = true; rememberRecentTransaction(draft, settlementId); }
  function operationAlreadyCompleted(draft, transactionId) { return !!draft.completedOperations[transactionId]; }
  function markOperationCompleted(draft, transactionId) { draft.completedOperations[transactionId] = true; rememberRecentTransaction(draft, transactionId); }
  function execute(command, state, mutate, context) {
    try {
      E.validateSaveState(state);
      const before = E.normalizeSaveState(state), draft = clone(before);
      const payload = mutate(draft) || {};
      E.validateSaveState(draft);
      return {
        ok: true, command,
        transactionId: context && context.transactionId || null,
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
      if (!Array.isArray(party) || !party.length || party.length > E.PARTY_SIZE) fail('LIMIT_REACHED', `Choose one to ${E.PARTY_SIZE} units.`);
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
  function completeChallenge(state, challengeId, result) {
    const settlementId = result && typeof result.battleId === 'string' ? `challenge:${challengeId}:${result.battleId}` : null;
    return execute('completeChallenge', state, draft => {
      const cfg = E.CHALLENGES[challengeId];
      if (!cfg) fail('UNKNOWN_ID', 'Unknown Challenge.');
      if (!E.challengeUnlocked(draft, challengeId)) fail('LOCKED', 'This Challenge is still locked.');
      validateBattleResult(result, cfg.encounterId);
      if (result.victory !== true) fail('NOT_CLEARED', 'Rewards require a victory.');
      validateOwnedParty(draft, result.party);
      if (settlementId !== battleSettlementId('challenge', challengeId, result)) fail('INVALID_RESULT', 'Challenge settlement identity is invalid.');
      if (battleAlreadySettled(draft, settlementId)) return { uiEvents: ['settlement_duplicate'] };
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
      const time = result.elapsedMs;
      if (time && (!progress.bestTimeMs || time < progress.bestTimeMs)) progress.bestTimeMs = time;
      draft.challengeProgress[challengeId] = progress;
      markBattleSettled(draft, settlementId);
      if (challengeId === 'ember_trial') draft.evolutionUnlocks.cinnia = true;
      appendTelemetry(draft, { event: 'challenge_clear', challengeId, outcome: 'victory', elapsedMs: time, unitsDefeated: result.unitsDefeated || 0, breakCount: result.breakCount || 0 });
      rewards.forEach((reward, index) => appendLedger(draft, { id: `${settlementId}:${index}`, type: 'challenge_reward', gold: reward.type === 'gold' ? reward.quantity : 0, itemId: reward.id || '', quantity: reward.type === 'item' ? reward.quantity : 0 }));
      return { deltas: { challengeId, clearCount: progress.clearCount, firstClear: first }, rewards, uiEvents: ['challenge_settled'] };
    }, { transactionId: settlementId });
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
    const transactionId = requireOperationId(context, 'market');
    return execute('purchaseMarketItem', state, draft => {
      const item = E.MARKET_ITEMS[itemId];
      if (!item) fail('UNKNOWN_ID', 'Unknown Market item.');
      if (!E.marketItemUnlocked(draft, itemId)) fail('LOCKED', 'This item is still locked.');
      if (operationAlreadyCompleted(draft, transactionId)) return { uiEvents: ['settlement_duplicate'] };
      const tier = E.marketRestockTier(draft);
      if (draft.marketState.tier !== tier) draft.marketState = { tier, purchases: {} };
      const goldBefore = draft.gold, dustBefore = draft.glassDust;
      const bought = draft.marketState.purchases[itemId] || 0;
      if (bought >= item.limit) fail('LIMIT_REACHED', 'Sold out until the next story restock.');
      if (draft.gold < item.price) fail('INSUFFICIENT_FUNDS', 'Not enough Gold.');
      if (item.effect.dust && draft.glassDust < item.effect.dust) fail('INSUFFICIENT_DUST', 'Not enough Glass Dust.');
      const rewards = [];
      if (item.effect.xp) {
        if (!targetUnit || !draft.owned.includes(targetUnit)) fail('UNKNOWN_ID', 'Choose an owned unit for the manual.');
        if (!draft.unitProgress[targetUnit]) draft.unitProgress[targetUnit] = { level: 1, stars: E.UNIT_PROGRESSION[targetUnit].baseStars, xp: 0 };
        if (draft.unitProgress[targetUnit].level >= E.LEVEL_CAPS[draft.unitProgress[targetUnit].stars]) fail('LEVEL_CAP_REACHED', 'This unit is already at max level.');
        const gain = E.grantUnitXP(draft.unitProgress[targetUnit], item.effect.xp);
        rewards.push({ type: 'xp', unit: targetUnit, quantity: item.effect.xp, levelsGained: gain.levelsGained });
      }
      if (item.effect.item) {
        draft.challengeItems[item.effect.item] = (draft.challengeItems[item.effect.item] || 0) + item.effect.quantity;
        rewards.push({ type: 'item', id: item.effect.item, quantity: item.effect.quantity });
      }
      if (item.effect.dust) draft.glassDust -= item.effect.dust;
      if (item.effect.sigils) { draft.sigils += item.effect.sigils; rewards.push({ type: 'sigils', quantity: item.effect.sigils }); }
      draft.gold -= item.price;
      draft.marketState.purchases[itemId] = bought + 1;
      markOperationCompleted(draft, transactionId);
      appendLedger(draft, { id: transactionId, type: 'market_purchase', gold: -item.price, dust: -(item.effect.dust || 0), sigils: item.effect.sigils || 0, itemId, quantity: 1 });
      appendTelemetry(draft, { event: 'market_settlement', itemId, goldBefore, goldAfter: draft.gold, dustBefore, dustAfter: draft.glassDust });
      return { deltas: { gold: -item.price, purchases: draft.marketState.purchases[itemId] }, rewards, uiEvents: ['market_purchase'] };
    }, { transactionId });
  }
  function performSummon(state, bannerId, count, rng, context) {
    const transactionId = requireOperationId(context, 'summon');
    rng = typeof rng === 'function' ? rng : Math.random;
    return execute('performSummon', state, draft => {
      const banner = E.BANNERS[bannerId], cost = banner && banner.cost[count];
      if (!banner || !cost) fail('UNKNOWN_ID', 'Unknown banner or pull count.');
      if (!draft.featureUnlocks.summon) fail('LOCKED', 'Summoning unlocks after mission 1-9: The Still Basin.');
      if (operationAlreadyCompleted(draft, transactionId)) return { uiEvents: ['settlement_duplicate'] };
      if (draft.sigils < cost) fail('INSUFFICIENT_FUNDS', 'Not enough Sigils.');
      const family = draft.summonState[banner.family], rewards = [];
      const sigilsBefore = draft.sigils;
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
      draft.sigils -= cost; draft.summonHistory = draft.summonHistory.slice(-100); markOperationCompleted(draft, transactionId);
      appendTelemetry(draft, { event: 'summon_settlement', bannerId, pulls: count, sigilsBefore, sigilsAfter: draft.sigils });
      return { deltas: { sigils: -cost }, rewards, uiEvents: ['summon_complete'] };
    }, { transactionId });
  }
  function completeMission(state, missionId, result, party) {
    const mission = Registry.missions[missionId];
    const settlementId = result && typeof result.battleId === 'string' ? `mission:${missionId}:${result.battleId}` : null;
    return execute('completeMission', state, draft => {
      if (!mission) fail('UNKNOWN_ID', 'Unknown story mission.');
      validateBattleResult(result, mission.encounter || null, party);
      if (mission.scriptedLoss) {
        if (result.outcome !== 'scripted_loss' || result.victory !== false) fail('INVALID_RESULT', 'Mission requires its scripted outcome.');
      } else if (result.outcome !== 'victory' || result.victory !== true) fail('INVALID_RESULT', 'Mission was not completed.');
      if (settlementId !== battleSettlementId('mission', missionId, result)) fail('INVALID_RESULT', 'Mission settlement identity is invalid.');
      if (battleAlreadySettled(draft, settlementId)) return { uiEvents: ['settlement_duplicate'] };

      const firstClear = !draft.missionClears[missionId];
      const chapterIndex = Registry.chapters.findIndex(chapter => chapter.id === mission.chapterId);
      const chapter = Registry.chapters[chapterIndex], missionIndex = chapter && chapter.missions.findIndex(item => item.id === missionId);
      if (firstClear && (!chapter || Registry.chapters.slice(0, chapterIndex).some(item => item.missions.some(prior => !draft.missionClears[prior.id])) || chapter.missions.slice(0, missionIndex).some(prior => !draft.missionClears[prior.id]))) fail('LOCKED', 'Clear the preceding story missions first.');
      if (!Array.isArray(party) || party.length > E.PARTY_SIZE || new Set(party).size !== party.length || party.some(id => !E.UNITS[id])) fail('INVALID_PARTY', `Mission parties require up to ${E.PARTY_SIZE} unique known units.`);
      if (mission.encounter && !party.length) fail('INVALID_PARTY', 'Battle missions require at least one unit.');
      const partyMode = mission.partyMode || (mission.party && mission.party.length ? 'fixed' : 'player');
      const fixedParty = mission.fixedParty || mission.party || [];
      if (partyMode === 'fixed') {
        if (JSON.stringify(party) !== JSON.stringify(fixedParty)) fail('INVALID_PARTY', 'This mission uses a fixed authored party.');
      } else if (partyMode === 'player') {
        if (party.some(id => !draft.owned.includes(id))) fail('INVALID_PARTY', 'The mission party contains an unavailable unit.');
      } else if (partyMode === 'player_plus_guests') {
        const guests = new Set(mission.guests || []);
        if (party.some(id => !draft.owned.includes(id) && !guests.has(id))) fail('INVALID_PARTY', 'The mission party contains an unavailable unit.');
      } else fail('INVALID_PARTY', `Unknown mission party mode: ${partyMode}`);
      const cfg = mission.encounter && E.BATTLES[mission.encounter];
      if (mission.encounter && !cfg) fail('UNKNOWN_ID', 'Mission encounter has no reward configuration.');
      const table = cfg ? cfg.rewards[firstClear ? 'first' : 'repeat'] : { gold: 0, xp: 0 };
      const reward = { type: 'mission', key: mission.encounter || missionId, title: cfg ? cfg.title : mission.title, firstClear, gold: table.gold, xp: table.xp, sigils: firstClear && cfg ? cfg.sigils : 0, units: [] };
      draft.gold += reward.gold;
      draft.sigils += reward.sigils;
      for (const unitId of party) {
        const progress = draft.unitProgress[unitId] || (draft.unitProgress[unitId] = { level: 1, stars: E.UNIT_PROGRESSION[unitId].baseStars, xp: 0 });
        reward.units.push(Object.assign({ key: unitId, name: E.UNITS[unitId].name }, E.grantUnitXP(progress, reward.xp)));
      }
      draft.missionClears[missionId] = true;
      if (firstClear) {
        for (const unitId of mission.unlocks && mission.unlocks.units || []) if (E.UNITS[unitId] && !draft.owned.includes(unitId)) {
          draft.owned.push(unitId);
          draft.unitProgress[unitId] ||= { level: 1, stars: E.UNIT_PROGRESSION[unitId].baseStars, xp: 0 };
          draft.libraryUnlocked[`${unitId}:base`] = true;
        }
        for (const [feature, unlocked] of Object.entries(mission.unlocks || {})) if (feature !== 'units' && unlocked === true) draft.featureUnlocks[feature] = true;
      }
      if (mission.chapterId === 'chapter1') {
        const chapter = Registry.chapters[0];
        let progress = 0;
        while (progress < chapter.missions.length && draft.missionClears[chapter.missions[progress].id]) progress++;
        draft.act1MissionProgress = progress;
      }
      if (chapter && chapter.missions.every(item => draft.missionClears[item.id])) draft.storyStep = Math.max(draft.storyStep, Math.min(4, chapterIndex + 1));
      for (const unitId of mission.unlocks && mission.unlocks.units || []) draft.storyRecruitments[`recruit:${missionId}:${unitId}`] = true;
      Object.assign(draft, E.normalizeSaveState(draft));
      markBattleSettled(draft, settlementId);
      return { deltas: { gold: reward.gold, sigils: reward.sigils, missionId, firstClear }, rewards: [reward], uiEvents: ['mission_complete'] };
    }, { transactionId: settlementId });
  }
  function completeSideMission(state, sideMissionId, result, party) {
    const settlementId = result && typeof result.battleId === 'string' ? `side:${sideMissionId}:${result.battleId}` : null;
    return execute('completeSideMission', state, draft => {
      const cfg = E.SIDE_MISSIONS[sideMissionId];
      if (!cfg) fail('UNKNOWN_ID', 'Unknown side mission.');
      if (!E.sideMissionUnlocked(draft, sideMissionId)) fail('LOCKED', 'This contract is not available yet.');
      validateOwnedParty(draft, party);
      validateBattleResult(result, cfg.battle, party);
      if (result.victory !== true) fail('NOT_CLEARED', 'Side-mission rewards require a victory.');
      if (settlementId !== battleSettlementId('side', sideMissionId, result)) fail('INVALID_RESULT', 'Side-mission settlement identity is invalid.');
      if (battleAlreadySettled(draft, settlementId)) return { uiEvents: ['settlement_duplicate'] };
      const tier = E.marketRestockTier(draft);
      const progress = draft.sideMissionProgress[sideMissionId] || { clearCount: 0, firstClear: false, rewardTier: tier, rewardedClears: 0 };
      if (progress.rewardTier !== tier) { progress.rewardTier = tier; progress.rewardedClears = 0; }
      if (progress.rewardedClears >= cfg.rewardLimit) fail('LIMIT_REACHED', 'This contract has paid its current story-tier allotment. Advance the story to refresh it.');
      const firstClear = !progress.firstClear;
      const battle = E.BATTLES[cfg.battle], table = battle.rewards[firstClear ? 'first' : 'repeat'];
      const reward = { type: 'side_mission', key: cfg.battle, title: cfg.title, firstClear, gold: table.gold, xp: table.xp, sigils: firstClear ? battle.sigils : 0, units: [] };
      draft.gold += reward.gold; draft.sigils += reward.sigils;
      for (const unitId of party) {
        const progressState = draft.unitProgress[unitId] || (draft.unitProgress[unitId] = { level: 1, stars: E.UNIT_PROGRESSION[unitId].baseStars, xp: 0 });
        reward.units.push(Object.assign({ key: unitId, name: E.UNITS[unitId].name }, E.grantUnitXP(progressState, reward.xp)));
      }
      progress.clearCount++; progress.firstClear = true; progress.rewardedClears++; draft.sideMissionProgress[sideMissionId] = progress;
      markBattleSettled(draft, settlementId);
      appendTelemetry(draft, { event: 'side_mission_clear', outcome: 'victory', elapsedMs: result.elapsedMs, unitsDefeated: result.unitsDefeated, breakCount: result.breakCount });
      appendLedger(draft, { id: settlementId, type: 'side_mission_reward', gold: reward.gold, itemId: sideMissionId, quantity: 1 });
      return { deltas: { sideMissionId, clearCount: progress.clearCount, rewardedClears: progress.rewardedClears, firstClear }, rewards: [reward], uiEvents: ['side_mission_complete'] };
    }, { transactionId: settlementId });
  }
  function recruitStoryUnit(state, unitId, missionId, context) {
    const recruitmentId = `recruit:${missionId}:${unitId}`;
    return execute('recruitStoryUnit', state, draft => {
      if (!E.UNITS[unitId]) fail('UNKNOWN_ID', 'Unknown story unit.');
      if (!draft.missionClears[missionId]) fail('LOCKED', 'Recruitment mission is not cleared.');
      if (draft.storyRecruitments[recruitmentId]) return { uiEvents: ['settlement_duplicate'] };
      const rarity = E.UNIT_PROGRESSION[unitId].baseStars, newUnit = !draft.owned.includes(unitId); let dust = 0;
      if (newUnit) { draft.owned.push(unitId); draft.unitProgress[unitId] = { level: 1, stars: rarity, xp: 0 }; draft.libraryUnlocked[`${unitId}:base`] = true; }
      else if ((draft.ranks[unitId] || 0) < 5) draft.ranks[unitId] = (draft.ranks[unitId] || 0) + 1;
      else { dust = rarity === 4 ? 20 : 10; draft.glassDust += dust; }
      draft.storyRecruitments[recruitmentId] = true; rememberRecentTransaction(draft, recruitmentId);
      return { rewards: [{ type: 'unit', unitId, rarity, newUnit, rank: draft.ranks[unitId] || 0, dust }], uiEvents: ['story_recruitment'] };
    }, { transactionId: context && context.transactionId || recruitmentId });
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
  return Object.freeze({ execute, setActiveParty, setAIPreset, completeChallenge, recordTelemetry, purchaseMarketItem, performSummon, completeMission, completeSideMission, recruitStoryUnit, evolutionEligibility, evolveUnit, commitEnvelope });
})(typeof Engine !== 'undefined' ? Engine : require('./engine-dev.js'), typeof STORY_REGISTRY !== 'undefined' ? STORY_REGISTRY : require('./story-registry.js'));

if (typeof module !== 'undefined') module.exports = GameState;
