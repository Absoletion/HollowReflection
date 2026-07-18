/* Playtest simulation: a competent-but-not-optimal heuristic AI plays the
   Ch.6 Lowing Man fight N times. Target win rate: 60-80%. */
const E = require('./engine-dev.js');

function lowestHP(units) { return units.slice().sort((a, b) => (a.hp / a.maxhp) - (b.hp / b.maxhp))[0]; }

function chooseAction(s, u) {
  const boss = s.enemies.find(e => e.key === 'lowingman');
  const calves = s.enemies.filter(e => e.key === 'calf' && e.alive);
  const acts = E.availableActions(s, u.uid);
  const can = id => { const a = acts.find(x => x.id === id); return a && a.ok; };
  const stampede = boss && boss.alive && boss.intent && (boss.intent.a === 'stampede');
  const beastBar = boss && boss.alive && boss.form === 'beast' && !boss.staggered;
  const low = E.livingParty(s).filter(x => x.hp < x.maxhp * 0.5);
  const atkTarget = calves.length ? lowestHP(calves).uid : boss.uid;
  const free = s.freeRound === s.round;

  if (free) { // finisher window: dump the big buttons
    if (u.key === 'hale' && can('shatterfall')) return ['shatterfall', boss.uid];
    if (u.key === 'brant' && can('keelhaul')) return ['keelhaul', boss.uid];
    if (u.key === 'cinnia' && can('feast')) return ['feast', null];
    if (u.key === 'milla' && can('delivery')) return ['delivery', null];
    if (u.key === 'hearthgar' && can('bank_coals')) return ['bank_coals', null];
  }
  switch (u.key) {
    case 'brant':
      if (beastBar && can('anchor_drop')) return ['anchor_drop', boss.uid];
      if (!beastBar && can('keelhaul')) return ['keelhaul', boss.uid];
      if (stampede) return ['guard', null];
      return ['basic', boss.uid];
    case 'cinnia': {
      if (low.length >= 2 && can('field_rations')) return ['field_rations', null];
      const crit = E.livingParty(s).filter(x => x.hp < x.maxhp * 0.4);
      if (crit.length && can('quick_bite')) return ['quick_bite', lowestHP(crit).uid];
      if (can('feast') && low.length >= 1) return ['feast', null];
      if (stampede) return ['guard', null];
      return ['basic', atkTarget];
    }
    case 'hearthgar':
      if (stampede) return ['guard', null];
      if (boss.form === 'man' && can('brace')) return ['brace', null];
      if (u.cinders >= 4 && can('bank_coals')) return ['bank_coals', null];
      if (u.energy < 2) return ['guard', null];
      return ['basic', atkTarget];
    case 'milla': {
      const brant = E.byKey(s, 'brant');
      if (stampede && u.energy < 1) return ['guard', null];
      if (brant && brant.alive && brant.energy <= 1 && can('handoff')) return ['handoff', brant.uid];
      if (can('express')) return ['express', brant && brant.alive ? brant.uid : null];
      if (stampede) return ['guard', null];
      return ['basic', atkTarget];
    }
    case 'hale':
      if (!u.awakened) {
        if (stampede) return ['guard', null];
        if (can('cross_slash')) return ['cross_slash', atkTarget];
        return ['basic', atkTarget];
      }
      if (stampede && can('glass_bulwark')) return ['glass_bulwark', null];
      if (u.hp < u.maxhp * 0.45 && can('leech_edge') && u.blades >= 4) return ['leech_edge', boss.uid];
      if (can('shatterfall') && u.blades >= 6) return ['shatterfall', boss.uid];
      return ['basic', atkTarget];
  }
  return ['basic', atkTarget];
}

function playOnce(seedLog) {
  const s = E.newBattle('ch6', ['hale', 'cinnia', 'brant', 'hearthgar']);
  let guard = 0;
  while (!s.result && s.round < 60) {
    // finale lock: press the one glowing button
    if (s.lock === 'bulwark') { E.playerAct(s, E.byKey(s, 'hale').uid, 'glass_bulwark'); continue; }
    const u = E.livingParty(s).find(x => !x.acted);
    if (!u) break;
    const [a, t] = chooseAction(s, u);
    const before = s.round;
    E.playerAct(s, u.uid, a, t);
    if (s.lock === 'bulwark') continue;
    if (u.acted === false && s.round === before && !s.result) { E.playerAct(s, u.uid, 'basic', s.enemies.find(e => e.alive).uid); }
    if (++guard > 4000) break;
  }
  return { win: s.result === 'victory', rounds: s.round, result: s.result };
}

const N = parseInt(process.argv[2] || '200', 10);
let wins = 0, roundsSum = 0, timeouts = 0;
for (let i = 0; i < N; i++) {
  const r = playOnce();
  if (r.win) { wins++; roundsSum += r.rounds; }
  if (!r.result) timeouts++;
}
console.log(`Lowing Man fight: ${wins}/${N} wins (${(100 * wins / N).toFixed(1)}%), avg winning length ${(roundsSum / Math.max(1, wins)).toFixed(1)} rounds, timeouts ${timeouts}`);

// sanity: early chapters should be easy
function easyFight(key, party) {
  let w = 0;
  for (let i = 0; i < 100; i++) {
    const s = E.newBattle(key, party);
    let g = 0;
    while (!s.result && s.round < 40 && g++ < 2000) {
      const u = E.livingParty(s).find(x => !x.acted); if (!u) break;
      const en = s.enemies.filter(e => e.alive);
      const tgt = en.sort((a, b) => a.hp - b.hp)[0];
      if (u.key === 'cinnia' && E.livingParty(s).some(x => x.hp < x.maxhp * 0.5) && u.energy >= 2) E.playerAct(s, u.uid, 'field_rations');
      else if (u.key === 'brant' && tgt && tgt.breakMax && u.energy >= 1) E.playerAct(s, u.uid, 'anchor_drop', tgt.uid);
      else if (tgt) E.playerAct(s, u.uid, 'basic', tgt.uid);
    }
    if (s.result === 'victory') w++;
  }
  return w;
}
console.log(`Ch1 (basics only): ${easyFight('ch1', ['hale', 'cinnia', 'tobin'])}/100 wins`);
console.log(`Ch2 (basics only): ${easyFight('ch2', ['hale', 'cinnia', 'tobin', 'brant'])}/100 wins`);
