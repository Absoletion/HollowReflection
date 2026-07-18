'use strict';
// cinnia — battle-cook: headscarf, apron, ladle raised, pot-lid buckler. 48x48, faces right.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#2a1a14', // outline
  k: '#f2c396', // skin
  r: '#c94f38', // scarf/dress red
  R: '#8c3324', // red shade
  a: '#f2e6d0', // apron cream
  A: '#c9b491', // apron shade
  m: '#9aa0a8', // metal (ladle, pot lid)
  M: '#5d626e', // metal shade
  e: '#ff7a3c', // ember accent
  w: '#ffffff', // highlight / flash
};

// ladle: raise | wind | strike | low ; opts: bob, ux, flash, glow
function pose(o) {
  const g = new Grid(48, 48);
  const bob = o.bob | 0, ux = o.ux | 0;

  // ----- pot-lid buckler on back arm (left silhouette) -----
  g.disc(11 + ux, 28 + bob, 5, 'M');
  g.disc(11 + ux, 28 + bob, 3.4, 'm');
  g.px(11 + ux, 28 + bob, 'M'); g.px(10 + ux, 27 + bob, 'w'); // boss + glint

  // ----- dress skirt (bell silhouette) + feet -----
  poly(g, [[15 + ux, 31 + bob], [26 + ux, 31 + bob], [30, 44], [11, 44]], 'r');
  g.rect(12, 42, 14, 44, 'R'); // hem shade
  poly(g, [[15 + ux, 31 + bob], [17 + ux, 31 + bob], [15, 44], [11, 44]], 'R');
  g.rect(15, 45, 18, 45, 'M'); g.rect(22, 45, 26, 45, 'M'); // shoes

  // ----- torso + apron -----
  g.rect(15 + ux, 24 + bob, 26 + ux, 31 + bob, 'r');
  g.rect(15 + ux, 24 + bob, 17 + ux, 31 + bob, 'R');
  poly(g, [[18 + ux, 26 + bob], [24 + ux, 26 + bob], [26, 41], [16, 41]], 'a');
  g.vline(17, 34, 41, 'A'); g.hline(17, 25, 41, 'A');          // apron shade + hem
  g.rect(19, 35, 22, 38, 'A'); g.px(20, 36, 'e');              // pocket w/ ember spice jar
  g.hline(18 + ux, 24 + ux, 26 + bob, 'A');                    // apron tie

  // ----- head: round cheeks + headscarf -----
  g.ellipse(20 + ux, 15 + bob, 8.2, 7.8, 'k');
  g.ellipse(19 + ux, 11 + bob, 8.8, 5.6, 'r');                 // scarf dome
  g.rect(11 + ux, 11 + bob, 13 + ux, 16 + bob, 'r');           // scarf back
  g.rect(11 + ux, 12 + bob, 12 + ux, 16 + bob, 'R');
  g.hline(14 + ux, 27 + ux, 12 + bob, 'R');                    // scarf band
  // knot tails (flutter with bob)
  poly(g, [[10 + ux, 10 + bob], [6 + ux, 8 + bob - bob], [7 + ux, 12 + bob - bob], [10 + ux, 13 + bob]], 'r');
  g.px(6 + ux, 9 + bob - bob, 'R');
  g.ellipse(23 + ux, 17 + bob, 5.4, 5.8, 'k');                 // face
  g.px(26 + ux, 14 + bob, 'R');                                // brow
  g.px(26 + ux, 15 + bob, 'o'); g.px(26 + ux, 16 + bob, 'o');  // eye
  g.px(27 + ux, 19 + bob, 'R');                                // smile
  g.px(24 + ux, 18 + bob, 'r'); g.px(23 + ux, 19 + bob, 'r');  // rosy cheek + freckle
  g.px(25 + ux, 20 + bob, 'R');

  // ----- front arm + ladle -----
  const shx = 25 + ux, shy = 26 + bob;
  if (o.ladle === 'raise') {          // signature: ladle held high
    g.line(shx, shy, 28 + ux, 20 + bob, 'r', 2);
    g.rect(28 + ux, 18 + bob, 29 + ux, 19 + bob, 'k');
    g.line(29 + ux, 18 + bob, 35 + ux, 9 + bob, 'm', 1);       // handle
    g.disc(36 + ux, 8 + bob, 2.6, 'M');                        // cup
    g.ellipse(36 + ux, 7.4 + bob, 1.6, 1.2, 'm');
  } else if (o.ladle === 'wind') {    // anticipation: wound back overhead
    g.line(shx, shy, 24 + ux, 18 + bob, 'r', 2);
    g.rect(23 + ux, 16 + bob, 24 + ux, 17 + bob, 'k');
    g.line(23 + ux, 16 + bob, 16 + ux, 8 + bob, 'm', 1);
    g.disc(15 + ux, 7 + bob, 2.6, 'M');
    g.ellipse(15 + ux, 6.4 + bob, 1.6, 1.2, 'm');
  } else if (o.ladle === 'strike') {  // the bonk
    g.line(shx, shy, 33 + ux, 26 + bob, 'r', 2);
    g.rect(34 + ux, 25 + bob, 35 + ux, 27 + bob, 'k');
    g.line(36 + ux, 27 + bob, 42 + ux, 32 + bob, 'm', 1);
    g.disc(43 + ux, 33 + bob, 2.8, 'M');
    g.ellipse(42.6 + ux, 32.4 + bob, 1.7, 1.3, 'm');
    // swing arc
    g.px(40 + ux, 22 + bob, 'w'); g.px(43 + ux, 26 + bob, 'w'); g.px(44 + ux, 30 + bob, 'w');
  } else {                            // low follow-through
    g.line(shx, shy, 31 + ux, 32 + bob, 'r', 2);
    g.rect(32 + ux, 32 + bob, 33 + ux, 33 + bob, 'k');
    g.line(34 + ux, 34 + bob, 39 + ux, 38 + bob, 'm', 1);
    g.disc(40 + ux, 39 + bob, 2.6, 'M');
  }

  g.outline('o');

  if (o.flash) {
    for (const [x, y] of [[16, 9], [24, 7], [12, 18], [27, 13], [14, 30], [25, 29], [20, 22], [28, 24]])
      g.px(x + ux, y + bob, 'w');
  }
  if (o.glow >= 0) {                  // cooking-fire sparkle + steam
    const p = o.glow;
    const em = p === 0 ? [[33, 4], [38, 6], [31, 8], [36, 11]] : [[35, 3], [31, 6], [38, 9], [33, 10]];
    for (const [x, y] of em) g.px(x + ux, y + bob, 'e');
    g.px(34 + ux, 2 + bob - p, 'w'); g.px(37 + ux, 4 + bob - p, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ bob: 0, ladle: 'raise', glow: -1 }), pose({ bob: 1, ladle: 'raise', glow: -1 })],
  attack: [pose({ bob: 0, ux: -2, ladle: 'wind', glow: -1 }), pose({ bob: 0, ux: 3, ladle: 'strike', glow: -1 }), pose({ bob: 0, ux: 1, ladle: 'low', glow: -1 })],
  hit: [pose({ bob: 1, ux: -3, ladle: 'low', flash: true, glow: -1 })],
  cast: [pose({ bob: 0, ladle: 'raise', glow: 0 }), pose({ bob: 1, ladle: 'raise', glow: 1 })],
};
emit('cinnia', { w: 48, h: 48, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('cinnia idle A');
