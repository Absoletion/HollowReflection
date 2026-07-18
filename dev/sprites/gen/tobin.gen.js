'use strict';
// tobin — small boy, oversized scholar coat, 3 orbiting water orbs. 48x48, faces right.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#1c2436', // outline (ink blue)
  k: '#f0c39a', // skin
  h: '#c99a55', // sandy hair
  H: '#8f6a38', // hair shade
  c: '#3e5a80', // scholar coat
  C: '#283c58', // coat shade
  l: '#7c96b8', // cuff/trim light
  t: '#4db8ff', // water orb
  T: '#1f7ecc', // orb deep
  w: '#ffffff', // glint / flash
};

// orb layout per mode+phase: returns [x,y] triples
function orbPos(mode, phase, ux, bob) {
  const cx = 20 + ux, cy = 16 + bob;
  if (mode === 'orbit') {
    // three moon stations drifting clockwise, always clear of the body
    return phase === 0
      ? [[6 + ux, 16 + bob], [20 + ux, 2 + bob], [34 + ux, 16 + bob]]
      : [[7 + ux, 12 + bob], [24 + ux, 3 + bob], [35 + ux, 20 + bob]];
  }
  if (mode === 'pull') return [[8 + ux, 14 + bob], [6 + ux, 22 + bob], [10 + ux, 29 + bob]];
  if (mode === 'shoot') return [[34 + ux, 20 + bob], [40 + ux, 19 + bob], [45, 21 + bob]];
  if (mode === 'return') return [[38 + ux, 26 + bob], [30 + ux, 12 + bob], [24 + ux, 30 + bob]];
  if (mode === 'raise') return phase === 0
    ? [[13 + ux, 5 + bob], [21 + ux, 2 + bob], [29 + ux, 5 + bob]]
    : [[12 + ux, 4 + bob], [21 + ux, 3 + bob], [30 + ux, 6 + bob]];
  if (mode === 'drop') return [[9 + ux, 32 + bob], [15 + ux, 36 + bob], [28 + ux, 34 + bob]];
  return [];
}

function pose(o) {
  const g = new Grid(48, 48);
  const bob = o.bob | 0, ux = o.ux | 0;

  // ----- oversized coat: bell from narrow shoulders to wide hem -----
  poly(g, [[15 + ux, 25 + bob], [26 + ux, 25 + bob], [29, 42], [12, 42]], 'c');
  poly(g, [[15 + ux, 25 + bob], [17 + ux, 25 + bob], [16, 42], [12, 42]], 'C');
  g.hline(13, 28, 41, 'C');                                    // hem
  g.vline(21 + ux, 27 + bob, 40, 'C');                         // front seam
  g.px(22 + ux, 29 + bob, 'l'); g.px(22 + ux, 33 + bob, 'l'); g.px(22 + ux, 37, 'l'); // buttons
  // droopy sleeves (hands swallowed)
  if (o.arms === 'raise') {
    g.line(16 + ux, 27 + bob, 12 + ux, 18 + bob, 'c', 3);
    g.line(25 + ux, 27 + bob, 29 + ux, 18 + bob, 'c', 3);
    g.rect(11 + ux, 17 + bob, 13 + ux, 18 + bob, 'l');
    g.rect(28 + ux, 17 + bob, 30 + ux, 18 + bob, 'l');
  } else {
    g.line(15 + ux, 27 + bob, 12 + ux, 34 + bob, 'c', 3);
    g.line(26 + ux, 27 + bob, 29 + ux, 34 + bob, 'c', 3);
    g.rect(11 + ux, 34 + bob, 13 + ux, 35 + bob, 'l');         // rolled cuffs
    g.rect(28 + ux, 34 + bob, 30 + ux, 35 + bob, 'l');
  }
  // high collar
  g.rect(15 + ux, 23 + bob, 26 + ux, 25 + bob, 'C');
  g.rect(23 + ux, 23 + bob, 26 + ux, 24 + bob, 'l');
  // tiny shoes
  g.rect(15, 43, 18, 44, 'C'); g.rect(22, 43, 26, 44, 'C');

  // ----- big head -----
  g.ellipse(20 + ux, 16 + bob, 7.6, 7, 'k');
  g.ellipse(19 + ux, 12.5 + bob, 8, 5, 'h');                   // mop top
  g.rect(13 + ux, 12 + bob, 14 + ux, 18 + bob, 'h');
  g.vline(13 + ux, 13 + bob, 18 + bob, 'H');
  g.px(21 + ux, 7 + bob, 'h'); g.px(22 + ux, 6 + bob, 'h');    // cowlick
  g.px(22 + ux, 7 + bob, 'H');
  g.ellipse(23 + ux, 17.5 + bob, 5, 5.2, 'k');                 // face
  g.px(24 + ux, 13 + bob, 'H'); g.px(25 + ux, 12 + bob, 'h');  // fringe tuft
  g.px(25 + ux, 15 + bob, 'o'); g.px(25 + ux, 16 + bob, 'o');  // big eye
  g.px(24 + ux, 16 + bob, 'T');                                 // watery iris hint
  g.px(26 + ux, 20 + bob, 'H');                                 // small mouth

  g.outline('o');

  // ----- water orbs (drawn over, self-outlined) -----
  const orbs = orbPos(o.orbs, o.phase | 0, ux, bob);
  orbs.forEach(([x, y], i) => {
    g.disc(x, y, 2.6, 'o');
    g.disc(x, y, 2.0, 't');
    g.px(x + 1, y + 1, 'T'); g.px(x, y + 1, 'T');
    g.px(x - 1, y - 1, 'w');
  });
  if (o.orbs === 'shoot') {                                    // motion trails
    g.hline(28 + ux, 30 + ux, 20 + bob, 'w');
    g.hline(35 + ux, 36 + ux, 19 + bob, 'w');
    g.hline(41, 42, 21 + bob, 'w');
  }
  if (o.orbs === 'raise') {                                    // mist sparkle
    const p = o.phase | 0;
    g.px(17 + ux, 1 + bob + p, 'w'); g.px(26 + ux, 0 + bob + (1 - p), 'w');
    g.px(21 + ux, 8 + bob, 't');
  }
  if (o.flash) {
    for (const [x, y] of [[16, 10], [24, 8], [13, 19], [27, 15], [16, 28], [25, 30], [20, 22]])
      g.px(x + ux, y + bob, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ bob: 0, orbs: 'orbit', phase: 0 }), pose({ bob: 1, orbs: 'orbit', phase: 1 })],
  attack: [pose({ bob: 0, ux: -2, orbs: 'pull' }), pose({ bob: 0, ux: 3, orbs: 'shoot' }), pose({ bob: 0, ux: 1, orbs: 'return' })],
  hit: [pose({ bob: 1, ux: -3, orbs: 'drop', flash: true })],
  cast: [pose({ bob: 0, orbs: 'raise', phase: 0, arms: 'raise' }), pose({ bob: 1, orbs: 'raise', phase: 1, arms: 'raise' })],
};
emit('tobin', { w: 48, h: 48, pal: PAL, anims });
if (process.argv.includes('--show')) { anims.idle[0].print('tobin idle A'); anims.cast[0].print('tobin cast A'); }
