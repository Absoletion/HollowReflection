'use strict';
// brant — barrel-chested first mate, mutton chops, anchor on chain. 48x48, faces right.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#1c2028', // outline
  k: '#d9a06e', // weathered skin
  f: '#b8bcc0', // gray chops / shirt stripes
  c: '#3a5a8c', // sailor shirt navy
  C: '#263a5e', // navy shade
  m: '#4a3a2c', // trousers/boots
  s: '#6e7684', // anchor iron
  S: '#454b58', // iron shade
  a: '#3ec9b8', // teal kerchief (water accent)
  w: '#ffffff', // glint / flash
};

function anchor(g, mode, ux, bob) {
  if (mode === 'back') {              // slung behind left shoulder, vertical
    const ax = 7 + ux, ty = 6 + bob;
    g.disc(ax, ty, 1.8, 's'); g.px(ax, ty, '.');                // ring
    g.rect(ax - 4, ty + 3, ax + 4, ty + 4, 'S');                // stock
    g.rect(ax - 1, ty + 2, ax, ty + 20, 's');                   // shank
    g.vline(ax - 1, ty + 5, ty + 20, 'S');
    // crown + flukes
    g.line(ax - 1, ty + 20, ax - 6, ty + 15, 's', 2);
    g.line(ax, ty + 20, ax + 5, ty + 15, 's', 2);
    g.px(ax - 7, ty + 13, 's'); g.px(ax + 6, ty + 13, 's');
  } else if (mode === 'over') {       // hoisted overhead, horizontal
    const ay = 4 + bob, cx = 20 + ux;
    g.disc(cx - 12, ay + 1, 1.8, 's'); g.px(cx - 12, ay + 1, '.');
    g.rect(cx - 10, ay, cx + 10, ay + 2, 's');                  // shank horizontal
    g.hline(cx - 10, cx + 10, ay + 2, 'S');
    g.rect(cx - 11, ay - 2, cx - 9, ay + 4, 'S');               // stock
    g.line(cx + 10, ay + 1, cx + 14, ay - 3, 's', 2);           // flukes
    g.line(cx + 10, ay + 1, cx + 14, ay + 5, 's', 2);
  } else if (mode === 'slam') {       // driven down in front
    const ax = 38 + ux, ty = 20 + bob;
    g.disc(ax, ty, 1.8, 's'); g.px(ax, ty, '.');
    g.rect(ax - 4, ty + 3, ax + 4, ty + 4, 'S');
    g.rect(ax - 1, ty + 2, ax, ty + 22, 's');
    g.vline(ax - 1, ty + 6, ty + 22, 'S');
    g.line(ax - 1, ty + 22, ax - 6, ty + 16, 's', 2);
    g.line(ax, ty + 22, ax + 5, ty + 16, 's', 2);
    g.px(ax - 7, ty + 14, 's'); g.px(ax + 6, ty + 14, 's');
  }
}

