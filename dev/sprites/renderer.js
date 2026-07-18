'use strict';
// renderer.js — tiny canvas renderer for the Hollowing sprite library.
// Expects a global SPRITES map: { key: { w, h, pal, anims, anchor:'feet' } }.
// drawSprite(ctx, key, anim, frameIdx, x, y, scale, flipX)
//   (x, y) is the FEET anchor: horizontal center, bottom of the sprite.
// animFrame(key, anim, tMs, fps=6) -> frame index for a time in ms.

const SPRITE_IMAGE_CACHE = Object.create(null);

function imageFrame(src) {
  if (!src || typeof src !== 'string' || typeof Image === 'undefined') return null;
  let im = SPRITE_IMAGE_CACHE[src];
  if (!im) {
    im = new Image();
    im.decoding = 'async';
    im.src = src;
    SPRITE_IMAGE_CACHE[src] = im;
  }
  return im;
}

function drawImageFrame(ctx, s, fr, x, y, scale, flipX, rootX) {
  const im = imageFrame(fr);
  if (!im || !im.complete || !im.naturalWidth) return false;
  const anchor = s.anchor && typeof s.anchor === 'object' ? s.anchor : { x: s.w / 2, y: s.h };
  const authoredScale = Number.isFinite(s.renderScale) ? s.renderScale : 1;
  const finalScale = scale * authoredScale;
  const ox = x - anchor.x * finalScale + (flipX ? -rootX : rootX) * finalScale;
  const oy = y - anchor.y * finalScale;
  ctx.save();
  ctx.translate(flipX ? ox + s.w * finalScale : ox, oy);
  ctx.scale(flipX ? -1 : 1, 1);
  ctx.drawImage(im, 0, 0, s.w * finalScale, s.h * finalScale);
  ctx.restore();
  return true;
}

function preloadSpriteFrames(key) {
  const s = (typeof SPRITES !== 'undefined') ? SPRITES[key] : null;
  if (!s || !s.imageFrames) return [];
  const images = [];
  Object.keys(s.anims || {}).forEach(function (anim) {
    const def = s.anims[anim];
    const frames = Array.isArray(def) ? def : def && def.frames;
    (frames || []).forEach(function (fr) { const im = imageFrame(fr); if (im) images.push(im); });
  });
  return images;
}

function drawSprite(ctx, key, anim, frameIdx, x, y, scale, flipX) {
  const s = (typeof SPRITES !== 'undefined') ? SPRITES[key] : null;
  if (!s) return;
  const def = s.anims[anim] || s.anims.idle;
  const frames = Array.isArray(def) ? def : def.frames;
  if (!frames || !frames.length) return;
  const n = frames.length;
  const fr = frames[((frameIdx % n) + n) % n];
  ctx.imageSmoothingEnabled = false; // nearest-neighbor, always
  const anchor = s.anchor && typeof s.anchor === 'object' ? s.anchor : { x: s.w / 2, y: s.h };
  const offsets = s.rootOffsets && s.rootOffsets[anim];
  const rootX = offsets && Number(offsets[((frameIdx % n) + n) % n]) || 0;
  if (s.imageFrames || typeof fr === 'string') {
    return drawImageFrame(ctx, s, fr, x, y, scale, flipX, rootX);
  }
  const ox = x - anchor.x * scale + (flipX ? -rootX : rootX) * scale;
  const oy = y - anchor.y * scale;
  for (let ry = 0; ry < s.h; ry++) {
    const row = fr[ry];
    let runStart = -1, runCh = '.';
    for (let rx = 0; rx <= s.w; rx++) {
      const ch = rx < s.w ? row[rx] : '.';
      if (ch === runCh) continue;
      if (runCh !== '.') { // flush run [runStart, rx)
        ctx.fillStyle = s.pal[runCh];
        const w = rx - runStart;
        const dx = flipX ? (s.w - rx) : runStart;
        ctx.fillRect(ox + dx * scale, oy + ry * scale, w * scale, scale);
      }
      runCh = ch; runStart = rx;
    }
  }
}

function drawSpriteEffect(ctx, key, effect, frameIdx, x, y, scale, flipX) {
  const s = (typeof SPRITES !== 'undefined') ? SPRITES[key] : null;
  const e = s && s.effects && s.effects[effect];
  const frames = e && e.frames;
  if (!frames || !frames.length) return;
  const fr = frames[((frameIdx % frames.length) + frames.length) % frames.length];
  const anchor = e.anchor || { x: e.w / 2, y: e.h / 2 };
  const ox = x - anchor.x * scale, oy = y - anchor.y * scale;
  ctx.imageSmoothingEnabled = false;
  for (let ry = 0; ry < e.h; ry++) {
    const row = fr[ry];
    let runStart = -1, runCh = '.';
    for (let rx = 0; rx <= e.w; rx++) {
      const ch = rx < e.w ? row[rx] : '.';
      if (ch === runCh) continue;
      if (runCh !== '.') {
        ctx.fillStyle = s.pal[runCh];
        const width = rx - runStart;
        const dx = flipX ? (e.w - rx) : runStart;
        ctx.fillRect(ox + dx * scale, oy + ry * scale, width * scale, scale);
      }
      runCh = ch; runStart = rx;
    }
  }
}

const SPRITE_FPS_CAPS = { idle:6, move:8, skill:12, attack:12, arts:12, burst:12, cast:10, hit:10, stagger:10, victory:8, defeat:8 };
function spritePlaybackFps(key, anim, requested) {
  const s = (typeof SPRITES !== 'undefined') ? SPRITES[key] : null;
  const meta = s && s.meta && (s.meta[anim] || s.meta.idle);
  const authored = requested == null ? (s && s.playbackFps && s.playbackFps[anim] || meta && meta.fps || 6) : requested;
  return Math.max(1, Math.min(authored, SPRITE_FPS_CAPS[anim] || 12));
}
function animFrame(key, anim, tMs, fps) {
  const s = (typeof SPRITES !== 'undefined') ? SPRITES[key] : null;
  const def = s && (s.anims[anim] || s.anims.idle);
  const frames = Array.isArray(def) ? def : def && def.frames;
  const meta = s && s.meta && (s.meta[anim] || s.meta.idle);
  fps = spritePlaybackFps(key, anim, fps);
  const n = (frames && frames.length) || 1;
  const raw = Math.floor(tMs / (1000 / fps));
  return meta && meta.loop === false ? Math.min(n - 1, raw) : raw % n;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { drawSprite, drawSpriteEffect, animFrame, spritePlaybackFps, preloadSpriteFrames, _imageCache: SPRITE_IMAGE_CACHE };
}
