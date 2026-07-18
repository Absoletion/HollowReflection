const fs = require('fs');

const path = process.argv[2];
if (!path) throw new Error('Usage: node integrate_combat_milestone.js <standalone-html>');
let source = fs.readFileSync(path).toString('latin1');

function once(oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`Missing block: ${label}`);
  if (source.indexOf(oldText, first + 1) >= 0) throw new Error(`Non-unique block: ${label}`);
  source = source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function between(start, end, replacement, label) {
  const a = source.indexOf(start);
  if (a < 0) throw new Error(`Missing start: ${label}`);
  const b = source.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Missing end: ${label}`);
  source = source.slice(0, a) + replacement + source.slice(b);
}

once(
  "name: 'Hale', elem: 'hollow', role: 'Attacker', hp: 440, basic: { d: 55, b: 5 },",
  "name: 'Hale', elem: 'dark', role: 'Attacker', hp: 440, basic: { d: 55, b: 5 },",
  'Hale base element'
);

between(
  "        { id: 'cross_slash', name: 'Cross Slash'",
  "      ],\r\n      // Five-star story form",
  `        { id: 'cross_slash', name: 'Cross Slash', cost: 1, tier: 'Skill', target: 'enemy', desc: 'Two rapid crossing cuts with strong Arts generation.' },
        { id: 'black_horizon', name: 'Black Horizon', cost: 2, tier: 'Art', target: 'enemy', desc: 'Collapse a dark horizon through one enemy for severe damage.' },
        { id: 'nightmares_end', name: "Nightmare's End", cost: 3, tier: 'Burst', target: 'none', desc: 'Detonate a battlefield-wide wave of darkness against every enemy.' },
`,
  'Hale 4-star specials'
);

between(
  "        { id: 'quick_bite', name: 'Quick Bite'",
  "      ],\r\n    },\r\n    tobin:",
  `        { id: 'flash_fry', name: 'Flash-Fry Fireball', cost: 1, tier: 'Skill', target: 'enemy', desc: 'Flip a compact fireball from the pan-staff at one enemy.' },
        { id: 'field_rations', name: 'Hearthward Rations', cost: 2, tier: 'Art', target: 'none', desc: 'Strong party heal and brief Well-Fed regeneration.' },
        { id: 'feast', name: 'Full-Course Feast', cost: 3, tier: 'Burst', target: 'none', desc: 'Heal party 200 + ATK up 2 rounds.' },
`,
  'Cinnia specials'
);

between(
  "      { id: 'leech_edge', name: 'Leech Edge'",
  "    ],\r\n  };\r\n\r\n  /* ------------------------------------------------------------------ *\r\n   *  Enemy templates",
  `      { id: 'fracture_edge', name: 'Fracture Edge', cost: 1, tier: 'Skill', target: 'enemy', desc: 'Dark and Hollow energy split through the same wound.' },
      { id: 'event_horizon', name: 'Event Horizon', cost: 2, tier: 'Art', target: 'enemy', desc: 'Drag the target into a collapsing Dark/Hollow singularity.' },
      { id: 'shatterfall', name: 'Shatterfall: Hollow Reflection', cost: 3, tier: 'Burst', target: 'none', desc: 'A battlefield-wide Hollowglass extinction event.' },
`,
  'Hale 5-star specials'
);

once(
  "    let b = brk;\r\n    if (atkUnit.key === 'brigga'",
  "    let b = brk;\r\n    b *= 1 + buffVal(en, 'breakVuln');\r\n    if (atkUnit.key === 'brigga'",
  'break vulnerability pipeline'
);

once(
  "    if (!o.aoe && !o.protectionRedirect && u.guardedBy) {",
  "    if (!o.protectionRedirect && u.guardedBy) {",
  'full damage redirection'
);
once(
  "        return dealToPlayer(s, en, tank, base * 0.7, ev, { protectionRedirect: true });",
  "        return dealToPlayer(s, en, tank, base, ev, { protectionRedirect: true, redirectedAoe: !!o.aoe });",
  'redirect damage amount'
);

between(
  "      case 'cross_slash': {",
  "      case 'leech_edge': {",
  `      case 'cross_slash': {
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
`,
  'Hale action resolution'
);

between(
  "      case 'quick_bite': {",
  "      case 'field_rations': {",
  `      case 'flash_fry': {
        u.energy -= free ? 0 : 1; s.attackedThisRound.push(u.uid);
        log(ev, 'Cinnia -- Flash-Fry Fireball!', 'act');
        dealToEnemy(s, u, en0, 82, 5, ev);
        break;
      }
`,
  'Cinnia skill resolution'
);

once(
  "        for (const ally of livingParty(s)) heal(s, u, ally, 110, ev);",
  "        for (const ally of livingParty(s)) { heal(s, u, ally, 110, ev); addBuff(ally, 'regen', 18, 2); }",
  'Cinnia Arts regen'
);

between(
  "      case 'cat_scan': {",
  "      }\r\n    }\r\n  }\r\n\r\n  // Marlowe",
  `      case 'cat_scan': {
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
`,
  'Katie CAT Scan resolution'
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

// Give the live Stage enough context to draw ability-scale effects outside sprite cells.
once(
  "      beat(spriteAnimDuration(actorB, actorAnim, magicPan ? 680 : 420), p => {\r\n        const k = p < 0.5 ? p * 2 : (1 - p) * 2;",
  "      beat(spriteAnimDuration(actorB, actorAnim, magicPan ? 680 : 420), p => {\r\n        const k = p < 0.5 ? p * 2 : (1 - p) * 2;\r\n        actorB.abilityP = p; actorB.abilityId = act.actionId; actorB.abilityTargets = enemyHurt.map(h => h.b).filter(Boolean);",
  'offensive ability Stage context'
);
once(
  "        actorB.off.x = 0; actorB.skillP = 0; actorB.skillTarget = null; actorB.releaseSound = false; actorB.impactSound = false; actorB.anim = 'idle';",
  "        actorB.off.x = 0; actorB.skillP = 0; actorB.skillTarget = null; actorB.releaseSound = false; actorB.impactSound = false; actorB.abilityP = 0; actorB.abilityId = null; actorB.abilityTargets = null; actorB.anim = 'idle';",
  'offensive Stage cleanup'
);
once(
  "      beat(spriteAnimDuration(actorB, actorAnim, cinniaSupport ? (isBurst ? 980 : 800) : 380), p => {",
  "      beat(spriteAnimDuration(actorB, actorAnim, cinniaSupport ? (isBurst ? 980 : 800) : 380), p => {\r\n        actorB.abilityP = p; actorB.abilityId = act.actionId; actorB.abilityTargets = [];",
  'support ability Stage context'
);
once(
  "      }, () => { actorB.artsP = 0; actorB.burstP = 0; actorB.soundStarted = false; actorB.anim = 'idle'; });",
  "      }, () => { actorB.artsP = 0; actorB.burstP = 0; actorB.soundStarted = false; actorB.abilityP = 0; actorB.abilityId = null; actorB.abilityTargets = null; actorB.anim = 'idle'; });",
  'support Stage cleanup'
);

const fxBlock = `
      // Battlefield-scale authored VFX: these are deliberately larger than the unit cell.
      if (b.abilityP > 0 && b.abilityId) {
        const p = b.abilityP, pulse = (at, width) => Math.max(0, 1 - Math.abs(p - at) / width);
        const targets = (b.abilityTargets || []).length ? b.abilityTargets : battlers.filter(t => t.side === 'enemy');
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (key === 'hale') {
          if (b.abilityId === 'cross_slash') for (const t of targets) {
            const q1 = pulse(0.43, 0.16), q2 = pulse(0.61, 0.16), tx = t.home.x + t.off.x, ty = t.home.y - 35;
            ctx.strokeStyle = '#e7c8ff'; ctx.lineWidth = 2 + 7 * q1; ctx.globalAlpha = q1; ctx.beginPath(); ctx.moveTo(tx - 30, ty - 28); ctx.lineTo(tx + 30, ty + 28); ctx.stroke();
            ctx.strokeStyle = '#a54ee3'; ctx.lineWidth = 3 + 8 * q2; ctx.globalAlpha = q2; ctx.beginPath(); ctx.moveTo(tx - 30, ty + 28); ctx.lineTo(tx + 30, ty - 28); ctx.stroke();
          }
          if (b.abilityId === 'black_horizon') {
            const q = pulse(0.60, 0.25), tx = targets[0] ? targets[0].home.x : W * 0.24, ty = targets[0] ? targets[0].home.y - 38 : GROUND - 42;
            ctx.fillStyle = \`rgba(5,0,12,\${0.72 * q})\`; ctx.beginPath(); ctx.ellipse(tx, ty, 28 + 78 * q, 10 + 30 * q, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#c788ff'; ctx.lineWidth = 3 + 5 * q; ctx.globalAlpha = q; ctx.beginPath(); ctx.moveTo(6, ty); ctx.lineTo(W - 6, ty); ctx.stroke();
          }
          if (b.abilityId === 'nightmares_end') {
            const q = pulse(0.64, 0.27); ctx.fillStyle = \`rgba(25,0,42,\${0.58 * q})\`; ctx.fillRect(0, 0, W, H);
            for (const t of targets) { const tx = t.home.x, ty = t.home.y - 34; ctx.strokeStyle = '#dba9ff'; ctx.lineWidth = 3 + 8 * q; ctx.globalAlpha = q; ctx.beginPath(); ctx.arc(tx, ty, 12 + 72 * q, 0, Math.PI * 2); ctx.stroke(); spark(tx, ty, '#9d4bd2', q > 0.86 ? 4 : 0, 1.8); }
            if (q > 0.82) { shakeT = Math.max(shakeT, 520); flash('#7b2cbf55', 220); }
          }
        }
        if (key === 'katie') {
          if (b.abilityId === 'diagnostic_crush') for (const t of targets) { const q = pulse(0.57, 0.2), tx = t.home.x, ty = t.home.y - 6; ctx.strokeStyle = '#8cffff'; ctx.lineWidth = 3 + 6 * q; ctx.globalAlpha = q; ctx.beginPath(); ctx.arc(tx, ty, 10 + 48 * q, Math.PI, Math.PI * 2); ctx.stroke(); }
          if (b.abilityId === 'contrast_study') { const q = Math.sin(Math.PI * p); ctx.strokeStyle = '#69eff2'; ctx.lineWidth = 1; ctx.globalAlpha = 0.42 * q; for (let gx = 20; gx < W; gx += 22) { ctx.beginPath(); ctx.moveTo(gx, 25); ctx.lineTo(gx, GROUND); ctx.stroke(); } for (let gy = 35; gy < GROUND; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); } }
          if (b.abilityId === 'cat_scan') { const q = Math.sin(Math.PI * p); ctx.strokeStyle = '#7dfff5'; ctx.lineWidth = 4 + 5 * q; ctx.globalAlpha = 0.78 * q; ctx.beginPath(); ctx.arc(W * 0.70, GROUND + 16, 34 + 126 * q, Math.PI, Math.PI * 2); ctx.stroke(); for (const t of battlers.filter(t => t.side === 'enemy')) { ctx.strokeStyle = '#bd5be0'; ctx.lineWidth = 2 + 3 * q; ctx.beginPath(); ctx.arc(t.home.x, t.home.y - 34, 8 + 28 * q, 0, Math.PI * 2); ctx.stroke(); } if (q > 0.88) flash('#76fff244', 180); }
        }
        ctx.restore(); ctx.globalAlpha = 1;
      }
`;

once(
  "      ctx.globalAlpha = 1;\r\n      // stagger dust",
  fxBlock + "      ctx.globalAlpha = 1;\r\n      // stagger dust",
  'live battlefield ability VFX'
);

fs.writeFileSync(path, Buffer.from(source, 'latin1'));
console.log('Combat milestone integrated:', path);
