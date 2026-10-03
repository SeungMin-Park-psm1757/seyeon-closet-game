(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OUTFIT_RULES = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const EXCLUSIVE_BODY = new Set(['dress', 'top', 'skirt', 'pants']);

  function lookup(itemById, id) {
    if (!id) return null;
    return itemById instanceof Map ? itemById.get(id) : itemById[id];
  }

  function isCompatible(item, characterId) {
    return !item?.compatibleCharacters || !characterId || item.compatibleCharacters.includes(characterId);
  }

  function normalizeOutfit(input, itemById, options = {}) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const result = {};

    for (const [category, id] of Object.entries(source)) {
      if (typeof id !== 'string') continue;
      const item = lookup(itemById, id);
      if (!item || item.category !== category || !isCompatible(item, options.characterId)) continue;
      result[category] = id;
    }

    if (result.dress) {
      delete result.top;
      delete result.skirt;
      delete result.pants;
    } else if (result.skirt && result.pants) {
      delete result.skirt;
    }

    // Headwear is one visual slot in this preschool UI. Never stack a hat
    // and a head accessory because generated assets overlap unpredictably.
    if (result.hat && result.headAccessory) delete result.headAccessory;

    const defaultHair = options.defaultHair === undefined ? 'hair_01' : options.defaultHair;
    if (!result.hair && defaultHair) {
      const hair = lookup(itemById, defaultHair);
      if (hair && hair.category === 'hair' && isCompatible(hair, options.characterId)) result.hair = defaultHair;
    }

    const defaultShoes = options.defaultShoes === undefined ? 'shoes_02' : options.defaultShoes;
    if (!result.shoes && defaultShoes) {
      const shoes = lookup(itemById, defaultShoes);
      if (shoes && shoes.category === 'shoes' && isCompatible(shoes, options.characterId)) result.shoes = defaultShoes;
    }

    return result;
  }

  function applyItemSelection(outfit, itemId, itemById, options = {}) {
    const current = normalizeOutfit(outfit, itemById, options);
    const item = lookup(itemById, itemId);
    if (!item || !isCompatible(item, options.characterId)) return current;

    if (current[item.category] === item.id && !['hair', 'shoes'].includes(item.category)) {
      const next = { ...current };
      delete next[item.category];
      return normalizeOutfit(next, itemById, options);
    }

    const next = { ...current };

    if (item.category === 'dress') {
      delete next.top;
      delete next.skirt;
      delete next.pants;
    } else if (item.category === 'top') {
      delete next.dress;
    } else if (item.category === 'skirt') {
      delete next.dress;
      delete next.pants;
    } else if (item.category === 'pants') {
      delete next.dress;
      delete next.skirt;
    } else if (item.category === 'hat') {
      delete next.headAccessory;
    } else if (item.category === 'headAccessory') {
      delete next.hat;
    }

    next[item.category] = item.id;
    return normalizeOutfit(next, itemById, options);
  }

  function hasConflict(outfit) {
    const value = outfit && typeof outfit === 'object' ? outfit : {};
    return Boolean(
      (value.dress && (value.top || value.skirt || value.pants)) ||
      (value.skirt && value.pants) ||
      (value.hat && value.headAccessory)
    );
  }

  function buildRandomOutfit(items, itemById, random = Math.random, unlocked = () => true, options = {}) {
    const choose = list => list.length ? list[Math.floor(random() * list.length)] : null;
    const byCategory = category => items.filter(item => item.category === category && unlocked(item) && isCompatible(item, options.characterId));
    let result = {};

    const hair = choose(byCategory('hair'));
    if (hair) result = applyItemSelection(result, hair.id, itemById, options);

    const useDress = random() < 0.55;
    const main = choose(byCategory(useDress ? 'dress' : 'top'));
    if (main) result = applyItemSelection(result, main.id, itemById, options);

    if (!useDress && main) {
      const bottomCategory = random() < 0.55 ? 'pants' : 'skirt';
      const bottom = choose(byCategory(bottomCategory));
      if (bottom) result = applyItemSelection(result, bottom.id, itemById, options);
    }

    for (const category of ['shoes', 'accessory']) {
      const item = choose(byCategory(category));
      if (item) result = applyItemSelection(result, item.id, itemById, options);
    }

    // Pick at most one head decoration.
    const headCategory = random() < 0.55 ? 'hat' : 'headAccessory';
    const headItem = choose(byCategory(headCategory));
    if (headItem) result = applyItemSelection(result, headItem.id, itemById, options);

    return normalizeOutfit(result, itemById, options);
  }

  return {
    normalizeOutfit,
    isCompatible,
    applyItemSelection,
    buildRandomOutfit,
    hasConflict,
    EXCLUSIVE_BODY
  };
});
