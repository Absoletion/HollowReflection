const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
if (!scripts.length) throw new Error('No inline scripts found.');
scripts.forEach((source, index) => {
  try {
    new vm.Script(source, { filename: `inline-${index + 1}.js` });
  } catch (error) {
    const location = String(error.stack || '').match(/inline-\d+\.js:\d+(?::\d+)?/)?.[0] || 'unknown location';
    const lineNumber = Number(location.match(/:(\d+)/)?.[1] || 0);
    const failedLine = source.split(/\r?\n/)[lineNumber - 1] || '';
    console.error(JSON.stringify({ lineNumber, lineLength: failedLine.length, start: failedLine.slice(0, 240), end: failedLine.slice(-240) }, null, 2));
    throw new Error(`Inline script ${index + 1} failed to compile at ${location}: ${error.message}`);
  }
});

const required = [
  'v0.47.0',
  'var SPRITES = {};',
  'var SPLASHART = {',
  '"hale_4star_splash_main"',
  '"hale_5star_splash_main"',
  '"cinnia_4star_splash_main"',
  '"cinnia_5star_splash_main"',
  '"katie_5star_splash_main"',
  '"tobin_4star_splash_main"',
  '"hearthgar_4star_splash_main"',
  '"brigga_3star_splash_main"',
  '"marlowe_4star_splash_main"',
  '"brant_4star_splash_main"',
  '"milla_4star_splash_main"',
  '"nix_3star_splash_main"',
  'function unitSplashSource',
  'class="splash-icon"',
  'class="hero ${splash ? \'splash-hero\' : \'\'}"',
  'Object.assign(SPRITES,{',
  '"cinnia":{"w":256',
  '"katie":{"w":256',
  '"hale":{"w":256',
  '"hale_awakened":{"w":256',
  '"tobin":{"w":256',
  '"hearthgar":{"w":256',
  '"brigga":{"w":256',
  '"marlowe":{"w":256',
  '"brant":{"w":256',
  '"milla":{"w":256',
  '"nix":{"w":256',
  'Diagnostic Crush',
  "katie: { baseStars: 5, maxStars: 5",
  "imageFrames: True",
  "style: 'compact-anime'",
  'referenceBodyHeightPx: 192',
  'terminalAnimationDuration',
  'COMBAT_EVENT_TYPES',
  'MELEE_ACTIONS',
  'const reactionDuration = spriteAnimDuration',
  'const defeatDuration = spriteAnimDuration',
  'if (sprite.imageFrames)',
  "name === 'attack' && sprite.anims.skill",
];

// Python JSON emits lowercase booleans inside the actual generated bundle.
required[required.indexOf('imageFrames: True')] = '"imageFrames":true';
for (const token of required) if (!html.includes(token)) throw new Error(`Missing expected update token: ${token}`);
for (const token of ['Ã', 'Â']) if (html.includes(token)) throw new Error(`Mojibake token found in standalone output: ${token}`);

