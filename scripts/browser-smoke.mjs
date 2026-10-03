import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173/';
const outDir = 'qa/v10-browser-smoke';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function outfit(page) {
  return page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('seyeon-closet-save') || '{}');
    return saved.outfit || {};
  });
}

async function openEditor(page) {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.locator('[data-action="characters"]').click();
  await page.locator('[data-character="girl01"]').click();
  await page.waitForSelector('.editor-page');
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('BROWSER CONSOLE:', msg.text());
  });

  await openEditor(page);
  assert(await page.locator('.editor-page').isVisible(), 'editor must open');

  // Custom art shares one full-canvas coordinate system; hats stay above hair and clothing.
  for (const [category, id] of [['hair','hair_02'],['top','top_02'],['pants','pants_02'],['shoes','shoes_04'],['hat','hat_01']]) {
    await page.locator(`[data-category="${category}"]`).click();
    await page.locator(`[data-item="${id}"]`).click();
  }
  const fit = await page.evaluate(() => {
    const svg = document.querySelector('.doll-wrap svg');
    const layers = [...svg.querySelectorAll(':scope > g[data-layer]')].map(layer => layer.dataset.layer);
    const bodySource = svg.querySelector('[data-layer="body"] [data-body-source]')?.dataset.bodySource;
    const images = [...svg.querySelectorAll('image')].map(image => ({
      x: image.getAttribute('x'), y: image.getAttribute('y'),
      width: image.getAttribute('width'), height: image.getAttribute('height'),
      preserve: image.getAttribute('preserveAspectRatio')
    }));
    const slotFits = [...svg.querySelectorAll('g[data-fit="slot"]')].map(group => ({
      scale: group.dataset.fitScale,
      transform: group.getAttribute('transform')
    }));
    const hatFits = [...new Set(window.GAME_DATA.items.filter(item => item.category === 'hat').map(item => item.hatFit))];
    return { layers, images, slotFits, hatFits, bodySource };
  });
  assert(fit.images.length >= 6 && fit.images.every(image => image.x === '0' && image.y === '0' && image.width === '360' && image.height === '480' && image.preserve === 'xMidYMid meet'), 'body and source images must preserve the shared 360x480 canvas');
  assert(fit.slotFits.length >= 2 && fit.slotFits.every(entry => /^translate\([^)]*\) scale\([0-9.]+\)$/.test(entry.transform) && Number(entry.scale) > 0), `slot-fitted art must use one uniform scale (${JSON.stringify(fit.slotFits)})`);
  assert(fit.bodySource === 'dressable', `body garments must replace the default clothed base (${fit.bodySource})`);
  assert(fit.layers.indexOf('body') < fit.layers.indexOf('pants') && fit.layers.indexOf('pants') < fit.layers.indexOf('top') && fit.layers.indexOf('shoes') < fit.layers.indexOf('hair') && fit.layers.indexOf('hair') < fit.layers.indexOf('hat'), `wearable layer order must keep clothing below hair and hat (${fit.layers.join(' > ')})`);
  assert(fit.hatFits.includes('cap') && fit.hatFits.includes('sunhat') && fit.hatFits.includes('beanie') && fit.hatFits.includes('crown') && fit.hatFits.includes('ribbon'), `hats must use explicit semantic fits (${fit.hatFits.join(', ')})`);
  results.push('shared source canvas, uniform slot fitting, semantic hats, and layer order PASS');
  await page.locator('[data-action="reset"]').click();

  // Outfit state invariants in the actual browser UI.
  let value;
  await page.locator('[data-category="dress"]').click();
  await page.locator('[data-item="dress_05"]').click();
  await page.locator('[data-action="undo"]').click();
  value = await outfit(page);
  assert(!value.dress && value.shoes === 'shoes_02', 'undo must restore the previous outfit');
  await page.locator('[data-category="dress"]').click();
  await page.locator('[data-item="dress_05"]').click();
  await page.locator('[data-category="top"]').click();
  await page.locator('[data-item="top_01"]').click();
  value = await outfit(page);
  assert(!value.dress && value.top === 'top_01', 'top must remove dress');

  await page.locator('[data-category="skirt"]').click();
  await page.locator('[data-item="skirt_01"]').click();
  await page.locator('[data-category="pants"]').click();
  await page.locator('[data-item="pants_02"]').click();
  value = await outfit(page);
  assert(value.top === 'top_01' && value.pants === 'pants_02' && !value.skirt && !value.dress, 'pants must replace skirt while keeping top');

  await page.locator('[data-category="dress"]').click();
  await page.locator('[data-item="dress_05"]').click();
  value = await outfit(page);
  assert(value.dress === 'dress_05' && !value.top && !value.skirt && !value.pants, 'dress must remove top and bottoms');
  await page.locator('[data-action="reset"]').click();
  value = await outfit(page);
  assert(value.hair === 'hair_01' && value.shoes === 'shoes_02' && !value.dress && !value.top && !value.skirt && !value.pants, 'reset must restore the default outfit');
  await page.locator('[data-action="random"]').click();
  value = await outfit(page);
  assert(value.hair && value.shoes && !(value.dress && (value.top || value.skirt || value.pants)), 'free-mode magic outfit must produce a valid outfit');
  await page.locator('[data-action="reset"]').click();
  results.push('free-mode undo, reset, and magic outfit PASS');

  // Headwear is one preschool visual slot: no hat + head-accessory stacking.
  await page.locator('[data-category="headAccessory"]').click();
  await page.locator('[data-item="headAccessory_01"]').click();
  await page.locator('[data-category="hat"]').click();
  await page.locator('[data-item="hat_02"]').click();
  value = await outfit(page);
  assert(value.hat === 'hat_02' && !value.headAccessory, 'hat selection must clear head accessory');
  await page.locator('[data-category="headAccessory"]').click();
  await page.locator('[data-item="headAccessory_03"]').click();
  value = await outfit(page);
  assert(value.headAccessory === 'headAccessory_03' && !value.hat, 'head accessory selection must clear hat');
  results.push('single headwear slot PASS');

  // Scroll position must survive item selection and delayed sparkle re-render.
  await page.locator('[data-category="dress"]').click();
  await page.waitForFunction(() => {
    const el = document.querySelector('.item-rail');
    return el && el.scrollWidth > el.clientWidth + 50;
  });
  const before = await page.locator('.item-rail').evaluate(el => {
    const previousBehavior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    const target = Math.min(190, Math.max(0, el.scrollWidth - el.clientWidth));
    el.scrollLeft = target;
    el.dispatchEvent(new Event('scroll'));
    const value = el.scrollLeft;
    el.style.scrollBehavior = previousBehavior;
    return value;
  });
  assert(before > 40, `item rail must have meaningful overflow for persistence test (before=${before})`);
  await page.waitForTimeout(100);
  await page.locator('[data-item="dress_08"]').evaluate(el => el.click());
  await page.waitForTimeout(950);
  const after = await page.locator('.item-rail').evaluate(el => el.scrollLeft);
  assert(Math.abs(after - before) <= 8, `item rail scroll must persist (before=${before}, after=${after})`);

  // Category rail position must survive category change.
  await page.waitForFunction(() => {
    const el = document.querySelector('.category-rail');
    return el && el.scrollWidth > el.clientWidth + 50;
  });
  const catBefore = await page.locator('.category-rail').evaluate(el => {
    const previousBehavior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    el.dispatchEvent(new Event('scroll'));
    const value = el.scrollLeft;
    el.style.scrollBehavior = previousBehavior;
    return value;
  });
  assert(catBefore > 40, `category rail must have meaningful overflow (before=${catBefore})`);
  await page.waitForTimeout(100);
  await page.locator('[data-category="toy"]').evaluate(el => el.click());
  await page.waitForTimeout(120);
  const catAfter = await page.locator('.category-rail').evaluate(el => el.scrollLeft);
  assert(Math.abs(catAfter - catBefore) <= 8, `category rail scroll must persist (before=${catBefore}, after=${catAfter})`);

  // Arrow controls must exist and be touch-sized.
  const arrows = page.locator('.rail-arrow');
  assert(await arrows.count() === 4, 'four rail arrow controls expected');
  const arrowBox = await arrows.first().boundingBox();
  assert(arrowBox && arrowBox.width >= 48 && arrowBox.height >= 48, 'rail arrows must be at least 48px');

  await page.screenshot({ path: `${outDir}/editor-390x844.png`, fullPage: true });

  // Finish flow must remain reachable.
  await page.locator('[data-action="finish"]').click();
  await page.waitForSelector('.finish-page');
  assert(await page.locator('.finish-page').isVisible(), 'finish page must open');
  assert(await page.locator('.finish-page [data-body-source="dressable"]').count() > 0, 'finish view must render the same dressable base');
  await page.screenshot({ path: `${outDir}/finish-390x844.png`, fullPage: true });

  results.push('390x844 outfit invariants PASS');
  results.push('390x844 rail persistence PASS');
  results.push('390x844 finish flow PASS');

  // Short viewport: page must become vertically scrollable and Finish reachable.
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.locator('[data-action="characters"]').click();
  await page.locator('[data-character="girl01"]').click();
  await page.waitForSelector('.editor-page');
  const scrollMetrics = await page.evaluate(() => ({
    appClient: document.querySelector('#app').clientHeight,
    appScroll: document.querySelector('#app').scrollHeight,
    finishText: document.querySelector('[data-action="finish"]')?.textContent || ''
  }));
  assert(scrollMetrics.appScroll > scrollMetrics.appClient, `short viewport should scroll (${scrollMetrics.appScroll} <= ${scrollMetrics.appClient})`);
  assert(scrollMetrics.finishText.includes('완성'), 'finish button must remain in DOM on short viewport');
  await page.locator('#app').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(100);
  const finishBox = await page.locator('[data-action="finish"]').boundingBox();
  assert(finishBox && finishBox.y < 640 && finishBox.y + finishBox.height > 0, 'finish button must be reachable after scrolling');
  await page.screenshot({ path: `${outDir}/editor-390x640.png`, fullPage: true });

  results.push('390x640 vertical access PASS');

  await context.close();

  // Wider phone regression.
  const contextWide = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const wide = await contextWide.newPage();
  await openEditor(wide);
  assert(await wide.locator('.editor-page').isVisible(), '412x915 editor must open');
  const noHorizontalOverflow = await wide.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  assert(noHorizontalOverflow, '412x915 page must not horizontally overflow');
  await wide.screenshot({ path: `${outDir}/editor-412x915.png`, fullPage: true });
  results.push('412x915 no page overflow PASS');
  await contextWide.close();

  // The installed service worker must reopen the game when the network is unavailable.
  const offlineContext = await browser.newContext({ serviceWorkers: 'allow' });
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(baseURL, { waitUntil: 'networkidle' });
  await offlinePage.evaluate(() => navigator.serviceWorker.ready);
  await offlinePage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await offlineContext.setOffline(true);
  await offlinePage.reload({ waitUntil: 'domcontentloaded' });
  await offlinePage.waitForSelector('.home-page');
  await offlinePage.locator('[data-action="characters"]').click();
  await offlinePage.locator('[data-character="girl01"]').click();
  assert(await offlinePage.locator('.editor-page').isVisible(), 'game editor must open from the offline cache');
  results.push('PWA service-worker offline reopen PASS');
  await offlineContext.close();

  // V10: shared body rig, with character-specific hair compatibility.
  const identityRenders = [];
  for (const characterId of ['girl01', 'girl02', 'bear01', 'rabbit01']) {
    const compatibilityContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const compatibilityPage = await compatibilityContext.newPage();
    await compatibilityPage.goto(baseURL, { waitUntil: 'networkidle' });
    await compatibilityPage.locator('[data-action="characters"]').click();
    await compatibilityPage.locator(`[data-character="${characterId}"]`).click();

    const initialHair = characterId === 'rabbit01' ? 'hair_03' : characterId.startsWith('girl') ? 'hair_01' : 'hair_02';
    for (const [category, itemId] of [['hair',initialHair],['top','top_02'],['pants','pants_02'],['shoes','shoes_02']]) {
      await compatibilityPage.locator(`[data-category="${category}"]`).click();
      assert((await compatibilityPage.locator(`[data-item="${itemId}"]`).count()) === 1, `${characterId} should expose compatible ${itemId}`);
      await compatibilityPage.locator(`[data-item="${itemId}"]`).click();
    }
    const shared = await outfit(compatibilityPage);
    assert(shared.hair === initialHair && shared.top === 'top_02' && shared.shoes === 'shoes_02', `${characterId} should persist compatible custom art`);
    const initialSource = characterId === 'rabbit01' ? 'composite' : 'dressable';
    assert(await compatibilityPage.locator(`.doll-wrap [data-body-source="${initialSource}"]`).count() === 1, `${characterId} body garments must use the correct ${initialSource} base`);
    await compatibilityPage.screenshot({ path: `${outDir}/v10-character-${characterId}-top-pants.png`, fullPage: true });
    if (characterId.startsWith('girl')) {
      identityRenders.push({ characterId, outfit: 'hair01-top02-pants02-shoes02', png: (await compatibilityPage.locator('.doll-wrap svg').screenshot()).toString('base64') });
    }

    const hairHatPairs = characterId === 'rabbit01'
      ? [['hair_01','hat_01'],['hair_03','hat_02'],['hair_07','hat_10']]
      : [['hair_02','hat_01'],['hair_04','hat_02'],['hair_07','hat_10']];
    for (const [hairId, hatId] of hairHatPairs) {
      await compatibilityPage.locator('[data-category="hair"]').click();
      await compatibilityPage.locator(`[data-item="${hairId}"]`).click();
      await compatibilityPage.locator('[data-category="hat"]').click();
      await compatibilityPage.locator(`[data-item="${hatId}"]`).click();
      const expectedSource = characterId === 'rabbit01' ? 'composite' : 'dressable';
      assert(await compatibilityPage.locator(`.doll-wrap [data-body-source="${expectedSource}"]`).count() === 1, `${characterId} ${hairId}+${hatId} must keep the ${expectedSource} body source`);
      await compatibilityPage.screenshot({ path: `${outDir}/v10-character-${characterId}-${hairId}-${hatId}.png`, fullPage: true });
    }
    if (characterId.startsWith('girl')) {
      await compatibilityPage.locator('[data-category="hair"]').click();
      await compatibilityPage.locator('[data-item="hair_03"]').click();
      await compatibilityPage.locator('[data-category="shoes"]').click();
      await compatibilityPage.locator('[data-item="shoes_02"]').click();
    }
    await compatibilityPage.locator('[data-category="dress"]').click();
    await compatibilityPage.locator('[data-item="dress_05"]').click();
    const dressSource = characterId === 'rabbit01' ? 'composite' : 'dressable';
    assert(await compatibilityPage.locator(`.doll-wrap [data-body-source="${dressSource}"]`).count() === 1, `${characterId} dress_05 must use its ${dressSource} body`);
    await compatibilityPage.screenshot({ path: `${outDir}/v10-character-${characterId}-dress05.png`, fullPage: true });
    if (characterId.startsWith('girl')) {
      identityRenders.push({ characterId, outfit: 'hair03-dress05-shoes02', png: (await compatibilityPage.locator('.doll-wrap svg').screenshot()).toString('base64') });
    }
    await compatibilityPage.locator('[data-action="random"]').click();
    const randomized = await outfit(compatibilityPage);
    assert(randomized.hair && randomized.shoes, `${characterId} magic outfit should remain valid`);
    assert(!(randomized.hat && randomized.headAccessory), `${characterId} magic outfit must use one headwear slot`);
    await compatibilityContext.close();
  }
  const identityPage = await browser.newPage();
  const identitySheet = await identityPage.evaluate(async renders => {
    const cellW = 360, cellH = 500, canvas = document.createElement('canvas');
    canvas.width = cellW * 2; canvas.height = cellH * 2;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff8ef'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < renders.length; i++) {
      const render = renders[i], x = (render.characterId === 'girl02' ? cellW : 0), y = render.outfit.startsWith('hair03') ? cellH : 0;
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 8, y + 8, cellW - 16, cellH - 16);
      const image = new Image(); image.src = `data:image/png;base64,${render.png}`; await image.decode();
      const scale = Math.min((cellW - 20) / image.width, (cellH - 50) / image.height);
      const w = image.width * scale, h = image.height * scale;
      ctx.drawImage(image, x + (cellW - w) / 2, y + 38 + (cellH - 54 - h) / 2, w, h);
      ctx.fillStyle = '#624b47'; ctx.font = '16px sans-serif';
      ctx.fillText(`${render.characterId === 'girl01' ? '세연이' : '하늘이'} · ${render.outfit}`, x + 14, y + 28);
    }
    return canvas.toDataURL('image/png');
  }, identityRenders);
  await fs.writeFile(`${outDir}/v10-girl01-vs-girl02-identity.png`, Buffer.from(identitySheet.split(',')[1], 'base64'));
  await identityPage.close();
  results.push('V10 character-specific hair compatibility and shared body rig PASS');

  const rabbitPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await rabbitPage.goto(baseURL, { waitUntil: 'networkidle' });
  await rabbitPage.locator('[data-action="characters"]').click();
  await rabbitPage.locator('[data-character="rabbit01"]').click();
  await rabbitPage.locator('[data-category="hair"]').click();
  assert((await rabbitPage.locator('[data-item="hair_02"]').count()) === 0, 'rabbit must hide unsupported human long-wave hair');
  assert((await rabbitPage.locator('[data-item="hair_03"]').count()) === 1, 'rabbit must keep supported composite hair');
  await rabbitPage.locator('[data-category="hair"]').click();
  await rabbitPage.locator('[data-item="hair_01"]').click();
  await rabbitPage.locator('[data-category="top"]').click();
  await rabbitPage.locator('[data-item="top_02"]').click();
  assert(await rabbitPage.locator('.doll-wrap [data-body-source="composite"]').count() === 1, 'rabbit hair_01 garment overlay must use its dressable composite');
  assert(await rabbitPage.locator('.doll-wrap [data-layer="head-overlay"]').count() === 1, 'rabbit face/hair must be restored in front of overlaid clothes');
  await rabbitPage.screenshot({ path: `${outDir}/v9-character-rabbit-hair01-dressable.png`, fullPage: true });
  await rabbitPage.locator('[data-action="finish"]').click();
  assert(await rabbitPage.locator('.finish-page [data-body-source="composite"]').count() === 1, 'rabbit finish view must keep dressable hair composite');
  await rabbitPage.locator('[data-action="photo"]').click();
  assert(await rabbitPage.locator('.photo-art [data-body-source="composite"]').count() === 1, 'rabbit album must keep dressable hair composite');
  await rabbitPage.screenshot({ path: `${outDir}/v9-character-rabbit-hair01-album.png`, fullPage: true });
  await rabbitPage.close();
  results.push('rabbit dressable hair composite matches editor, finish, and album PASS');

  // User-reported visual regressions and V9 art/fit set.
  const visualContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const visualPage = await visualContext.newPage();
  await openEditor(visualPage);
  const capture = async (name, selections) => {
    await visualPage.locator('[data-action="reset"]').click();
    for (const [category, itemId] of selections) {
      await visualPage.locator(`[data-category="${category}"]`).click();
      await visualPage.locator(`[data-item="${itemId}"]`).click();
    }
    await visualPage.waitForTimeout(180);
    await visualPage.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  };
  await capture('v9-hair04-high-ponytail', [['hair','hair_04']]);
  await capture('v9-hair06-ponytail', [['hair','hair_06']]);
  await capture('v9-hair07-curly', [['hair','hair_07']]);
  await capture('v9-hair08-rounded-bob', [['hair','hair_08']]);
  for (const id of ['hat_01','hat_02','hat_03','hat_04','hat_05','hat_06','hat_07','hat_08','hat_09','hat_10']) await capture(`v9-${id}`, [['hair','hair_02'],['hat',id]]);
  for (const id of ['top_01','top_02','top_03','top_04','top_05']) await capture(`v9-${id}`, [['hair','hair_02'],['top',id]]);
  for (const i of Array.from({ length: 12 }, (_, index) => index + 1)) {
    const id = `dress_${String(i).padStart(2, '0')}`;
    await capture(`v9-${id}`, [['hair','hair_02'],['dress',id]]);
  }
  await capture('v9-pants02', [['hair','hair_02'],['top','top_02'],['pants','pants_02']]);
  for (const id of ['skirt_01','skirt_02','skirt_03']) await capture(`v9-${id}`, [['hair','hair_02'],['top','top_02'],['skirt',id]]);
  for (const id of ['shoes_01','shoes_02','shoes_03','shoes_04']) await capture(`v9-${id}`, [['hair','hair_02'],['shoes',id]]);
  results.push('V9 hair, 10 hats, all custom tops and dresses, all custom skirts, pants, and shoes screenshots captured');

  const hairIds = Array.from({ length: 8 }, (_, i) => `hair_${String(i + 1).padStart(2, '0')}`);
  const hatIds = Array.from({ length: 10 }, (_, i) => `hat_${String(i + 1).padStart(2, '0')}`);
  const hatCells = [];
  for (const hairId of hairIds) {
    await visualPage.locator('[data-category="hair"]').click();
    await visualPage.locator(`[data-item="${hairId}"]`).click();
    for (const hatId of hatIds) {
      await visualPage.locator('[data-category="hat"]').click();
      await visualPage.locator(`[data-item="${hatId}"]`).click();
      hatCells.push({ hair: hairId, hat: hatId, png: (await visualPage.locator('.doll-wrap svg').screenshot()).toString('base64') });
    }
  }
  assert(hatCells.length === 80, `all 8x10 hair/hat combinations should be captured (${hatCells.length})`);
  const contactSheet = await visualPage.evaluate(async cells => {
    const cellW = 96, cellH = 142, columns = 10;
    const canvas = document.createElement('canvas');
    canvas.width = cellW * columns;
    canvas.height = cellH * 8;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff9f0';
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i], x = (i % columns) * cellW, y = Math.floor(i / columns) * cellH;
      context.fillStyle = '#ffffff';
      context.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      const image = new Image();
      image.src = `data:image/png;base64,${cell.png}`;
      await image.decode();
      const scale = Math.min((cellW - 8) / image.width, (cellH - 29) / image.height);
      const width = image.width * scale, height = image.height * scale;
      context.drawImage(image, x + (cellW - width) / 2, y + (cellH - 24 - height) / 2, width, height);
      context.fillStyle = '#624b47';
      context.font = '10px sans-serif';
      context.fillText(`${cell.hair.slice(-2)}×${cell.hat.slice(-2)}`, x + 5, y + cellH - 8);
    }
    return canvas.toDataURL('image/png');
  }, hatCells);
  await fs.writeFile(`${outDir}/v9-hair-hat-contact-sheet.png`, Buffer.from(contactSheet.split(',')[1], 'base64'));
  results.push('80/80 hair x hat visual contact sheet captured');
  await visualContext.close();

  // Story mode: all five themes must open with custom backgrounds and recommendation UI.
  const storyContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const storyPage = await storyContext.newPage();
  await storyPage.addInitScript(() => {
    window.__bgmAudio = [];
    window.__bgmPlayAttempts = [];
    window.__rejectAudioOnce = '';
    const NativeAudio = window.Audio;
    window.Audio = function (src) {
      const audio = new NativeAudio(src);
      if (String(src).includes('/audio/')) window.__bgmAudio.push(audio);
      return audio;
    };
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      const src = this.currentSrc || this.src;
      if (src.includes('/audio/')) {
        window.__bgmPlayAttempts.push(src);
        if (window.__rejectAudioOnce && src.endsWith(window.__rejectAudioOnce)) {
          window.__rejectAudioOnce = '';
          return Promise.reject(new DOMException('Simulated temporary playback denial', 'NotAllowedError'));
        }
      }
      return nativePlay.apply(this, args);
    };
  });
  const storyThemes = [
    ['picnic', 'dress', 'picnic-day.mp3'],
    ['princess', 'dress', 'castle-ballroom.mp3'],
    ['rainy', 'pants', 'rainy-day.mp3'],
    ['birthday', 'dress', 'birthday-party.mp3'],
    ['beach', 'dress', 'seashell-parade.mp3']
  ];
  for (const [themeId, expectedCategory, expectedTrack] of storyThemes) {
    await storyPage.goto(baseURL, { waitUntil: 'networkidle' });
    await storyPage.locator('[data-action="stories"]').click();
    await storyPage.locator(`[data-theme="${themeId}"]`).click();
    if (themeId === 'rainy') await storyPage.evaluate(() => { window.__rejectAudioOnce = 'rainy-day.mp3'; });
    await storyPage.locator('[data-character="girl01"]').click();
    await storyPage.waitForSelector('.editor-page');
    if (themeId === 'rainy') {
      await storyPage.waitForFunction(() => window.__rejectAudioOnce === '' && window.__bgmPlayAttempts.filter(src => src.endsWith('rainy-day.mp3')).length === 1);
      await storyPage.locator(`[data-category="${expectedCategory}"]`).click();
    }
    await storyPage.waitForFunction(suffix => window.__bgmAudio.some(audio => audio.currentSrc.endsWith(suffix) && !audio.paused && audio.currentTime > .1), expectedTrack, { timeout: 10000 });
    const activeCategory = await storyPage.locator('.category-button.active').getAttribute('data-category');
    assert(activeCategory === expectedCategory, `${themeId} should open ${expectedCategory}, got ${activeCategory}`);
    const bgImage = await storyPage.locator('.stage-scene.has-art').evaluate(el => getComputedStyle(el).backgroundImage);
    assert(bgImage && bgImage !== 'none', `${themeId} must use custom background art`);
    assert(await storyPage.locator('.item-card.recommended').count() > 0, `${themeId} must show recommended items`);
    assert(await storyPage.evaluate(suffix => window.__bgmPlayAttempts.some(src => src.endsWith(suffix)), expectedTrack), `${themeId} must select ${expectedTrack}`);
    await storyPage.locator('[data-action="home"]').click();
    await storyPage.waitForFunction(() => window.__bgmAudio.some(audio => audio.currentSrc.endsWith('seyeon-closet.mp3') && !audio.paused && audio.currentTime > .1), null, { timeout: 10000 });
  }
  results.push('5/5 story music mappings, menu music, and rejected-play retry PASS');

  // Photo album save/restore rendering.
  await storyPage.goto(baseURL, { waitUntil: 'networkidle' });
  await storyPage.locator('[data-action="characters"]').click();
  await storyPage.locator('[data-character="girl01"]').click();
  await storyPage.locator('[data-category="dress"]').click();
  await storyPage.locator('[data-item="dress_06"]').click();
  await storyPage.locator('[data-action="finish"]').click();
  await storyPage.locator('[data-action="photo"]').click();
  await storyPage.waitForSelector('.album-page');
  assert(await storyPage.locator('.photo-card').count() > 0, 'saved outfit must appear in album');
  assert(await storyPage.locator('.photo-art svg').count() > 0, 'album photo must render SVG art');
  assert(await storyPage.locator('.photo-art [data-body-source="dressable"]').count() > 0, 'album must render the same dressable base');
  results.push('album save/render PASS');
  await storyContext.close();

  await fs.writeFile(`${outDir}/results.txt`, results.join('\n') + '\n', 'utf8');
  console.log(results.join('\n'));
} finally {
  await browser.close();
}
