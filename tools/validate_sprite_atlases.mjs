import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.argv[2] || 'assets/sprite-atlas-runtime');
const pngInfo = file => { const b = fs.readFileSync(file); if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${file}: not PNG`); return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), hash: crypto.createHash('sha256').update(b).digest('hex') }; };
const fail = message => { throw new Error(message); };
if (!fs.existsSync(root)) fail(`Atlas runtime missing: ${root}`);
const files = fs.readdirSync(root).filter(file => file.endsWith('.json') && file !== 'registry.json').sort();
if (!files.length) fail('No atlas manifests found.');
const keys = new Set();
for (const file of files) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  if (manifest.format !== 'atlas-v2') fail(`${file}: invalid format`);
  if (keys.has(manifest.key)) fail(`${file}: duplicate manifest key`); keys.add(manifest.key);
  const pages = new Map();
  for (const page of manifest.pages || []) {
    if (pages.has(page.id)) fail(`${file}: duplicate page ${page.id}`);
    if (page.width > 2048 || page.height > 2048) fail(`${file}: page exceeds 2048`);
    if (!/^[a-z0-9-]+-[0-9a-f]{8}\.png$/.test(page.file)) fail(`${file}: non-deterministic page filename ${page.file}`);
    const info = pngInfo(path.join(root, page.file));
    if (info.width !== page.width || info.height !== page.height) fail(`${file}: page dimensions mismatch`);
    if (info.hash !== page.sha256) fail(`${file}: page hash mismatch`);
    pages.set(page.id, page);
  }
  const interiors = [];
  for (const [id, frame] of Object.entries(manifest.frames || {})) {
    const s = frame.source, page = pages.get(frame.page);
    if (!page) fail(`${file}: unknown page for ${id}`);
    if (frame.rotated) fail(`${file}: rotated frame ${id}`);
    if (!s || s.w <= 0 || s.h <= 0 || s.x < 0 || s.y < 0 || s.x + s.w > page.width || s.y + s.h > page.height) fail(`${file}: frame outside page ${id}`);
    if (!frame.pivot || frame.pivot.x < -manifest.sourceCanvas.width || frame.pivot.x > manifest.sourceCanvas.width * 2 || frame.pivot.y < -manifest.sourceCanvas.height || frame.pivot.y > manifest.sourceCanvas.height * 2) fail(`${file}: unreasonable pivot ${id}`);
    interiors.push({ id, page: frame.page, x: s.x + (manifest.gutter || 0), y: s.y + (manifest.gutter || 0), w: Math.max(0, s.w - 2 * (manifest.gutter || 0)), h: Math.max(0, s.h - 2 * (manifest.gutter || 0)) });
  }
  for (let i = 0; i < interiors.length; i++) for (let j = i + 1; j < interiors.length; j++) { const a = interiors[i], b = interiors[j]; if (a.page !== b.page) continue; if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) fail(`${file}: overlapping frame interiors ${a.id}/${b.id}`); }
  const resolving = new Set();
  const resolve = name => { const anim = manifest.animations?.[name]; if (!anim) fail(`${file}: missing animation ${name}`); if (!anim.aliasOf) return anim; if (resolving.has(name)) fail(`${file}: circular alias ${name}`); resolving.add(name); const result = resolve(anim.aliasOf); resolving.delete(name); return result; };
  for (const name of Object.keys(manifest.animations || {})) { const anim = resolve(name); if (anim.timeline && anim.timeline.some(item => !item.frame || item.durationMs <= 0)) fail(`${file}: invalid timeline ${name}`); }
}
console.log(`Atlas manifests validated: ${files.length}`);
