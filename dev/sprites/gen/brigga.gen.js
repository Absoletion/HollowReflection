'use strict';
// brigga — squat dwarf demolitionist, orange twin buns, powder-keg maul. 48x48, faces right.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#241812', // outline
  k: '#e8b58c', // skin
  h: '#e8762e', // orange hair
  b: '#8a6238', // keg wood
  B: '#5a3e20', // keg wood shade
  m: '#6e4a2e', // leather apron
  M: '#3c2a18', // leather shade / soot
  s: '#6e7684', // iron bands
  e: '#ff7a3c', // ember / fuse spark
  w: '#ffffff', // spark core / flash
};

// keg maul drawn head-first; angle: shoulder | overhead | slam
function keg(g, cx, cy, sparkPhase) {
  g.rect(cx - 6, cy - 6, cx + 6, cy + 6, 'b');
  g.vline(cx - 6, cy - 4, cy + 4, 'B'); g.vline(cx + 6, cy - 4, cy + 4, 'B'); // stave curve
  g.px(cx - 6, cy - 6, '.'); g.px(cx + 6, cy - 6, '.');
  g.px(cx - 6, cy + 6, '.'); g.px(cx + 6, cy + 6, '.');
  g.hline(cx - 6, cx + 6, cy - 3, 's');                          // iron bands
  g.hline(cx - 6, cx + 6, cy + 3, 's');
  g.vline(cx - 2, cy - 6, cy + 6, 'B'); g.vline(cx + 2, cy - 6, cy + 6, 'B'); // staves
  g.px(cx, cy, 'e'); g.px(cx + 1, cy, 'M');                      // powder skull mark
  // fuse
  g.px(cx, cy - 7, 'M'); g.px(cx + 1, cy - 8, 'M');
  g.px(cx + 2, cy - 9, sparkPhase ? 'e' : 'w');
  g.px(cx + 3, cy - 9 - sparkPhase, sparkPhase ? 'w' : 'e');
}

