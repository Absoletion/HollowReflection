/* ============================================================================
   UI LAYER — screens, story, meta-progression. The engine above is pure;
   everything DOM-flavored lives below.
   ============================================================================ */
(function () {
'use strict';

const app = document.getElementById('app');
const META = {
  sigils: 0,
  ranks: {},                       // cosmetic Glass Ranks from summons (duplicate-safe)
  owned: ['hale', 'cinnia', 'tobin'],
  devClicks: 0,
  stage: 'title',
};
const ROSTER_ORDER = ['hale', 'cinnia', 'tobin', 'marlowe', 'brant', 'nix', 'brigga', 'hearthgar', 'milla'];

function esc(x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function toast(msg, ms) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms || 2600);
}
function sigilHTML() { return `<span class="sigil-count">◈ ${META.sigils} Guild Sigils</span>`; }
function awardSigils(n, why) {
  META.sigils += n;
  toast(`+${n} Guild Sigils — ${why}`);
}

/* --------------------------------------------------------------- *
 *  The hidden dev console (canon): the version number, clicked 7x.
 * --------------------------------------------------------------- */
document.getElementById('version').addEventListener('click', () => {
  if (++META.devClicks === 7) {
    META.devClicks = 0;
    META.sigils += 9999;
    toast('The seam in the menu was always there.'); // plain toast — no styling
    const s = document.querySelector('.sigil-count'); if (s) s.textContent = `◈ ${META.sigils} Guild Sigils`;
  }
});

/* --------------------------------------------------------------- *
 *  Story text (terse, per the docs' tone)
 * --------------------------------------------------------------- */
const STORY = {
  ch1: [
    { ch: 'Chapter One — The Guild Charter' },
    { sp: '', tx: 'Vessia’s capital. The guild hall smells of ink and stew.' },
    { sp: 'Guildmaster', tx: '“Sign here. The crown pays you to read the blight reports nobody else will.”' },
    { sp: 'Cinnia', tx: '“Eat first. Sign second. Nobody reads contracts hungry.”' },
    { sp: 'Tobin', tx: '“The water says you’ll stay.”' },
    { sp: 'Hale', tx: '“I haven’t decided.”' },
    { sp: 'Tobin', tx: '“It wasn’t asking.”' },
    { sp: '', tx: 'Training constructs first. Nobody dies on paperwork day.' },
  ],
  ch2: [
    { ch: 'Chapter Two — Greywick' },
    { sp: '', tx: 'A relief mission to a frontier village. Three days out, the fields go quiet.' },
    { sp: 'Marlowe', tx: '“A village where the cattle don’t low? I’ve played to colder houses.”' },
    { sp: 'Brant', tx: '“Anchor’s down.”' },
    { sp: '', tx: 'Marlowe and Brant join the party.' },
    { sp: '', tx: 'The livestock stand motionless in the fields. Translucent at the edges.' },
    { sp: 'Cinnia', tx: '“That ox hasn’t blinked.”' },
    { sp: 'Tobin', tx: '“The water won’t look at it.”' },
  ],
  ch3: [
    { ch: 'Chapter Three — The Glasswright' },
    { sp: '', tx: 'Mid-mission, the light changes. A man stands in the square as if he had always been there.' },
    { sp: 'The Glasswright', tx: '“Leave.”' },
    { sp: 'Hale', tx: '“The village—”' },
    { sp: 'The Glasswright', tx: '“Is already gone. You just can’t see it yet.”' },
    { sp: '', tx: 'He raises a hand, and Greywick begins to shine.' },
    { sp: '', tx: 'SURVIVE. Some fights are not meant to be won — losing this one moves the story forward.' },
  ],
  scar: [
    { ch: 'Aftermath' },
    { sp: '', tx: 'The wave takes the square. Hale takes the wave.' },
    { sp: '', tx: 'He wakes three days later. Where it touched him the skin is smooth and faintly translucent — a scar like frosted glass.' },
    { sp: 'The Glasswright', tx: '“…You didn’t hollow. Interesting.” — and he was gone.' },
    { sp: '', tx: 'The guild files it under “survived.” The guild is bad at filing.' },
  ],
  ch6: [
    { ch: 'Chapter Six — The Greywick Alpha' },
    { sp: 'Scout report', tx: '“Something walks the Greywick fields. Sometimes a bull. Sometimes a man. Always both.”' },
    { sp: '', tx: 'It lows in a human voice. The guild has stopped using the herdsman’s name.' },
    { sp: 'Guildmaster', tx: '“Take five. Hale goes. That isn’t a request — whatever marked him reads these things better than we do.”' },
    { sp: 'Hale', tx: 'The scar has been aching for two days.' },
  ],
  victory: [
    { ch: '' },
    { sp: '', tx: 'Among the shards: a shepherd’s crook, unbroken.' },
    { sp: '', tx: 'The party buries it.' },
  ],
};

const VIGNETTES = [
  { who: 'Nix joins', say: '“My reef went hollow before your village did. Drink this. Yes, all of it. Yes, it tastes like that on purpose.”' },
  { who: 'Brigga joins', say: '“Hollowglass has fault lines. I brought a hammer for exactly this.”' },
  { who: 'Hearthgar joins', say: '“S-stay behind me! The armor means it, even if I don’t sound like it!”' },
  { who: 'Milla joins', say: '“Package for— oh, it’s URGENT urgent? Say no more.”' },
];

/* --------------------------------------------------------------- *
 *  Screen: title
 * --------------------------------------------------------------- */
function showTitle() {
  META.stage = 'title';
  app.innerHTML = `
    <div class="title-wrap">
      <div class="title-glyph"></div>
      <div class="title-hollow">PROJECT HOLLOWING</div>
      <div class="title-sub">Act One &middot; The Hollowing of Vessia</div>
      <div class="title-card">
        <button id="startbtn" style="font-size:17px; padding:12px 34px;">Begin</button>
      </div>
      <div class="small" style="margin-top:18px;">A squad of five. A blight that copies by emptying.<br>Turn-based. Menu-driven. No timing tricks — only decisions.</div>
      <div class="small" style="margin-top:8px; color:var(--faint);">window.runSelfTests() re-runs the engine test suite in this console.</div>
    </div>`;
  document.getElementById('startbtn').onclick = () => showDialogue(STORY.ch1, () =>
    startBattle('ch1', ['hale', 'cinnia', 'tobin'], afterCh1));
}

/* --------------------------------------------------------------- *
 *  Screen: dialogue cards (click to advance, skippable)
 * --------------------------------------------------------------- */
function showDialogue(scenes, done) {
  let i = 0;
  const chapterLine = (scenes[0] && scenes[0].ch !== undefined) ? scenes[0].ch : '';
  const lines = scenes.filter(s => s.tx);
  function render() {
    const s = lines[i];
    app.innerHTML = `
      <div class="dlg-wrap"><div class="dlg-card" id="dlgcard">
        <button class="dlg-skip" id="dlgskip">Skip ⏭</button>
        ${chapterLine ? `<div class="dlg-chapter">${esc(chapterLine)}</div>` : ''}
        <div class="dlg-speaker">${s.sp ? esc(s.sp) : '&nbsp;'}</div>
        <div class="dlg-text">${esc(s.tx)}</div>
        <div class="dlg-hint"><span>${i + 1} / ${lines.length}</span><span>click to continue ▸</span></div>
      </div></div>`;
    document.getElementById('dlgcard').onclick = (e) => {
      if (e.target.id === 'dlgskip') return;
      if (++i >= lines.length) done(); else render();
    };
    document.getElementById('dlgskip').onclick = (e) => { e.stopPropagation(); done(); };
  }
  render();
}

/* --------------------------------------------------------------- *
 *  Flow between battles
 * --------------------------------------------------------------- */
function afterCh1(result) {
  awardSigils(Engine.BATTLES.ch1.sigils, 'charter signed in full');
  showDialogue(STORY.ch2, () =>
    startBattle('ch2', ['hale', 'cinnia', 'tobin', 'marlowe', 'brant'], afterCh2));
}
function afterCh2(result) {
  META.owned = ['hale', 'cinnia', 'tobin', 'marlowe', 'brant'];
  awardSigils(Engine.BATTLES.ch2.sigils, 'Greywick’s herds put to rest');
  showDialogue(STORY.ch3, () =>
    startBattle('ch3', ['hale', 'cinnia', 'tobin', 'marlowe', 'brant'], afterCh3));
}
function afterCh3(result) {
  // The scripted loss ADVANCES the story.
  awardSigils(Engine.BATTLES.ch3.sigils, 'you survived him');
  showDialogue(STORY.scar, showInterlude);
}
function afterCh6(result) {
  awardSigils(Engine.BATTLES.ch6.sigils, 'the Alpha is down');
  showDialogue(STORY.victory, showCredits);
}

/* --------------------------------------------------------------- *
 *  Screen: interlude — recruits, then the hub
 * --------------------------------------------------------------- */
function showInterlude() {
  META.stage = 'interlude';
  META.owned = ROSTER_ORDER.slice();
  app.innerHTML = `
    <div class="panelbox fadein-slow" style="max-width:680px; margin:40px auto;">
      <div class="dlg-chapter">Chapters Four &amp; Five — The Spreading</div>
      <p class="small" style="margin-bottom:6px;">Outbreaks bloom across Vessia — the first leaks nobody caught. The guild grows to meet them.</p>
      ${VIGNETTES.map(v => `<div class="vignette"><div class="who">${esc(v.who)}</div><div class="say">${esc(v.say)}</div></div>`).join('')}
      <p class="small" style="margin:14px 0 18px;">Every mission has paid in Guild Sigils. The Summon Hall is open — pulls are for glory and Glass Ranks; power still comes from the field.</p>
      <button id="tohub" style="font-size:16px;">To the Guild Hall</button>
    </div>`;
  document.getElementById('tohub').onclick = showHub;
}

function showHub() {
  META.stage = 'hub';
  app.innerHTML = `
    <div class="panelbox" style="max-width:680px; margin:40px auto;">
      <h2 style="margin-bottom:4px;">The Guild Hall</h2>
      <p class="small">${sigilHTML()}</p>
      <p class="small" style="margin-top:10px;">The scar aches toward Greywick. Something out there is wearing the herdsman.</p>
      <div class="hubrow">
        <button id="gosummon">✦ Summon Hall</button>
        <button id="goch6" style="border-color:#6a5a2c; color:var(--gold);">⚔ March on Greywick (Chapter Six)</button>
      </div>
    </div>`;
  document.getElementById('gosummon').onclick = showSummon;
  document.getElementById('goch6').onclick = () => showDialogue(STORY.ch6, showSquadPicker);
}

/* --------------------------------------------------------------- *
 *  Screen: Summon Hall — gacha as flavor. Duplicate-safe cosmetic ranks.
 * --------------------------------------------------------------- */
function unitCardHTML(key, extra) {
  const t = Engine.UNITS[key];
  const rank = META.ranks[key] || 0;
  return `<div class="ucard e-${t.elem} ${extra || ''}" data-key="${key}" style="width:140px;">
    <div class="medal">${t.name[0]}</div>
    <div class="uname">${t.name}</div>
    <div class="urole">${Engine.ELEM_ICON[t.elem]} ${t.role}</div>
    <div class="pullrank" style="text-align:center;">${rank ? '✦'.repeat(rank) : '<span class="small" style="color:var(--faint)">—</span>'}</div>
  </div>`;
}
function showSummon() {
  const PULL_COST = 10;
  app.innerHTML = `
    <div class="panelbox" style="max-width:900px; margin:30px auto;">
      <h2>The Summon Hall</h2>
      <p class="small" style="margin-top:4px;">${sigilHTML()} &middot; Pulls grant <b>Glass Ranks</b> — cosmetic facets on units you already own. Nothing is wasted; nothing is required.</p>
      <div class="hubrow">
        <button id="pull1">Summon ×1 (10 ◈)</button>
        <button id="pull5">Summon ×5 (45 ◈)</button>
        <button id="backhub">← Guild Hall</button>
      </div>
      <div class="summon-stage" id="stage"><span class="small" style="color:var(--faint)">The basin of still water waits.</span></div>
      <h3 class="small" style="letter-spacing:2px; text-transform:uppercase;">Roster &amp; Glass Ranks</h3>
      <div class="roster-grid" id="roster">${META.owned.map(k => unitCardHTML(k)).join('')}</div>
    </div>`;
  const stage = document.getElementById('stage');
  function refresh() {
    document.querySelector('.sigil-count').textContent = `◈ ${META.sigils} Guild Sigils`;
    document.getElementById('roster').innerHTML = META.owned.map(k => unitCardHTML(k)).join('');
  }
  function doPulls(n, cost) {
    if (META.sigils < cost) { toast('Not enough Sigils. The field pays; the seam also pays, if you can find it.'); return; }
    META.sigils -= cost;
    stage.innerHTML = '';
    const results = [];
    for (let i = 0; i < n; i++) {
      const key = META.owned[Math.floor(Math.random() * META.owned.length)];
      const prev = META.ranks[key] || 0;
      META.ranks[key] = Math.min(5, prev + 1);
      results.push({ key, capped: prev >= 5 });
    }
    results.forEach((r, i) => {
      const t = Engine.UNITS[r.key];
      const card = document.createElement('div');
      card.className = `pullcard e-${t.elem}`;
      card.innerHTML = `<div class="pullinner">
          <div class="pullface pullback"></div>
          <div class="pullface pullfront">
            <div class="medal raysin">${t.name[0]}</div>
            <div class="uname">${t.name}</div>
            <div class="urole">${Engine.ELEM_ICON[t.elem]} ${t.role}</div>
            <div class="pullrank">${r.capped ? 'facet polished' : '✦'.repeat(META.ranks[r.key]) + ' Glass Rank'}</div>
          </div>
        </div>`;
      stage.appendChild(card);
      setTimeout(() => card.classList.add('flipped'), 500 + i * 340);
    });
    setTimeout(refresh, 600 + n * 340);
  }
  document.getElementById('pull1').onclick = () => doPulls(1, PULL_COST);
  document.getElementById('pull5').onclick = () => doPulls(5, 45);
  document.getElementById('backhub').onclick = showHub;
}

/* --------------------------------------------------------------- *
 *  Screen: squad picker for Ch.6 — Hale locked + choose 4
 * --------------------------------------------------------------- */
function showSquadPicker() {
  const picked = new Set();
  app.innerHTML = `
    <div class="panelbox" style="max-width:900px; margin:30px auto;">
      <h2>Choose the Five</h2>
      <p class="small" style="margin:6px 0 14px;">Hale is mandatory — the story has him by the scar. Pick <b>4</b> more.</p>
      <div class="roster-grid pick" id="pickgrid">
        ${ROSTER_ORDER.map(k => unitCardHTML(k, k === 'hale' ? 'lockedin' : '')).join('')}
      </div>
      <div class="hubrow">
        <button id="begin" disabled>March (0/4)</button>
        <button id="backhub2">← Guild Hall</button>
      </div>
    </div>`;
  const grid = document.getElementById('pickgrid');
  const begin = document.getElementById('begin');
  grid.querySelector('[data-key="hale"]').insertAdjacentHTML('beforeend', '<div class="locknote">MANDATORY</div>');
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.ucard'); if (!card) return;
    const key = card.dataset.key; if (key === 'hale') return;
    if (picked.has(key)) { picked.delete(key); card.classList.remove('picked'); }
    else if (picked.size < 4) { picked.add(key); card.classList.add('picked'); }
    begin.disabled = picked.size !== 4;
    begin.textContent = `March (${picked.size}/4)`;
  });
  begin.onclick = () => startBattle('ch6', ['hale', ...picked], afterCh6);
  document.getElementById('backhub2').onclick = showHub;
}

