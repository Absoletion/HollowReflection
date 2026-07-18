'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let nextFrame = null;
const noop = () => {};
const context2d = new Proxy({
  measureText: () => ({ width: 10 }),
  createLinearGradient: () => ({ addColorStop: noop }),
}, { get(target, key) { return key in target ? target[key] : noop; }, set(target, key, value) { target[key] = value; return true; } });
const document = {
  head: { appendChild: noop },
  createElement(tag) {
    if (tag === 'canvas') return { width: 0, height: 0, className: '', parentNode: null, getContext: () => context2d };
    return { textContent: '', className: '', classList: { add: noop }, appendChild: noop, remove: noop };
  },
};
const sandbox = {
  console, document, SPRITES: {}, BATTLEART: {}, CUTINS: {}, PORTRAITS: {}, RIGPARTS: {},
  requestAnimationFrame(cb) { nextFrame = cb; return 1; },
  setTimeout(fn) { fn(); return 1; },
  clearTimeout: noop,
  drawSprite: noop,
  animFrame: () => 0,
  spritePlaybackFps: () => 10,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const source = fs.readFileSync(path.join(__dirname, 'mui3-stage.js'), 'utf8') + '\nglobalThis.__Stage = Stage;';
vm.runInContext(source, sandbox, { filename: 'mui3-stage.js' });

(async () => {
  const Stage = sandbox.__Stage;
  Stage.fast = true;
  const hale = { uid: 'p1', key: 'hale', side: 'party', name: 'Hale', elem: 'dark', hp: 440, maxhp: 440, alive: true, awakened: false };
  const enemy = { uid: 'e1', key: 'construct', side: 'enemy', name: 'Construct', elem: 'earth', hp: 0, maxhp: 150, alive: false, buffs: [], breakMax: 0 };
  const state = { key: 'act1_1', party: [hale], enemies: [enemy], script: {} };
  Stage.init(state, state.key);
  Stage.snapshot({ ...state, enemies: [{ ...enemy, hp: 150, alive: true }] });
  Stage.play([{ t: 'result', v: 'victory' }], state, { uid: hale.uid, actionId: 'cross_slash', tier: 'Skill' });
  let resolved = false;
  const idle = Stage.whenIdle().then(() => { resolved = true; });
  await Promise.resolve();
  assert.strictEqual(resolved, false, 'result presentation must wait behind the visual beat queue');
  assert(nextFrame, 'stage must schedule a visual frame');
  nextFrame(16);
  await idle;
  assert.strictEqual(resolved, true, 'result presentation releases after queued visuals finish');
  console.log('Stage result queue tests: passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
