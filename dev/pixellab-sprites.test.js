'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = { SPRITES: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '..', 'generated', 'pixellab-sprites.js'), 'utf8'),
  context,
  { filename: 'generated/pixellab-sprites.js' }
);
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '..', 'generated', 'pixellab-sprite-profiles.js'), 'utf8'),
  context,
  { filename: 'generated/pixellab-sprite-profiles.js' }
);

const hale = context.SPRITES.hale_awakened;
assert(hale, 'awakened Hale must resolve from the approved PixelLab bundle');
assert.strictEqual(hale.w, 256);
assert.strictEqual(hale.h, 256);
assert.deepStrictEqual({ x: hale.anchor.x, y: hale.anchor.y }, { x: 128, y: 238 });
assert.strictEqual(hale.imageFrames, true);
assert.strictEqual(hale.designProfile.style, 'compact-anime');
assert.strictEqual(hale.designProfile.referenceBodyHeightPx, 192);
assert.strictEqual(hale.designProfile.referenceCanvasPx, 256);
assert.strictEqual(hale.designProfile.battleFacing, 'south-west');
for (const anim of ['skill', 'arts', 'burst']) {
  assert(hale.anims[anim].length >= 16, `${anim} must retain both authored phases`);
  assert(hale.anims[anim].every(frame => frame.startsWith('data:image/png;base64,')), `${anim} frames must remain embedded PNGs`);
}

const tobin = context.SPRITES.tobin;
assert(tobin, 'Tobin must resolve from the approved PixelLab bundle');
assert.strictEqual(tobin.w, 256);
assert.strictEqual(tobin.h, 256);
assert.deepStrictEqual({ x: tobin.anchor.x, y: tobin.anchor.y }, { x: 128, y: 238 });
assert.strictEqual(tobin.targetHeightPx, 145);
assert.strictEqual(tobin.proportionStyle, 'compact-anime');
assert(tobin.anims.arts.length >= 17, 'Tobin Arts must retain read and ward phases');
assert(tobin.anims.burst.length >= 25, 'Tobin Burst must retain silence, confession, and pressure phases');
for (const anim of ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat']) {
  assert(Array.isArray(tobin.anims[anim]) && tobin.anims[anim].length, `Tobin ${anim} must have embedded frames`);
}

const hearthgar = context.SPRITES.hearthgar;
assert(hearthgar, 'Hearthgar must resolve from the approved PixelLab bundle');
assert.strictEqual(hearthgar.w, 256);
assert.strictEqual(hearthgar.h, 256);
assert.deepStrictEqual({ x: hearthgar.anchor.x, y: hearthgar.anchor.y }, { x: 128, y: 238 });
assert.strictEqual(hearthgar.targetHeightPx, 206);
assert.strictEqual(hearthgar.sourceVisibleHeightPx, 211);
assert.strictEqual(hearthgar.proportionStyle, 'compact-anime');
assert(hearthgar.anims.skill.length >= 11, 'Hearthgar Skill must retain step-in and authored barrier phases');
assert(hearthgar.anims.arts.length >= 17, 'Hearthgar Arts must retain Cinder and party-shield phases');
assert(hearthgar.anims.burst.length >= 25, 'Hearthgar Burst must retain fear, furnace-open and retaliation phases');
for (const anim of ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat']) {
  assert(Array.isArray(hearthgar.anims[anim]) && hearthgar.anims[anim].length, `Hearthgar ${anim} must have embedded frames`);
}

const brigga = context.SPRITES.brigga;
assert(brigga, 'Brigga must resolve from the approved Southwest PixelLab library');
assert.strictEqual(brigga.w, 256);
assert.strictEqual(brigga.h, 256);
assert.deepStrictEqual({ x: brigga.anchor.x, y: brigga.anchor.y }, { x: 128, y: 238 });
assert.strictEqual(brigga.targetHeightPx, 160);
assert.strictEqual(brigga.sourceVisibleHeightPx, 161);
assert.strictEqual(brigga.designProfile.battleFacing, 'south-west');
assert.strictEqual(brigga.designProfile.bodyType, 'adult-dwarf');
assert(brigga.anims.skill.length >= 11, 'Brigga Skill must retain the measured windup and impact');
assert(brigga.anims.arts.length >= 13, 'Brigga Arts must retain marking and firing phases');
assert(brigga.anims.burst.length >= 21, 'Brigga Burst must retain survey, commitment and authored impact phases');
for (const anim of ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat']) {
  assert(Array.isArray(brigga.anims[anim]) && brigga.anims[anim].length, `Brigga ${anim} must have embedded frames`);
}

