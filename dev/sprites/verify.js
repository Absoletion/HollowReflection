'use strict';
// verify.js — integrity gate for the sprite library. Run: node dev/sprites/verify.js
// Asserts: every manifest key has a sprite file; frame row counts == h; row lengths == w;
// every char is in pal or '.'; every anim has >= 1 frame; manifest frame counts match.
const fs = require('fs');
const path = require('path');
const SPRITE_LIST = require('./manifest.js');

let failures = 0;
const fail = msg => { failures++; console.error('FAIL  ' + msg); };

const SPRITES = {};
for (const entry of SPRITE_LIST) {
  const file = path.join(__dirname, entry.key + '.js');
  if (!fs.existsSync(file)) { fail(entry.key + ': sprite file missing'); continue; }
  try {
    new Function('SPRITES', fs.readFileSync(file, 'utf8'))(SPRITES);
  } catch (e) {
    fail(entry.key + ': does not evaluate: ' + e.message);
  }
}

for (const entry of SPRITE_LIST) {
  const s = SPRITES[entry.key];
  if (!s) { fail(entry.key + ': not defined after load'); continue; }
  if (s.w !== entry.w || s.h !== entry.h)
    fail(`${entry.key}: size ${s.w}x${s.h} != manifest ${entry.w}x${entry.h}`);
  if (s.anchor !== 'feet') fail(`${entry.key}: anchor '${s.anchor}' != 'feet'`);
  if (!s.pal || typeof s.pal !== 'object') { fail(entry.key + ': missing pal'); continue; }
  for (const [c, hex] of Object.entries(s.pal))
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) fail(`${entry.key}: pal['${c}'] bad color '${hex}'`);
  const anims = s.anims || {};
  if (!Object.keys(anims).length) fail(entry.key + ': no anims');
  for (const [name, frames] of Object.entries(anims)) {
    if (!Array.isArray(frames) || frames.length < 1) { fail(`${entry.key}.${name}: no frames`); continue; }
    frames.forEach((frame, i) => {
      if (!Array.isArray(frame) || frame.length !== s.h)
        return fail(`${entry.key}.${name}[${i}]: ${frame.length} rows != h ${s.h}`);
      frame.forEach((row, y) => {
        if (typeof row !== 'string' || row.length !== s.w)
          return fail(`${entry.key}.${name}[${i}] row ${y}: len ${row && row.length} != w ${s.w}`);
        for (const ch of row)
          if (ch !== '.' && !(ch in s.pal))
            return fail(`${entry.key}.${name}[${i}] row ${y}: char '${ch}' not in pal`);
      });
    });
  }
  // manifest frame counts
  for (const [name, count] of Object.entries(entry.frames)) {
    const got = anims[name] ? anims[name].length : 0;
    if (got !== count) fail(`${entry.key}.${name}: ${got} frames != manifest ${count}`);
  }
  for (const name of Object.keys(anims))
    if (!(name in entry.frames)) fail(`${entry.key}.${name}: present in sprite but not in manifest`);
}

const total = SPRITE_LIST.reduce((n, e) => n + Object.values(e.frames).reduce((a, b) => a + b, 0), 0);
if (failures) { console.error(`verify: ${failures} failure(s) across ${SPRITE_LIST.length} sprites`); process.exit(1); }
console.log(`verify: OK — ${SPRITE_LIST.length} sprites, ${total} frames, all dimensions/palettes/anims valid`);
