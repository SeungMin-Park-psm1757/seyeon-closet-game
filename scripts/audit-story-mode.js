#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
require('../assets/assetRegistry.js');
require('../data.js');

const { GAME_DATA, ASSETS } = window;
const strict = process.argv.includes('--strict');
const root = path.join(__dirname, '..');
const hasFile = relativePath => relativePath && fs.existsSync(path.join(root, relativePath));
const itemById = new Map(GAME_DATA.items.map(item => [item.id, item]));
const backgroundById = new Map(GAME_DATA.backgrounds.map(background => [background.id, background]));

const rows = GAME_DATA.themes.map(theme => {
  const item = itemById.get(theme.outfit);
  const background = backgroundById.get(theme.background);
  assert.ok(item, `theme ${theme.id} references missing outfit ${theme.outfit}`);
  assert.ok(background, `theme ${theme.id} references missing background ${theme.background}`);

  const recommended = theme.recommended || [];
  assert.ok(Array.isArray(recommended), `theme ${theme.id} recommendations must be an array`);
  assert.equal(new Set(recommended).size, recommended.length, `theme ${theme.id} has duplicate recommendations`);
  assert.ok(recommended.every(id => itemById.has(id)), `theme ${theme.id} has an unknown recommended item`);
  assert.ok(recommended.includes(theme.outfit), `theme ${theme.id} representative outfit must be recommended`);

  const customOutfit = Boolean(ASSETS.items[theme.outfit] && hasFile(ASSETS.items[theme.outfit]));
  const customBackground = Boolean(ASSETS.backgrounds[theme.background] && hasFile(ASSETS.backgrounds[theme.background]));
  return {
    id: theme.id,
    background: theme.background,
    outfit: theme.outfit,
    customBackground,
    customOutfit,
    ready: customBackground && customOutfit
  };
});

for (const row of rows) {
  console.log(`${row.ready ? 'READY' : 'GAP  '} ${row.id}`);
  if (!row.ready) {
    if (!row.customBackground) console.log(`- background: ${row.background}`);
    if (!row.customOutfit) console.log(`- outfit: ${row.outfit}`);
  }
}

const ready = rows.filter(row => row.ready).length;
console.log(`\nStory art readiness: ${ready}/${rows.length} themes fully custom.`);

if (strict) {
  assert.equal(rows.length, 5, 'strict story validation requires exactly five themes');
  assert.equal(ready, 5, 'strict story validation requires custom backgrounds and representative outfits for all themes');
}
