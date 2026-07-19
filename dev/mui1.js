/* ============================================================================
   UI LAYER — mobile gacha shell: bottom nav + Home / Story / Party / Summon /
   Town, plus dialogue, squad-picker and story flow. The engine above is pure;
   everything DOM-flavored lives below. (Battle screen lives in the next part.)
   ============================================================================ */
(function () {
'use strict';

const app = document.getElementById('app');
const body = document.body;
const nav = document.getElementById('bottomnav');

/* ---- field diagnostics: surface any runtime error as a toast so bugs name themselves ---- */
window.__errToast = (msg) => { try { toast('⚠ ' + String(msg).slice(0, 120)); } catch (e) {} };
window.addEventListener('error', (e) => window.__errToast((e.message || 'error') + (e.lineno ? ' @' + e.lineno : '')));
window.addEventListener('unhandledrejection', (e) => window.__errToast('async: ' + (e.reason && e.reason.message || e.reason)));

/* ---- chat heads: hi-res anime portrait if embedded, else SVG bust fallback ---- */
const SPEAKER_KEYS = { 'the glasswright': 'glasswright', 'glasswright': 'glasswright' };
function portraitKeyFor(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().replace(/[^a-z? ]/g, '').trim();
  if (SPEAKER_KEYS[n]) return SPEAKER_KEYS[n];
  if (typeof Engine !== 'undefined' && Engine.UNITS && Engine.UNITS[n]) return n;
  return null;
}
function chatHeadHTML(key, cls) {
  if (!key) return '';
  const dialogueKey = key + '_dialogue';
  const portraitKey = typeof PORTRAITS !== 'undefined' && PORTRAITS[dialogueKey] ? dialogueKey : key;
  const px = (typeof PORTRAITS !== 'undefined') && (PORTRAITS[portraitKey] || (key === 'hale' && META.haleAwakened && PORTRAITS['hale_awakened']));
  if (px) return `<img class="${cls || 'chathead'}" alt="" src="${px}">`;
  const svgId = (key === 'hale' && META.haleAwakened) ? 'p-hale-awk' : 'p-' + key;
  if (document.getElementById(svgId)) return sym(svgId, cls || 'chathead');
  return '';
}

const ROSTER_ORDER = ['hale', 'cinnia', 'tobin', 'marlowe', 'brant', 'nix', 'brigga', 'hearthgar', 'milla', 'katie'];

const META = {
  sigils: 0,
  gold: 0,
  ranks: {},                       // cosmetic Glass Ranks from summons (duplicate-safe)
  owned: ['hale', 'cinnia', 'tobin'],
  activeParty: ['hale', 'cinnia', 'tobin'],
  unitProgress: {},                // { key: { level, stars, xp } }
  challengeItems: {},
  challengeProgress: {},
  completedTransactions: [],
  marketState: { tier: 0, purchases: {} },
  telemetry: [],
  economyLedger: [],
  unitAI: {},                       // { unitKey: { preset } }
  evolutionUnlocks: {},            // story or Challenge gates that reveal recipes
  featureUnlocks: {},
  libraryUnlocked: {},              // permanent discoveries; deliberately separate from owned
  devClicks: 0,
  stage: 'title',
  storyStep: 0,                    // index into STEPS: the next chapter to clear
  act1MissionProgress: 0,          // expanded Act 1 mission-map progress
  missionClears: {},               // permanent per-mission completion, across all chapters
  haleAwakened: false,             // permanent roster evolution, separate from the Ch.6 story transformation
  lastHub: 'home',                 // remembered nav tab
  settings: { autoSkill: false, autoArts: false, autoBurst: false, animationSpeed: 1 }, // persistent combat preferences
};

const MATERIAL_NAMES = {
  hollowglass_shard: 'Hollowglass Shard',
  beastheart_core: 'Beastheart Core',
  ember_challenge_crest: 'Ember Challenge Crest',
  feastkeeper_seal: "Feastkeeper's Seal",
  challenge_essence: 'Challenge Essence',
};
function unitProgress(key) {
  const cfg = Engine.UNIT_PROGRESSION[key];
  if (!META.unitProgress[key]) META.unitProgress[key] = { level: 1, stars: cfg.baseStars, xp: 0 };
  return META.unitProgress[key];
}
function levelCap(stars) { return Engine.LEVEL_CAPS[stars]; }
function xpPercent(p) { return p.level >= levelCap(p.stars) ? 100 : Math.round(100 * (p.xp || 0) / Engine.xpToNext(p.level)); }
function xpText(p) { return p.level >= levelCap(p.stars) ? 'MAX' : `${p.xp || 0} / ${Engine.xpToNext(p.level)} XP`; }
function starsHTML(n) { return `<span class="rarity-stars" aria-label="${n} star">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`; }
function evolutionReady(key) {
  return GameState.evolutionEligibility(captureSaveState(), key).ok;
}
function evolveUnit(key) {
  const result = GameState.evolveUnit(captureSaveState(), key);
  if (!result.ok) { toast(result.message); return false; }
  applySaveState(result.state); writeSave(true);
  toast(`${Engine.UNITS[key].name} evolved to ${unitProgress(key).stars}★.`);
  return true;
}
function grantHaleStoryEvolution() {
  META.evolutionUnlocks.hale = true;
  const evolved = Engine.applyStoryEvolutions(META.unitProgress, 'ch6');
  META.haleAwakened = unitProgress('hale').stars >= 5;
  if (META.haleAwakened) META.libraryUnlocked['hale:5'] = true;
  return evolved.includes('hale');
}
function rememberOwnedUnits() {
  Engine.recordOwnedDiscoveries(META.libraryUnlocked, META.owned);
}

/* --------------------------------------------------------------- *
 *  One-profile, versioned autosave. Account linkage is reserved in
 *  the envelope but requires a real authentication/cloud provider.
 * --------------------------------------------------------------- */
const SAVE_STORAGE_KEY = 'projectHollowing.singleSave';
const SAVE_GAME_VERSION = '0.47.0';
let saveEnvelope = null;
let incompatibleRawText = null;
let saveLastStateJSON = '';
let saveLastAt = null;
let saveError = '';
let saveNotice = '';
let saveWriteLocked = false;

function captureSaveState() {
  return Engine.normalizeSaveState({
    sigils: META.sigils, gold: META.gold, glassDust: META.glassDust, ranks: META.ranks, owned: META.owned, activeParty: META.activeParty,
    unitProgress: META.unitProgress, challengeItems: META.challengeItems, challengeProgress: META.challengeProgress, completedTransactions: META.completedTransactions,
    marketState: META.marketState, summonState: META.summonState, summonHistory: META.summonHistory, telemetry: META.telemetry, economyLedger: META.economyLedger, unitAI: META.unitAI,
    evolutionUnlocks: META.evolutionUnlocks, featureUnlocks: META.featureUnlocks, libraryUnlocked: META.libraryUnlocked,
    storyStep: META.storyStep, act1MissionProgress: META.act1MissionProgress, missionClears: META.missionClears, haleAwakened: META.haleAwakened, lastHub: META.lastHub,
    settings: META.settings,
  });
}
function applySaveState(state) {
  const clean = Engine.normalizeSaveState(state);
  for (const key of Object.keys(clean)) META[key] = clean[key];
  rememberOwnedUnits();
}
function saveId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return 'hollow-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
function newSaveEnvelope(state) {
  const now = new Date().toISOString();
  return {
    schemaVersion: Engine.SAVE_SCHEMA_VERSION, gameVersion: SAVE_GAME_VERSION,
    saveId: saveId(), createdAt: now, updatedAt: now, revision: 0,
    accountLink: { linked: false, provider: null, accountId: null },
    state: Engine.normalizeSaveState(state),
  };
}
function writeSave(force) {
  if (saveWriteLocked || !saveEnvelope) return false;
  const state = captureSaveState();
  const stateJSON = JSON.stringify(state);
  if (!force && stateJSON === saveLastStateJSON) return true;
  const now = new Date().toISOString();
  const nextEnvelope = Object.assign({}, saveEnvelope, {
    schemaVersion: Engine.SAVE_SCHEMA_VERSION, gameVersion: SAVE_GAME_VERSION,
    updatedAt: now, revision: (saveEnvelope.revision || 0) + 1, state,
  });
  try {
    GameState.commitEnvelope(localStorage, SAVE_STORAGE_KEY, nextEnvelope);
    saveEnvelope = nextEnvelope;
    saveLastStateJSON = stateJSON;
    saveLastAt = now;
    saveError = '';
    return true;
  } catch (err) {
    saveError = 'Local saving is unavailable in this browser.';
    return false;
  }
}
function commitGameStateResult(result) {
  if (!result.ok || saveWriteLocked || !saveEnvelope) return false;
  const state = Engine.normalizeSaveState(result.state), stateJSON = JSON.stringify(state), now = new Date().toISOString();
  const nextEnvelope = Object.assign({}, saveEnvelope, {
    schemaVersion: Engine.SAVE_SCHEMA_VERSION, gameVersion: SAVE_GAME_VERSION,
    updatedAt: now, revision: (saveEnvelope.revision || 0) + 1, state,
  });
  try {
    GameState.commitEnvelope(localStorage, SAVE_STORAGE_KEY, nextEnvelope);
    saveEnvelope = nextEnvelope;
    saveLastStateJSON = stateJSON;
    saveLastAt = now;
    saveError = '';
    applySaveState(state);
    return true;
  } catch (err) {
    saveError = 'Local saving is unavailable in this browser.';
    return false;
  }
}
function initializeSaveSystem() {
  rememberOwnedUnits();
  let rawText = null;
  try { rawText = localStorage.getItem(SAVE_STORAGE_KEY); }
  catch (err) { saveError = 'Local saving is unavailable in this browser.'; }
  if (rawText) {
    try {
      saveEnvelope = Engine.migrateSaveEnvelope(JSON.parse(rawText));
      applySaveState(saveEnvelope.state);
      saveLastStateJSON = JSON.stringify(captureSaveState());
      saveLastAt = saveEnvelope.updatedAt || null;
      // Re-save migrated data in the current envelope format.
      writeSave(true);
      return;
    } catch (err) {
      if (/newer version/.test(err.message || '')) {
        saveWriteLocked = true;
        incompatibleRawText = rawText;
        saveError = err.message;
        saveEnvelope = newSaveEnvelope(captureSaveState());
        return;
      }
      // Preserve malformed data for manual recovery before starting clean.
      try { localStorage.setItem(SAVE_STORAGE_KEY + '.corrupt.' + Date.now(), rawText); } catch (ignore) {}
      for (const recoveryKey of [SAVE_STORAGE_KEY + '.backup', SAVE_STORAGE_KEY + '.tmp']) {
        try {
          const recoveredText = localStorage.getItem(recoveryKey);
          if (!recoveredText) continue;
          saveEnvelope = Engine.migrateSaveEnvelope(JSON.parse(recoveredText));
          applySaveState(saveEnvelope.state);
          localStorage.removeItem(SAVE_STORAGE_KEY);
          saveNotice = 'The active save was unreadable. The last verified backup was restored.';
          writeSave(true);
          return;
        } catch (ignore) {}
      }
      saveNotice = 'The previous local save was unreadable and was preserved for recovery.';
    }
  }
  saveEnvelope = newSaveEnvelope(captureSaveState());
  applySaveState(saveEnvelope.state);
  writeSave(true);
}
function saveTimeLabel() {
  if (!saveLastAt) return saveError || 'Not saved yet';
  const d = new Date(saveLastAt);
  return Number.isNaN(d.getTime()) ? 'Saved' : `Saved ${d.toLocaleString()}`;
}
function exportSaveBackup() {
  if (incompatibleRawText == null) writeSave(true);
  const payload = incompatibleRawText == null ? JSON.stringify(saveEnvelope, null, 2) : incompatibleRawText;
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `project-hollowing-save-${saveEnvelope && saveEnvelope.saveId ? saveEnvelope.saveId.slice(0, 8) : 'incompatible'}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importSaveBackup(file) {
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('Save backup is too large.');
    const imported = Engine.migrateSaveEnvelope(JSON.parse(await file.text()), { strict: true });
    if (!window.confirm('Replace the current local save with this backup?')) return;
    const now = new Date().toISOString();
    const nextEnvelope = Object.assign({}, imported, { gameVersion: SAVE_GAME_VERSION, updatedAt: now, revision: (imported.revision || 0) + 1 });
    GameState.commitEnvelope(localStorage, SAVE_STORAGE_KEY, nextEnvelope);
    saveWriteLocked = false;
    incompatibleRawText = null;
    saveNotice = '';
    saveEnvelope = nextEnvelope;
    applySaveState(nextEnvelope.state);
    saveLastStateJSON = JSON.stringify(captureSaveState());
    saveLastAt = now;
    toast('Save backup imported.');
    showTitle();
  } catch (err) { toast('Import failed: ' + String(err.message || err).slice(0, 90), 4200); }
}
function resetSingleSave() {
  if (!window.confirm('Erase this local save and begin again? This cannot be undone unless you exported a backup.')) return;
  try {
    const state = Engine.normalizeSaveState({}), nextEnvelope = newSaveEnvelope(state);
    GameState.commitEnvelope(localStorage, SAVE_STORAGE_KEY, nextEnvelope);
    saveWriteLocked = false; saveError = ''; saveNotice = '';
    incompatibleRawText = null;
    saveEnvelope = nextEnvelope; applySaveState(state);
    saveLastStateJSON = JSON.stringify(captureSaveState()); saveLastAt = nextEnvelope.updatedAt;
    showTitle();
  } catch (err) { toast('Reset failed: ' + String(err.message || err).slice(0, 90), 4200); }
}

initializeSaveSystem();
setInterval(() => writeSave(false), 1500);
window.addEventListener('pagehide', () => writeSave(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(true); });

/* portrait symbol id for a roster key (Hale flips once awakened) */
function pid(key) { return key === 'hale' && META.haleAwakened ? 'p-hale-awk' : 'p-' + key; }
/* an inline SVG that references a <symbol> from the asset library in part-head */
function sym(id, cls, style) {
  return `<svg class="${cls || ''}"${style ? ` style="${style}"` : ''} aria-hidden="true"><use href="#${id}"/></svg>`;
}

function esc(x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function toast(msg, ms) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms || 2600);
}
function sigilPill() {
  return `<span class="wallet-pill"><span class="gold-pill"><i></i><span class="gold-count">${META.gold}</span></span><span class="sigil-pill">${sym('i-sigil')}<span class="sigil-count">${META.sigils}</span></span></span>`;
}
function sigilHTML() { return `<span class="sigil-count">◈ ${META.sigils} Guild Sigils</span>`; }
function refreshSigils() {
  document.querySelectorAll('.sigil-count').forEach(s => {
    s.textContent = s.closest('.sigil-pill') ? String(META.sigils) : `◈ ${META.sigils} Guild Sigils`;
  });
  document.querySelectorAll('.gold-count').forEach(s => s.textContent = String(META.gold));
}
function awardSigils(n, why) { META.sigils += n; toast(`+${n} Guild Sigils — ${why}`); }

/* --------------------------------------------------------------- *
 *  The hidden dev console (canon): the version number, clicked 7x.
 * --------------------------------------------------------------- */
document.getElementById('version').addEventListener('click', () => {
  if (++META.devClicks === 7) {
    META.devClicks = 0;
    META.sigils += 9999;
    toast('The seam in the menu was always there.'); // plain toast — no styling
    refreshSigils();
  }
});

/* --------------------------------------------------------------- *
 *  Chrome: what body classes each context wants
 * --------------------------------------------------------------- */
function chrome(mode) {
  // 'hub' -> nav visible; 'nonav' -> full-bleed (dialogue/title); 'battle' -> nav hidden + locked scroll
  body.className = mode === 'hub' ? '' : mode === 'battle' ? 'nonav inbattle' : 'nonav';
}

/* ===============================================================
 *  STORY DATA
 * =============================================================== */
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
    { sp: '', tx: 'The party buries it. No music. Nothing lows.' },
  ],
};

const VIGNETTES = [
  { who: 'Nix joins', say: '“My reef went hollow before your village did. Drink this. Yes, all of it. Yes, it tastes like that on purpose.”' },
  { who: 'Brigga joins', say: '“Hollowglass has fault lines. I brought a hammer for exactly this.”' },
  { who: 'Hearthgar joins', say: '“S-stay behind me! The armor means it, even if I don’t sound like it!”' },
  { who: 'Milla joins', say: '“Package for— oh, it’s URGENT urgent? Say no more.”' },
];

/* short unit quotes + passive lines for the detail sheet (canon flavor) */
const QUOTES = {
  hale: '“I haven’t decided. But I’m still standing here, aren’t I?”',
  cinnia: '“Eat first. Bleed later. In that order, always.”',
  tobin: '“The water already told me how this ends. I just came to watch.”',
  marlowe: '“Save the applause. Actually — no, don’t.”',
  brant: '“Anchor’s down. It stays down.”',
  nix: '“It tastes like that on purpose. Drink.”',
  brigga: '“Everything has a fault line. Hold still while I find yours.”',
  hearthgar: '“S-stay behind me. The armor means it.”',
  milla: '“Never late. Not once. Watch me.”',
  katie: '“I can see exactly what is wrong. I was happier before you asked.”',
};
/* ===============================================================
 *  STORY STEPS — the spine both Home:Continue and Story-list drive
 * =============================================================== */
const STEPS = [
  { id: 'ch1', kind: 'battle', label: 'Chapter One', title: 'The Guild Charter', scene: 'sc-hall',
    desc: 'Sign the charter. Meet the constructs.', dlg: 'ch1', party: ['hale', 'cinnia', 'tobin'], after: 'afterCh1' },
  { id: 'ch2', kind: 'battle', label: 'Chapter Two', title: 'Greywick', scene: 'sc-fields',
    desc: 'A relief mission. The fields go quiet.', dlg: 'ch2', party: ['hale', 'cinnia', 'tobin', 'brant'], after: 'afterCh2' },
  { id: 'ch3', kind: 'battle', label: 'Chapter Three', title: 'The Glasswright', scene: 'sc-seam',
    desc: 'Survive. You are not meant to win.', dlg: 'ch3', party: ['hale', 'cinnia', 'tobin', 'brant'], after: 'afterCh3', scripted: true },
  { id: 'spread', kind: 'interlude', label: 'Chapters Four & Five', title: 'The Spreading', scene: 'sc-fields',
    desc: 'The blight blooms. The guild grows.' },
  { id: 'ch6', kind: 'boss', label: 'Chapter Six', title: 'The Lowing Man', scene: 'sc-arena',
    desc: 'The Greywick Alpha. The scar is loud.', dlg: 'ch6', after: 'afterCh6', pickSquad: true },
];
const ACT1_MISSIONS = STORY_REGISTRY.chapters[0].missions.map(m => Object.assign({ live: true }, m));
const STORY_CHAPTERS = STORY_REGISTRY.chapters;
function chapterClearCount(chapter) { return chapter.missions.reduce((n, m) => n + (META.missionClears[m.id] ? 1 : 0), 0); }
function chapterUnlocked(index) { return index === 0 || chapterClearCount(STORY_CHAPTERS[index - 1]) >= STORY_CHAPTERS[index - 1].missions.length; }
function firstCanonicalMission() {
  for (let chapterIndex = 0; chapterIndex < STORY_CHAPTERS.length; chapterIndex++) {
    const chapter = STORY_CHAPTERS[chapterIndex];
    if (!chapterUnlocked(chapterIndex)) break;
    const missionIndex = chapter.missions.findIndex(mission => !META.missionClears[mission.id]);
    if (missionIndex >= 0) return { chapterIndex, missionIndex, mission: chapter.missions[missionIndex] };
  }
  return null;
}
function missionParty(mission) {
  const guests = mission.party || [];
  return [...guests, ...META.activeParty].filter((k, i, a) => k && Engine.UNITS[k] && (META.owned.includes(k) || guests.includes(k)) && a.indexOf(k) === i).slice(0, Engine.PARTY_SIZE);
}
function missionScenes(mission, phase) {
  if (mission[phase] && mission[phase].length) return mission[phase];
  const chapter = STORY_CHAPTERS.find(c => c.id === mission.chapterId);
  return phase === 'post' ? [{sp:'',tx:`${mission.title} is complete. The road ahead is less certain than it was.`}]
    : [{ch:`Chapter ${chapter.code} — ${chapter.title}`},{sp:'',tx:`${mission.code} — ${mission.title}`},{sp:'Cinnia',tx:mission.lesson || 'Stay close. We do this together.'}];
}
function settleCanonicalMission(mission, party, outcome, summary, done) {
  const result = GameState.completeMission(captureSaveState(), mission.id, Object.assign({}, summary, { outcome }), party);
  if (!result.ok) { toast(result.message); return false; }
  const commit = () => {
    if (!commitGameStateResult(result)) {
      chrome('nonav'); META.stage = 'save-error';
      app.innerHTML = `<div class="panelbox" style="margin:40px 14px;"><h2>Mission Not Saved</h2><p class="small">Your rewards and progress were not applied. Retry saving or return to Story.</p><div class="formation-actions"><button id="retrysave" class="bigbtn">Retry Save</button><button id="returnsave">Return to Story</button></div></div>`;
      document.getElementById('retrysave').onclick = commit;
      document.getElementById('returnsave').onclick = () => go('story');
      return false;
    }
    const reward = result.rewards[0];
    if (reward && mission.encounter) showQuestRewards(reward, done); else done();
    return true;
  };
  return commit();
}

/* ticker line changes with story progress */
function tickerLine() {
  const s = META.storyStep;
  if (s <= 0) return 'The crown’s ink is still wet on your charter. · Training constructs await in the yard.';
  if (s === 1) return 'Reports out of Greywick: the cattle have stopped lowing. · Marlowe and Brant sign on.';
  if (s === 2) return 'Greywick shines where a village used to be. · A man in a long coat was seen walking away.';
  if (s === 3) return 'Outbreaks bloom across Vessia. · The guild swells to meet them — Nix, Brigga, Hearthgar, Milla.';
  if (s === 4) return 'The scar aches toward Greywick. · Something out there is wearing the herdsman.';
  return 'The field is quiet. Nothing lows. · Ansel returns soon.';
}

/* ===============================================================
 *  BOTTOM NAV
 * =============================================================== */
const TABS = [
  { id: 'home', icon: 'i-home', label: 'Home', fn: showHome },
  { id: 'story', icon: 'i-story', label: 'Story', fn: showStory },
  { id: 'party', icon: 'i-party', label: 'Party', fn: showParty },
  { id: 'summon', icon: 'i-summon', label: 'Summon', fn: showSummon },
  { id: 'town', icon: 'i-town', label: 'Town', fn: showTown },
];
function renderNav(active) {
  nav.innerHTML = TABS.map(t =>
    `<button type="button" class="navbtn ${t.id === active ? 'active' : ''}" data-tab="${t.id}"${t.id === active ? ' aria-current="page"' : ''}${t.id === 'summon' && !META.featureUnlocks.summon ? ' disabled aria-disabled="true" title="Unlocks after 1-9 · The Still Basin"' : ''}>
       ${sym(t.icon)}<span class="nlbl">${t.label}</span>
     </button>`).join('');
  nav.querySelectorAll('.navbtn').forEach(b => b.onclick = () => go(b.dataset.tab));
}
function go(tabId) {
  if (tabId === 'summon' && !META.featureUnlocks.summon) { toast('Summoning unlocks after mission 1-9: The Still Basin.'); return; }
  META.lastHub = tabId;
  const tab = TABS.find(t => t.id === tabId) || TABS[0];
  chrome('hub');
  renderNav(tab.id);
  app.scrollTop = 0;
  tab.fn();
  writeSave(false);
}

/* ===============================================================
 *  TITLE
 * =============================================================== */
function showTitle() {
  META.stage = 'title';
  chrome('nonav');
  const account = saveEnvelope && saveEnvelope.accountLink || { linked: false };
  const hasProgress = META.storyStep > 0 || META.sigils > 0 || Object.keys(META.ranks).length > 0;
  app.innerHTML = `
    <div class="title-wrap save-title">
      <div class="title-glyph"></div>
      <div class="title-hollow">HOLLOW REFLECTIONS</div>
      <div class="title-sub">Act One &middot; The Hollowing of Vessia</div>
      <section class="save-profile">
        <div class="save-profile-head"><div><b>Local Save</b><span>Single profile · autosave enabled</span></div><i class="save-dot ${saveError ? 'bad' : ''}"></i></div>
        <div class="save-summary"><span>Story</span><b>${META.storyStep >= STEPS.length ? 'Act One Complete' : `Chapter ${META.storyStep + 1}`}</b><span>Library</span><b>${Object.keys(META.libraryUnlocked).length} / ${Engine.UNIT_LIBRARY.length}</b></div>
        <div class="save-id">ID ${esc((saveEnvelope && saveEnvelope.saveId || 'unavailable').slice(0, 18))}</div>
        <div class="save-status ${saveError ? 'bad' : ''}">${esc(saveError || saveNotice || saveTimeLabel())}</div>
        <div class="account-row"><div><b>Account Link</b><span>${account.linked ? esc(account.provider || 'Linked account') : 'Not linked · cloud service not configured'}</span></div><button disabled>Link Account</button></div>
      </section>
      <button id="startbtn" class="bigbtn" style="max-width:280px;" ${saveWriteLocked ? 'disabled' : ''}>${hasProgress ? 'Continue' : 'Begin'}<span class="sub">${hasProgress ? 'Resume the single saved profile.' : 'A squad of five. A blight that copies by emptying.'}</span></button>
      <div class="save-tools"><button id="exportsave">Export Backup</button><button id="importsave">Import Backup</button><button id="resetsave" class="danger">Erase Save</button></div>
      <input id="savefile" type="file" accept="application/json,.json" hidden>
      <div class="small" style="margin-top:14px; color:var(--faint);">Real-time · command-driven · read the field, choose the moment.</div>
    </div>`;
  document.getElementById('startbtn').onclick = () => { writeSave(true); go(META.lastHub || 'home'); };
  document.getElementById('exportsave').onclick = exportSaveBackup;
  const input = document.getElementById('savefile');
  document.getElementById('importsave').onclick = () => input.click();
  input.onchange = () => { if (input.files && input.files[0]) importSaveBackup(input.files[0]); };
  document.getElementById('resetsave').onclick = resetSingleSave;
}

/* ===============================================================
 *  HOME
 * =============================================================== */
function showHome() {
  META.stage = 'home';
  const next = firstCanonicalMission();
  const done = !next;
  const chapter = next && STORY_CHAPTERS[next.chapterIndex];
  const title = done ? 'Act One Complete' : `${next.mission.code} · ${next.mission.title}`;
  app.innerHTML = `
    <div class="home-banner">
      ${sym(done ? 'sc-hall' : next.mission.scene, 'scene')}
      <div class="banner-shade"></div>
      ${unitSplashSource('hale', META.haleAwakened) ? `<img class="home-featured-art" alt="" src="${unitSplashSource('hale', META.haleAwakened)}">` : ''}
      ${sigilPill()}
      <div class="banner-ch"><div class="bk">${done ? 'Act One — Complete' : `Chapter ${chapter.code} · ${esc(chapter.title)}`}</div><div class="bt">${esc(title)}</div></div>
    </div>
    <div class="ticker hr-kit-panel"><span class="tklbl">VESSIA</span><span class="tkwin"><span class="tk">${esc(tickerLine())}</span></span></div>
    <div class="home-kit-strip"><div><span>EVENT</span><b>The Lowing Fields</b><small>Garrison contract active</small></div><div><span>DAILY</span><b>Guild duties</b><small>Keep the party moving</small></div></div>
    <button id="continue" class="bigbtn">${done ? 'Story Complete' : (META.storyStep === 0 ? 'Begin the Story' : 'Continue Story')}
      <span class="sub">${done ? 'Replay cleared missions from the Story tab' : esc(title)}</span></button>
    <div class="homerow">
      <button id="hsummon" ${META.featureUnlocks.summon ? '' : 'disabled title="Unlocks after mission 1-9"'}>✦ Summon</button>
      <button id="htown">⌂ Castle Town</button>
      <button id="hsave">Save / Account</button>
    </div>`;
  document.getElementById('continue').onclick = () => {
    if (done) return go('story');
    if (next.chapterIndex === 0) playAct1Mission(next.missionIndex);
    else playStoryMission(next.mission.id, next.chapterIndex);
  };
  document.getElementById('hsummon').onclick = () => go('summon');
  document.getElementById('htown').onclick = () => go('town');
  document.getElementById('hsave').onclick = () => { writeSave(true); showTitle(); };
}

/* ===============================================================
 *  STORY LIST
 * =============================================================== */
function showStory() {
  META.stage = 'story';
  app.innerHTML = `
    <div class="shead"><h2>Story</h2>${sigilPill()}</div><button class="act-map-open" id="openact1map"><b>Act 1 Mission Map</b><span>Chapter One · ${META.act1MissionProgress} / 10 cleared</span></button>
    <div class="story-map-list">${STORY_CHAPTERS.slice(1).map((chapter, offset) => {
      const index = offset + 1, count = chapterClearCount(chapter), unlocked = chapterUnlocked(index);
      return `<button class="act-map-open ${unlocked ? '' : 'locked'}" data-chapter-map="${index}" ${unlocked ? '' : 'disabled'}><b>Chapter ${chapter.code} · ${esc(chapter.title)}</b><span>${unlocked ? `${count} / ${chapter.missions.length} cleared` : 'Complete the previous chapter to unlock'}</span></button>`;
    }).join('')}</div>
    <p class="small" style="margin:10px 14px 14px;">Canonical mission registry · clear missions in order to reveal the next chapter.</p>`;
  document.getElementById('openact1map').onclick = showAct1MissionMap;
  app.querySelectorAll('[data-chapter-map]:not(:disabled)').forEach(button => button.onclick = () => showChapterMissionMap(Number(button.dataset.chapterMap)));
}

function showChapterMissionMap(chapterIndex) {
  if (chapterIndex === 0) return showAct1MissionMap();
  const chapter = STORY_CHAPTERS[chapterIndex];
  if (!chapter || !chapterUnlocked(chapterIndex)) return showStory();
  META.stage = `chapter${chapter.code}map`;
  const firstUncleared = chapter.missions.findIndex(m => !META.missionClears[m.id]);
  app.innerHTML = `<div class="shead"><h2>Chapter ${chapter.code}</h2>${sigilPill()}</div><div class="act-map-head"><button id="actmapback">← Story</button><div><b>${esc(chapter.title)}</b><span>${chapterClearCount(chapter)} / ${chapter.missions.length} cleared</span></div></div><div class="mission-path">${chapter.missions.map((mission, index) => {
    const cleared = !!META.missionClears[mission.id], available = cleared || firstUncleared < 0 || index === firstUncleared;
    return `<button class="mission-node ${cleared ? 'cleared' : available ? 'available' : 'locked'}" data-story-mission="${mission.id}" ${available ? '' : 'disabled'}><span class="mission-code">${mission.code}</span><b>${esc(mission.title)}</b><small>${esc(mission.lesson || '')}</small><i>${cleared ? 'CLEARED' : available ? (mission.type === 'story' ? 'VIEW' : mission.scriptedLoss ? 'SURVIVE' : 'START') : 'LOCKED'}</i></button>`;
  }).join('')}</div>`;
  document.getElementById('actmapback').onclick = showStory;
  app.querySelectorAll('[data-story-mission]:not(:disabled)').forEach(button => button.onclick = () => playStoryMission(button.dataset.storyMission, chapterIndex));
}

function playStoryMission(id, chapterIndex) {
  const mission = STORY_REGISTRY.missions[id], chapter = STORY_CHAPTERS[chapterIndex];
  if (!mission || !chapter || !chapterUnlocked(chapterIndex)) return;
  const firstUncleared = chapter.missions.findIndex(m => !META.missionClears[m.id]);
  const index = chapter.missions.findIndex(m => m.id === id);
  if (!META.missionClears[id] && index !== firstUncleared) return;
  const party = missionParty(mission);
  const complete = () => {
    chrome('hub'); renderNav('story'); showChapterMissionMap(chapterIndex);
  };
  const showPost = () => showDialogue(missionScenes(mission, 'post'), complete, mission.scene);
  if (mission.type === 'story') {
    chrome('nonav');
    showDialogue(missionScenes(mission, 'pre'), () => settleCanonicalMission(mission, party, 'victory', { battleId: `story:${id}:${saveId()}`, encounterId: null, victory: true }, showPost), mission.scene);
    return;
  }
  const fight = () => {
    chrome('battle');
    startBattle(mission.encounter || mission.id, party, (outcome, summary) => {
      if (outcome === 'victory' || outcome === 'scripted_loss') settleCanonicalMission(mission, party, outcome, summary, showPost);
      else { chrome('hub'); renderNav('story'); showChapterMissionMap(chapterIndex); }
    });
  };
  chrome('nonav'); showDialogue(missionScenes(mission, 'pre'), fight, mission.scene);
}

function showAct1MissionMap() {
  META.stage = 'act1map';
  const firstUncleared = ACT1_MISSIONS.findIndex(mission => !META.missionClears[mission.id]);
  app.innerHTML = `<div class="shead"><h2>Chapter One</h2>${sigilPill()}</div><div class="act-map-head"><button id="actmapback">← Story</button><div><b>The Guild Charter</b><span>Expanded mission framework</span></div></div><div class="mission-path">${ACT1_MISSIONS.map((m, i) => {
    const cleared = !!META.missionClears[m.id];
    const available = m.live && (cleared || i === firstUncleared);
    const state = cleared ? 'cleared' : available ? 'available' : m.live ? 'locked' : 'planned';
    return `<button class="mission-node ${state}" data-actmission="${i}" ${available || cleared ? '' : 'disabled'}><span class="mission-code">${m.code}</span><b>${esc(m.title)}</b><small>${esc(m.lesson)}</small><i>${cleared ? 'CLEARED' : available ? 'START' : m.live ? 'LOCKED' : 'PLANNED'}</i></button>`;
  }).join('')}</div>`;
  document.getElementById('actmapback').onclick = showStory;
  app.querySelectorAll('[data-actmission]:not(:disabled)').forEach(button => button.onclick = () => playAct1Mission(Number(button.dataset.actmission)));
}

function playAct1Mission(index) {
  const mission = ACT1_MISSIONS[index];
  const firstUncleared = ACT1_MISSIONS.findIndex(item => !META.missionClears[item.id]);
  if (!mission || !mission.live || (!META.missionClears[mission.id] && index !== firstUncleared)) return;
  const party = missionParty(mission);
  const complete = () => {
    chrome('hub'); renderNav('story'); showAct1MissionMap();
  };
  const showPost = () => mission.post && mission.post.length ? showDialogue(mission.post, complete, mission.scene) : complete();
  if (mission.type === 'story') {
    chrome('nonav');
    showDialogue(mission.pre || [{ sp: '', tx: mission.title }], () => settleCanonicalMission(mission, party, 'victory', { battleId: `story:${mission.id}:${saveId()}`, encounterId: null, victory: true }, showPost), mission.scene);
    return;
  }
  const fight = () => {
    chrome('battle');
    startBattle(mission.encounter || mission.id, party, (outcome, summary) => {
      if (outcome === 'victory') settleCanonicalMission(mission, party, outcome, summary, showPost);
      else { chrome('hub'); renderNav('story'); showAct1MissionMap(); }
    });
  };
  if (mission.pre && mission.pre.length) { chrome('nonav'); showDialogue(mission.pre, fight, mission.scene); }
  else fight();
}

/* ===============================================================
 *  PARTY
 * =============================================================== */
function roleShort(r) { return r ? r.toUpperCase() : ''; }
const UNIT_SPLASH_KEYS = {
  hale: 'hale_4star_splash_main',
  hale_awakened: 'hale_5star_splash_main',
  cinnia: 'cinnia_4star_splash_main',
  cinnia_5star: 'cinnia_5star_splash_main',
  katie: 'katie_5star_splash_main',
  tobin: 'tobin_4star_splash_main',
  hearthgar: 'hearthgar_4star_splash_main',
  brigga: 'brigga_3star_splash_main',
  marlowe: 'marlowe_4star_splash_main',
  brant: 'brant_4star_splash_main',
  milla: 'milla_4star_splash_main',
  nix: 'nix_3star_splash_main'
};
const UNIT_ICON_CROPS = {
  hale: [45.8, 29.9, 4.4, 0, 35],
  hale_awakened: [49, 22, 4.4, 0, 35],
  cinnia: [69.2, 23.3, 4.5, 0, 30],
  katie: [58.1, 25.4, 5.1, 0, 10],
  tobin: [46.5, 33.9, 4.4, 0, 35],
  hearthgar: [65.3, 30.8, 5.2, -10, 0],
  brigga: [54, 40, 4.5, 0, 30],
  marlowe: [52.7, 24.2, 4.7, 0, 40],
  brant: [57.5, 15.3, 5.1, -5, 10],
  milla: [51.3, 23.6, 4.3, 10, 20],
  nix: [52.9, 20.4, 4.85, 0, 15]
};
function unitSplashKey(key, awakened) {
  if (key === 'cinnia' && unitProgress(key).stars >= 5) return UNIT_SPLASH_KEYS.cinnia_5star;
  return key === 'hale' && awakened ? UNIT_SPLASH_KEYS.hale_awakened : UNIT_SPLASH_KEYS[key];
}
function unitSplashSource(key, awakened) {
  const splashKey = unitSplashKey(key, awakened);
  return typeof SPLASHART !== 'undefined' && splashKey && SPLASHART[splashKey] ? SPLASHART[splashKey] : null;
}
function unitIconHTML(key, awakened) {
  const splash = unitSplashSource(key, awakened);
  if (splash) {
    const cropKey = key === 'hale' && awakened ? 'hale_awakened' : key;
    const crop = UNIT_ICON_CROPS[cropKey] || [50, 24, 2];
    const tx = 50 - crop[0] * crop[2] + (crop[3] || 0), ty = 50 - crop[1] * crop[2] + (crop[4] || 0);
    return `<span class="port uniticon splashicon icon-${cropKey}"><img class="splash-icon" alt="" src="${splash}" style="--icon-tx:${tx}%;--icon-ty:${ty}%;--icon-zoom:${crop[2]}"></span>`;
  }
  const imageKey = awakened && key === 'hale' ? 'hale_awakened_library' : key;
  if (typeof PORTRAITS !== 'undefined' && PORTRAITS[imageKey]) return `<span class="port uniticon icon-${key}"><img alt="" src="${PORTRAITS[imageKey]}"></span>`;
  return sym(awakened && key === 'hale' ? 'p-hale-awk' : pid(key), 'port');
}
function partyPortraitHTML(key) {
  return unitIconHTML(key, key === 'hale' && META.haleAwakened);
}
function showParty() {
  META.stage = 'party';
  rememberOwnedUnits();
  app.innerHTML = `
    <div class="shead"><h2>Party</h2>${sigilPill()}</div>
    <div class="party-toolbar"><button id="editparty"><b>Edit Formation</b><span>${META.activeParty.length} / ${Engine.PARTY_SIZE} active</span></button><button class="library-open" id="openlibrary"><b>Unit Library</b><span>${Object.keys(META.libraryUnlocked).length} / ${Engine.UNIT_LIBRARY.length} pages discovered</span></button></div>
    <div class="pgrid">
      ${META.owned.map(k => {
        const t = Engine.UNITS[k]; const rank = META.ranks[k] || 0; const p = unitProgress(k);
        return `<button class="pcard e-${t.elem} ${k === 'hale' && META.haleAwakened ? 'hale-awakened' : ''} ${META.activeParty.includes(k) ? 'active-member' : ''}" data-key="${k}">
          ${META.activeParty.includes(k) ? `<span class="active-slot">SLOT ${META.activeParty.indexOf(k) + 1}</span>` : ''}
          ${partyPortraitHTML(k)}
          <div class="uname">${esc(t.name)}</div>
          <div class="urole">${roleShort(t.role)}</div>
          ${starsHTML(p.stars)}
          <div class="ulevel">Lv. ${p.level} / ${levelCap(p.stars)}</div>
          <div class="xpmini"><i style="width:${xpPercent(p)}%"></i><span>${xpText(p)}</span></div>
          <div class="rankpips">${[1,2,3,4,5].map(i => `<span class="rp ${i <= rank ? 'on' : ''}"></span>`).join('')}</div>
        </button>`;
      }).join('')}
    </div>`;
  app.querySelectorAll('.pcard').forEach(c => c.onclick = () => showUnitSheet(c.dataset.key, null, false));
  document.getElementById('editparty').onclick = showPartyEditor;
  document.getElementById('openlibrary').onclick = showUnitLibrary;
}

function showPartyEditor() {
  const selected = new Set(META.activeParty.filter(k => META.owned.includes(k)).slice(0, Engine.PARTY_SIZE));
  const draw = () => {
    app.innerHTML = `<div class="shead"><h2>Edit Formation</h2>${sigilPill()}</div><p class="small formation-note">Choose one to four units. Selection order becomes battlefield order.</p><div class="formation-slots">${[0,1,2,3].map(i => { const key = [...selected][i], t = key && Engine.UNITS[key]; return `<div class="formation-slot ${key ? 'filled e-' + t.elem : ''}"><b>${i + 1}</b><span>${key ? esc(t.name) : 'EMPTY'}</span></div>`; }).join('')}</div><div class="pgrid pick">${META.owned.map(k => { const t = Engine.UNITS[k]; return `<button class="pcard e-${t.elem} ${selected.has(k) ? 'picked' : ''}" data-party-pick="${k}">${partyPortraitHTML(k)}<div class="uname">${esc(t.name)}</div><div class="urole">${roleShort(t.role)}</div></button>`; }).join('')}</div><div class="formation-actions"><button id="saveparty" ${selected.size ? '' : 'disabled'}>Save Formation</button><button id="cancelparty">Cancel</button></div>`;
    app.querySelectorAll('[data-party-pick]').forEach(card => card.onclick = () => {
      const key = card.dataset.partyPick;
      if (selected.has(key)) selected.delete(key); else if (selected.size < Engine.PARTY_SIZE) selected.add(key); else return toast(`The active party can contain up to ${Engine.PARTY_SIZE} units.`);
      draw();
    });
    document.getElementById('saveparty').onclick = () => {
      const result = GameState.setActiveParty(captureSaveState(), [...selected]);
      if (!result.ok) return toast(result.message);
      applySaveState(result.state);
      if (!writeSave(true)) return toast('The party changed, but could not be saved.');
      showParty(); toast('Active party saved.');
    };
    document.getElementById('cancelparty').onclick = showParty;
  };
  draw();
}

function libraryPortraitId(entry) {
  return entry.form === 'awakened' && entry.key === 'hale' ? 'p-hale-awk' : 'p-' + entry.key;
}
function libraryPortraitHTML(entry, unlocked) {
  if (!unlocked) return sym(libraryPortraitId(entry), 'port');
  return unitIconHTML(entry.key, entry.form === 'awakened' && entry.key === 'hale');
}
function showUnitLibrary() {
  META.stage = 'library';
  rememberOwnedUnits();
  const found = Engine.UNIT_LIBRARY.filter(e => META.libraryUnlocked[e.id]).length;
  const filters = ['all', ...new Set(Engine.UNIT_LIBRARY.map(e => Engine.UNITS[e.key].elem))];
  app.innerHTML = `
    <div class="shead"><h2>Unit Library</h2>${sigilPill()}</div>
    <div class="library-intro"><button id="libraryback">← Party</button><div><b>${found} / ${Engine.UNIT_LIBRARY.length}</b><span>forms discovered</span></div></div>
    <p class="library-note">A unit remains recorded after discovery, even if it later leaves the active roster. Awakened and evolved forms receive separate pages.</p>
    <div class="library-controls"><div class="library-filters">${filters.map(elem => `<button type="button" class="${elem === 'all' ? 'on' : ''}" data-lib-filter="${elem}">${elem === 'all' ? 'All' : cap(elem)}</button>`).join('')}</div><button type="button" id="librarysort">Sort: Index</button></div>
    <div class="library-grid">${Engine.UNIT_LIBRARY.map((entry, index) => {
      const unlocked = !!META.libraryUnlocked[entry.id], t = Engine.UNITS[entry.key];
      return `<button class="libcard e-${t.elem} ${entry.key === 'hale' && entry.form === 'awakened' ? 'hale-awakened' : ''} ${unlocked ? 'unlocked' : 'locked'}" data-library="${entry.id}" data-lib-index="${index}" data-lib-stars="${t.stars}" data-lib-name="${esc(t.name)}" ${unlocked ? '' : 'disabled'} aria-label="${unlocked ? esc(t.name + (entry.form === 'awakened' ? ' ' + (entry.title || 'Awakened') : '')) : 'Undiscovered unit'}">
        <span class="libindex">${String(index + 1).padStart(3, '0')}</span>${libraryPortraitHTML(entry, unlocked)}
        <span class="libname">${unlocked ? esc(t.name) : '????'}</span>
        <span class="libform">${unlocked ? (entry.form === 'awakened' ? esc(entry.title || 'Awakened Form') : `${entry.stars}★ · ${esc(t.role)}`) : 'UNDISCOVERED'}</span>
      </button>`;
    }).join('')}</div>`;
  document.getElementById('libraryback').onclick = showParty;
  const grid = app.querySelector('.library-grid');
  let sortMode = 'index';
  const drawSort = () => {
    const cards = [...grid.querySelectorAll('[data-library]')];
    cards.sort((a, b) => sortMode === 'rarity' ? Number(b.dataset.libStars) - Number(a.dataset.libStars) || Number(a.dataset.libIndex) - Number(b.dataset.libIndex) : sortMode === 'name' ? a.dataset.libName.localeCompare(b.dataset.libName) : Number(a.dataset.libIndex) - Number(b.dataset.libIndex));
    cards.forEach(card => grid.appendChild(card));
  };
  const drawFilter = filter => grid.querySelectorAll('[data-library]').forEach(card => {
    card.hidden = filter !== 'all' && !card.classList.contains(`e-${filter}`);
  });
  app.querySelectorAll('[data-lib-filter]').forEach(button => button.onclick = () => {
    app.querySelectorAll('[data-lib-filter]').forEach(other => other.classList.toggle('on', other === button));
    drawFilter(button.dataset.libFilter);
  });
  document.getElementById('librarysort').onclick = () => {
    sortMode = sortMode === 'index' ? 'rarity' : sortMode === 'rarity' ? 'name' : 'index';
    document.getElementById('librarysort').textContent = `Sort: ${cap(sortMode)}`;
    drawSort();
  };
  drawSort();
  app.querySelectorAll('[data-library]:not(:disabled)').forEach(card => card.onclick = () => {
    const entry = Engine.UNIT_LIBRARY.find(e => e.id === card.dataset.library);
    if (entry) showUnitSheet(entry.key, entry.form === 'awakened' && entry.key === 'hale' ? 'awk' : 'base', true);
  });
}

function kitRowHTML(a, awk, role) {
  const gain = Math.round(Engine.LIVE_SKILL_GAIN[role] * 100);
  const cost = a.tier === 'Skill' ? `recast · +${gain} Arts` : `${a.cost * 100} Arts`;
  return `<div class="kitrow"><div class="tn"><b>${esc(a.name)}</b><span class="cost">${a.tier} · ${cost}</span></div>
    <div class="kd">${esc(a.desc || '')}</div></div>`;
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function launchTraining(featuredKey, returnToLibrary) {
  const party = [featuredKey, ...META.activeParty.filter(k => k !== featuredKey), ...META.owned.filter(k => k !== featuredKey)].filter((k, i, a) => Engine.UNITS[k] && a.indexOf(k) === i).slice(0, Engine.PARTY_SIZE);
  chrome('battle');
  startBattle('training', party, () => {
    go('party');
    if (returnToLibrary) showUnitLibrary();
  });
}
function showUnitAnimationPreview(key, requestedForm, returnToLibrary) {
  const spriteKey = key === 'hale' && requestedForm === 'awk' ? 'hale_awakened' : key;
  const sprite = typeof SPRITES !== 'undefined' && SPRITES[spriteKey];
  if (!sprite || !sprite.anims) { toast('No preview animations are available for this unit yet.'); return; }
  const order = ['idle', 'move', 'skill', 'attack', 'arts', 'burst', 'cast', 'hit', 'stagger', 'victory', 'defeat'];
  const labels = { idle: 'Idle', move: 'Move', skill: 'Skill', attack: 'Attack', arts: 'Arts', burst: 'Burst', cast: 'Cast', hit: 'Hit', stagger: 'Flinch', victory: 'Victory', defeat: 'Defeat' };
  const sameFrames = (a, b) => {
    const left = sprite.anims[a], right = sprite.anims[b];
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length && left.every((frame, index) => frame === right[index]);
  };
  // `attack` is a renderer compatibility alias for the combat Skill on the
  // current roster. Do not show a duplicate menu item when both arrays are
  // identical.
  const animations = order.filter(name =>
    sprite.anims[name] && !(name === 'attack' && sprite.anims.skill && sameFrames('attack', 'skill'))
  );
  let selected = animations[0], playing = true, playback = 1, startedAt = performance.now(), pausedAt = 0, raf = 0;
  chrome('nonav'); META.stage = 'animation-preview';
  app.innerHTML = `<div class="anim-preview"><div class="anim-preview-head"><button id="animback">← Unit Details</button><div><b>${esc(Engine.UNITS[key].name)}</b><span>Single-unit animation preview</span></div></div><div class="anim-stage"><canvas id="animcanvas" width="480" height="300" aria-label="${esc(Engine.UNITS[key].name)} animation preview"></canvas><div class="anim-label" id="animlabel">${labels[selected]}</div></div><div class="anim-menu">${animations.map(name => `<button data-preview-anim="${name}" class="${name === selected ? 'on' : ''}">${labels[name]}</button>`).join('')}</div><div class="anim-controls"><button id="animplay">Pause</button><button id="animspeed">Speed 1×</button></div><p class="anim-note">Only ${esc(Engine.UNITS[key].name)} is rendered. Choose an animation above to restart its preview.</p></div>`;
  const canvas = document.getElementById('animcanvas'), ctx = canvas.getContext('2d');
  const framesOf = name => { const def = sprite.anims[name]; return Array.isArray(def) ? def : def.frames; };
  let globalBounds = { w: 1, h: 1 };
  if (sprite.imageFrames) {
    // Image-frame sprites are data URLs, not character grids. Scanning them as
    // strings made every pixel appear occupied, performed millions of useless
    // comparisons, and shrank the preview dramatically. Use the documented
    // production scale and visible height instead.
    const authoredScale = Number.isFinite(sprite.renderScale) ? sprite.renderScale : 1;
    globalBounds.w = sprite.w * authoredScale;
    globalBounds.h = (sprite.sourceVisibleHeightPx || sprite.h) * authoredScale;
  } else {
    for (const name of animations) {
      let minX = sprite.w, maxX = -1, minY = sprite.h, maxY = -1;
      for (const frame of framesOf(name)) for (let y = 0; y < sprite.h; y++) for (let x = 0; x < sprite.w; x++) if (frame[y][x] !== '.') { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      globalBounds.w = Math.max(globalBounds.w, maxX - minX + 1);
      globalBounds.h = Math.max(globalBounds.h, maxY - minY + 1);
    }
  }
  function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height); grad.addColorStop(0, '#172238'); grad.addColorStop(1, '#080d15'); ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#25354b'; ctx.lineWidth = 1; for (let x = 0; x <= canvas.width; x += 24) { ctx.beginPath(); ctx.moveTo(x, 232); ctx.lineTo(x, 270); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(canvas.width, 250); ctx.stroke();
    const frames = framesOf(selected), fps = typeof spritePlaybackFps === 'function' ? spritePlaybackFps(spriteKey, selected) : 8;
    const elapsed = playing ? (now - startedAt) * playback : pausedAt;
    const frame = typeof animFrame === 'function' ? animFrame(spriteKey, selected, elapsed) : Math.floor(elapsed / (1000 / fps)) % frames.length;
    const scale = Math.min(1.8, (canvas.width * 0.82) / globalBounds.w, (canvas.height * 0.72) / globalBounds.h);
    drawSprite(ctx, spriteKey, selected, frame, canvas.width / 2, 252, scale, false);
    raf = requestAnimationFrame(draw);
  }
  app.querySelectorAll('[data-preview-anim]').forEach(button => button.onclick = () => {
    selected = button.dataset.previewAnim; startedAt = performance.now(); pausedAt = 0; playing = true;
    app.querySelectorAll('[data-preview-anim]').forEach(b => b.classList.toggle('on', b === button));
    document.getElementById('animlabel').textContent = labels[selected]; document.getElementById('animplay').textContent = 'Pause';
  });
  document.getElementById('animplay').onclick = () => { if (playing) { pausedAt = (performance.now() - startedAt) * playback; playing = false; } else { startedAt = performance.now() - pausedAt / playback; playing = true; } document.getElementById('animplay').textContent = playing ? 'Pause' : 'Play'; };
  document.getElementById('animspeed').onclick = () => { const speeds = [0.5, 1, 1.5]; playback = speeds[(speeds.indexOf(playback) + 1) % speeds.length]; startedAt = performance.now(); pausedAt = 0; document.getElementById('animspeed').textContent = `Speed ${playback}×`; };
  document.getElementById('animback').onclick = () => { cancelAnimationFrame(raf); chrome('hub'); renderNav('party'); if (returnToLibrary) showUnitLibrary(); else showParty(); showUnitSheet(key, requestedForm, returnToLibrary); };
  raf = requestAnimationFrame(draw);
}
function showUnitSheet(key, requestedForm, returnToLibrary) {
  const t = Engine.UNITS[key];
  const rarity = Engine.UNIT_PROGRESSION[key];
  let progress = unitProgress(key);
  const isHale = key === 'hale';
  let form = requestedForm || (isHale && progress.stars >= 5 ? 'awk' : 'base');
  const sheet = document.createElement('div');
  sheet.className = `sheet e-${t.elem}`;
  function draw() {
    progress = unitProgress(key);
    const awk = form === 'awk';
    const portId = awk ? 'p-hale-awk' : 'p-' + key;
    const splash = unitSplashSource(key, awk);
    const specials = awk ? Engine.HALE_AWAKENED.specials : t.specials;
    const passiveDef = awk ? Engine.HALE_AWAKENED.passive : t.passive;
    const passive = passiveDef ? [passiveDef.name, passiveDef.desc] : ['', ''];
    const combat = Engine.combatProfile(key, progress);
    const atk = Math.round((awk ? Engine.HALE_AWAKENED.basicMain : t.basic.d) * combat.powerScale);
    sheet.className = `sheet e-${awk ? 'hollow' : t.elem}`;
    sheet.innerHTML = `
      <button class="closebtn" id="sheetclose" aria-label="Close unit details" title="Close">×</button>
      <div class="hero ${splash ? 'splash-hero' : ''}">${splash ? `<img class="heroimg splash-master" alt="" src="${splash}">` : ((typeof PORTRAITS !== 'undefined' && (awk ? PORTRAITS['hale_awakened'] : PORTRAITS[key])) ? `<img class="heroimg" alt="" src="${awk ? PORTRAITS['hale_awakened'] : PORTRAITS[key]}">` : sym(portId, 'port'))}</div>
      <div class="nm"><h2>${esc(t.name)}</h2><div class="ep">${esc(t.epithet || '')}</div></div>
      <div class="quote">${esc(QUOTES[key] || '')}</div>
      <div class="chiprow">
        <span class="tagchip el">${Engine.ELEM_ICON[awk ? 'hollow' : t.elem]} ${awk ? 'Hollow' : cap(t.elem)}</span>
        <span class="tagchip">${esc(t.role)}</span>
        ${starsHTML(progress.stars)}
        <span class="tagchip">Lv. ${progress.level} / ${levelCap(progress.stars)}</span>
        ${awk ? '<span class="tagchip">Awakened</span>' : ''}
      </div>
      <div class="sheet-tools"><button id="testunit">Test Animations</button><label>Auto AI<select id="aipreset">${Object.values(Engine.AI_PRESETS).map(preset => `<option value="${preset.id}" ${((META.unitAI[key] || {}).preset || 'balanced') === preset.id ? 'selected' : ''}>${esc(preset.name)}</option>`).join('')}</select></label></div>
      <div class="statline">
        <div class="st"><b>${combat.maxhp}</b><span>HP</span></div>
        <div class="st"><b>${atk}</b><span>${awk ? 'Blade ATK' : 'ATK'}</span></div>
        <div class="st"><b>${awk ? '7' : (specials.length + 1)}</b><span>${awk ? 'Blade Cap' : 'Actions'}</span></div>
      </div>
      <div class="unit-xp"><div><span>Experience</span><b>${xpText(progress)}</b></div><i><em style="width:${xpPercent(progress)}%"></em></i></div>
      ${isHale ? `<div class="formtabs">
        <button class="${form === 'base' ? 'on' : ''}" data-form="base">Adventurer</button>
        <button class="${form === 'awk' ? 'on' : ''}" data-form="awk">UnHollowed${progress.stars >= 5 ? '' : ' 🔒'}</button>
      </div>` : ''}
      ${evolutionPanelHTML(key)}
      <div class="kit">
        <h3>Passive</h3>
        <div class="kitrow passive"><div class="tn"><b>${esc(passive[0])}</b></div><div class="kd">${esc(passive[1])}</div></div>
        <h3>Combat Rhythm</h3>
        <div class="kitrow"><div class="tn"><b>Energy Cycle</b><span class="cost">Skill → Arts → Burst</span></div><div class="kd">Skills restore Arts Energy. Arts cost 200; Bursts cost 300. Defender abilities may apply Guarded and intercept attacks for allies.</div></div>
        <h3>Specials</h3>
        ${specials.map(a => kitRowHTML(a, awk, t.role)).join('')}
      </div>`;
    sheet.querySelector('#sheetclose').onclick = () => sheet.remove();
    sheet.querySelector('#testunit').onclick = () => { sheet.remove(); showUnitAnimationPreview(key, form, returnToLibrary); };
    sheet.querySelector('#aipreset').onchange = event => {
      const result = GameState.setAIPreset(captureSaveState(), key, event.target.value);
      if (!result.ok) { toast(result.message); draw(); return; }
      applySaveState(result.state); writeSave(true); toast(`${t.name} AI: ${Engine.AI_PRESETS[event.target.value].name}.`);
    };
    const evolve = sheet.querySelector('#evolveunit');
    if (evolve) evolve.onclick = () => { if (evolveUnit(key)) { form = key === 'hale' ? 'awk' : 'base'; draw(); } };
    if (isHale) sheet.querySelectorAll('.formtabs button').forEach(b => b.onclick = () => {
      if (b.dataset.form === 'awk' && progress.stars < 5) { toast("Hale's 5★ UnHollowed form unlocks automatically during Chapter Six."); return; }
      form = b.dataset.form; draw();
    });
  }
  draw();
  app.appendChild(sheet);
}

function evolutionPanelHTML(key) {
  const cfg = Engine.UNIT_PROGRESSION[key], p = unitProgress(key), evo = cfg.evolution;
  if (!evo || p.stars >= cfg.maxStars) {
    return `<section class="evolution-panel capped"><div><b>Current Cap</b><span>${p.stars}★ · Lv. ${levelCap(p.stars)}</span></div><p>No further evolution is currently designated for this unit.</p></section>`;
  }
  if (evo.forcedStory) {
    return `<section class="evolution-panel story-evolution"><div><b>Story Awakening</b><span>${p.stars}★ → ${evo.toStars}★</span></div><p>${esc(evo.name)} occurs automatically during Chapter Six and permanently unlocks Hale's true kit. This evolution requires no levels or materials.</p><button disabled>Awakens in Chapter Six</button></section>`;
  }
  const maxed = p.level >= levelCap(p.stars);
  const unlocked = !evo.unlock || !!META.evolutionUnlocks[key];
  const mats = Object.entries(evo.materials || {}).map(([id, need]) => {
    const have = META.challengeItems[id] || 0;
    return `<li class="${have >= need ? 'met' : ''}"><span>${esc(MATERIAL_NAMES[id] || id)}</span><b>${have} / ${need}</b></li>`;
  }).join('');
  const status = evo.planned ? 'Planned Evolution' : `${p.stars}★ → ${evo.toStars}★ Evolution`;
  return `<section class="evolution-panel">
    <div><b>${status}</b><span>${esc(evo.name)}</span></div>
    <ul><li class="${maxed ? 'met' : ''}"><span>Reach max level</span><b>Lv. ${p.level} / ${levelCap(p.stars)}</b></li>${mats}</ul>
    ${evo.unlock ? `<p class="${unlocked ? 'metnote' : ''}">${unlocked ? 'Recipe unlocked.' : 'Clear the Ember Trial to reveal this recipe.'}</p>` : ''}
    <p>Earn the required materials on the Challenge map.</p>
    <button id="evolveunit" ${evolutionReady(key) ? '' : 'disabled'}>${evo.planned ? 'Planned for a Later Update' : `Evolve to ${evo.toStars}★`}</button>
  </section>`;
}

/* ===============================================================
 *  SUMMON — banner, card-flip reveal, disabled when unaffordable
 * =============================================================== */
function summonArtHTML(key) {
  return unitIconHTML(key, key === 'hale' && META.haleAwakened);
}
function showSummon() {
  if (!META.featureUnlocks.summon) { toast('Summoning unlocks after mission 1-9: The Still Basin.'); return showHome(); }
  META.stage = 'summon';
  const banner = Engine.BANNERS.standard, family = META.summonState.standard;
  const featuredSplash = unitSplashSource(banner.featured, false), pityPct = Math.min(100, Math.round(family.pullsSinceFourStar / banner.guaranteeAt * 100));
  app.innerHTML = `
    <div class="shead"><h2>Summon</h2>${sigilPill()}</div>
    <div class="sumbanner hr-kit-panel">
      <div class="glow"></div>
      <span class="hr-kit-eyebrow">Featured Reflection</span>
      <h3>The Still Basin</h3>
      ${featuredSplash ? `<div class="summon-hero"><img alt="Featured ${esc(Engine.UNITS[banner.featured].name)}" src="${featuredSplash}"><div class="summon-hero-copy"><span>REFLECTION RATE UP</span><b>${esc(Engine.UNITS[banner.featured].name)}</b></div></div>` : ''}
      <div class="hr-kit-orbit"><div class="featrow">${summonArtHTML(banner.featured)}</div></div>
      <div class="hr-kit-legend"><span class="hr-kit-chip">${esc(Engine.UNITS[banner.featured].name)}</span><span class="hr-kit-chip">${esc(Engine.UNITS[banner.featured].role)}</span></div>
      <div class="summon-pity"><span>Pity counter</span><i><em style="width:${pityPct}%"></em></i><b>${family.pullsSinceFourStar}/${banner.guaranteeAt}</b></div>
      <p class="small">4★ rate: 25% · guaranteed within <b>${banner.guaranteeAt - family.pullsSinceFourStar}</b> pulls · featured: ${esc(Engine.UNITS[banner.featured].name)}. Max-rank duplicates become <b class="gold">Glass Dust</b> (${META.glassDust}).</p>
    </div>
    <div class="pullrow">
      <button id="pull1">Summon ×1<b>10 ◈</b></button>
      <button id="pull10">Summon ×10<b>90 ◈</b></button>
    </div>
    <div class="summon-stage" id="stage"><span class="small" style="color:var(--faint)">The basin of still water waits.</span></div>
    <div class="small summon-history">History: ${META.summonHistory.slice(-10).reverse().map(x => esc(Engine.UNITS[x.unitId].name)).join(' · ') || 'None yet'}</div>`;
  const stage = document.getElementById('stage');
  const b1 = document.getElementById('pull1'), b10 = document.getElementById('pull10');
  let pulling = false;
  function afford() { b1.disabled = pulling || META.sigils < 10; b10.disabled = pulling || META.sigils < 90; }
  afford();
  function doPulls(n) {
    if (pulling) return;
    pulling = true; afford();
    const result = GameState.performSummon(captureSaveState(), 'standard', n, Math.random, { transactionId: `summon:standard:${Date.now()}` });
    if (!result.ok) { pulling = false; afford(); toast(result.message); return; }
    applySaveState(result.state); refreshSigils(); afford(); writeSave(true);
    stage.innerHTML = '';
    stage.classList.toggle('multi', n > 1);
    stage.classList.add('revealing');
    result.rewards.forEach((reward, i) => {
      const key = reward.unitId;
      const t = Engine.UNITS[key];
      const card = document.createElement('div');
      card.className = `pullcard e-${t.elem}`;
      card.innerHTML = `<div class="pullinner">
          <div class="pullface pullback"></div>
          <div class="pullface pullfront">
            <div class="summon-art raysin">${summonArtHTML(key)}</div>
            <div class="summon-caption"><div class="uname">${esc(t.name)}</div><div class="urole">${roleShort(t.role)}</div><div class="pullrank">${reward.newUnit ? 'NEW' : reward.dust ? `+${reward.dust} Glass Dust` : '✦'.repeat(reward.rank)}</div></div>
          </div>
        </div>`;
      stage.appendChild(card);
      setTimeout(() => card.classList.add('flipped'), 420 + i * 320);
    });
    setTimeout(() => { stage.classList.remove('revealing'); pulling = false; afford(); }, 900 + result.rewards.length * 320);
  }
  b1.onclick = () => doPulls(1);
  b10.onclick = () => doPulls(10);
}

/* ===============================================================
 *  TOWN — the Guild Hall as a scene with tappable hotspots
 * =============================================================== */
const TOBIN_FORTUNES = [
  '“The water says: guard the turn before the big one. It always says that.”',
  '“Someone will miscount their herd. Someone always does.”',
  '“A long coat is closer than it was yesterday.”',
  '“Break the bar before it breaks you. The tide agrees.”',
];
function showTownLegacy() {
  META.stage = 'town';
  let fortune = 0;
  app.innerHTML = `
    <div class="shead"><h2>Guild Hall</h2>${sigilPill()}</div>
    <div class="townscene">
      ${sym('sc-hall', 'scene')}
      <div class="townshade"></div>
      <button class="hotspot" data-spot="kitchen" style="left:27%; top:64%;"><span class="dot"></span><span class="hlabel">Cinnia’s Kitchen</span></button>
      <button class="hotspot" data-spot="board" style="left:12%; top:38%;"><span class="dot"></span><span class="hlabel">Mission Board</span></button>
      <button class="hotspot" data-spot="tobin" style="left:88%; top:70%;"><span class="dot"></span><span class="hlabel">Tobin’s Corner</span></button>
      <button class="hotspot" data-spot="notice" style="left:42%; top:34%;"><span class="dot"></span><span class="hlabel">Notice Board</span></button>
    </div>
    <div class="townhint">Tap a glowing point.</div>
    <div class="towndlg" id="towndlg"></div>`;
  const dlg = document.getElementById('towndlg');
  function say(who, line) { dlg.innerHTML = `<div class="vignette"><div class="who">${esc(who)}</div><div class="say">${esc(line)}</div></div>`; }
  app.querySelectorAll('.hotspot').forEach(h => h.onclick = () => {
    const s = h.dataset.spot;
    if (s === 'kitchen') say('Cinnia', '“Sit. Eat. You fight better when the pot’s empty and you’re not.”');
    else if (s === 'board') { say('Mission Board', 'Contracts, pinned three deep. → Opening the Story ledger…'); setTimeout(() => go('story'), 650); }
    else if (s === 'tobin') { say('Tobin', TOBIN_FORTUNES[fortune % TOBIN_FORTUNES.length]); fortune++; }
    else if (s === 'notice') say('Notice', 'A fresh bill over the old ones: “ANSEL RETURNS SOON.” Nobody remembers pinning it.');
  });
}

/* ===============================================================
 *  DIALOGUE — restyled card with a scene banner
 * =============================================================== */
function showChallengeResults(challengeId, settlement) {
  const cfg = Engine.CHALLENGES[challengeId];
  chrome('nonav');
  const rewards = settlement.rewards.map(r => `<li><b>${r.type === 'gold' ? 'Gold' : esc(MATERIAL_NAMES[r.id] || r.id)}</b><span>+${r.quantity}${r.mastery ? ' · Mastery' : ''}</span></li>`).join('') || '<li><span>Rewards already settled.</span></li>';
  app.innerHTML = `<div class="reward-screen"><h1>Challenge Cleared</h1><h2>${esc(cfg.name)}</h2><ul>${rewards}</ul><div class="hubrow"><button id="challengeretry">Retry</button><button id="challengecontinue">Challenge Map</button></div></div>`;
  document.getElementById('challengeretry').onclick = () => launchChallenge(challengeId);
  document.getElementById('challengecontinue').onclick = showChallengeMap;
}
function launchChallenge(challengeId) {
  const cfg = Engine.CHALLENGES[challengeId];
  if (!Engine.challengeUnlocked(captureSaveState(), challengeId)) { toast('This Challenge is still locked.'); return; }
  const attempt = GameState.recordTelemetry(captureSaveState(), { event: 'challenge_attempt', challengeId });
  if (attempt.ok) { applySaveState(attempt.state); writeSave(true); }
  startBattle(cfg.encounterId, META.activeParty, (outcome, summary) => {
    if (outcome !== 'victory') {
      const result = GameState.recordTelemetry(captureSaveState(), Object.assign({ event: 'challenge_result', challengeId, outcome }, summary || {}));
      if (result.ok) { applySaveState(result.state); writeSave(true); }
      showChallengeMap(); return;
    }
    const settlement = GameState.completeChallenge(captureSaveState(), challengeId, summary);
    if (!settlement.ok) {
      const failure = GameState.recordTelemetry(captureSaveState(), { event: 'challenge_settlement_failed', challengeId, outcome: settlement.errorCode });
      if (failure.ok) { applySaveState(failure.state); writeSave(true); }
      toast(settlement.message); showChallengeMap(); return;
    }
    applySaveState(settlement.state); writeSave(true); showChallengeResults(challengeId, settlement);
  });
}
function showChallengeMap() {
  META.stage = 'challenge'; chrome('nonav');
  const cards = Object.values(Engine.CHALLENGES).map(cfg => {
    const unlocked = Engine.challengeUnlocked(captureSaveState(), cfg.id), progress = META.challengeProgress[cfg.id] || { clearCount: 0, mastery: {} };
    const repeat = Object.entries(cfg.repeatClear.items || {}).map(([id, n]) => `${n} ${MATERIAL_NAMES[id] || id}`).join(', ');
    const mastery = cfg.mastery.map(x => `${progress.mastery[x.id] ? '✓' : '○'} ${x.name}`).join(' · ');
    return `<button class="quest-preview" data-challenge="${cfg.id}" ${unlocked ? '' : 'disabled'}><div><b>${esc(cfg.name)}</b><span>${esc(cfg.description)}</span><span>Clears: ${progress.clearCount} · Repeat: ${esc(repeat)} · ${esc(mastery)}</span></div><i>${unlocked ? 'ENTER' : 'LOCKED'}</i></button>`;
  }).join('');
  app.innerHTML = `<div class="shead"><h2>Challenge Map</h2><button id="challengeback">Back</button></div><div class="story-map-list">${cards}</div><div class="market-balance"><b>${META.challengeItems.challenge_essence || 0}</b><span>Challenge Essence</span></div>`;
  document.getElementById('challengeback').onclick = () => { chrome('hub'); renderNav('town'); showTown(); };
  app.querySelectorAll('[data-challenge]').forEach(button => button.onclick = () => launchChallenge(button.dataset.challenge));
}

function showTown() {
  META.stage = 'town';
  let talkIndex = 0;
  app.innerHTML = `
    <div class="shead"><h2>Castle Town</h2>${sigilPill()}</div>
    <div class="townscene">
      ${sym('sc-town', 'scene')}
      <div class="townshade"></div>
      <button class="hotspot castle" data-spot="castle" style="left:51%; top:22%;"><span class="dot"></span><span class="hlabel">Adventurer's Garrison</span></button>
      <button class="hotspot inn" data-spot="inn" style="left:22%; top:52%;"><span class="dot"></span><span class="hlabel">The Wayfarer's Inn</span></button>
      <button class="hotspot quest" data-spot="quest" style="left:31%; top:77%;"><span class="dot"></span><span class="hlabel">Quest Board</span></button>
      <button class="hotspot market" data-spot="market" style="left:79%; top:56%;"><span class="dot"></span><span class="hlabel">Market</span></button>
      <button class="hotspot yard" data-spot="yard" style="left:68%; top:82%;"><span class="dot"></span><span class="hlabel">Training Yard</span></button>
    </div>
    <div class="townhint">Choose a building or gathering place.</div>
    <div class="townpanel hr-kit-panel" id="townpanel"></div>`;
  const panel = document.getElementById('townpanel');
  const panelHead = (eyebrow, title, copy) => `<div class="town-eyebrow">${esc(eyebrow)}</div><h3>${esc(title)}</h3><p>${esc(copy)}</p>`;
  function openCastle() {
    panel.innerHTML = panelHead('Castle District', "Adventurer's Garrison", 'The campaign map and crown-sanctioned story missions are coordinated here.') + `<div class="town-actions"><button class="bigbtn" id="townstory">Open Story Missions</button><button class="bigbtn" id="townchallenge">Challenge Map</button></div>`;
    document.getElementById('townstory').onclick = () => go('story');
    document.getElementById('townchallenge').onclick = showChallengeMap;
  }
  function openInn() {
    panel.innerHTML = panelHead('Inn District', "The Wayfarer's Inn", 'Recruit new allies, manage the party, or spend a quiet moment with someone already in the guild.') + `<div class="town-actions"><button id="townsummon">Summon</button><button id="townparty">Party</button><button id="townlibrary">Unit Library</button><button id="towntalk">Talk</button></div><div class="town-talk" id="towntalkbox">The common room is warm, busy, and very nearly peaceful.</div>`;
    document.getElementById('townsummon').onclick = () => go('summon');
    document.getElementById('townparty').onclick = () => go('party');
    document.getElementById('townlibrary').onclick = () => { go('party'); showUnitLibrary(); };
    document.getElementById('towntalk').onclick = () => {
      const keys = META.owned.filter(k => QUOTES[k]);
      const key = keys[talkIndex++ % keys.length];
      document.getElementById('towntalkbox').innerHTML = `<b>${esc(Engine.UNITS[key].name)}</b><span>${esc(QUOTES[key])}</span>`;
    };
  }
  function openBoard() {
    panel.innerHTML = panelHead('Outside the Inn', 'Quest Board', 'Local contracts, character missions, and the guild training grounds are posted here.') + `<button class="quest-preview training-contract" id="traininggrounds"><div><b>Training Grounds</b><span>Practice Map · No rewards · Infinite-HP dummy</span></div><i>OPEN</i></button><div class="quest-preview"><div><b>Missing Caravan</b><span>Side Mission · Coming Soon</span></div><i>LOCKED</i></div><div class="quest-preview"><div><b>A Cook's Errand</b><span>Character Mission · Coming Soon</span></div><i>LOCKED</i></div>`;
    document.getElementById('traininggrounds').onclick = () => launchTraining(META.owned[0] || 'hale', false);
  }
  function openMarket() {
    const tier = Engine.marketRestockTier(captureSaveState()), purchases = META.marketState.tier === tier ? META.marketState.purchases : {};
    const targetOptions = META.owned.map(key => `<option value="${key}">${esc(Engine.UNITS[key].name)} · Lv. ${unitProgress(key).level}</option>`).join('');
    const items = Object.values(Engine.MARKET_ITEMS).map(item => {
      const unlocked = Engine.marketItemUnlocked(captureSaveState(), item.id), bought = purchases[item.id] || 0, remaining = item.limit - bought;
      return `<div class="quest-preview"><div><b>${esc(item.name)}</b><span>${esc(item.description)}</span><span>${item.price.toLocaleString()} Gold · ${remaining}/${item.limit} remaining</span></div><button data-market-buy="${item.id}" ${!unlocked || !remaining || META.gold < item.price ? 'disabled' : ''}>${unlocked ? (remaining ? 'Buy' : 'Sold Out') : 'Locked'}</button></div>`;
    }).join('');
    const ledger = META.economyLedger.slice(-5).reverse().map(x => `<div><b>${esc(x.type.replace(/_/g, ' '))}</b><span>${x.gold ? `${x.gold > 0 ? '+' : ''}${x.gold} Gold` : `${x.quantity > 0 ? '+' : ''}${x.quantity} ${esc(MATERIAL_NAMES[x.itemId] || x.itemId)}`}</span></div>`).join('') || '<div><span>No transactions yet.</span></div>';
    panel.innerHTML = panelHead('Merchant Row', 'Market', `Stock refreshes when story progression advances. Current restock tier: ${tier}.`) + `<div class="market-balance"><i class="coin"></i><b>${META.gold.toLocaleString()}</b><span>Gold on hand</span></div><label class="market-target">Training recipient <select id="markettarget">${targetOptions}</select></label>${items}<h4>Recent Economy Ledger</h4><div class="training-list">${ledger}</div>`;
    panel.querySelectorAll('[data-market-buy]').forEach(button => button.onclick = () => {
      const result = GameState.purchaseMarketItem(captureSaveState(), button.dataset.marketBuy, document.getElementById('markettarget').value, { transactionId: saveId() });
      if (!result.ok) { toast(result.message); return; }
      applySaveState(result.state); writeSave(true); toast('Purchase complete.'); openMarket();
    });
  }
  function openYard() {
    const roster = META.owned.map(k => { const p = unitProgress(k); return `<div><b>${esc(Engine.UNITS[k].name)}</b><span>Lv. ${p.level} · ${xpText(p)}</span></div>`; }).join('');
    panel.innerHTML = panelHead('Lower Ward', 'Training Yard', 'Review the experience and level progress earned by your active guild members.') + `<div class="training-list">${roster}</div><button id="townparty2">View Full Party</button>`;
    document.getElementById('townparty2').onclick = () => go('party');
  }
  const openers = { castle: openCastle, inn: openInn, quest: openBoard, market: openMarket, yard: openYard };
  app.querySelectorAll('.hotspot').forEach(h => h.onclick = () => {
    app.querySelectorAll('.hotspot').forEach(x => x.classList.toggle('selected', x === h));
    openers[h.dataset.spot]();
  });
  openCastle();
}

function showDialogue(scenes, done, sceneId) {
  chrome('nonav');
  let i = 0;
  const chapterLine = (scenes[0] && scenes[0].ch !== undefined) ? scenes[0].ch : '';
  const lines = scenes.filter(s => s.tx);
  function render() {
    const s = lines[i];
    app.innerHTML = `
      <div class="dlg-wrap"><div class="dlg-card" id="dlgcard">
        <button class="dlg-skip" id="dlgskip">Skip ⏭</button>
        <div class="dlg-scene">${sceneId ? sym(sceneId, 'scene') : ''}</div>
        <div class="dlg-body">
          ${chapterLine ? `<div class="dlg-chapter">${esc(chapterLine)}</div>` : ''}
          <div class="dlg-srow">${chatHeadHTML(portraitKeyFor(s.sp))}<div class="dlg-speaker">${s.sp ? esc(s.sp) : '&nbsp;'}</div></div>
          <div class="dlg-text">${esc(s.tx)}</div>
          <div class="dlg-hint"><span>${i + 1} / ${lines.length}</span><button type="button" class="dlg-next" id="dlgnext">Continue ▸</button></div>
        </div>
      </div></div>`;
    const card = document.getElementById('dlgcard');
    const advance = () => {
      if (++i >= lines.length) done(); else render();
    };
    card.onclick = (e) => {
      if (e.target.closest('button')) return;
      advance();
    };
    document.getElementById('dlgnext').onclick = (e) => { e.stopPropagation(); advance(); };
    document.getElementById('dlgskip').onclick = (e) => { e.stopPropagation(); done(); };
  }
  render();
}

/* ===============================================================
 *  STORY FLOW — play a step, then land back in the hub
 * =============================================================== */
function grantQuestRewards(key, partyKeys, firstClear) {
  const cfg = Engine.BATTLES[key];
  const table = cfg.rewards[firstClear ? 'first' : 'repeat'];
  const reward = { key, title: cfg.title, firstClear, gold: table.gold, xp: table.xp, sigils: firstClear ? cfg.sigils : 0, units: [] };
  META.gold += reward.gold;
  META.sigils += reward.sigils;
  for (const unitKey of [...new Set(partyKeys)].filter(k => Engine.UNITS[k])) {
    const p = unitProgress(unitKey);
    const result = Engine.grantUnitXP(p, reward.xp);
    reward.units.push(Object.assign({ key: unitKey, name: Engine.UNITS[unitKey].name }, result));
  }
  writeSave(true);
  return reward;
}
function showQuestRewards(reward, done) {
  chrome('nonav'); META.stage = 'rewards';
  app.innerHTML = `<div class="reward-screen">
    <div class="reward-kicker">${reward.firstClear ? 'QUEST CLEARED · FIRST CLEAR' : 'QUEST CLEARED · REPEAT'}</div>
    <h2>${esc(reward.title)}</h2>
    <div class="reward-currency"><div><i class="coin"></i><b>${reward.gold}</b><span>Gold</span></div><div><b class="xpmark">XP</b><strong>${reward.xp}</strong><span>Each Unit</span></div>${reward.sigils ? `<div>${sym('i-sigil')}<b>${reward.sigils}</b><span>Guild Sigils</span></div>` : ''}</div>
    <div class="reward-units">${reward.units.map(u => {
      const p = unitProgress(u.key);
      return `<div class="reward-unit">${sym(pid(u.key), 'port')}<div><b>${esc(u.name)}</b><span>Lv. ${u.beforeLevel} → ${u.level}</span><div class="reward-xpbar"><i style="width:${xpPercent(p)}%"></i></div><small>${xpText(p)}</small></div>${u.levelsGained ? `<em>LEVEL UP${u.levelsGained > 1 ? ' ×' + u.levelsGained : ''}</em>` : (u.maxed ? '<em>MAX</em>' : '')}</div>`;
    }).join('')}</div>
    <button id="rewardcontinue" class="bigbtn">Continue</button>
  </div>`;
  document.getElementById('rewardcontinue').onclick = done;
}
function finishQuest(key, partyKeys, firstClear, result, done) {
  if (result === 'defeat' || result === 'exit') { done(result); return; }
  const reward = grantQuestRewards(key, partyKeys, firstClear);
  showQuestRewards(reward, () => done(result, reward));
}

function playStep(i) {
  const s = STEPS[i];
  if (!s) return go('home');
  if (s.kind === 'interlude') return showDialogue(interludeScenes(), showInterlude, s.scene);
  const start = () => {
    if (s.pickSquad) return showSquadPicker();
    chrome('battle');
    const AFTERS = { afterCh1, afterCh2, afterCh3, afterCh6 };
    const handler = AFTERS[s.after];
    if (!handler) { window.__errToast && window.__errToast('missing after-handler: ' + s.after); return go('home'); }
    startBattle(s.id, s.party, result => {
      finishQuest(s.id, s.party, true, result, finalResult => {
        if (finalResult === 'defeat' || finalResult === 'exit') return go('home');
        handler(finalResult);
      });
    });
  };
  if (s.dlg) showDialogue(STORY[s.dlg], start, s.scene); else start();
}
function replayStep(i) {
  const s = STEPS[i];
  if (s.kind === 'interlude') { showDialogue(interludeScenes(), () => go('story'), s.scene); return; }
  const back = () => go('story');
  const start = () => {
    if (s.pickSquad) return showSquadPicker(back);
    chrome('battle');
    startBattle(s.id, s.party, result => finishQuest(s.id, s.party, false, result, back));
  };
  if (s.dlg) showDialogue(STORY[s.dlg], start, s.scene); else start();
}
function interludeScenes() {
  return [{ ch: 'Chapters Four & Five — The Spreading' },
    { sp: '', tx: 'Outbreaks bloom across Vessia — the first leaks nobody caught.' },
    { sp: '', tx: 'The guild grows to meet them.' }];
}

/* the Ch.1→2→3 sigil awards + recruitment gates, now returning to the hub */
function afterCh1() {
  META.storyStep = Math.max(META.storyStep, 1);
  go('home');
}
function afterCh2() {
  // Legacy adapter only: canonical mission settlement owns recruitment. Never
  // replace the roster here, or summons acquired before replay would vanish.
  rememberOwnedUnits();
  META.storyStep = Math.max(META.storyStep, 2);
  go('home');
}
function afterCh3() {
  META.storyStep = Math.max(META.storyStep, 3);
  showDialogue(STORY.scar, () => go('home'), 'sc-seam');
}
function afterCh6() {
  const evolved = grantHaleStoryEvolution(); // idempotent fallback for migrated or replayed saves
  META.storyStep = Math.max(META.storyStep, 5);
  writeSave(true);
  const victory = () => showDialogue(STORY.victory, showCredits, 'sc-arena');
  if (evolved) showHaleEvolutionReveal(victory); else victory();
}

function showHaleEvolutionReveal(done) {
  chrome('nonav'); META.stage = 'evolution';
  const art = typeof PORTRAITS !== 'undefined' && PORTRAITS.hale_awakened;
  app.innerHTML = `<div class="evo-reveal">
    <div class="evo-ring"></div>
    <div class="evo-shards"><i></i><i></i><i></i><i></i></div>
    <div class="evo-kicker">STORY AWAKENING</div>
    <h2>Hale, the Unhollowed</h2>
    <div class="evo-art">${art ? `<img alt="Hale's five-star UnHollowed form" src="${art}">` : sym('p-hale-awk', 'port')}</div>
    <div class="evo-stars"><span>★★★★</span><b>→</b><strong>★★★★★</strong></div>
    <p>Dark power answers the scar. Hollowglass takes shape inside it.</p>
    <div class="evo-unlocks"><span>UnHollowed Kit</span><span>True Kit Unlocked</span><span>5★ Library Page</span></div>
    <button class="bigbtn" id="evocontinue">Continue</button>
  </div>`;
  document.getElementById('evocontinue').onclick = done;
}

/* interlude screen — recruit the back half of the roster, then advance */
function showInterlude() {
  chrome('nonav');
  META.stage = 'interlude';
  // The old interlude used to grant the entire roster. Recruitment now comes
  // only from canonical mission rewards; this screen is presentation-only.
  rememberOwnedUnits();
  META.storyStep = Math.max(META.storyStep, 4);
  app.innerHTML = `
    <div class="panelbox fadein-slow" style="margin:26px 12px;">
      <div class="dlg-chapter">Chapters Four &amp; Five — The Spreading</div>
      <p class="small" style="margin-bottom:6px;">Outbreaks bloom across Vessia — the first leaks nobody caught. The guild grows to meet them.</p>
      ${VIGNETTES.map(v => `<div class="vignette"><div class="who">${esc(v.who)}</div><div class="say">${esc(v.say)}</div></div>`).join('')}
      <p class="small" style="margin:14px 0 16px;">Story quests award fixed Gold and experience, with Guild Sigils reserved for first clears. The Inn is open for summons and party services.</p>
      <button id="tohub" class="bigbtn">To Castle Town</button>
    </div>`;
  document.getElementById('tohub').onclick = () => go('home');
}

/* ===============================================================
 *  SQUAD PICKER (Ch.6) — Hale locked + choose 4
 * =============================================================== */
function showSquadPicker(onBack) {
  chrome('nonav');
  const picked = new Set(META.activeParty.filter(k => k !== 'hale' && ROSTER_ORDER.includes(k)).slice(0, 3));
  app.innerHTML = `
    <div class="shead"><h2>Choose the Five</h2></div>
    <p class="small" style="margin:10px 14px 4px;">Hale is mandatory — the story has him by the scar. Pick <b>3</b> more.</p>
    <div class="pgrid pick" id="pickgrid">
      ${ROSTER_ORDER.map(k => {
        const t = Engine.UNITS[k];
        return `<button class="pcard e-${t.elem} ${k === 'hale' ? 'lockedin' : ''} ${picked.has(k) ? 'picked' : ''}" data-key="${k}">
          ${k === 'hale' ? '<div class="locknote">LOCKED</div>' : ''}
          ${sym(pid(k), 'port')}
          <div class="uname">${esc(t.name)}</div>
          <div class="urole">${roleShort(t.role)}</div>
        </button>`;
      }).join('')}
    </div>
    <div class="homerow" style="margin:6px 13px 22px;">
      <button id="begin" ${picked.size === 3 ? '' : 'disabled'}>March (${picked.size}/3)</button>
      <button id="backhub">← Castle Town</button>
    </div>`;
  const grid = document.getElementById('pickgrid');
  const begin = document.getElementById('begin');
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.pcard'); if (!card) return;
    const key = card.dataset.key; if (key === 'hale') return;
    if (picked.has(key)) { picked.delete(key); card.classList.remove('picked'); }
    else if (picked.size < 3) { picked.add(key); card.classList.add('picked'); }
    begin.disabled = picked.size !== 3;
    begin.textContent = `March (${picked.size}/3)`;
  });
  begin.onclick = () => {
    const party = ['hale', ...picked];
    META.activeParty = party; writeSave(true);
    chrome('battle');
    startBattle('ch6', party, result => {
      finishQuest('ch6', party, !onBack, result, finalResult => {
        if (onBack) return onBack(finalResult);
        if (finalResult === 'defeat' || finalResult === 'exit') return go('home');
        afterCh6(finalResult);
      });
    });
  };
  document.getElementById('backhub').onclick = () => go(onBack ? 'story' : 'home');
}