// arms: rest | hoist | slam | raise
function pose(o) {
  const g = new Grid(48, 48);
  const bob = o.bob | 0, ux = o.ux | 0;

  if (o.anchor === 'back') anchor(g, 'back', ux, bob);

  // ----- stout legs -----
  g.rect(14, 34, 19, 42, 'm'); g.rect(23, 34, 28, 42, 'm');
  g.vline(14, 34, 42, 'o'); g.vline(23, 34, 42, 'o');
  g.rect(12, 43, 20, 45, 'C'); g.rect(22, 45 - 2, 30, 45, 'C'); // heavy boots

  // ----- barrel torso -----
  g.ellipse(21 + ux, 28 + bob, 11, 7.5, 'c');
  g.rect(11 + ux, 24 + bob, 31 + ux, 26 + bob, 'c');
  g.rect(11 + ux, 25 + bob, 14 + ux, 33 + bob, 'C');           // back shade
  g.hline(13 + ux, 29 + ux, 29 + bob, 'f');                    // stripes
  g.hline(12 + ux, 30 + ux, 32 + bob, 'f');
  g.hline(14 + ux, 30 + ux, 26 + bob, 'f');
  g.rect(12 + ux, 34 + bob, 30 + ux, 35 + bob, 'm');           // belt
  g.px(21 + ux, 34 + bob, 's');                                // buckle
  // chain across chest (from back anchor to right hip)
  if (o.anchor === 'back') {
    for (let i = 0; i < 6; i++) g.px(11 + ux + i * 3, 22 + bob + i * 2, 'S');
    for (let i = 0; i < 5; i++) g.px(13 + ux + i * 3, 23 + bob + i * 2, 's');
  }

  // ----- arms -----
  if (o.arms === 'rest') {
    g.line(29 + ux, 25 + bob, 33 + ux, 32 + bob, 'c', 3);      // thick front arm down
    g.rect(32 + ux, 33 + bob, 34 + ux, 35 + bob, 'k');         // fist at belt
    g.line(13 + ux, 25 + bob, 10 + ux, 31 + bob, 'C', 3);
    g.rect(9 + ux, 32 + bob, 11 + ux, 33 + bob, 'k');
  } else if (o.arms === 'hoist') {                              // both up gripping shank
    g.line(28 + ux, 24 + bob, 27 + ux, 10 + bob, 'c', 3);
    g.rect(26 + ux, 7 + bob, 28 + ux, 9 + bob, 'k');
    g.line(14 + ux, 24 + bob, 13 + ux, 10 + bob, 'C', 3);
    g.rect(12 + ux, 7 + bob, 14 + ux, 9 + bob, 'k');
  } else if (o.arms === 'slam') {                               // both flung forward-down
    g.line(28 + ux, 24 + bob, 35 + ux, 30 + bob, 'c', 3);
    g.rect(35 + ux, 30 + bob, 37 + ux, 32 + bob, 'k');
    g.line(15 + ux, 25 + bob, 30 + ux, 32 + bob, 'C', 2);
    g.rect(30 + ux, 31 + bob, 32 + ux, 33 + bob, 'k');
  } else if (o.arms === 'raise') {                              // cast: fist to the sky
    g.line(28 + ux, 24 + bob, 31 + ux, 13 + bob, 'c', 3);
    g.rect(30 + ux, 10 + bob, 32 + ux, 12 + bob, 'k');
    g.line(13 + ux, 25 + bob, 10 + ux, 31 + bob, 'C', 3);
    g.rect(9 + ux, 32 + bob, 11 + ux, 33 + bob, 'k');
  }

  // ----- head: bald crown, gray mutton chops -----
  g.ellipse(21 + ux, 15 + bob, 6.5, 6, 'k');
  g.ellipse(23.5 + ux, 16.5 + bob, 4.4, 4.6, 'k');
  // chops: big on the visible cheek, sliver at back
  poly(g, [[25 + ux, 15 + bob], [28 + ux, 15 + bob], [29 + ux, 21 + bob], [24 + ux, 22 + bob]], 'f');
  g.rect(15 + ux, 14 + bob, 16 + ux, 20 + bob, 'f');
  g.hline(16 + ux, 25 + ux, 10 + bob, 'f');                    // gray fringe
  g.px(15 + ux, 11 + bob, 'f'); g.px(26 + ux, 11 + bob, 'f');
  // kerchief knot at neck
  g.rect(19 + ux, 22 + bob, 24 + ux, 23 + bob, 'a');
  // face
  g.px(25 + ux, 13 + bob, 'o');                                // heavy brow
  g.px(25 + ux, 14 + bob, 'o');
  g.px(26 + ux, 18 + bob, 'S');                                // set jaw line

  if (o.anchor === 'over') anchor(g, 'over', ux, bob);
  if (o.anchor === 'slam') anchor(g, 'slam', ux, bob);

  g.outline('o');

  if (o.anchor === 'slam') {                                   // impact
    g.px(33 + ux, 43, 'w'); g.px(43 + ux, 43, 'w'); g.px(38 + ux, 45, 'w');
    g.px(31 + ux, 40, 'w'); g.px(45, 40, 'w');
  }
  if (o.flash) {
    for (const [x, y] of [[16, 8], [25, 6], [12, 16], [28, 13], [13, 27], [27, 29], [20, 21], [30, 24]])
      g.px(x + ux, y + bob, 'w');
  }
  if (o.glow >= 0) {                                           // sea-spray glow around raised fist
    const p = o.glow;
    const pts = p === 0 ? [[28, 6], [35, 9], [26, 11], [33, 4]] : [[30, 4], [36, 7], [27, 8], [32, 10]];
    for (const [x, y] of pts) g.px(x + ux, y + bob, 'a');
    g.px(31 + ux, 7 + bob - p, 'w');
  }
  return g;
}

const anims = {
  idle: [pose({ bob: 0, anchor: 'back', arms: 'rest', glow: -1 }), pose({ bob: 1, anchor: 'back', arms: 'rest', glow: -1 })],
  attack: [pose({ bob: 0, ux: -1, anchor: 'over', arms: 'hoist', glow: -1 }), pose({ bob: 1, ux: 2, anchor: 'slam', arms: 'slam', glow: -1 }), pose({ bob: 0, ux: 1, anchor: 'slam', arms: 'slam', glow: -1 })],
  hit: [pose({ bob: 1, ux: -3, anchor: 'back', arms: 'rest', flash: true, glow: -1 })],
  cast: [pose({ bob: 0, anchor: 'back', arms: 'raise', glow: 0 }), pose({ bob: 1, anchor: 'back', arms: 'raise', glow: 1 })],
};
emit('brant', { w: 48, h: 48, pal: PAL, anims });
if (process.argv.includes('--show')) { anims.idle[0].print('brant idle A'); anims.attack[1].print('brant slam'); }
