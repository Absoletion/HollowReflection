/* --------------------------------------------------------------- *
 *  Screen: battle — portrait mobile layout (enemies top on scene art,
 *  party as a bottom portrait row, action bottom-sheet, pull-up log).
 *  All battle LOGIC is unchanged from the tested engine wiring.
 * --------------------------------------------------------------- */
const ESYM = { construct: 'm-construct', construct2: 'm-construct', hound: 'm-hound', ox: 'm-ox', calf: 'm-calf', lowingman: 'm-lowingman', glasswright: 'm-glasswright' };
const BSCENE = { ch1: 'sc-hall', ch2: 'sc-fields', ch3: 'sc-seam', ch6: 'sc-arena' };

function startBattle(key, partyKeys, onEnd) {
  META.stage = key;
  const S = Engine.newBattle(key, partyKeys);
  Stage.init(S, key);
  let selUid = null;         // currently selected party unit
  let pending = null;        // { uid, action } awaiting a target click
  let ended = false;
  let logOpen = false;       // pull-up log sheet state
  const logLines = [];
  const tips = { shown: {}, current: null };

  const NOTES = {
    ch1: 'Tutorial — the constructs are padded. Experiment.',
    ch2: 'Hollowed fauna. Put the herd to rest.',
    ch3: 'SURVIVE — defeat here advances the story.',
    ch6: 'Boss — the scar is loud here.',
  };
  const bigBoss = S.enemies.length === 1 && (key === 'ch6' || S.enemies[0].key === 'glasswright' || S.enemies[0].key === 'lowingman');

  /* ---- tutorial tips (ch1 only): one line, first time each mechanic is live ---- */
  function tipCheck() {
    if (key !== 'ch1') return;
    const t = tips.shown;
    if (!t.start) { t.start = true; tips.current = 'Pick any unit, then an action — one action each, any order. Enemies act after your whole party.'; return; }
    if (t.start && !t.basic && logLines.some(l => /attacks\./.test(l.msg))) { t.basic = true; tips.current = 'Basic attacks are free and bank +1⚡ Energy. ⚡ is per-unit, 3 bars max.'; return; }
    if (t.basic && !t.energy && S.party.some(u => u.energy >= 1)) { t.energy = true; tips.current = '1⚡ lights up Skills (Arts cost 2⚡, Bursts 3⚡). Try Hale’s Cross Slash.'; return; }
    if (t.energy && !t.skill && logLines.some(l => /Cross Slash|Quick Bite|Dampen/.test(l.msg))) { t.skill = true; tips.current = 'Guard is free too: it halves all damage until next round and STILL banks +1⚡.'; return; }
    if (t.skill && !t.guard && S.party.some(u => u.guarding)) { t.guard = true; tips.current = 'Guarding into a big telegraphed hit converts defense into next round’s offense. Remember that.'; return; }
  }

  /* ---- log ---- */
  function pushLog(msg, cls) { logLines.push({ msg, cls }); }
  function consumeEvents(evs) {
    let flash = null;
    for (const e of evs) {
      if (e.t === 'log') pushLog(e.msg, e.cls);
      else if (e.t === 'round') pushLog(`— Round ${e.n} —`, 'rounddiv');
      else if (e.t === 'awakening') flash = 'awaken';
      else if (e.t === 'finale_lock') flash = flash || 'finale';
      else if (e.t === 'finisher') { /* banner handled via S.freeRound */ }
      else if (e.t === 'scripted_loss') flash = 'whiteout';
      else if (e.t === 'result') { /* handled after render */ }
    }
    return flash;
  }

  /* ---- rendering ---- */
  function chipsFor(u) {
    const c = [];
    if (u.guarding) c.push(['🛡 GUARD', 'good']);
    if (u.shieldHits > 0) c.push(['◈ GLASS×' + u.shieldHits, 'shield']);
    if (u.shieldHP > 0) c.push(['⛨ ' + u.shieldHP, 'shield']);
    if (u.cinders > 0) c.push(['CINDER×' + u.cinders, 'bad']);
    if (u.riposte) c.push(['↩ RIPOSTE', 'good']);
    if (u.retaliate) c.push(['♨ RETALIATE', 'good']);
    for (const b of u.buffs) {
      if (b.k === 'atkUp') c.push(['ATK▲', 'good']);
      if (b.k === 'defUp' || b.k === 'dmgCut') c.push(['DEF▲', 'good']);
      if (b.k === 'regen') c.push(['✚ REGEN', 'good']);
      if (b.k === 'taunt') c.push(['TAUNT', 'good']);
      if (b.k === 'atkDown') c.push(['ATK▼', 'bad']);
      if (b.k === 'vuln') c.push(['EXPOSED', 'bad']);
    }
    return `<div class="chips">${c.map(([t, k]) => `<div class="chip ${k}">${t}</div>`).join('')}</div>`;
  }
  function hpBar(u) {
    const pct = Math.max(0, Math.round(100 * u.hp / u.maxhp));
    return `<div class="bar ${pct < 35 ? 'low' : ''}"><i style="width:${pct}%"></i><span>${u.hp}/${u.maxhp}</span></div>`;
  }
  function partyCard(u) {
    const canSelect = !ended && u.alive && !u.acted && !S.lock && !pending;
    const isTarget = pending && (pending.action.target === 'ally' || pending.action.target === 'ally_other') &&
      u.alive && !(pending.action.target === 'ally_other' && (u.uid === pending.uid || u.awakened));
    const gauge = u.awakened
      ? `<div class="blades" title="Hollowglass blades (${u.blades}/7)">${'<div class="shard"></div>'.repeat(u.blades) || ''}</div>`
      : `<div class="pips">${[1, 2, 3].map(i => `<div class="pip ${u.energy >= i ? 'on' : ''}"></div>`).join('')}</div>`;
    const portId = u.key === 'hale' && u.awakened ? 'p-hale-awk' : 'p-' + u.key;
    return `<div class="ucard mini e-${u.awakened ? 'hollow' : u.elem} ${canSelect ? 'selectable' : ''} ${selUid === u.uid ? 'sel' : ''} ${u.acted && u.alive ? 'acted' : ''} ${u.alive ? '' : 'dead'} ${isTarget ? 'targetable' : ''}" data-uid="${u.uid}" data-side="party">
      ${sym(portId, 'port')}
      <div class="uname">${esc(u.name)}${u.awakened ? ' ◈' : ''}</div>
      <div class="usub">${u.role}</div>
      ${hpBar(u)}${gauge}${chipsFor(u)}
    </div>`;
  }
  function enemyCard(en, idx, dupes) {
    const tobinUp = S.party.some(u => u.key === 'tobin' && u.alive);
    const revealed = S.revealRound === S.round;
    let intent = '';
    if (en.alive && !ended) {
      if (revealed) intent = Engine.intentText(S, en);
      else if (tobinUp && en.intent && en.intent.target) {
        const t = Engine.byUid(S, en.intent.target);
        intent = t ? `still water: it watches ${t.name}` : '';
      }
    }
    const name = dupes > 1 ? `${en.name} ${String.fromCharCode(65 + idx)}` : en.name;
    const brk = (en.breakMax > 0 && en.form !== 'man')
      ? `<div class="bar brkbar" title="break bar"><i style="width:${Math.round(100 * en.breakCur / (en.breakMax * Math.pow(1.25, en.staggers) || 1))}%"></i></div>` : '';
    const isTarget = pending && pending.action.target === 'enemy' && en.alive;
    return `<div class="ucard enemy ${bigBoss ? 'big' : ''} e-${en.elem} ${en.alive ? '' : 'dead'} ${isTarget ? 'targetable' : ''}" data-uid="${en.uid}" data-side="enemy">
      ${en.form ? `<div class="formtag">${en.form === 'beast' ? 'THE BEAST' : 'THE MAN'}</div>` : ''}
      ${en.tele > 0 ? `<div class="teletag">▲ STAMPEDE ${en.tele === 1 ? 'NOW' : 'SOON'}</div>` : ''}
      ${en.staggered ? '<div class="stagtag">STAGGERED</div>' : ''}
      ${sym(ESYM[en.key] || 'm-construct', 'eport')}
      <div class="uname">${esc(name)}</div>
      <div class="usub">${Engine.ELEM_ICON[en.elem]} ${en.key === 'glasswright' ? '???' : (en.key.indexOf('construct') === 0 ? 'construct' : 'hollowed')}</div>
      ${en.key === 'glasswright' ? '<div class="bar"><i style="width:100%"></i><span>—</span></div>' : hpBar(en)}
      ${brk}
      ${en.buffs.length ? chipsFor(en) : '<div class="chips"></div>'}
      <div class="intent">${esc(intent)}</div>
    </div>`;
  }
  function actionBar() {
    if (ended) return '<div class="actionbar"><div class="ab-title">…</div></div>';
    const u = selUid ? Engine.byUid(S, selUid) : null;
    if (S.lock === 'bulwark') {
      const hale = Engine.byKey(S, 'hale');
      const acts = Engine.availableActions(S, hale.uid);
      return `<div class="actionbar"><div class="ab-title">Every menu has gone dark except one. <b>Hale</b> — press it.</div>
        <div class="abtns">${acts.map(a => `<button class="abtn glowing" data-uid="${hale.uid}" data-act="${a.id}"><span class="nm">◈ ${a.name}</span><span class="ct blade">the only door</span></button>`).join('')}</div></div>`;
    }
    if (pending) {
      return `<div class="actionbar"><div class="ab-title"><b>${esc(Engine.byUid(S, pending.uid).name)}</b> — ${esc(pending.action.name)}: choose a ${pending.action.target === 'enemy' ? 'target' : 'friendly target'}.</div>
        <div class="abtns"><button class="abtn cancelbtn" data-cancel="1"><span class="nm">Cancel</span></button></div></div>`;
    }
    if (!u || !u.alive || u.acted) {
      const left = Engine.livingParty(S).filter(x => !x.acted).length;
      return `<div class="actionbar"><div class="ab-title">${left ? 'Select a unit to act. (' + left + ' left this round)' : 'The enemy moves…'}</div></div>`;
    }
    const acts = Engine.availableActions(S, u.uid);
    const free = S.freeRound === S.round;
    return `<div class="actionbar">
      <div class="ab-title"><b>${esc(u.name)}</b> ${esc(Engine.UNITS[u.key].epithet || '')} — choose an action.${free ? ' <span style="color:var(--gold)">FINISHER: specials are free.</span>' : ''}</div>
      <div class="abtns">${acts.map(a => {
        const costTxt = a.tier === 'Basic' || a.tier === 'Guard' ? (u.awakened && a.id === 'basic' ? 'forge +1 blade' : 'free · +1⚡')
          : (u.awakened ? `${a.cost} blade${a.cost === 1 ? '' : 's'}` : `${a.cost}⚡ · ${a.tier}`);
        return `<button class="abtn tier-${a.tier}" data-uid="${u.uid}" data-act="${a.id}" ${a.ok ? '' : 'disabled'} title="${esc(a.desc || '')}${a.ok ? '' : ' (' + (a.reason || '') + ')'}">
          <span class="nm">${esc(a.name)}</span><span class="ct ${u.awakened ? 'blade' : ''}">${costTxt}</span></button>`;
      }).join('')}</div></div>`;
  }
  function logTab() {
    const last = logLines.length ? logLines[logLines.length - 1].msg : '…';
    return `<button class="logtab" id="logtab"><span class="tklbl" style="font-size:8.5px; letter-spacing:1.5px; color:var(--hollow); border:1px solid #2c4a46; border-radius:5px; padding:1px 5px;">LOG</span><span class="last">${esc(last)}</span><span class="cnt">▲ ${logLines.length}</span></button>`;
  }
  function logSheet() {
    if (!logOpen) return '';
    return `<div class="logsheet" id="logsheet">
      <div class="lhead"><b>Battle Log</b><button id="logclose">Close ✕</button></div>
      <div class="logpane" id="logpane">${logLines.map(l => `<p class="${l.cls || ''}">${esc(l.msg)}</p>`).join('')}</div>
    </div>`;
  }

  function render() {
    tipCheck();
    const dupes = {};
    S.enemies.forEach(e => dupes[e.name] = (dupes[e.name] || 0) + 1);
    const seen = {};
    app.innerHTML = `
      <div class="bwrap stage-on">
        <div class="bhead">
          <h2>${esc(S.title)}</h2>
          <span class="round">Round ${S.round}</span>
          <span class="note">${NOTES[key] || ''}</span>
        </div>
        <div id="stagehost"></div>
        <div class="bfield">
          <div class="ezone">
            ${sym(BSCENE[key] || 'sc-arena', 'scenebg')}
            <div class="row-enemies">${S.enemies.map(e => { const i = seen[e.name] || 0; seen[e.name] = i + 1; return enemyCard(e, i, dupes[e.name]); }).join('')}</div>
          </div>
          ${tips.current ? `<div class="tipbar">☝ ${esc(tips.current)}</div>` : ''}
          <div class="row-party">${S.party.map(partyCard).join('')}</div>
        </div>
        ${logTab()}
        ${actionBar()}
        ${logSheet()}
      </div>`;
    wire();
    Stage.mount(document.getElementById('stagehost'));
  }

  function autoSelect() {
    if (S.lock === 'bulwark') { selUid = (Engine.byKey(S, 'hale') || {}).uid; return; }
    const cur = selUid && Engine.byUid(S, selUid);
    if (!cur || !cur.alive || cur.acted) {
      const nxt = Engine.livingParty(S).find(x => !x.acted);
      selUid = nxt ? nxt.uid : null;
    }
  }

  function exec(uid, actionId, targetUid) {
    let _tier = null;
    try { _tier = (Engine.availableActions(S, uid).find(a => a.id === actionId) || {}).tier; } catch (e) { console.error(e); }
    try { Stage.snapshot(S); } catch (e) { console.error('stage.snapshot', e); }
    const evs = Engine.playerAct(S, uid, actionId, targetUid);
    const flash = consumeEvents(evs);
    try { Stage.play(evs, S, { uid, actionId, targetUid, tier: _tier }); } catch (e) { console.error('stage.play', e); if (window.__errToast) window.__errToast('visual layer: ' + e.message); }
    pending = null;
    autoSelect();
    render();
    if (flash === 'awaken') {
      const f = document.createElement('div'); f.className = 'awk-flash'; document.body.appendChild(f);
      setTimeout(() => f.remove(), 1600);
      toast('HALE AWAKENS — blades replace his Energy.');
    }
    if (flash === 'whiteout') { return endScripted(); }
    if (S.result === 'victory' && !ended) return endVictory();
    if (S.result === 'defeat' && !ended) return endDefeat();
  }

  function wire() {
    const lt = document.getElementById('logtab'); if (lt) lt.onclick = () => { logOpen = true; render(); };
    const lc = document.getElementById('logclose'); if (lc) lc.onclick = () => { logOpen = false; render(); };
    const lp = document.getElementById('logpane'); if (lp) lp.scrollTop = lp.scrollHeight;
    app.querySelectorAll('.abtn[data-act]').forEach(b => b.onclick = () => {
      const uid = b.dataset.uid, actId = b.dataset.act;
      const acts = Engine.availableActions(S, uid);
      const a = acts.find(x => x.id === actId);
      if (!a || !a.ok) return;
      if (a.target === 'none') return exec(uid, actId, null);
      // auto-target when there's exactly one legal choice
      if (a.target === 'enemy') {
        const en = Engine.livingEnemies(S);
        if (en.length === 1) return exec(uid, actId, en[0].uid);
      } else {
        const allies = Engine.livingParty(S).filter(x => !(a.target === 'ally_other' && (x.uid === uid || x.awakened)));
        if (allies.length === 1) return exec(uid, actId, allies[0].uid);
      }
      pending = { uid, action: a };
      render();
    });
    app.querySelectorAll('.abtn[data-cancel]').forEach(b => b.onclick = () => { pending = null; render(); });
    app.querySelectorAll('.ucard').forEach(c => c.onclick = () => {
      const uid = c.dataset.uid;
      if (pending) {
        if (c.classList.contains('targetable')) exec(pending.uid, pending.action.id, uid);
        return;
      }
      if (c.dataset.side === 'party' && c.classList.contains('selectable')) { selUid = uid; render(); }
    });
  }

  /* ---- endings ---- */
  function endVictory() {
    ended = true;
    setTimeout(() => {
      const ov = document.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = `<div class="ov-card"><h2 style="color:var(--gold)">VICTORY</h2>
        <p>${key === 'ch6' ? 'The field goes quiet. Nothing lows.' : 'The field is yours.'}</p>
        <button id="ovnext" style="margin-top:14px;">Continue</button></div>`;
      document.body.appendChild(ov);
      ov.querySelector('#ovnext').onclick = () => { ov.remove(); onEnd('victory'); };
    }, 650);
  }
  function endDefeat() {
    ended = true;
    setTimeout(() => {
      const ov = document.createElement('div'); ov.className = 'modal';
      ov.innerHTML = `<div class="ov-card"><h2 style="color:var(--warn)">The line breaks.</h2>
        <p>The guild recovers its own. This defeat is yours to retry — nothing is lost.</p>
        <div class="hubrow" style="justify-content:center;">
          <button id="ovretry">Retry (full restore)</button>
          <button id="ovtitle">Return to the Hall</button>
        </div></div>`;
      document.body.appendChild(ov);
      ov.querySelector('#ovretry').onclick = () => { ov.remove(); startBattle(key, partyKeys, onEnd); };
      ov.querySelector('#ovtitle').onclick = () => { ov.remove(); onEnd('defeat'); };
    }, 650);
  }
  function endScripted() {
    ended = true;
    // The fall of Greywick: fade to white. Explicitly NOT a fail state.
    setTimeout(() => {
      const w = document.createElement('div'); w.className = 'whiteout'; document.body.appendChild(w);
      setTimeout(() => {
        const ov = document.createElement('div'); ov.className = 'overlay'; ov.style.zIndex = 95;
        ov.innerHTML = `<div class="ov-card"><h2>Greywick shines.</h2>
          <p>You were not meant to win this. You were meant to live through it.</p>
          <p class="small" style="color:var(--gold)">DEFEAT — and the story moves forward.</p>
          <button id="ovnext" style="margin-top:12px;">Wake up</button></div>`;
        document.body.appendChild(ov);
        ov.querySelector('#ovnext').onclick = () => { ov.remove(); w.remove(); onEnd('scripted_loss'); };
      }, 2400);
    }, 900);
  }

  window.__battle = S; // read-only debug handle for automated playtesting
  window.__start = startBattle; window.__afterCh6 = (typeof afterCh6 !== 'undefined') ? afterCh6 : null; // QA hooks
  pushLog(`— Round 1 — ${S.title}`, 'rounddiv');
  if (key === 'ch3') pushLog('His blades hang in the air like a sentence half-spoken. There are more of them than there is sky.', 'sys');
  autoSelect();
  render();
}

/* --------------------------------------------------------------- *
 *  Self-tests in-browser + boot
 * --------------------------------------------------------------- */
window.runSelfTests = function () {
  const r = runHollowingSelfTests(Engine, (m) => console.log(m));
  console.log(`[Hollow Reflections] self-tests: ${r.pass} passed, ${r.fail} failed`);
  return r;
};

showTitle();
window.__start = startBattle; window.__afterCh6 = afterCh6; // QA hooks (load-time)
})();
/*EOF-UI2*/
