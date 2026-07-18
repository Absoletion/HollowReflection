/* ============================================================================
   PROJECT HOLLOWING — engine self-tests.
   Runs in node (against engine-dev.js) and in-browser (window.runSelfTests).
   Deterministic: rng fixed at 0.5 => damage variance is exactly 1.0 and
   target picks are the middle living unit.
   ============================================================================ */
function runHollowingSelfTests(E, print) {
  'use strict';
  print = print || function () {};
  let pass = 0, fail = 0; const failures = [];
  function ok(cond, name) {
    if (cond) { pass++; }
    else { fail++; failures.push(name); print('  FAIL: ' + name); }
  }
  const RNG = () => 0.5;
  const T = E._test;
  function fresh(key, party, opts) {
    return E.newBattle(key, party, Object.assign({ rng: RNG }, opts || {}));
  }

  /* --- 1. Elemental wheel: Fire>Earth>Thunder>Water>Fire, Light<->Dark, Hollow neutral --- */
  ok(E.elemMult('fire', 'earth') === 1.5, 'wheel: fire beats earth');
  ok(E.elemMult('earth', 'thunder') === 1.5, 'wheel: earth beats thunder');
  ok(E.elemMult('thunder', 'water') === 1.5, 'wheel: thunder beats water');
  ok(E.elemMult('water', 'fire') === 1.5, 'wheel: water beats fire');
  ok(E.elemMult('earth', 'fire') === 0.67, 'wheel: earth weak vs fire');
  ok(E.elemMult('light', 'dark') === 1.5 && E.elemMult('dark', 'light') === 1.5, 'light<->dark punish both ways');
  ok(E.elemMult('hollow', 'fire') === 1.0 && E.elemMult('fire', 'hollow') === 1.0, 'hollow neutral both ways');

  /* --- 2. Battle construction --- */
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    ok(s.party.length === 3 && s.enemies.length === 2 && s.round === 1, 'ch1 battle constructed');
    ok(s.party.every(u => u.energy === 0), 'units start at 0 energy');
  }

  /* --- 3. Basic attack: +1 energy, damage lands --- */
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    const hale = E.byKey(s, 'hale'), c = s.enemies[0];
    E.playerAct(s, hale.uid, 'basic', c.uid);
    ok(hale.energy === 1, 'basic charges +1 energy');
    ok(c.hp === 150 - 55, 'basic deals listed damage (55, hollow neutral)');
  }

  /* --- 4. Guard: +1 energy, halves damage, cap at 3 --- */
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    const hale = E.byKey(s, 'hale');
    E.playerAct(s, hale.uid, 'guard');
    ok(hale.energy === 1 && hale.guarding, 'guard charges +1 and sets guarding');
    hale.energy = 3;
    const t = E.byKey(s, 'tobin'); t.energy = 3;
    E.playerAct(s, t.uid, 'guard');
    ok(t.energy === 3, 'energy caps at 3 bars');
    // guarded hit takes half (hollow vs hollow-neutral: use raw 100 on hale)
    const ev = [];
    T.dealToPlayer(s, s.enemies[0], hale, 100, ev); // earth vs hollow = 1.0
    ok(hale.hp === 440 - 50, 'guard halves incoming damage');
  }

  /* --- 5. Skill costs 1 bar --- */
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    const hale = E.byKey(s, 'hale'); hale.energy = 1;
    const c = s.enemies[0];
    E.playerAct(s, hale.uid, 'cross_slash', c.uid);
    ok(hale.energy === 0 && c.hp === 150 - 129 && c.buffs.some(b => b.k === 'darkResDown'), 'Cross Slash: two hits and Dark resistance fracture');
  }

  /* --- 6. Mitigation cap 50%; Guard applies after the cap --- */
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    const hale = E.byKey(s, 'hale');
    hale.buffs.push({ k: 'defUp', v: 0.4, t: 2 }, { k: 'dmgCut', v: 0.3, t: 2 });
    hale.guarding = true;
    const ev = [];
    T.dealToPlayer(s, s.enemies[0], hale, 100, ev);
    ok(hale.hp === 440 - 25, 'mitigation caps at 50%, guard halves after cap (100 -> 25)');
  }

  /* --- 7. Ox break bar: stagger, delay-once, +25% refill ramp --- */
  {
    const s = fresh('ch2', ['hale', 'cinnia', 'tobin', 'brant', 'brigga']);
    const ox = s.enemies[2]; const ev = [];
    T.dealBreak(s, E.byKey(s, 'brant'), ox, 60, ev);
    ok(ox.staggered && ox.staggers === 1 && ox.breakCur === 0, 'break bar at 0 staggers the ox');
    T.dealBreak(s, E.byKey(s, 'brant'), ox, 55, ev);
    ok(ox.staggers === 1, 'staggered enemy cannot be re-delayed (delay-once rule)');
    T.dealToEnemy(s, E.byKey(s, 'hale'), ox, 100, 0, ev);
    ok(ox.hp === 520 - 150, 'staggered enemy takes +50% damage');
    T.enemyPhase(s, ev);
    ok(!ox.staggered && ox.breakCur === 75, 'stagger skips its action; bar refills at +25% capacity (60 -> 75)');
  }

  /* --- 8. Brigga: Short Fuse + Grand Opening stagger rider --- */
  {
    const s = fresh('ch2', ['brigga', 'hale', 'cinnia']);
    const ox = s.enemies[2]; const brigga = E.byKey(s, 'brigga');
    brigga.energy = 3;
    E.playerAct(s, brigga.uid, 'grand_opening', ox.uid);
    ok(ox.staggered, 'Grand Opening (65 brk x1.25 Short Fuse) staggers the fresh ox bar');
    ok(brigga.energy === 1, 'stagger rider: party +1 energy (brigga 3-3+1)');
    ok(E.byKey(s, 'hale').energy === 1, 'stagger rider reaches allies');
    ok(ox.hp === 520 - 180, 'fire vs earth = 1.5x (120 -> 180)');
  }

  /* --- Passive inventory and Still Water visibility --- */
  {
    ok(Object.values(E.UNITS).every(u => u.passive && u.passive.name && u.passive.kind && u.passive.desc), 'every roster unit has one canonical classified passive');
    ok(E.HALE_AWAKENED.passive.kind === 'conditional', 'Hale awakened passive is included in the canonical audit');
    ok(!E.canReadIntents(fresh('ch1', ['hale', 'cinnia'])) && E.canReadIntents(fresh('ch1', ['hale', 'tobin'])), 'Still Water reveals intents only while Tobin is present and alive');
  }

  /* --- 9-12. Hale forms share the standard Energy system --- */
  {
    const s = fresh('ch6', ['hale', 'cinnia', 'brant'], { awakenedHale: true });
    const hale = E.byKey(s, 'hale'); const boss = s.enemies[0];
    ok(hale.awakened && hale.energy === 3 && hale.blades === 0, 'UnHollowed Hale starts with full standard Energy and no blade resource');
    E.playerAct(s, hale.uid, 'fracture_edge', boss.uid);
    ok(hale.energy === 2 && boss.hp < boss.maxhp, 'Fracture Edge costs one Energy and damages the target');
    boss.skipNext = true;
    E.playerAct(s, E.byKey(s, 'cinnia').uid, 'guard');
    E.playerAct(s, E.byKey(s, 'brant').uid, 'guard');
    hale.energy = 2;
    let acts = E.availableActions(s, hale.uid);
    ok(acts.find(a => a.id === 'event_horizon').ok && !acts.find(a => a.id === 'shatterfall').ok, 'Arts and Burst gate at two and three Energy');
    E.playerAct(s, hale.uid, 'event_horizon', boss.uid);
    ok(hale.energy === 0, 'Event Horizon costs two Energy');
  }

  /* --- 13. Cinnia: overheal -> Well-Fed regen (passive Seconds) --- */
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    const cinnia = E.byKey(s, 'cinnia'); cinnia.energy = 2;
    E.playerAct(s, cinnia.uid, 'field_rations');
    ok(E.byKey(s, 'tobin').buffs.some(b => b.k === 'regen'), 'overheal becomes Well-Fed regen');
  }

  /* --- 14. Nix: Bedside Manner (+50% on allies below 30%) --- */
  {
    const s = fresh('ch2', ['nix', 'hale', 'cinnia']);
    const nix = E.byKey(s, 'nix'); const hale = E.byKey(s, 'hale');
    nix.energy = 1; hale.hp = 50;
    E.playerAct(s, nix.uid, 'bitter_draught', hale.uid);
    ok(hale.hp === 50 + 195, 'Bedside Manner: 130 heal boosted to 195 below 30% HP');
  }

  /* --- 15. Milla: Never Late (once per battle) --- */
  {
    const s = fresh('ch2', ['milla', 'hale', 'cinnia']);
    const hale = E.byKey(s, 'hale'); hale.energy = 1;
    E.playerAct(s, hale.uid, 'basic', s.enemies[0].uid);
    ok(hale.energy === 3 && s.millaUsed, 'Never Late: ally ending at 2 bars gets the spare bar, once');
  }

  /* --- 16. Marlowe: Flourish counts attackers only --- */
  {
    const s = fresh('ch2', ['brant', 'cinnia', 'marlowe']);
    const h2 = s.enemies[1];
    E.playerAct(s, E.byKey(s, 'brant').uid, 'basic', s.enemies[0].uid);
    E.playerAct(s, E.byKey(s, 'cinnia').uid, 'guard');
    E.playerAct(s, E.byKey(s, 'marlowe').uid, 'basic', h2.uid);
    ok(h2.hp === 175 - 64, 'Flourish: +10% for 1 prior attacker; guard does not count (58 -> 64)');
  }

  /* --- 17. Marlowe: Riposte counter + refund --- */
  {
    const s = fresh('ch2', ['marlowe', 'hale', 'cinnia']);
    const m = E.byKey(s, 'marlowe'); const hound = s.enemies[0]; const ev = [];
    m.energy = 1;
    E.playerAct(s, m.uid, 'riposte');
    T.dealToPlayer(s, hound, m, 50, ev);
    ok(hound.hp === 175 - 80 && !m.riposte, 'Riposte counters the next attack on him (80)');
    m.riposte = true; m._riposteUsed = false; m.energy = 0;
    T.endRound(s, ev);
    ok(m.energy === 1, 'Riposte refunds the bar if untouched');
  }

  /* --- 18. Hearthgar: Cinders + Bank the Coals --- */
  {
    const s = fresh('ch6', ['hearthgar', 'cinnia', 'hale']);
    const hg = E.byKey(s, 'hearthgar'); const boss = s.enemies[0]; const ev = [];
    T.dealToPlayer(s, boss, hg, 30, ev);
    T.dealToPlayer(s, boss, hg, 30, ev);
    ok(hg.cinders === 2, 'Stoked: +1 Cinder per hit taken');
    hg.energy = 2;
    E.playerAct(s, hg.uid, 'bank_coals');
    ok(hg.cinders === 0 && s.party.every(u => u.shieldHP === 80), 'Bank the Coals: party shield 30+25/stack, stacks consumed');
  }

  /* --- 19. Taunt redirects single-target attacks --- */
  {
    const s = fresh('ch6', ['hearthgar', 'cinnia', 'hale']);
    const hg = E.byKey(s, 'hearthgar'); const cin = E.byKey(s, 'cinnia'); const boss = s.enemies[0];
    hg.energy = 1;
    E.playerAct(s, hg.uid, 'brace');
    boss.intent = { a: 'gore', target: cin.uid };
    T.enemyPhase(s, []);
    ok(cin.hp === cin.maxhp && hg.hp < hg.maxhp, 'taunt pulls the gore onto Hearthgar');
  }

  /* --- 20. Tobin: Dampen + Read the Currents guard rider --- */
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    const tob = E.byKey(s, 'tobin'); const cin = E.byKey(s, 'cinnia'); const con = s.enemies[0];
    tob.energy = 3; const ev = [];
    E.playerAct(s, cin.uid, 'guard');
    E.playerAct(s, tob.uid, 'dampen', con.uid);
    T.dealToPlayer(s, con, E.byKey(s, 'hale'), 100, ev);
    ok(E.byKey(s, 'hale').hp === 440 - 75, 'Dampen: enemy ATK -25%');
    E.playerAct(s, tob.uid, 'read_currents'); // rejected: tobin already acted
    ok(tob.energy === 2, 'one action per unit per round');
    tob.acted = false;
    E.playerAct(s, tob.uid, 'read_currents');
    T.dealToPlayer(s, con, cin, 40, ev);
    ok(cin.energy === 2 && cin._rtcPaid, 'Read the Currents: guarding through a revealed hit pays +1 energy');
    T.dealToPlayer(s, con, cin, 40, ev);
    ok(cin.energy === 2, 'the reveal rider pays once per unit');
  }

  /* --- 21. Ch.6: 40% scripted Stampede of What Remains + Awakening --- */
  {
    const s = fresh('ch6', ['hale', 'cinnia', 'brant', 'hearthgar', 'milla']);
    const hale = E.byKey(s, 'hale'); const boss = s.enemies[0]; const ev = [];
    ok(!hale.awakened && E.availableActions(s, hale.uid).some(a => a.id === 'cross_slash'), 'pre-awakening Hale is a plain attacker');
    boss.hp = Math.floor(boss.maxhp * 0.405); // one hit away from the 40% line
    T.dealToEnemy(s, E.byKey(s, 'cinnia'), boss, 100, 0, ev);
    ok(s.script.awakened && hale.awakened && hale.energy === 3, 'crossing 40%: Hale becomes UnHollowed with full Energy');
    ok(s.party.every(u => u.hp === 1), 'Stampede of What Remains: party at slivers (min 1 HP)');
    ok(boss.skipNext === true, 'the scripted stampede spends the boss action');
    ok(s.script.counting === true, 'the Counting is armed at/below 50%');
  }

  /* --- 22. Ch.6: the Counting fires exactly once, as plain text --- */
  {
    const s = fresh('ch6', ['hale', 'cinnia', 'brant']);
    const boss = s.enemies[0];
    s.script.counting = true;
    boss.intent = { a: 'gore', target: E.byKey(s, 'cinnia').uid };
    let ev = []; T.enemyPhase(s, ev);
    const line = ev.find(e => e.t === 'log' && /count its herd/.test(e.msg));
    ok(line && !line.cls, 'the Counting: skips its action, plain unstyled text');
    ok(s.party.every(u => u.hp === u.maxhp), 'no damage on the Counting round');
    boss.intent = { a: 'gore', target: E.byKey(s, 'cinnia').uid };
    ev = []; T.enemyPhase(s, ev);
    ok(s.party.some(u => u.hp < u.maxhp), 'the Counting happens only once');
  }

  /* --- 23. Ch.6: break during telegraph cancels Stampede, swaps to Man, whistles calves --- */
  {
    const s = fresh('ch6', ['hale', 'cinnia', 'brant']);
    const boss = s.enemies[0]; const ev = [];
    boss.tele = 1; boss.breakCur = 30;
    T.dealBreak(s, E.byKey(s, 'brant'), boss, 40, ev);
    ok(boss.tele === 0 && boss.form === 'man' && boss.staggered, 'break during telegraph cancels Stampede and force-swaps to the Man');
    T.enemyPhase(s, ev);        // staggered: skips, recovers
    ok(!boss.staggered, 'stagger consumed the boss action');
    T.rollIntents(s);
    T.enemyPhase(s, ev);        // Man's first action: whistle
    ok(s.enemies.filter(e => e.key === 'calf' && e.alive).length === 2, 'the Man whistles: +2 Hollowed Calves per stagger');
    ok(s.party.every(u => u.hp === u.maxhp), 'freshly summoned calves do not act the round they arrive');
  }

  /* --- 24. Ch.6: boss cannot die before the finale; 10% locks menus to Glass Bulwark --- */
  {
    const s = fresh('ch6', ['hale', 'cinnia', 'brant'], { awakenedHale: true });
    const hale = E.byKey(s, 'hale'); const boss = s.enemies[0]; const ev = [];
    s.script.awakened = true;
    hale.energy = 0; // worst case: empty gauge at the 10% trigger
    boss.hp = 500;
    T.dealToEnemy(s, hale, boss, 5000, 0, ev);
    ok(boss.alive && boss.hp >= 1, 'boss HP clamps at 1 until the finale resolves');
    ok(s.lock === 'bulwark', '10%: every menu locks');
    ok(hale.energy === 2, 'empty-gauge guarantee: the fight lends Hale enough Energy for Glass Bulwark');
    ok(E.availableActions(s, E.byKey(s, 'cinnia').uid).length === 0, 'allies have no actions during the finale lock');
    const acts = E.availableActions(s, hale.uid);
    ok(acts.length === 1 && acts[0].id === 'glass_bulwark' && acts[0].glow, 'Hale has exactly one glowing option');
    E.playerAct(s, hale.uid, 'glass_bulwark');
    ok(s.script.finaleDone && s.lock === null, 'the player presses it; the finale resolves');
    ok(E.livingParty(s).every(u => u.alive && u.hp >= 1 && u.hp <= Math.round(u.maxhp * 0.12)), 'shields flare; the party survives on slivers');
    ok(s.freeRound === s.round, 'finisher window: next round is open');
    const feast = E.availableActions(s, E.byKey(s, 'cinnia').uid).find(a => a.id === 'feast');
    ok(feast && feast.cost === 0 && feast.ok, 'all specials cost 0 in the finisher window');
    // and now the boss can actually die
    T.dealToEnemy(s, hale, boss, 5000, 0, ev);
    ok(!boss.alive && s.result === 'victory', 'post-finale, the kill is real and victory fires');
  }

  /* --- 25. Ch.3: the Glasswright is a scripted loss that cannot kill or be killed --- */
  {
    const s = fresh('ch3', ['hale', 'cinnia', 'tobin', 'marlowe', 'brant']);
    for (let r = 0; r < 3 && !s.result; r++) {
      for (const u of E.livingParty(s)) { if (!s.result) E.playerAct(s, u.uid, 'guard'); }
    }
    ok(s.result === 'scripted_loss', 'after round 3 the hollowing wave fires: defeat advances the story');
    ok(s.party.every(u => u.alive && u.hp >= 1), 'no one truly dies in the scripted loss');
  }

  /* --- 26. Ch.3: the 30%-HP trigger also fires the script --- */
  {
    const s = fresh('ch3', ['hale', 'cinnia', 'tobin']);
    for (const u of s.party) u.hp = Math.ceil(u.maxhp * 0.31);
    for (const u of E.livingParty(s)) { if (!s.result) E.playerAct(s, u.uid, 'basic', s.enemies[0].uid); }
    ok(s.result === 'scripted_loss', 'party at <=30% total HP fires the wave early');
  }

  /* --- 27. Defeat & victory results --- */
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    const hale = E.byKey(s, 'hale');
    E.byKey(s, 'cinnia').alive = false; E.byKey(s, 'cinnia').hp = 0;
    E.byKey(s, 'tobin').alive = false; E.byKey(s, 'tobin').hp = 0;
    hale.hp = 1;
    E.playerAct(s, hale.uid, 'guard');
    ok(s.result === 'defeat', 'non-scripted party wipe = defeat');
  }
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']); const ev = [];
    T.dealToEnemy(s, E.byKey(s, 'hale'), s.enemies[0], 500, 0, ev);
    T.dealToEnemy(s, E.byKey(s, 'hale'), s.enemies[1], 500, 0, ev);
    ok(s.result === 'victory', 'clearing the field mid-round is an immediate victory');
  }

  /* --- 28. Ch.2 horror beat: plain, unstyled, and it leaves --- */
  {
    const s = fresh('ch2', ['hale', 'cinnia', 'tobin']);
    let seen = null, gone = null;
    for (let r = 0; r < 3 && !s.result; r++) {
      for (const u of E.livingParty(s)) {
        if (s.result) break;
        const ev = E.playerAct(s, u.uid, 'guard');
        for (const e of ev) {
          if (e.t === 'log' && /wrong distance/.test(e.msg)) seen = e;
          if (e.t === 'log' && /figure is gone/.test(e.msg)) gone = e;
        }
      }
    }
    ok(seen && !seen.cls, 'the figure appears in plain text (no styling — the Mirror is silent)');
    ok(gone && !gone.cls, 'one round later it is gone, also plain');
  }

  /* --- 29. Live-combat adapter: role-based Skill gain, no basic attack, timed phases --- */
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    const hale = E.byKey(s, 'hale');
    const skill = E.availableLiveActions(s, hale.uid).find(a => a.id === 'cross_slash');
    ok(skill && skill.ok && skill.cost === 0, 'live combat exposes Skills on recast instead of requiring Arts gauge');
    const before = s.enemies[0].hp;
    E.liveAct(s, hale.uid, 'cross_slash', s.enemies[0].uid);
    ok(s.enemies[0].hp < before && !hale.acted, 'live Skill resolves immediately without consuming the unit turn');
    ok(Math.abs(hale.energy - 0.25) < 0.001, 'Cross Slash restores Hale 25 Arts');
  }
  {
    const s = fresh('ch1', ['hale', 'cinnia', 'tobin']);
    const hale = E.byKey(s, 'hale'), cinnia = E.byKey(s, 'cinnia'), tobin = E.byKey(s, 'tobin');
    ok(!E.availableLiveActions(s, hale.uid).some(a => a.id === 'basic'), 'live combat removes the basic auto attack');
    E.liveAct(s, cinnia.uid, 'flash_fry', s.enemies[0].uid);
    E.liveAct(s, tobin.uid, 'dampen', s.enemies[0].uid);
    ok(Math.abs(cinnia.energy - 0.50) < 0.001, 'Healer Skill restores 50 Arts');
    ok(Math.abs(tobin.energy - 0.60) < 0.001, 'Supporter Skill restores 60 Arts');
    ok(!E.availableLiveActions(s, hale.uid).some(a => a.id === 'guard'), 'live combat removes universal Guard as a selectable ability');
    const hp = s.party.reduce((n, u) => n + u.hp, 0);
    E.liveEnemyPhase(s);
    ok(s.party.reduce((n, u) => n + u.hp, 0) < hp, 'live enemy phase advances independently of player turns');
    const round = s.round;
    E.liveUpkeep(s);
    ok(s.round === round + 1, 'live upkeep advances timed effects and encounter scripts');
  }
  {
    const s = fresh('ch1', ['hale', 'cinnia']);
    const hale = E.byKey(s, 'hale'), cinnia = E.byKey(s, 'cinnia');
    hale.energy = 3; cinnia.energy = 3; hale.hp = Math.floor(hale.maxhp * .2);
    const reserve = E.chooseLiveAIAction(s, hale.uid, { preset: 'burst', allowSkill: true, allowArts: true, allowBurst: true, elapsedMs: 1000 });
    ok(reserve.actionId === 'cross_slash' && reserve.trace.some(x => x.tier === 'Burst' && x.rejected), 'Burst AI holds its finisher outside a vulnerability window and records why');
    s.enemies[0].staggered = true;
    ok(E.chooseLiveAIAction(s, hale.uid, { preset: 'burst', allowSkill: true, allowArts: true, allowBurst: true }).actionId === 'nightmares_end', 'Burst AI releases its finisher during stagger');
    ok(E.chooseLiveAIAction(s, cinnia.uid, { preset: 'sustain', allowSkill: true, allowArts: true, allowBurst: true }).actionId === 'feast', 'Sustain AI prioritizes maximum recovery for a critical ally');
    ok(E.chooseLiveAIAction(s, hale.uid, { preset: 'manual', allowSkill: true, allowArts: true, allowBurst: true }).actionId === 'cross_slash', 'Manual Reserve automates only the core Skill for an attacker');
  }

  /* --- 30. Rarity, level caps, and evolution recipes --- */
  {
    ok(JSON.stringify(E.LEVEL_CAPS) === JSON.stringify({ 1: 20, 2: 40, 3: 60, 4: 70, 5: 90 }), 'level caps match the five rarity tiers');
    const hale = E.UNIT_PROGRESSION.hale, cinnia = E.UNIT_PROGRESSION.cinnia;
    ok(hale.baseStars === 4 && hale.maxStars === 5, 'Hale begins at 4 stars and transforms to 5 stars');
    ok(hale.evolution.unlock === 'ch6' && hale.evolution.forcedStory && Object.keys(hale.evolution.materials).length === 0, 'Hale automatically evolves through Chapter Six with no level or material gate');
    const storyProgress = { hale: { level: 1, stars: 4 } };
    ok(E.applyStoryEvolutions(storyProgress, 'ch6')[0] === 'hale' && storyProgress.hale.stars === 5, 'Chapter Six immediately promotes a level-1 Hale to 5 stars');
    ok(cinnia.baseStars === 4 && cinnia.maxStars === 5, 'Cinnia begins at 4 stars with a 5-star ceiling');
    ok(cinnia.evolution.unlock === 'challenge' && cinnia.evolution.materials.challenge_essence === 20, 'Cinnia awakening uses the live Challenge recipe');
    ok(E.UNIT_PROGRESSION.tobin.evolution === null && E.UNIT_PROGRESSION.brigga.evolution === null, 'the roster supports units with no designated evolution');
    const player = fresh('ch1', ['hale']).party[0];
    ok(player.level === 1 && player.stars === 4, 'battle units carry their starting level and rarity');
    ok(E.UNIT_LIBRARY.length === 12, 'Unit Library contains ten base pages and two designated form pages');
    ok(E.UNITS.katie.elem === 'dark' && E.UNITS.katie.role === 'Defender' && E.UNIT_PROGRESSION.katie.baseStars === 5, 'Katie is registered as a base 5-star Dark Defender');
    ok(new Set(E.UNIT_LIBRARY.map(x => x.id)).size === E.UNIT_LIBRARY.length, 'every Unit Library page has a stable unique id');
    ok(E.UNIT_LIBRARY.some(x => x.id === 'hale:5') && E.UNIT_LIBRARY.some(x => x.id === 'cinnia:5'), 'implemented evolved forms receive separate library pages');
    const discoveries = {};
    E.recordOwnedDiscoveries(discoveries, ['nix']);
    E.recordOwnedDiscoveries(discoveries, []);
    ok(discoveries['nix:base'] === true, 'library discovery remains after a unit leaves the owned roster');
  }

  /* --- 31. Versioned single-save validation and migration --- */
  {
    const clean = E.normalizeSaveState({ sigils: -20, gold: -50, storyStep: 99, owned: ['hale', 'fake', 'hale'], ranks: { hale: 20 }, unitProgress: { hale: { level: 999, stars: 4, xp: 9999 } }, libraryUnlocked: { 'hale:base': true, 'fake:base': true }, lastHub: 'void' });
    ok(clean.sigils === 0 && clean.gold === 0 && clean.storyStep === 5, 'save validation clamps currencies and story progress');
    ok(clean.owned.length === 1 && clean.owned[0] === 'hale' && clean.ranks.hale === 5, 'save validation removes unknown and duplicate units and clamps ranks');
    ok(clean.unitProgress.hale.level === 70 && clean.unitProgress.hale.stars === 5 && clean.unitProgress.hale.xp === 0, 'save validation repairs completed-story Hale to 5 stars without inflating the saved level');
    ok(clean.libraryUnlocked['hale:base'] && !clean.libraryUnlocked['fake:base'] && clean.lastHub === 'home', 'save validation filters discoveries and navigation state');
    const formation = E.normalizeSaveState({ owned: ['hale', 'cinnia', 'katie'], activeParty: ['katie', 'fake', 'hale', 'katie'] });
    ok(JSON.stringify(formation.activeParty) === JSON.stringify(['katie', 'hale']), 'active party persists ordered, unique, owned units only');
    const cappedFormation = E.normalizeSaveState({ owned: ['hale', 'cinnia', 'tobin', 'katie', 'marlowe'], activeParty: ['hale', 'cinnia', 'tobin', 'katie', 'marlowe'] });
    ok(cappedFormation.activeParty.length === E.PARTY_SIZE && !cappedFormation.activeParty.includes('marlowe'), 'active party is normalized to the four-unit deployment cap');
    ok(JSON.stringify(E.normalizeSaveState({ owned: ['hale', 'cinnia'] }).activeParty) === JSON.stringify(['hale', 'cinnia']), 'older saves derive a safe active party from owned units');
    ok(E.normalizeSaveState({ act1MissionProgress: 99 }).act1MissionProgress === 10 && E.normalizeSaveState({}).act1MissionProgress === 0, 'expanded Act 1 mission progress persists with safe bounds');
    const legacyMissionClears = E.normalizeSaveState({ act1MissionProgress: 3 }).missionClears;
    ok(legacyMissionClears.act1_1 && legacyMissionClears.act1_2 && legacyMissionClears.act1_3 && !legacyMissionClears.act1_4, 'legacy Act 1 progress migrates into durable per-mission clear flags');
    const filteredMissionClears = E.normalizeSaveState({ missionClears: { act1_5: true, act4_7: true, act0_1: true, act1_0: true, act1_99: true, act2_2: false, nonsense: true } }).missionClears;
    ok(filteredMissionClears.act1_5 && filteredMissionClears.act4_7 && Object.keys(filteredMissionClears).length === 2, 'mission clear migration retains only valid true story-mission identifiers');
    const legacyChapters = E.normalizeSaveState({ storyStep: 3 }).missionClears;
    ok(legacyChapters.act1_10 && legacyChapters.act2_8 && legacyChapters.act3_7 && !legacyChapters.act4_1, 'legacy chapter-spine progress unlocks the equivalent expanded mission chapters without skipping Greywick');
    const migrated = E.migrateSaveEnvelope({ schemaVersion: 0, payload: { sigils: 77, owned: ['hale'] } });
    ok(migrated.schemaVersion === E.SAVE_SCHEMA_VERSION && migrated.state.sigils === 77, 'schema-zero saves migrate to the current format');
    const current = E.migrateSaveEnvelope({ schemaVersion: 1, gameVersion: '0.7.0', saveId: 'abc', revision: 4, state: { storyStep: 2, settings: { autoSkill: true } } });
    ok(current.saveId === 'abc' && current.revision === 4 && current.state.storyStep === 2, 'current save envelopes retain identity, revision, and state');
    ok(current.state.settings.autoSkill === true && E.normalizeSaveState({}).settings.autoSkill === false, 'Auto Skill preference persists with a safe off default');
    const autoModes = E.normalizeSaveState({ settings: { autoArts: true, autoBurst: true } }).settings;
    ok(autoModes.autoArts && autoModes.autoBurst && !E.normalizeSaveState({}).settings.autoArts && !E.normalizeSaveState({}).settings.autoBurst, 'Auto Arts and Auto Burst preferences persist with safe off defaults');
    ok(E.normalizeSaveState({ settings: { animationSpeed: 0.75 } }).settings.animationSpeed === 0.75 && E.normalizeSaveState({ settings: { animationSpeed: 9 } }).settings.animationSpeed === 1, 'animation speed persists only supported playback rates');
    const legacyHale = E.normalizeSaveState({ haleAwakened: true });
    ok(legacyHale.unitProgress.hale.stars === 5 && legacyHale.libraryUnlocked['hale:5'], 'legacy Hale awakening flags migrate into the 5-star form and library progress');
    const completedStoryHale = E.normalizeSaveState({ storyStep: 5, owned: ['hale'] });
    ok(completedStoryHale.haleAwakened && completedStoryHale.unitProgress.hale.stars === 5 && completedStoryHale.libraryUnlocked['hale:5'], 'completed Chapter Six saves repair missing Hale transformation state');
    let rejected = false;
    try { E.migrateSaveEnvelope({ schemaVersion: 999, state: {} }); } catch (err) { rejected = /newer version/.test(err.message); }
    ok(rejected, 'newer incompatible save schemas are rejected safely');
    ok(E.validateSaveState(E.normalizeSaveState({ owned: ['hale'], activeParty: ['hale'] })), 'normalized saves pass strict current-schema validation');
    let invalidImport = false;
    try { E.migrateSaveEnvelope({ schemaVersion: 1, state: { sigils: -1 } }, { strict: true }); } catch (err) { invalidImport = /sigils/.test(err.message); }
    ok(invalidImport, 'strict import preflight rejects invalid persistent values instead of silently clamping them');
    const historicalImport = E.migrateSaveEnvelope({ schemaVersion: 1, state: { storyStep: 2, settings: { autoSkill: true } } }, { strict: true });
    ok(historicalImport.state.settings.autoSkill && historicalImport.state.settings.animationSpeed === 1, 'strict preflight accepts missing historical fields and migrates their defaults');
  }
  /* --- 32. Deterministic quest rewards and unit experience --- */
  {
    ok(E.xpToNext(1) === 80 && E.xpToNext(10) === 260, 'the experience curve grows predictably with level');
    const hale = { level: 1, stars: 3, xp: 0 };
    const gain = E.grantUnitXP(hale, 100);
    ok(hale.level === 2 && hale.xp === 20 && gain.levelsGained === 1, 'quest XP can level a unit and carries excess XP forward');
    const capped = { level: 60, stars: 3, xp: 10 };
    E.grantUnitXP(capped, 9999);
    ok(capped.level === 60 && capped.xp === 0, 'experience cannot exceed the current rarity level cap');
    ok(E.BATTLES.ch1.rewards.first.gold === 150 && E.BATTLES.ch1.rewards.first.xp === 100, 'Chapter One has fixed first-clear Gold and XP');
    ok(E.BATTLES.ch1.rewards.repeat.gold === 90 && E.BATTLES.ch1.rewards.repeat.xp === 65, 'Chapter One repeat rewards are fixed and lower than first-clear rewards');
    ok(E.normalizeSaveState({}).gold === 0 && E.normalizeSaveState({ unitProgress: { hale: { level: 2, stars: 3 } } }).unitProgress.hale.xp === 0, 'older saves safely default Gold and unit XP to zero');
  }
  {
    ok(E.liveGestureTier(35) === null && E.liveGestureTier(36) === 'Art', 'Art gesture activates exactly at its upward snap threshold');
    ok(E.liveGestureTier(81) === 'Art' && E.liveGestureTier(82) === 'Burst', 'Burst gesture replaces Art only at the farther snap threshold');
    ok(E.liveGestureTier(-40) === null, 'dragging back down cancels the gesture command');
  }
  {
    const training = E.newBattle('training', ['hale', 'cinnia']);
    ok(training.enemies.length === 1 && training.enemies[0].maxhp >= 99999999 && training.enemies[0].atk === 0, 'Training Grounds provides a nonlethal effectively infinite-HP test dummy');
    ok(E.BATTLES.training.rewards.repeat.gold === 0 && E.BATTLES.training.rewards.repeat.xp === 0, 'Training Grounds grants no Gold or experience');
  }
  {
    const mission = E.newBattle('act1_1', ['hale', 'cinnia']);
    ok(mission.enemies.length === 1 && mission.enemies[0].key === 'construct', 'Act 1 mission 1-1 is playable through the mission-map battle framework');
    ok(E.BATTLES.act1_3.rewards.first.gold === 100 && E.BATTLES.act1_3.tutorial, 'Act 1 tutorial missions have fixed rewards and tutorial metadata');
  }
  {
    const expanded = ['act2_2','act2_4','act2_6','act2_7','act3_1','act3_3','act3_5','act3_6','act3_7','act4_1','act4_2','act4_3','act4_4','act4_5','act4_6','act4_7'];
    for (const id of expanded) {
      const mission = fresh(id, ['hale','cinnia']);
      ok(mission.enemies.length > 0 && E.BATTLES[id].rewards.first.gold > E.BATTLES[id].rewards.repeat.gold, `${id} is playable and has lower repeat rewards`);
    }
    const finale = fresh('act4_7', ['hale','cinnia']);
    ok(finale.scripted && finale.enemies[0].key === 'glasswright', 'Chapter Four climax is a scripted Glasswright survival encounter');
  }
  {
    const expected = {
      act1_5: ['storehouse_pest', 'storehouse_pest'],
      act1_6: ['hound', 'storehouse_pest', 'hound'],
      act1_7: ['hollow_fragment'],
      act1_10: ['construct', 'construct2', 'hollow_fragment'],
    };
    for (const [battle, enemies] of Object.entries(expected)) {
      const s = fresh(battle, ['hale', 'cinnia']);
      ok(JSON.stringify(s.enemies.map(en => en.key)) === JSON.stringify(enemies), `${battle} constructs its authored enemy lineup`);
      ok(E.BATTLES[battle].rewards.first.gold > E.BATTLES[battle].rewards.repeat.gold, `${battle} retains a distinct first-clear reward`);
    }
    const s = fresh('act1_7', ['hale']); const ev = [];
    T.dealToEnemy(s, E.byKey(s, 'hale'), s.enemies[0], 99999, 0, ev);
    ok(s.result === 'victory' && ev.some(e => e.t === 'result' && e.v === 'victory'), 'new Act 1 encounters enqueue an explicit victory result event');
  }
  {
    const s = fresh('ch1', ['katie', 'cinnia']);
    const katie = E.byKey(s, 'katie'), cinnia = E.byKey(s, 'cinnia');
    katie.energy = 3;
    E.liveAct(s, katie.uid, 'cat_scan');
    ok(cinnia.guardedBy === katie.uid && cinnia.buffs.some(b => b.k === 'guarded' && b.t === 6), 'CAT Scan applies thirty seconds of Guarded cover');
    const cinHp = cinnia.hp, shield = katie.shieldHP;
    s.enemies[0].intent = { a: 'swing', target: cinnia.uid };
    E.liveEnemyPhase(s);
    ok(cinnia.hp === cinHp && katie.shieldHP < shield, 'Guarded redirects the full single-target hit to the protecting tank');
  }
  {
    const s = fresh('act1_3', ['hale', 'cinnia']);
    const hale = E.byKey(s, 'hale'); hale.energy = 3;
    const before = s.enemies.map(en => en.hp);
    E.liveAct(s, hale.uid, 'nightmares_end');
    ok(s.enemies.every((en, i) => en.hp < before[i]), "Nightmare's End damages every living enemy");
    ok(hale.energy === 0, "Nightmare's End consumes the full Arts gauge");
  }
  {
    const s = fresh('training', ['katie', 'cinnia']);
    const katie = E.byKey(s, 'katie'), dummy = s.enemies[0];
    katie.energy = 3;
    E.liveAct(s, katie.uid, 'cat_scan');
    const exposure = dummy.buffs.find(b => b.k === 'radiationExposure');
    const before = dummy.hp;
    E.liveUpkeep(s);
    ok(exposure && exposure.t === 5 && dummy.hp === before - 950, 'Radiation Exposure deals one 2500% five-second pulse and retains five pulses');
  }
  {
    const s = fresh('ch1', ['katie', 'cinnia']);
    const katie = E.byKey(s, 'katie'), cinnia = E.byKey(s, 'cinnia'), en = s.enemies[0];
    katie.energy = 3;
    E.liveAct(s, katie.uid, 'cat_scan');
    const cinHp = cinnia.hp, shield = katie.shieldHP;
    E._test.dealToPlayer(s, en, cinnia, 100, [], { aoe: true });
    ok(cinnia.hp === cinHp && katie.shieldHP < shield, 'CAT Scan redirects area damage from allies to Katie as well');
  }
  {
    const s = fresh('training', ['hale']);
    const hale = E.byKey(s, 'hale'), dummy = s.enemies[0];
    dummy.hp = Math.floor(dummy.maxhp * 0.4);
    hale.energy = 2;
    const before = dummy.hp;
    E.liveAct(s, hale.uid, 'black_horizon', dummy.uid);
    ok(hale.buffs.some(b => b.k === 'atkUp' && b.v === 0.50), 'Black Horizon grants Hale 50% ATK');
    ok(before - dummy.hp > 185, 'Relentless Pursuit increases damage against a low-HP enemy');
  }
  {
    const s = fresh('training', ['hale']);
    const hale = E.byKey(s, 'hale'), dummy = s.enemies[0];
    hale.awakened = true; hale.energy = 1;
    E.liveAct(s, hale.uid, 'fracture_edge', dummy.uid);
    ok(dummy.buffs.some(b => b.k === 'darkResDown' && b.v === 0.25), 'Fracture Edge applies 25% Dark resistance fracture');
  }
  {
    const s = fresh('training', ['hale']);
    const hale = E.byKey(s, 'hale'), dummy = s.enemies[0];
    s.battleTimeMs = 1234;
    const events = E.liveAct(s, hale.uid, 'cross_slash', dummy.uid);
    ok(events.length > 0 && events.every((e, i) => e.id === i + 1 && e.battleTimeMs === 1234 && Object.isFrozen(e) && Object.isFrozen(e.payload)), 'live combat emits monotonic immutable timestamped events');
    const damage = events.find(e => e.type === 'damage');
    ok(damage && damage.sourceId === hale.uid && damage.targetIds[0] === dummy.uid && damage.payload.amount > 0, 'damage events carry stable source, target, and authoritative amount');
    const next = E.liveAct(s, hale.uid, 'cross_slash', dummy.uid);
    ok(next[0].id > events.at(-1).id && s.eventHistory.length === events.length + next.length, 'event IDs remain monotonic and battle history tracks sealed events centrally');
    const replay = fresh('training', ['hale']); E.liveAct(replay, replay.party[0].uid, 'cross_slash', replay.enemies[0].uid); E.liveAct(replay, replay.party[0].uid, 'cross_slash', replay.enemies[0].uid);
    ok(E.combatEventHash(s) === E.combatEventHash(replay), 'seeded combat produces a stable event hash');
    for (let i = 0; i < 520; i++) E.liveUpkeep(s);
    ok(s.eventHistory.length <= 500, 'combat event history remains bounded at 500 entries');
  }

  print(`Self-tests: ${pass} passed, ${fail} failed.`);
  if (fail) print('Failures: ' + failures.join(' | '));
  return { pass, fail, failures };
}

if (typeof module !== 'undefined') {
  module.exports = runHollowingSelfTests;
  if (require.main === module) {
    const E = require('./engine-dev.js');
    const r = runHollowingSelfTests(E, console.log);
    process.exit(r.fail ? 1 : 0);
  }
}
