'use strict';
// glasswright — tall coat, porcelain face mostly shadowed, orbiting shards, elegant stillness.
// 48x56, faces left. The body NEVER moves in idle; only the shards do.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#0a0f16', // outline (void)
  c: '#141d2e', // long coat
  C: '#1d2a40', // coat fold highlight
  d: '#161f30', // collar / hat shadow
  p: '#e3ded6', // porcelain
  e: '#9adfd4', // hollow eyes / shard glass
  E: '#eafffb', // shard bright
  w: '#ffffff', // flash
};

function shard(g, x, y, r, s) { // s: size 1..3
  if (s >= 3) {
    poly(g, [[x, y - 3], [x + 2, y], [x, y + 3], [x - 2, y]], 'e');
    g.px(x, y - 1, 'E'); g.px(x, y, 'E');
  } else if (s === 2) {
    g.px(x, y - 1, 'e'); g.px(x - 1, y, 'e'); g.px(x + 1, y, 'e'); g.px(x, y + 1, 'e');
    g.px(x, y, 'E');
  } else {
    g.px(x, y, 'e');
  }
}

// shards mode: orbit(phase) | fan | scatter
function pose(o) {
  const g = new Grid(48, 56);
  const ux = o.ux | 0;

  // ----- long coat: tall, narrow, still -----
  poly(g, [[19 + ux, 12], [29 + ux, 12], [33 + ux, 22], [34 + ux, 44], [31 + ux, 52], [17 + ux, 52], [14 + ux, 44], [15 + ux, 22]], 'c');
  // split hem
  poly(g, [[22 + ux, 40], [26 + ux, 40], [25 + ux, 52], [23 + ux, 52]], 'o');
  // fold highlights (the only light the coat allows)
  g.line(17 + ux, 22, 16 + ux, 44, 'C', 1);
  g.line(31 + ux, 22, 32 + ux, 44, 'C', 1);
  g.px(20 + ux, 16, 'C'); g.px(28 + ux, 17, 'C');
  // high collar
  poly(g, [[18 + ux, 12], [30 + ux, 12], [28 + ux, 7], [20 + ux, 7]], 'd');
  g.hline(20 + ux, 28 + ux, 12, 'd');

  // ----- porcelain face, upper half in shadow -----
  poly(g, [[20 + ux, 10], [28 + ux, 10], [27 + ux, 1], [21 + ux, 1]], 'd');   // hood shadow mass
  g.ellipse(23.5 + ux, 6, 3.6, 4.2, 'p');                                     // porcelain oval
  g.rect(19 + ux, 1, 28 + ux, 5, 'd');                                        // shadow swallows the brow
  g.px(21 + ux, 5, 'd'); g.px(26 + ux, 5, 'd');
  g.px(21 + ux, 6, 'e'); g.px(25 + ux, 6, 'e');                               // two calm lights
  g.px(23 + ux, 9, 'd');                                                      // the faintest mouth

  // ----- sleeves: hands never shown... almost -----
  g.line(17 + ux, 16, 15 + ux, 30, 'c', 2);
  g.line(31 + ux, 16, 33 + ux, 30, 'c', 2);
  if (o.hand) {                                                               // one pale hand, presenting
    g.line(16 + ux, 18, 9 + ux, 24, 'c', 2);
    g.px(7 + ux, 25, 'p'); g.px(6 + ux, 26, 'p'); g.px(7 + ux, 27, 'p');
  }

  g.outline('o');

  // ----- orbiting glass shards (the motion lives here) -----
  if (o.shards === 'orbit') {
    const ph = o.phase | 0;
    const stations = ph === 0
      ? [[7, 14, 3], [40, 10, 2], [42, 34, 3], [8, 40, 2], [24, 0, 1], [3, 26, 1]]
      : [[6, 20, 3], [41, 16, 2], [40, 28, 3], [10, 45, 2], [30, 0, 1], [44, 44, 1]];
    for (const [x, y, s] of stations) shard(g, x + ux, y, 0, s);
  } else if (o.shards === 'fan') {                                            // converged, aimed left
    for (const [x, y, s] of [[6, 16, 3], [4, 22, 3], [3, 28, 3], [6, 34, 3], [9, 10, 2], [10, 40, 2]])
      shard(g, x + ux, y, 0, s);
    g.px(1, 22, 'w'); g.px(0, 28, 'w'); g.px(2, 15, 'w');                     // launch glints
  } else if (o.shards === 'scatter') {                                        // knocked wide
    for (const [x, y, s] of [[4, 8, 2], [43, 6, 2], [45, 40, 2], [5, 48, 2], [38, 22, 1], [12, 3, 1]])
      shard(g, x + ux, y, 0, s);
  }

  if (o.flash) {
    for (const [x, y] of [[20, 4], [27, 8], [16, 20], [31, 26], [19, 38], [29, 44]])
      g.px(x + ux, y, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ shards: 'orbit', phase: 0 }), pose({ shards: 'orbit', phase: 1 })],
  attack: [pose({ shards: 'orbit', phase: 1, hand: true, ux: 1 }), pose({ shards: 'fan', hand: true, ux: -1 })],
  hit: [pose({ shards: 'scatter', ux: 2, flash: true })],
};
emit('glasswright', { w: 48, h: 56, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('glasswright idle A');
