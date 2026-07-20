'use strict';
// Format-neutral sprite runtime. Current production data is frame-image-v1;
// atlas-v2 uses the same API and can be introduced without touching Stage/UI.

const SPRITE_IMAGE_CACHE = new Map();
const IMAGE_CACHE_LIMIT = 1024;
let accessSequence = 0;

function spriteFor(key) { return typeof SPRITES !== 'undefined' ? SPRITES[key] : null; }
function inferLegacyFormat(sprite) {
  if (!sprite) return null;
  if (sprite.format) return sprite.format;
  return sprite.imageFrames ? 'frame-image-v1' : 'legacy-grid-v0';
}
function frameList(sprite, animation) {
  if (sprite && sprite.format === 'atlas-v2') {
    const def = resolveAnimation(sprite, animation);
    return def && Array.isArray(def.timeline) ? def.timeline.map(item => item.frame) : [];
  }
  const def = sprite && sprite.anims && (sprite.anims[animation] || sprite.anims.idle);
  return Array.isArray(def) ? def : def && Array.isArray(def.frames) ? def.frames : [];
}
function resolveAnimation(sprite, animation) {
  const seen = new Set(); let def = sprite && sprite.animations && (sprite.animations[animation] || sprite.animations.idle);
  while (def && def.aliasOf) { if (seen.has(def.aliasOf)) return null; seen.add(def.aliasOf); def = sprite.animations[def.aliasOf]; }
  return def;
}
function cacheImage(src) {
  if (!src || typeof src !== 'string' || typeof Image === 'undefined') return null;
  let entry = SPRITE_IMAGE_CACHE.get(src);
  if (!entry) {
    const image = new Image(); image.decoding = 'async'; image.src = src;
    entry = { image, lastAccess: ++accessSequence };
    SPRITE_IMAGE_CACHE.set(src, entry);
  } else entry.lastAccess = ++accessSequence;
  if (SPRITE_IMAGE_CACHE.size > IMAGE_CACHE_LIMIT) {
    const oldest = [...SPRITE_IMAGE_CACHE.entries()].sort((a, b) => a[1].lastAccess - b[1].lastAccess)[0];
    if (oldest) SPRITE_IMAGE_CACHE.delete(oldest[0]);
  }
  return entry.image;
}
function imageStatus(image) {
  if (!image) return 'missing';
  if (!image.complete) return 'loading';
  return image.naturalWidth ? 'ready' : 'error';
}
function drawImageFrame(ctx, sprite, src, x, y, scale, flipX, rootX) {
  const image = cacheImage(src), status = imageStatus(image);
  if (status !== 'ready') return { drawn: false, status };
  const anchor = sprite.anchor && typeof sprite.anchor === 'object' ? sprite.anchor : { x: sprite.w / 2, y: sprite.h };
  const finalScale = scale * (Number.isFinite(sprite.renderScale) ? sprite.renderScale : 1);
  const ox = x - anchor.x * finalScale + (flipX ? -rootX : rootX) * finalScale;
  const oy = y - anchor.y * finalScale;
  ctx.save(); ctx.translate(flipX ? ox + sprite.w * finalScale : ox, oy); ctx.scale(flipX ? -1 : 1, 1);
  ctx.drawImage(image, 0, 0, sprite.w * finalScale, sprite.h * finalScale); ctx.restore();
  return { drawn: true, status: 'ready' };
}
function drawAtlasFrame(ctx, sprite, frame, x, y, scale, flipX, rootX) {
  const ref = typeof frame === 'string' ? sprite.frames && sprite.frames[frame] : frame;
  const page = ref && sprite.pages && (Array.isArray(sprite.pages) ? sprite.pages.find(item => item.id === ref.page) : sprite.pages[ref.page]);
  if (!ref || !page) return { drawn: false, status: 'missing' };
  const image = cacheImage(page.src), status = imageStatus(image);
  if (status !== 'ready') return { drawn: false, status };
  const s = scale * (Number.isFinite(sprite.renderScale) ? sprite.renderScale : 1), dir = flipX ? -1 : 1;
  const pivot = ref.pivot || { x: ref.source.w / 2, y: ref.source.h };
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(x + dir * (rootX || 0) * s, y); ctx.scale(dir, 1);
  ctx.drawImage(image, ref.source.x, ref.source.y, ref.source.w, ref.source.h, -pivot.x * s, -pivot.y * s, ref.source.w * s, ref.source.h * s); ctx.restore();
  return { drawn: true, status: 'ready' };
}
function drawLegacyGridFrame(ctx, sprite, frame, x, y, scale, flipX, rootX) {
  if (!Array.isArray(frame)) return { drawn: false, status: 'missing' };
  const anchor = sprite.anchor && typeof sprite.anchor === 'object' ? sprite.anchor : { x: sprite.w / 2, y: sprite.h };
  const ox = x - anchor.x * scale + (flipX ? -rootX : rootX) * scale, oy = y - anchor.y * scale;
  for (let ry = 0; ry < sprite.h; ry++) {
    const row = frame[ry] || '';
    let runStart = -1, runCh = '.';
    for (let rx = 0; rx <= sprite.w; rx++) {
      const ch = rx < sprite.w ? row[rx] : '.';
      if (ch === runCh) continue;
      if (runCh !== '.') { const width = rx - runStart; const dx = flipX ? sprite.w - rx : runStart; ctx.fillStyle = sprite.pal[runCh]; ctx.fillRect(ox + dx * scale, oy + ry * scale, width * scale, scale); }
      runCh = ch; runStart = rx;
    }
  }
  return { drawn: true, status: 'ready' };
}
function drawSprite(ctx, key, animation, frameIndex, x, y, scale, flipX) {
  const sprite = spriteFor(key), format = inferLegacyFormat(sprite);
  if (!sprite) return { drawn: false, status: 'missing' };
  const frames = frameList(sprite, animation);
  if (!frames.length) return { drawn: false, status: 'missing' };
  const index = ((frameIndex % frames.length) + frames.length) % frames.length;
  const frame = frames[index], offsets = sprite.rootOffsets && sprite.rootOffsets[animation];
  const rootX = offsets && Number(offsets[index]) || 0;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  let result;
  if (format === 'atlas-v2') result = drawAtlasFrame(ctx, sprite, frame, x, y, scale, flipX, rootX);
  else if (format === 'frame-image-v1') result = drawImageFrame(ctx, sprite, frame, x, y, scale, flipX, rootX);
  else if (format === 'legacy-grid-v0') result = drawLegacyGridFrame(ctx, sprite, frame, x, y, scale, flipX, rootX);
  else result = { drawn: false, status: 'missing' };
  ctx.restore();
  return result;
}
function drawSpriteEffect(ctx, key, effect, frameIndex, x, y, scale, flipX) {
  const sprite = spriteFor(key), registry = typeof SPRITE_EFFECTS !== 'undefined' ? SPRITE_EFFECTS[key] : sprite;
  const e = registry && registry.effects && registry.effects[effect], frames = e && e.frames;
  if (!e || !frames || !frames.length) return { drawn: false, status: 'missing' };
  const frame = frames[((frameIndex % frames.length) + frames.length) % frames.length], anchor = e.anchor || { x: e.w / 2, y: e.h / 2 };
  const ox = x - anchor.x * scale, oy = y - anchor.y * scale;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (let ry = 0; ry < e.h; ry++) {
    const row = frame[ry] || ''; let start = -1, ch0 = '.';
    for (let rx = 0; rx <= e.w; rx++) { const ch = rx < e.w ? row[rx] : '.'; if (ch === ch0) continue; if (ch0 !== '.') { const width = rx - start; const dx = flipX ? e.w - rx : start; ctx.fillStyle = registry.pal[ch0]; ctx.fillRect(ox + dx * scale, oy + ry * scale, width * scale, scale); } ch0 = ch; start = rx; }
  }
  ctx.restore(); return { drawn: true, status: 'ready' };
}
const SPRITE_FPS_CAPS = { idle: 6, move: 8, skill: 12, attack: 12, arts: 12, burst: 12, cast: 10, hit: 10, stagger: 10, victory: 8, defeat: 8 };
function spritePlaybackFps(key, animation, requested) { const s = spriteFor(key), meta = s && s.meta && (s.meta[animation] || s.meta.idle), atlas = s && s.format === 'atlas-v2' && resolveAnimation(s, animation); const authored = requested == null ? (atlas && atlas.playbackFps || s && s.playbackFps && s.playbackFps[animation] || meta && (meta.playbackFps || meta.fps) || 6) : requested; return Math.max(1, Math.min(authored, SPRITE_FPS_CAPS[animation] || 12)); }
function animFrame(key, animation, tMs, fps) { const s = spriteFor(key), def = s && s.format === 'atlas-v2' && resolveAnimation(s, animation), frames = frameList(s, animation), meta = s && s.meta && (s.meta[animation] || s.meta.idle), n = frames.length || 1; if (def && def.timeline) { const total = def.timeline.reduce((sum, item) => sum + item.durationMs, 0), local = def.loop ? ((tMs % total) + total) % total : Math.min(Math.max(0, tMs), Math.max(0, total - 0.001)); let cursor = 0; for (let i = 0; i < def.timeline.length; i++) { cursor += def.timeline[i].durationMs; if (local < cursor) return i; } return n - 1; } fps = spritePlaybackFps(key, animation, fps); const raw = Math.floor(tMs / (1000 / fps)); return meta && meta.loop === false ? Math.min(n - 1, raw) : raw % n; }
function animationNames(key) { const s = spriteFor(key); return Object.keys(s && (s.format === 'atlas-v2' ? s.animations : s.anims) || {}); }
function hasAnimation(key, animation) { return frameList(spriteFor(key), animation).length > 0; }
function animationFrameCount(key, animation) { return frameList(spriteFor(key), animation).length; }
function animationDurationMs(key, animation) { const s = spriteFor(key), def = s && s.format === 'atlas-v2' && resolveAnimation(s, animation); if (def && def.timeline) return def.timeline.reduce((sum, item) => sum + item.durationMs, 0); const n = animationFrameCount(key, animation); return n ? Math.ceil(n / spritePlaybackFps(key, animation) * 1000) : 0; }
function animationFramesEqual(key, left, right) { const a = frameList(spriteFor(key), left), b = frameList(spriteFor(key), right); return a.length === b.length && a.every((frame, i) => frame === b[i]); }
function getMetrics(key) { const s = spriteFor(key) || {}; const scale = Number.isFinite(s.renderScale) ? s.renderScale : 1; return { w: (s.w || 1) * scale, h: (s.sourceVisibleHeightPx || s.h || 1) * scale }; }
function getStatus(key) { return spriteFor(key) ? 'ready' : 'missing'; }
function preloadSpriteFrames(key, animations) {
  const s = spriteFor(key), names = animations || animationNames(key), sources = [];
  for (const name of names) for (const frame of frameList(s, name)) {
    if (typeof frame === 'string') sources.push(frame);
    else if (s && s.pages && frame) {
      const page = Array.isArray(s.pages) ? s.pages.find(item => item.id === frame.page) : s.pages[frame.page];
      if (page && page.src) sources.push(page.src);
    }
  }
  return [...new Set(sources)].map(cacheImage).filter(Boolean);
}
async function ensureLoaded(key, options) {
  const images = preloadSpriteFrames(key, options && options.animations), timeout = options && options.timeoutMs || 8000;
  const errors = [];
  await Promise.all(images.map(image => new Promise(resolve => { const done = () => resolve(); if (imageStatus(image) === 'ready') return done(); const timer = setTimeout(() => { errors.push('sprite load timeout'); done(); }, timeout); image.onload = () => { clearTimeout(timer); done(); }; image.onerror = () => { clearTimeout(timer); errors.push('sprite load failed'); done(); }; }))); return errors;
}
async function ensureBattleReady(keys, options) { const errors = []; for (const key of [...new Set(keys)]) { if (!spriteFor(key)) continue; errors.push(...(await ensureLoaded(key, options)).map(error => `${key}: ${error}`)); } return { errors }; }
function release() { SPRITE_IMAGE_CACHE.clear(); }
const SpriteRuntime = Object.freeze({ draw: drawSprite, drawEffect: drawSpriteEffect, animFrame, spritePlaybackFps, preloadSpriteFrames, ensureLoaded, ensureBattleReady, release, animationNames, hasAnimation, animationFrameCount, animationDurationMs, animationFramesEqual, getMetrics, getStatus, inferLegacyFormat });
if (typeof globalThis !== 'undefined') globalThis.SpriteRuntime = SpriteRuntime;
if (typeof module !== 'undefined' && module.exports) module.exports = { drawSprite, drawSpriteEffect, animFrame, spritePlaybackFps, preloadSpriteFrames, ensureLoaded, ensureBattleReady, SpriteRuntime, inferLegacyFormat, _imageCache: SPRITE_IMAGE_CACHE };