/* ===============================================================
 *  CREDITS
 * =============================================================== */
function showCredits() {
  chrome('nonav');
  app.innerHTML = `
    <div class="panelbox fadein-slow" style="margin:34px 12px;">
      <h2>Hollow Reflections — Act One</h2>
      <p class="small" style="margin:8px 0 14px;">Current standalone build highlights:</p>
      <ul class="credits small">
        <li>Real-time, Skill-driven combat with individual Arts and Burst gauges</li>
        <li>Role-based Energy restoration, break bars, stagger pressure, and readable enemy intent</li>
        <li>Tap for Skill, swipe for Arts or Burst, plus configurable Auto combat</li>
        <li>Hale’s pure-damage Dark kits and story-forced 5★ UnHollowed transformation</li>
        <li>Persistent party composition, Unit Library animation previews, summons, and progression</li>
        <li>Ten Act One missions, a combat test quest, evolving encounters, and permanent autosave</li>
        <li>Original anime character art with authored pixel combat sprites and battlefield-scale effects</li>
      </ul>
      <div class="homerow">
        <button id="tohubc" class="bigbtn">Return to the Hall</button>
      </div>
      <div class="homerow">
        <button id="selftest">Run engine self-tests</button>
        <button id="totitle">Return to Title</button>
      </div>
      <p class="small" id="testout" style="margin-top:10px;"></p>
    </div>`;
  document.getElementById('tohubc').onclick = () => go('home');
  document.getElementById('totitle').onclick = showTitle;
  document.getElementById('selftest').onclick = () => {
    const r = window.runSelfTests();
    document.getElementById('testout').textContent = `Self-tests: ${r.pass} passed, ${r.fail} failed.` + (r.fail ? ' — ' + r.failures.join(' | ') : '');
  };
}
/*EOF-UI1*/