const marlowe = context.SPRITES.marlowe;
assert(marlowe, 'Marlowe must resolve from the approved Southwest PixelLab library');
assert.strictEqual(marlowe.w, 256);
assert.strictEqual(marlowe.h, 256);
assert.deepStrictEqual({ x: marlowe.anchor.x, y: marlowe.anchor.y }, { x: 128, y: 238 });
assert.strictEqual(marlowe.targetHeightPx, 191);
assert.strictEqual(marlowe.sourceVisibleHeightPx, 195);
assert.strictEqual(marlowe.designProfile.battleFacing, 'south-west');
assert.strictEqual(marlowe.designProfile.bodyType, 'slender-adult');
assert(marlowe.anims.skill.length >= 17, 'Marlowe Skill must retain invitation and counter phases');
assert(marlowe.anims.arts.length >= 15, 'Marlowe Arts must retain measured setup and explosive lunge phases');
assert.strictEqual(marlowe.anims.burst.length, 25, 'Marlowe Burst must retain the authored five-strike sequence and hold');
for (const anim of ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat']) {
  assert(Array.isArray(marlowe.anims[anim]) && marlowe.anims[anim].length, `Marlowe ${anim} must have embedded frames`);
}

const brant = context.SPRITES.brant;
assert(brant, 'Brant must resolve from the approved Southwest PixelLab library');
assert.strictEqual(brant.w, 256);
assert.strictEqual(brant.h, 256);
assert.deepStrictEqual({ x: brant.anchor.x, y: brant.anchor.y }, { x: 128, y: 238 });
assert.strictEqual(brant.targetHeightPx, 199);
assert.strictEqual(brant.sourceVisibleHeightPx, 201);
assert.strictEqual(brant.designProfile.battleFacing, 'south-west');
assert.strictEqual(brant.designProfile.bodyType, 'large-adult');
assert.strictEqual(brant.anims.arts, undefined, 'Brant has no Arts animation in the current kit');
assert(brant.anims.skill.length >= 13, 'Brant Skill must retain load, impact, and impact hold');
assert(brant.anims.burst.length >= 25, 'Brant Burst must retain cast, drag, and recovery phases');
for (const anim of ['idle', 'move', 'skill', 'burst', 'hit', 'stagger', 'victory', 'defeat']) {
  assert(Array.isArray(brant.anims[anim]) && brant.anims[anim].length, `Brant ${anim} must have embedded frames`);
}

const milla = context.SPRITES.milla;
assert(milla, 'Milla must resolve from the approved Southwest PixelLab library');
assert.strictEqual(milla.w, 256);
assert.strictEqual(milla.h, 256);
assert.deepStrictEqual({ x: milla.anchor.x, y: milla.anchor.y }, { x: 128, y: 238 });
assert.strictEqual(milla.targetHeightPx, 183);
assert.strictEqual(milla.sourceVisibleHeightPx, 181);
assert.strictEqual(milla.designProfile.battleFacing, 'south-west');
assert.strictEqual(milla.designProfile.bodyType, 'compact-adult');
assert(milla.anims.skill.length >= 18, 'Milla Skill must retain launch and physical hand-off phases');
assert(milla.anims.arts.length >= 25, 'Milla Arts must retain both deliveries and the controlled stop');
assert(milla.anims.burst.length >= 22, 'Milla Burst must retain compound, route, and final delivery phases');
for (const anim of ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat']) {
  assert(Array.isArray(milla.anims[anim]) && milla.anims[anim].length, `Milla ${anim} must have embedded frames`);
}

const nix = context.SPRITES.nix;
assert(nix, 'Nix must resolve from the approved Southwest PixelLab library');
assert.strictEqual(nix.w, 256);
assert.strictEqual(nix.h, 256);
assert.deepStrictEqual({ x: nix.anchor.x, y: nix.anchor.y }, { x: 128, y: 238 });
assert.strictEqual(nix.targetHeightPx, 182);
assert.strictEqual(nix.sourceVisibleHeightPx, 184);
assert.strictEqual(nix.designProfile.battleFacing, 'south-west');
assert.strictEqual(nix.designProfile.bodyType, 'adult-mermaid-seated-rig');
assert.strictEqual(nix.anims.arts, undefined, 'Nix has no Arts animation in the current kit');
assert(nix.anims.skill.length >= 18, 'Nix Skill must retain selection and dose phases');
assert(nix.anims.burst.length >= 24, 'Nix Burst must retain diagnosis, compounding, and administration phases');
for (const anim of ['idle', 'move', 'skill', 'burst', 'hit', 'stagger', 'victory', 'defeat']) {
  assert(Array.isArray(nix.anims[anim]) && nix.anims[anim].length, `Nix ${anim} must have embedded frames`);
}

console.log('PixelLab sprite contract tests: passed.');
