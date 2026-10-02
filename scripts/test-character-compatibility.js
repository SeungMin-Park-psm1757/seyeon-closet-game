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
  assert.equal(item.compatibleCharacters, undefined, `${item.id} shares the common rig`);
  for (const character of characters) assert.equal(rules.isCompatible(item, character.id), true, `${item.id} should fit ${character.id}`);
}

let seed = 0x61f17;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
for (const character of characters.filter(({ id }) => id !== 'girl01')) {
  const legacy = Object.fromEntries(customItems.map(item => [item.category, item.id]));
  const normalized = rules.normalizeOutfit(legacy, itemById, { characterId: character.id });
  assert.ok(Object.values(normalized).every(id => rules.isCompatible(itemById[id], character.id)), `${character.id} legacy outfit should discard incompatible art`);
  assert.ok(customItems.some(item => item.category === 'hair' && Object.values(normalized).includes(item.id)), `${character.id} retains shared hair art`);

  const chosen = rules.applyItemSelection({}, customItems[0].id, itemById, { characterId: character.id });
  assert.ok(Object.values(chosen).every(id => rules.isCompatible(itemById[id], character.id)), `${character.id} cannot select custom art`);
  assert.equal(chosen.hair, 'hair_01', `${character.id} can select shared hair`);
  assert.equal(chosen.shoes, 'shoes_02', `${character.id} keeps shared shoes`);

  for (let i = 0; i < 100; i += 1) {
    const outfit = rules.buildRandomOutfit(items, itemById, random, () => true, { characterId: character.id });
    assert.ok(Object.values(outfit).every(id => rules.isCompatible(itemById[id], character.id)), `${character.id} random outfit ${i} must be compatible`);
  }
}

console.log(`Character compatibility: ${customItems.length} custom wearables share the preschool-v1 rig.`);
