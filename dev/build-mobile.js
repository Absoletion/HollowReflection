const fs = require('fs');
const path = require('path');
const { validateContentIds } = require('../tools/validate_content_ids.js');
const p = f => path.join(__dirname, f);

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

// ---- pixel-sprite battle path: dev/sprites2/<key>.js (new). Falls back to a dead
// shim if sprites2/ has no sprite files yet (archive pixel pipeline lives in dev/sprites;
// sprite-viewer still builds from that).
function spriteSrc() {
  const shim = 'var SPRITES = {}; function drawSprite(){} function animFrame(){return 0}';
  const dir = p('sprites2');
  const generatedPixelLab = p(path.join('..', 'generated', 'pixellab-sprites.js'));
  const generatedProfiles = p(path.join('..', 'generated', 'pixellab-sprite-profiles.js'));
  const generatedEffects = p(path.join('..', 'generated', 'cinnia-legacy-effects.js'));
  const generatedKeys = new Set(['cinnia.js', 'hale.js', 'hale_awakened.js', 'katie.js', 'tobin.js', 'hearthgar.js', 'brigga.js', 'marlowe.js', 'brant.js', 'milla.js', 'nix.js']);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => {
    if (!f.endsWith('.js') || f === 'verify2.js') return false;
    if (fs.existsSync(generatedPixelLab) && generatedKeys.has(f)) return false;
    return fs.statSync(path.join(dir, f)).isFile(); // excludes _build/_preview subfolders
  }).sort() : [];
  if (!files.length && !fs.existsSync(generatedPixelLab)) { console.log('SPRITES2 embedded: (none) -> shim'); return shim; }
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
  return ['var SPRITES = {};', ...bodies, ...enemyBodies, approvedPixelLab, legacyEffects, approvedProfiles, fs.readFileSync(p('sprites/renderer.js'), 'utf8')].join('\n');
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
  portraitSrc,
  splashSrc,
  battleartSrc,
  cutinSrc,
  rigPartSrc,
  spriteShim,
  fs.readFileSync(p('challenges.js'), 'utf8'),
  fs.readFileSync(p('market.js'), 'utf8'),
  fs.readFileSync(p('engine-dev.js'), 'utf8'),
  fs.readFileSync(p('tests-dev.js'), 'utf8'),
  fs.readFileSync(p('story-registry.js'), 'utf8'),
  fs.readFileSync(p('game-state.js'), 'utf8'),
  fs.readFileSync(p('mui1.js'), 'utf8'),
  fs.readFileSync(p('mui3-stage.js'), 'utf8'),
  fs.readFileSync(p('mui2-live.js'), 'utf8'),
  '</' + 'script>\n</body>\n</html>\n'
];
const out = path.join(__dirname, '..', 'hollowing-demo.html');
fs.writeFileSync(out, parts.join('\n'));
console.log('assembled', fs.statSync(out).size, 'bytes ->', out);
