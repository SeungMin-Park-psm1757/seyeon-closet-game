const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
require('./assets/assetRegistry.js');

const { ASSETS } = window;

function pngMeta(relativePath) {
  const absolutePath = path.join(__dirname, relativePath);
  assert.ok(fs.existsSync(absolutePath), `missing asset: ${relativePath}`);
  const buffer = fs.readFileSync(absolutePath);
  const signature = '89504e470d0a1a0a';
  assert.equal(buffer.subarray(0, 8).toString('hex'), signature, `not a PNG: ${relativePath}`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const hasAlpha = colorType === 4 || colorType === 6 || buffer.includes(Buffer.from('tRNS'));
  return { relativePath, width, height, bitDepth, colorType, hasAlpha, bytes: buffer.length };
}

const wearableEntries = [
  ...Object.entries(ASSETS.characters).map(([id, file]) => ({ type: 'character', id, file })),
  ...Object.entries(ASSETS.dressableCharacters || {}).map(([id, file]) => ({ type: 'dressable character', id, file })),
  ...Object.entries(ASSETS.items).map(([id, file]) => ({ type: 'item', id, file })),
  ...Object.values(ASSETS.characterHairComposites || {}).flatMap((group, index) => Object.entries(group).map(([id, file]) => ({ type: 'hair composite', id: `${index}:${id}`, file }))),
  ...Object.values(ASSETS.dressableCharacterHairComposites || {}).flatMap((group, index) => Object.entries(group).map(([id, file]) => ({ type: 'dressable hair composite', id: `${index}:${id}`, file })))
];

const backgroundEntries = Object.entries(ASSETS.backgrounds).map(([id, file]) => ({ type: 'background', id, file }));
const wearables = wearableEntries.map(entry => ({ ...entry, ...pngMeta(entry.file) }));
const backgrounds = backgroundEntries.map(entry => ({ ...entry, ...pngMeta(entry.file) }));

const master = wearables.find(asset => asset.type === 'character' && asset.id === 'girl01') || wearables[0];
assert.ok(master, 'at least one wearable reference asset is required');

const mismatchedCanvas = wearables.filter(asset => asset.width !== master.width || asset.height !== master.height);
const missingAlpha = wearables.filter(asset => !asset.hasAlpha);

console.log(`Master canvas: ${master.width}x${master.height} (${master.id})`);
for (const asset of wearables) {
  console.log(`WEARABLE ${asset.type}:${asset.id} ${asset.width}x${asset.height} alpha=${asset.hasAlpha} bytes=${asset.bytes}`);
}
for (const asset of backgrounds) {
  console.log(`BACKGROUND ${asset.id} ${asset.width}x${asset.height} alpha=${asset.hasAlpha} bytes=${asset.bytes}`);
}

if (mismatchedCanvas.length) {
  console.warn('Canvas mismatch:', mismatchedCanvas.map(asset => `${asset.id}=${asset.width}x${asset.height}`).join(', '));
}
if (missingAlpha.length) {
  console.warn('Wearables without alpha:', missingAlpha.map(asset => asset.id).join(', '));
}

const totalBytes = [...wearables, ...backgrounds].reduce((sum, asset) => sum + asset.bytes, 0);
console.log(`Registered custom art total: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);

const runtimeAssets = [...wearableEntries, ...backgroundEntries].map(({ id, file }) => {
  const runtimePath = file.replace(/^assets\/custom\//, 'assets/runtime/').replace(/\.png$/i, '.webp');
  const absolutePath = path.join(__dirname, runtimePath);
  assert.ok(fs.existsSync(absolutePath), `missing runtime WebP for ${id}: ${runtimePath}`);
  const buffer = fs.readFileSync(absolutePath);
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `not a WebP: ${runtimePath}`);
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP', `not a WebP: ${runtimePath}`);
  return buffer.length;
});
const runtimeBytes = runtimeAssets.reduce((sum, bytes) => sum + bytes, 0);
console.log(`Runtime WebP assets: ${runtimeAssets.length} files, ${(runtimeBytes / 1024 / 1024).toFixed(2)} MiB`);

process.exitCode = mismatchedCanvas.length || missingAlpha.length ? 2 : 0;
