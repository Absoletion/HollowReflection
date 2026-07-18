'use strict';
// marlowe — foppish pirate duelist: feathered tricorne, rapier, half-cape. 48x48, faces right.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#221a2e', // outline (ink plum)
  k: '#eab98d', // skin
  c: '#3a4e7c', // navy coat
  C: '#242f4f', // coat shade
  g: '#d8a94e', // gold trim/buttons
  f: '#e8f4f8', // plume / lace
  a: '#3ec9b8', // teal cape lining (water accent)
  s: '#cdd9e2', // rapier steel
  m: '#59422a', // boot leather
  w: '#ffffff', // glint / flash
};

// rapier: flourish | back | lunge | low | up
function pose(o) {
  const g = new Grid(48, 48);
  const bob = o.bob | 0, ux = o.ux | 0;

  // ----- half-cape on back shoulder (flutters with bob) -----
  poly(g, [[13 + ux, 23 + bob], [17 + ux, 22 + bob], [14 + ux, 38 + bob - bob * 2], [5 + ux, 35 + bob - bob * 3]], 'C');
  g.line(6 + ux, 34 + bob - bob * 3, 13 + ux, 37 + bob - bob * 2, 'a', 1); // lining flash at hem
  g.px(5 + ux, 33 + bob - bob * 3, 'a');

  // ----- slim legs + folded boots -----
  g.rect(17, 33, 19, 39, 'C'); g.rect(23, 33, 25, 39, 'C');
  g.rect(16, 39, 20, 41, 'm'); g.rect(22, 39, 26, 41, 'm');   // boot cuffs
  g.rect(16, 42, 20, 45, 'm'); g.rect(22, 42, 27, 45, 'm');
  g.hline(16, 20, 41, 'o'); g.hline(22, 26, 41, 'o');

  // ----- coat torso -----
  g.rect(15 + ux, 22 + bob, 26 + ux, 33 + bob, 'c');
  g.rect(15 + ux, 22 + bob, 17 + ux, 33 + bob, 'C');
  g.px(22 + ux, 25 + bob, 'g'); g.px(22 + ux, 28 + bob, 'g'); g.px(22 + ux, 31 + bob, 'g'); // buttons
  g.rect(23 + ux, 22 + bob, 26 + ux, 24 + bob, 'f');           // lace jabot
  g.px(24 + ux, 25 + bob, 'f');
  g.hline(16 + ux, 25 + ux, 33 + bob, 'g');                    // gold hem line

  // ----- head + tricorne -----
  g.ellipse(21 + ux, 16 + bob, 7, 6.5, 'k');
  g.ellipse(24 + ux, 17.5 + bob, 4.8, 5, 'k');
  g.rect(14 + ux, 14 + bob, 16 + ux, 19 + bob, 'C');           // dark hair at back
  // tricorne: wide cocked brim + crown
  poly(g, [[11 + ux, 11 + bob], [31 + ux, 11 + bob], [33 + ux, 8 + bob], [9 + ux, 8 + bob]], 'C');
  g.rect(14 + ux, 5 + bob, 27 + ux, 8 + bob, 'C');             // crown
  g.hline(11 + ux, 31 + ux, 11 + bob, 'g');                    // gold brim edge
  g.px(32 + ux, 9 + bob, 'C'); g.px(33 + ux, 9 + bob, 'g');    // front point flip
  g.px(10 + ux, 9 + bob, 'C'); g.px(9 + ux, 9 + bob, 'g');
  // plume curving up-left (sways with bob)
  g.line(13 + ux, 6 + bob, 8 + ux, 2 + bob - bob * 2, 'f', 2);
  g.px(6 + ux, 1 + bob - bob * 2, 'f'); g.px(7 + ux, 3 - bob, 'f');
  // face: sly eye, pencil mustache
  g.px(26 + ux, 14 + bob, 'C');                                // brow
  g.px(26 + ux, 15 + bob, 'o'); g.px(26 + ux, 16 + bob, 'o');
  g.hline(24 + ux, 27 + ux, 19 + bob, 'o');                    // mustache
  g.px(26 + ux, 21 + bob, 'C');                                // smug lip

  // ----- rapier arm -----
  const shx = 25 + ux, shy = 24 + bob;
  const cup = (x, y) => { g.disc(x, y, 1.6, 'g'); };
  if (o.rapier === 'flourish') {       // idle: blade angled up, wrist high
    g.line(shx, shy, 30 + ux, 29 + bob, 'c', 2);
    g.rect(30 + ux, 27 + bob, 31 + ux, 28 + bob, 'f');         // lace cuff
    g.px(31 + ux, 29 + bob, 'k');
    cup(32 + ux, 28 + bob);
    g.line(33 + ux, 26 + bob, 44 + ux, 10 + bob, 's', 1);
    g.px(45 + ux, 9 + bob, 'w');
  } else if (o.rapier === 'back') {    // anticipation: coiled, blade back-down
    g.line(shx, shy, 24 + ux, 30 + bob, 'c', 2);
    g.rect(23 + ux, 29 + bob, 24 + ux, 30 + bob, 'f');
    cup(23 + ux, 31 + bob);
    g.line(22 + ux, 32 + bob, 13 + ux, 41 + bob, 's', 1);
  } else if (o.rapier === 'lunge') {   // full extension
    g.line(shx, shy + 2, 34 + ux, 26 + bob, 'c', 2);
    g.rect(34 + ux, 25 + bob, 35 + ux, 26 + bob, 'f');
    g.px(36 + ux, 26 + bob, 'k');
    cup(37 + ux, 26 + bob);
    g.hline(38 + ux, 46, 26 + bob, 's');
    g.px(46, 25 + bob, 'w');
    g.px(33 + ux, 22 + bob, 'w'); g.px(39 + ux, 29 + bob, 'w'); // speed sparkle
  } else if (o.rapier === 'low') {     // follow-through: blade dipped
    g.line(shx, shy + 1, 32 + ux, 30 + bob, 'c', 2);
    g.px(33 + ux, 30 + bob, 'k');
    cup(34 + ux, 31 + bob);
    g.line(35 + ux, 32 + bob, 43 + ux, 39 + bob, 's', 1);
  } else if (o.rapier === 'up') {      // cast: blade to the sky
    g.line(shx, shy, 30 + ux, 17 + bob, 'c', 2);
    g.rect(29 + ux, 15 + bob, 30 + ux, 16 + bob, 'f');
    cup(31 + ux, 14 + bob);
    g.vline(31 + ux, 3 + bob, 13 + bob, 's');
    g.px(31 + ux, 2 + bob, 'w');
  }

  g.outline('o');

  if (o.flash) {
    for (const [x, y] of [[15, 7], [25, 4], [12, 16], [28, 12], [14, 27], [25, 30], [20, 20]])
      g.px(x + ux, y + bob, 'w');
  }
  if (o.glow >= 0) {                   // teal water glimmer around raised blade
    const p = o.glow;
    const pts = p === 0 ? [[28, 5], [35, 8], [26, 10], [34, 3]] : [[29, 3], [36, 6], [27, 8], [33, 10]];
    for (const [x, y] of pts) g.px(x + ux, y + bob, 'a');
    g.px(31 + ux, 1 + bob - p, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ bob: 0, rapier: 'flourish', glow: -1 }), pose({ bob: 1, rapier: 'flourish', glow: -1 })],
  attack: [pose({ bob: 0, ux: -2, rapier: 'back', glow: -1 }), pose({ bob: 0, ux: 4, rapier: 'lunge', glow: -1 }), pose({ bob: 0, ux: 1, rapier: 'low', glow: -1 })],
  hit: [pose({ bob: 1, ux: -3, rapier: 'low', flash: true, glow: -1 })],
  cast: [pose({ bob: 0, rapier: 'up', glow: 0 }), pose({ bob: 1, rapier: 'up', glow: 1 })],
};
emit('marlowe', { w: 48, h: 48, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('marlowe idle A');
