'use strict';
// hound — crystal hound, translucent pale-blue facets, jagged spine. 56x40, faces left.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#22384a', // outline (deep glacial blue)
  d: '#3c5a6c', // body deep
  p: '#7fb0c8', // pale blue mid
  P: '#b8dcec', // pale blue light
  f: '#e6f6ff', // facet bright
  w: '#ffffff', // glint / flash
};

// mode: stand | crouch | lunge ; breath 0/1
function pose(o) {
  const g = new Grid(56, 40);
  const br = o.breath | 0, ux = o.ux | 0;
  const lunge = o.mode === 'lunge', crouch = o.mode === 'crouch';
  const by = (crouch ? 2 : 0) + br;                              // body drop

  // ----- legs -----
  if (lunge) {
    g.line(16 + ux, 26, 6 + ux, 34, 'd', 3);                     // front legs thrown forward
    g.line(20 + ux, 27, 12 + ux, 36, 'p', 2);
    g.line(40 + ux, 26, 48 + ux, 35, 'd', 3);                    // hind extended back
    g.line(44 + ux, 26, 51 + ux, 33, 'p', 2);
  } else {
    g.rect(14 + ux, 28 + by, 17 + ux, 36, 'd');                  // front pair
    g.rect(19 + ux, 29 + by, 21 + ux, 36, 'p');
    g.rect(38 + ux, 28 + by, 41 + ux, 36, 'd');                  // hind pair
    g.rect(43 + ux, 29 + by, 45 + ux, 36, 'p');
  }
  // paws
  const paws = lunge ? [[4, 35], [10, 37], [48, 36], [51, 34]] : [[13, 36], [18, 36], [37, 36], [42, 36]];
  for (const [px_, py] of paws) g.rect(px_ + ux, py, px_ + ux + 3, py + 1, 'd');

  // ----- body: low slab, chest deep at left -----
  poly(g, [[10 + ux, 22 + by], [18 + ux, 16 + by], [34 + ux, 15 + by], [46 + ux, 18 + by], [50 + ux, 24 + by], [44 + ux, 29 + by], [24 + ux, 30 + by], [12 + ux, 27 + by]], 'd');
  // translucent facets
  g.line(20 + ux, 18 + by, 30 + ux, 27 + by, 'p', 1);
  g.line(30 + ux, 16 + by, 42 + ux, 25 + by, 'p', 1);
  g.line(24 + ux, 16 + by, 22 + ux, 28 + by, 'P', 1);
  g.px(34 + ux, 20 + by, 'f'); g.px(27 + ux, 22 + by, 'f');
  g.px(40 + ux, 22 + by, 'P');
  // jagged spine crystals
  const spikes = [[16, 15, 4], [23, 14, 6], [31, 13, 5], [39, 15, 4], [46, 17, 3]];
  for (const [sx, sy, sh] of spikes) {
    poly(g, [[sx + ux, sy + by], [sx + 3 + ux, sy + by], [sx + 2 + ux, sy - sh + by]], 'P');
    g.px(sx + 1 + ux, sy - sh + 1 + by, 'f');
  }
  // crystal tail spike
  g.line(50 + ux, 22 + by, 54 + ux, 17 + by, 'p', 2);
  g.px(55 + ux, 16 + by, 'P');

  // ----- head: angular wedge, faces left -----
  const hx = (lunge ? -4 : 0) + ux, hy = (lunge ? 2 : 0) + by;
  poly(g, [[12 + hx, 16 + hy], [2 + hx, 20 + hy], [6 + hx, 25 + hy], [14 + hx, 25 + hy], [16 + hx, 19 + hy]], 'd');
  poly(g, [[10 + hx, 14 + hy], [15 + hx, 12 + hy], [16 + hx, 18 + hy]], 'P'); // ear shard
  if (lunge) {                                                  // jaw open
    poly(g, [[6 + hx, 25 + hy], [0 + hx, 29 + hy], [10 + hx, 28 + hy], [13 + hx, 26 + hy]], 'p');
    g.px(3 + hx, 26 + hy, 'f'); g.px(5 + hx, 24 + hy, 'f');     // teeth glint
    g.px(1 + hx, 22 + hy, 'w');                                  // snap
  } else {
    g.line(4 + hx, 24 + hy, 10 + hx, 25 + hy, 'p', 1);           // closed jaw
  }
  g.px(7 + hx, 20 + hy, 'f'); g.px(8 + hx, 20 + hy, 'w');       // glowing eye
  g.px(11 + hx, 18 + hy, 'P');                                   // brow facet

  g.outline('o');

  if (o.flash) {
    for (const [x, y] of [[8, 17], [20, 13], [34, 12], [46, 16], [15, 25], [40, 26]])
      g.px(x + ux, y, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ mode: 'stand', breath: 0 }), pose({ mode: 'stand', breath: 1 })],
  attack: [pose({ mode: 'crouch', ux: 3, breath: 0 }), pose({ mode: 'lunge', ux: -3, breath: 0 })],
  hit: [pose({ mode: 'crouch', ux: 3, breath: 1, flash: true })],
};
emit('hound', { w: 56, h: 40, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('hound idle A');
