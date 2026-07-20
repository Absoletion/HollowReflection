const fs = require('fs');
const path = require('path');
const { validateContentIds } = require('../tools/validate_content_ids.js');
const p = f => path.join(__dirname, f);
const buildMode = process.env.HOLLOW_BUILD === 'dev' ? 'dev' : 'prod';

console.log('CONTENT IDs validated:', validateContentIds());

// ---- hi-res anime portraits (chat heads / unit sheets): dev/portraits/<key>.png|webp|jpg
function embedDir(dir, varName) {
  const full = p(dir);
  if (!fs.existsSync(full)) return 'var ' + varName + ' = {};';
  const files = fs.readdirSync(full).filter(f => /\.(png|webp|jpg|svg)$/i.test(f));
  const entries = files.map(f => {
    const key = f.replace(/\.(png|webp|jpg|svg)$/i, '').toLowerCase();
    const mime = /png$/i.test(f) ? 'image/png' : /webp$/i.test(f) ? 'image/webp' : /svg$/i.test(f) ? 'image/svg+xml' : 'image/jpeg';
    return JSON.stringify(key) + ':' + JSON.stringify('data:' + mime + ';base64,' + fs.readFileSync(path.join(full, f)).toString('base64'));
  });
  console.log(varName + ' embedded:', files.length ? files.join(', ') : '(none)');
  return 'var ' + varName + ' = {' + entries.join(',') + '};';
}
const portraitSrc = embedDir('portraits', 'PORTRAITS');
const splashSrc = embedDir(path.join('..', 'assets', 'splash-art-runtime'), 'SPLASHART');
const battleartSrc = embedDir('battleart', 'BATTLEART');
const cutinSrc = embedDir('cutins', 'CUTINS');
const rigPartSrc = embedDir('rigparts', 'RIGPARTS');

function embedAtlasPilot() {
  const dir = p(path.join('..', 'assets', 'sprite-atlas-runtime'));
  const manifestFile = path.join(dir, 'tobin.json');
  if (!fs.existsSync(manifestFile)) return '';
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const pages = {};
  for (const page of manifest.pages || []) {
    const file = path.join(dir, page.file);
    if (!fs.existsSync(file)) throw new Error('Required atlas page is missing: ' + file);
    pages[page.file] = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
  }
  return `var ATLAS_PAGE_DATA = ${JSON.stringify(pages)}; var ATLAS_MANIFESTS = {tobin:${JSON.stringify(manifest)}}; Object.keys(ATLAS_MANIFESTS).forEach(function(key){var pack=ATLAS_MANIFESTS[key]; pack.pages=pack.pages.map(function(page){return Object.assign({},page,{src:ATLAS_PAGE_DATA[page.file]});}); SPRITES[key]=pack;});`;
}

