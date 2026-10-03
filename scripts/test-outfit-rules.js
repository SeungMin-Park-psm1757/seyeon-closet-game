const assert = require('node:assert/strict');
const rules = require('../outfit-rules.js');

global.window = {};
require('../assets/assetRegistry.js');
require('../data.js');

const { items } = window.GAME_DATA;
const itemById = Object.fromEntries(items.map(item => [item.id, item]));

const original = { hair:'hair_02', dress:'dress_05', top:'top_05', pants:'pants_02', bogus:'missing', shoes:null };
const copy = JSON.parse(JSON.stringify(original));
const normalized = rules.normalizeOutfit(original, itemById);
assert.deepEqual(original, copy, 'normalizeOutfit must not mutate its input');
assert.equal(normalized.hair, 'hair_02');
assert.equal(normalized.dress, 'dress_05');
assert.equal(normalized.top, undefined);
assert.equal(normalized.pants, undefined);
assert.equal(normalized.bogus, undefined);
assert.equal(normalized.shoes, 'shoes_02', 'normalization must restore a shared default shoe');

const invalid = rules.normalizeOutfit({ hair:'dress_01', pants:['pants_01'], skirt:'skirt_01', pants_2:'pants_02' }, itemById);
assert.equal(invalid.hair, 'hair_01');
assert.equal(invalid.skirt, 'skirt_01');

let outfit = { hair:'hair_01', shoes:'shoes_01' };
outfit = rules.applyItemSelection(outfit, 'dress_05', itemById);
outfit = rules.applyItemSelection(outfit, 'top_01', itemById);
assert.equal(outfit.dress, undefined);
assert.equal(outfit.top, 'top_01');
outfit = rules.applyItemSelection(outfit, 'skirt_01', itemById);
assert.equal(outfit.skirt, 'skirt_01');
outfit = rules.applyItemSelection(outfit, 'pants_02', itemById);
assert.equal(outfit.skirt, undefined);
assert.equal(outfit.pants, 'pants_02');
outfit = rules.applyItemSelection(outfit, 'dress_05', itemById);
assert.equal(outfit.top, undefined);
assert.equal(outfit.pants, undefined);
assert.equal(outfit.dress, 'dress_05');
assert.equal(rules.hasConflict(outfit), false);

const shoesKept = rules.applyItemSelection(outfit, 'shoes_01', itemById);
assert.equal(shoesKept.shoes, 'shoes_01', 'tapping the selected shoe must not leave feet bare');
const shoesReplaced = rules.applyItemSelection(shoesKept, 'shoes_02', itemById);
assert.equal(shoesReplaced.shoes, 'shoes_02', 'shoes may still be replaced');
const hairAgain = rules.applyItemSelection(shoesReplaced, 'hair_01', itemById);
assert.equal(hairAgain.hair, 'hair_01', 'hair may not be removed');

let headwear = rules.applyItemSelection(hairAgain, 'headAccessory_01', itemById);
assert.equal(headwear.headAccessory, 'headAccessory_01');
headwear = rules.applyItemSelection(headwear, 'hat_02', itemById);
assert.equal(headwear.hat, 'hat_02');
assert.equal(headwear.headAccessory, undefined, 'selecting a hat must clear the head accessory');
headwear = rules.applyItemSelection(headwear, 'headAccessory_03', itemById);
assert.equal(headwear.headAccessory, 'headAccessory_03');
assert.equal(headwear.hat, undefined, 'selecting a head accessory must clear the hat');

const normalizedHeadwear = rules.normalizeOutfit({ hair:'hair_01', shoes:'shoes_02', hat:'hat_01', headAccessory:'headAccessory_01' }, itemById);
assert.equal(normalizedHeadwear.hat, 'hat_01');
assert.equal(normalizedHeadwear.headAccessory, undefined, 'restored saves may not stack hat + head accessory');

const rabbitUnsupported = rules.normalizeOutfit({ hair:'hair_02', shoes:'shoes_02' }, itemById, { characterId:'rabbit01' });
assert.equal(rabbitUnsupported.hair, 'hair_01', 'rabbit must fall back from unsupported human hair to a compatible default');
assert.equal(rules.isCompatible(itemById.hair_02, 'rabbit01'), false);
assert.equal(rules.isCompatible(itemById.hair_03, 'rabbit01'), true);

let seed = 0x5eed1234;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
};
for (let i = 0; i < 100; i += 1) {
  const randomOutfit = rules.buildRandomOutfit(items, itemById, random);
  assert.equal(rules.hasConflict(randomOutfit), false, `random outfit ${i} must be conflict-free`);
  assert.ok(randomOutfit.hair, `random outfit ${i} must keep hair`);
  assert.equal(Boolean(randomOutfit.hat && randomOutfit.headAccessory), false, `random outfit ${i} must not stack headwear`);
}

console.log('Outfit rules: body exclusivity, single headwear slot, character compatibility, and 100 seeded random outfits PASS.');
