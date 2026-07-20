'use strict';

const fs = require('fs');
const path = require('path');
const Engine = require('../dev/engine-dev.js');

const PARTY_PROFILES = {
  story_default: ['hale', 'cinnia', 'tobin', 'hearthgar'],
  attacker_heavy: ['hale', 'marlowe', 'brant', 'cinnia'],
  break_heavy: ['brant', 'brigga', 'hale', 'cinnia'],
  healer_light: ['hale', 'marlowe', 'brant', 'tobin'],
  low_rarity: ['hale', 'tobin', 'nix', 'brigga'],
};

function rng(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 0x100000000; };
}
function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}
function simulate(encounterId, party, seed) {
  const random = rng(seed), battle = Engine.newBattle(encounterId, party, { rng: random, seed });
  let cycles = 0, burstUsed = false;
  while (!battle.result && cycles < 180) {
    for (const unit of Engine.livingParty(battle)) {
      const actions = Engine.availableLiveActions(battle, unit.uid).filter(action => action.ok);
      const action = actions.find(x => x.tier === 'Burst') || actions.find(x => x.tier === 'Art') || actions.find(x => x.tier === 'Skill');
      if (!action) continue;
      if (action.tier === 'Burst') burstUsed = true;
      const target = action.target === 'enemy' ? Engine.livingEnemies(battle)[0] : null;
      Engine.liveAct(battle, unit.uid, action.id, target && target.uid);
      if (battle.result) break;
    }
    if (!battle.result) Engine.liveEnemyPhase(battle);
    if (!battle.result) Engine.liveUpkeep(battle);
    cycles++;
  }
  return {
    victory: battle.result === 'victory',
    elapsedMs: cycles * 5000,
    unitsDefeated: battle.party.filter(unit => !unit.alive).length,
    damageTaken: battle.party.reduce((sum, unit) => sum + (unit.maxhp - unit.hp), 0),
    breakCount: battle.enemies.reduce((sum, enemy) => sum + (enemy.staggers || 0), 0),
    burstUsed,
    retries: battle.result ? 0 : 1,
  };
}

const encounters = Object.keys(Engine.BATTLES).filter(id => /^act[1-4]_/.test(id));
const report = {};
for (const encounterId of encounters) {
  report[encounterId] = {};
  for (const [profile, party] of Object.entries(PARTY_PROFILES)) {
    const runs = Array.from({ length: 10 }, (_, i) => simulate(encounterId, party.filter(key => Engine.UNITS[key]), 0x48520000 + i));
    const wins = runs.filter(run => run.victory);
    report[encounterId][profile] = {
      winRate: wins.length / runs.length,
      medianClearTimeMs: percentile(wins.map(run => run.elapsedMs), 0.5),
      p10ClearTimeMs: percentile(wins.map(run => run.elapsedMs), 0.1),
      p90ClearTimeMs: percentile(wins.map(run => run.elapsedMs), 0.9),
      averageDefeatedUnits: runs.reduce((sum, run) => sum + run.unitsDefeated, 0) / runs.length,
      averageDamageTaken: runs.reduce((sum, run) => sum + run.damageTaken, 0) / runs.length,
      averageBreakCount: runs.reduce((sum, run) => sum + run.breakCount, 0) / runs.length,
      burstUsage: runs.filter(run => run.burstUsed).length / runs.length,
      retryRate: runs.reduce((sum, run) => sum + run.retries, 0) / runs.length,
    };
  }
}
const out = path.join(__dirname, '..', 'artifacts', 'balance-report.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ version: 1, seed: 0x48520000, encounters: report }, null, 2) + '\n');
console.log(`Balance report written: ${encounters.length} encounters × ${Object.keys(PARTY_PROFILES).length} profiles.`);
for (const id of encounters) console.log(`${id}: ${Object.values(report[id]).map(x => `${Math.round(x.winRate * 100)}%/${Math.round(x.medianClearTimeMs / 1000)}s`).join(' · ')}`);
