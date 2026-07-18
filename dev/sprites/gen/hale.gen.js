'use strict';
// hale + hale_awakened — traveler swordsman, 48x48, facing right.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#241a12', // outline (dark leather-brown)
  k: '#eab98d', // skin
  h: '#7a5230', // brown hair
  H: '#503318', // hair shade
  c: '#5f7d6e', // traveler tunic
  C: '#3d554a', // tunic shade
  m: '#8a6a45', // leather mid
  M: '#59422a', // leather shade
  s: '#cdd9e2', // steel
  w: '#ffffff', // highlight / flash
};
const PAL_AWK = Object.assign({}, PAL, {
  a: '#9adfd4', // hollow rim-light
  g: '#eafffb', // glass glint
});

// pose opts: bob, ux (upper-body lean px), sword: rest|back|thrust|down|up, flash, glow (-1 off / 0 / 1)
function pose(o) {
  const g = new Grid(48, 48);
  const bob = o.bob | 0, ux = o.ux | 0;

  // ----- behind layer: sword when wound back -----
  if (o.sword === 'back') {
    g.line(23 + ux, 31 + bob, 12 + ux, 36 + bob, 's', 2); // blade trailing low behind
    g.px(11 + ux, 37 + bob, 's');
  }
  // back arm (far side)
  if (o.sword === 'up') {
    g.line(15 + ux, 26 + bob, 12 + ux, 20 + bob, 'C', 2);
    g.px(12 + ux, 18 + bob, 'k'); g.px(11 + ux, 18 + bob, 'k');
  } else {
    g.rect(12 + ux, 26 + bob, 13 + ux, 32 + bob, 'C');
    g.px(12 + ux, 33 + bob, 'k');
  }

  // ----- legs (planted) -----
  g.rect(16, 35, 19, 42, 'm'); g.rect(23, 35, 26, 42, 'm');
  g.vline(16, 35, 42, 'M'); g.vline(23, 35, 42, 'M');
  g.rect(14, 43, 20, 45, 'M'); g.rect(22, 43, 29, 45, 'M'); // boots, toe forward
  g.hline(15, 19, 43, 'm'); g.hline(23, 28, 43, 'm');

  // ----- torso -----
  g.rect(14 + ux, 24 + bob, 27 + ux, 34 + bob, 'c');
  g.rect(14 + ux, 24 + bob, 16 + ux, 34 + bob, 'C');           // back shade
  g.hline(15 + ux, 26 + ux, 33 + bob, 'M');                     // belt
  g.hline(15 + ux, 26 + ux, 34 + bob, 'M');
  g.px(21 + ux, 33 + bob, 'm');                                 // buckle
  g.line(17 + ux, 25 + bob, 24 + ux, 32 + bob, 'm', 1);         // chest strap
  // mantle + scarf
  g.rect(13 + ux, 22 + bob, 28 + ux, 25 + bob, 'C');
  g.rect(24 + ux, 22 + bob, 28 + ux, 24 + bob, 'c');
  // scarf tail flutters with bob
  poly(g, [[13 + ux, 23 + bob], [8 + ux, 26 + bob - bob * 2], [7 + ux, 30 + bob - bob * 2], [12 + ux, 28 + bob]], 'C');

  // ----- head -----
  const hx = ux, hy = bob;
  g.ellipse(21 + hx, 15 + hy, 8, 7.5, 'k');                     // skull
  g.ellipse(20 + hx, 11 + hy, 8.5, 5.5, 'h');                   // hair cap
  g.rect(13 + hx, 11 + hy, 15 + hx, 19 + hy, 'h');              // back hair
  g.rect(13 + hx, 12 + hy, 14 + hx, 19 + hy, 'H');
  g.ellipse(24 + hx, 16.5 + hy, 5.2, 5.6, 'k');                 // face front
  // spiky fringe
  g.px(27 + hx, 9 + hy, 'h'); g.px(28 + hx, 10 + hy, 'h'); g.px(29 + hx, 12 + hy, 'h');
  g.px(25 + hx, 8 + hy, 'h'); g.px(22 + hx, 7 + hy, 'h');
  g.px(26 + hx, 11 + hy, 'H'); g.px(23 + hx, 10 + hy, 'H');
  // face
  g.px(26 + hx, 14 + hy, 'H');                                  // brow
  g.px(26 + hx, 15 + hy, 'o'); g.px(26 + hx, 16 + hy, 'o');     // eye
  g.px(27 + hx, 19 + hy, 'M');                                  // determined mouth

  // ----- front arm + sword -----
  const sh = [26 + ux, 26 + bob]; // shoulder
  if (o.sword === 'rest') {
    g.line(sh[0], sh[1], 30 + ux, 32 + bob, 'c', 2);
    g.rect(30 + ux, 32 + bob, 31 + ux, 33 + bob, 'k');          // hand
    g.line(31 + ux, 31 + bob, 33 + ux, 33 + bob, 'm', 1);       // grip
    g.px(33 + ux, 30 + bob, 'm'); g.px(32 + ux, 31 + bob, 'm'); // guard
    g.line(34 + ux, 29 + bob, 41 + ux, 19 + bob, 's', 2);       // blade up-right
    g.px(42 + ux, 18 + bob, 's');
  } else if (o.sword === 'back') {
    g.line(sh[0], sh[1], 23 + ux, 31 + bob, 'c', 2);
    g.rect(23 + ux, 31 + bob, 24 + ux, 32 + bob, 'k');
  } else if (o.sword === 'thrust') {
    g.line(sh[0], sh[1] + 1, 35 + ux, 27 + bob, 'c', 2);
    g.rect(36 + ux, 26 + bob, 37 + ux, 28 + bob, 'k');          // fist
    g.vline(38 + ux, 25 + bob, 29 + bob, 'm');                  // guard
    g.rect(39 + ux, 26 + bob, 45, 27 + bob, 's');               // blade
    g.px(46, 27 + bob, 's');
    g.px(45, 26 + bob, 'w');                                    // edge glint
  } else if (o.sword === 'down') {
    g.line(sh[0], sh[1], 32 + ux, 32 + bob, 'c', 2);
    g.rect(32 + ux, 32 + bob, 33 + ux, 33 + bob, 'k');
    g.px(34 + ux, 32 + bob, 'm');
    g.line(35 + ux, 34 + bob, 42 + ux, 42 + bob, 's', 2);       // blade swung down-through
  } else if (o.sword === 'up') { // cast — both arms raised
    g.line(sh[0], sh[1], 30 + ux, 19 + bob, 'c', 2);
    g.rect(30 + ux, 17 + bob, 31 + ux, 18 + bob, 'k');
  }

  g.outline('o');

  // ----- fx after outline -----
  if (o.flash) {
    for (const [x, y] of [[17, 10], [25, 7], [13, 17], [28, 14], [15, 27], [26, 30], [20, 22], [29, 25]])
      g.px(x + ux, y + bob, 'w');
  }
  if (o.glow >= 0) {
    const p = o.glow;
    const spark = p === 0
      ? [[21, 12], [17, 9], [26, 10], [12, 14], [30, 15], [21, 6]]
      : [[24, 9], [15, 11], [28, 13], [10, 16], [21, 4], [31, 10]];
    for (const [x, y] of spark) g.px(x + ux, y + bob - 10, 's');
    g.px(21 + ux, 8 + bob - 6, 'w'); g.px(11 + ux + p * 2, 12 + bob - 4, 'w');
  }
  return g;
}

