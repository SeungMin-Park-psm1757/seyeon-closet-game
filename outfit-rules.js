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

  function normalizeOutfit(input, itemById, options = {}) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const result = {};

    for (const [category, id] of Object.entries(source)) {
      if (typeof id !== 'string') continue;
      const item = lookup(itemById, id);
      if (!item || item.category !== category) continue;
      result[category] = id;
    }

    if (result.dress) {
      delete result.top;
      delete result.skirt;
      delete result.pants;
    } else if (result.skirt && result.pants) {
      delete result.skirt;
    }

    const defaultHair = options.defaultHair === undefined ? 'hair_01' : options.defaultHair;
    if (!result.hair && defaultHair) {
      const hair = lookup(itemById, defaultHair);
      if (hair && hair.category === 'hair') result.hair = defaultHair;
    }

    return result;
  }

  function applyItemSelection(outfit, itemId, itemById) {
    const current = normalizeOutfit(outfit, itemById);
    const item = lookup(itemById, itemId);
    if (!item) return current;

    if (current[item.category] === item.id && item.category !== 'hair') {
      const next = { ...current };
      delete next[item.category];
      return normalizeOutfit(next, itemById);
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
    }

    next[item.category] = item.id;
    return normalizeOutfit(next, itemById);
  }

  function hasConflict(outfit) {
    const value = outfit && typeof outfit === 'object' ? outfit : {};
    return Boolean(
      (value.dress && (value.top || value.skirt || value.pants)) ||
      (value.skirt && value.pants)
    );
  }

  function buildRandomOutfit(items, itemById, random = Math.random, unlocked = () => true) {
    const choose = list => list.length ? list[Math.floor(random() * list.length)] : null;
    const byCategory = category => items.filter(item => item.category === category && unlocked(item));
    let result = {};

    const hair = choose(byCategory('hair'));
    if (hair) result = applyItemSelection(result, hair.id, itemById);

    const useDress = random() < 0.55;
    const main = choose(byCategory(useDress ? 'dress' : 'top'));
    if (main) result = applyItemSelection(result, main.id, itemById);

    if (!useDress && main) {
      const bottomCategory = random() < 0.55 ? 'pants' : 'skirt';
      const bottom = choose(byCategory(bottomCategory));
      if (bottom) result = applyItemSelection(result, bottom.id, itemById);
    }

    for (const category of ['shoes', 'accessory', 'headAccessory']) {
      const item = choose(byCategory(category));
      if (item) result = applyItemSelection(result, item.id, itemById);
    }

    return normalizeOutfit(result, itemById);
  }

  return {
    normalizeOutfit,
    applyItemSelection,
    buildRandomOutfit,
    hasConflict,
    EXCLUSIVE_BODY
  };
});
