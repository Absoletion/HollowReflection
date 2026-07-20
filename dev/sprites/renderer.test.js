'use strict';

const assert = require('assert');

class MockImage {
  constructor() { this.complete = false; this.naturalWidth = 0; this._src = ''; }
  set src(value) { this._src = value; this.complete = true; this.naturalWidth = 256; }
  get src() { return this._src; }
}

global.Image = MockImage;
global.SPRITES = {
  generated: {
    w: 256, h: 256, anchor: { x: 128, y: 238 }, renderScale: 0.355, imageFrames: true,
    anims: { idle: ['data:image/png;base64,AAAA'] }
  },
  legacy: {
    w: 2, h: 2, anchor: { x: 1, y: 2 }, pal: { X: '#fff' },
    anims: { idle: [['XX', '.X']] }
  },
  atlas: {
    format: 'atlas-v2', renderScale: 1, anchor: { x: 1, y: 2 },
    pages: [{ id: 'atlas-page', src: 'data:image/png;base64,BBBB' }],
    frames: { first: { page: 'atlas-page', source: { x: 3, y: 4, w: 5, h: 6 }, pivot: { x: 1, y: 2 } } },
    animations: { idle: { timeline: [{ frame: { page: 'atlas-page', source: { x: 3, y: 4, w: 5, h: 6 }, pivot: { x: 1, y: 2 } }, durationMs: 100 }], loop: true, playbackFps: 10 } }
  }
};

const R = require('./renderer.js');
const calls = [];
const ctx = {
  imageSmoothingEnabled: true,
  save() { calls.push(['save']); }, restore() { calls.push(['restore']); },
  translate(x, y) { calls.push(['translate', x, y]); },
  scale(x, y) { calls.push(['scale', x, y]); },
  drawImage() { calls.push(['drawImage'].concat(Array.from(arguments))); },
  fillRect() {}, set fillStyle(value) { this._fillStyle = value; }
};

assert.deepStrictEqual(R.drawSprite(ctx, 'generated', 'idle', 0, 100, 200, 1, false), { drawn: true, status: 'ready' });
const draw = calls.find(call => call[0] === 'drawImage');
assert(draw, 'generated image frame should reach drawImage');
assert.strictEqual(draw[4], 256 * 0.355, 'renderScale should normalize generated frame width');
assert.strictEqual(draw[5], 256 * 0.355, 'renderScale should normalize generated frame height');
assert.doesNotThrow(() => R.drawSprite(ctx, 'legacy', 'idle', 0, 0, 0, 1, false));
assert.strictEqual(R.preloadSpriteFrames('generated').length, 1);
assert.strictEqual(R.SpriteRuntime.hasAnimation('generated', 'idle'), true);
assert.deepStrictEqual(R.drawSprite(ctx, 'atlas', 'idle', 0, 100, 200, 1, false), { drawn: true, status: 'ready' });

console.log('Renderer tests: passed.');
