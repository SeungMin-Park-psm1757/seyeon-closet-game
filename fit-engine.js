(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FIT_ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MASTER = { width: 1086, height: 1448 };
  const LOGICAL = { width: 360, height: 480 };

  const SLOTS = {
    top: { x: 90, y: 168, width: 180, height: 110, alignX: 0.5, alignY: 0 },
    hat: {
      // All hat slots share a ~y=108 lower/head-contact line.
      // fitToSlot uses one scale only: artwork may become smaller, never squashed.
      cap:     { x: 100, y: 0,  width: 160, height: 95, alignX: 0.5, alignY: 1 },
      sunhat:  { x: 82,  y: 0,  width: 196, height: 95, alignX: 0.5, alignY: 1 },
      beanie:  { x: 108, y: 5,  width: 144, height: 100, alignX: 0.5, alignY: 1 },
      crown:   { x: 122, y: 15, width: 116, height: 80, alignX: 0.5, alignY: 1 },
      ribbon:  { x: 122, y: 25, width: 116, height: 70, alignX: 0.5, alignY: 1 }
    }
  };

  const HAT_OCCLUSION = {
    cap:    { x: 116, y: 0, width: 128, height: 91, rx: 38 },
    sunhat: { x: 105, y: 0, width: 150, height: 94, rx: 40 },
    beanie: { x: 113, y: 0, width: 134, height: 103, rx: 42 }
  };

  function logicalBounds(raw) {
    if (!Array.isArray(raw) || raw.length !== 4) return null;
    const [x0, y0, x1, y1] = raw;
    const scaleX = LOGICAL.width / MASTER.width;
    const scaleY = LOGICAL.height / MASTER.height;
    return {
      x: x0 * scaleX,
      y: y0 * scaleY,
      width: (x1 - x0) * scaleX,
      height: (y1 - y0) * scaleY
    };
  }

  function slotFor(item) {
    if (!item) return null;
    if (item.category === 'top') return SLOTS.top;
    if (item.category === 'hat') return SLOTS.hat[item.hatFit] || SLOTS.hat.cap;
    return null;
  }

  function fitToSlot(source, slot) {
    if (!source || !slot || source.width <= 0 || source.height <= 0) return null;
    const widthScale = slot.width / source.width;
    const heightScale = slot.height / source.height;
    const scale = slot.fitMode === 'width' ? widthScale : Math.min(widthScale, heightScale);
    const width = source.width * scale;
    const height = source.height * scale;
    const targetX = slot.x + (slot.width - width) * (slot.alignX ?? 0.5);
    const targetY = slot.y + (slot.height - height) * (slot.alignY ?? 0.5);
    return {
      tx: targetX - source.x * scale,
      ty: targetY - source.y * scale,
      scale,
      renderedBounds: { x: targetX, y: targetY, width, height },
      slot: { ...slot }
    };
  }

  function fitItem(item, assets) {
    const raw = assets?.fitBounds?.[item?.id];
    const slot = slotFor(item);
    if (!raw || !slot) return null;
    const source = logicalBounds(raw);
    const fit = fitToSlot(source, slot);
    return fit ? { ...fit, sourceBounds: source } : null;
  }

  function hairOcclusion(item) {
    if (!item || item.category !== 'hat') return null;
    return HAT_OCCLUSION[item.hatFit] || null;
  }

  return {
    MASTER,
    LOGICAL,
    SLOTS,
    logicalBounds,
    slotFor,
    fitToSlot,
    fitItem,
    hairOcclusion
  };
});
