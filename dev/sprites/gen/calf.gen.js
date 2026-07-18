'use strict';
// calf — small hollowglass calf, unsettlingly cute. 40x32, faces left.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#16262c', // outline
  d: '#22333a', // deep
  m: '#3e5a54', // body mid
  l: '#9adfd4', // hollow light
  f: '#cfe8e2', // pale crystal
  e: '#eafff9', // glint
  w: '#ffffff', // flash
};

// hop: 0 planted, 1 pounce-crouch, 2 headbutt hop
function pose(o) {
  const g = new Grid(40, 32);
  const br = o.breath | 0, ux = o.ux | 0;
  const uy = (o.hop === 2 ? -2 : o.hop === 1 ? 1 : 0) + br;

  // legs
  for (const [lx, sh] of [[12, 0], [18, 1], [28, 0], [33, 1]]) {
    g.rect(lx + ux, 22 + uy, lx + 2 + ux, 28 - sh + (o.hop === 2 ? -1 : 0), sh ? 'd' : 'm');
  }
  // round little body
  poly(g, [[10 + ux, 24 + uy], [12 + ux, 16 + uy], [22 + ux, 13 + uy], [32 + ux, 15 + uy], [36 + ux, 20 + uy], [34 + ux, 25 + uy], [24 + ux, 27 + uy], [12 + ux, 26 + uy]], 'm');
  g.line(16 + ux, 18 + uy, 30 + ux, 16 + uy, 'l', 1);            // translucent contour
  g.px(24 + ux, 20 + uy, 'f');
  // crystal tuft on the rump
  poly(g, [[28 + ux, 14 + uy], [31 + ux, 14 + uy], [30 + ux, 10 + uy]], 'f');
  g.px(29 + ux, 12 + uy, 'e');
  // tail flick
  g.line(35 + ux, 18 + uy, 38 + ux, 15 + uy + (o.breath ? 2 : 0), 'l', 1);
  // big head (faces left), oversized for cute
  const hx = (o.hop === 2 ? -2 : 0) + ux;
  g.ellipse(9 + hx, 15 + uy, 7, 6.4, 'm');
  poly(g, [[4 + hx, 18 + uy], [3 + hx, 21 + uy], [8 + hx, 22 + uy], [9 + hx, 19 + uy]], 'f'); // muzzle
  g.px(4 + hx, 20 + uy, 'd');                                     // nose
  // tiny horn nubs
  g.px(6 + hx, 9 + uy, 'f'); g.px(7 + hx, 8 + uy, 'e');
  g.px(12 + hx, 9 + uy, 'f');
  g.px(14 + hx, 12 + uy, 'f');                                    // ear shard
  // the big glassy eye
  g.disc(8 + hx, 14 + uy, 1.9, 'd');
  g.px(8 + hx, 13 + uy, 'w');                                     // sweet glint
  g.px(9 + hx, 15 + uy, 'l');                                     // ...too bright underneath

  g.outline('o');

  // one hollow notch (it is still one of them)
  g.clearRect(26 + ux, 13 + uy, 27 + ux, 13 + uy);
  g.px(26 + ux, 15 + uy, 'l');

  if (o.hop === 2) { g.px(1, 12, 'w'); g.px(0, 18, 'w'); }
  if (o.flash) {
    for (const [x, y] of [[8, 10], [20, 12], [32, 14], [14, 24], [28, 25]])
      g.px(x + ux, y, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ hop: 0, breath: 0 }), pose({ hop: 0, breath: 1 })],
  attack: [pose({ hop: 1, ux: 2, breath: 0 }), pose({ hop: 2, ux: -3, breath: 0 })],
  hit: [pose({ hop: 1, ux: 2, breath: 1, flash: true })],
};
emit('calf', { w: 40, h: 32, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('calf idle A');
