'use strict';
// genlib.js — pixel-art authoring toolkit for the Hollowing sprite library.
// Grids are arrays of char rows; '.' = transparent. Serializes to SPRITES['key'] files.
const fs = require('fs');
const path = require('path');

class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = Array.from({ length: h }, () => Array(w).fill('.'));
  }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  px(x, y, c) { x = Math.round(x); y = Math.round(y); if (this.in(x, y)) this.d[y][x] = c; return this; }
  get(x, y) { return this.in(Math.round(x), Math.round(y)) ? this.d[Math.round(y)][Math.round(x)] : '.'; }
  rect(x0, y0, x1, y1, c) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++)
      for (let x = Math.round(x0); x <= Math.round(x1); x++) this.px(x, y, c);
    return this;
  }
  hline(x0, x1, y, c) { return this.rect(x0, y, x1, y, c); }
  vline(x, y0, y1, c) { return this.rect(x, y0, x, y1, c); }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.4), dy = (y - cy) / (ry + 0.4);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    return this;
  }
  disc(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }
  // Bresenham line with square brush of side `thick`.
  line(x0, y0, x1, y1, c, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0;
    const o = Math.floor((thick - 1) / 2);
    for (;;) {
      for (let by = 0; by < thick; by++) for (let bx = 0; bx < thick; bx++) this.px(x - o + bx, y - o + by, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    return this;
  }
  // Copy every non-transparent px of src onto this at offset.
  blit(src, dx = 0, dy = 0) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++)
      if (src.d[y][x] !== '.') this.px(x + dx, y + dy, src.d[y][x]);
    return this;
  }
  clone() { const g = new Grid(this.w, this.h); for (let y = 0; y < this.h; y++) g.d[y] = this.d[y].slice(); return g; }
  shifted(dx, dy) { const g = new Grid(this.w, this.h); return g.blit(this, dx, dy); }
  // Add outline color at transparent cells 4-adjacent to any filled cell.
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.d[y][x] !== '.') continue;
      if (this.get(x + 1, y) !== '.' || this.get(x - 1, y) !== '.' ||
          this.get(x, y + 1) !== '.' || this.get(x, y - 1) !== '.') add.push([x, y]);
    }
    for (const [x, y] of add) this.d[y][x] = c;
    return this;
  }
  replace(a, b) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++)
      if (this.d[y][x] === a) this.d[y][x] = b;
    return this;
  }
  // Erase a rect back to transparent.
  clearRect(x0, y0, x1, y1) { return this.rect(x0, y0, x1, y1, '.'); }
  rows() { return this.d.map(r => r.join('')); }
  print(label) {
    if (label) console.log('--- ' + label + ' ---');
    console.log(this.d.map(r => r.map(ch => ch === '.' ? ' ' : ch).join('')).join('\n'));
  }
  printSilhouette(label) {
    if (label) console.log('--- ' + label + ' (silhouette) ---');
    console.log(this.d.map(r => r.map(ch => ch === '.' ? '.' : '#').join('')).join('\n'));
  }
}

// diamond/shard helper: 4-point polygon fill (convex), pts = [[x,y]x4]
function poly(g, pts, c) {
  const ys = pts.map(p => p[1]);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    let xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) * (bx - ax) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) g.px(x, y, c);
  }
  return g;
}

function validate(key, spec) {
  const { w, h, pal, anims } = spec;
  for (const [name, frames] of Object.entries(anims)) {
    if (!frames.length) throw new Error(`${key}.${name}: no frames`);
    frames.forEach((fr, i) => {
      const rows = fr.rows ? fr.rows() : fr;
      if (rows.length !== h) throw new Error(`${key}.${name}[${i}]: ${rows.length} rows != h ${h}`);
      rows.forEach((row, y) => {
        if (row.length !== w) throw new Error(`${key}.${name}[${i}] row ${y}: len ${row.length} != w ${w}`);
        for (const ch of row) if (ch !== '.' && !pal[ch]) throw new Error(`${key}.${name}[${i}] row ${y}: char '${ch}' not in pal`);
      });
    });
  }
}

// Write dev/sprites/<key>.js in the canonical SPRITES format.
function emit(key, spec) {
  validate(key, spec);
  const animsSrc = Object.entries(spec.anims).map(([name, frames]) => {
    const fr = frames.map(f => {
      const rows = f.rows ? f.rows() : f;
      return '[\n' + rows.map(r => `  '${r}'`).join(',\n') + '\n]';
    }).join(',\n');
    return `${name}:[\n${fr}\n]`;
  }).join(',\n');
  const palSrc = Object.entries(spec.pal).map(([k, v]) => `'${k}':'${v}'`).join(',');
  const src = `SPRITES['${key}'] = {\nw:${spec.w}, h:${spec.h},\npal:{${palSrc}},\nanims:{\n${animsSrc}\n},\nanchor:'feet'\n};\n`;
  const out = path.join(__dirname, '..', key + '.js');
  fs.writeFileSync(out, src);
  const counts = Object.entries(spec.anims).map(([n, f]) => `${n}:${f.length}`).join(' ');
  console.log(`wrote ${out} (${src.length} bytes) ${spec.w}x${spec.h} ${counts}`);
}

module.exports = { Grid, poly, emit };
