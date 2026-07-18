/* Headless cadence check for the live-combat adapter. */
const E = require('./engine-dev.js');

const SCALE = { ch1: 2.0, ch2: 2.4, ch3: 1, ch6: 0.85 };
const ATK_SCALE = { ch1: 1, ch2: 1.08, ch3: 1, ch6: 1.0 };

function targetFor(s, u, a) {
  if (a.target === 'none') return null;
  if (a.target === 'enemy') {
    const targets = E.livingEnemies(s).slice().sort((x, y) => (x.hp / x.maxhp) - (y.hp / y.maxhp));
    return (targets[0] || {}).uid || null;
  }
  let allies = E.livingParty(s).filter(x => !(a.target === 'ally_other' && (x.uid === u.uid || x.awakened)));
  if (a.target === 'ally_other') allies.sort((x, y) => x.energy - y.energy);
  else allies.sort((x, y) => (x.hp / x.maxhp) - (y.hp / y.maxhp));
  return (allies[0] || u).uid;
}

function run(key, party, limit) {
  const s = E.newBattle(key, party);
  for (const en of s.enemies) {
    en.maxhp = Math.round(en.maxhp * SCALE[key]); en.hp = en.maxhp;
    en.atk = Math.round(en.atk * ATK_SCALE[key]);
  }
  const skillCd = {}, guardCd = {};
  s.party.forEach(u => { skillCd[u.uid] = 0; guardCd[u.uid] = 0; });
  let enemy = key === 'ch3' ? 3.2 : 3.8, upkeep = 5, t = 0;
  const dt = 0.1;
  while (!s.result && t < limit) {
    t += dt;
    if (s.lock === 'bulwark') {
      const hale = E.byKey(s, 'hale'); E.liveAct(s, hale.uid, 'glass_bulwark');
    }
    for (const u of E.livingParty(s)) {
      skillCd[u.uid] = Math.max(0, skillCd[u.uid] - dt);
      guardCd[u.uid] = Math.max(0, guardCd[u.uid] - dt);
      const actions = E.availableLiveActions(s, u.uid);
      const skill = actions.find(a => a.tier === 'Skill' && a.ok);
      if (skill && skillCd[u.uid] <= 0) {
        E.liveAct(s, u.uid, skill.id, targetFor(s, u, skill));
        skillCd[u.uid] = u.role === 'Supporter' ? 5.4 : u.role === 'Healer' ? 5.8 : u.role === 'Breaker' ? 6.2 : 5.6;
      }
      const telegraph = s.enemies.some(en => en.alive && en.tele === 1);
      const guard = actions.find(a => a.id === 'guard' && a.ok);
      if (telegraph && guard && guardCd[u.uid] <= 0) { E.liveAct(s, u.uid, 'guard'); guardCd[u.uid] = 5; }
      const now = E.availableLiveActions(s, u.uid);
      const burst = now.find(a => a.tier === 'Burst' && a.ok);
      const art = now.find(a => a.tier === 'Art' && a.ok);
      if (burst) E.liveAct(s, u.uid, burst.id, targetFor(s, u, burst));
      else if (art && u.role === 'Healer' && E.partyHPfrac(s) < 0.72) E.liveAct(s, u.uid, art.id, targetFor(s, u, art));
    }
    enemy -= dt;
    if (enemy <= 0 && !s.result) { E.liveEnemyPhase(s); enemy = key === 'ch6' ? 3.25 : 3.7; }
    upkeep -= dt;
    if (upkeep <= 0 && !s.result) { E.liveUpkeep(s); upkeep = 5; }
  }
  return { result: s.result || 'timeout', seconds: Math.round(t * 10) / 10, round: s.round, hp: Math.round(E.partyHPfrac(s) * 100), finale: !!s.script.finaleDone, awakened: !!s.script.awakened };
}

module.exports = { run };

if (require.main === module) {
  const cases = [
    ['ch1', ['hale', 'cinnia', 'tobin'], 60],
    ['ch2', ['hale', 'cinnia', 'tobin', 'marlowe', 'brant'], 90],
    ['ch3', ['hale', 'cinnia', 'tobin', 'marlowe', 'brant'], 45],
    ['ch6', ['hale', 'cinnia', 'tobin', 'brant', 'hearthgar'], 180],
  ];
  for (const c of cases) console.log(c[0], run(...c));
}
