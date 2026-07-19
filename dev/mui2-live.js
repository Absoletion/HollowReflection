/* --------------------------------------------------------------- *
 *  Live battle controller.
 *
 *  Enemies advance continuously. Player Skills use recast timers and
 *  restore role-based Arts; Arts and Bursts spend that gauge.
 *  Hollow Reflections keeps its original growing roster, Break,
 *  and scripted story encounters rather than copying another game's UI.
 * --------------------------------------------------------------- */
const ESYM = { training_dummy: 'm-construct', construct: 'm-construct', construct2: 'm-construct', storehouse_pest:'m-hound', hollow_fragment:'m-glasswright', hound: 'm-hound', ox: 'm-ox', calf: 'm-calf', lowingman: 'm-lowingman', glasswright: 'm-glasswright', ember_warden: 'm-construct', feastkeeper: 'm-ox' };
const BSCENE = { training: 'sc-hall', act1_1: 'sc-hall', act1_2: 'sc-hall', act1_3: 'sc-hall', act1_5: 'sc-hall', act1_6: 'sc-fields', act1_7: 'sc-fields', act1_10: 'sc-hall', ch1: 'sc-hall', ch2: 'sc-fields', ch3: 'sc-seam', ch6: 'sc-arena',
  act2_2:'sc-road',act2_4:'sc-fields',act2_6:'sc-road',act2_7:'sc-road',act3_1:'sc-road',act3_3:'sc-road',act3_5:'sc-road',act3_6:'sc-road',act3_7:'sc-fields',
  act4_1:'sc-fields',act4_2:'sc-fields',act4_3:'sc-fields',act4_4:'sc-fields',act4_5:'sc-seam',act4_6:'sc-seam',act4_7:'sc-seam', challenge_ember:'sc-arena', challenge_feastkeeper:'sc-arena' };

