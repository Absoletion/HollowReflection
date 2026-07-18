'use strict';
// hearthgar — bulky black-iron furnace golem, red glow through cracks, tiny visor eyes. 48x48, faces right.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#100e12', // outline (near-black, not pure)
  i: '#2e2a30', // black iron
  I: '#4c4654', // iron edge light
  d: '#1c191f', // iron deep / furnace mouth
  e: '#ff6b3d', // furnace ember
  E: '#ffd94d', // hot core
  r: '#8c1e10', // deep ember red
  v: '#eafffb', // visor eyes (pale, nervous)
  w: '#ffffff', // flash
};

// fists: rest | wind | punch | open ; hot: 0 dim, 1 bright
function pose(o) {
  const g = new Grid(48, 48);
  const bob = o.bob | 0, ux = o.ux | 0, hot = o.hot | 0;
  const EM = hot ? 'E' : 'e';

  // ----- massive legs -----
  g.rect(13, 34, 20, 43, 'i'); g.rect(24, 34, 31, 43, 'i');
  g.vline(14, 35, 42, 'I'); g.vline(25, 35, 42, 'I');
  g.hline(13, 20, 38, 'd'); g.hline(24, 31, 38, 'd');          // knee joints
  g.rect(11, 44, 21, 46, 'd'); g.rect(23, 44, 33, 46, 'd');    // sabatons
  g.hline(12, 20, 44, 'I'); g.hline(24, 32, 44, 'I');

  // ----- torso block + furnace belly -----
  g.rect(12 + ux, 20 + bob, 32 + ux, 34 + bob, 'i');
  g.rect(12 + ux, 20 + bob, 14 + ux, 34 + bob, 'd');           // back shade
  g.hline(13 + ux, 31 + ux, 21 + bob, 'I');                    // top edge catch
  g.vline(31 + ux, 21 + bob, 33 + bob, 'I');
  // furnace grill
  g.rect(17 + ux, 26 + bob, 28 + ux, 33 + bob, 'd');
  for (const fx of [19, 22, 25]) g.vline(fx + ux, 27 + bob, 32 + bob, EM);
  g.px(22 + ux, 29 + bob, 'E'); g.px(19 + ux, 31 + bob, 'r');
  g.hline(18 + ux, 27 + ux, 29 + bob, 'd');                    // grill bar
  // glowing cracks in the plating
  g.px(15 + ux, 23 + bob, EM); g.px(16 + ux, 24 + bob, 'r');
  g.px(29 + ux, 23 + bob, 'r'); g.px(30 + ux, 24 + bob, EM);
  g.px(27 + ux, 35 + bob, 'r');

  // ----- pauldrons -----
  g.rect(6 + ux, 17 + bob, 14 + ux, 25 + bob, 'i');
  g.rect(29 + ux, 17 + bob, 37 + ux, 25 + bob, 'i');
  g.hline(7 + ux, 13 + ux, 17 + bob, 'I'); g.hline(30 + ux, 36 + ux, 17 + bob, 'I');
  g.px(6 + ux, 17 + bob, '.'); g.px(37 + ux, 17 + bob, '.');   // soften corners
  g.px(6 + ux, 25 + bob, '.'); g.px(37 + ux, 25 + bob, '.');
  g.line(33 + ux, 19 + bob, 35 + ux, 23 + bob, 'r', 1);        // cracked front pauldron
  g.px(34 + ux, 21 + bob, EM);
  // back chimney vent
  g.rect(8 + ux, 12 + bob, 10 + ux, 16 + bob, 'd');
  g.px(9 + ux, 11 + bob, 'r');

  // ----- small bucket head + visor -----
  g.rect(18 + ux, 12 + bob, 28 + ux, 19 + bob, 'i');
  g.hline(19 + ux, 27 + ux, 12 + bob, 'I');
  g.rect(20 + ux, 15 + bob, 27 + ux, 17 + bob, 'd');           // visor slit
  g.px(23 + ux, 16 + bob, 'v'); g.px(26 + ux, 16 + bob, 'v');  // two tiny worried eyes
  g.px(28 + ux, 14 + bob, 'I');                                 // rivet

  // ----- arms + gauntlets -----
  if (o.fists === 'rest') {
    g.rect(31 + ux, 25 + bob, 35 + ux, 31 + bob, 'i');          // front arm down
    g.rect(31 + ux, 31 + bob, 36 + ux, 36 + bob, 'd');          // big fist
    g.hline(32 + ux, 35 + ux, 31 + bob, 'I');
    g.rect(7 + ux, 25 + bob, 10 + ux, 31 + bob, 'd');           // back arm
    g.rect(6 + ux, 31 + bob, 11 + ux, 35 + bob, 'd');
  } else if (o.fists === 'wind') {
    g.rect(28 + ux, 24 + bob, 32 + ux, 30 + bob, 'i');          // fist pulled to hip
    g.rect(27 + ux, 29 + bob, 33 + ux, 34 + bob, 'd');
    g.rect(7 + ux, 25 + bob, 10 + ux, 31 + bob, 'd');
    g.rect(6 + ux, 31 + bob, 11 + ux, 35 + bob, 'd');
  } else if (o.fists === 'punch') {
    g.rect(33 + ux, 24 + bob, 39 + ux, 28 + bob, 'i');          // arm rammed forward
    g.rect(39 + ux, 22 + bob, 45, 29 + bob, 'd');               // huge gauntlet
    g.hline(40 + ux, 44, 22 + bob, 'I');
    g.px(46, 25 + bob, 'w'); g.px(37 + ux, 20 + bob, 'w');      // impact speed px
    g.px(41 + ux, 31 + bob, 'w');
    g.rect(7 + ux, 25 + bob, 10 + ux, 31 + bob, 'd');
    g.rect(6 + ux, 31 + bob, 11 + ux, 35 + bob, 'd');
  } else if (o.fists === 'open') {    // cast: arms spread, palms up
    g.rect(32 + ux, 22 + bob, 38 + ux, 26 + bob, 'i');
    g.rect(37 + ux, 19 + bob, 41 + ux, 23 + bob, 'd');
    g.rect(5 + ux, 22 + bob, 11 + ux, 26 + bob, 'd');
    g.rect(3 + ux, 19 + bob, 7 + ux, 23 + bob, 'd');
  }

  g.outline('o');

  if (o.flash) {
    for (const [x, y] of [[17, 13], [26, 11], [12, 22], [31, 19], [15, 30], [28, 32], [22, 24]])
      g.px(x + ux, y + bob, 'w');
  }
  if (o.glow >= 0) {                  // furnace roar: sparks rising from vents
    const p = o.glow;
    const pts = p === 0
      ? [[9, 8], [20, 6], [30, 8], [14, 4], [26, 3], [36, 12]]
      : [[10, 5], [22, 3], [32, 6], [16, 8], [28, 7], [38, 10]];
    for (const [x, y] of pts) g.px(x + ux, y + bob, p ? 'E' : 'e');
    g.px(21 + ux, 1 + bob, 'w'); g.px(33 + ux, 4 + bob - p, 'r');
  }
  return g;
}

const anims = {
  idle: [pose({ bob: 0, fists: 'rest', hot: 0, glow: -1 }), pose({ bob: 1, fists: 'rest', hot: 1, glow: -1 })],
  attack: [pose({ bob: 0, ux: -2, fists: 'wind', hot: 0, glow: -1 }), pose({ bob: 0, ux: 3, fists: 'punch', hot: 1, glow: -1 }), pose({ bob: 0, ux: 1, fists: 'rest', hot: 0, glow: -1 })],
  hit: [pose({ bob: 1, ux: -3, fists: 'wind', hot: 1, flash: true, glow: -1 })],
  cast: [pose({ bob: 0, fists: 'open', hot: 1, glow: 0 }), pose({ bob: 1, fists: 'open', hot: 1, glow: 1 })],
};
emit('hearthgar', { w: 48, h: 48, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('hearthgar idle A');
