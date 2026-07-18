'use strict';
// construct — wooden training dummy on a post, rope joints. 40x48, faces left.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#241a10', // outline
  b: '#7a5a38', // wood mid
  B: '#4a3826', // wood dark
  l: '#a8834a', // wood light
  r: '#c9b48c', // rope
  t: '#a33d2e', // target red
  w: '#f5efdf', // flash / chips
};

// tilt: crossbar rotation (-1 rest-creak, 0 level, +2 wound, spin), lean: upper lean px
function pose(o) {
  const g = new Grid(40, 48);
  const lean = o.lean | 0, tilt = o.tilt | 0;

  // base + post (never move)
  poly(g, [[7, 45], [33, 45], [29, 41], [11, 41]], 'B');
  g.hline(9, 31, 44, 'o');
  g.rect(18, 30, 21, 41, 'b');
  g.vline(18, 31, 41, 'B'); g.px(20, 33, 'B'); g.px(19, 37, 'B');

  const ux = lean;
  // torso block
  g.rect(13 + ux, 17, 26 + ux, 30, 'b');
  g.vline(13 + ux, 18, 29, 'l');                                // light on facing side
  g.vline(25 + ux, 18, 29, 'B'); g.vline(26 + ux, 18, 29, 'B');
  g.px(22 + ux, 20, 'B'); g.px(23 + ux, 26, 'B');               // grain knots
  // chest target
  g.disc(18 + ux, 24, 3.4, 'r');
  g.disc(18 + ux, 24, 2.1, 't');
  g.px(18 + ux, 24, 'r');
  // crossbar arms (tilt rotates ends)
  const ly = 19 - tilt, ry = 19 + tilt;
  g.line(3 + ux, ly + 1, 36 + ux, ry + 1, 'b', 3);
  g.line(3 + ux, ly, 36 + ux, ry, 'l', 1);
  // rope-wrapped arm ends
  g.rect(3 + ux, ly - 1, 6 + ux, ly + 3, 'r');
  g.px(4 + ux, ly + 1, 'B'); g.px(5 + ux, ly - 1, 'B');
  g.rect(33 + ux, ry - 1, 36 + ux, ry + 3, 'r');
  g.px(34 + ux, ry + 1, 'B');
  g.px(4 + ux, ly + 4, 'r'); g.px(4 + ux, ly + 5, 'r');         // frayed rope dangle
  g.px(35 + ux, ry + 4, 'r');
  // rope joint at neck
  g.rect(16 + ux, 15, 23 + ux, 16, 'r');
  g.px(18 + ux, 16, 'B');
  // head block
  g.rect(14 + ux, 6, 24 + ux, 14, 'l');
  g.rect(22 + ux, 7, 24 + ux, 13, 'b');                         // shaded back
  g.hline(15 + ux, 21 + ux, 6, 'b');
  // painted face (faces left)
  g.px(16 + ux, 9, 'o'); g.px(17 + ux, 9, 'o');                 // painted eye
  g.hline(15 + ux, 18 + ux, 12, 'B');                           // painted mouth line
  g.px(19 + ux, 10, 'B');

  g.outline('o');

  if (o.spin) {                                                 // strike arcs
    g.px(1 + ux, ly - 2, 'w'); g.px(2 + ux, ly + 5, 'w'); g.px(0, 24, 'w');
  }
  if (o.flash) {
    for (const [x, y] of [[15, 7], [22, 5], [12, 20], [27, 18], [16, 27], [24, 28]])
      g.px(x + lean, y, 'w');
    g.px(9, 12, 'l'); g.px(30, 10, 'l');                        // wood chips flying
  }
  return g;
}

const anims = {
  idle: [pose({ lean: 0, tilt: 0 }), pose({ lean: 0, tilt: -1 })],           // slow creak
  attack: [pose({ lean: 2, tilt: 3 }), pose({ lean: -2, tilt: -2, spin: true })], // wind + spin-strike
  hit: [pose({ lean: 3, tilt: 1, flash: true })],
};
emit('construct', { w: 40, h: 48, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('construct idle A');
