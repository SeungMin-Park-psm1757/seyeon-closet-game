const assert = require('node:assert/strict');
const rules = require('../outfit-rules.js');

global.window = {};
require('../assets/assetRegistry.js');
require('../data.js');

const { items, characters } = window.GAME_DATA;
const itemById = Object.fromEntries(items.map(item => [item.id, item]));
const customItems = items.filter(item => item.asset);
assert.ok(customItems.length > 0, 'registry should contain custom wearable art');

for (const item of customItems) {
  for (const character of characters) {
    const expected = !item.compatibleCharacters || item.compatibleCharacters.includes(character.id);
    assert.equal(rules.isCompatible(item, character.id), expected, `${item.id} compatibility must match metadata for ${character.id}`);
  }
}

for (const id of ['hair_01','hair_03','hair_07']) {
  assert.equal(rules.isCompatible(itemById[id], 'rabbit01'), true, `${id} has a rabbit composite`);
}
for (const id of ['hair_02','hair_04','hair_05','hair_06','hair_08']) {
  assert.equal(rules.isCompatible(itemById[id], 'rabbit01'), false, `${id} must not be used as a human wig on rabbit01`);
}
for (const characterId of ['girl01','girl02','bear01']) {
  for (const id of ['hair_02','hair_04','hair_05','hair_06','hair_08']) {
    assert.equal(rules.isCompatible(itemById[id], characterId), true, `${id} remains available for ${characterId}`);
  }
}

let seed = 0x61f17;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
for (const character of characters) {
  const legacy = Object.fromEntries(customItems.map(item => [item.category, item.id]));
  const normalized = rules.normalizeOutfit(legacy, itemById, { characterId: character.id });
  assert.ok(Object.values(normalized).every(id => rules.isCompatible(itemById[id], character.id)), `${character.id} restored outfit must discard incompatible art`);

  for (let i = 0; i < 100; i += 1) {
    const outfit = rules.buildRandomOutfit(items, itemById, random, () => true, { characterId: character.id });
    assert.ok(Object.values(outfit).every(id => rules.isCompatible(itemById[id], character.id)), `${character.id} random outfit ${i} must be compatible`);
    assert.equal(Boolean(outfit.hat && outfit.headAccessory), false, `${character.id} random outfit ${i} must use one headwear slot`);
  }
}

const rabbitLegacy = rules.normalizeOutfit({ hair:'hair_02', top:'top_02', shoes:'shoes_02' }, itemById, { characterId:'rabbit01' });
assert.equal(rabbitLegacy.hair, 'hair_01', 'rabbit saved human hair must normalize to compatible default hair');
assert.equal(rabbitLegacy.top, 'top_02');
assert.equal(rabbitLegacy.shoes, 'shoes_02');

console.log(`Character compatibility: ${customItems.length} custom wearables use the preschool-v1 rig with rabbit-specific hair filtering.`);
