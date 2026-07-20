'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const bundle = path.join(root, 'generated', 'pixellab-sprites.js');
const backup = bundle + '.missing-art-test';
let moved = false;
try {
  if (fs.existsSync(bundle)) { fs.renameSync(bundle, backup); moved = true; }
  const result = spawnSync(process.execPath, ['dev/build-mobile.js'], { cwd: root, encoding: 'utf8', env: { ...process.env, HOLLOW_BUILD: 'prod' } });
  assert.notStrictEqual(result.status, 0, 'production build must fail when the required player sprite bundle is missing');
} finally {
  if (moved) fs.renameSync(backup, bundle);
}
console.log('Missing-art build gate: passed.');
