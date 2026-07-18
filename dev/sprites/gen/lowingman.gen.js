'use strict';
// The Lowing Man — 96x72, faces left. Two arrangements of the same hollowglass mass:
//   lowingman_beast: bull bulk first, a man's torso where the neck should be
//   lowingman_man:   the man half upright, bull mass slumped behind like a cloak
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#16262c', // outline
  D: '#0d181e', // deep shadow / sockets
  d: '#22333a', // mass deep
  m: '#3c5350', // mass mid
  l: '#9adfd4', // hollow contour light
  f: '#cfe8e2', // pale man-glass
  F: '#eafffb', // bright glass
  w: '#ffffff', // flash
};

function spikes(g, list, ux, uy) {
  for (const [sx, sy, sw, sh] of list) {
    poly(g, [[sx + ux, sy + uy], [sx + sw + ux, sy + uy], [sx + (sw >> 1) + ux, sy - sh + uy]], 'f');
    g.px(sx + (sw >> 1) + ux, sy - sh + 2 + uy, 'F');
  }
}

// ============ BEAST FORM ============
// mode: idle | rear | charge ; breath 0/1
function beast(o) {
  const g = new Grid(96, 72);
  const br = o.breath | 0;
  const ux = (o.mode === 'charge' ? -5 : o.mode === 'rear' ? 4 : 0);
  const by = br + (o.mode === 'rear' ? -2 : 0);
  const msway = o.mode === 'idle' ? -br : 0;   // the man sways against the heave

  // ----- legs -----
  for (const [lx, sh] of [[18, 0], [32, 1], [62, 0], [76, 1]]) {
    g.rect(lx + ux, 52, lx + 7 + ux, 66 - sh, sh ? 'd' : 'm');
    g.rect(lx - 1 + ux, 66 - sh, lx + 8 + ux, 68, 'd');
  }

  // ----- the bull mass (bulk reads first) -----
  poly(g, [[8 + ux, 44 + by], [12 + ux, 32 + by], [24 + ux, 26 + by], [44 + ux, 22 + by], [64 + ux, 20 + by], [82 + ux, 26 + by], [90 + ux, 38 + by], [88 + ux, 50 + by], [76 + ux, 58 + by], [30 + ux, 58 + by], [12 + ux, 54 + by]], 'm');
  poly(g, [[14 + ux, 50 + by], [30 + ux, 57 + by], [72 + ux, 57 + by], [40 + ux, 52 + by]], 'd'); // under-shade
  poly(g, [[60 + ux, 20 + by], [82 + ux, 26 + by], [90 + ux, 38 + by], [74 + ux, 34 + by]], 'd'); // haunch facet
  // hollow contours
  g.line(20 + ux, 32 + by, 52 + ux, 26 + by, 'l', 1);
  g.line(30 + ux, 40 + by, 70 + ux, 32 + by, 'l', 1);
  g.px(46 + ux, 30 + by, 'F'); g.px(62 + ux, 28 + by, 'f'); g.px(34 + ux, 36 + by, 'f');
  // spine crystals over the hump
  spikes(g, [[46, 23, 6, 8], [56, 21, 7, 11], [67, 21, 6, 8], [76, 25, 5, 6]], ux, by);
  // vestigial horns where a head is NOT
  g.line(12 + ux, 30 + by, 4 + ux, 24 + by, 'f', 2);
  g.px(2 + ux, 22 + by, 'F');
  g.line(24 + ux, 27 + by, 20 + ux, 20 + by, 'f', 2);

  // ----- the man's torso, where the neck should be -----
  const mx = 26 + ux + msway, my = by;
  poly(g, [[mx - 4, 30 + my], [mx - 2, 12 + my], [mx + 6, 10 + my], [mx + 9, 28 + my]], 'f'); // trunk
  g.vline(mx + 5, 13 + my, 26 + my, 'l');                        // glassy sternum line
  g.px(mx + 1, 18 + my, 'F');
  // small tilted head, face in shadow
  g.ellipse(mx + 2, 6 + my, 4.4, 4.6, 'f');
  g.rect(mx - 2, 4 + my, mx + 4, 6 + my, 'D');                   // shadow band
  g.px(mx, 5 + my, 'l'); g.px(mx + 3, 5 + my, 'l');              // two dim lights, wrong
  g.px(mx + 1, 10 + my, 'D');                                    // open mouth (the lowing)
  g.px(mx + 1, 11 + my, 'D');
  // arms hanging wrong (too long, bent backwards)
  g.line(mx - 3, 14 + my, mx - 8, 26 + my, 'f', 2);
  g.line(mx - 8, 26 + my, mx - 5, 42 + my, 'f', 2);
  g.px(mx - 5, 44 + my, 'f'); g.px(mx - 4, 45 + my, 'f'); g.px(mx - 6, 44 + my, 'f'); // fingers
  g.line(mx + 8, 14 + my, mx + 13, 28 + my, 'f', 2);
  g.line(mx + 13, 28 + my, mx + 10, 40 + my, 'f', 2);
  g.px(mx + 10, 42 + my, 'f'); g.px(mx + 11, 43 + my, 'f');

  g.outline('o');

  // hollow notches
  g.clearRect(50 + ux, 21 + by, 52 + ux, 22 + by);
  g.clearRect(86 + ux, 42 + by, 88 + ux, 43 + by);
  g.px(51 + ux, 24 + by, 'l'); g.px(86 + ux, 45 + by, 'l');

  if (o.mode === 'charge') {                                     // speed dust
    g.px(92, 50, 'w'); g.px(94, 44, 'w'); g.px(90, 56, 'w');
    g.hline(88, 92, 38, 'l');
  }
  if (o.flash) {
    for (const [x, y] of [[24, 8], [30, 20], [14, 34], [48, 24], [70, 24], [86, 36], [40, 50]])
      g.px(x + ux, y, 'w');
  }
  return g;
}

