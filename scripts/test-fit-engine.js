const assert = require('node:assert/strict');

global.window = {};
require('../assets/assetRegistry.js');
require('../data.js');
const fit = require('../fit-engine.js');

const { items } = window.GAME_DATA;
const itemById = Object.fromEntries(items.map(item => [item.id, item]));
const assets = window.ASSETS;

for (const [id, rawBounds] of Object.entries(assets.fitBounds || {})) {
  const item = itemById[id];
  assert.ok(item, `fitBounds references unknown item ${id}`);
  assert.ok(['top', 'hat'].includes(item.category), `${id} should use a slot-supported category`);
  assert.equal(rawBounds.length, 4, `${id} bounds must have four coordinates`);
  const result = fit.fitItem(item, assets);
  assert.ok(result && Number.isFinite(result.scale) && result.scale > 0, `${id} must produce a uniform fit`);
  assert.equal(typeof result.scale, 'number');
  assert.ok(result.renderedBounds.width > 0 && result.renderedBounds.height > 0);
  // The algorithm exposes exactly one scale, deliberately preventing scale(x,y) distortion.
  assert.equal('sx' in result, false);
  assert.equal('sy' in result, false);
}

for (const id of ['top_01','top_02','top_03','top_04','top_05']) {
  const r = fit.fitItem(itemById[id], assets);
  assert.ok(r, `${id} must use V8 slot fitting`);
  assert.ok(r.renderedBounds.y >= 167 && r.renderedBounds.y <= 169, `${id} should start at the shoulder slot`);
  assert.ok(r.renderedBounds.y + r.renderedBounds.height <= 279, `${id} should end around the waist slot`);
}

for (const id of ['hat_01','hat_02','hat_03','hat_04','hat_05','hat_06']) {
  const r = fit.fitItem(itemById[id], assets);
  assert.ok(r, `${id} must use V8 slot fitting`);
  assert.ok(r.renderedBounds.width >= 110 && r.renderedBounds.width <= 200, `${id} rendered width is implausible`);
  assert.ok(r.renderedBounds.y + r.renderedBounds.height <= 106, `${id} brim/base should stay above the eye line`);
}

assert.equal(itemById.hat_10.hatFit, 'ribbon', '리본 모자 must not fall back to a sunhat shape');
assert.ok(!assets.itemTransforms.top_01 && !assets.itemTransforms.hat_01, 'tops/hats must not use legacy anisotropic transforms');

console.log(`V8 fit engine: ${Object.keys(assets.fitBounds).length} measured items use uniform slot fitting; semantic hat mapping PASS.`);