const generatedComment = '/* GENERATED: approved PixelLab combat libraries. */';
const generatedStart = html.indexOf(generatedComment);
if (generatedStart < 0) throw new Error('Embedded PixelLab sprite payload was not found.');
const assignStart = html.indexOf('Object.assign(SPRITES,', generatedStart + generatedComment.length);
if (assignStart < 0) throw new Error('Embedded PixelLab sprite assignment was not found.');
const jsonStart = assignStart + 'Object.assign(SPRITES,'.length;
const jsonEnd = html.indexOf(');', jsonStart);
if (jsonEnd < 0) throw new Error('Embedded PixelLab sprite payload is truncated.');
const generated = JSON.parse(html.slice(jsonStart, jsonEnd));
for (const key of ['cinnia', 'katie', 'hale', 'hale_awakened', 'tobin', 'hearthgar', 'brigga', 'marlowe', 'brant', 'milla', 'nix']) {
  const sprite = generated[key];
  if (!sprite || sprite.w !== 256 || sprite.h !== 256 || !sprite.imageFrames) throw new Error(`${key} is not an embedded 256x256 image-frame sprite.`);
  const requiredAnimations = key === 'brant' || key === 'nix'
    ? ['idle', 'move', 'skill', 'burst', 'hit', 'stagger', 'victory', 'defeat']
    : ['idle', 'move', 'skill', 'arts', 'burst', 'hit', 'stagger', 'victory', 'defeat'];
  for (const anim of requiredAnimations) {
    if (!Array.isArray(sprite.anims[anim]) || !sprite.anims[anim].length) throw new Error(`${key}.${anim} has no embedded frames.`);
  }
}
const awakened = generated.hale_awakened;
if (awakened.anchor.x !== 128 || awakened.anchor.y !== 238) throw new Error('Awakened Hale lost the production baseline anchor.');
for (const anim of ['skill', 'arts', 'burst']) if (awakened.anims[anim].length < 16) throw new Error(`Awakened Hale ${anim} lost a stitched animation phase.`);
const tobin = generated.tobin;
if (tobin.targetHeightPx !== 145 || tobin.anchor.x !== 128 || tobin.anchor.y !== 238) throw new Error('Tobin lost the child-height production contract.');
if (tobin.anims.arts.length < 17 || tobin.anims.burst.length < 25) throw new Error('Tobin lost a stitched major-ability phase.');
const hearthgar = generated.hearthgar;
if (hearthgar.targetHeightPx !== 206 || hearthgar.sourceVisibleHeightPx !== 211 || hearthgar.anchor.x !== 128 || hearthgar.anchor.y !== 238) throw new Error('Hearthgar lost the towering bonded-suit scale contract.');
if (hearthgar.anims.skill.length < 11 || hearthgar.anims.arts.length < 17 || hearthgar.anims.burst.length < 25) throw new Error('Hearthgar lost a stitched defensive ability phase.');
const brigga = generated.brigga;
if (brigga.targetHeightPx !== 160 || brigga.sourceVisibleHeightPx !== 161 || brigga.anchor.x !== 128 || brigga.anchor.y !== 238) throw new Error('Brigga lost the adult-dwarf scale contract.');
if (brigga.designProfile.battleFacing !== 'south-west' || brigga.designProfile.bodyType !== 'adult-dwarf') throw new Error('Brigga lost the Southwest adult-dwarf identity contract.');
if (brigga.anims.skill.length < 11 || brigga.anims.arts.length < 13 || brigga.anims.burst.length < 21) throw new Error('Brigga lost a stitched demolition ability phase.');
const marlowe = generated.marlowe;
if (marlowe.targetHeightPx !== 191 || marlowe.sourceVisibleHeightPx !== 195 || marlowe.anchor.x !== 128 || marlowe.anchor.y !== 238) throw new Error('Marlowe lost the slender-adult scale contract.');
if (marlowe.designProfile.battleFacing !== 'south-west' || marlowe.designProfile.bodyType !== 'slender-adult') throw new Error('Marlowe lost the Southwest duelist identity contract.');
if (marlowe.anims.skill.length < 17 || marlowe.anims.arts.length < 15 || marlowe.anims.burst.length !== 25) throw new Error('Marlowe lost a staged ability phase or the exact five-strike Burst sequence.');
const brant = generated.brant;
if (brant.targetHeightPx !== 199 || brant.sourceVisibleHeightPx !== 201 || brant.anchor.x !== 128 || brant.anchor.y !== 238) throw new Error('Brant lost the large-adult scale contract.');
if (brant.designProfile.battleFacing !== 'south-west' || brant.designProfile.bodyType !== 'large-adult') throw new Error('Brant lost the Southwest anchor identity contract.');
if (brant.anims.arts !== undefined) throw new Error('Brant incorrectly gained an Arts animation.');
if (brant.anims.skill.length < 13 || brant.anims.burst.length < 25) throw new Error('Brant lost a staged Anchor Drop or Keelhaul phase.');
const milla = generated.milla;
if (milla.targetHeightPx !== 183 || milla.sourceVisibleHeightPx !== 181 || milla.anchor.x !== 128 || milla.anchor.y !== 238) throw new Error('Milla lost the compact-adult scale contract.');
if (milla.designProfile.battleFacing !== 'south-west' || milla.designProfile.bodyType !== 'compact-adult') throw new Error('Milla lost the Southwest courier identity contract.');
if (milla.anims.skill.length < 18 || milla.anims.arts.length < 25 || milla.anims.burst.length < 22) throw new Error('Milla lost a staged delivery ability phase.');
const nix = generated.nix;
if (nix.targetHeightPx !== 182 || nix.sourceVisibleHeightPx !== 184 || nix.anchor.x !== 128 || nix.anchor.y !== 238) throw new Error('Nix lost the seated-rig scale contract.');
if (nix.designProfile.battleFacing !== 'south-west' || nix.designProfile.bodyType !== 'adult-mermaid-seated-rig') throw new Error('Nix lost the Southwest mermaid medical-rig identity contract.');
if (nix.anims.arts !== undefined) throw new Error('Nix incorrectly gained an Arts animation.');
if (nix.anims.skill.length < 18 || nix.anims.burst.length < 24) throw new Error('Nix lost a staged medical ability phase.');

const counts = {
  embeddedFrames: (html.match(/data:image\/png;base64/g) || []).length,
  inlineScripts: scripts.length,
  bytes: Buffer.byteLength(html),
};
if (counts.embeddedFrames < 150) throw new Error(`Embedded frame count unexpectedly low: ${counts.embeddedFrames}`);
console.log(JSON.stringify({ ok: true, ...counts }, null, 2));
