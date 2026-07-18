'use strict';
// milla — courier mid-stride, winged boots, satchel, lightning-trail cloak. 48x48, faces right.
const { Grid, poly, emit } = require('./genlib');

const PAL = {
  o: '#241e10', // outline
  k: '#eab98d', // skin
  h: '#b06a35', // copper hair
  c: '#4a5568', // courier slate
  C: '#2f3845', // slate shade
  m: '#8a6a45', // satchel leather
  M: '#59422a', // leather shade
  e: '#ffd94d', // lightning gold
  w: '#ffffff', // wings / flash
};

// stride: mid | gather | lunge ; arms: pump | tuck | reach | up
function pose(o) {
  const g = new Grid(48, 48);
  const bob = o.bob | 0, ux = o.ux | 0, ph = o.phase | 0;

  // ----- lightning-trail cloak streaming behind -----
  const cy = 24 + bob;
  poly(g, [[14 + ux, 22 + bob], [17 + ux, 21 + bob], [16 + ux, 27 + bob], [2, cy + 6 - ph * 2], [1, cy + 2 - ph]], 'C');
  poly(g, [[14 + ux, 23 + bob], [15 + ux, 26 + bob], [4, cy + 4 - ph * 2]], 'c');
  // gold trail zigzag
  g.px(4, cy + 3 - ph * 2, 'e'); g.px(7, cy + 2 - ph, 'e'); g.px(10, cy + 4 - ph, 'e');
  g.px(6, cy + 5 - ph * 2, 'w'); g.px(12 + ux, cy + 1, 'e');

  // ----- striding legs + winged boots -----
  if (o.stride === 'gather') {        // crouched, both legs under
    g.rect(17, 36, 20, 42, 'C'); g.rect(23, 36, 26, 42, 'C');
    g.rect(15, 42, 21, 44, 'm'); g.rect(22, 42, 28, 44, 'm');
    g.px(15, 41, 'w'); g.px(14, 42, 'w'); g.px(22, 41, 'w');
  } else {
    const s = o.stride === 'lunge' ? 3 : 0;                     // stride length boost
    g.line(19 + ux, 35 + bob, 9 - s, 41, 'C', 3);               // back leg trailing
    g.rect(6 - s, 41, 12 - s, 43, 'm');                         // back boot (toe up)
    g.px(6 - s, 40, 'M');
    g.px(13 - s, 40, 'w'); g.px(12 - s, 39, 'w');               // ankle wing
    g.line(23 + ux, 35 + bob, 30 + ux + s, 39, 'c', 3);         // front leg driving
    g.rect(29 + ux + s, 40, 35 + ux + s, 42, 'm');              // front boot
    g.rect(29 + ux + s, 43, 35 + ux + s, 43, 'M');
    g.px(28 + ux + s, 39, 'w'); g.px(27 + ux + s, 38, 'w');     // ankle wing
    g.px(36 + ux + s, 41, 'M');
  }

  // ----- torso + satchel -----
  g.rect(15 + ux, 23 + bob, 26 + ux, 34 + bob, 'c');
  g.rect(15 + ux, 23 + bob, 17 + ux, 34 + bob, 'C');
  g.line(17 + ux, 24 + bob, 25 + ux, 31 + bob, 'M', 1);         // satchel strap
  g.rect(24 + ux, 30 + bob, 30 + ux, 36 + bob, 'm');            // overstuffed satchel at hip
  g.rect(24 + ux, 30 + bob, 30 + ux, 32 + bob, 'M');            // flap
  g.px(27 + ux, 33 + bob, 'M');                                 // clasp
  g.px(29 + ux, 35 + bob, 'e');                                 // urgent-parcel tag

  // ----- head: windswept hair -----
  g.ellipse(21 + ux, 15 + bob, 7.5, 7, 'k');
  g.ellipse(20 + ux, 11 + bob, 8, 5, 'h');
  // hair streaming back-left
  poly(g, [[13 + ux, 9 + bob], [15 + ux, 14 + bob], [7 + ux, 13 + bob - ph], [5 + ux, 10 + bob - ph]], 'h');
  g.px(4 + ux, 9 + bob - ph, 'h');
  g.ellipse(24 + ux, 16.5 + bob, 5, 5.4, 'k');                  // face
  g.px(26 + ux, 11 + bob, 'h'); g.px(27 + ux, 12 + bob, 'h');   // fringe whip
  g.px(26 + ux, 14 + bob, 'M');                                 // brow
  g.px(26 + ux, 15 + bob, 'o'); g.px(26 + ux, 16 + bob, 'o');   // bright eye
  g.px(27 + ux, 19 + bob, 'M');                                 // grin
  g.px(24 + ux, 18 + bob, 'e');                                 // static freckle

  // ----- arms -----
  if (o.arms === 'pump') {            // running pump
    g.line(24 + ux, 25 + bob, 29 + ux, 21 + bob, 'c', 2);       // front arm up
    g.rect(29 + ux, 19 + bob, 30 + ux, 20 + bob, 'k');
    g.line(16 + ux, 25 + bob, 12 + ux, 30 + bob, 'C', 2);       // back arm down
    g.px(11 + ux, 31 + bob, 'k');
  } else if (o.arms === 'tuck') {     // both tucked for the dash
    g.line(24 + ux, 25 + bob, 27 + ux, 30 + bob, 'c', 2);
    g.rect(27 + ux, 30 + bob, 28 + ux, 31 + bob, 'k');
    g.line(16 + ux, 25 + bob, 13 + ux, 29 + bob, 'C', 2);
  } else if (o.arms === 'reach') {    // full delivery reach
    g.line(24 + ux, 25 + bob, 34 + ux, 22 + bob, 'c', 2);
    g.rect(35 + ux, 21 + bob, 36 + ux, 23 + bob, 'k');
    g.px(37 + ux, 22 + bob, 'e'); g.px(39 + ux, 21 + bob, 'w'); // spark off the hand
    g.line(16 + ux, 25 + bob, 12 + ux, 29 + bob, 'C', 2);
  } else if (o.arms === 'up') {       // cast: skyward point
    g.line(24 + ux, 25 + bob, 29 + ux, 15 + bob, 'c', 2);
    g.rect(29 + ux, 12 + bob, 30 + ux, 14 + bob, 'k');
    g.line(16 + ux, 25 + bob, 12 + ux, 29 + bob, 'C', 2);
    g.px(11 + ux, 30 + bob, 'k');
  }

  g.outline('o');

  if (o.speed) {                       // dash lines
    g.hline(2, 6, 30 + bob, 'w'); g.hline(1, 4, 35, 'w'); g.hline(3, 7, 20 + bob, 'w');
  }
  if (o.flash) {
    for (const [x, y] of [[16, 9], [25, 7], [13, 17], [28, 13], [15, 28], [26, 29], [21, 21]])
      g.px(x + ux, y + bob, 'w');
  }
  if (o.glow >= 0) {                   // storm sparks above the raised hand
    const p = o.glow;
    const pts = p === 0 ? [[28, 8], [33, 5], [26, 3], [36, 10]] : [[30, 4], [34, 8], [27, 6], [37, 3]];
    for (const [x, y] of pts) g.px(x + ux, y + bob, 'e');
    g.px(31 + ux, 9 + bob - p, 'w');
    // little bolt
    g.px(31 + ux, 6 + bob, 'e'); g.px(32 + ux, 7 + bob, p ? 'w' : 'e');
  }
  return g;
}

const anims = {
  idle: [pose({ bob: 0, phase: 0, stride: 'mid', arms: 'pump', glow: -1 }), pose({ bob: 1, phase: 1, stride: 'mid', arms: 'pump', glow: -1 })],
  attack: [pose({ bob: 1, ux: -2, phase: 0, stride: 'gather', arms: 'tuck', glow: -1 }), pose({ bob: 0, ux: 4, phase: 1, stride: 'lunge', arms: 'reach', speed: true, glow: -1 }), pose({ bob: 0, ux: 1, phase: 0, stride: 'mid', arms: 'pump', glow: -1 })],
  hit: [pose({ bob: 1, ux: -3, phase: 1, stride: 'mid', arms: 'tuck', flash: true, glow: -1 })],
  cast: [pose({ bob: 0, phase: 0, stride: 'mid', arms: 'up', glow: 0 }), pose({ bob: 1, phase: 1, stride: 'mid', arms: 'up', glow: 1 })],
};
emit('milla', { w: 48, h: 48, pal: PAL, anims });
if (process.argv.includes('--show')) anims.idle[0].print('milla idle A');
