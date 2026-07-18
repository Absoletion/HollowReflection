const fs = require('fs');
const path = process.argv[2];
if (!path) throw new Error('Usage: node sync_combat_engine_source.js <engine-dev.js>');
let source = fs.readFileSync(path, 'utf8');

function between(start, end, replacement, label) {
  const a = source.indexOf(start);
  if (a < 0) throw new Error(`Missing start: ${label}`);
  const b = source.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Missing end: ${label}`);
  source = source.slice(0, a) + replacement + source.slice(b);
}

function once(oldText, replacement, label) {
  const a = source.indexOf(oldText);
  if (a < 0) throw new Error(`Missing block: ${label}`);
  if (source.indexOf(oldText, a + 1) >= 0) throw new Error(`Non-unique block: ${label}`);
  source = source.slice(0, a) + replacement + source.slice(a + oldText.length);
}

between(
  "      /* ------- Hale ------- */",
  "      /* ------- Cinnia ------- */",
  `      /* ------- Hale ------- */
      case 'cross_slash': {
        u.energy -= free ? 0 : 1; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- Cross Slash.', 'act');
        dealToEnemy(s, u, en0, 58, 6, ev);
        if (en0 && en0.alive) dealToEnemy(s, u, en0, 62, 6, ev);
        break;
      }
      case 'black_horizon': {
        u.energy -= free ? 0 : 2; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- BLACK HORIZON.', 'act');
        dealToEnemy(s, u, en0, 185, 24, ev);
        break;
      }
      case 'nightmares_end': {
        u.energy -= free ? 0 : 3; s.attackedThisRound.push(u.uid);
        log(ev, "Hale -- NIGHTMARE'S END.", 'act');
        for (const en of livingEnemies(s).slice()) dealToEnemy(s, u, en, 255, 32, ev);
        break;
      }
      case 'fracture_edge': {
        u.energy -= free ? 0 : 1; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- Fracture Edge.', 'act');
        dealToEnemy(s, u, en0, 125, 12, ev);
        break;
      }
      case 'event_horizon': {
        u.energy -= free ? 0 : 2; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- EVENT HORIZON.', 'act');
        dealToEnemy(s, u, en0, 220, 30, ev);
        break;
      }
      case 'shatterfall': {
        u.energy -= free ? 0 : 3; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- SHATTERFALL: HOLLOW REFLECTION.', 'act');
        for (const en of livingEnemies(s).slice()) dealToEnemy(s, u, en, 290, 48, ev);
        break;
      }

`,
  'Hale action block'
);

between(
  "      /* ------- Cinnia ------- */",
  "      /* ------- Tobin ------- */",
  `      /* ------- Cinnia ------- */
      case 'flash_fry': {
        u.energy -= free ? 0 : 1; s.attackedThisRound.push(u.uid);
        log(ev, 'Cinnia -- Flash-Fry Fireball!', 'act');
        dealToEnemy(s, u, en0, 82, 5, ev);
        break;
      }
      case 'field_rations': {
        u.energy -= free ? 0 : 2;
        log(ev, 'Cinnia -- Hearthward Rations. Everyone eats.', 'act');
        for (const ally of livingParty(s)) { heal(s, u, ally, 110, ev); addBuff(ally, 'regen', 18, 2); }
        break;
      }
      case 'feast': {
        u.energy -= free ? 0 : 3;
        log(ev, 'Cinnia -- FULL-COURSE FEAST. Morale is a nutrient.', 'act');
        for (const ally of livingParty(s)) { heal(s, u, ally, 180, ev); addBuff(ally, 'atkUp', 0.25, 2); }
        log(ev, 'Party ATK up, 2 rounds.', 'buff');
        break;
      }

`,
  'Cinnia action block'
);

between(
  "      /* ------- Katie ------- */",
  "    }\n  }\n\n  // Marlowe",
  `      /* ------- Katie ------- */
      case 'diagnostic_crush': {
        u.energy -= free ? 0 : 1;
        const diagnosticTarget = target && target.side === 'enemy' && target.alive ? target : livingEnemies(s)[0];
        if (diagnosticTarget) { dealToEnemy(s, u, diagnosticTarget, 72, 8, ev); addBuff(diagnosticTarget, 'atkDown', 0.20, 1); }
        log(ev, 'Katie -- Diagnostic Crush. Finding noted. Correcting.', 'act');
        break;
      }
      case 'contrast_study': {
        u.energy -= free ? 0 : 2; s.revealRound = s.round;
        const contrastTarget = target && target.side === 'enemy' && target.alive ? target : livingEnemies(s)[0];
        if (contrastTarget) { dealToEnemy(s, u, contrastTarget, 118, 28, ev); addBuff(contrastTarget, 'breakVuln', 0.20, 1); }
        for (const ally of livingParty(s)) addBuff(ally, 'defUp', 0.15, 1);
        for (const en of livingEnemies(s)) log(ev, \`Katie reads the image: \${intentText(s, en)}\`, 'reveal');
        log(ev, 'Contrast Study maps the fracture; party damage taken reduced.', 'shield');
        break;
      }
      case 'cat_scan': {
        u.energy -= free ? 0 : 3;
        for (const ally of livingParty(s)) {
          ally.shieldHP += Math.round(ally.maxhp * 0.20);
          if (ally !== u) { ally.guardedBy = u.uid; addBuff(ally, 'guarded', 1, 6); }
        }
        u.shieldHP += Math.round(u.maxhp * 3);
        const radiationTick = Math.round(UNITS.katie.basic.d * 25);
        for (const en of livingEnemies(s)) addBuff(en, 'radiationExposure', radiationTick, 6);
        log(ev, 'Katie -- CAT SCAN. Complete coverage. No touching.', 'shield');
        log(ev, 'Thirty seconds of full-party cover; Radiation Exposure pulses every five seconds.', 'buff');
        break;
      }
`,
  'Katie action block'
);

once(
  "    for (const en of s.enemies) { for (const b of en.buffs) b.t--; en.buffs = en.buffs.filter(b => b.t > 0); }",
  `    const katie = byKey(s, 'katie');
    for (const en of s.enemies) {
      const exposure = en.buffs.find(b => b.k === 'radiationExposure');
      if (en.alive && exposure && katie && katie.alive && katie.shieldHP > 0) {
        const tick = Math.max(1, Math.round(exposure.v));
        en.hp -= tick;
        log(ev, \`Radiation Exposure burns \${en.name} for \${tick}.\`, 'dmg');
        afterEnemyDamage(s, en, ev);
      }
      for (const b of en.buffs) b.t--;
      en.buffs = en.buffs.filter(b => b.t > 0);
    }`,
  'Radiation Exposure upkeep'
);

fs.writeFileSync(path, source, 'utf8');
console.log('Combat engine source synchronized:', path);