// ---- pixel-sprite battle path: dev/sprites2/<key>.js (new). Falls back to a dead
// shim if sprites2/ has no sprite files yet (archive pixel pipeline lives in dev/sprites;
// sprite-viewer still builds from that).
function spriteSrc() {
  const dir = p('sprites2');
  const generatedPixelLab = p(path.join('..', 'generated', 'pixellab-sprites.js'));
  const generatedProfiles = p(path.join('..', 'generated', 'pixellab-sprite-profiles.js'));
  const generatedEffects = p(path.join('..', 'generated', 'cinnia-legacy-effects.js'));
  const atlasPilot = embedAtlasPilot();
  const generatedKeys = new Set(['cinnia.js', 'hale.js', 'hale_awakened.js', 'katie.js', 'tobin.js', 'hearthgar.js', 'brigga.js', 'marlowe.js', 'brant.js', 'milla.js', 'nix.js']);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => {
    if (!f.endsWith('.js') || f === 'verify2.js') return false;
    if (fs.existsSync(generatedPixelLab) && generatedKeys.has(f)) return false;
    return fs.statSync(path.join(dir, f)).isFile(); // excludes _build/_preview subfolders
  }).sort() : [];
  if (!fs.existsSync(generatedPixelLab)) {
    const allowMissing = buildMode === 'dev' && process.env.HOLLOW_ALLOW_MISSING_ART === '1';
    if (!allowMissing) throw new Error('Required player sprite runtime is missing: ' + generatedPixelLab);
    console.warn('SPRITES2 embedded: missing player bundle (explicit development override)');
    return 'var SPRITES = {}; function drawSprite(){return {drawn:false,status:"missing"}} function animFrame(){return 0}';
  }
  const bodies = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8'));
  const enemyFiles = ['construct.js', 'hound.js', 'ox.js', 'calf.js', 'lowingman_beast.js', 'lowingman_man.js', 'glasswright.js'];
  const enemyBodies = enemyFiles.map(f => fs.readFileSync(p(path.join('sprites', f)), 'utf8'));
  const keys = [];
  const keyRe = /SPRITES\[['"]([^'"]+)['"]\]\s*=/g;
  bodies.forEach(src => { let m; while ((m = keyRe.exec(src))) keys.push(m[1]); });
  enemyBodies.forEach(src => { let m; while ((m = keyRe.exec(src))) keys.push(m[1]); });
  console.log('SPRITES2 embedded:', keys.join(', '), '(' + files.concat(enemyFiles).join(', ') + ')');
  const approvedPixelLab = fs.existsSync(generatedPixelLab) ? fs.readFileSync(generatedPixelLab, 'utf8') : '';
  const approvedProfiles = fs.existsSync(generatedProfiles) ? fs.readFileSync(generatedProfiles, 'utf8') : '';
  const legacyEffects = approvedPixelLab && fs.existsSync(generatedEffects) ? fs.readFileSync(generatedEffects, 'utf8') : '';
  if (approvedPixelLab) console.log('SPRITES2 embedded: approved PixelLab libraries for cinnia, hale, hale_awakened, katie, tobin, hearthgar, brigga, marlowe, brant, milla, nix');
  return ['var SPRITES = {};', ...bodies, ...enemyBodies, approvedPixelLab, legacyEffects, approvedProfiles, atlasPilot, fs.readFileSync(p('sprites/renderer.js'), 'utf8')].join('\n');
}
const spriteShim = spriteSrc();

const portraitCSS = ['<style>',
  '.dlg-srow{display:flex;align-items:flex-end;gap:10px;}',
  '.chathead{width:64px;height:64px;border-radius:12px;border:1px solid #2a3742;background:#0d1218;object-fit:cover;flex:0 0 auto;box-shadow:0 4px 14px #0008;}',
  'svg.chathead{padding:4px;}',
  '.heroimg{width:100%;max-height:230px;object-fit:contain;image-rendering:auto;filter:drop-shadow(0 6px 18px #000a);}',
  '</style>'].join('');

const parts = [
  fs.readFileSync(p('part-head-mobile.html'), 'utf8').replace('</head>', portraitCSS + '</head>'),
  `window.__HOLLOW_BUILD__ = ${JSON.stringify(buildMode)};`,
  portraitSrc,
  splashSrc,
  battleartSrc,
  cutinSrc,
  rigPartSrc,
  spriteShim,
  fs.readFileSync(p('challenges.js'), 'utf8'),
  fs.readFileSync(p('market.js'), 'utf8'),
  fs.readFileSync(p('encounter-components.js'), 'utf8'),
  fs.readFileSync(p('passive-registry.js'), 'utf8'),
  fs.readFileSync(p('story-registry.js'), 'utf8'),
  fs.readFileSync(p('engine-dev.js'), 'utf8'),
  ...(buildMode === 'dev' ? [fs.readFileSync(p('tests-dev.js'), 'utf8')] : []),
  fs.readFileSync(p('game-state.js'), 'utf8'),
  fs.readFileSync(p('mui1.js'), 'utf8'),
  fs.readFileSync(p('mui3-stage.js'), 'utf8'),
  fs.readFileSync(p('mui2-live.js'), 'utf8'),
  '</' + 'script>\n</body>\n</html>\n'
];
const out = path.join(__dirname, '..', 'hollowing-demo.html');
fs.writeFileSync(out, parts.join('\n'));
console.log('assembled', fs.statSync(out).size, 'bytes ->', out);