function frames() {
  return {
    idle: [pose({ bob: 0, sword: 'rest' }), pose({ bob: 1, sword: 'rest' })],
    attack: [pose({ bob: 0, ux: -2, sword: 'back' }), pose({ bob: 0, ux: 3, sword: 'thrust' }), pose({ bob: 0, ux: 1, sword: 'down' })],
    hit: [pose({ bob: 1, ux: -3, sword: 'back', flash: true })],
    cast: [pose({ bob: 0, sword: 'up', glow: 0 }), pose({ bob: 1, sword: 'up', glow: 1 })],
  };
}

// ---- hale (base) ----
const base = frames();
emit('hale', { w: 48, h: 48, pal: PAL, anims: base });

// ---- hale_awakened: rim-light, cheek scar glow, three floating glass blades behind ----
function awaken(g, phase) {
  const r = g.clone();
  // pale hollow rim-light down the back edge: recolor filled px whose left neighbor is outline-with-transparent-beyond
  for (let y = 6; y <= 34; y++) {
    for (let x = 1; x < 30; x++) {
      if (r.d[y][x] === 'o' && r.get(x - 1, y) === '.' && r.get(x + 1, y) !== '.' && r.get(x + 1, y) !== 'o') {
        r.d[y][x] = 'a'; break; // leftmost edge px of this row becomes rim
      }
    }
  }
  // scar glow on cheek
  r.px(25, 18, 'a'); r.px(24, 17, 'a'); r.px(25, 17, 'g');
  // three glass blades floating behind (left), shimmering between phases
  const shards = [[6, 11], [2, 20], [7, 28]];
  shards.forEach(([sx, sy], i) => {
    const dy = (i + phase) % 2 === 0 ? 0 : -1;
    // small kunai-shaped glass blade, point up-right
    r.line(sx, sy + dy + 4, sx + 3, sy + dy, 'a', 2);
    r.px(sx + 4, sy + dy - 1, 'a');
    r.px(sx - 1, sy + dy + 5, 'a');
    r.px(phase === 0 ? sx + 1 : sx + 3, sy + dy + (phase === 0 ? 3 : 0), 'g'); // shimmer glint
  });
  return r;
}
const awk = frames();
const A = {
  idle: [awaken(awk.idle[0], 0), awaken(awk.idle[1], 1)],
  attack: awk.attack.map((f, i) => awaken(f, i % 2)),
  hit: [awaken(awk.hit[0], 0)],
  cast: awk.cast.map((f, i) => awaken(f, i)),
};
// awakened cast glimmers hollow-pale instead of steel
A.cast = A.cast.map(f => { const r = f.clone(); return r.replace('s', 'a'); });
emit('hale_awakened', { w: 48, h: 48, pal: PAL_AWK, anims: A });

if (process.argv.includes('--show')) {
  base.idle[0].print('hale idle A');
  base.attack[1].print('hale strike');
  A.idle[0].print('awakened idle A');
}
