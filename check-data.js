const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
require('./assets/assetRegistry.js');
require('./data.js');

const { categories, items, characters, backgrounds, themes } = window.GAME_DATA;
const { ASSETS } = window;
const registrySource = fs.readFileSync(path.join(__dirname, 'assets/assetRegistry.js'), 'utf8');

const unique = (values, label) => {
  assert.equal(new Set(values).size, values.length, `${label} ID must be unique`);
};

assert.equal(items.length, 104, 'catalog must contain 104 items');
unique(categories.map(category => category.id), 'category');
unique(items.map(item => item.id), 'item');
unique(characters.map(character => character.id), 'character');
unique(backgrounds.map(background => background.id), 'background');

const categoryIds = new Set(categories.map(category => category.id));
const itemIds = new Set(items.map(item => item.id));
const characterIds = new Set(characters.map(character => character.id));
const backgroundIds = new Set(backgrounds.map(background => background.id));

assert.ok(items.every(item => categoryIds.has(item.category) && item.layer > 0), 'every item must have a valid category and layer');
assert.ok(items.every(item => item.lockedAt == null), 'the toddler build must not lock outfit items');

assert.ok(themes.every(theme => backgroundIds.has(theme.background)), 'every theme must reference an existing background');
assert.ok(themes.every(theme => itemIds.has(theme.outfit)), 'every theme must reference an existing outfit item');

const validateRegistry = (entries, validIds, label) => {
  for (const [id, relativePath] of Object.entries(entries)) {
    assert.ok(validIds.has(id), `${label} registry has unknown ID: ${id}`);
    assert.ok(fs.existsSync(path.join(__dirname, relativePath)), `${label} asset is missing: ${relativePath}`);
  }
};

for (const section of ['characters', 'items', 'backgrounds', 'audio']) {
  const match = registrySource.match(new RegExp(`^  ${section}: \\{([\\s\\S]*?)^  \\}`, 'm'));
  assert.ok(match, `missing ${section} registry`);
  unique([...match[1].matchAll(/^\s{4}([\w$]+)\s*:/gm)].map((entry) => entry[1]), `${section} registry`);
}

validateRegistry(ASSETS.characters, characterIds, 'character');
validateRegistry(ASSETS.items, itemIds, 'item');
validateRegistry(ASSETS.backgrounds, backgroundIds, 'background');

for (const [id, sourcePath] of Object.entries({ ...ASSETS.characters, ...ASSETS.items, ...ASSETS.backgrounds })) {
  const runtimePath = sourcePath.replace(/^assets\/custom\//, 'assets/runtime/').replace(/\.png$/i, '.webp');
  assert.ok(fs.existsSync(path.join(__dirname, runtimePath)), `runtime WebP is missing for ${id}: ${runtimePath}`);
}

for (const [name, relativePath] of Object.entries(ASSETS.audio)) {
  if (relativePath) {
    assert.ok(fs.existsSync(path.join(__dirname, relativePath)), `audio asset is missing (${name}): ${relativePath}`);
  }
}

console.log(`Validated ${items.length} items, ${characters.length} characters, ${backgrounds.length} backgrounds, and ${themes.length} themes.`);
console.log(`Custom assets: ${Object.keys(ASSETS.items).length} items, ${Object.keys(ASSETS.characters).length} characters, ${Object.keys(ASSETS.backgrounds).length} backgrounds.`);
