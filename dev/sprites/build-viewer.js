'use strict';
// build-viewer.js — assembles ../../sprite-viewer.html: a standalone dark gallery
// inlining every sprite file + renderer.js + manifest.js. Run from anywhere.
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const SPRITE_LIST = require('./manifest.js');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const spriteSrc = SPRITE_LIST.map(e => read(e.key + '.js')).join('\n');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hollowing — Sprite Library Viewer</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; padding:22px 26px 60px; background:#0b0e13; color:#cfd8e2;
         font:13px/1.5 'Segoe UI', system-ui, sans-serif; }
  h1 { font-size:17px; letter-spacing:2px; color:#9adfd4; font-weight:600; margin:0 0 4px; }
  .sub { color:#5d6b7a; font-size:11.5px; margin-bottom:22px; }
  .grid { display:flex; flex-wrap:wrap; gap:18px; }
  .card { background:#11161f; border:1px solid #1e2733; border-radius:10px; padding:12px 14px 14px; }
  .card h2 { font-size:13px; margin:0 0 2px; color:#e8eef4; font-weight:600; letter-spacing:.5px; }
  .meta { font-size:10.5px; color:#5d6b7a; margin-bottom:8px; }
  .stage { display:flex; align-items:flex-end; gap:14px; background:
           repeating-conic-gradient(#0e1219 0% 25%, #10151d 0% 50%) 0 0/16px 16px;
           border:1px solid #1a2230; border-radius:6px; padding:10px 12px 6px; }
  .stage .ground { border-bottom:1px solid #24303f; }
  canvas { image-rendering: pixelated; display:block; }
  select { margin-top:9px; background:#0d1117; color:#cfd8e2; border:1px solid #263140;
           border-radius:5px; padding:3px 8px; font-size:12px; }
  .zl { font-size:9.5px; color:#44515f; text-align:center; margin-top:2px; }
</style>
</head>
<body>
<h1>PROJECT HOLLOWING — SPRITE LIBRARY</h1>
<div class="sub">17 sprites &middot; 6 fps &middot; 3&times; and 6&times; nearest-neighbor &middot; party faces right, enemies face left</div>
<div class="grid" id="grid"></div>
<script>
const SPRITES = {};
${spriteSrc}
${read('renderer.js')}
${read('manifest.js')}
const grid = document.getElementById('grid');
const cells = [];
for (const entry of SPRITE_LIST) {
  const s = SPRITES[entry.key];
  const card = document.createElement('div'); card.className = 'card';
  const fc = Object.entries(entry.frames).map(([a,n]) => a + ' ' + n).join(' \\u00b7 ');
  card.innerHTML = '<h2>' + entry.key + '</h2>' +
    '<div class="meta">' + s.w + '\\u00d7' + s.h + ' \\u00b7 ' + fc + '</div>';
  const stage = document.createElement('div'); stage.className = 'stage';
  const canvases = [];
  for (const scale of [3, 6]) {
    const wrap = document.createElement('div');
    const cv = document.createElement('canvas');
    cv.width = s.w * scale; cv.height = s.h * scale;
    cv.className = 'ground';
    wrap.appendChild(cv);
    const zl = document.createElement('div'); zl.className = 'zl'; zl.textContent = scale + 'x';
    wrap.appendChild(zl);
    stage.appendChild(wrap);
    canvases.push({ cv, ctx: cv.getContext('2d'), scale });
  }
  card.appendChild(stage);
  const sel = document.createElement('select');
  for (const a of Object.keys(s.anims)) {
    const op = document.createElement('option'); op.value = a; op.textContent = a; sel.appendChild(op);
  }
  card.appendChild(sel);
  grid.appendChild(card);
  cells.push({ key: entry.key, sel, canvases });
}
function tick(t) {
  for (const c of cells) {
    const anim = c.sel.value;
    const fi = animFrame(c.key, anim, t, 6);
    for (const { cv, ctx, scale } of c.canvases) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      drawSprite(ctx, c.key, anim, fi, cv.width / 2, cv.height, scale, false);
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
</script>
</body>
</html>
`;
const out = path.join(dir, '..', '..', 'sprite-viewer.html');
fs.writeFileSync(out, html);
console.log('wrote ' + out + ' (' + html.length + ' bytes)');
