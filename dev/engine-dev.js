/* ============================================================================
   HOLLOW REFLECTIONS — Act One · Combat Engine
   Pure, DOM-free JS. State in, events out. All UI lives elsewhere.

   Round model (per design doc §4-5):
   - Player activates living units in ANY order, one free-choice action each.
   - When every living party unit has acted, the enemy phase runs automatically
     (bosses act at their fixed points — default: after all player units),
     then end-of-round upkeep, then a new round begins.
   - Energy: 3 bars max. Basic = free, +1 bar. Guard = free, halve incoming
     until next round, +1 bar. Skill = 1, Art = 2, Burst = 3.
   - Elemental wheel: Fire>Earth>Thunder>Water>Fire (1.5x / 0.67x),
     Light<->Dark 1.5x both ways, Hollow neutral both ways.
   - Break: attacks carry break damage; at 0 the enemy STAGGERS (skips its
     next action, +50% dmg taken until it recovers). Each stagger refills the
     bar at +25% capacity. Stagger is the only delay here, and a staggered
     enemy can't be re-delayed — satisfies the "delay once between actions"
     global ruling.
   - Mitigation from abilities caps at 50%; Guard halves AFTER the cap.
     (Ability mitigation remains capped before shields and Guard.)
   ============================================================================ */
const Engine = (function () {
  'use strict';
  const CD = typeof ChallengeData !== 'undefined' ? ChallengeData : require('./challenges.js');
  const CHALLENGES = CD.challenges, CHALLENGE_ITEMS = CD.items;
  const MD = typeof MarketData !== 'undefined' ? MarketData : require('./market.js');
  const MARKET_ITEMS = MD.items;

  /* ------------------------------------------------------------------ *
   *  Elements
   * ------------------------------------------------------------------ */
  const WHEEL = { fire: 'earth', earth: 'thunder', thunder: 'water', water: 'fire' };
  function elemMult(atk, def) {
    if ((atk === 'light' && def === 'dark') || (atk === 'dark' && def === 'light')) return 1.5;
    if (WHEEL[atk] === def) return 1.5;
    if (WHEEL[def] === atk) return 0.67;
    return 1.0; // hollow, same-element, everything else: neutral
  }
  const ELEM_ICON = { fire: '🔥', water: '💧', earth: '🌿', thunder: '⚡', light: '✨', dark: '🌑', hollow: '◈' };

  // Live battles build Arts through Skills rather than passive attacks.
  // Values use the engine's three-segment gauge (1 = 100 Arts).
  const LIVE_SKILL_GAIN = { Supporter: 0.60, Healer: 0.50, Attacker: 0.45, Defender: 0.45, Breaker: 0.35 };
  const LIVE_UNIT_SKILL_GAIN = { hale: 0.25 };
  function liveSkillGain(u) {
    if (u && LIVE_UNIT_SKILL_GAIN[u.key] != null) return LIVE_UNIT_SKILL_GAIN[u.key];
    return LIVE_SKILL_GAIN[u.role] == null ? 0.45 : LIVE_SKILL_GAIN[u.role];
  }
  const LIVE_GESTURE_THRESHOLDS = Object.freeze({ art: 36, burst: 82 });
  const PARTY_SIZE = 4;
  function liveGestureTier(distance) {
    if (distance >= LIVE_GESTURE_THRESHOLDS.burst) return 'Burst';
    if (distance >= LIVE_GESTURE_THRESHOLDS.art) return 'Art';
    return null;
  }

  const LEVEL_CAPS = Object.freeze({ 1: 20, 2: 40, 3: 60, 4: 70, 5: 90 });
  function xpToNext(level) { return 60 + Math.max(1, level) * 20; }
  function grantUnitXP(progress, amount) {
    const beforeLevel = progress.level;
    const cap = LEVEL_CAPS[progress.stars] || 90;
    progress.xp = Math.max(0, Math.floor(progress.xp || 0));
    let remaining = Math.max(0, Math.floor(amount || 0));
    while (remaining > 0 && progress.level < cap) {
      const needed = xpToNext(progress.level) - progress.xp;
      const paid = Math.min(remaining, needed);
      progress.xp += paid; remaining -= paid;
      if (progress.xp >= xpToNext(progress.level)) { progress.level++; progress.xp = 0; }
    }
    if (progress.level >= cap) progress.xp = 0;
    return { beforeLevel, level: progress.level, levelsGained: progress.level - beforeLevel, xp: progress.xp, maxed: progress.level >= cap };
  }

  /* ------------------------------------------------------------------ *
   *  Player unit templates (kits per the Roster Codex, simplified faithfully)
   *  d = damage, b = break damage. Numbers: basics 40-60, skills ~1.6x,
   *  arts ~2.6x, bursts ~4.5x; HP 320-540 by role.
   * ------------------------------------------------------------------ */
  const UNITS = {
    hale: {
      name: 'Hale', elem: 'dark', role: 'Attacker', hp: 440, basic: { d: 55, b: 5 },
      epithet: 'Adventurer',
      passive: { name: 'Relentless Pursuit', kind: 'conditional', desc: 'Deals 20% more damage to enemies below half HP.' },
      specials: [
        { id: 'cross_slash', name: 'Cross Slash', cost: 1, tier: 'Skill', target: 'enemy', desc: 'Two rapid cuts, +25 Arts; the first lowers Dark resistance by 15% for 10 seconds.' },
        { id: 'black_horizon', name: 'Black Horizon', cost: 2, tier: 'Art', target: 'none', desc: 'A line-cleaving Dark attack; Hale gains 50% ATK and the final hit surges against weakened enemies.' },
        { id: 'nightmares_end', name: "Nightmare's End", cost: 3, tier: 'Burst', target: 'none', desc: 'A battlefield-wide Dark detonation that ignores 35% defense and executes critically weakened targets.' },
      ],
      // Five-star story form lives in HALE_AWAKENED below and also uses Energy.
    },
    cinnia: {
      name: 'Cinnia', elem: 'fire', role: 'Healer', hp: 380, basic: { d: 40, b: 3 },
      epithet: 'the Battle-Cook',
      passive: { name: 'Seconds', kind: 'conversion', desc: 'Overheal from her abilities becomes Well-Fed regeneration for two effect cycles.' },
      // Passive — Seconds: overheal from her abilities becomes Well-Fed (regen, 2 turns).
      specials: [
        { id: 'flash_fry', name: 'Flash-Fry Fireball', cost: 1, tier: 'Skill', target: 'enemy', desc: 'Flip a compact fireball from the pan-staff at one enemy.' },
        { id: 'field_rations', name: 'Hearthward Rations', cost: 2, tier: 'Art', target: 'none', desc: 'Strong party heal and brief Well-Fed regeneration.' },
        { id: 'feast', name: 'Full-Course Feast', cost: 3, tier: 'Burst', target: 'none', desc: 'Heal party 200 + ATK up 2 rounds.' },
      ],
    },
    tobin: {
      name: 'Tobin', elem: 'water', role: 'Supporter', hp: 330, basic: { d: 40, b: 3 },
      epithet: 'the Tide-Reader',
      passive: { name: 'Still Water', kind: 'information', desc: 'Reveals each enemy\'s next action and its target.' },
      // Passive — Still Water: reveals who the enemies' next single-target blows
      // will land on. (Codex "reveal the boss's next move" vs scripted enemies:
      // implemented as an intent preview — enemies pre-roll their next action
      // and target at round start, and Tobin reads it. Closest functional version.)
      specials: [
        { id: 'dampen', name: 'Dampen', cost: 1, tier: 'Skill', target: 'enemy', desc: 'Enemy ATK -25%, 2 rounds.' },
        { id: 'read_currents', name: 'Read the Currents', cost: 2, tier: 'Art', target: 'none', desc: 'Reveal enemy intents and grant party DEF up.' },
        { id: 'tide_confides', name: 'The Tide Confides', cost: 3, tier: 'Burst', target: 'enemy', desc: 'Enemy ATK -30% and takes +30% damage, 2 rounds.' },
      ],
    },
    marlowe: {
      name: 'Marlowe', elem: 'water', role: 'Attacker', hp: 390, basic: { d: 58, b: 4 },
      epithet: 'the Foppish Blade',
      passive: { name: 'Flourish', kind: 'sequencing', desc: 'Deals 10% more damage per ally who attacked earlier in the current effect cycle, up to 40%.' },
      // Passive — Flourish: +10% dmg per ally who ATTACKED before him this round
      // (max +40%). Guards/heals/buffs don't count.
      specials: [
        { id: 'riposte', name: 'Riposte Stance', cost: 1, tier: 'Skill', target: 'none', desc: 'Counter the next attack on him; ⚡ refunded if untouched.' },
        { id: 'coup', name: 'Coup de Grâce', cost: 2, tier: 'Art', target: 'enemy', desc: 'Heavy thrust; +30% vs debuffed enemies.' },
        { id: 'curtain_call', name: 'Curtain Call', cost: 3, tier: 'Burst', target: 'enemy', desc: 'Five-thrust finale; always counts full Flourish.' },
      ],
    },
    brant: {
      name: 'Brant', elem: 'water', role: 'Breaker', hp: 430, basic: { d: 46, b: 12 },
      epithet: 'the Anchor',
      passive: { name: 'Deadweight', kind: 'floor', desc: 'Break damage cannot be reduced below 50% by resistance.' },
      // Passive — Deadweight: his break damage can't drop below 50% from any
      // resistance. (No enemy in this demo resists break, so it's an ambient
      // guarantee — kept as a rule in dealBreak.)
      specials: [
        { id: 'anchor_drop', name: 'Anchor Drop', cost: 1, tier: 'Skill', target: 'enemy', desc: 'One colossal break hit.' },
        { id: 'keelhaul', name: 'Keelhaul', cost: 3, tier: 'Burst', target: 'enemy', desc: 'Massive damage + massive break.' },
      ],
    },
    nix: {
      name: 'Nix', elem: 'water', role: 'Healer', hp: 350, basic: { d: 40, b: 3 },
      epithet: 'the Apothecary',
      passive: { name: 'Bedside Manner (Terrible)', kind: 'conditional', desc: 'Heals are 50% stronger on allies below 30% HP.' },
      // Passive — Bedside Manner (Terrible): heals on allies below 30% HP +50%.
      specials: [
        { id: 'bitter_draught', name: 'Bitter Draught', cost: 1, tier: 'Skill', target: 'ally', desc: 'Strong heal 130 + cleanse debuffs.' },
        { id: 'panacea', name: 'Panacea', cost: 3, tier: 'Burst', target: 'ally', desc: 'FULL heal one ally + 1-round debuff immunity.' },
      ],
    },
    brigga: {
      name: 'Brigga', elem: 'fire', role: 'Breaker', hp: 410, basic: { d: 45, b: 10 },
      epithet: 'the Demolitionist',
      passive: { name: 'Short Fuse', kind: 'conditional', desc: 'Deals 25% more Break damage while the target\'s Break bar is above half.' },
      // Passive — Short Fuse: +25% break damage while target's break bar > half.
      specials: [
        { id: 'kegcracker', name: 'Kegcracker', cost: 1, tier: 'Skill', target: 'enemy', desc: 'Strike that ignores a chunk of the guard bar.' },
        { id: 'blast_mining', name: 'Blast Mining', cost: 2, tier: 'Art', target: 'none', desc: 'AoE damage + break; hits adds too.' },
        { id: 'grand_opening', name: 'Grand Opening', cost: 3, tier: 'Burst', target: 'enemy', desc: 'Massive break hit; if it staggers, party +1⚡.' },
      ],
    },
    hearthgar: {
      name: 'Hearthgar', elem: 'fire', role: 'Defender', hp: 540, basic: { d: 42, b: 4 },
      epithet: 'the Ember-Golem',
      passive: { name: 'Stoked', kind: 'reactive', desc: 'Gains one Cinder per hit taken, up to five. Each grants 4% DEF and fuels his shield.' },
      // Passive — Stoked: +1 Cinder per hit taken (max 5), +4% DEF each.
      specials: [
        { id: 'brace', name: 'Brace the Hearth', cost: 1, tier: 'Skill', target: 'none', desc: 'Guard allies and intercept single-target attacks for 1 cycle.' },
        { id: 'bank_coals', name: 'Bank the Coals', cost: 2, tier: 'Art', target: 'none', desc: 'Consume Cinders; shield the party (30 + 25/stack).' },
        { id: 'furnace', name: 'Open the Furnace', cost: 3, tier: 'Burst', target: 'none', desc: 'Guard allies and retaliate on every intercepted hit this cycle.' },
      ],
    },
    milla: {
      name: 'Milla', elem: 'thunder', role: 'Supporter', hp: 340, basic: { d: 42, b: 3 },
      epithet: 'the Courier',
      passive: { name: 'Never Late', kind: 'once_per_battle', desc: 'The first ally to reach 200 Arts without reaching 300 has their gauge filled.' },
      // Passive — Never Late: first time each battle an ally ends an action one
      // bar short of their Burst (at exactly 2⚡), Milla grants +1⚡.
      // (Codex "would be one bar short of a special" — closest clean trigger.)
      specials: [
        { id: 'handoff', name: 'Hand-Off', cost: 1, tier: 'Skill', target: 'ally_other', desc: 'Give one ally +2⚡.' },
        { id: 'express', name: 'Express Route', cost: 2, tier: 'Art', target: 'ally_other', desc: '+2⚡ to the chosen ally AND the lowest-Energy other ally.' },
        { id: 'delivery', name: 'Special Delivery', cost: 3, tier: 'Burst', target: 'ally_other', desc: 'One ally to FULL Energy + ATK up.' },
      ],
    },
    katie: {
      name: 'Katie', elem: 'dark', role: 'Defender', hp: 525, basic: { d: 38, b: 5 },
      epithet: 'the Night Radiographer',
      passive: { name: 'Lead Apron', kind: 'battle_start', desc: 'Begins each battle with a 70-damage personal barrier.' },
      // Passive — Lead Apron: begins each battle with a personal radiation-barrier shield.
      specials: [
        { id: 'diagnostic_crush', name: 'Diagnostic Crush', cost: 1, tier: 'Skill', target: 'enemy', desc: 'Dark hammer smash; reduces the target\'s damage dealt by 20% for 5 seconds.' },
        { id: 'contrast_study', name: 'Contrast Study', cost: 2, tier: 'Art', target: 'enemy', desc: 'Heavy break damage, +20% break vulnerability, intent reveal, and 15% party mitigation.' },
        { id: 'cat_scan', name: 'CAT Scan', cost: 3, tier: 'Burst', target: 'none', desc: 'Thirty-second party cover, a 300% max-HP personal barrier, and Radiation Exposure.' },
      ],
    },
  };

  // Roster progression is intentionally separate from combat kits so rarity can
  // grow without duplicating or replacing a unit definition.
  const UNIT_PROGRESSION = Object.freeze({
    hale: {
      baseStars: 4, maxStars: 5,
      evolution: { toStars: 5, unlock: 'ch6', forcedStory: true, name: 'Hale, UnHollowed', materials: {} },
    },
    cinnia: {
      baseStars: 4, maxStars: 5,
      evolution: { toStars: 5, unlock: 'challenge', name: 'Flaming Harvest Cook', materials: { ember_challenge_crest: 1, feastkeeper_seal: 1, challenge_essence: 20 } },
    },
    tobin: { baseStars: 4, maxStars: 4, evolution: null },
    marlowe: { baseStars: 4, maxStars: 4, evolution: null },
    brant: { baseStars: 4, maxStars: 4, evolution: null },
    nix: { baseStars: 3, maxStars: 3, evolution: null },
    brigga: { baseStars: 3, maxStars: 3, evolution: null },
    hearthgar: { baseStars: 4, maxStars: 4, evolution: null },
    milla: { baseStars: 4, maxStars: 4, evolution: null },
    katie: { baseStars: 5, maxStars: 5, evolution: null },
  });
  function applyStoryEvolutions(progress, storyKey) {
    const evolved = [];
    for (const [key, cfg] of Object.entries(UNIT_PROGRESSION)) {
      const evo = cfg.evolution;
      if (!evo || !evo.forcedStory || evo.unlock !== storyKey) continue;
      if (!progress[key]) progress[key] = { level: 1, stars: cfg.baseStars, xp: 0 };
      if (progress[key].stars < evo.toStars) {
        progress[key].stars = evo.toStars;
        evolved.push(key);
      }
    }
    return evolved;
  }
  const UNIT_LIBRARY = Object.freeze(Object.entries(UNIT_PROGRESSION).flatMap(([key, cfg]) => {
    const pages = [{ id: `${key}:base`, key, form: 'base', stars: cfg.baseStars }];
    if (cfg.evolution) pages.push({ id: `${key}:${cfg.evolution.toStars}`, key, form: 'awakened', stars: cfg.evolution.toStars, title: cfg.evolution.name });
    for (const form of cfg.plannedForms || []) pages.push({ id: `${key}:${form.stars}`, key, form: 'planned', stars: form.stars, title: form.title });
    return pages;
  }));
  function recordOwnedDiscoveries(unlocked, owned) {
    for (const key of owned) unlocked[`${key}:base`] = true;
    return unlocked;
  }

  /* ------------------------------------------------------------------ *
   *  Versioned save data. Storage and UI live in mui1.js; these pure
   *  helpers keep migration and validation testable without a browser.
   * ------------------------------------------------------------------ */
  const BANNERS = Object.freeze({ standard: Object.freeze({ id: 'standard', family: 'standard', name: 'The Still Basin', cost: { 1: 10, 10: 90 }, fourStarRate: .25, guaranteeAt: 10, featured: 'cinnia', featuredRate: .5,
    pools: { 3: [{ id: 'nix', weight: 1 }, { id: 'brigga', weight: 1, after: 'act4_4' }], 4: [{ id: 'hale', weight: 1 }, { id: 'cinnia', weight: 1 }, { id: 'tobin', weight: 1 }, { id: 'hearthgar', weight: 1, after: 'act1_3' }, { id: 'marlowe', weight: 1, after: 'act2_4' }, { id: 'brant', weight: 1, after: 'act2_4' }, { id: 'milla', weight: 1, after: 'act2_8' }] } }) });
  function bannerPool(state, bannerId, rarity) { const b = BANNERS[bannerId]; return b ? (b.pools[rarity] || []).filter(x => !x.after || state.missionClears[x.after]) : []; }
  const AI_PRESETS = Object.freeze({
    balanced: Object.freeze({ id: 'balanced', name: 'Balanced', desc: 'Uses ready abilities while saving major attacks for useful windows.' }),
    break: Object.freeze({ id: 'break', name: 'Break', desc: 'Prioritizes Break pressure and spends into stagger windows.' }),
    sustain: Object.freeze({ id: 'sustain', name: 'Sustain', desc: 'Protects, heals, and cleanses before committing damage.' }),
    burst: Object.freeze({ id: 'burst', name: 'Burst', desc: 'Builds and holds Arts for staggered or weakened enemies.' }),
    manual: Object.freeze({ id: 'manual', name: 'Manual Reserve', desc: 'Automates Skills only, except for critical defensive recovery.' }),
  });
  const SAVE_SCHEMA_VERSION = 7;
  function intIn(value, min, max, fallback) {
    const n = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback;
    return Math.max(min, Math.min(max, n));
  }
  function boolMap(value, allowed) {
    const out = {};
    if (!value || typeof value !== 'object') return out;
    for (const [key, flag] of Object.entries(value)) if (flag === true && (!allowed || allowed.has(key))) out[key] = true;
    return out;
  }
  const CANONICAL_STORY_CHAPTERS = Object.freeze([
    Object.freeze(Array.from({ length: 10 }, (_, i) => `act1_${i + 1}`)),
    Object.freeze(Array.from({ length: 8 }, (_, i) => `act2_${i + 1}`)),
    Object.freeze(Array.from({ length: 7 }, (_, i) => `act3_${i + 1}`)),
    Object.freeze(Array.from({ length: 7 }, (_, i) => `act4_${i + 1}`)),
  ]);
  const STORY_RECRUITS = Object.freeze({
    act1_3: Object.freeze(['hearthgar']),
    act2_4: Object.freeze(['marlowe', 'brant']),
    act2_8: Object.freeze(['milla']),
    act4_4: Object.freeze(['brigga']),
  });
  function stringTrueMap(value, maxKeyLength) {
    const out = {};
    const limit = maxKeyLength || 192;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    for (const [key, flag] of Object.entries(value)) {
      if (flag === true && typeof key === 'string' && key.length > 0 && key.length <= limit) out[key] = true;
    }
    return out;
  }
  function canonicalProgressFacts(input) {
    const raw = input && typeof input === 'object' ? input : {};
    const supplied = raw.missionClears && typeof raw.missionClears === 'object' ? raw.missionClears : {};
    const missionClears = {};
    let blocked = false;
    for (const chapter of CANONICAL_STORY_CHAPTERS) {
      for (const missionId of chapter) {
        if (!blocked && supplied[missionId] === true) missionClears[missionId] = true;
        else blocked = true;
      }
    }
    let storyStep = 0;
    for (const chapter of CANONICAL_STORY_CHAPTERS) {
      if (chapter.every(id => missionClears[id])) storyStep++;
      else break;
    }
    const haleStars = raw.unitProgress && raw.unitProgress.hale && raw.unitProgress.hale.stars;
    if (storyStep === 4 && (raw.haleAwakened === true || haleStars >= 5)) storyStep = 5;
    const act1MissionProgress = CANONICAL_STORY_CHAPTERS[0].reduce((count, id) => count === Number(id.split('_')[1]) - 1 && missionClears[id] ? count + 1 : count, 0);
    const requiredUnits = new Set();
    for (const [missionId, units] of Object.entries(STORY_RECRUITS)) if (missionClears[missionId]) units.forEach(unitId => requiredUnits.add(unitId));
    return { missionClears, act1MissionProgress, storyStep, summonUnlocked: !!missionClears.act1_9, requiredUnits: [...requiredUnits] };
  }
  function saveValidationErrors(input, partial) {
    const s = input && typeof input === 'object' && !Array.isArray(input) ? input : null;
    if (!s) return ['state must be an object'];
    const errors = [], unitKeys = new Set(Object.keys(UNITS)), libraryIds = new Set(UNIT_LIBRARY.map(x => x.id)), challengeIds = new Set(Object.keys(CHALLENGES));
    const present = key => !partial || Object.prototype.hasOwnProperty.call(s, key);
    const integer = (key, min, max) => {
      if (present(key) && (!Number.isSafeInteger(s[key]) || s[key] < min || s[key] > max)) errors.push(`${key} must be an integer from ${min} to ${max}`);
    };
    const trueMap = (key, allowed) => {
      if (!present(key)) return;
      if (!s[key] || typeof s[key] !== 'object' || Array.isArray(s[key])) { errors.push(`${key} must be an object`); return; }
      for (const [id, value] of Object.entries(s[key])) if (value !== true || (allowed && !allowed.has(id))) errors.push(`${key}.${id} is invalid`);
    };
    integer('sigils', 0, 999999999); integer('gold', 0, 999999999); integer('glassDust', 0, 999999999); integer('storyStep', 0, 5); integer('act1MissionProgress', 0, 10);
    if (present('owned') && (!Array.isArray(s.owned) || !s.owned.length || new Set(s.owned).size !== s.owned.length || s.owned.some(id => !unitKeys.has(id)))) errors.push('owned must contain unique known unit IDs');
    if (present('activeParty') && (!Array.isArray(s.activeParty) || !s.activeParty.length || s.activeParty.length > PARTY_SIZE || new Set(s.activeParty).size !== s.activeParty.length || s.activeParty.some(id => !unitKeys.has(id) || (Array.isArray(s.owned) && !s.owned.includes(id))))) errors.push(`activeParty must contain one to ${PARTY_SIZE} unique owned units`);
    if (present('ranks')) {
      if (!s.ranks || typeof s.ranks !== 'object' || Array.isArray(s.ranks)) errors.push('ranks must be an object');
      else for (const [id, value] of Object.entries(s.ranks)) if (!unitKeys.has(id) || !Number.isSafeInteger(value) || value < 0 || value > 5) errors.push(`ranks.${id} is invalid`);
    }
    if (present('unitProgress')) {
      if (!s.unitProgress || typeof s.unitProgress !== 'object' || Array.isArray(s.unitProgress)) errors.push('unitProgress must be an object');
      else for (const [id, value] of Object.entries(s.unitProgress)) {
        const cfg = UNIT_PROGRESSION[id];
        if (!cfg || !value || typeof value !== 'object') { errors.push(`unitProgress.${id} is invalid`); continue; }
        const maxStars = Math.max(cfg.maxStars, ...(cfg.plannedForms || []).map(x => x.stars));
        if ((!partial || 'stars' in value) && (!Number.isSafeInteger(value.stars) || value.stars < cfg.baseStars || value.stars > maxStars)) errors.push(`unitProgress.${id}.stars is invalid`);
        const stars = Number.isSafeInteger(value.stars) ? value.stars : cfg.baseStars, cap = LEVEL_CAPS[stars] || 90;
        if ((!partial || 'level' in value) && (!Number.isSafeInteger(value.level) || value.level < 1 || value.level > cap)) errors.push(`unitProgress.${id}.level is invalid`);
        const level = Number.isSafeInteger(value.level) ? value.level : 1;
        if ((!partial || 'xp' in value) && (!Number.isSafeInteger(value.xp) || value.xp < 0 || value.xp >= xpToNext(level) || (level === cap && value.xp !== 0))) errors.push(`unitProgress.${id}.xp is invalid`);
      }
    }
    if (present('challengeItems')) {
      if (!s.challengeItems || typeof s.challengeItems !== 'object' || Array.isArray(s.challengeItems)) errors.push('challengeItems must be an object');
      else for (const [id, value] of Object.entries(s.challengeItems)) if (!/^[a-z][a-z0-9_]{0,63}$/.test(id) || !Number.isSafeInteger(value) || value < 0 || value > 999999) errors.push(`challengeItems.${id} is invalid`);
    }
    if (present('challengeProgress')) {
      if (!s.challengeProgress || typeof s.challengeProgress !== 'object' || Array.isArray(s.challengeProgress)) errors.push('challengeProgress must be an object');
      else for (const [id, value] of Object.entries(s.challengeProgress)) {
        const masteryIds = new Set((CHALLENGES[id] && CHALLENGES[id].mastery || []).map(x => x.id));
        if (!challengeIds.has(id) || !value || typeof value !== 'object' || !Number.isSafeInteger(value.clearCount) || value.clearCount < 0 || value.clearCount > 999999 || typeof value.firstClear !== 'boolean' || !Number.isSafeInteger(value.bestTimeMs) || value.bestTimeMs < 0 || value.bestTimeMs > 86400000) errors.push(`challengeProgress.${id} is invalid`);
        else if (!value.mastery || typeof value.mastery !== 'object' || Object.entries(value.mastery).some(([key, flag]) => flag !== true || !masteryIds.has(key))) errors.push(`challengeProgress.${id}.mastery is invalid`);
      }
    }
    if (present('completedTransactions') && (!Array.isArray(s.completedTransactions) || s.completedTransactions.length > 100 || new Set(s.completedTransactions).size !== s.completedTransactions.length || s.completedTransactions.some(id => typeof id !== 'string' || !id || id.length > 128))) errors.push('completedTransactions is invalid');
    for (const key of ['settledBattles', 'completedOperations', 'storyRecruitments']) {
      if (!present(key)) continue;
      const map = s[key];
      if (!map || typeof map !== 'object' || Array.isArray(map)) {
        errors.push(`${key} must be an object`);
        continue;
      }
      for (const [id, value] of Object.entries(map)) if (value !== true || typeof id !== 'string' || !id || id.length > 192) errors.push(`${key}.${id} is invalid`);
    }
    if (present('marketState')) {
      const m = s.marketState;
      if (!m || typeof m !== 'object' || !Number.isSafeInteger(m.tier) || m.tier < 0 || m.tier > 5 || !m.purchases || typeof m.purchases !== 'object' || Object.entries(m.purchases).some(([id, count]) => !MARKET_ITEMS[id] || !Number.isSafeInteger(count) || count < 0 || count > MARKET_ITEMS[id].limit)) errors.push('marketState is invalid');
    }
    for (const key of ['telemetry', 'economyLedger']) if (present(key) && (!Array.isArray(s[key]) || s[key].length > 100 || s[key].some(x => !x || typeof x !== 'object' || Array.isArray(x)))) errors.push(`${key} is invalid`);
    if (present('summonHistory') && (!Array.isArray(s.summonHistory) || s.summonHistory.length > 100 || s.summonHistory.some(x => !x || !UNITS[x.unitId] || !BANNERS[x.bannerId]))) errors.push('summonHistory is invalid');
    if (present('summonState') && (!s.summonState || typeof s.summonState !== 'object' || !s.summonState.standard || !Number.isSafeInteger(s.summonState.standard.pullsSinceFourStar) || s.summonState.standard.pullsSinceFourStar < 0 || s.summonState.standard.pullsSinceFourStar > 9 || !Number.isSafeInteger(s.summonState.standard.featuredMisses) || s.summonState.standard.featuredMisses < 0 || s.summonState.standard.featuredMisses > 1)) errors.push('summonState is invalid');
    if (present('unitAI')) {
      if (!s.unitAI || typeof s.unitAI !== 'object' || Array.isArray(s.unitAI)) errors.push('unitAI must be an object');
      else for (const [id, value] of Object.entries(s.unitAI)) if (!unitKeys.has(id) || !value || typeof value !== 'object' || !AI_PRESETS[value.preset]) errors.push(`unitAI.${id} is invalid`);
    }
    trueMap('evolutionUnlocks', unitKeys); trueMap('libraryUnlocked', libraryIds); trueMap('featureUnlocks', new Set(['summon']));
    if (present('missionClears')) {
      const caps = { 1: 10, 2: 8, 3: 7, 4: 7 };
      if (!s.missionClears || typeof s.missionClears !== 'object' || Array.isArray(s.missionClears)) errors.push('missionClears must be an object');
      else for (const [id, value] of Object.entries(s.missionClears)) {
        const match = /^act([1-9])_([1-9][0-9]?)$/.exec(id);
        if (value !== true || !match || !caps[Number(match[1])] || Number(match[2]) > caps[Number(match[1])]) errors.push(`missionClears.${id} is invalid`);
      }
    }
    if (present('sideMissionProgress')) {
      if (!s.sideMissionProgress || typeof s.sideMissionProgress !== 'object' || Array.isArray(s.sideMissionProgress)) errors.push('sideMissionProgress must be an object');
      else for (const [id, value] of Object.entries(s.sideMissionProgress)) if (!SIDE_MISSIONS[id] || !value || typeof value !== 'object' || !Number.isSafeInteger(value.clearCount) || value.clearCount < 0 || value.clearCount > 999999 || typeof value.firstClear !== 'boolean' || !Number.isSafeInteger(value.rewardTier) || value.rewardTier < 0 || value.rewardTier > 4 || !Number.isSafeInteger(value.rewardedClears) || value.rewardedClears < 0 || value.rewardedClears > SIDE_MISSIONS[id].rewardLimit) errors.push(`sideMissionProgress.${id} is invalid`);
    }
    if (present('haleAwakened') && typeof s.haleAwakened !== 'boolean') errors.push('haleAwakened must be boolean');
    if (present('lastHub') && !['home', 'story', 'party', 'summon', 'town'].includes(s.lastHub)) errors.push('lastHub is invalid');
    if (present('settings')) {
      const x = s.settings;
      if (!x || typeof x !== 'object' || ['autoSkill', 'autoArts', 'autoBurst'].some(key => (!partial || key in x) && typeof x[key] !== 'boolean') || ((!partial || 'animationSpeed' in x) && ![0.5, 0.75, 1, 1.5].includes(x.animationSpeed))) errors.push('settings is invalid');
    }
    if (!partial) {
      const facts = canonicalProgressFacts(s);
      const actualClears = Object.keys(s.missionClears || {}).sort();
      const expectedClears = Object.keys(facts.missionClears).sort();
      if (JSON.stringify(actualClears) !== JSON.stringify(expectedClears)) errors.push('missionClears must be a continuous canonical story prefix');
      if (s.act1MissionProgress !== facts.act1MissionProgress) errors.push('act1MissionProgress does not match missionClears');
      if (s.storyStep !== facts.storyStep) errors.push('storyStep does not match canonical chapter completion');
      if (!!(s.featureUnlocks && s.featureUnlocks.summon) !== facts.summonUnlocked) errors.push('featureUnlocks.summon does not match act1_9 completion');
      if (s.lastHub === 'summon' && !facts.summonUnlocked) errors.push('lastHub cannot point to locked Summon');
      for (const unitId of facts.requiredUnits) if (!Array.isArray(s.owned) || !s.owned.includes(unitId)) errors.push(`owned is missing story recruit ${unitId}`);
    }
    return errors;
  }
  function validateSaveState(input, partial) {
    const errors = saveValidationErrors(input, !!partial);
    if (errors.length) throw new Error('Save validation failed: ' + errors.join('; '));
    return true;
  }
  function normalizeSaveState(input) {
    const s = input && typeof input === 'object' ? input : {};
    const unitKeys = new Set(Object.keys(UNITS));
    const libraryIds = new Set(UNIT_LIBRARY.map(x => x.id));
    let owned = Array.isArray(s.owned) ? [...new Set(s.owned.filter(k => unitKeys.has(k)))] : ['hale', 'cinnia', 'tobin'];
    const requestedParty = Array.isArray(s.activeParty) ? [...new Set(s.activeParty.filter(k => owned.includes(k)))].slice(0, PARTY_SIZE) : [];
    let activeParty = requestedParty.length ? requestedParty : owned.slice(0, PARTY_SIZE);
    const ranks = {};
    for (const [key, value] of Object.entries(s.ranks || {})) if (unitKeys.has(key)) ranks[key] = intIn(value, 0, 5, 0);
    const unitProgress = {};
    for (const key of unitKeys) {
      const cfg = UNIT_PROGRESSION[key], raw = (s.unitProgress || {})[key];
      if (!raw) continue;
      const knownMax = Math.max(cfg.maxStars, ...(cfg.plannedForms || []).map(x => x.stars));
      const stars = intIn(raw.stars, cfg.baseStars, knownMax, cfg.baseStars);
      const level = intIn(raw.level, 1, LEVEL_CAPS[stars] || 90, 1);
      unitProgress[key] = { level, stars, xp: level >= (LEVEL_CAPS[stars] || 90) ? 0 : intIn(raw.xp, 0, xpToNext(level) - 1, 0) };
    }
    const challengeItems = {};
    for (const [key, value] of Object.entries(s.challengeItems || {})) if (/^[a-z][a-z0-9_]{0,63}$/.test(key)) challengeItems[key] = intIn(value, 0, 999999, 0);
    const challengeProgress = {};
    for (const [id, raw] of Object.entries(s.challengeProgress || {})) if (CHALLENGES[id] && raw && typeof raw === 'object') {
      const masteryIds = new Set((CHALLENGES[id].mastery || []).map(x => x.id));
      challengeProgress[id] = { clearCount: intIn(raw.clearCount, 0, 999999, 0), firstClear: !!raw.firstClear, bestTimeMs: intIn(raw.bestTimeMs, 0, 86400000, 0), mastery: boolMap(raw.mastery, masteryIds) };
    }
    const completedTransactions = Array.isArray(s.completedTransactions) ? [...new Set(s.completedTransactions.filter(id => typeof id === 'string' && id && id.length <= 128))].slice(-100) : [];
    const settledBattles = stringTrueMap(s.settledBattles);
    const completedOperations = stringTrueMap(s.completedOperations);
    const storyRecruitments = stringTrueMap(s.storyRecruitments);
    const marketState = { tier: intIn(s.marketState && s.marketState.tier, 0, 5, 0), purchases: {} };
    for (const [id, count] of Object.entries(s.marketState && s.marketState.purchases || {})) if (MARKET_ITEMS[id]) marketState.purchases[id] = intIn(count, 0, MARKET_ITEMS[id].limit, 0);
    const telemetry = Array.isArray(s.telemetry) ? s.telemetry.filter(x => x && typeof x === 'object' && !Array.isArray(x)).slice(-100).map(x => ({ event: String(x.event || '').slice(0, 64), challengeId: String(x.challengeId || '').slice(0, 64), bannerId: String(x.bannerId || '').slice(0, 64), itemId: String(x.itemId || '').slice(0, 64), outcome: String(x.outcome || '').slice(0, 32), elapsedMs: intIn(x.elapsedMs, 0, 86400000, 0), unitsDefeated: intIn(x.unitsDefeated, 0, 5, 0), breakCount: intIn(x.breakCount, 0, 999, 0), pulls: intIn(x.pulls, 0, 10, 0), sigilsBefore: intIn(x.sigilsBefore, 0, 999999999, 0), sigilsAfter: intIn(x.sigilsAfter, 0, 999999999, 0), goldBefore: intIn(x.goldBefore, 0, 999999999, 0), goldAfter: intIn(x.goldAfter, 0, 999999999, 0), dustBefore: intIn(x.dustBefore, 0, 999999999, 0), dustAfter: intIn(x.dustAfter, 0, 999999999, 0) })) : [];
    const economyLedger = Array.isArray(s.economyLedger) ? s.economyLedger.filter(x => x && typeof x === 'object' && !Array.isArray(x)).slice(-100).map(x => ({ id: String(x.id || '').slice(0, 128), type: String(x.type || '').slice(0, 32), gold: intIn(x.gold, -999999999, 999999999, 0), dust: intIn(x.dust, -999999999, 999999999, 0), sigils: intIn(x.sigils, -999999999, 999999999, 0), itemId: String(x.itemId || '').slice(0, 64), quantity: intIn(x.quantity, -999999, 999999, 0) })) : [];
    const summonState = { standard: { pullsSinceFourStar: intIn(s.summonState && s.summonState.standard && s.summonState.standard.pullsSinceFourStar, 0, 9, 0), featuredMisses: intIn(s.summonState && s.summonState.standard && s.summonState.standard.featuredMisses, 0, 1, 0) } };
    const summonHistory = Array.isArray(s.summonHistory) ? s.summonHistory.filter(x => x && UNITS[x.unitId] && BANNERS[x.bannerId]).slice(-100).map(x => ({ transactionId: String(x.transactionId || '').slice(0, 128), bannerId: x.bannerId, unitId: x.unitId, rarity: intIn(x.rarity, 3, 4, 3), newUnit: !!x.newUnit, rank: intIn(x.rank, 0, 5, 0), dust: intIn(x.dust, 0, 999999, 0) })) : [];
    const unitAI = {};
    for (const [id, value] of Object.entries(s.unitAI || {})) if (unitKeys.has(id) && value && AI_PRESETS[value.preset]) unitAI[id] = { preset: value.preset };
    const progressFacts = canonicalProgressFacts(s);
    const missionClears = progressFacts.missionClears;
    const act1MissionProgress = progressFacts.act1MissionProgress;
    const storyStep = progressFacts.storyStep;
    for (const unitId of progressFacts.requiredUnits) if (!owned.includes(unitId)) owned.push(unitId);
    for (const unitId of owned) if (!unitProgress[unitId]) unitProgress[unitId] = { level: 1, stars: UNIT_PROGRESSION[unitId].baseStars, xp: 0 };
    const repairedParty = activeParty.filter(id => owned.includes(id)).slice(0, PARTY_SIZE);
    activeParty = repairedParty.length ? repairedParty : owned.slice(0, PARTY_SIZE);
    const featureUnlocks = boolMap(s.featureUnlocks, new Set(['summon']));
    if (progressFacts.summonUnlocked) featureUnlocks.summon = true;
    else delete featureUnlocks.summon;
    let lastHub = ['home', 'story', 'party', 'summon', 'town'].includes(s.lastHub) ? s.lastHub : 'home';
    if (lastHub === 'summon' && !featureUnlocks.summon) lastHub = 'home';
    const sideMissionProgress = {};
    for (const [id, raw] of Object.entries(s.sideMissionProgress || {})) if (SIDE_MISSIONS[id] && raw && typeof raw === 'object') sideMissionProgress[id] = { clearCount: intIn(raw.clearCount, 0, 999999, 0), firstClear: !!raw.firstClear, rewardTier: intIn(raw.rewardTier, 0, 4, marketRestockTier({ missionClears })), rewardedClears: intIn(raw.rewardedClears, 0, SIDE_MISSIONS[id].rewardLimit, 0) };
    let haleStars = (unitProgress.hale || {}).stars || UNIT_PROGRESSION.hale.baseStars;
    if ((s.haleAwakened === true || storyStep >= 5) && haleStars < 5) {
      unitProgress.hale = { level: (unitProgress.hale || {}).level || 1, stars: 5, xp: (unitProgress.hale || {}).xp || 0 };
      haleStars = 5;
    }
    const libraryUnlocked = boolMap(s.libraryUnlocked, libraryIds);
    if (haleStars >= 5) libraryUnlocked['hale:5'] = true;
    return {
      sigils: intIn(s.sigils, 0, 999999999, 0), gold: intIn(s.gold, 0, 999999999, 0), glassDust: intIn(s.glassDust, 0, 999999999, 0), ranks, owned, activeParty, unitProgress, challengeItems, challengeProgress, completedTransactions, settledBattles, completedOperations, storyRecruitments, marketState, summonState, summonHistory, telemetry, economyLedger, unitAI,
      evolutionUnlocks: boolMap(s.evolutionUnlocks, unitKeys),
      featureUnlocks,
      libraryUnlocked,
      storyStep,
      act1MissionProgress,
      missionClears,
      sideMissionProgress,
      haleAwakened: haleStars >= 5,
      lastHub,
      settings: {
        autoSkill: !!(s.settings && s.settings.autoSkill),
        autoArts: !!(s.settings && s.settings.autoArts),
        autoBurst: !!(s.settings && s.settings.autoBurst),
        animationSpeed: [0.5, 0.75, 1, 1.5].includes(Number(s.settings && s.settings.animationSpeed))
          ? Number(s.settings.animationSpeed) : 1,
      },
    };
  }
  function migrateSaveEnvelope(raw, options) {
    if (!raw || typeof raw !== 'object') throw new Error('Save data is not an object.');
    let save = Object.assign({}, raw);
    if (save.schemaVersion == null) save = { schemaVersion: 0, state: save.state || save };
    if (save.schemaVersion > SAVE_SCHEMA_VERSION) throw new Error('This save was created by a newer version of Hollow Reflections.');
    if (save.schemaVersion === 0) save = Object.assign({}, save, { schemaVersion: 1, state: save.state || save.payload || {} });
    if (save.schemaVersion === 1) save = Object.assign({}, save, { schemaVersion: 2, state: Object.assign({ challengeProgress: {}, completedTransactions: [] }, save.state || {}) });
    if (save.schemaVersion === 2) save = Object.assign({}, save, { schemaVersion: 3, state: Object.assign({ marketState: { tier: 0, purchases: {} }, telemetry: [], economyLedger: [] }, save.state || {}) });
    if (save.schemaVersion === 3) save = Object.assign({}, save, { schemaVersion: 4, state: Object.assign({ glassDust: 0, summonState: { standard: { pullsSinceFourStar: 0, featuredMisses: 0 } }, summonHistory: [] }, save.state || {}) });
    if (save.schemaVersion === 4) save = Object.assign({}, save, { schemaVersion: 5, state: Object.assign({ unitAI: {} }, save.state || {}) });
    if (save.schemaVersion === 5) {
      const state = Object.assign({}, save.state || {});
      const storyStep = intIn(state.storyStep, 0, 5, 0);
      const act1MissionProgress = storyStep >= 1 ? 10 : intIn(state.act1MissionProgress, 0, 10, 0);
      const missionClears = Object.assign({}, state.missionClears || {});
      for (let i = 1; i <= act1MissionProgress; i++) missionClears[`act1_${i}`] = true;
      if (storyStep >= 2) for (let i = 1; i <= 8; i++) missionClears[`act2_${i}`] = true;
      if (storyStep >= 3) for (let i = 1; i <= 7; i++) missionClears[`act3_${i}`] = true;
      // Legacy story handlers granted recruitment as a side effect of the
      // chapter spine. Preserve those durable unlocks while converting the
      // old projection to canonical mission flags; normal normalization never
      // performs this synthesis.
      const owned = new Set(Array.isArray(state.owned) && state.owned.length ? state.owned : ['hale', 'cinnia', 'tobin']);
      const libraryUnlocked = Object.assign({}, state.libraryUnlocked || {});
      for (const [missionId, units] of Object.entries({ act1_3: ['hearthgar'], act2_4: ['marlowe', 'brant'], act2_8: ['milla'] })) {
        if (!missionClears[missionId]) continue;
        for (const unitId of units) { owned.add(unitId); libraryUnlocked[`${unitId}:base`] = true; }
      }
      const featureUnlocks = Object.assign({}, state.featureUnlocks || {});
      if (missionClears.act1_9) featureUnlocks.summon = true;
      save = Object.assign({}, save, { schemaVersion: 6, state: Object.assign(state, { act1MissionProgress, missionClears, owned: [...owned], libraryUnlocked, featureUnlocks }) });
    }
    if (save.schemaVersion === 6) {
      const state = Object.assign({}, save.state || {});
      if (Number(state.storyStep || 0) >= 5 || state.haleAwakened === true) {
        state.haleAwakened = true;
        state.unitProgress = Object.assign({}, state.unitProgress || {});
        state.unitProgress.hale = Object.assign({}, state.unitProgress.hale || {}, { stars: 5 });
      }
      const settledBattles = stringTrueMap(state.settledBattles);
      const completedOperations = stringTrueMap(state.completedOperations);
      const storyRecruitments = stringTrueMap(state.storyRecruitments);
      for (const transactionId of state.completedTransactions || []) {
        if (transactionId.startsWith('mission:') || transactionId.startsWith('challenge:') || transactionId.startsWith('side:')) settledBattles[transactionId] = true;
        else if (transactionId.startsWith('market:') || transactionId.startsWith('summon:')) completedOperations[transactionId] = true;
        else if (transactionId.startsWith('recruit:')) storyRecruitments[transactionId] = true;
      }
      for (const [missionId, units] of Object.entries(STORY_RECRUITS)) {
        if (!state.missionClears || !state.missionClears[missionId]) continue;
        for (const unitId of units) if (Array.isArray(state.owned) && state.owned.includes(unitId)) storyRecruitments[`recruit:${missionId}:${unitId}`] = true;
      }
      save = Object.assign({}, save, { schemaVersion: 7, state: Object.assign(state, { settledBattles, completedOperations, storyRecruitments }) });
    }
    if (save.schemaVersion !== SAVE_SCHEMA_VERSION) throw new Error('No migration path exists for this save.');
    if (options && options.strict) validateSaveState(save.state, true);
    const migrated = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      gameVersion: String(save.gameVersion || 'legacy'),
      saveId: String(save.saveId || ''),
      createdAt: String(save.createdAt || ''),
      updatedAt: String(save.updatedAt || ''),
      revision: intIn(save.revision, 0, Number.MAX_SAFE_INTEGER, 0),
      accountLink: save.accountLink && typeof save.accountLink === 'object' ? save.accountLink : { linked: false, provider: null, accountId: null },
      state: normalizeSaveState(save.state),
    };
    validateSaveState(migrated.state);
    return migrated;
  }
  function challengeUnlocked(state, id) {
    const cfg = CHALLENGES[id];
    if (!cfg) return false;
    const unlock = cfg.unlock || {};
    if (unlock.mission && !((state.missionClears || {})[unlock.mission])) return false;
    if (unlock.challenge && !((state.challengeProgress || {})[unlock.challenge] || {}).firstClear) return false;
    return true;
  }
  function evaluateChallengeMastery(cfg, result) {
    const passed = [];
    for (const rule of cfg.mastery || []) {
      if (rule.evaluator === 'no_defeats' && (result.unitsDefeated || 0) === 0) passed.push(rule.id);
      if (rule.evaluator === 'no_burst' && !result.burstUsed) passed.push(rule.id);
    }
    return passed;
  }
  function marketRestockTier(state) {
    const finals = ['act1_10', 'act2_8', 'act3_7', 'act4_7'];
    let tier = 0;
    for (const missionId of finals) { if ((state.missionClears || {})[missionId]) tier++; else break; }
    return tier;
  }
  function sideMissionUnlocked(state, id) {
    const cfg = SIDE_MISSIONS[id];
    return !!cfg && (!cfg.unlockMission || !!((state.missionClears || {})[cfg.unlockMission]));
  }
  function marketItemUnlocked(state, itemId) {
    const item = MARKET_ITEMS[itemId];
    if (!item) return false;
    return !item.unlock || !item.unlock.challenge || !!((state.challengeProgress || {})[item.unlock.challenge] || {}).firstClear;
  }

  // Hale's five-star UnHollowed kit uses the standard Energy gauge.
  const HALE_AWAKENED = {
    basicMain: 62,
    passive: { name: 'Hollow Sovereignty', kind: 'conditional', desc: 'Deals 50% more damage, increasing to 100% while below half HP.' },
    specials: [
      { id: 'fracture_edge', name: 'Fracture Edge', cost: 1, tier: 'Skill', target: 'enemy', desc: 'Pierce defense and fracture Dark resistance by 25%.' },
      { id: 'event_horizon', name: 'Event Horizon', cost: 2, tier: 'Art', target: 'enemy', desc: 'Gain 35% ATK and collapse a defense-ignoring singularity on one enemy.' },
      { id: 'shatterfall', name: 'Shatterfall: Hollow Reflection', cost: 3, tier: 'Burst', target: 'none', desc: 'An extinction wave ignores defense and devastates weakened enemies.' },
    ],
  };

  /* ------------------------------------------------------------------ *
   *  Enemy templates
   * ------------------------------------------------------------------ */
  const ENEMIES = {
    training_dummy: { name: 'Guild Test Dummy', elem: 'earth', hp: 99999999, atk: 0, breakBar: 999999 },
    construct: { name: 'Training Construct', elem: 'earth', hp: 150, atk: 18 },
    construct2: { name: 'Training Construct', elem: 'thunder', hp: 150, atk: 18 },
    storehouse_pest: { name: 'Storehouse Gnawer', elem: 'earth', hp: 135, atk: 17 },
    hollow_fragment: { name: 'Roadside Hollow', elem: 'hollow', hp: 320, atk: 30, breakBar: 90 },
    hound: { name: 'Crystal Hound', elem: 'earth', hp: 175, atk: 26 },
    ox: { name: 'Translucent Ox', elem: 'earth', hp: 520, atk: 40, breakBar: 60 },
    glasswright: { name: 'The Glasswright', elem: 'hollow', hp: 999999, atk: 90 },
    lowingman: { name: 'The Lowing Man', elem: 'hollow', hp: 2950, atk: 82, breakBar: 124 },  // retuned for 4-unit parties
    calf: { name: 'Hollowed Calf', elem: 'hollow', hp: 150, atk: 34 },  // retuned for 4-unit parties
    ember_warden: { name: 'Ember Warden', elem: 'fire', hp: 900, atk: 48, breakBar: 110 },
    feastkeeper: { name: 'The Feastkeeper', elem: 'fire', hp: 1250, atk: 52, breakBar: 130 },
  };

  const BATTLES = {
    training: { title: 'Training Grounds', enemies: ['training_dummy'], sigils: 0, rewards: { first: { gold: 0, xp: 0 }, repeat: { gold: 0, xp: 0 } }, training: true },
    side_caravan: { title: 'Missing Caravan', enemies: ['hound', 'storehouse_pest', 'hound'], sigils: 0, rewards: { first: { gold: 240, xp: 150 }, repeat: { gold: 120, xp: 75 } } },
    side_cook: { title: "A Cook's Errand", enemies: ['storehouse_pest', 'storehouse_pest', 'hollow_fragment'], sigils: 0, rewards: { first: { gold: 180, xp: 120 }, repeat: { gold: 90, xp: 60 } } },
    challenge_ember: { title: 'Ember Trial', enemies: ['ember_warden'], sigils: 0, rewards: { first: { gold: 0, xp: 0 }, repeat: { gold: 0, xp: 0 } }, challenge: true },
    challenge_feastkeeper: { title: 'Feastkeeper Trial', enemies: ['feastkeeper'], sigils: 0, rewards: { first: { gold: 0, xp: 0 }, repeat: { gold: 0, xp: 0 } }, challenge: true },
    act1_1: { title: '1-1 · Guild Entrance Exam', enemies: ['construct'], sigils: 5, rewards: { first: { gold: 60, xp: 35 }, repeat: { gold: 25, xp: 15 } }, tutorial: true },
    act1_2: { title: '1-2 · Second Construct', enemies: ['construct', 'construct2'], sigils: 5, rewards: { first: { gold: 75, xp: 45 }, repeat: { gold: 30, xp: 20 } }, tutorial: true },
    act1_3: { title: '1-3 · Field Readiness', enemies: ['construct', 'construct2', 'construct'], sigils: 10, rewards: { first: { gold: 100, xp: 60 }, repeat: { gold: 40, xp: 25 } }, tutorial: true },
    act1_5: { title: '1-5 · The Quest Board', enemies: ['storehouse_pest', 'storehouse_pest'], sigils: 5, rewards: { first: { gold: 110, xp: 55 }, repeat: { gold: 45, xp: 24 } }, tutorial: true },
    act1_6: { title: '1-6 · First Contract', enemies: ['hound', 'storehouse_pest', 'hound'], sigils: 10, rewards: { first: { gold: 145, xp: 80 }, repeat: { gold: 60, xp: 34 } }, tutorial: true },
    act1_7: { title: '1-7 · Roadside Hollow', enemies: ['hollow_fragment'], sigils: 10, rewards: { first: { gold: 180, xp: 110 }, repeat: { gold: 75, xp: 45 } }, tutorial: true },
    act1_10: { title: '1-10 · Charter Day', enemies: ['construct', 'construct2', 'hollow_fragment'], sigils: 20, rewards: { first: { gold: 260, xp: 165 }, repeat: { gold: 105, xp: 70 } }, tutorial: true },
    act2_2: { title: '2-2 · Business as Usual', enemies: ['storehouse_pest','hound','storehouse_pest'], sigils: 10, rewards: { first:{gold:280,xp:175}, repeat:{gold:110,xp:72} } },
    act2_4: { title: '2-4 · Wreck of the Cerulean Wake', enemies: ['hollow_fragment','hound','hollow_fragment'], sigils: 15, rewards: { first:{gold:340,xp:215}, repeat:{gold:135,xp:88} } },
    act2_6: { title: '2-6 · Closer', enemies: ['hound','hollow_fragment','ox'], sigils: 15, rewards: { first:{gold:400,xp:255}, repeat:{gold:160,xp:105} } },
    act2_7: { title: '2-7 · Milla’s Run', enemies: ['hound','hound','hollow_fragment'], sigils: 20, rewards: { first:{gold:440,xp:285}, repeat:{gold:175,xp:115} } },
    act3_1: { title: '3-1 · The March', enemies: ['hound','storehouse_pest','hound'], sigils: 15, rewards: { first:{gold:460,xp:300}, repeat:{gold:185,xp:120} } },
    act3_3: { title: '3-3 · The Waystation', enemies: ['hollow_fragment','hollow_fragment'], sigils: 15, rewards: { first:{gold:500,xp:325}, repeat:{gold:200,xp:130} } },
    act3_5: { title: '3-5 · The Halfway Marker', enemies: ['hound','hollow_fragment','ox'], sigils: 20, rewards: { first:{gold:560,xp:365}, repeat:{gold:225,xp:145} } },
    act3_6: { title: '3-6 · The Last Inn', enemies: ['hound','hound','hollow_fragment'], sigils: 20, rewards: { first:{gold:600,xp:390}, repeat:{gold:240,xp:155} } },
    act3_7: { title: '3-7 · The Edge', enemies: ['hollow_fragment','ox','hollow_fragment'], sigils: 25, rewards: { first:{gold:660,xp:430}, repeat:{gold:265,xp:170} } },
    act4_1: { title: '4-1 · The Silence', enemies: ['calf','hound','calf'], sigils: 20, rewards: { first:{gold:700,xp:455}, repeat:{gold:280,xp:180} } },
    act4_2: { title: '4-2 · The Advance Camp', enemies: ['hollow_fragment','hound','ox'], sigils: 20, rewards: { first:{gold:740,xp:480}, repeat:{gold:295,xp:190} } },
    act4_3: { title: '4-3 · Garrick', enemies: ['hound','hound','ox'], sigils: 25, rewards: { first:{gold:800,xp:520}, repeat:{gold:320,xp:205} } },
    act4_4: { title: '4-4 · The Geologist', enemies: ['hollow_fragment','ox','hollow_fragment'], sigils: 25, rewards: { first:{gold:850,xp:550}, repeat:{gold:340,xp:220} } },
    act4_5: { title: '4-5 · Following the Glass', enemies: ['calf','ox','calf'], sigils: 30, rewards: { first:{gold:920,xp:600}, repeat:{gold:365,xp:240} } },
    act4_6: { title: '4-6 · The Center', enemies: ['ox','hollow_fragment','ox'], sigils: 35, rewards: { first:{gold:1000,xp:650}, repeat:{gold:400,xp:260} } },
    act4_7: { title: '4-7 · The Crystallization', enemies: ['glasswright'], sigils: 50, rewards: { first:{gold:1200,xp:750}, repeat:{gold:480,xp:300} }, scripted: true },
    ch1: { title: 'The Guild Charter', enemies: ['construct', 'construct2'], sigils: 30, rewards: { first: { gold: 150, xp: 100 }, repeat: { gold: 90, xp: 65 } }, tutorial: true },
    ch2: { title: 'Greywick', enemies: ['hound', 'hound', 'ox'], sigils: 45, rewards: { first: { gold: 300, xp: 180 }, repeat: { gold: 180, xp: 115 } } },
    ch3: { title: 'The Glasswright', enemies: ['glasswright'], sigils: 60, rewards: { first: { gold: 450, xp: 250 }, repeat: { gold: 270, xp: 160 } }, scripted: true },
    ch6: { title: 'The Lowing Man', enemies: ['lowingman'], sigils: 150, rewards: { first: { gold: 1000, xp: 600 }, repeat: { gold: 600, xp: 380 } }, boss: true },
  };
  const SIDE_MISSIONS = Object.freeze({
    missing_caravan: Object.freeze({ id: 'missing_caravan', title: 'Missing Caravan', battle: 'side_caravan', description: 'Track a lost supply wagon beyond the east road.', unlockMission: 'act1_5', rewardLimit: 5, scene: 'sc-road' }),
    cook_errand: Object.freeze({ id: 'cook_errand', title: "A Cook's Errand", battle: 'side_cook', description: 'Clear the pantry route before tonight’s guild supper.', unlockMission: 'act1_5', rewardLimit: 5, scene: 'sc-hall' }),
  });

  /* ------------------------------------------------------------------ *
   *  Construction
   * ------------------------------------------------------------------ */
  let uidSeq = 0;
  function combatProfile(key, saved) {
    const cfg = UNIT_PROGRESSION[key];
    const t = UNITS[key];
    if (!cfg || !t) return null;
    const raw = saved && typeof saved === 'object' ? saved : {};
    const maxStars = Math.max(cfg.maxStars, ...(cfg.plannedForms || []).map(x => x.stars));
    const stars = intIn(raw.stars, cfg.baseStars, maxStars, cfg.baseStars);
    const cap = LEVEL_CAPS[stars] || 90;
    const level = intIn(raw.level, 1, cap, 1);
    const levelGrowth = cap <= 1 ? 0 : (level - 1) / (cap - 1);
    const powerScale = 1 + levelGrowth * 0.5 + (stars - cfg.baseStars) * 0.1;
    return Object.freeze({ key, level, stars, cap, powerScale,
      maxhp: Math.round(t.hp * powerScale),
      basicDamage: Math.round(t.basic.d * powerScale),
      basicBreak: Math.round(t.basic.b * powerScale),
    });
  }
  function mkPlayer(key, savedProfile) {
    const t = UNITS[key];
    const progression = UNIT_PROGRESSION[key];
    const profile = combatProfile(key, savedProfile);
    return {
      uid: 'p' + (uidSeq++), key, side: 'party',
      name: t.name, elem: t.elem, role: t.role, epithet: t.epithet,
      maxhp: profile.maxhp, hp: profile.maxhp, energy: 0, alive: true, acted: false,
      level: profile.level, stars: profile.stars, powerScale: profile.powerScale,
      guarding: false, buffs: [], shieldHits: 0, shieldHP: key === 'katie' ? Math.round(70 * profile.powerScale) : 0,
      guardedBy: null,
      cinders: 0, riposte: false, retaliate: false,
      awakened: false, blades: 0,
    };
  }
  function mkEnemy(key) {
    const t = ENEMIES[key];
    return {
      uid: 'e' + (uidSeq++), key, side: 'enemy',
      name: t.name, elem: t.elem, atk: t.atk,
      maxhp: t.hp, hp: t.hp, alive: true, buffs: [],
      breakMax: t.breakBar || 0, breakCur: t.breakBar || 0,
      staggered: false, staggers: 0, actIdx: 0,
      form: key === 'lowingman' ? 'beast' : null,
      tele: 0, manTurns: 0, intent: null,
    };
  }

  function newBattle(key, partyKeys, opts) {
    opts = opts || {};
    const cfg = BATTLES[key];
    uidSeq = 0; // IDs are battle-local so seeded replays produce the same event stream.
    const s = {
      key, title: cfg.title, round: 1, result: null, scripted: !!cfg.scripted,
      party: partyKeys.map(key2 => mkPlayer(key2, opts.profiles && opts.profiles[key2])),
      enemies: cfg.enemies.map(mkEnemy),
      rng: opts.rng || Math.random,
      lock: null,            // 'bulwark' during the guided finale
      freeRound: 0,          // round number on which all specials cost 0
      millaUsed: false,
      revealRound: 0,        // Read the Currents active this round
      attackedThisRound: [], // uids of allies who attacked (for Flourish)
      battleTimeMs: 0, eventSeq: 0, eventHistory: [], seed: opts.seed == null ? null : opts.seed,
      script: { counting: false, countingDone: false, awakened: false, finale: false, finaleDone: false, gwRounds: 0, figureSeen: false, figureGone: false },
    };
    if (opts.awakenedHale) { const h = byKey(s, 'hale'); if (h) awakenHale(s, h, [], true); }
    rollIntents(s);
    return s;
  }

  /* ------------------------------------------------------------------ *
   *  Small helpers
   * ------------------------------------------------------------------ */
  function byKey(s, key) { return s.party.find(u => u.key === key); }
  function byUid(s, uid) { return s.party.concat(s.enemies).find(u => u.uid === uid); }
  function livingParty(s) { return s.party.filter(u => u.alive); }
  function livingEnemies(s) { return s.enemies.filter(u => u.alive); }
  function partyHPfrac(s) {
    const cur = s.party.reduce((a, u) => a + u.hp, 0);
    const max = s.party.reduce((a, u) => a + u.maxhp, 0);
    return cur / max;
  }
  function vary(s, n) { return Math.round(n * (0.9 + s.rng() * 0.2)); }
  function pick(s, arr) { return arr[Math.floor(s.rng() * arr.length)] || null; }
  function log(ev, msg, cls) { ev.push({ t: 'log', msg, cls: cls || '' }); }
  const COMBAT_EVENT_TYPES = new Set(['log','damage','heal','status_apply','status_remove','telegraph_start','telegraph_update','telegraph_cancel','telegraph_resolve','result','round','awakening','finale_lock','scripted_loss','finisher','hit_stop_hint','camera_shake_hint']);
  function emit(ev, type, sourceId, targetIds, payload, presentationKey) { ev.push({ t: type, sourceId: sourceId || null, targetIds: targetIds || [], payload: payload || {}, presentationKey: presentationKey || type }); }
  function sealCombatEvents(s, ev, sourceId, targetIds) {
    const sealed = ev.map(raw => {
      const type = COMBAT_EVENT_TYPES.has(raw.t) ? raw.t : 'log';
      const event = Object.assign({}, raw, { id: ++s.eventSeq, type, battleTimeMs: Math.max(0, Math.floor(s.battleTimeMs || 0)), sourceId: raw.sourceId || sourceId || null, targetIds: Object.freeze([...(raw.targetIds || targetIds || [])]), payload: Object.freeze(Object.assign({}, raw.payload || {})), presentationKey: raw.presentationKey || type });
      return Object.freeze(event);
    });
    s.eventHistory = s.eventHistory.concat(sealed).slice(-500);
    return Object.freeze(sealed);
  }
  function combatEventHash(s) { let h = 2166136261; for (const e of s.eventHistory || []) { const text = `${e.id}|${e.type}|${e.sourceId}|${e.targetIds.join(',')}|${JSON.stringify(e.payload)}`; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); }
  function buffVal(u, kind) { // strongest of a kind (buffs of same kind don't stack in-demo)
    let v = 0; for (const b of u.buffs) if (b.k === kind && b.v > v) v = b.v; return v;
  }
  function hasBuff(u, kind) { return u.buffs.some(b => b.k === kind); }
  function addBuff(u, k, v, t, ev, label) {
    if (u.side === 'enemy' && hasBuff(u, 'immune')) return; // not used, safety
    if (u.side === 'party' && (k === 'atkDown') ) return;
    const old = u.buffs.find(b => b.k === k);
    if (old) { old.v = Math.max(old.v, v); old.t = Math.max(old.t, t); }
    else u.buffs.push({ k, v, t });
    if (ev) emit(ev, 'status_apply', null, [u.uid], { status: k, value: v, duration: t }, 'status_' + k);
    if (label && ev) log(ev, label, 'buff');
  }
  function gainEnergy(u, n) {
    u.energy = Math.min(3, u.energy + n);
  }

  /* ------------------------------------------------------------------ *
   *  Damage pipelines
   * ------------------------------------------------------------------ */

  // Player -> enemy damage. Returns actual HP damage dealt.
  function dealToEnemy(s, atkUnit, en, base, brk, ev, o) {
    o = o || {};
    if (!en.alive) return 0;
    let d = base * (atkUnit.powerScale || 1);
    d *= 1 + buffVal(atkUnit, 'atkUp');
    d *= elemMult(atkUnit.elem, en.elem);
    if (atkUnit.elem === 'dark' || atkUnit.elem === 'hollow') d *= 1 + buffVal(en, 'darkResDown');
    d *= 1 + buffVal(en, 'vuln');                    // Tide Confides etc.
    if (atkUnit.key === 'hale' && !atkUnit.awakened && en.hp / en.maxhp < 0.5) d *= 1.20;
    if (atkUnit.key === 'hale' && atkUnit.awakened) d *= (atkUnit.hp / atkUnit.maxhp < 0.5 ? 2.00 : 1.50);
    const defIgnore = Math.max(0, Math.min(1, Number(o.defIgnore) || 0));
    if (en.form === 'beast') d *= 0.55 + 0.45 * defIgnore; // Defense ignore restores the resisted share.
    if (en.form === 'man') d *= 1.5;                 // Man half: DEF collapse
    if (en.staggered) d *= 1.5;                      // stagger: +50% damage taken
    if (o.executeBelow && en.hp / en.maxhp <= o.executeBelow) d *= Number(o.executeMult) || 1.5;
    d = vary(s, d);
    en.hp -= d;
    log(ev, `${atkUnit.name} hits ${en.name} for ${d}.`, 'dmg');
    emit(ev, 'damage', atkUnit.uid, [en.uid], { amount: d, element: atkUnit.elem, critical: false }, d >= en.maxhp * .18 ? 'hit_heavy' : 'hit');
    if (d >= en.maxhp * .18) { emit(ev, 'hit_stop_hint', atkUnit.uid, [en.uid], { durationMs: 70 }, 'hit_stop_heavy'); emit(ev, 'camera_shake_hint', atkUnit.uid, [en.uid], { strength: 0.7, durationMs: 180 }, 'shake_heavy'); }
    if (brk > 0) dealBreak(s, atkUnit, en, brk, ev);
    afterEnemyDamage(s, en, ev);
    return d;
  }

  // Break damage (flat, unaffected by the elemental wheel — bars measure
  // structure, not essence). Only lands while a bar is active and the enemy
  // is not already staggered (delay-once ruling).
  function dealBreak(s, atkUnit, en, brk, ev) {
    if (!en.alive || en.breakMax <= 0 || en.staggered) return;
    if (en.form === 'man') return;                   // no bar in Man half
    let b = brk * (atkUnit.powerScale || 1);
    b *= 1 + buffVal(en, 'breakVuln');
    if (atkUnit.key === 'brigga' && en.breakCur > en.breakMax / 2) b = Math.round(b * 1.25); // Short Fuse
    // Brant's Deadweight: break damage can't be reduced below 50% by resistance.
    // (No break resistance exists in-demo, so b passes through whole.)
    en.breakCur -= b;
    log(ev, `${en.name}'s guard takes ${b} break.`, 'brk');
    if (en.breakCur <= 0) stagger(s, en, ev, atkUnit);
  }

  function stagger(s, en, ev, atkUnit) {
    en.breakCur = 0;
    en.staggered = true;
    en.staggers++;
    log(ev, `${en.name} is STAGGERED — it will not act, and takes +50% damage.`, 'stagger');
    // Brigga — Grand Opening rider: if her burst triggered the stagger, party +1⚡.
    if (atkUnit && atkUnit.key === 'brigga' && atkUnit._grandOpening) {
      for (const u of livingParty(s)) gainEnergy(u, 1);
      log(ev, 'The door\'s open — everyone in! Party gains +1⚡.', 'buff');
    }
    if (en.key === 'lowingman') {
      // Any break swaps it to the Man half; if a Stampede was telegraphed,
      // the break CANCELS it (breakers are tempo units).
      if (en.tele > 0) { en.tele = 0; emit(ev, 'telegraph_cancel', en.uid, [], { action: 'stampede' }, 'telegraph_stampede'); log(ev, 'The Stampede collapses mid-charge. The beast-shape folds away.', 'sys'); }
      en.form = 'man';
      en.manTurns = 3; // whistle, strike, strike — then back to Beast
      log(ev, 'The reflection buckles — and stands up wrong. The Man half faces you.', 'sys');
    }
  }

  function afterEnemyDamage(s, en, ev) {
    if (en.key === 'lowingman') return checkLowingScripts(s, en, ev);
    if (en.hp <= 0) {
      en.hp = 0; en.alive = false; log(ev, `${en.name} shatters.`, 'kill');
      if (!s.result && s.key !== 'ch3' && livingEnemies(s).length === 0) {
        s.result = 'victory'; ev.push({ t: 'result', v: 'victory' });
      }
    }
  }

  // Enemy -> player damage. Full pipeline:
  //  base * enemy ATK debuffs * element  ->  ability mitigation (cap 50%)
  //  -> Guard (x0.5) -> one-hit shield / HP shield -> HP.
  function dealToPlayer(s, en, u, base, ev, o) {
    o = o || {};
    if (!u.alive) return 0;
    if (!o.protectionRedirect && u.guardedBy) {
      const tank = byUid(s, u.guardedBy);
      if (tank && tank.alive && tank !== u) {
        log(ev, `${tank.name} intercepts the attack meant for ${u.name}.`, 'shield');
        return dealToPlayer(s, en, tank, base, ev, { protectionRedirect: true, redirectedAoe: !!o.aoe });
      }
      u.guardedBy = null;
    }
    let d = base;
    d *= 1 - buffVal(en, 'atkDown');
    if (en.enrage) d *= 1.5; // post-Awakening frenzy: the copy stops pretending gentleness
    d *= elemMult(en.elem, u.elem);
    d = vary(s, d);
    // --- ability mitigation, hard cap 50% ---
    let mit = buffVal(u, 'defUp') + buffVal(u, 'dmgCut') + u.cinders * 0.04;
    mit = Math.min(0.5, mit);
    d = d * (1 - mit);
    // --- one-hit shield absorbs the whole hit ---
    if (u.shieldHits > 0) {
      u.shieldHits--;
      log(ev, `${u.name}'s glass shield takes the hit and shatters. (0 damage)`, 'shield');
      afterPlayerHit(s, en, u, 0, ev, o);
      return 0;
    }
    // --- Guard halves, after the cap ---
    if (u.guarding) d = d * 0.5;
    d = Math.max(1, Math.round(d));
    // --- HP shield (Bank the Coals) ---
    if (u.shieldHP > 0) {
      const ab = Math.min(u.shieldHP, d);
      u.shieldHP -= ab; d -= ab;
      log(ev, `${u.name}'s ember shield absorbs ${ab}.`, 'shield');
    }
    if (d > 0) {
      u.hp -= d;
      log(ev, `${en.name} hits ${u.name} for ${d}${u.guarding ? ' (guarded)' : ''}.`, 'edmg');
      emit(ev, 'damage', en.uid, [u.uid], { amount: d, element: en.elem, redirected: !!o.protectionRedirect }, d >= u.maxhp * .24 ? 'hit_heavy' : 'hit');
      if (u.key === 'hearthgar' && u.cinders < 5) { u.cinders++; }
      // Tobin's Read the Currents rider: guarding through a revealed attack pays +1⚡.
      if (u.guarding && s.revealRound === s.round && !u._rtcPaid) { gainEnergy(u, 1); u._rtcPaid = true; log(ev, `${u.name} read the blow coming — +1⚡.`, 'buff'); }
    }
    if (u.hp <= 0) {
      if (s.scripted) { u.hp = 1; } // scripted fight: no real deaths (un-breakable)
      else { u.hp = 0; u.alive = false; u.guarding = false; log(ev, `${u.name} falls.`, 'kill'); }
    }
    afterPlayerHit(s, en, u, d, ev, o);
    return d;
  }

  function afterPlayerHit(s, en, u, dmg, ev, o) {
    // Riposte (Marlowe) & Retaliate (Hearthgar's Furnace) fire even at 0 damage —
    // the swing was made; the answer comes.
    if (u.alive && u.riposte && !o.aoe) {
      u.riposte = false; u._riposteUsed = true;
      const c = vary(s, 80);
      en.hp -= c; log(ev, `${u.name} ripostes for ${c}!`, 'dmg');
      afterEnemyDamage(s, en, ev);
    }
    if (u.alive && u.retaliate && en.alive) {
      const c = vary(s, 35);
      en.hp -= c; log(ev, `${u.name}'s furnace answers: ${c}.`, 'dmg');
      afterEnemyDamage(s, en, ev);
    }
    // Party-wipe check (non-scripted battles only)
    if (!s.scripted && livingParty(s).length === 0 && !s.result) {
      s.result = 'defeat';
      ev.push({ t: 'result', v: 'defeat' });
    }
  }

  function heal(s, src, u, amt, ev, opts) {
    opts = opts || {};
    if (!u.alive) return 0;
    let h = amt * (src && src.powerScale || 1);
    if (src && src.key === 'nix' && u.hp < u.maxhp * 0.3) h = Math.round(h * 1.5); // Bedside Manner
    const before = u.hp;
    u.hp = Math.min(u.maxhp, u.hp + h);
    const healed = u.hp - before;
    const over = h - healed;
    log(ev, `${src ? src.name : '—'} heals ${u.name} for ${healed}.`, 'heal');
    emit(ev, 'heal', src && src.uid, [u.uid], { amount: healed, overheal: over }, 'heal');
    // Cinnia — Seconds: overheal becomes Well-Fed (regen 25/round, 2 rounds).
    if (src && src.key === 'cinnia' && over > 0) addBuff(u, 'regen', 25, 2, ev, `${u.name} is Well-Fed (regen).`);
    return healed;
  }

  /* ------------------------------------------------------------------ *
   *  Action menu
   * ------------------------------------------------------------------ */
  function availableActions(s, uid) {
    const u = byUid(s, uid);
    if (!u || !u.alive || s.result) return [];
    // Guided finale: every menu locks except Hale's glowing Glass Bulwark.
    if (s.lock === 'bulwark') {
      if (u.key !== 'hale') return [];
      return [{ id: 'glass_bulwark', name: 'Glass Bulwark', cost: 2, tier: 'Art', target: 'none', ok: true, glow: true, desc: 'The ward scatters to everyone. NOW.' }];
    }
    if (u.acted) return [];
    const free = s.freeRound === s.round;
    const list = [
      { id: 'basic', name: 'Basic Attack', cost: 0, tier: 'Basic', target: 'enemy', ok: true, desc: 'Modest damage, +1⚡.' },
      { id: 'guard', name: 'Guard', cost: 0, tier: 'Guard', target: 'none', ok: true, desc: 'Halve damage taken until next round, +1⚡.' },
    ];
    const specials = u.awakened ? HALE_AWAKENED.specials : UNITS[u.key].specials;
    for (const sp of specials) {
      const pool = u.energy;
      const cost = free ? 0 : sp.cost;
      let ok = pool >= cost;
      let reason = ok ? '' : `needs ${sp.cost}⚡`;
      if (ok && sp.target === 'ally_other' && !livingParty(s).some(x => x !== u)) {
        ok = false; reason = 'no valid recipient';
      }
      list.push(Object.assign({}, sp, { cost, ok, reason }));
    }
    return list;
  }

  /* ------------------------------------------------------------------ *
   *  Player action resolution
   * ------------------------------------------------------------------ */
  function playerAct(s, uid, actionId, targetUid) {
    const ev = [];
    const u = byUid(s, uid);
    if (!u || !u.alive || s.result) return ev;

    // --- Guided finale interrupt: only Hale, only Glass Bulwark ---
    if (s.lock === 'bulwark') {
      if (u.key !== 'hale' || actionId !== 'glass_bulwark') return ev;
      resolveFinale(s, u, ev);
      return ev;
    }
    if (u.acted) return ev;

    const acts = availableActions(s, uid);
    const a = acts.find(x => x.id === actionId);
    if (!a || !a.ok) return ev;

    const target = targetUid ? byUid(s, targetUid) : null;
    doAction(s, u, a, target, ev);
    u.acted = true;

    // Milla — Never Late: first ally each battle to end an action at exactly
    // 2⚡ (one bar short of a Burst) gets +1⚡ on the house.
    const milla = byKey(s, 'milla');
    if (milla && milla.alive && !s.millaUsed && u !== milla && u.energy === 2) {
      s.millaUsed = true; gainEnergy(u, 1);
      log(ev, `Milla — Never Late: a spare bar, delivered. ${u.name} +1⚡.`, 'buff');
    }

    // All living units acted -> enemy phase + end of round (auto).
    if (!s.result && s.lock !== 'bulwark' && livingParty(s).every(x => x.acted)) {
      enemyPhase(s, ev);
      if (!s.result && s.lock !== 'bulwark') endRound(s, ev);
    }
    return ev;
  }

  /* ------------------------------------------------------------------ *
   *  Live-combat adapter
   *
   *  The original round API remains intact for regression tests and the
   *  archived UI. Live battles reuse the same action resolution, damage,
   *  break, boss triggers, and encounter scripts, but cadence is owned by
   *  the real-time controller in mui2-live.js.
   * ------------------------------------------------------------------ */
  function availableLiveActions(s, uid) {
    const u = byUid(s, uid);
    if (!u || !u.alive || s.result) return [];
    const acted = u.acted;
    u.acted = false;
    const list = availableActions(s, uid).filter(a => a.id !== 'basic' && a.id !== 'guard');
    u.acted = acted;
    // In live combat, ordinary Skills use recast timers instead of Energy.
    // Arts and Bursts still consume the segmented Arts gauge.
    for (const a of list) {
      if (a.tier === 'Skill') { a.ok = true; a.reason = ''; a.cost = 0; }
    }
    return list;
  }

  function chooseLiveAIAction(s, uid, options) {
    options = options || {};
    const u = byUid(s, uid), preset = AI_PRESETS[options.preset] ? options.preset : 'balanced';
    if (!u || !u.alive || s.result) return Object.freeze({ actionId: null, preset, trace: Object.freeze([]) });
    const enemies = livingEnemies(s), allies = livingParty(s);
    const weakestEnemy = enemies.reduce((min, x) => Math.min(min, x.hp / Math.max(1, x.maxhp)), 1);
    const weakestAlly = allies.reduce((min, x) => Math.min(min, x.hp / Math.max(1, x.maxhp)), 1);
    const breakWindow = enemies.some(x => x.staggered || (x.breakMax > 0 && x.breakCur / x.breakMax <= 0.35));
    const vulnerable = breakWindow || weakestEnemy <= 0.45 || Number(options.elapsedMs || s.battleTimeMs || 0) >= 45000;
    const defensiveRole = ['Healer', 'Supporter', 'Defender'].includes(u.role);
    const trace = availableLiveActions(s, uid).map(action => {
      const reasons = [];
      const allowed = action.tier === 'Skill' ? options.allowSkill !== false : action.tier === 'Art' ? !!options.allowArts : action.tier === 'Burst' ? !!options.allowBurst : false;
      if (!allowed) reasons.push(`${action.tier} automation disabled`);
      if (!action.ok) reasons.push(action.reason || 'not ready');
      if (typeof options.cooldownReady === 'function' && !options.cooldownReady(action)) reasons.push('cooldown active');
      let score = action.tier === 'Skill' ? 30 : action.tier === 'Art' ? 50 : 70;
      if (preset === 'break') {
        if (u.role === 'Breaker') score += 45;
        if (breakWindow && action.tier !== 'Skill') score += 60;
        if (!breakWindow && action.tier === 'Burst') score -= 80;
      } else if (preset === 'sustain') {
        if (defensiveRole && weakestAlly < 0.7) score += action.tier === 'Skill' ? 55 : 100;
        if (weakestAlly >= 0.85 && action.tier !== 'Skill') score -= 45;
      } else if (preset === 'burst') {
        if (action.tier === 'Burst' && vulnerable) score += 100;
        if (action.tier === 'Burst' && !vulnerable) reasons.push('holding Burst for a vulnerability window');
        if (action.tier === 'Art' && !vulnerable) score -= 35;
      } else if (preset === 'manual') {
        if (action.tier !== 'Skill' && !(defensiveRole && weakestAlly < 0.3)) reasons.push('reserved for manual control');
      } else if (action.tier === 'Burst' && !vulnerable) score -= 35;
      return Object.freeze({ actionId: action.id, tier: action.tier, score, rejected: reasons.length > 0, reasons: Object.freeze(reasons) });
    });
    const selected = trace.filter(x => !x.rejected).sort((a, b) => b.score - a.score || b.tier.localeCompare(a.tier))[0] || null;
    return Object.freeze({ actionId: selected && selected.actionId || null, preset, trace: Object.freeze(trace) });
  }

  function liveAct(s, uid, actionId, targetUid, opts) {
    opts = opts || {};
    const ev = [];
    const u = byUid(s, uid);
    if (!u || !u.alive || s.result) return sealCombatEvents(s, ev, uid, targetUid ? [targetUid] : []);

    if (s.lock === 'bulwark') {
      if (u.key !== 'hale' || actionId !== 'glass_bulwark') return sealCombatEvents(s, ev, uid, []);
      resolveFinale(s, u, ev);
      return sealCombatEvents(s, ev, uid, []);
    }

    const acted = u.acted;
    u.acted = false;
    const a = availableLiveActions(s, uid).find(x => x.id === actionId);
    if (!a || !a.ok) { u.acted = acted; return sealCombatEvents(s, ev, uid, targetUid ? [targetUid] : []); }
    const target = targetUid ? byUid(s, targetUid) : null;
    const beforeEnergy = u.energy;
    const wasAwakened = !!s.script.awakened;
    doAction(s, u, a, target, ev);
    u.acted = false;
    if (!wasAwakened && s.script.awakened) {
      s.liveGrace = true;
      log(ev, 'Hollowglass rings outward — one breath to recover.', 'shield');
    }

    if (a.tier === 'Skill') {
      u.energy = Math.min(3, beforeEnergy + (opts.skillGauge == null ? liveSkillGain(u) : opts.skillGauge));
    } else if (actionId === 'guard') {
      // The archived round rules grant Energy for Guard; live Guard is defensive only.
      u.energy = beforeEnergy;
    }

    const milla = byKey(s, 'milla');
    if (milla && milla.alive && !s.millaUsed && u !== milla && u.energy >= 2 && u.energy < 3) {
      s.millaUsed = true;
      u.energy = 3;
      log(ev, `Milla — Never Late: ${u.name}'s Arts gauge snaps to full.`, 'buff');
    }
    return sealCombatEvents(s, ev, uid, targetUid ? [targetUid] : []);
  }

  function liveEnemyPhase(s) {
    const ev = [];
    if (s.liveGrace) {
      s.liveGrace = false;
      for (const u of livingParty(s)) u.hp = Math.max(u.hp, Math.round(u.maxhp * 0.35));
      log(ev, 'Hollowglass rings outward. The enemy surge breaks against it.', 'shield');
      return sealCombatEvents(s, ev, null, livingParty(s).map(u => u.uid));
    }
    if (!s.result && s.lock !== 'bulwark') enemyPhase(s, ev);
    return sealCombatEvents(s, ev, null, livingParty(s).map(u => u.uid));
  }

  function liveUpkeep(s) {
    const ev = [];
    if (!s.result && s.lock !== 'bulwark') {
      endRound(s, ev);
      for (const u of s.party) u.acted = false;
    }
    return sealCombatEvents(s, ev, null, []);
  }

  function doAction(s, u, a, target, ev) {
    const free = s.freeRound === s.round;
    const en0 = (target && target.side === 'enemy' && target.alive) ? target : livingEnemies(s)[0];

    switch (a.id) {
      /* ------- universal ------- */
      case 'basic': {
        s.attackedThisRound.push(u.uid);
        if (u.awakened) {
          log(ev, 'Hale attacks — Hollowglass follows the edge.', 'act');
          dealToEnemy(s, u, en0, HALE_AWAKENED.basicMain, 8, ev);
          gainEnergy(u, 1);
        } else {
          const t = UNITS[u.key].basic;
          log(ev, `${u.name} attacks.`, 'act');
          dealToEnemy(s, u, en0, applyFlourish(s, u, t.d), t.b, ev);
          gainEnergy(u, 1);
        }
        break;
      }
      case 'guard': {
        u.guarding = true; gainEnergy(u, 1);
        log(ev, `${u.name} guards. (+1⚡, damage halved until next round)`, 'act');
        break;
      }

      /* ------- Hale ------- */
      case 'cross_slash': {
        u.energy -= free ? 0 : 1; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- Cross Slash.', 'act');
        dealToEnemy(s, u, en0, 58, 6, ev);
        if (en0 && en0.alive) addBuff(en0, 'darkResDown', 0.15, 2, ev, 'Cross Slash fractures Dark resistance by 15%.');
        if (en0 && en0.alive) dealToEnemy(s, u, en0, 62, 6, ev);
        break;
      }
      case 'black_horizon': {
        u.energy -= free ? 0 : 2; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- BLACK HORIZON.', 'act');
        addBuff(u, 'atkUp', 0.50, 3, ev, 'Black Horizon: Hale ATK +50%.');
        for (const en of livingEnemies(s).slice()) dealToEnemy(s, u, en, 170, 24, ev, { executeBelow: 0.5, executeMult: 1.5 });
        break;
      }
      case 'nightmares_end': {
        u.energy -= free ? 0 : 3; s.attackedThisRound.push(u.uid);
        log(ev, "Hale -- NIGHTMARE'S END.", 'act');
        for (const en of livingEnemies(s).slice()) dealToEnemy(s, u, en, 255, 32, ev, { defIgnore: 0.35, executeBelow: 0.30, executeMult: 1.5 });
        break;
      }
      case 'fracture_edge': {
        u.energy -= free ? 0 : 1; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- Fracture Edge.', 'act');
        if (en0 && en0.alive) addBuff(en0, 'darkResDown', 0.25, 2, ev, 'Fracture Edge tears Dark resistance down by 25%.');
        dealToEnemy(s, u, en0, 125, 12, ev, { defIgnore: 0.5 });
        break;
      }
      case 'event_horizon': {
        u.energy -= free ? 0 : 2; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- EVENT HORIZON.', 'act');
        addBuff(u, 'atkUp', 0.35, 2, ev, 'Hollow Sovereignty: Hale ATK +35%.');
        dealToEnemy(s, u, en0, 220, 30, ev, { defIgnore: 1, executeBelow: 0.4, executeMult: 1.35 });
        break;
      }
      case 'shatterfall': {
        u.energy -= free ? 0 : 3; s.attackedThisRound.push(u.uid);
        log(ev, 'Hale -- SHATTERFALL: HOLLOW REFLECTION.', 'act');
        for (const en of livingEnemies(s).slice()) dealToEnemy(s, u, en, 290, 48, ev, { defIgnore: 1, executeBelow: 0.5, executeMult: 1.7 });
        break;
      }

      /* ------- Cinnia ------- */
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
        for (const ally of livingParty(s)) { heal(s, u, ally, 200, ev); addBuff(ally, 'atkUp', 0.25, 2); }
        log(ev, 'Party ATK up, 2 rounds.', 'buff');
        break;
      }

      /* ------- Tobin ------- */
      case 'dampen': {
        u.energy -= free ? 0 : 1;
        log(ev, `Tobin — Dampen. The water leans on ${en0.name}'s arm.`, 'act');
        addBuff(en0, 'atkDown', 0.25, 2, ev, `${en0.name} ATK -25%, 2 rounds.`);
        break;
      }
      case 'read_currents': {
        u.energy -= free ? 0 : 2;
        s.revealRound = s.round;
        log(ev, 'Tobin — Read the Currents.', 'act');
        for (const en of livingEnemies(s)) log(ev, `The water says: ${intentText(s, en)}`, 'reveal');
        for (const ally of livingParty(s)) addBuff(ally, 'defUp', 0.2, 1);
        log(ev, 'Party DEF up this round; Guarding through a revealed hit pays +1⚡.', 'buff');
        break;
      }
      case 'tide_confides': {
        u.energy -= free ? 0 : 3;
        log(ev, 'Tobin — The Tide Confides. It has been watching too.', 'act');
        addBuff(en0, 'atkDown', 0.3, 2, ev, `${en0.name} ATK -30%, 2 rounds.`);
        addBuff(en0, 'vuln', 0.3, 2, ev, `${en0.name} takes +30% damage, 2 rounds.`);
        break;
      }

      /* ------- Marlowe ------- */
      case 'riposte': {
        u.energy -= free ? 0 : 1;
        u.riposte = true; u._riposteUsed = false;
        log(ev, 'Marlowe — Riposte Stance. "After you. No, truly — I insist."', 'act');
        break;
      }
      case 'coup': {
        u.energy -= free ? 0 : 2; s.attackedThisRound.push(u.uid);
        let d = 150; if (en0.buffs.some(b => b.k === 'atkDown' || b.k === 'vuln')) d = Math.round(d * 1.3);
        log(ev, 'Marlowe — Coup de Grâce.', 'act');
        dealToEnemy(s, u, en0, applyFlourish(s, u, d), 10, ev);
        break;
      }
      case 'curtain_call': {
        u.energy -= free ? 0 : 3; s.attackedThisRound.push(u.uid);
        log(ev, 'Marlowe — CURTAIN CALL. Five thrusts, one bow.', 'act');
        for (let i = 0; i < 5 && en0.alive; i++) dealToEnemy(s, u, en0, Math.round(52 * 1.4), 4, ev); // always full Flourish
        break;
      }

      /* ------- Brant ------- */
      case 'anchor_drop': {
        u.energy -= free ? 0 : 1; s.attackedThisRound.push(u.uid);
        log(ev, 'Brant — Anchor Drop. "Nothing moves."', 'act');
        dealToEnemy(s, u, en0, 70, 55, ev);
        break;
      }
      case 'keelhaul': {
        u.energy -= free ? 0 : 3; s.attackedThisRound.push(u.uid);
        log(ev, 'Brant — KEELHAUL. The anchor goes THROUGH.', 'act');
        dealToEnemy(s, u, en0, 200, 85, ev);
        break;
      }

      /* ------- Nix ------- */
      case 'bitter_draught': {
        u.energy -= free ? 0 : 1;
        const ally = (target && target.side === 'party') ? target : u;
        log(ev, `Nix — Bitter Draught for ${ally.name}. "Yes, all of it."`, 'act');
        heal(s, u, ally, 130, ev);
        const n = ally.buffs.length; ally.buffs = ally.buffs.filter(b => !['atkDownSelf'].includes(b.k)); // players carry no debuffs in-demo; cleanse is cosmetic here
        break;
      }
      case 'panacea': {
        u.energy -= free ? 0 : 3;
        const ally = (target && target.side === 'party') ? target : u;
        log(ev, `Nix — PANACEA for ${ally.name}.`, 'act');
        ally.hp = ally.maxhp;
        log(ev, `${ally.name} is fully healed + debuff immunity 1 round.`, 'heal');
        break;
      }

      /* ------- Brigga ------- */
      case 'kegcracker': {
        u.energy -= free ? 0 : 1; s.attackedThisRound.push(u.uid);
        log(ev, 'Brigga — Kegcracker. She found a fault line.', 'act');
        dealToEnemy(s, u, en0, 72, 35, ev);
        break;
      }
      case 'blast_mining': {
        u.energy -= free ? 0 : 2; s.attackedThisRound.push(u.uid);
        log(ev, 'Brigga — Blast Mining. Everything in the radius is a wall.', 'act');
        for (const en of livingEnemies(s)) dealToEnemy(s, u, en, 70, 25, ev);
        break;
      }
      case 'grand_opening': {
        u.energy -= free ? 0 : 3; s.attackedThisRound.push(u.uid);
        log(ev, 'Brigga — GRAND OPENING.', 'act');
        u._grandOpening = true;
        dealToEnemy(s, u, en0, 120, 65, ev);
        u._grandOpening = false;
        break;
      }

      /* ------- Hearthgar ------- */
      case 'brace': {
        u.energy -= free ? 0 : 1;
        addBuff(u, 'taunt', 1, 1);
        for (const ally of livingParty(s)) if (ally !== u) { ally.guardedBy = u.uid; addBuff(ally, 'guarded', 1, 1); }
        log(ev, 'Hearthgar — Brace the Hearth. "S-stay behind me!" (taunt, 1 round)', 'act');
        break;
      }
      case 'bank_coals': {
        u.energy -= free ? 0 : 2;
        const shield = 30 + u.cinders * 25;
        log(ev, `Hearthgar — Bank the Coals (${u.cinders} Cinders → ${shield} shield each).`, 'act');
        for (const ally of livingParty(s)) ally.shieldHP += shield;
        u.cinders = 0;
        break;
      }
      case 'furnace': {
        u.energy -= free ? 0 : 3;
        addBuff(u, 'taunt', 1, 1);
        for (const ally of livingParty(s)) if (ally !== u) { ally.guardedBy = u.uid; addBuff(ally, 'guarded', 1, 1); }
        u.retaliate = true;
        log(ev, 'Hearthgar — OPEN THE FURNACE. Taunt all + retaliation this round.', 'act');
        break;
      }

      /* ------- Milla ------- */
      case 'handoff': {
        u.energy -= free ? 0 : 1;
        const ally = validEnergyTarget(s, u, target);
        if (ally) { gainEnergy(ally, 2); log(ev, `Milla — Hand-Off: ${ally.name} +2⚡. "URGENT urgent."`, 'act'); }
        break;
      }
      case 'express': {
        u.energy -= free ? 0 : 2;
        const first = validEnergyTarget(s, u, target);
        // Second recipient auto-picked: lowest-Energy other living ally.
        const rest = livingParty(s).filter(x => x !== u && x !== first && !x.awakened);
        rest.sort((a2, b2) => a2.energy - b2.energy);
        const second = rest[0] || null;
        log(ev, 'Milla — Express Route. Two parcels, one stride.', 'act');
        if (first) { gainEnergy(first, 2); log(ev, `${first.name} +2⚡.`, 'buff'); }
        if (second) { gainEnergy(second, 2); log(ev, `${second.name} +2⚡.`, 'buff'); }
        break;
      }
      case 'delivery': {
        u.energy -= free ? 0 : 3;
        const ally = validEnergyTarget(s, u, target);
        if (ally) {
          ally.energy = 3; addBuff(ally, 'atkUp', 0.25, 2);
          log(ev, `Milla — SPECIAL DELIVERY: ${ally.name} to full ⚡ + ATK up.`, 'act');
        }
        break;
      }

      /* ------- Katie ------- */
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
        for (const en of livingEnemies(s)) log(ev, `Katie reads the image: ${intentText(s, en)}`, 'reveal');
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
    }
  }

  // Marlowe — Flourish: +10% per distinct ally who attacked before him this
  // round, max +40%. Only applies to Marlowe.
  function applyFlourish(s, u, d) {
    if (u.key !== 'marlowe') return d;
    const n = Math.min(4, new Set(s.attackedThisRound.filter(x => x !== u.uid)).size);
    return Math.round(d * (1 + 0.1 * n));
  }
  function validEnergyTarget(s, u, target) {
    if (target && target.side === 'party' && target.alive && target !== u) return target;
    const c = livingParty(s).filter(x => x !== u).sort((a, b) => a.energy - b.energy);
    return c[0] || null;
  }

  /* ------------------------------------------------------------------ *
   *  Enemy intents (pre-rolled at round start so Tobin can read them)
   * ------------------------------------------------------------------ */
  function rollIntents(s) {
    for (const en of livingEnemies(s)) en.intent = decideIntent(s, en);
  }
  function decideIntent(s, en) {
    const targets = livingParty(s);
    const t = pick(s, targets);
    switch (en.key) {
      case 'construct': case 'construct2': return { a: 'swing', target: t ? t.uid : null };
      case 'hound': return { a: 'bite', target: t ? t.uid : null };
      case 'calf': return { a: 'bite', target: t ? t.uid : null };
      case 'ox': // alternates gore / trample
        return (en.actIdx % 2 === 0) ? { a: 'gore', target: t ? t.uid : null } : { a: 'trample', target: null };
      case 'glasswright': // two blade-storm strikes per round
        return { a: 'bladestorm', target: t ? t.uid : null, target2: (pick(s, targets) || t || {}).uid };
      case 'lowingman': return lowingIntent(s, en, t);
    }
    return { a: 'swing', target: t ? t.uid : null };
  }
  function lowingIntent(s, en, t) {
    if (s.script.finaleDone || en.form === 'man') {
      if (en.manTurns === 3 && !s.script.finaleDone) return { a: 'whistle', target: null };
      return { a: 'strike', target: t ? t.uid : null };
    }
    // Beast half. Telegraph pipeline: announce -> stomp -> STAMPEDE.
    if (en.tele === 2) return { a: 'stomp', target: null };
    if (en.tele === 1) return { a: 'stampede', target: null };
    const seq = ['gore', 'sweep', 'telegraph'];
    return { a: seq[en.actIdx % 3], target: t ? t.uid : null };
  }
  function intentText(s, en) {
    const i = en.intent || {};
    const tn = i.target ? (byUid(s, i.target) || {}).name : null;
    switch (i.a) {
      case 'swing': return `${en.name} will swing at ${tn}.`;
      case 'bite': return `${en.name} will bite ${tn}.`;
      case 'gore': return `${en.name} will gore ${tn}.`;
      case 'trample': return `${en.name} will trample everyone.`;
      case 'bladestorm': return `${en.name} will send the storm twice. First: ${tn}.`;
      case 'sweep': return `${en.name} will sweep its horns through everyone.`;
      case 'telegraph': return `${en.name} is gathering itself. Something is building.`;
      case 'stomp': return `${en.name} paws the ground. The STAMPEDE lands next round — Guard, or break it.`;
      case 'stampede': return `STAMPEDE. It resolves this round. Guard now.`;
      case 'whistle': return `${en.name} will whistle for the herd.`;
      case 'strike': return `${en.name} will strike ${tn}.`;
    }
    return `${en.name} waits.`;
  }
  function canReadIntents(s) { return livingParty(s).some(u => u.key === 'tobin'); }

  /* ------------------------------------------------------------------ *
   *  Enemy phase
   * ------------------------------------------------------------------ */
  function enemyPhase(s, ev) {
    // Snapshot: calves summoned mid-phase don't act until next round.
    for (const en of s.enemies.slice()) {
      if (!en.alive || s.result || s.lock) continue;
      enemyAct(s, en, ev);
      // Glasswright acts twice per round.
      if (en.key === 'glasswright' && en.alive && !s.result) {
        en.intent = decideIntent(s, en);
        enemyAct(s, en, ev);
      }
    }
    // Ch.3 script — after round 3 completes OR party ≤30% total HP, the wave.
    if (s.scripted && !s.result && s.round >= 3) glasswrightScript(s, ev);
  }

  function enemyAct(s, en, ev) {
    // Stagger: skips its next action, then recovers (+50% window closes).
    if (en.staggered) {
      log(ev, `${en.name} is staggered — it does not move.`, 'stagger');
      en.staggered = false;
      if (en.key !== 'lowingman' && en.breakMax > 0) refillBar(en); // ox refills on recovery
      return;
    }
    // Scripted-stampede exhaustion: the 40% Awakening beat WAS its action.
    if (en.skipNext) {
      en.skipNext = false;
      log(ev, `${en.name} stands among what it did, heaving.`, 'eact');
      return;
    }
    // The Counting — once, at ~50% HP, the Lowing Man skips its own action.
    if (en.key === 'lowingman' && s.script.counting && !s.script.countingDone) {
      s.script.countingDone = true;
      log(ev, 'The reflection pauses. It is trying to count its herd.');
      return;
    }
    const i = en.intent || decideIntent(s, en);
    let t = i.target ? byUid(s, i.target) : null;
    // Dead or missing pre-rolled target: re-pick. Taunt overrides (single-target only).
    const taunter = livingParty(s).find(x => hasBuff(x, 'taunt'));
    const retarget = () => {
      if (taunter) return taunter;
      if (t && t.alive) return t;
      return pick(s, livingParty(s));
    };
    switch (i.a) {
      case 'swing': case 'bite': {
        t = retarget(); if (!t) break;
        dealToPlayer(s, en, t, en.atk, ev);
        break;
      }
      case 'gore': {
        t = retarget(); if (!t) break;
        log(ev, `${en.name} gores ${t.name}.`, 'eact');
        dealToPlayer(s, en, t, en.atk, ev);
        break;
      }
      case 'trample': {
        log(ev, `${en.name} tramples the line.`, 'eact');
        for (const u of livingParty(s)) dealToPlayer(s, en, u, Math.round(en.atk * 0.6), ev, { aoe: true });
        break;
      }
      case 'bladestorm': {
        // Two hits per action (he acts twice per round = 4 hits of ~90 potential;
        // spec: "hits ~90 twice/round" per action pass — one hit per action here.
        t = retarget(); if (!t) break;
        log(ev, 'The Glasswright flicks a hand. The storm answers.', 'eact');
        dealToPlayer(s, en, t, en.atk, ev);
        if (s.scripted && partyHPfrac(s) <= 0.30 && !s.result) { glasswrightScript(s, ev); }
        break;
      }
      /* ---- The Lowing Man ---- */
      case 'sweep': {
        log(ev, 'The Lowing Man sweeps its horns through the party.', 'eact');
        for (const u of livingParty(s)) dealToPlayer(s, en, u, 75, ev, { aoe: true });
        break;
      }
      case 'telegraph': {
        en.tele = 2;
        emit(ev, 'telegraph_start', en.uid, livingParty(s).map(u => u.uid), { action: 'stampede', cycles: 2 }, 'telegraph_stampede');
        log(ev, 'The Lowing Man lowers its head. It lows — a human voice, wrong throat. STAMPEDE in 2 rounds.', 'warn');
        break;
      }
      case 'stomp': {
        en.tele = 1;
        emit(ev, 'telegraph_update', en.uid, livingParty(s).map(u => u.uid), { action: 'stampede', cycles: 1 }, 'telegraph_stampede');
        log(ev, 'The ground bruises where it stamps. STAMPEDE next round. Break the bar or prepare mitigation.', 'warn');
        for (const u of livingParty(s)) dealToPlayer(s, en, u, 35, ev, { aoe: true });
        break;
      }
      case 'stampede': {
        en.tele = 0;
        emit(ev, 'telegraph_resolve', en.uid, livingParty(s).map(u => u.uid), { action: 'stampede' }, 'telegraph_stampede');
        en.actIdx = -1; // restart the gore/sweep/telegraph cycle after a Stampede
        en.stampedes = (en.stampedes || 0) + 1;
        // Stall tax: each Stampede that resolves hits harder than the last.
        const dmg = 140 + 25 * (en.stampedes - 1);
        log(ev, 'STAMPEDE. The herd that is one thing arrives all at once.', 'warn');
        for (const u of livingParty(s)) dealToPlayer(s, en, u, dmg, ev, { aoe: true });
        break;
      }
      case 'whistle': {
        log(ev, 'The Man half whistles. The herd remembers being called.', 'eact');
        for (let k = 0; k < 2; k++) { const c = mkEnemy('calf'); s.enemies.push(c); c.intent = decideIntent(s, c); }
        log(ev, 'Two Hollowed Calves answer.', 'sys');
        break;
      }
      case 'strike': {
        t = retarget(); if (!t) break;
        log(ev, 'The Man half strikes — a herdsman\'s hands, closing.', 'eact');
        dealToPlayer(s, en, t, 112, ev);
        break;
      }
    }
    en.actIdx++;
    // Man half: whistle, strike, strike — then the Beast reasserts.
    if (en.key === 'lowingman' && en.form === 'man' && !s.script.finaleDone) {
      en.manTurns--;
      if (en.manTurns <= 0) {
        en.form = 'beast'; refillBar(en); en.actIdx = 0; en.tele = 0;
        log(ev, `The Man folds back into the Beast. Its guard re-forms, thicker (${en.breakCur}).`, 'sys');
      }
    }
  }

  // Break-resistance ramp: each stagger refills the bar at +25% capacity.
  function refillBar(en) {
    en.breakCur = Math.round(en.breakMax * Math.pow(1.25, en.staggers));
  }

  /* ------------------------------------------------------------------ *
   *  End of round
   * ------------------------------------------------------------------ */
  function endRound(s, ev) {
    if (s.result) return;
    // Regen ticks (Well-Fed etc.)
    for (const u of livingParty(s)) {
      const r = buffVal(u, 'regen');
      if (r > 0) { const b4 = u.hp; u.hp = Math.min(u.maxhp, u.hp + r); if (u.hp > b4) log(ev, `${u.name} regenerates ${u.hp - b4}.`, 'heal'); }
    }
    // Riposte refund: if nothing touched Marlowe, the ⚡ comes back.
    for (const u of livingParty(s)) {
      if (u.riposte && !u._riposteUsed) { u.riposte = false; gainEnergy(u, 1); log(ev, 'Marlowe, untouched, pockets the ⚡. "How rude."', 'buff'); }
      u.riposte = false; u.retaliate = false; u.guarding = false; u._rtcPaid = false;
      u.acted = false;
      // Buff durations tick down at end of round.
      for (const b of u.buffs) b.t--;
      for (const b of u.buffs) if (b.t <= 0) emit(ev, 'status_remove', null, [u.uid], { status: b.k }, 'status_' + b.k);
      u.buffs = u.buffs.filter(b => b.t > 0);
      if (!hasBuff(u, 'guarded')) u.guardedBy = null;
    }
    const katie = byKey(s, 'katie');
    for (const en of s.enemies) {
      const exposure = en.buffs.find(b => b.k === 'radiationExposure');
      if (en.alive && exposure && katie && katie.alive && katie.shieldHP > 0) {
        const tick = Math.max(1, Math.round(exposure.v));
        en.hp -= tick;
        log(ev, `Radiation Exposure burns ${en.name} for ${tick}.`, 'dmg');
        afterEnemyDamage(s, en, ev);
      }
      for (const b of en.buffs) b.t--;
      for (const b of en.buffs) if (b.t <= 0) emit(ev, 'status_remove', null, [en.uid], { status: b.k }, 'status_' + b.k);
      en.buffs = en.buffs.filter(b => b.t > 0);
    }
    s.attackedThisRound = [];
    // Victory check.
    if (livingEnemies(s).length === 0) { s.result = 'victory'; ev.push({ t: 'result', v: 'victory' }); return; }
    // Ch.2 horror beat — the Mirror's cameo. Plain text. No styling. Missable.
    if (s.key === 'ch2') {
      if (s.round === 2 && !s.script.figureSeen) { s.script.figureSeen = true; log(ev, 'Among the herd, a figure stands at the wrong distance.'); }
      else if (s.round === 3 && s.script.figureSeen && !s.script.figureGone) { s.script.figureGone = true; log(ev, 'The figure is gone.'); }
    }
    s.round++;
    rollIntents(s);
    ev.push({ t: 'round', n: s.round });
  }

  /* ------------------------------------------------------------------ *
   *  Ch.3 — the scripted loss (defeat that ADVANCES the story)
   * ------------------------------------------------------------------ */
  function glasswrightScript(s, ev) {
    if (s.result) return;
    s.result = 'scripted_loss';
    log(ev, 'The Glasswright stops. He looks at the village behind you, and his face is not cruel. That is the worst part.', 'sys');
    log(ev, 'He raises one hand. The air goes quiet the way water goes still.', 'sys');
    log(ev, 'The hollowing wave comes down like weather.', 'warn');
    log(ev, 'Hale steps in front of it.', 'sys');
    ev.push({ t: 'scripted_loss' });
  }

  /* ------------------------------------------------------------------ *
   *  Ch.6 — The Lowing Man scripted beats
   * ------------------------------------------------------------------ */
  function checkLowingScripts(s, en, ev) {
    // The boss cannot die before the finale has resolved.
    if (en.hp <= 0 && !s.script.finaleDone) en.hp = 1;
    if (en.hp <= 0) {
      en.hp = 0; en.alive = false;
      // The herd shatters with its shepherd.
      for (const e2 of s.enemies) if (e2.key === 'calf' && e2.alive) { e2.alive = false; e2.hp = 0; }
      log(ev, 'The Lowing Man comes apart — not like a body. Like a window.', 'kill');
      s.result = 'victory'; ev.push({ t: 'result', v: 'victory' });
      return;
    }
    const frac = en.hp / en.maxhp;
    // The Counting arms at ~50%.
    if (frac <= 0.5) s.script.counting = true;
    // 40% — Stampede of What Remains -> Hale's Awakening. Untelegraphed. Unfair on purpose.
    if (frac <= 0.4 && !s.script.awakened) doAwakening(s, en, ev);
    // 10% — the guided finale.
    if (frac <= 0.10 && s.script.awakened && !s.script.finale) startFinale(s, en, ev);
  }

  function doAwakening(s, en, ev) {
    s.script.awakened = true;
    log(ev, 'The Lowing Man stops pretending to be either half.', 'warn');
    log(ev, 'STAMPEDE OF WHAT REMAINS — no telegraph, no fairness, everything at once.', 'warn');
    for (const u of s.party) {
      if (u.key === 'hale' && !u.alive) { u.alive = true; } // the scar refuses (no-softlock guarantee)
      if (u.alive) { u.hp = 1; u.shieldHits = 0; u.shieldHP = 0; }
    }
    log(ev, 'The party is driven to slivers.', 'edmg');
    en.skipNext = true; // that WAS its action — the next boss action is spent
    en.enrage = true;   // and what stands back up has stopped imitating patience (+25% damage)
    const hale = byKey(s, 'hale');
    ev.push({ t: 'awakening' });
    log(ev, 'Hale\'s scar answers.', 'sys');
    log(ev, 'Glass sings out of the wound and settles along the sword edge.', 'sys');
    log(ev, 'HALE BECOMES UNHOLLOWED. His Energy surges to full.', 'awaken');
    awakenHale(s, hale, ev, false);
  }
  function awakenHale(s, hale, ev, silent) {
    if (!hale) return;
    hale.awakened = true;
    hale.blades = 0; // legacy field retained only for old replay compatibility
    hale.energy = 3;
  }

  function startFinale(s, en, ev) {
    s.script.finale = true;
    const hale = byKey(s, 'hale');
    if (hale && !hale.alive) { hale.alive = true; hale.hp = Math.max(1, Math.round(hale.maxhp * 0.2)); log(ev, 'The scar refuses. Hale stands back up.', 'sys'); }
    // No-softlock guarantee: the guided Art always has enough standard Energy.
    if (hale.energy < 2) { hale.energy = 2; log(ev, 'The broken herd floods Hale\'s Arts gauge.', 'buff'); }
    log(ev, 'The Lowing Man gathers everything left of itself. A final Stampede — no telegraph, no counting now.', 'warn');
    log(ev, 'Every menu goes dark except one.', 'sys');
    s.lock = 'bulwark';
    ev.push({ t: 'finale_lock' });
  }

  // The player presses the one glowing button themselves. Guided, not cutscene.
  function resolveFinale(s, hale, ev) {
    hale.energy = Math.max(0, hale.energy - 2);
    log(ev, 'Hale — GLASS BULWARK.', 'act');
    for (const u of livingParty(s)) u.shieldHits = Math.max(u.shieldHits, 1);
    log(ev, 'The arsenal scatters — a pane of glass in front of every heartbeat.', 'shield');
    log(ev, 'THE FINAL STAMPEDE ARRIVES.', 'warn');
    for (const u of livingParty(s)) {
      u.shieldHits = 0; // the shield takes the whole herd
      u.hp = Math.max(1, Math.round(Math.min(u.hp, u.maxhp * 0.12)));
    }
    log(ev, 'The shields flare white — and hold. The party stands in the ringing quiet, on slivers.', 'shield');
    const en = s.enemies.find(e => e.key === 'lowingman');
    en.tele = 0; en.form = 'man'; en.staggered = false;
    s.script.finaleDone = true;
    s.lock = null;
    // Finisher window: next round, all specials cost 0.
    for (const u of livingParty(s)) u.acted = false;
    endRoundAfterFinale(s, ev);
  }
  function endRoundAfterFinale(s, ev) {
    // Skip the normal enemy phase (the Stampede WAS its action) and open the
    // finisher round: every special costs 0.
    s.attackedThisRound = [];
    for (const u of s.party) { u.guarding = false; u.acted = false; }
    s.round++;
    s.freeRound = s.round;
    rollIntents(s);
    ev.push({ t: 'round', n: s.round });
    ev.push({ t: 'finisher' });
    log(ev, 'FINISHER WINDOW — this round, every special costs nothing. End it.', 'awaken');
  }

  /* ------------------------------------------------------------------ *
   *  Public API
   * ------------------------------------------------------------------ */
  return {
    newBattle, availableActions, playerAct, elemMult, intentText, canReadIntents,
    availableLiveActions, chooseLiveAIAction, liveAct, liveEnemyPhase, liveUpkeep, liveSkillGain, LIVE_SKILL_GAIN, AI_PRESETS,
    livingParty, livingEnemies, partyHPfrac, byKey, byUid,
    UNITS, ENEMIES, BATTLES, SIDE_MISSIONS, HALE_AWAKENED, ELEM_ICON, UNIT_PROGRESSION, LEVEL_CAPS, xpToNext, grantUnitXP, combatProfile, applyStoryEvolutions, UNIT_LIBRARY, recordOwnedDiscoveries,
    LIVE_GESTURE_THRESHOLDS, liveGestureTier, PARTY_SIZE,
    SAVE_SCHEMA_VERSION, normalizeSaveState, validateSaveState, migrateSaveEnvelope,
    CHALLENGES, CHALLENGE_ITEMS, challengeUnlocked, evaluateChallengeMastery, sideMissionUnlocked,
    MARKET_ITEMS, marketRestockTier, marketItemUnlocked, BANNERS, bannerPool,
    COMBAT_EVENT_TYPES, combatEventHash,
    // Internal hooks exposed for the self-test suite only.
    _test: { dealToPlayer, dealToEnemy, dealBreak, heal, enemyPhase, endRound, rollIntents },
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
