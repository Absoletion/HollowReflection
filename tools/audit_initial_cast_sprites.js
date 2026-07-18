'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { SPRITES: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, 'generated', 'pixellab-sprites.js'), 'utf8'),
  context,
  { filename: 'generated/pixellab-sprites.js' }
);

const units = {
  tobin: {
    required: ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat'],
    height: 145,
    sourceHeight: 143,
    facing: null, // Completed legacy South package; regenerate only by explicit decision.
  },
  hearthgar: {
    required: ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat'],
    height: 206,
    sourceHeight: 211,
    facing: null,
  },
  brigga: {
    required: ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat'],
    height: 160,
    sourceHeight: 161,
    facing: 'south-west',
  },
  marlowe: {
    required: ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat'],
    height: 191,
    sourceHeight: 195,
    facing: 'south-west',
  },
  brant: {
    required: ['idle', 'move', 'skill', 'burst', 'hit', 'stagger', 'victory', 'defeat'],
    absent: ['arts'],
    height: 199,
    sourceHeight: 201,
    facing: 'south-west',
  },
  milla: {
    required: ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat'],
    height: 183,
    sourceHeight: 181,
    facing: 'south-west',
  },
  nix: {
    required: ['idle', 'move', 'skill', 'burst', 'hit', 'stagger', 'victory', 'defeat'],
    absent: ['arts'],
    height: 182,
    sourceHeight: 184,
    facing: 'south-west',
  },
};

function pngDimensions(dataUrl) {
  const prefix = 'data:image/png;base64,';
  assert(dataUrl.startsWith(prefix), 'frame is not an embedded PNG data URL');
  const buffer = Buffer.from(dataUrl.slice(prefix.length), 'base64');
  assert(buffer.length > 24, 'embedded PNG is truncated');
  assert.strictEqual(buffer.toString('ascii', 1, 4), 'PNG', 'embedded frame lost PNG signature');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

let totalFrames = 0;
const report = {};
for (const [key, contract] of Object.entries(units)) {
  const sprite = context.SPRITES[key];
  assert(sprite, `${key}: sprite is missing from the generated runtime payload`);
  assert.strictEqual(sprite.w, 256, `${key}: runtime canvas width changed`);
  assert.strictEqual(sprite.h, 256, `${key}: runtime canvas height changed`);
  assert.deepStrictEqual(
    { x: sprite.anchor.x, y: sprite.anchor.y },
    { x: 128, y: 238 },
    `${key}: shared foot anchor changed`
  );
  assert.strictEqual(sprite.targetHeightPx, contract.height, `${key}: target height changed`);
  assert.strictEqual(sprite.sourceVisibleHeightPx, contract.sourceHeight, `${key}: source height changed`);
  if (contract.facing) {
    assert.strictEqual(
      sprite.designProfile.battleFacing,
      contract.facing,
      `${key}: production facing is not Southwest`
    );
  }
  for (const absent of contract.absent || []) {
    assert.strictEqual(sprite.anims[absent], undefined, `${key}: unexpectedly contains ${absent}`);
  }
  const counts = {};
  for (const animation of contract.required) {
    const frames = sprite.anims[animation];
    assert(Array.isArray(frames) && frames.length >= 5, `${key}.${animation}: insufficient frames`);
    for (const frame of frames) {
      const size = pngDimensions(frame);
      assert.strictEqual(size.width, 256, `${key}.${animation}: frame width changed`);
      assert.strictEqual(size.height, 256, `${key}.${animation}: frame height changed`);
    }
    counts[animation] = frames.length;
    totalFrames += frames.length;
  }

  const recordPath = path.join(
    root,
    'design',
    'cast-production',
    'production-records',
    `${key}.json`
  );
  assert(fs.existsSync(recordPath), `${key}: production record is missing`);
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  if (['brant', 'milla', 'nix'].includes(key)) {
    assert(
      record.status.includes('integrated-structural-qa-passed'),
      `${key}: production record does not show integrated structural QA`
    );
    assert(
      record.qa && record.qa.spriteContract === 'passed' &&
      record.qa.standaloneValidator === 'passed',
      `${key}: production record lacks validator evidence`
    );
  }
  report[key] = counts;
}

const htmlPath = path.join(root, 'hollowing-demo.html');
assert(fs.existsSync(htmlPath), 'staging standalone demo is missing');
const html = fs.readFileSync(htmlPath, 'utf8');
for (const key of Object.keys(units)) {
  assert(html.includes(`"${key}":{"w":256`), `${key}: standalone demo lacks embedded sprite`);
}

console.log(JSON.stringify({
  ok: true,
  auditedUnits: Object.keys(units),
  auditedFrames: totalFrames,
  runtimeFramesIncludingReferenceCast: (html.match(/data:image\/png;base64/g) || []).length,
  animationCounts: report,
  visualQa: 'Unit Library and live-combat inspection still required before promotion',
}, null, 2));
