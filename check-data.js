const assert = require('node:assert/strict');

global.window = { ASSETS: { items: {} } };
require('./data.js');

const { categories, items, characters, backgrounds } = window.GAME_DATA;
assert.equal(items.length, 104);
assert.equal(new Set(items.map(item => item.id)).size, items.length);
assert.equal(characters.length, 4);
assert.equal(backgrounds.length, 10);
assert.ok(items.every(item => categories.some(category => category.id === item.category) && item.layer > 0));
assert.deepEqual(items.filter(item => item.lockedAt).map(item => item.lockedAt), [3, 5, 10]);
