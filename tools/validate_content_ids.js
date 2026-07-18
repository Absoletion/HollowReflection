'use strict';

const Engine = require('../dev/engine-dev.js');
const STORY_REGISTRY = require('../dev/story-registry.js');

function validateContentIds(engine = Engine, story = STORY_REGISTRY) {
  const errors = [];
  const seen = new Map();
  const add = (domain, id) => {
    if (typeof id !== 'string' || !/^[a-z][a-z0-9_]*(?::[a-z0-9_]+)?$/.test(id)) errors.push(`${domain}: invalid ID ${JSON.stringify(id)}`);
    const key = `${domain}:${id}`;
    if (seen.has(key)) errors.push(`${domain}: duplicate ID ${id}`);
    seen.set(key, true);
  };

  for (const id of Object.keys(engine.UNITS)) add('unit', id);
  for (const id of Object.keys(engine.ENEMIES)) add('enemy', id);
  for (const id of Object.keys(engine.BATTLES)) add('encounter', id);
  for (const id of Object.keys(engine.UNIT_PROGRESSION)) {
    add('progression', id);
    if (!engine.UNITS[id]) errors.push(`progression: unknown unit ${id}`);
  }
  for (const entry of engine.UNIT_LIBRARY) {
    add('library', entry.id);
    if (!engine.UNITS[entry.key]) errors.push(`library ${entry.id}: unknown unit ${entry.key}`);
  }
  for (const [unitId, unit] of Object.entries(engine.UNITS)) {
    for (const ability of unit.specials || []) add('ability', ability.id);
    if (!engine.UNIT_PROGRESSION[unitId]) errors.push(`unit ${unitId}: missing progression definition`);
  }
  for (const ability of engine.HALE_AWAKENED.specials || []) add('ability', ability.id);
  for (const [encounterId, encounter] of Object.entries(engine.BATTLES)) {
    for (const enemyId of encounter.enemies || []) if (!engine.ENEMIES[enemyId]) errors.push(`encounter ${encounterId}: unknown enemy ${enemyId}`);
  }
  for (const [challengeId, challenge] of Object.entries(engine.CHALLENGES || {})) {
    add('challenge', challengeId);
    if (!engine.BATTLES[challenge.encounterId]) errors.push(`challenge ${challengeId}: unknown encounter ${challenge.encounterId}`);
    for (const bundle of [challenge.firstClear, challenge.repeatClear]) for (const itemId of Object.keys(bundle.items || {})) if (!engine.CHALLENGE_ITEMS[itemId]) errors.push(`challenge ${challengeId}: unknown item ${itemId}`);
    for (const mastery of challenge.mastery || []) if (!['no_defeats', 'no_burst'].includes(mastery.evaluator)) errors.push(`challenge ${challengeId}: unknown mastery evaluator ${mastery.evaluator}`);
  }
  for (const [itemId, item] of Object.entries(engine.MARKET_ITEMS || {})) {
    add('market', itemId);
    if (!Number.isSafeInteger(item.price) || item.price <= 0 || !Number.isSafeInteger(item.limit) || item.limit <= 0) errors.push(`market ${itemId}: invalid price or limit`);
    if (item.effect.item && !engine.CHALLENGE_ITEMS[item.effect.item]) errors.push(`market ${itemId}: unknown reward item ${item.effect.item}`);
  }
  for (const chapter of story.chapters || []) {
    add('chapter', chapter.id);
    for (const mission of chapter.missions || []) {
      add('mission', mission.id);
      if (mission.type === 'battle' && !engine.BATTLES[mission.encounter || mission.id]) errors.push(`mission ${mission.id}: unknown encounter ${mission.encounter || mission.id}`);
      for (const unitId of mission.party || []) if (!engine.UNITS[unitId]) errors.push(`mission ${mission.id}: unknown party unit ${unitId}`);
      for (const unitId of mission.unlocks && mission.unlocks.units || []) if (!engine.UNITS[unitId]) errors.push(`mission ${mission.id}: unknown unlocked unit ${unitId}`);
    }
  }

  if (errors.length) throw new Error(`Content ID validation failed:\n- ${errors.join('\n- ')}`);
  return {
    units: Object.keys(engine.UNITS).length,
    enemies: Object.keys(engine.ENEMIES).length,
    encounters: Object.keys(engine.BATTLES).length,
    challenges: Object.keys(engine.CHALLENGES || {}).length,
    marketItems: Object.keys(engine.MARKET_ITEMS || {}).length,
    missions: (story.chapters || []).reduce((count, chapter) => count + (chapter.missions || []).length, 0),
  };
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) {
    const duplicate = JSON.parse(JSON.stringify(STORY_REGISTRY));
    duplicate.chapters[0].missions.push({ ...duplicate.chapters[0].missions[0] });
    let rejected = false;
    try { validateContentIds(Engine, duplicate); } catch (error) { rejected = /duplicate ID/.test(error.message); }
    if (!rejected) throw new Error('Validator self-test failed to reject a duplicate mission ID.');
  }
  console.log(JSON.stringify({ ok: true, ...validateContentIds() }, null, 2));
}

module.exports = { validateContentIds };