// ============ MAN FORM ============
// mode: idle | raise | sweep ; breath 0/1
function man(o) {
  const g = new Grid(96, 72);
  const br = o.breath | 0;
  const ux = (o.mode === 'sweep' ? -3 : 0);
  const sy = br;                                                  // shoulders rise (breathing wrong)

  // ----- bull mass slumped behind like a cloak -----
  poly(g, [[30 + ux, 26 - br], [48, 24], [70, 24], [86, 32], [92, 46], [88, 60], [72, 67], [40, 67], [30 + ux, 60]], 'm');
  poly(g, [[36, 60], [44, 66], [80, 66], [58, 58]], 'd');
  poly(g, [[66, 24], [86, 32], [92, 46], [78, 40]], 'd');
  g.line(40, 36, 74, 30, 'l', 1);
  g.line(46, 48, 82, 40, 'l', 1);
  g.px(58, 34, 'f'); g.px(70, 36, 'F'); g.px(50, 42, 'f');
  spikes(g, [[52, 26, 6, 7], [62, 24, 7, 9], [73, 26, 6, 6]], 0, -br);
  // slack horn dragging at the seam
  g.line(34 + ux, 30, 40, 24, 'f', 2);

  // ----- the man half, upright -----
  const mx = 20 + ux;
  // legs: too thin, slightly wrong-kneed
  g.line(mx + 2, 44 + sy, mx, 56, 'f', 2);
  g.line(mx, 56, mx + 3, 67, 'f', 2);
  g.line(mx + 8, 44 + sy, mx + 11, 55, 'f', 2);
  g.line(mx + 11, 55, mx + 9, 67, 'f', 2);
  g.rect(mx + 1, 67, mx + 4, 68, 'f'); g.rect(mx + 8, 67, mx + 11, 68, 'f');
  // elongated trunk
  poly(g, [[mx - 2, 46 + sy], [mx - 1, 20 + sy], [mx + 11, 18 + sy], [mx + 12, 46 + sy]], 'f');
  g.vline(mx + 5, 22 + sy, 42 + sy, 'l');                        // sternum crack
  g.px(mx + 5, 30 + sy, 'F');
  g.rect(mx - 1, 20 + sy, mx + 1, 44 + sy, 'l');                 // rim toward the mass? no—toward light
  // head: tilted, watching
  g.ellipse(mx + 4, 12 + sy, 5, 5.4, 'f');
  g.rect(mx - 1, 9 + sy, mx + 7, 12 + sy, 'D');                  // shadowed brow
  g.px(mx + 1, 10 + sy, 'l'); g.px(mx + 5, 10 + sy, 'l');        // dim eye-lights
  g.px(mx + 3, 16 + sy, 'D'); g.px(mx + 3, 17 + sy, 'D');        // mouth, slightly open
  // back arm merges into the cloak-mass
  g.line(mx + 11, 24 + sy, mx + 18, 30, 'f', 2);
  // front arm
  if (o.mode === 'raise') {
    g.line(mx - 1, 24 + sy, mx - 6, 12 + sy, 'f', 2);
    g.px(mx - 7, 10 + sy, 'f'); g.px(mx - 8, 9 + sy, 'f');
    // shards gathering above the raised hand
    for (const [x, y] of [[8, 4], [12, 2], [5, 8], [15, 6]]) g.px(x, y + sy, 'l');
    g.px(10, 5 + sy, 'F');
  } else if (o.mode === 'sweep') {
    g.line(mx - 1, 24 + sy, mx - 10, 34 + sy, 'f', 2);
    g.px(mx - 11, 36 + sy, 'f');
    // shards flying left
    for (const [x, y] of [[2, 30], [6, 36], [4, 24], [9, 40]]) { g.px(x, y, 'l'); g.px(x + 1, y, 'F'); }
    g.px(1, 33, 'w');
  } else {
    // hanging, far too long
    g.line(mx - 1, 24 + sy, mx - 4, 40 + sy, 'f', 2);
    g.line(mx - 4, 40 + sy, mx - 2, 52 + sy, 'f', 2);
    g.px(mx - 2, 54 + sy, 'f'); g.px(mx - 3, 55 + sy, 'f');
  }

  g.outline('o');

  g.clearRect(60 + ux, 24 - br, 61 + ux, 25 - br);
  g.px(60 + ux, 27 - br, 'l');

  return g;
}

const beastAnims = {
  idle: [beast({ mode: 'idle', breath: 0 }), beast({ mode: 'idle', breath: 1 })],
  attack: [beast({ mode: 'rear', breath: 0 }), beast({ mode: 'charge', breath: 1 })],
  hit: [beast({ mode: 'rear', breath: 1, flash: true })],       // shared hit lives on the beast
};
emit('lowingman_beast', { w: 96, h: 72, pal: PAL, anims: beastAnims });

const manAnims = {
  idle: [man({ mode: 'idle', breath: 0 }), man({ mode: 'idle', breath: 1 })],
  attack: [man({ mode: 'raise', breath: 0 }), man({ mode: 'sweep', breath: 1 })],
};
emit('lowingman_man', { w: 96, h: 72, pal: PAL, anims: manAnims });

if (process.argv.includes('--show')) {
  beastAnims.idle[0].print('beast idle A');
  manAnims.idle[0].print('man idle A');
}