function pose(o) {
  const g = new Grid(48, 48);
  const bob = o.bob | 0, ux = o.ux | 0, sp = o.spark | 0;

  // ----- keg behind poses -----
  if (o.maul === 'overhead') {
    keg(g, 12 + ux, 10 + bob, sp);
    g.line(17 + ux, 14 + bob, 26 + ux, 26 + bob, 'M', 2);        // shaft to hands
  }

  // ----- stumpy legs -----
  g.rect(15, 38, 19, 42, 'm'); g.rect(23, 38, 27, 42, 'm');
  g.rect(13, 43, 20, 45, 'M'); g.rect(22, 43, 29, 45, 'M');

  // ----- squat wide body + apron -----
  g.rect(12 + ux, 28 + bob, 30 + ux, 38, 'M');                   // dark tunic
  poly(g, [[16 + ux, 29 + bob], [27 + ux, 29 + bob], [29, 40], [14, 40]], 'm'); // leather apron
  g.hline(15, 28, 40, 'M');
  g.rect(18, 33, 25, 36, 'M');                                   // big pocket
  g.px(19, 33, 'e'); g.px(21, 32, 'M'); g.px(23, 33, 'e');       // fuses poking out
  g.px(20, 32, 'e');

  // ----- big head, twin buns, soot cheeks -----
  g.ellipse(21 + ux, 21 + bob, 8.4, 7.6, 'k');
  g.ellipse(20 + ux, 17 + bob, 8.6, 4.6, 'h');                   // fringe
  g.disc(14 + ux, 13 + bob, 3.2, 'h'); g.disc(25 + ux, 12 + bob, 3.2, 'h'); // twin buns
  g.px(13 + ux, 12 + bob, 'w'); g.px(24 + ux, 11 + bob, 'w');    // scorched glint
  g.px(14 + ux, 14 + bob, 'H' in PAL ? 'H' : 'B'); g.px(25 + ux, 13 + bob, 'B');
  g.ellipse(24 + ux, 22.5 + bob, 5.4, 5.4, 'k');                 // face
  g.px(27 + ux, 19 + bob, 'B');                                  // brow
  g.px(27 + ux, 20 + bob, 'o'); g.px(27 + ux, 21 + bob, 'o');    // eye
  g.px(29 + ux, 23 + bob, 'k'); g.px(30 + ux, 23 + bob, 'o');    // stub nose
  g.px(28 + ux, 26 + bob, 'M'); g.px(27 + ux, 26 + bob, 'M');    // grin
  g.px(24 + ux, 24 + bob, 'M'); g.px(23 + ux, 25 + bob, 'M');    // soot smudge

  // ----- arms + maul -----
  if (o.maul === 'shoulder') {        // resting up-right on shoulder
    g.line(26 + ux, 30 + bob, 30 + ux, 27 + bob, 'k', 2);        // gripping arm
    g.line(31 + ux, 26 + bob, 36 + ux, 21 + bob, 'M', 2);        // shaft
    keg(g, 39 + ux, 14 + bob, sp);
    g.line(14 + ux, 30 + bob, 11 + ux, 34 + bob, 'k', 2);        // free arm
  } else if (o.maul === 'overhead') { // wound up behind
    g.line(26 + ux, 30 + bob, 24 + ux, 25 + bob, 'k', 2);
    g.line(14 + ux, 30 + bob, 12 + ux, 34 + bob, 'k', 2);
  } else if (o.maul === 'slam') {     // brought down in front
    g.line(26 + ux, 30 + bob, 31 + ux, 29 + bob, 'k', 2);
    g.line(32 + ux, 30 + bob, 36 + ux, 33 + bob, 'M', 2);        // shaft down
    keg(g, 39 + ux, 38 + bob, sp);
    g.line(14 + ux, 30 + bob, 16 + ux, 26 + bob, 'k', 2);
  } else if (o.maul === 'plant') {    // cast: keg planted, fist up
    g.line(31 + ux, 33 + bob, 33 + ux, 30 + bob, 'M', 2);
    keg(g, 37 + ux, 38, sp);
    g.line(26 + ux, 30 + bob, 29 + ux, 32 + bob, 'k', 2);        // hand on shaft
    g.line(14 + ux, 30 + bob, 12 + ux, 22 + bob, 'k', 2);        // fist pumped up
    g.rect(11 + ux, 20 + bob, 13 + ux, 21 + bob, 'k');
  }

  g.outline('o');

  if (o.maul === 'slam') {                                       // ground burst
    g.px(33 + ux, 45, 'e'); g.px(45, 44, 'e'); g.px(38 + ux, 46, 'w');
    g.px(31 + ux, 42, 'w'); g.px(46, 41, 'e');
  }
  if (o.flash) {
    for (const [x, y] of [[15, 15], [24, 12], [12, 22], [29, 18], [14, 32], [27, 33], [21, 27]])
      g.px(x + ux, y + bob, 'w');
  }
  if (o.glow >= 0) {                                             // powder sparks around her
    const p = o.glow;
    const pts = p === 0 ? [[8, 18], [11, 12], [7, 26], [15, 8]] : [[9, 14], [7, 22], [12, 9], [6, 28]];
    for (const [x, y] of pts) g.px(x + ux, y + bob, 'e');
    g.px(10 + ux, 16 + bob - p, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ bob: 0, maul: 'shoulder', spark: 0, glow: -1 }), pose({ bob: 1, maul: 'shoulder', spark: 1, glow: -1 })],
  attack: [pose({ bob: 0, ux: -2, maul: 'overhead', spark: 0, glow: -1 }), pose({ bob: 1, ux: 2, maul: 'slam', spark: 1, glow: -1 }), pose({ bob: 0, ux: 1, maul: 'slam', spark: 0, glow: -1 })],
  hit: [pose({ bob: 1, ux: -3, maul: 'shoulder', spark: 0, flash: true, glow: -1 })],
  cast: [pose({ bob: 0, maul: 'plant', spark: 0, glow: 0 }), pose({ bob: 1, maul: 'plant', spark: 1, glow: 1 })],
};
emit('brigga', { w: 48, h: 48, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('brigga idle A');
