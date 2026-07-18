const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ART = path.join(ROOT, 'assets', 'splash-art');
const RUNTIME_ART = path.join(ROOT, 'assets', 'splash-art-runtime');
const MUI = fs.readFileSync(path.join(ROOT, 'dev', 'mui1.js'), 'utf8');
const BUILD = fs.readFileSync(path.join(ROOT, 'dev', 'build-mobile.js'), 'utf8');
const DEMO = fs.readFileSync(path.join(ROOT, 'hollowing-demo.html'), 'utf8');

const expected = [
  'hale_4star_splash_main',
  'hale_5star_splash_main',
  'cinnia_4star_splash_main',
  'cinnia_5star_splash_main',
  'katie_5star_splash_main',
  'tobin_4star_splash_main',
  'hearthgar_4star_splash_main',
  'brigga_3star_splash_main',
  'marlowe_4star_splash_main',
  'brant_4star_splash_main',
  'milla_4star_splash_main',
  'nix_3star_splash_main'
];

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`${path.basename(file)} is not a valid PNG.`);
  }
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), bytes: b.length };
}

const files = {};
for (const key of expected) {
  const file = path.join(ART, `${key}.png`);
  if (!fs.existsSync(file)) throw new Error(`Missing splash master: ${key}.png`);
  const size = pngSize(file);
  if (size.width !== size.height || size.width < 1024) {
    throw new Error(`${key} is not a square high-resolution master: ${size.width}x${size.height}`);
  }
  if (!MUI.includes(`${key}'`) && !MUI.includes(`'${key}`)) {
    throw new Error(`${key} is not registered in the UI splash map.`);
  }
  if (!DEMO.includes(`"${key}"`)) throw new Error(`${key} is not embedded in the standalone build.`);
  const runtimeFile = path.join(RUNTIME_ART, `${key}.webp`);
  if (!fs.existsSync(runtimeFile) || fs.statSync(runtimeFile).size < 50000) {
    throw new Error(`${key} has no valid optimized runtime export.`);
  }
  files[key] = size;
}

for (const token of [
  "embedDir(path.join('..', 'assets', 'splash-art-runtime'), 'SPLASHART')",
  'const UNIT_ICON_CROPS = {',
  'function unitSplashSource',
  'class="splash-icon"',
  "splash ? 'splash-hero' : ''"
]) {
  const source = token.startsWith('embedDir') ? BUILD : MUI;
  if (!source.includes(token)) throw new Error(`Missing splash integration contract: ${token}`);
}

console.log(JSON.stringify({
  ok: true,
  splashMasters: expected.length,
  dimensions: [...new Set(Object.values(files).map(v => `${v.width}x${v.height}`))],
  totalSourceBytes: Object.values(files).reduce((sum, v) => sum + v.bytes, 0),
  iconStrategy: 'deterministic runtime crops from matching splash masters'
}, null, 2));