function startBattle(key, partyKeys, onEnd) {
  META.stage = key;
  const S = Engine.newBattle(key, partyKeys, { awakenedHale: !!META.haleAwakened, profiles: META.unitProgress });
  // Legacy encounters were tuned around one action per round. Live combat
  // needs enough field time for recasts, Arts decisions, and telegraphs.
  const liveHpScale = { training: 1, ch1: 2.0, ch2: 2.4, ch3: 1, ch6: 0.85 }[key] || 2.0;
  const liveAtkScale = { training: 0, ch1: 1, ch2: 1.08, ch3: 1, ch6: 1.0 }[key] || 1.1;
  for (const en of S.enemies) {
    en.maxhp = Math.round(en.maxhp * liveHpScale);
    en.hp = en.maxhp;
    en.atk = Math.round(en.atk * liveAtkScale);
  }
  Stage.init(S, key);

  let selectedUid = (S.party.find(u => u.alive) || {}).uid || null;
  let ended = false;
  let paused = false;
  let pauseConfirm = false;
  let animationSpeed = Number(META.settings && META.settings.animationSpeed) || 1;
  let autoSkill = !!(META.settings && META.settings.autoSkill);
  let autoArts = !!(META.settings && META.settings.autoArts);
  let autoBurst = !!(META.settings && META.settings.autoBurst);
  let gesture = null;
  let suppressSelectUntil = 0;
  let autoScanTimer = 0;
  const aiTrace = [];
  let logOpen = false;
  let elapsed = 0;
  let burstUsed = false;
  let lastConsumedEventId = 0;
  const battleId = `${key}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
  let enemyTimer = S.scripted ? 3.2 : 3.8;
  let upkeepTimer = 5;
  let lastFrame = performance.now();
  let renderTimer = 0;
  let rafId = 0;
  const logLines = [];
  const cooldowns = {};
  const tips = { start: false, skill: false, arts: false, guard: false, current: '' };

  S.party.forEach(u => {
    cooldowns[u.uid] = {};
  });

  const NOTES = {
    training: 'PRACTICE · No rewards. Exit when finished.',
    act1_1: 'TUTORIAL · Tap Skill when ready.',
    act1_2: 'TUTORIAL · Build 200 Arts Energy.',
    act1_3: 'TUTORIAL · Reach Burst at 300 Energy.',
    act1_5: 'TUTORIAL · Quest contracts award Gold and experience.',
    act1_6: 'TUTORIAL · Set a four-unit party before multi-target contracts.',
    act1_7: 'TUTORIAL · Hollow is neutral to the elemental wheel. Break it with pressure.',
    act1_10: 'CHAPTER TRIAL · Use Skills, Arts, Burst, Break, and Auto together.',
    ch1: 'LIVE TRAINING · Skills restore Arts.',
    ch2: 'LIVE MISSION · Hollowed fauna ahead.',
    ch3: 'SURVIVE · The Glasswright controls the field.',
    ch6: 'BOSS · Read the telegraph. Break the charge.',
  };

  function pushLog(msg, cls) {
    logLines.push({ msg, cls: cls || '' });
    if (logLines.length > 120) logLines.shift();
  }

  function consumeEvents(evs) {
    let flash = null;
    for (const e of evs) {
      if (e.id && e.id <= lastConsumedEventId) continue;
      if (e.id) lastConsumedEventId = e.id;
      if (e.t === 'log') pushLog(e.msg, e.cls);
      else if (e.t === 'round') pushLog(`— Effect cycle ${e.n} —`, 'rounddiv');
      else if (e.t === 'awakening') flash = 'awaken';
      else if (e.t === 'finale_lock') flash = flash || 'finale';
      else if (e.t === 'scripted_loss') flash = 'whiteout';
    }
    return flash;
  }

  function gaugeValue(u) { return Math.max(0, Math.min(300, Math.round(u.energy * 100))); }
  function pct(n, max) { return Math.max(0, Math.min(100, Math.round(100 * n / Math.max(1, max)))); }
  function fmtTime(n) {
    const m = Math.floor(n / 60), s = Math.floor(n % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  function battleSummary(victory) {
    return { battleId, encounterId: key, seed: S.seed, victory: !!victory, elapsedMs: Math.round(elapsed * 1000), unitsDefeated: S.party.filter(u => !u.alive).length, breakCount: S.enemies.reduce((n, e) => n + (e.staggers || 0), 0), burstUsed, eventHash: Engine.combatEventHash(S) };
  }
  function actionCooldown(u, a) {
    if (a.id === 'guard') return 5;
    if (a.id === 'cross_slash') return 8;
    if (a.tier !== 'Skill') return 0;
    if (u.role === 'Supporter') return 5.4;
    if (u.role === 'Healer') return 5.8;
    if (u.role === 'Breaker') return 6.2;
    return 5.6;
  }
  function cdLeft(uid, id) { return Math.max(0, (cooldowns[uid] || {})[id] || 0); }
  function actionsFor(u) { return Engine.availableLiveActions(S, u.uid); }
  function targetFor(u, a) {
    if (a.target === 'none') return null;
    if (a.target === 'enemy') {
      const targets = Engine.livingEnemies(S).slice().sort((x, y) => (x.hp / x.maxhp) - (y.hp / y.maxhp));
      return (targets[0] || {}).uid || null;
    }
    let allies = Engine.livingParty(S).filter(x => !(a.target === 'ally_other' && (x.uid === u.uid || x.awakened)));
    if (a.target === 'ally_other') allies.sort((x, y) => x.energy - y.energy);
    else allies.sort((x, y) => (x.hp / x.maxhp) - (y.hp / y.maxhp));
    return (allies[0] || u).uid;
  }

  function chipsFor(u) {
    const c = [];
    if (u.guarding) c.push(['GUARD', 'good']);
    if (u.guardedBy) c.push(['GUARDED', 'good']);
    if (S.party.some(x => x.guardedBy === u.uid)) c.push(['COVER', 'good']);
    if (u.shieldHits > 0) c.push(['GLASS×' + u.shieldHits, 'shield']);
    if (u.shieldHP > 0) c.push(['SHIELD ' + u.shieldHP, 'shield']);
    if (u.cinders > 0) c.push(['CINDER×' + u.cinders, 'bad']);
    if (u.riposte) c.push(['RIPOSTE', 'good']);
    if (u.retaliate) c.push(['RETALIATE', 'good']);
    for (const b of u.buffs || []) {
      if (b.k === 'atkUp') c.push(['ATK↑', 'good']);
      if (b.k === 'defUp' || b.k === 'dmgCut') c.push(['DEF↑', 'good']);
      if (b.k === 'regen') c.push(['REGEN', 'good']);
      if (b.k === 'taunt') c.push(['TAUNT', 'good']);
      if (b.k === 'atkDown') c.push(['ATK↓', 'bad']);
      if (b.k === 'vuln') c.push(['EXPOSED', 'bad']);
      if (b.k === 'breakVuln') c.push(['BREAK WEAK', 'bad']);
      if (b.k === 'radiationExposure') c.push(['RADIATION', 'bad']);
    }
    return `<div class="chips">${c.slice(0, 4).map(([t, k]) => `<div class="chip ${k}">${t}</div>`).join('')}</div>`;
  }
  function hpBar(u) {
    const p = pct(u.hp, u.maxhp);
    return `<div class="bar ${p < 35 ? 'low' : ''}" data-hp="${u.uid}"><i style="width:${p}%"></i><span>${u.hp}/${u.maxhp}</span></div>`;
  }
  function artsBar(u) {
    const gauge = gaugeValue(u);
    return `<div class="artsbar" data-arts="${u.uid}"><i style="width:${gauge / 3}%"></i><span>ARTS ${gauge}/300</span><b class="mark m1"></b><b class="mark m2"></b></div>`;
  }
  function quickSkill(u) {
    const skill = actionsFor(u).find(a => a.tier === 'Skill');
    if (!skill) return '<div class="quickskill none">NO SKILL</div>';
    const cd = cdLeft(u.uid, skill.id);
    const ready = cd <= 0 && skill.ok && u.alive && !S.lock && !paused;
    const max = actionCooldown(u, skill) || 1;
    const fill = ready ? 100 : pct(max - cd, max);
    return `<button type="button" class="quickskill ${ready ? 'ready' : ''}" data-quick="${u.uid}" data-act="${skill.id}" ${ready ? '' : 'disabled'} style="--charge:${fill}%">
      <span>${ready ? 'SKILL' : cd.toFixed(1) + 's'}</span><small>${esc(skill.name)}</small></button>`;
  }
  function formBadges(u) {
    const actions = actionsFor(u);
    const badge = (tier, arrow) => {
      const a = actions.find(x => x.tier === tier);
      const ready = !!(a && a.ok && u.alive && !S.lock);
      return `<span class="formbadge ${ready ? 'ready' : ''} ${a ? '' : 'none'}" data-form-badge="${u.uid}" data-tier="${tier}">${arrow} ${tier.toUpperCase()}${ready ? ' READY' : ''}</span>`;
    };
    return `<div class="formbadges">${badge('Art', '↑')}${badge('Burst', '⇈')}</div>`;
  }
  function tierControls(u) {
    const actions = actionsFor(u);
    return `<div class="tiercontrols">${['Art', 'Burst'].map(tier => {
      const a = actions.find(x => x.tier === tier);
      if (!a) return `<button type="button" class="tieruse tier-${tier} none" disabled><span>${tier}</span><small>—</small></button>`;
      const ready = a.ok && u.alive && !S.lock && !paused;
      const cost = `${a.cost * 100} Arts`;
      return `<button type="button" class="tieruse tier-${tier} ${ready ? 'ready' : ''}" data-tier-use="${u.uid}" data-act="${a.id}" ${ready ? '' : 'disabled'}><span>${tier}</span><small>${ready ? 'READY' : cost}</small></button>`;
    }).join('')}</div>`;
  }
  function partyCard(u) {
    const portrait = typeof unitIconHTML === 'function'
      ? unitIconHTML(u.key, u.key === 'hale' && u.awakened)
      : sym(u.key === 'hale' && u.awakened ? 'p-hale-awk' : 'p-' + u.key, 'port');
    return `<section class="liveunit e-${u.awakened ? 'hollow' : u.elem} ${u.key === 'hale' && u.awakened ? 'hale-awakened' : ''} ${selectedUid === u.uid ? 'sel' : ''} ${u.alive ? '' : 'dead'}" data-unit="${u.uid}">
      <button type="button" class="unitpick" data-select="${u.uid}" aria-label="Select ${esc(u.name)} commands; swipe up for Art or Burst" aria-pressed="${selectedUid === u.uid}">
        ${portrait}
        <div class="liveunit-copy"><div class="uname">${esc(u.name)}${u.awakened ? ' ◈' : ''}</div>${hpBar(u)}${artsBar(u)}${formBadges(u)}${chipsFor(u)}</div>
      </button>
      <div class="gesturecue" data-gesture-cue="${u.uid}" aria-hidden="true"></div>
      ${quickSkill(u)}
      ${tierControls(u)}
    </section>`;
  }
  function enemyCard(en, idx, duplicates) {
    const name = duplicates > 1 ? `${en.name} ${String.fromCharCode(65 + idx)}` : en.name;
    const breakMax = en.breakMax * Math.pow(1.25, en.staggers || 0);
    const breakBar = en.breakMax > 0 && en.form !== 'man'
      ? `<div class="bar brkbar"><i style="width:${pct(en.breakCur, breakMax)}%"></i><span>BREAK</span></div>` : '';
    const intent = en.alive && en.intent && Engine.canReadIntents(S) ? Engine.intentText(S, en) : '';
    return `<section class="ucard enemy ${S.enemies.length === 1 ? 'big' : ''} e-${en.elem} ${en.alive ? '' : 'dead'}">
      ${en.form ? `<div class="formtag">${en.form === 'beast' ? 'THE BEAST' : 'THE MAN'}</div>` : ''}
      ${en.tele > 0 ? `<div class="teletag">STAMPede ${en.tele === 1 ? 'NOW' : 'SOON'}</div>` : ''}
      ${en.staggered ? '<div class="stagtag">STAGGERED</div>' : ''}
      ${sym(ESYM[en.key] || 'm-construct', 'eport')}
      <div class="uname">${esc(name)}</div><div class="usub">${Engine.ELEM_ICON[en.elem]} ${en.key === 'glasswright' ? '???' : 'HOLLOWED'}</div>
      ${en.key === 'glasswright' ? '<div class="bar"><i style="width:100%"></i><span>—</span></div>' : hpBar(en)}${breakBar}${chipsFor(en)}
      <div class="intent">${esc(intent)}</div>
    </section>`;
  }

  function tutorialTip() {
    if (key !== 'ch1' && !key.startsWith('act1_')) return '';
    if (!tips.start) { tips.start = true; tips.current = 'Tap Skill to use it. Swipe a unit upward to Art; drag farther to Burst. AUTO uses Skills only.'; }
    else if (!tips.skill && logLines.some(l => /Cross Slash|Flash-Fry|Diagnostic Crush|Dampen/.test(l.msg))) { tips.skill = true; tips.current = 'Skill Arts gain varies by role. Supporters restore the most; Breakers trade gauge gain for Break power.'; }
    else if (!tips.arts && S.party.some(u => u.energy >= 2)) { tips.arts = true; tips.current = 'ART READY: swipe up and release in the Art zone. At 300, drag farther into the Burst zone.'; }
    else if (!tips.guard && S.party.some(u => u.guardedBy)) { tips.guard = true; tips.current = 'GUARDED: a Defender intercepts incoming damage for that ally while the protection remains active.'; }
    return tips.current ? `<div class="tipbar">${esc(tips.current)}</div>` : '';
  }

  function commandTray() {
    const u = Engine.byUid(S, selectedUid) || Engine.livingParty(S)[0];
    if (!u || ended) return '<div class="actionbar hr-kit-panel livecommands"><div class="ab-title">Battle resolved.</div></div>';
    if (S.lock === 'bulwark') {
      const hale = Engine.byKey(S, 'hale');
      return `<div class="actionbar hr-kit-panel livecommands finale-command"><div class="ab-title">Every command has gone dark except one.</div>
        <button class="abtn glowing" data-live="${hale.uid}" data-act="glass_bulwark"><span class="nm">◈ GLASS BULWARK</span><span class="ct blade">THE ONLY DOOR</span></button></div>`;
    }
    const actions = actionsFor(u);
    return `<div class="actionbar hr-kit-panel livecommands">
      <div class="command-head"><div><b>${esc(u.name)}</b><span data-command-gauge>${gaugeValue(u)}/300 Arts</span></div><small>AUTO ${[autoSkill && 'S', autoArts && 'A', autoBurst && 'B'].filter(Boolean).join('/') || 'OFF'}</small></div>
      <div class="live-action-grid">${actions.map(a => {
        const cd = cdLeft(u.uid, a.id);
        const ready = a.ok && cd <= 0 && u.alive && !paused;
        return `<button class="abtn tier-${a.tier} ${ready ? 'ready' : ''}" data-live="${u.uid}" data-act="${a.id}" ${ready ? '' : 'disabled'}>
          <span class="nm">${esc(a.name)}</span><span class="ct">${esc(actionMeta(u, a, cd))}</span></button>`;
      }).join('')}</div></div>`;
  }

  function actionMeta(u, a, cd) {
    if (cd > 0) return `${cd.toFixed(1)}s`;
    if (!a.ok) return `${a.cost * 100} Arts required`;
    if (a.tier === 'Skill') return `READY - +${Math.round(Engine.liveSkillGain(u) * 100)} Arts`;
    if (a.id === 'guard') return 'READY · timed stance';
    return `${a.cost * 100} Arts`;
  }
  function logTab() {
    const last = logLines.length ? logLines[logLines.length - 1].msg : 'The field is moving.';
    return `<button class="logtab" id="logtab"><span class="tklbl">LOG</span><span class="last">${esc(last)}</span><span class="cnt">▲ ${logLines.length}</span></button>`;
  }
  function logSheet() {
    if (!logOpen) return '';
    return `<div class="logsheet" id="logsheet"><div class="lhead"><b>Battle Log</b><button id="logclose">Close</button></div>
      <div class="logpane" id="logpane">${logLines.map(l => `<p class="${l.cls}">${esc(l.msg)}</p>`).join('')}</div></div>`;
  }
  function trainingTools() {
    if (key !== 'training') return '';
    return `<div class="training-tools" aria-label="Training controls"><b>LAB</b><button data-training="gauge">Fill Gauge</button><button data-training="cooldowns">Reset Cooldowns</button><button data-training="party">Restore Party</button><button data-training="dummy">Reset Dummy</button></div>`;
  }
  function pauseSheet() {
    if (!paused) return '';
    return `<div class="battlepause" role="dialog" aria-modal="true" aria-labelledby="pause-title"><div class="ov-card">
      <h2 id="pause-title">${pauseConfirm ? 'Exit Battle?' : 'Battle Paused'}</h2>
      <p>${pauseConfirm ? 'Current battle progress will be lost. No rewards will be granted.' : 'Combat and visual effects are stopped.'}</p>
      <div class="pauseactions">${pauseConfirm
        ? '<button id="cancelbattleexit">Go Back</button><button id="confirmbattleexit" class="danger">Exit Battle</button>'
        : '<button id="continuebattle">Continue</button><button id="requestbattleexit" class="danger">Exit Battle</button>'}</div>
    </div></div>`;
  }

  function render() {
    const duplicates = {};
    S.enemies.forEach(e => duplicates[e.name] = (duplicates[e.name] || 0) + 1);
    const seen = {};
    app.innerHTML = `<div class="bwrap stage-on livebattle ${paused ? 'paused' : ''}">
      <div class="bhead livehead"><div><h2>${esc(S.title)}</h2><span class="liveflag">LIVE</span><span class="round" data-elapsed>${fmtTime(elapsed)}</span></div>
        <span class="note">${NOTES[key]}</span><div class="automodes" aria-label="Automatic ability modes"><b>AUTO</b><button id="autobattle" class="autobtn ${autoSkill ? 'on' : ''}" aria-pressed="${autoSkill}" title="Automatically use ready Skills">S</button><button id="autoarts" class="autobtn art ${autoArts ? 'on' : ''}" aria-pressed="${autoArts}" title="Automatically use Arts at 200 Energy">A</button><button id="autoburst" class="autobtn burst ${autoBurst ? 'on' : ''}" aria-pressed="${autoBurst}" title="Automatically use Bursts at 300 Energy">B</button></div><button id="pausebattle" aria-pressed="${paused}">Pause</button><button id="speedbattle" title="Visual animation playback speed">ANIM ${animationSpeed}×</button></div>
      <div id="stagehost"></div>
      <div class="bfield"><div class="ezone">${sym(BSCENE[key] || 'sc-arena', 'scenebg')}
        <div class="row-enemies">${S.enemies.map(e => { const i = seen[e.name] || 0; seen[e.name] = i + 1; return enemyCard(e, i, duplicates[e.name]); }).join('')}</div></div>
        ${tutorialTip()}${trainingTools()}<div class="live-party">${S.party.map(partyCard).join('')}</div></div>
      ${logTab()}${commandTray()}${logSheet()}${pauseSheet()}</div>`;
    wire();
    Stage.mount(document.getElementById('stagehost'));
    Stage.paused = paused;
    Stage.playbackRate = animationSpeed;
  }

  function refreshHud() {
    const time = document.querySelector('[data-elapsed]'); if (time) time.textContent = fmtTime(elapsed);
    app.querySelectorAll('[data-hp]').forEach(bar => {
      const u = Engine.byUid(S, bar.dataset.hp); if (!u) return;
      const p = pct(u.hp, u.maxhp); bar.classList.toggle('low', p < 35);
      const fill = bar.querySelector('i'); if (fill) fill.style.width = p + '%';
      const label = bar.querySelector('span'); if (label) label.textContent = `${u.hp}/${u.maxhp}`;
    });
    app.querySelectorAll('[data-arts]').forEach(bar => {
      const u = Engine.byUid(S, bar.dataset.arts); if (!u) return;
      const gauge = gaugeValue(u); const fill = bar.querySelector('i'); if (fill) fill.style.width = (gauge / 3) + '%';
      const label = bar.querySelector('span'); if (label) label.textContent = `ARTS ${gauge}/300`;
    });
    app.querySelectorAll('[data-form-badge]').forEach(badge => {
      const u = Engine.byUid(S, badge.dataset.formBadge); if (!u) return;
      const tier = badge.dataset.tier;
      const a = actionsFor(u).find(x => x.tier === tier);
      const ready = !!(a && a.ok && u.alive && !S.lock);
      badge.classList.toggle('ready', ready); badge.classList.toggle('none', !a);
      badge.textContent = `${tier === 'Art' ? '↑' : '⇈'} ${tier.toUpperCase()}${ready ? ' READY' : ''}`;
    });
    app.querySelectorAll('[data-quick]').forEach(button => {
      const u = Engine.byUid(S, button.dataset.quick); if (!u) return;
      const a = actionsFor(u).find(x => x.id === button.dataset.act); if (!a) return;
      const cd = cdLeft(u.uid, a.id), ready = cd <= 0 && a.ok && u.alive && !S.lock && !paused;
      const max = actionCooldown(u, a) || 1;
      button.disabled = !ready; button.classList.toggle('ready', ready);
      button.style.setProperty('--charge', (ready ? 100 : pct(max - cd, max)) + '%');
      const top = button.querySelector('span'); if (top) top.textContent = ready ? 'SKILL' : cd.toFixed(1) + 's';
    });
    app.querySelectorAll('[data-live]').forEach(button => {
      const u = Engine.byUid(S, button.dataset.live); if (!u) return;
      const a = actionsFor(u).find(x => x.id === button.dataset.act); if (!a) return;
      const cd = cdLeft(u.uid, a.id), ready = a.ok && cd <= 0 && u.alive && !paused;
      button.disabled = !ready; button.classList.toggle('ready', ready);
      const meta = button.querySelector('.ct'); if (meta) meta.textContent = actionMeta(u, a, cd);
    });
    app.querySelectorAll('[data-tier-use]').forEach(button => {
      const u = Engine.byUid(S, button.dataset.tierUse); if (!u) return;
      const a = actionsFor(u).find(x => x.id === button.dataset.act); if (!a) return;
      const ready = a.ok && u.alive && !S.lock && !paused;
      button.disabled = !ready; button.classList.toggle('ready', ready);
      const meta = button.querySelector('small');
      if (meta) meta.textContent = ready ? 'READY' : `${a.cost * 100} Arts`;
    });
    const selected = Engine.byUid(S, selectedUid); const cg = document.querySelector('[data-command-gauge]');
    if (selected && cg) cg.textContent = `${gaugeValue(selected)}/300 Arts`;
  }

  function animateEvents(evs, context) {
    if (!evs.length) return;
    try { Stage.play(evs, S, context || {}); } catch (e) { console.error('stage.play', e); }
    const flash = consumeEvents(evs);
    if (flash === 'awaken') {
      const starredUp = typeof grantHaleStoryEvolution === 'function' && grantHaleStoryEvolution();
      const f = document.createElement('div'); f.className = 'awk-flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
      toast(starredUp ? 'HALE AWAKENS - 5-star form and true kit permanently unlocked.' : 'HALE AWAKENS - his Arts gauge surges to full.');
      setTimeout(() => { if (!ended) render(); }, 0);
    }
    if (flash === 'finale') setTimeout(() => { if (!ended) render(); }, 0);
    const afterStage = Stage.whenIdle ? Stage.whenIdle() : Promise.resolve();
    if (flash === 'whiteout') afterStage.then(() => { if (!ended) endScripted(); });
    else if (S.result === 'victory' && !ended) afterStage.then(() => { if (!ended) endVictory(); });
    else if (S.result === 'defeat' && !ended) afterStage.then(() => { if (!ended) endDefeat(); });
  }
  function execute(uid, actionId, quiet) {
    if (ended || paused) return;
    const u = Engine.byUid(S, uid);
    if (!u || !u.alive) return;
    const a = actionsFor(u).find(x => x.id === actionId);
    if (!a || !a.ok || cdLeft(uid, actionId) > 0) return;
    if (a.tier === 'Burst') burstUsed = true;
    const targetUid = targetFor(u, a);
    try { Stage.snapshot(S); } catch (e) { console.error('stage.snapshot', e); }
    S.battleTimeMs = Math.round(elapsed * 1000);
    const evs = Engine.liveAct(S, uid, actionId, targetUid);
    const cd = actionCooldown(u, a);
    if (cd > 0) cooldowns[uid][actionId] = cd;
    animateEvents(evs, { uid, actionId, targetUid, tier: a.tier });
    if (!quiet) render();
  }
  function enemyPulse() {
    if (ended || paused || S.lock) return;
    const enemies = Engine.livingEnemies(S);
    if (!enemies.length) return;
    const shapeBefore = S.enemies.map(e => `${e.uid}:${e.tele}:${e.form}:${e.alive}`).join('|');
    try { Stage.snapshot(S); } catch (e) { console.error(e); }
    S.battleTimeMs = Math.round(elapsed * 1000);
    const evs = Engine.liveEnemyPhase(S);
    animateEvents(evs, { uid: enemies[0].uid, actionId: 'enemy_phase', tier: 'Enemy' });
    const shapeAfter = S.enemies.map(e => `${e.uid}:${e.tele}:${e.form}:${e.alive}`).join('|');
    if (!ended && shapeAfter !== shapeBefore) render(); else refreshHud();
  }
  function upkeepPulse() {
    if (ended || paused || S.lock) return;
    S.battleTimeMs = Math.round(elapsed * 1000);
    const evs = Engine.liveUpkeep(S);
    animateEvents(evs, { actionId: 'upkeep', tier: 'System' });
    if (!ended) refreshHud();
  }

  function clearGesture() {
    if (!gesture) return;
    const cue = app.querySelector(`[data-gesture-cue="${gesture.uid}"]`);
    if (cue) { cue.className = 'gesturecue'; cue.textContent = ''; }
    if (gesture.button) gesture.button.classList.remove('dragging');
    gesture = null;
  }
  function gestureTier(dy) {
    return Engine.liveGestureTier(dy);
  }
  function updateGesture(y) {
    if (!gesture) return;
    const dy = gesture.startY - y;
    const tier = gestureTier(dy);
    gesture.dy = dy; gesture.tier = tier;
    const cue = app.querySelector(`[data-gesture-cue="${gesture.uid}"]`);
    if (!cue) return;
    if (!tier) { cue.className = 'gesturecue show'; cue.textContent = 'SWIPE ↑ ART  ·  FARTHER ⇈ BURST'; return; }
    const u = Engine.byUid(S, gesture.uid);
    const a = u && actionsFor(u).find(x => x.tier === tier);
    const ready = !!(a && a.ok && cdLeft(u.uid, a.id) <= 0 && !paused && !S.lock);
    cue.className = `gesturecue show ${tier.toLowerCase()} ${ready ? 'ready' : 'locked'}`;
    if (!a) cue.textContent = `NO ${tier.toUpperCase()} ON THIS FORM`;
    else if (!ready) cue.textContent = `${tier.toUpperCase()} - ${a.cost * 100} ARTS REQUIRED`;
    else cue.textContent = `RELEASE · ${tier.toUpperCase()} · ${a.name}`;
  }
  function finishGesture(e) {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    const g = gesture;
    updateGesture(e.clientY);
    const u = Engine.byUid(S, g.uid);
    const a = u && g.tier && actionsFor(u).find(x => x.tier === g.tier);
    const ready = !!(a && a.ok && cdLeft(u.uid, a.id) <= 0 && !paused && !S.lock);
    if (Math.abs(g.dy || 0) > 8) { suppressSelectUntil = performance.now() + 450; e.preventDefault(); }
    clearGesture();
    if (ready) execute(u.uid, a.id);
  }
  function wireGesture(button) {
    button.onpointerdown = e => {
      if (ended || paused || S.lock || e.button > 0) return;
      const u = Engine.byUid(S, button.dataset.select); if (!u || !u.alive) return;
      gesture = { uid: u.uid, pointerId: e.pointerId, startY: e.clientY, dy: 0, tier: null, button };
      button.classList.add('dragging');
      try { button.setPointerCapture(e.pointerId); } catch (ignore) {}
      updateGesture(e.clientY);
    };
    button.onpointermove = e => { if (gesture && e.pointerId === gesture.pointerId) { updateGesture(e.clientY); if (Math.abs(gesture.dy) > 8) e.preventDefault(); } };
    button.onpointerup = finishGesture;
    button.onpointercancel = () => clearGesture();
  }
  function autoUseReadyAbilities() {
    if ((!autoSkill && !autoArts && !autoBurst) || gesture || ended || paused || S.lock) return;
    for (const u of Engine.livingParty(S)) {
      const preset = (META.unitAI[u.key] || {}).preset || 'balanced';
      const decision = Engine.chooseLiveAIAction(S, u.uid, {
        preset, allowSkill: autoSkill, allowArts: autoArts, allowBurst: autoBurst,
        elapsedMs: Math.round(elapsed * 1000), cooldownReady: action => cdLeft(u.uid, action.id) <= 0,
      });
      const action = decision.actionId && actionsFor(u).find(a => a.id === decision.actionId);
      const targetUid = action ? targetFor(u, action) : null;
      aiTrace.push({ battleTimeMs: Math.round(elapsed * 1000), unitId: u.uid, unitKey: u.key, preset, selected: decision.actionId, targetUid, candidates: decision.trace });
      if (aiTrace.length > 80) aiTrace.shift();
      if (decision.actionId) execute(u.uid, decision.actionId, true);
      if (ended || S.lock) break;
    }
  }

  function wire() {
    const pause = document.getElementById('pausebattle');
    if (pause) pause.onclick = () => { paused = true; pauseConfirm = false; lastFrame = performance.now(); render(); };
    const speedBtn = document.getElementById('speedbattle');
    if (speedBtn) speedBtn.onclick = () => {
      const rates = [0.5, 0.75, 1, 1.5];
      animationSpeed = rates[(rates.indexOf(animationSpeed) + 1) % rates.length];
      META.settings.animationSpeed = animationSpeed;
      writeSave(true); Stage.playbackRate = animationSpeed; render();
    };
    const autoBtn = document.getElementById('autobattle');
    if (autoBtn) autoBtn.onclick = () => { autoSkill = !autoSkill; META.settings.autoSkill = autoSkill; writeSave(true); render(); };
    const autoArtsBtn = document.getElementById('autoarts');
    if (autoArtsBtn) autoArtsBtn.onclick = () => { autoArts = !autoArts; META.settings.autoArts = autoArts; writeSave(true); render(); };
    const autoBurstBtn = document.getElementById('autoburst');
    if (autoBurstBtn) autoBurstBtn.onclick = () => { autoBurst = !autoBurst; META.settings.autoBurst = autoBurst; writeSave(true); render(); };
    app.querySelectorAll('[data-select]').forEach(button => { wireGesture(button); button.onclick = () => {
      if (performance.now() < suppressSelectUntil) return;
      const u = Engine.byUid(S, button.dataset.select);
      if (u && u.alive) { selectedUid = u.uid; render(); }
    }; });
    app.querySelectorAll('[data-quick]').forEach(b => b.onclick = e => { e.stopPropagation(); execute(b.dataset.quick, b.dataset.act); });
    app.querySelectorAll('[data-tier-use]').forEach(b => b.onclick = e => { e.stopPropagation(); execute(b.dataset.tierUse, b.dataset.act); });
    app.querySelectorAll('[data-live]').forEach(b => b.onclick = () => execute(b.dataset.live, b.dataset.act));
    app.querySelectorAll('[data-training]').forEach(b => b.onclick = () => {
      const command = b.dataset.training;
      if (command === 'gauge') S.party.forEach(u => { u.energy = 3; });
      if (command === 'cooldowns') Object.values(cooldowns).forEach(map => Object.keys(map).forEach(id => map[id] = 0));
      if (command === 'party') S.party.forEach(u => { u.hp = u.maxhp; u.alive = true; u.shieldHP = u.key === 'katie' ? 70 : 0; });
      if (command === 'dummy') S.enemies.forEach(en => { en.hp = en.maxhp; en.alive = true; en.breakCur = en.breakMax; en.staggered = false; });
      pushLog(`Training control: ${command}.`, 'sys'); render();
    });
    const cont = document.getElementById('continuebattle'); if (cont) cont.onclick = () => { paused = false; pauseConfirm = false; lastFrame = performance.now(); render(); };
    const requestExit = document.getElementById('requestbattleexit'); if (requestExit) requestExit.onclick = () => { pauseConfirm = true; render(); };
    const cancelExit = document.getElementById('cancelbattleexit'); if (cancelExit) cancelExit.onclick = () => { pauseConfirm = false; render(); };
    const confirmExit = document.getElementById('confirmbattleexit'); if (confirmExit) confirmExit.onclick = () => { ended = true; stopLoop(); onEnd('exit', battleSummary(false)); };
    const lt = document.getElementById('logtab'); if (lt) lt.onclick = () => { logOpen = true; render(); };
    const lc = document.getElementById('logclose'); if (lc) lc.onclick = () => { logOpen = false; render(); };
    const lp = document.getElementById('logpane'); if (lp) lp.scrollTop = lp.scrollHeight;
  }

  function tick(now) {
    if (ended) return;
    const raw = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    const dt = paused ? 0 : raw;
    if (dt > 0) {
      elapsed += dt;
      S.battleTimeMs = Math.round(elapsed * 1000);
      if (!S.lock) {
        for (const uid of Object.keys(cooldowns)) {
          for (const id of Object.keys(cooldowns[uid])) cooldowns[uid][id] = Math.max(0, cooldowns[uid][id] - dt);
        }
        autoScanTimer -= dt;
        if (autoScanTimer <= 0) { autoUseReadyAbilities(); autoScanTimer = 0.12; }
        enemyTimer -= dt;
        if (enemyTimer <= 0) { enemyPulse(); enemyTimer = key === 'ch6' ? 3.25 : 3.7; }
        upkeepTimer -= dt;
        if (upkeepTimer <= 0) { upkeepPulse(); upkeepTimer = 5; }
      }
      renderTimer -= dt;
      if (renderTimer <= 0 && !ended) { refreshHud(); renderTimer = 0.12; }
    }
    rafId = requestAnimationFrame(tick);
  }

  function handleVisibility() {
    if (document.hidden && !ended && !paused) { paused = true; pauseConfirm = false; render(); }
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId); rafId = 0;
    document.removeEventListener('visibilitychange', handleVisibility);
  }
  function endVictory() {
    ended = true; stopLoop();
    if (Stage.finish) Stage.finish('victory');
    setTimeout(() => {
      const ov = document.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = `<div class="ov-card"><h2 style="color:var(--gold)">VICTORY</h2><p>${key === 'ch6' ? 'The field goes quiet. Nothing lows.' : 'The field is yours.'}</p><button id="ovnext">Continue</button></div>`;
      document.body.appendChild(ov); ov.querySelector('#ovnext').onclick = () => { ov.remove(); onEnd('victory', battleSummary(true)); };
    }, 1500);
  }
  function endDefeat() {
    ended = true; stopLoop();
    setTimeout(() => {
      const ov = document.createElement('div'); ov.className = 'modal';
      ov.innerHTML = `<div class="ov-card"><h2 style="color:var(--warn)">The line breaks.</h2><p>The guild recovers its own. Nothing is lost.</p><div class="hubrow"><button id="ovretry">Retry</button><button id="ovtitle">Guild Hall</button></div></div>`;
      document.body.appendChild(ov);
      ov.querySelector('#ovretry').onclick = () => { ov.remove(); startBattle(key, partyKeys, onEnd); };
      ov.querySelector('#ovtitle').onclick = () => { ov.remove(); onEnd('defeat', battleSummary(false)); };
    }, 120);
  }
  function endScripted() {
    if (ended) return;
    ended = true; stopLoop();
    const w = document.createElement('div'); w.className = 'whiteout'; document.body.appendChild(w);
    setTimeout(() => {
      const ov = document.createElement('div'); ov.className = 'overlay'; ov.style.zIndex = 95;
      ov.innerHTML = `<div class="ov-card"><h2>Greywick shines.</h2><p>You were not meant to win this. You were meant to live through it.</p><button id="ovnext">Wake up</button></div>`;
      document.body.appendChild(ov); ov.querySelector('#ovnext').onclick = () => { ov.remove(); w.remove(); onEnd('scripted_loss', battleSummary(false)); };
    }, 1700);
  }

  window.__battle = S;
  window.__liveBattle = {
    pause: v => { paused = !!v; pauseConfirm = false; render(); }, use: execute, state: S,
    autoSkill: v => { autoSkill = !!v; META.settings.autoSkill = autoSkill; writeSave(true); render(); },
    autoArts: v => { autoArts = !!v; META.settings.autoArts = autoArts; writeSave(true); render(); },
    autoBurst: v => { autoBurst = !!v; META.settings.autoBurst = autoBurst; writeSave(true); render(); },
    isAutoSkill: () => autoSkill,
    aiTrace: () => aiTrace.slice(),
    gestureTier: Engine.liveGestureTier,
  };
  window.__start = startBattle;
  window.__afterCh6 = (typeof afterCh6 !== 'undefined') ? afterCh6 : null;
  pushLog(`— LIVE ENGAGEMENT: ${S.title} —`, 'rounddiv');
  if (key === 'ch3') pushLog('His blades hang in the air like a sentence half-spoken.', 'sys');
  render();
  document.addEventListener('visibilitychange', handleVisibility);
  rafId = requestAnimationFrame(tick);
}

window.runSelfTests = function () {
  const r = runHollowingSelfTests(Engine, m => console.log(m));
  console.log(`[Hollow Reflections] self-tests: ${r.pass} passed, ${r.fail} failed`);
  return r;
};

showTitle();
window.__start = startBattle;
window.__afterCh6 = afterCh6;
})();
/*EOF-UI2-LIVE*/
