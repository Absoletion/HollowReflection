/* --------------------------------------------------------------- *
 *  Stage — GS-style animated pixel battle layer (canvas).
 *  Pure visual REPLAY of engine results: never blocks or reorders
 *  logic. DOM cards/menus stay authoritative for input & QA hooks.
 * --------------------------------------------------------------- */
const Stage = (() => {
  const W = 420, H = 208, GROUND = H - 26;
  let cv = null, ctx = null, S = null, bkey = null;
  let battlers = [];            // {uid, side, home:{x,y}, off:{x,y}, scale, anim, animT, alpha}
  let beats = [], parts = [], idleWaiters = [];
  let snap = null, raf = 0, tPrev = 0, clock = 0;
  let shakeT = 0, hitStopT = 0, pendingHitStop = 0, pendingShake = 0, flashC = null, flashT = 0, spotlight = false, lastEventId = 0;
  const api = { fast: false, paused: false, playbackRate: 1 };
  let audioCtx = null;
  function sfx(id) {
    if (api.fast || typeof window === 'undefined') return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime, osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      const profiles = {
        cast:{ from:440, to:660, type:'triangle' }, fireball:{ from:620, to:920, type:'triangle' },
        impact:{ from:120, to:62, type:'square', gain:0.095 }, heal:{ from:620, to:980, type:'sine' },
        burst:{ from:250, to:540, type:'triangle', dur:0.42 }, victory:{ from:740, to:1040, type:'sine' }, defeat:{ from:180, to:90, type:'triangle' },
        dark_draw:{ from:260, to:510, type:'sawtooth' }, dark_slash:{ from:210, to:72, type:'square', gain:0.09 },
        void_charge:{ from:92, to:310, type:'triangle', dur:0.46 }, void_break:{ from:125, to:48, type:'sawtooth', gain:0.105, dur:0.44 },
        flame_flip:{ from:480, to:820, type:'triangle' }, flame_burst:{ from:710, to:1080, type:'sawtooth', gain:0.085 },
        feast_chime:{ from:650, to:1180, type:'sine', dur:0.46 }, scan:{ from:330, to:920, type:'sine' },
        hammer_draw:{ from:170, to:260, type:'square' }, hammer_crush:{ from:105, to:48, type:'square', gain:0.11 },
        barrier:{ from:260, to:760, type:'sine', dur:0.46 }, radiation:{ from:150, to:360, type:'sawtooth', dur:0.42 },
      };
      const p = profiles[id] || profiles.cast, dur = p.dur || 0.36;
      osc.type = p.type || 'triangle';
      osc.frequency.setValueAtTime(Math.max(1, p.from), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, p.to || p.from), now + dur * 0.78);
      gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(p.gain || 0.075, now + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, now + dur - 0.015);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + dur);
    } catch (e) {}
  }
  const ABILITY_SFX = {
    cross_slash:['dark_draw','dark_slash',0.54], black_horizon:['void_charge','dark_slash',0.62], nightmares_end:['void_charge','void_break',0.64],
    fracture_edge:['dark_draw','void_break',0.58], event_horizon:['void_charge','void_break',0.64], shatterfall:['void_charge','void_break',0.62],
    flash_fry:['flame_flip','flame_burst',0.72], field_rations:['heal','feast_chime',0.68], feast:['feast_chime','flame_burst',0.58],
    diagnostic_crush:['hammer_draw','hammer_crush',0.56], contrast_study:['scan','hammer_crush',0.66], cat_scan:['scan','barrier',0.58],
  };
  function abilitySfx(b, actionId, progress) {
    const cue = ABILITY_SFX[actionId];
    if (!b || !cue) return;
    if (b.soundActionId !== actionId) { b.soundActionId = actionId; b.soundStarted = false; b.impactSound = false; }
    if (!b.soundStarted) { b.soundStarted = true; sfx(cue[0]); }
    if (progress >= cue[2] && !b.impactSound) { b.impactSound = true; sfx(cue[1]); }
  }
  function resetAbilitySfx(b) { if (b) { b.soundActionId = null; b.soundStarted = false; b.impactSound = false; } }

  /* ---------- setup ---------- */
  function ekey(en) {
    if (en.key === 'training_dummy') return 'construct';
    if (en.key === 'storehouse_pest') return 'hound';
    if (en.key === 'hollow_fragment') return 'glasswright';
    if (en.key === 'lowingman') return en.form === 'man' ? 'lowingman_man' : 'lowingman_beast';
    if (en.key === 'construct2') return 'construct';
    return en.key;
  }
  function pkey(u) { return (u.key === 'hale' && u.awakened) ? 'hale_awakened' : u.key; }
  const IMGS = {};
  function artFor(key) {
    const src = (typeof BATTLEART !== 'undefined' && (BATTLEART[key] ||
      (key === 'hale_awakened' && BATTLEART['hale']))) || null;
    if (!src) return null;
    if (!IMGS[key]) {
      const im = (typeof Image !== 'undefined') ? new Image() : null;
      if (!im) return null;
      im.src = src; IMGS[key] = im;
    }
    return IMGS[key].complete && IMGS[key].naturalWidth ? IMGS[key] : null;
  }
  const RIG_IMGS = {};
  const RIG_PARTS = {
    hale_awakened: ['head','torso','pelvis','arm_right','arm_left','hand_right','hand_left','leg_right','leg_left','cape_left','cape_center','cape_right','sword'],
    cinnia: ['head','torso','pelvis','arm_right','arm_left','hand_right','hand_left','leg_right','leg_left','sword']
  };
  function rigFor(key) {
    const parts = RIG_PARTS[key];
    if (!parts || typeof RIGPARTS === 'undefined') return null;
    const rig = {};
    for (const part of parts) {
      const id = key + '_' + part, src = RIGPARTS[id];
      if (!src) return null;
      if (!RIG_IMGS[id]) {
        const im = typeof Image !== 'undefined' ? new Image() : null;
        if (!im) return null;
        im.src = src; RIG_IMGS[id] = im;
      }
      const im = RIG_IMGS[id];
      if (!im.complete || !im.naturalWidth) return null;
      rig[part] = im;
    }
    return rig;
  }
  function drawRigPart(im, x, y, px, py, rot, sx, sy) {
    if (!im) return;
    ctx.save();
    ctx.translate(x + (px || 0), y + (py || 0));
    ctx.rotate(rot || 0);
    ctx.scale(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy);
    ctx.drawImage(im, -(px || 0), -(py || 0));
    ctx.restore();
  }
  function drawHaleRig(rig, anim, tSince, targetH, dead) {
    const s = targetH / 835;
    const idle = Math.sin(clock / 520), breathe = dead ? 0 : idle * 3;
    const p = Math.min(1, Math.max(0, tSince / 420));
    const action = Math.sin(Math.PI * p);
    const attack = anim === 'attack' && !dead ? action : 0;
    const cast = anim === 'cast' && !dead ? action : 0;
    const hit = anim === 'hit' && !dead ? Math.sin(Math.PI * Math.min(1, tSince / 260)) : 0;
    ctx.save();
    if (dead) { ctx.translate(-5, -2); ctx.rotate(-1.12); ctx.translate(0, 18); }
    ctx.scale(s, s);
    ctx.translate(-300, -930);
    // cape hangs from the shoulders and moves more slowly than the body
    drawRigPart(rig.cape_left, 108, 335, 60, 25, -0.025 * idle - 0.08 * attack, 1, 1);
    drawRigPart(rig.cape_right, 370, 305, 38, 25, 0.025 * idle + 0.06 * attack, 1, 1);
    drawRigPart(rig.cape_center, 136, 285, 164, 24, 0, 1, 1 + 0.006 * idle);
    // lower body stays planted; the upper body breathes and commits into attacks
    drawRigPart(rig.leg_right, 165, 520, 58, 8, -0.012 * idle, 1, 1);
    drawRigPart(rig.leg_left, 290, 515, 48, 8, 0.012 * idle, 1, 1);
    drawRigPart(rig.pelvis, 180, 500 + breathe * 0.25, 113, 24, -0.02 * attack, 1, 1);
    drawRigPart(rig.torso, 198 - attack * 10 + hit * 8, 285 + breathe, 86, 220, -0.07 * attack + 0.05 * hit, 1, 1 + 0.01 * idle);
    drawRigPart(rig.arm_right, 130 - attack * 18, 315 + breathe, 70, 18, -0.05 * idle - 0.48 * attack + 0.14 * cast, 1, 1);
    drawRigPart(rig.arm_left, 325 - attack * 8, 315 + breathe, 25, 24, 0.04 * idle - 0.25 * attack - 0.62 * cast, 1, 1);
    drawRigPart(rig.head, 210 - attack * 12 + hit * 7, 105 + breathe * 1.25 - cast * 4, 84, 205, -0.045 * attack + 0.055 * hit, 1, 1);
    // the physical sword is gripped near the right hand; attack rotates it through a broad leftward arc
    drawRigPart(rig.sword, 318 - attack * 70, 535 - attack * 65, 92, 100, 1.05 + attack * 1.12, 0.82, 0.82);
    drawRigPart(rig.hand_right, 165 - attack * 18, 590 + breathe + attack * 4, 32, 20, -0.05 * idle - 0.48 * attack, 1, 1);
    drawRigPart(rig.hand_left, 360 - attack * 10 - cast * 28, 570 + breathe - cast * 78, 28, 18, -0.25 * attack - 0.7 * cast, 1, 1);
    ctx.restore();
  }
  function drawCinniaRig(rig, anim, tSince, targetH, dead) {
    const s = targetH / 1100;
    const idle = Math.sin(clock / 480), breathe = dead ? 0 : idle * 3;
    const p = Math.min(1, Math.max(0, tSince / 420));
    const action = Math.sin(Math.PI * p);
    const attack = anim === 'attack' && !dead ? action : 0;
    const cast = anim === 'cast' && !dead ? action : 0;
    const hit = anim === 'hit' && !dead ? Math.sin(Math.PI * Math.min(1, tSince / 260)) : 0;
    ctx.save();
    if (dead) { ctx.translate(-4, -2); ctx.rotate(-1.08); ctx.translate(0, 16); }
    ctx.scale(s, s);
    ctx.translate(-275, -1100);
    drawRigPart(rig.leg_right, 95, 500, 70, 20, -0.012 * idle, 1, 1);
    drawRigPart(rig.leg_left, 275, 495, 68, 20, 0.012 * idle, 1, 1);
    drawRigPart(rig.pelvis, 40, 475 + breathe * 0.2, 235, 42, -0.02 * attack, 1, 1);
    drawRigPart(rig.torso, 145 - attack * 8 + hit * 7, 225 + breathe, 135, 300, -0.05 * attack + 0.05 * hit, 1, 1 + 0.01 * idle);
    drawRigPart(rig.arm_right, 92 - attack * 22, 280 + breathe, 72, 20, -0.05 * idle - 0.45 * attack + 0.12 * cast, 1, 1);
    drawRigPart(rig.arm_left, 325 - attack * 8, 270 + breathe, 35, 22, 0.04 * idle - 0.18 * attack - 0.58 * cast, 1, 1);
    drawRigPart(rig.sword, 42 - attack * 55, 105 - attack * 35, 170, 800, -0.52 + attack * 0.9, 0.78, 0.78);
    drawRigPart(rig.hand_right, 135 - attack * 18, 500 + breathe, 48, 18, -0.05 * idle - 0.42 * attack, 0.9, 0.9);
    drawRigPart(rig.hand_left, 342 - cast * 25, 490 + breathe - cast * 70, 40, 18, -0.18 * attack - 0.62 * cast, 0.9, 0.9);
    drawRigPart(rig.head, 95 - attack * 10 + hit * 7, 8 + breathe * 1.2 - cast * 4, 182, 255, -0.04 * attack + 0.05 * hit, 1, 1);
    ctx.restore();
  }
  const NAME_INITIAL = k => (k || '?').replace('lowingman_', '').charAt(0).toUpperCase();
  const ELEM_HEX = { fire:'#ff6b3d', water:'#4db8ff', earth:'#7ab648', thunder:'#ffd94d', light:'#ffe9b0', dark:'#9a6bd4', hollow:'#9adfd4' };
  function init(state, key) {
    S = state; bkey = key; battlers = []; beats = []; parts = [];
    shakeT = 0; hitStopT = 0; pendingHitStop = 0; pendingShake = 0; flashC = null; flashT = 0; spotlight = false; snap = null; lastEventId = 0;
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = W; cv.height = H; cv.className = 'stagecv';
      ctx = cv.getContext ? cv.getContext('2d') : null;
    }
    const P = S.party, E = S.enemies;
    const partyStep = P.length > 4 ? 34 : 42;
    P.forEach((u, i) => battlers.push({
      uid: u.uid, side: 'party', scale: 2,
      home: { x: W - 38 - i * partyStep, y: GROUND - 35 + (i % 2) * 20 },
      off: { x: 0, y: 0 }, anim: 'idle', animT: 0, alpha: 1,
    }));
    const big = E.some(e => e.key === 'lowingman' || e.key === 'glasswright');
    const enemyStep = E.length > 4 ? 40 : 55;
    E.forEach((en, i) => battlers.push({
      uid: en.uid, side: 'enemy', scale: 2,
      home: { x: 48 + i * enemyStep, y: GROUND - 5 - (i % 2) * 18 },
      off: { x: 0, y: 0 }, anim: 'idle', animT: 0, alpha: 1,
    }));
    loop();
  }
  function mount(host) {
    if (!host || !cv) return;
    if (cv.parentNode !== host) host.appendChild(cv);
  }
  function unitOf(b) { return S.party.concat(S.enemies).find(x => x.uid === b.uid); }
  function bOf(uid) { return battlers.find(b => b.uid === uid); }
  function actionSpriteAnim(b, act) {
    const u = b && unitOf(b), key = u && (b.side === 'party' ? pkey(u) : ekey(u));
    const anims = key && typeof SpriteRuntime !== 'undefined' ? SpriteRuntime.animationNames(key) : [];
    if (!anims.length) return act && (act.tier === 'Art' || act.tier === 'Burst') ? 'cast' : 'attack';
    const desired = act && act.tier === 'Burst' ? ['burst','cast','attack'] : act && act.tier === 'Art' ? ['arts','cast','attack'] : act && act.tier === 'Skill' ? ['skill','attack','cast'] : ['attack','skill'];
    return desired.find(name => anims.includes(name)) || 'idle';
  }
  function spriteAnimDuration(b, anim, fallback) {
    const u = b && unitOf(b), key = u && (b.side === 'party' ? pkey(u) : ekey(u));
    if (typeof SpriteRuntime === 'undefined' || !SpriteRuntime.hasAnimation(key, anim)) return fallback;
    return Math.max(fallback, SpriteRuntime.animationDurationMs(key, anim));
  }
  const MELEE_ACTIONS = new Set(['basic','cross_slash','fracture_edge','coup','curtain_call','anchor_drop','keelhaul','kegcracker','blast_mining','grand_opening','diagnostic_crush','contrast_study']);
  function moveAnim(b) {
    const u = b && unitOf(b), key = u && (b.side === 'party' ? pkey(u) : ekey(u));
    return typeof SpriteRuntime !== 'undefined' && SpriteRuntime.hasAnimation(key, 'move') ? 'move' : 'idle';
  }
  function easeMove(p) { return p * p * (3 - 2 * p); }

  /* ---------- beat queue ---------- */
  function beat(dur, fn, atEnd) { beats.push({ dur, fn, atEnd, el: 0, started: false }); }
  function resolveIdle() {
    if (beats.length) return;
    while (idleWaiters.length) idleWaiters.shift()();
  }
  function whenIdle() {
    return beats.length ? new Promise(resolve => idleWaiters.push(resolve)) : Promise.resolve();
  }
  function tickBeats(dt) {
    if (api.fast) { // resolve everything instantly
      while (beats.length) { const b = beats.shift(); if (b.atEnd) b.atEnd(); }
      resolveIdle(); return;
    }
    const speed = 1; // never accelerate sprite playback to drain the visual queue
    if (!beats.length) return;
    const b = beats[0];
    b.started = true;
    b.el += dt * speed;
    const p = Math.min(1, b.el / b.dur);
    if (b.fn) b.fn(p);
    if (p >= 1) { beats.shift(); if (b.atEnd) b.atEnd(); resolveIdle(); }
  }

  /* ---------- particles ---------- */
  function spark(x, y, color, n, spread) {
    for (let i = 0; i < (n || 8) && parts.length < 200; i++) {
      const a = Math.random() * Math.PI * 2, v = (Math.random() * 0.09 + 0.04) * (spread || 1);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.05, life: 420, max: 420, color, size: Math.random() < 0.3 ? 3 : 2 });
    }
  }
  function dmgNum(x, y, txt, color, big) {
    if (parts.length < 200) parts.push({ x, y, vx: 0, vy: -0.045, life: 800, max: 800, color, txt, big });
  }
  const STATUS_LABELS = {
    atkDown: 'ATK DOWN', atkUp: 'ATK UP', defDown: 'DEF DOWN', defUp: 'DEF UP',
    vuln: 'VULNERABLE', darkResDown: 'DARK RES DOWN', guard: 'GUARDED',
    barrier: 'BARRIER', radiation: 'RADIATION', break: 'BREAK'
  };
  function statusPop(b, type, payload) {
    if (!b) return;
    const key = payload && payload.status;
    const label = STATUS_LABELS[key] || String(key || 'STATUS').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
    const applied = type === 'status_apply';
    const duration = applied && payload && Number(payload.duration) > 0 ? ` · ${Math.ceil(Number(payload.duration) / 1000)}s` : '';
    if (parts.length < 200) parts.push({
      x: b.home.x + b.off.x, y: b.home.y - 78, vx: 0, vy: -0.018,
      life: 920, max: 920, color: applied ? '#9adfd4' : '#aeb8c7',
      txt: `${applied ? '+' : '×'} ${label}${duration}`, status: true
    });
  }
  function tickParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.txt) p.vy += 0.00025 * dt;
    }
  }

  /* ---------- choreography from engine results ---------- */
  function snapshot(state) {
    S = state;
    snap = {};
    S.party.concat(S.enemies).forEach(x => snap[x.uid] = { hp: x.hp, alive: x.alive, form: x.form, awakened: x.awakened });
  }
  function play(evs, state, act) {
    S = state;
    const fresh = evs.filter(e => !e.id || e.id > lastEventId);
    for (const e of fresh) if (e.id) lastEventId = Math.max(lastEventId, e.id);
    try { if (fresh.length) playInner(fresh, act); } catch (e) { console.error('stage beat error', e); beats.length = 0; battlers.forEach(b => { b.off.x = 0; b.off.y = 0; b.anim = 'idle'; }); resolveIdle(); }
  }
  function playInner(evs, act) {
    const pre = snap || {}; snap = null;
    const actorB = act && bOf(act.uid);
    const hurt = [], healed = [];
    S.party.concat(S.enemies).forEach(x => {
      const p = pre[x.uid]; if (!p) return;
      if (x.hp < p.hp) hurt.push({ b: bOf(x.uid), amt: p.hp - x.hp, u: x });
      if (x.hp > p.hp) healed.push({ b: bOf(x.uid), amt: x.hp - p.hp, u: x });
    });
    const enemyHurt = hurt.filter(h => h.b && h.b.side === 'enemy');
    const partyHurt = hurt.filter(h => h.b && h.b.side === 'party');
    const isBurst = act && act.tier === 'Burst';
    const isArt = act && act.tier === 'Art';
    const offensive = enemyHurt.length > 0;
    // 1. dedicated key art may play on Arts; every Burst keeps the fallback cut-in
    if (actorB && (isBurst || (isArt && typeof CUTINS !== 'undefined' && CUTINS[pkey(unitOf(actorB))]))) {
      const u = unitOf(actorB);
      cutIn(u, act);
      beat(700, null);
    }
    // 2. actor beat
    if (actorB && offensive) {
      const tgt = enemyHurt[0].b;
      const magicPan = unitOf(actorB) && unitOf(actorB).key === 'cinnia';
      const actorAnim = actionSpriteAnim(actorB, act);
      const approaches = actorB.side === 'party' && MELEE_ACTIONS.has(act.actionId);
      const contact = approaches ? { x: tgt.home.x + 66 - actorB.home.x, y: tgt.home.y - actorB.home.y } : { x: 0, y: 0 };
      if (approaches) beat(Math.max(260, Math.min(520, Math.abs(contact.x) * 1.25)), p => {
        const k = easeMove(p); actorB.off.x = contact.x * k; actorB.off.y = contact.y * k;
        if (actorB.anim !== moveAnim(actorB)) { actorB.anim = moveAnim(actorB); actorB.animT = clock; }
      }, () => { actorB.off.x = contact.x; actorB.off.y = contact.y; });
      let impactDone = false;
      beat(spriteAnimDuration(actorB, actorAnim, magicPan ? 680 : 420), p => {
        actorB.abilityP = p; actorB.abilityId = act.actionId; actorB.abilityTargets = enemyHurt.map(h => h.b).filter(Boolean);
        abilitySfx(actorB, act.actionId, p);
        if (magicPan) {
          actorB.skillP = p; actorB.skillTarget = tgt;
        }
        if (actorB.anim !== actorAnim) { actorB.anim = actorAnim; actorB.animT = clock; }
        if (!impactDone && p >= .58) { impactDone = true; enemyHurt.forEach(h => hitBeat(h, isBurst)); }
      }, () => {
        if (!impactDone) enemyHurt.forEach(h => hitBeat(h, isBurst));
        actorB.skillP = 0; actorB.skillTarget = null; actorB.releaseSound = false; resetAbilitySfx(actorB); actorB.abilityP = 0; actorB.abilityId = null; actorB.abilityTargets = null;
      });
      if (approaches) beat(Math.max(240, Math.min(460, Math.abs(contact.x))), p => {
        const k = 1 - easeMove(p); actorB.off.x = contact.x * k; actorB.off.y = contact.y * k;
        if (actorB.anim !== moveAnim(actorB)) { actorB.anim = moveAnim(actorB); actorB.animT = clock; }
      }, () => { actorB.off.x = 0; actorB.off.y = 0; actorB.anim = 'idle'; });
      else beat(1, null, () => { actorB.off.x = 0; actorB.off.y = 0; actorB.anim = 'idle'; });
    } else if (actorB && act && act.actionId !== 'basic') {
      const cinniaSupport = (isArt || isBurst) && unitOf(actorB) && unitOf(actorB).key === 'cinnia';
      const actorAnim = actionSpriteAnim(actorB, act);
      beat(spriteAnimDuration(actorB, actorAnim, cinniaSupport ? (isBurst ? 980 : 800) : 380), p => {
        actorB.abilityP = p; actorB.abilityId = act.actionId; actorB.abilityTargets = [];
        abilitySfx(actorB, act.actionId, p);
        if (cinniaSupport) {
          if (isBurst) actorB.burstP = p; else actorB.artsP = p;
        }
        if (actorB.anim !== actorAnim) { actorB.anim = actorAnim; actorB.animT = clock; }
      }, () => { actorB.artsP = 0; actorB.burstP = 0; resetAbilitySfx(actorB); actorB.abilityP = 0; actorB.abilityId = null; actorB.abilityTargets = null; actorB.anim = 'idle'; });
    }
    // healing numbers
    if (healed.length) beat(320, null, () => healed.forEach(h => {
      if (!h.b) return;
      dmgNum(h.b.home.x, h.b.home.y - 52, '+' + h.amt, '#7be08a');
      spark(h.b.home.x, h.b.home.y - 24, '#7be08a', 6);
    }));
    // 3. enemy-phase replay: party got hurt
    if (partyHurt.length) {
      const attacker = battlers.find(b => b.side === 'enemy' && unitOf(b) && unitOf(b).alive) || null;
      beat(430, p => {
        if (attacker) {
          const k = p < 0.5 ? p * 2 : (1 - p) * 2;
          attacker.off.x = 34 * k;
          if (attacker.anim !== 'attack') { attacker.anim = 'attack'; attacker.animT = clock; }
        }
      }, () => {
        if (attacker) { attacker.off.x = 0; attacker.anim = 'idle'; }
        partyHurt.forEach(h => hitBeat(h, false));
      });
    }
    // 4. typed + text events
    let stagger = false, stampede = false, formSwap = false;
    for (const e of evs) {
      if (e.type === 'hit_stop_hint') pendingHitStop = Math.max(pendingHitStop, Number(e.payload && e.payload.durationMs) || 0);
      else if (e.type === 'camera_shake_hint') pendingShake = Math.max(pendingShake, Number(e.payload && e.payload.durationMs) || 0);
      if (e.t === 'awakening') awakenBeat();
      else if (e.t === 'finale_lock') { spotlight = true; flash('#0a0f14', 500); }
      else if (e.t === 'result') {
        beat(120, null, () => finish(e.v));
        // Keep the stage open long enough to show the complete authored
        // victory/defeat clip before the result overlay takes control.
        beat(terminalAnimationDuration(e.v), null);
      }
      else if (e.t === 'log' && /STAMPEDE/i.test(e.msg || '')) stampede = true;
      else if (e.t === 'log' && /staggered|STAGGER/i.test(e.msg || '')) stagger = true;
      else if (e.t === 'status_apply' || e.t === 'status_remove') {
        for (const uid of e.targetIds || []) statusPop(bOf(uid), e.t, e.payload || {});
      }
    }
    S.enemies.forEach(en => { const p = pre[en.uid]; if (p && p.form && en.form !== p.form) formSwap = true; });
    if (stampede) { shakeT = Math.max(shakeT, 650); flash('#c0392b33', 420); }
    if (stagger) beat(360, null, () => {
      const boss = battlers.find(b => b.side === 'enemy' && unitOf(b) && unitOf(b).breakMax > 0);
      if (boss) { spark(boss.home.x, boss.home.y - 30, '#ffd94d', 22, 1.6); dmgNum(boss.home.x, boss.home.y - 70, 'BREAK!', '#ffd94d', true); shakeT = Math.max(shakeT, 420); }
    });
    if (formSwap) beat(400, null, () => {
      const boss = battlers.find(b => b.side === 'enemy' && unitOf(b) && unitOf(b).key === 'lowingman');
      if (boss) spark(boss.home.x, boss.home.y - 36, '#9adfd4', 26, 2);
    });
    // resolve Glass Bulwark finale visuals
    if (S.script && S.script.finaleDone && spotlight) {
      spotlight = false;
      beat(500, null, () => {
        S.party.forEach(u => { const b = bOf(u.uid); if (b) spark(b.home.x, b.home.y - 26, '#9adfd4', 14, 1.4); });
        flash('#e8fffb66', 500); shakeT = Math.max(shakeT, 600);
      });
    }
  }
  function hitBeat(h, big) {
    if (!h.b) return;
    const u = unitOf(h.b);
    const heavy = u && u.alive && h.amt >= Math.max(1, Math.floor(u.maxhp * 0.24));
    const reaction = heavy ? 'stagger' : 'hit';
    h.b.anim = reaction; h.b.animT = clock;
    spark(h.b.home.x + h.b.off.x, h.b.home.y - 24, '#fff', big ? 16 : 8, big ? 1.5 : 1);
    dmgNum(h.b.home.x + h.b.off.x, h.b.home.y - 56, String(h.amt), h.b.side === 'enemy' ? '#ffd94d' : '#ff6b5e', big);
    shakeT = Math.max(shakeT, big ? 420 : 160);
    if (pendingHitStop) { hitStopT = Math.max(hitStopT, pendingHitStop); pendingHitStop = 0; }
    if (pendingShake) { shakeT = Math.max(shakeT, pendingShake); pendingShake = 0; }
    const reactionDuration = spriteAnimDuration(h.b, reaction, heavy ? 620 : 420);
    setTimeout(() => { if (h.b.anim === 'hit' || h.b.anim === 'stagger') h.b.anim = 'idle'; }, api.fast ? 0 : reactionDuration);
  }
  function awakenBeat() {
    flash('#e8fffbcc', 900);
    const hale = S.party.find(u => u.key === 'hale');
    const b = hale && bOf(hale.uid);
    beat(650, null, () => {
      if (b) { spark(b.home.x, b.home.y - 30, '#9adfd4', 30, 2.2); dmgNum(b.home.x, b.home.y - 74, 'AWAKENING', '#9adfd4', true); }
      shakeT = Math.max(shakeT, 500);
    });
  }
  function flash(color, ms) { flashC = color; flashT = ms; }
  function finish(kind) {
    if (kind === 'victory') S.party.forEach(u => {
      const b = bOf(u.uid);
      if (b && u.alive) { b.anim = 'victory'; b.animT = clock; spark(b.home.x, b.home.y - 40, '#ffd94d', 8); }
    });
  }
  function terminalAnimationDuration(kind) {
    const candidates = S.party
      .map(u => ({ u, b: bOf(u.uid) }))
      .filter(entry => entry.b && (kind === 'victory' ? entry.u.alive : !entry.u.alive));
    const anim = kind === 'victory' ? 'victory' : 'defeat';
    const fallback = kind === 'victory' ? 900 : 1100;
    const longest = candidates.reduce(
      (max, entry) => Math.max(max, spriteAnimDuration(entry.b, anim, fallback)),
      fallback
    );
    return longest + 220;
  }
  /* ---------- burst cut-in (DOM overlay) ---------- */
  function cutIn(u, act) {
    if (api.fast || !u || !cv || !cv.parentNode) return;
    const d = document.createElement('div');
    d.className = 'cutin e-' + (u.awakened ? 'hollow' : u.elem);
    const k = pkey(u);
    const dedicated = typeof CUTINS !== 'undefined' && ((act && act.tier === 'Burst' && CUTINS[k + '_burst']) || CUTINS[k]);
    const src = dedicated || (typeof BATTLEART !== 'undefined' && BATTLEART[k]) || (typeof PORTRAITS !== 'undefined' && PORTRAITS[k]) || null;
    if (dedicated) d.classList.add('keyart');
    if (src) { const im = document.createElement('img'); im.className = dedicated ? 'cutin-art cutin-keyart' : 'cutin-art'; im.src = src; d.appendChild(im); }
    const nm = document.createElement('div'); nm.className = 'cutin-name'; nm.textContent = u.name;
    d.appendChild(nm);
    if (act && act.name) { const mv = document.createElement('div'); mv.className = 'cutin-move'; mv.textContent = act.name; d.appendChild(mv); }
    cv.parentNode.appendChild(d);
    setTimeout(() => d.remove(), 950);
  }

  /* ---------- render loop ---------- */
  function loop() {
    if (raf) return;
    const step = (t) => {
      raf = requestAnimationFrame ? requestAnimationFrame(step) : 0;
      const dt = tPrev ? Math.min(50, t - tPrev) : 16;
      tPrev = t;
      if (!api.paused) {
        const visualDt = dt * api.playbackRate;
        if (hitStopT > 0) hitStopT = Math.max(0, hitStopT - dt);
        else { clock += visualDt; tickBeats(visualDt); tickParts(visualDt); }
        if (shakeT > 0) shakeT -= visualDt;
        if (flashT > 0) flashT -= visualDt;
      }
      draw();
    };
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(step);
    else { // jsdom without rAF: timer fallback so beats still resolve
      const iv = setInterval(() => { tickBeats(16); tickParts(16); }, 16);
      raf = -1;
      if (typeof window !== 'undefined') window.addEventListener('beforeunload', () => clearInterval(iv));
    }
  }
  function draw() {
    if (!ctx || !S) return;
    try { drawInner(); } catch (e) { if (!api._drawErr) { api._drawErr = true; console.error('stage draw error', e); if (typeof window !== 'undefined' && window.__errToast) window.__errToast('stage draw: ' + e.message); } return; }
  }
  function drawInner() {
    const sx = shakeT > 0 ? (Math.random() - 0.5) * Math.min(8, shakeT / 40) : 0;
    const sy = shakeT > 0 ? (Math.random() - 0.5) * Math.min(6, shakeT / 60) : 0;
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    ctx.clearRect(-8, -8, W + 16, H + 16);
    // moody backdrop bands per battle
    const scenes = { ch1: ['#141a22', '#1a2430', '#22303c'], ch2: ['#101a17', '#16241f', '#1d2f28'], ch3: ['#160f18', '#201626', '#2a1d31'], ch6: ['#12151a', '#181d24', '#20262e'] };
    const cs = scenes[bkey] || scenes.ch6;
    ctx.fillStyle = cs[0]; ctx.fillRect(-8, -8, W + 16, H * 0.45 + 8);
    ctx.fillStyle = cs[1]; ctx.fillRect(-8, H * 0.45, W + 16, H * 0.35);
    ctx.fillStyle = cs[2]; ctx.fillRect(-8, H * 0.8, W + 16, H * 0.2 + 8);
    ctx.fillStyle = '#0009'; ctx.fillRect(-8, GROUND + 2, W + 16, H - GROUND);
    // telegraph vignette
    if (S.enemies.some(en => en.alive && en.tele > 0)) {
      const pulse = 0.10 + 0.08 * Math.sin(clock / 180);
      ctx.fillStyle = 'rgba(192,57,43,' + pulse.toFixed(3) + ')';
      ctx.fillRect(-8, -8, W + 16, H + 16);
    }
    // spotlight (finale lock)
    if (spotlight) { ctx.fillStyle = 'rgba(4,6,9,0.62)'; ctx.fillRect(-8, -8, W + 16, H + 16); }
    // battlers
    for (const b of battlers) {
      const u = unitOf(b); if (!u) continue;
      const key = b.side === 'party' ? pkey(u) : ekey(u);
      const dead = !u.alive;
      const anim = dead ? (typeof SpriteRuntime !== 'undefined' && SpriteRuntime.hasAnimation(key, 'defeat') ? 'defeat' : 'hit') : b.anim;
      const x = b.home.x + b.off.x, y = b.home.y + b.off.y + (dead ? 5 : 0);
      const tSince = clock - (b.animT || 0);
      if (dead) {
        const defeatDuration = spriteAnimDuration(b, 'defeat', 900);
        const fadeProgress = Math.max(0, Math.min(1, (tSince - defeatDuration) / 320));
        ctx.globalAlpha = tSince <= defeatDuration ? 0.92 : 0.92 * (1 - fadeProgress);
      } else {
        ctx.globalAlpha = b.alpha;
      }
      if (spotlight && u.key !== 'hale') ctx.globalAlpha *= 0.4;
      // --- anime standee rendering (art if present, glass-token fallback) ---
      const big = key.indexOf('lowingman') === 0;
      const targetH = big ? 118 : (b.side === 'enemy' ? 78 : 84);
      let lean = 0, jx = 0, breathe = 1;
      if (!dead) {
        if (anim === 'idle') { breathe = 1 + 0.012 * Math.sin(clock / 520 + b.home.x); }
        else if (anim === 'attack') { lean = (b.side === 'party' ? -1 : 1) * 0.10; breathe = 1.02; }
        else if (anim === 'hit') { jx = (Math.random() - 0.5) * 4; lean = (b.side === 'party' ? 1 : -1) * 0.06; }
        else if (anim === 'cast') { breathe = 1 + 0.02 * Math.sin(clock / 120); }
      }
      // Canonical pixel combat sprites take priority. Painted rigs remain migration fallbacks and high-detail source art.
      const px = typeof SpriteRuntime !== 'undefined' && SpriteRuntime.hasAnimation(key, 'idle');
      const rig = !px && rigFor(key);
      const im = artFor(key);
      ctx.save();
      ctx.globalAlpha *= 0.28; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y - 1, key === 'cinnia' ? 25 : 18, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save();
      ctx.translate(x + jx, y);
      ctx.rotate(lean);
      if (!px && !rig) ctx.scale(1, breathe); // sprites and the rig carry their own idle motion
      if (anim === 'cast' && !dead) { // glow behind caster
        ctx.fillStyle = (ELEM_HEX[u.elem] || '#9adfd4') + '33';
        ctx.beginPath(); ctx.arc(0, -targetH * 0.5, targetH * 0.55, 0, Math.PI * 2); ctx.fill();
      }
      if (rig) {
        if (key === 'cinnia') drawCinniaRig(rig, anim, tSince, 90, dead);
        else drawHaleRig(rig, anim, tSince, 98, dead);
        if (anim === 'hit' && tSince < 260) {
          ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(-55, -104, 110, 108); ctx.globalCompositeOperation = 'source-over';
        }
      } else if (px) {
        const frameIdx = (typeof animFrame === 'function') ? animFrame(key, anim, clock - (b.animT || 0)) : 0;
        const pixelScale = b.side === 'enemy' ? (key.indexOf('lowingman') === 0 ? 1.45 : 1.25) : 1;
        const spriteResult = SpriteRuntime.draw(ctx, key, anim, frameIdx, 0, 0, pixelScale, b.side === 'enemy'); // source sheets face left; enemies are mirrored right toward the party.
        if (!spriteResult.drawn) {
          const hex = ELEM_HEX[u.awakened ? 'hollow' : u.elem] || '#9adfd4';
          ctx.fillStyle = '#0d1318ee'; ctx.strokeStyle = hex; ctx.lineWidth = 1.5;
          ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-20, -84, 40, 84, 7); else ctx.rect(-20, -84, 40, 84); ctx.fill(); ctx.stroke();
          ctx.fillStyle = hex; ctx.font = 'bold 24px serif'; ctx.textAlign = 'center'; ctx.fillText(NAME_INITIAL(key), 0, -45);
        }
      } else if (im) {
        const w2 = targetH * (im.naturalWidth / im.naturalHeight);
        ctx.drawImage(im, -w2 / 2, -targetH, w2, targetH);
        if (anim === 'hit' && tSince < 260) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-w2 / 2, -targetH, w2, targetH); ctx.globalCompositeOperation = 'source-over'; }
      } else {
        // glass-token fallback: element-lit silhouette panel (deliberate, on-theme)
        const w2 = big ? 74 : 40, hex = ELEM_HEX[u.awakened ? 'hollow' : u.elem] || '#9adfd4';
        ctx.fillStyle = '#0d1318ee';
        ctx.strokeStyle = hex;
        ctx.lineWidth = 1.5;
        const rx = -w2 / 2, ry = -targetH;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(rx, ry, w2, targetH, 7); else ctx.rect(rx, ry, w2, targetH);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = hex + '2e';
        ctx.beginPath(); ctx.arc(0, ry + targetH * 0.34, w2 * 0.32, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hex;
        ctx.font = 'bold ' + Math.round(targetH * 0.3) + 'px serif';
        ctx.textAlign = 'center';
        ctx.fillText(NAME_INITIAL(key), 0, ry + targetH * 0.46);
        ctx.fillStyle = hex + '55';
        ctx.fillRect(rx + 3, ry + targetH - 7, w2 - 6, 2);
        if (anim === 'hit' && tSince < 260) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(rx, ry, w2, targetH, 7); else ctx.rect(rx, ry, w2, targetH); ctx.fill(); }
      }
      ctx.restore();
      // Cinnia casts through the pan: the body performs a cooking flip while a separate projectile crosses the stage.
      if (key === 'cinnia' && b.skillP > 0 && b.skillTarget && typeof drawSpriteEffect === 'function') {
        const p = b.skillP, targetX = b.skillTarget.home.x + b.skillTarget.off.x;
        let fx = x - 34, fy = y - 50, frame = 0;
        if (p < 0.34) frame = 0;
        else if (p < 0.76) {
          const travel = (p - 0.34) / 0.42;
          fx = (x - 36) + (targetX - (x - 36)) * travel;
          frame = Math.min(3, Math.floor(travel * 4));
        } else {
          const impact = (p - 0.76) / 0.24;
          fx = targetX; frame = 4 + Math.min(3, Math.floor(impact * 4));
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        drawSpriteEffect(ctx, 'cinnia', 'fireball', frame, fx, fy, 0.48, false);
        ctx.restore();
      }
      if (key === 'cinnia' && b.artsP > 0 && typeof drawSpriteEffect === 'function') {
        const frame = Math.min(11, Math.floor(b.artsP * 12));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        drawSpriteEffect(ctx, 'cinnia', 'field_rations', frame, W * 0.56, GROUND - 10, 0.82, false);
        ctx.restore();
      }
      if (key === 'cinnia' && b.burstP > 0 && typeof drawSpriteEffect === 'function') {
        const frame = Math.min(15, Math.floor(b.burstP * 16));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        drawSpriteEffect(ctx, 'cinnia', 'full_course_feast', frame, W * 0.56, GROUND - 8, 0.92, false);
        ctx.restore();
        if (b.burstP > 0.55 && !b.burstPeak) { b.burstPeak = true; shakeT = Math.max(shakeT, 420); flash('#ffd56a44', 260); }
        if (b.burstP < 0.15) b.burstPeak = false;
      }

      // Battlefield-scale authored VFX: these are deliberately larger than the unit cell.
      if (b.abilityP > 0 && b.abilityId) {
        const p = b.abilityP, pulse = (at, width) => Math.max(0, 1 - Math.abs(p - at) / width);
        const targets = (b.abilityTargets || []).length ? b.abilityTargets : battlers.filter(t => t.side === 'enemy');
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (key === 'hale' || key === 'hale_awakened') {
          if (b.abilityId === 'cross_slash' || b.abilityId === 'fracture_edge') for (const t of targets) {
            const q1 = pulse(0.43, 0.16), q2 = pulse(0.61, 0.16), tx = t.home.x + t.off.x, ty = t.home.y - 35;
            const awakened = b.abilityId === 'fracture_edge';
            ctx.strokeStyle = awakened ? '#9dfff2' : '#e7c8ff'; ctx.lineWidth = 2 + 7 * q1; ctx.globalAlpha = q1; ctx.beginPath(); ctx.moveTo(tx - 30, ty - 28); ctx.lineTo(tx + 30, ty + 28); ctx.stroke();
            ctx.strokeStyle = awakened ? '#b65cff' : '#a54ee3'; ctx.lineWidth = 3 + 8 * q2; ctx.globalAlpha = q2; ctx.beginPath(); ctx.moveTo(tx - 30, ty + 28); ctx.lineTo(tx + 30, ty - 28); ctx.stroke();
          }
          if (b.abilityId === 'black_horizon' || b.abilityId === 'event_horizon') {
            const q = pulse(0.60, 0.25), tx = targets[0] ? targets[0].home.x : W * 0.24, ty = targets[0] ? targets[0].home.y - 38 : GROUND - 42;
            ctx.fillStyle = `rgba(5,0,12,${0.72 * q})`; ctx.beginPath(); ctx.ellipse(tx, ty, 28 + 78 * q, 10 + 30 * q, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = b.abilityId === 'event_horizon' ? '#85fff0' : '#c788ff'; ctx.lineWidth = 3 + 5 * q; ctx.globalAlpha = q; ctx.beginPath(); ctx.moveTo(6, ty); ctx.lineTo(W - 6, ty); ctx.stroke();
            if (b.abilityId === 'event_horizon') { ctx.strokeStyle = '#b45bff'; ctx.lineWidth = 2 + 4 * q; ctx.beginPath(); ctx.arc(tx, ty, 12 + 44 * q, 0, Math.PI * 2); ctx.stroke(); }
          }
          if (b.abilityId === 'nightmares_end' || b.abilityId === 'shatterfall') {
            const q = pulse(0.64, 0.27); ctx.fillStyle = `rgba(25,0,42,${0.58 * q})`; ctx.fillRect(0, 0, W, H);
            for (const t of targets) { const tx = t.home.x, ty = t.home.y - 34; ctx.strokeStyle = b.abilityId === 'shatterfall' ? '#93fff1' : '#dba9ff'; ctx.lineWidth = 3 + 8 * q; ctx.globalAlpha = q; ctx.beginPath(); ctx.arc(tx, ty, 12 + 72 * q, 0, Math.PI * 2); ctx.stroke(); spark(tx, ty, b.abilityId === 'shatterfall' ? '#83eadf' : '#9d4bd2', q > 0.86 ? 4 : 0, 1.8); }
            if (q > 0.82) { shakeT = Math.max(shakeT, 520); flash(b.abilityId === 'shatterfall' ? '#72fff255' : '#7b2cbf55', 220); }
          }
        }
        if (key === 'katie') {
          if (b.abilityId === 'diagnostic_crush') for (const t of targets) { const q = pulse(0.57, 0.2), tx = t.home.x, ty = t.home.y - 6; ctx.strokeStyle = '#8cffff'; ctx.lineWidth = 3 + 6 * q; ctx.globalAlpha = q; ctx.beginPath(); ctx.arc(tx, ty, 10 + 48 * q, Math.PI, Math.PI * 2); ctx.stroke(); }
          if (b.abilityId === 'contrast_study') { const q = Math.sin(Math.PI * p); ctx.strokeStyle = '#69eff2'; ctx.lineWidth = 1; ctx.globalAlpha = 0.42 * q; for (let gx = 20; gx < W; gx += 22) { ctx.beginPath(); ctx.moveTo(gx, 25); ctx.lineTo(gx, GROUND); ctx.stroke(); } for (let gy = 35; gy < GROUND; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); } }
          if (b.abilityId === 'cat_scan') { const q = Math.sin(Math.PI * p); ctx.strokeStyle = '#7dfff5'; ctx.lineWidth = 4 + 5 * q; ctx.globalAlpha = 0.78 * q; ctx.beginPath(); ctx.arc(W * 0.70, GROUND + 16, 34 + 126 * q, Math.PI, Math.PI * 2); ctx.stroke(); for (const t of battlers.filter(t => t.side === 'enemy')) { ctx.strokeStyle = '#bd5be0'; ctx.lineWidth = 2 + 3 * q; ctx.beginPath(); ctx.arc(t.home.x, t.home.y - 34, 8 + 28 * q, 0, Math.PI * 2); ctx.stroke(); } if (q > 0.88) flash('#76fff244', 180); }
        }
        ctx.restore(); ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = 1;
      // stagger dust
      if (u.staggered) { ctx.fillStyle = '#ffd94d'; ctx.fillRect(x - 14, y - 2, 28, 2); }
    }
    // particles
    for (const p of parts) {
      const k = p.life / p.max;
      if (p.txt) {
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.font = (p.status ? 'bold 8px' : (p.big ? 'bold 15px' : 'bold 11px')) + ' monospace';
        ctx.textAlign = 'center';
        if (p.status) {
          const width = Math.max(42, ctx.measureText(p.txt).width + 10);
          ctx.fillStyle = '#091319dd';
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(p.x - width / 2, p.y - 10, width, 14, 4); ctx.fill(); ctx.stroke(); }
          else { ctx.fillRect(p.x - width / 2, p.y - 10, width, 14); ctx.strokeRect(p.x - width / 2, p.y - 10, width, 14); }
          ctx.fillStyle = p.color;
          ctx.fillText(p.txt, p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.fillText(p.txt, p.x, p.y);
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
      }
    }
    // flash overlay
    if (flashC && flashT > 0) { ctx.fillStyle = flashC; ctx.fillRect(-8, -8, W + 16, H + 16); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------- injected styles ---------- */
  (function css() {
    if (typeof document === 'undefined') return;
    const st = document.createElement('style');
    st.textContent = [
      '#stagehost{position:relative;margin:0 10px;border:1px solid #223;border-radius:10px;overflow:hidden;background:#0c1014;}',
      '#stagehost canvas.stagecv{display:block;width:100%;image-rendering:pixelated;image-rendering:crisp-edges;}',
      '.cutin{position:absolute;left:0;right:0;top:26%;height:64px;display:flex;align-items:center;gap:12px;padding:0 16px;',
      ' background:linear-gradient(100deg,transparent 0%,rgba(10,14,18,.94) 12%,rgba(10,14,18,.94) 88%,transparent 100%);',
      ' border-top:1px solid var(--gold,#c9a94d);border-bottom:1px solid var(--gold,#c9a94d);animation:cutin-slide .95s ease-out forwards;z-index:5;}',
      '.cutin-art{height:120px;margin-top:-40px;filter:drop-shadow(0 4px 12px #000c);}',
      '.cutin-name{position:relative;z-index:2;font-size:20px;font-weight:800;letter-spacing:3px;color:#fff;text-shadow:0 0 12px var(--gold,#c9a94d);text-transform:uppercase;}',
      '.cutin-move{position:relative;z-index:2;margin-left:auto;color:#d9c7ff;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;text-shadow:0 2px 5px #000;}',
      '.cutin.keyart{top:18%;height:112px;padding:0 16px;overflow:hidden;border-color:#a76bdd;isolation:isolate;}',
      '.cutin.keyart::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,#090511dd 0%,#09051199 25%,transparent 60%,#09051144 100%);}',
      '.cutin.keyart .cutin-keyart{position:absolute;z-index:0;inset:0;width:100%;height:100%;margin:0;object-fit:cover;object-position:center;filter:none;}',
      '.cutin.keyart .cutin-name{align-self:flex-end;margin-bottom:26px;}',
      '.cutin.keyart .cutin-move{align-self:flex-end;margin-bottom:10px;}',
      '@keyframes cutin-slide{0%{transform:translateX(-110%)}18%{transform:translateX(0)}82%{transform:translateX(0)}100%{transform:translateX(112%)}}',
      /* compact battle cards while the stage carries the visuals */
      '.stage-on .ucard.mini .port,.stage-on .ucard.enemy .eport{display:none;}',
      '.stage-on .ucard.enemy.big{min-height:0;}',
      '.stage-on .ucard{padding:4px 6px;}',
    ].join('\n');
    document.head.appendChild(st);
  })();

  if (typeof window !== 'undefined') { window.__stageFast = () => { api.fast = true; }; window.__stageDebug = () => api.debugBattlers(); }
  api.init = init; api.mount = mount; api.snapshot = snapshot; api.play = play; api.whenIdle = whenIdle; api.finish = finish;
  api.debugBattlers = () => battlers.map(b => ({ uid: b.uid, side: b.side, x: b.home.x + b.off.x, y: b.home.y + b.off.y, offX: b.off.x, anim: b.anim }));
  return api;
})();
/*EOF-STAGE*/
