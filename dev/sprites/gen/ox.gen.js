'use strict';
// ox — translucent hollowglass ox, vacant stance, hollow at the edges. 72x56, faces left.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#16262c', // outline (deep hollow)
  d: '#22333a', // body deep
  m: '#48635c', // body mid
  l: '#9adfd4', // hollow light contour
  f: '#cfe8e2', // pale crystal
  e: '#eafff9', // bright glint
  w: '#ffffff', // flash
};

// head: low | toss ; breath 0/1
function pose(o) {
  const g = new Grid(72, 56);
  const br = o.breath | 0, ux = o.ux | 0;
  const by = br;

  // ----- legs (stumpy columns) -----
  for (const [lx, sh] of [[16, 0], [26, 1], [48, 0], [58, 1]]) {
    g.rect(lx + ux, 40, lx + 5 + ux, 51 - sh, sh ? 'd' : 'm');
    g.rect(lx + ux, 51 - sh, lx + 5 + ux, 52, 'd');
  }

  // ----- massive body -----
  poly(g, [[10 + ux, 32 + by], [14 + ux, 22 + by], [26 + ux, 16 + by], [46 + ux, 15 + by], [60 + ux, 18 + by], [66 + ux, 26 + by], [65 + ux, 36 + by], [58 + ux, 42 + by], [22 + ux, 43 + by], [12 + ux, 39 + by]], 'm');
  poly(g, [[12 + ux, 36 + by], [22 + ux, 42 + by], [56 + ux, 42 + by], [30 + ux, 39 + by]], 'd'); // belly shade
  // interior hollow contours (translucency)
  g.line(18 + ux, 22 + by, 40 + ux, 18 + by, 'l', 1);
  g.line(24 + ux, 27 + by, 50 + ux, 22 + by, 'l', 1);
  g.px(30 + ux, 23 + by, 'f'); g.px(44 + ux, 20 + by, 'f'); g.px(55 + ux, 25 + by, 'f');
  // shoulder crystal shards
  for (const [sx, sy, sh] of [[24, 16, 5], [32, 14, 7], [41, 14, 5]]) {
    poly(g, [[sx + ux, sy + by], [sx + 4 + ux, sy + by], [sx + 2 + ux, sy - sh + by]], 'f');
    g.px(sx + 2 + ux, sy - sh + 2 + by, 'e');
  }
  // faceted haunch patch
  poly(g, [[52 + ux, 28 + by], [60 + ux, 26 + by], [62 + ux, 33 + by], [55 + ux, 35 + by]], 'd');
  g.px(57 + ux, 30 + by, 'l');

  // ----- head (faces left) -----
  const hy = (o.head === 'toss' ? -6 : 0) + by;
  const hx = (o.head === 'toss' ? -2 : 0) + ux;
  poly(g, [[14 + hx, 22 + hy], [4 + hx, 26 + hy], [2 + hx, 36 + hy], [8 + hx, 42 + hy], [16 + hx, 40 + hy], [19 + hx, 30 + hy]], 'm');
  poly(g, [[4 + hx, 34 + hy], [3 + hx, 39 + hy], [8 + hx, 41 + hy], [10 + hx, 37 + hy]], 'f'); // muzzle glass
  g.px(5 + hx, 36 + hy, 'd');                                    // nostril
  // horn: pale crescent curving up-left
  g.line(13 + hx, 23 + hy, 6 + hx, 16 + hy, 'f', 2);
  g.px(4 + hx, 14 + hy, 'f'); g.px(3 + hx, 13 + hy, 'e');
  g.px(15 + hx, 20 + hy, 'f');                                   // ear shard
  // vacant eye
  g.px(9 + hx, 29 + hy, 'e');
  g.px(10 + hx, 29 + hy, 'l');
  if (o.head === 'toss') {                                       // motion arcs
    g.px(0, 20, 'w'); g.px(2, 12, 'w'); g.px(8, 8 + by, 'w');
  }

  g.outline('o');

  // hollow at the edges: eat small notches out of the silhouette
  g.clearRect(34 + ux, 14 + by, 36 + ux, 15 + by);
  g.clearRect(63 + ux, 30 + by, 65 + ux, 31 + by);
  g.clearRect(20 + ux, 42 + by, 21 + ux, 43 + by);
  g.px(35 + ux, 16 + by, 'l'); g.px(63 + ux, 32 + by, 'l');      // glow at the wound

  if (o.flash) {
    for (const [x, y] of [[12, 24], [30, 14], [50, 16], [62, 26], [20, 38], [44, 40]])
      g.px(x + ux, y, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ head: 'low', breath: 0 }), pose({ head: 'low', breath: 1 })],
  attack: [pose({ head: 'low', ux: 3, breath: 1 }), pose({ head: 'toss', ux: -2, breath: 0 })],
  hit: [pose({ head: 'low', ux: 3, breath: 0, flash: true })],
};
emit('ox', { w: 72, h: 56, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('ox idle A');
