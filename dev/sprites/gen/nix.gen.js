'use strict';
// nix — scowling mermaid apothecary in a brass tank-chair on wheels. 48x48, faces right.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#1e262e', // outline
  k: '#f0c39a', // skin
  h: '#2e6e6a', // deep-teal hair
  b: '#c9963f', // brass
  B: '#8a6428', // brass shade
  t: '#7fd4e8', // tank glass
  T: '#3a8ca8', // glass deep
  g: '#5abf8a', // tail sea-green
  S: '#454b58', // wheel iron
  w: '#ffffff', // glint / flash
};

// tailPhase 0/1 flicks the tail inside the glass; arm: bottle|wind|throw|follow|raise
function pose(o) {
  const g = new Grid(48, 48);
  const bob = o.bob | 0, ux = o.ux | 0, tp = o.tail | 0;

  // ----- wheels -----
  for (const wx of [13, 29]) {
    g.disc(wx, 41.5, 4.6, 'S');
    g.disc(wx, 41.5, 2.2, 'B');
    g.px(wx, 41, 'b'); g.px(wx, 42, 'b');
    g.px(wx - 3, 41, 'o'); g.px(wx + 3, 42, 'o');              // spoke hints
  }
  g.rect(11, 38, 31, 39, 'B');                                  // axle beam

  // ----- brass tank -----
  g.rect(9, 24, 33, 38, 'b');
  g.rect(9, 24, 12, 38, 'B');                                   // back shade
  g.rect(9, 36, 33, 38, 'B');                                   // base shade
  g.rect(8, 22, 34, 23, 'b');                                   // top rim
  g.hline(8, 34, 22, 'B');
  g.px(10, 25, 'w');                                            // brass gleam
  for (const rx of [16, 34 - 2]) g.vline(rx, 25, 35, 'B');      // rivet bands
  g.px(16, 27, 'b'); g.px(32, 29, 'b');
  // glass porthole with the tail visible
  g.ellipse(24, 30.5, 6.6, 5.2, 'T');
  g.ellipse(24, 30, 5.4, 4, 't');
  g.line(20, 28 + tp, 26, 32 - tp, 'g', 2);                     // tail curve
  poly(g, [[26, 32 - tp], [30, 29 - tp * 2], [30, 34 - tp], [26, 34 - tp]], 'g'); // fluke
  g.px(28, 31 - tp, 'w');
  g.px(21 + tp * 2, 27, 'w'); g.px(19, 33 - tp, 'w');           // bubbles

  // ----- mermaid upper body rising from the tank -----
  g.rect(18 + ux, 15 + bob, 26 + ux, 22 + bob, 'k');            // torso
  g.rect(19 + ux, 18 + bob, 26 + ux, 20 + bob, 'g');            // seaweed wrap
  g.px(20 + ux, 19 + bob, 'w');
  // head
  g.ellipse(22 + ux, 9 + bob, 6.4, 5.8, 'k');
  g.ellipse(21 + ux, 6 + bob, 6.6, 4, 'h');                     // hair swept up
  g.disc(16 + ux, 4 + bob, 2.6, 'h');                           // tight bun
  g.px(16 + ux, 3 + bob, 'w');                                  // bun pin glint
  g.rect(15 + ux, 6 + bob, 16 + ux, 12 + bob, 'h');             // hair back
  g.ellipse(25 + ux, 10.5 + bob, 4.2, 4.4, 'k');                // face
  // scowl: slanted brow, narrowed eye, frown
  g.px(26 + ux, 7 + bob, 'o'); g.px(27 + ux, 8 + bob, 'o');     // angry brow
  g.px(27 + ux, 9 + bob, 'o');                                  // narrowed eye
  g.px(26 + ux, 9 + bob, 'T'); g.px(28 + ux, 9 + bob, 'T');     // pince-nez lenses
  g.px(28 + ux, 13 + bob, 'o'); g.px(27 + ux, 13 + bob, 'o');   // frown

  // ----- arms + bottle -----
  const bottle = (x, y) => {
    g.rect(x, y, x + 1, y + 2, 't'); g.px(x, y - 1, 'B'); g.px(x, y, 'w');
  };
  if (o.arm === 'bottle') {           // idle: bottle held up, other arm on rim
    g.line(26 + ux, 16 + bob, 30 + ux, 12 + bob, 'k', 2);
    bottle(31 + ux, 8 + bob);
    g.line(18 + ux, 17 + bob, 14 + ux, 21 + bob, 'k', 2);
  } else if (o.arm === 'wind') {      // bottle wound back
    g.line(26 + ux, 16 + bob, 22 + ux, 10 + bob, 'k', 2);
    bottle(20 + ux, 6 + bob);
    g.line(18 + ux, 17 + bob, 14 + ux, 21 + bob, 'k', 2);
  } else if (o.arm === 'throw') {     // bottle away!
    g.line(26 + ux, 16 + bob, 33 + ux, 13 + bob, 'k', 2);
    bottle(40 + ux, 10 + bob);
    g.px(36 + ux, 12 + bob, 'w'); g.px(38 + ux, 11 + bob, 'w'); // trail
    g.line(18 + ux, 17 + bob, 14 + ux, 21 + bob, 'k', 2);
  } else if (o.arm === 'follow') {    // arm extended, bottle gone
    g.line(26 + ux, 16 + bob, 34 + ux, 16 + bob, 'k', 2);
    g.line(18 + ux, 17 + bob, 14 + ux, 21 + bob, 'k', 2);
  } else if (o.arm === 'raise') {     // cast: both arms up
    g.line(26 + ux, 16 + bob, 30 + ux, 9 + bob, 'k', 2);
    g.line(18 + ux, 16 + bob, 14 + ux, 9 + bob, 'k', 2);
    bottle(31 + ux, 5 + bob);
  }

  g.outline('o');

  if (o.flash) {
    for (const [x, y] of [[17, 4], [26, 2], [14, 10], [29, 7], [12, 26], [30, 25], [22, 17]])
      g.px(x + ux, y + bob, 'w');
  }
  if (o.glow >= 0) {                  // medicinal fizz
    const p = o.glow;
    const pts = p === 0 ? [[27, 2], [34, 4], [24, 0], [37, 8]] : [[29, 0], [35, 2], [25, 3], [38, 6]];
    for (const [x, y] of pts) g.px(x + ux, y + bob, 't');
    g.px(31 + ux, 1 + bob - p, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ bob: 0, tail: 0, arm: 'bottle', glow: -1 }), pose({ bob: 1, tail: 1, arm: 'bottle', glow: -1 })],
  attack: [pose({ bob: 0, ux: -2, tail: 0, arm: 'wind', glow: -1 }), pose({ bob: 0, ux: 2, tail: 1, arm: 'throw', glow: -1 }), pose({ bob: 0, ux: 1, tail: 0, arm: 'follow', glow: -1 })],
  hit: [pose({ bob: 1, ux: -2, tail: 1, arm: 'follow', flash: true, glow: -1 })],
  cast: [pose({ bob: 0, tail: 0, arm: 'raise', glow: 0 }), pose({ bob: 1, tail: 1, arm: 'raise', glow: 1 })],
};
emit('nix', { w: 48, h: 48, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('nix idle A');
