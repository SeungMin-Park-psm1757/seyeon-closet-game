#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

global.window = {};
require('../assets/assetRegistry.js');
require('../data.js');

const { GAME_DATA, ASSETS } = window;
const strict = process.argv.includes('--strict');

const itemById = new Map(GAME_DATA.items.map(item => [item.id, item]));
const backgroundById = new Map(GAME_DATA.backgrounds.map(background => [background.id, background]));

const rows = GAME_DATA.themes.map(theme => {
  const item = itemById.get(theme.outfit);
  const background = backgroundById.get(theme.background);

  assert.ok(item, `theme ${theme.id} references missing outfit ${theme.outfit}`);
  assert.ok(background, `theme ${theme.id} references missing background ${theme.background}`);

  const customOutfit = Boolean(ASSETS.items[theme.outfit]);
  const customBackground = Boolean(ASSETS.backgrounds[theme.background]);

  return {
    id: theme.id,
    title: theme.title,
    background: theme.background,
    customBackground,
    outfit: theme.outfit,
    outfitCategory: item.category,
    customOutfit,
    ready: customBackground && customOutfit
  };
});

for (const row of rows) {
  console.log(
    `${row.ready ? 'READY' : 'GAP  '} ${row.id.padEnd(9)} | ` +
    `bg=${row.background}:${row.customBackground ? 'custom' : 'fallback'} | ` +
    `outfit=${row.outfit}:${row.customOutfit ? 'custom' : 'fallback'}`
  );
}

const ready = rows.filter(row => row.ready).length;
const gaps = rows.filter(row => !row.ready);

console.log(`Story art readiness: ${ready}/${rows.length} themes fully custom.`);

if (gaps.length) {
  console.log('Missing custom story art:');
  for (const row of gaps) {
    const missing = [];
    if (!row.customBackground) missing.push(`background:${row.background}`);
    if (!row.customOutfit) missing.push(`outfit:${row.outfit}`);
    console.log(`- ${row.id}: ${missing.join(', ')}`);
  }
}

if (strict) {
  assert.equal(
    gaps.length,
    0,
    `strict story validation requires every theme background and recommended outfit to use custom art`
  );
}