/* --------------------------------------------------------------- *
 *  Screen: credits
 * --------------------------------------------------------------- */
function showCredits() {
  app.innerHTML = `
    <div class="panelbox fadein-slow" style="max-width:640px; margin:50px auto;">
      <h2>Hollow Reflections — Act One</h2>
      <p class="small" style="margin:8px 0 14px;">A quiet card, as promised. Systems in this demo:</p>
      <ul class="credits small">
        <li>Free-order squad turns &middot; per-unit Energy (Basic / Guard / Skill / Art / Burst)</li>
        <li>Elemental wheel (Fire &gt; Earth &gt; Thunder &gt; Water &gt; Fire, Light ↔ Dark, Hollow neutral)</li>
        <li>Break bars, stagger, +25% refill ramp, delay-once rule, 50% mitigation cap</li>
        <li>Telegraphed Stampedes &middot; guard-to-profit economy &middot; break-cancel tempo play</li>
        <li>Hale’s Hollowglass Arsenal — forging, ablative blades, mid-fight awakening</li>
        <li>A defeat that advances the story &middot; a guided one-button finale</li>
        <li>Gacha as flavor: Guild Sigils, Glass Ranks, and a seam in the menu</li>
        <li>Ten Act One missions &middot; evolving encounters &middot; one herd, still miscounted</li>
      </ul>
      <div class="hubrow">
        <button id="totitle">Return to Title</button>
        <button id="selftest">Run engine self-tests</button>
      </div>
      <p class="small" id="testout" style="margin-top:10px;"></p>
    </div>`;
  document.getElementById('totitle').onclick = showTitle;
  document.getElementById('selftest').onclick = () => {
    const r = window.runSelfTests();
    document.getElementById('testout').textContent = `Self-tests: ${r.pass} passed, ${r.fail} failed.` + (r.fail ? ' — ' + r.failures.join(' | ') : '');
  };
}
/*EOF-UI1*/
