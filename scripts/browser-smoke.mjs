import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173/';
const outDir = 'qa/browser-smoke';
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
    return { layers, images, slotFits, hatFits };
  });
  assert(fit.images.length >= 6 && fit.images.every(image => image.x === '0' && image.y === '0' && image.width === '360' && image.height === '480' && image.preserve === 'xMidYMid meet'), 'body and source images must preserve the shared 360x480 canvas');
  assert(fit.slotFits.length >= 2 && fit.slotFits.every(entry => /^translate\([^)]*\) scale\([0-9.]+\)$/.test(entry.transform) && Number(entry.scale) > 0), `slot-fitted art must use one uniform scale (${JSON.stringify(fit.slotFits)})`);
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

  // V7+ shared preschool-v1 rig: custom wearables should remain selectable for all four characters.
  for (const characterId of ['girl01', 'girl02', 'bear01', 'rabbit01']) {
    const compatibilityContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const compatibilityPage = await compatibilityContext.newPage();
    await compatibilityPage.goto(baseURL, { waitUntil: 'networkidle' });
    await compatibilityPage.locator('[data-action="characters"]').click();
    await compatibilityPage.locator(`[data-character="${characterId}"]`).click();
    for (const [category, itemId] of [['hair','hair_02'],['top','top_02'],['shoes','shoes_02']]) {
      await compatibilityPage.locator(`[data-category="${category}"]`).click();
      assert((await compatibilityPage.locator(`[data-item="${itemId}"]`).count()) === 1, `${characterId} should expose shared ${itemId}`);
      await compatibilityPage.locator(`[data-item="${itemId}"]`).click();
    }
    const shared = await outfit(compatibilityPage);
    assert(shared.hair === 'hair_02' && shared.top === 'top_02' && shared.shoes === 'shoes_02', `${characterId} should persist shared-rig custom art`);
    await compatibilityPage.locator('[data-action="random"]').click();
    const randomized = await outfit(compatibilityPage);
    assert(randomized.hair && randomized.shoes, `${characterId} magic outfit should remain valid`);
    await compatibilityContext.close();
  }
  results.push('shared preschool-v1 custom art remains selectable for all 4 characters');

  // User-reported V8 visual regression set.
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
  await capture('v8-hair04-high-ponytail', [['hair','hair_04']]);
  await capture('v8-hair06-ponytail', [['hair','hair_06']]);
  await capture('v8-hair07-curly', [['hair','hair_07']]);
  await capture('v8-hat01-strawberry', [['hair','hair_02'],['hat','hat_01']]);
  await capture('v8-hat02-sunhat', [['hair','hair_02'],['hat','hat_02']]);
  await capture('v8-hat10-ribbon-fallback', [['hair','hair_02'],['hat','hat_10']]);
  await capture('v8-top02-blouse', [['hair','hair_02'],['top','top_02']]);
  results.push('V8 user-reported hair/hat/top visual regression screenshots captured');
  await visualContext.close();

  // Story mode: all five themes must open with custom backgrounds and recommendation UI.
  const storyContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const storyPage = await storyContext.newPage();
  const storyThemes = [
    ['picnic', 'dress'],
    ['princess', 'dress'],
    ['rainy', 'pants'],
    ['birthday', 'dress'],
    ['beach', 'dress']
  ];
  for (const [themeId, expectedCategory] of storyThemes) {
    await storyPage.goto(baseURL, { waitUntil: 'networkidle' });
    await storyPage.locator('[data-action="stories"]').click();
    await storyPage.locator(`[data-theme="${themeId}"]`).click();
    await storyPage.locator('[data-character="girl01"]').click();
    await storyPage.waitForSelector('.editor-page');
    const activeCategory = await storyPage.locator('.category-button.active').getAttribute('data-category');
    assert(activeCategory === expectedCategory, `${themeId} should open ${expectedCategory}, got ${activeCategory}`);
    const bgImage = await storyPage.locator('.stage-scene.has-art').evaluate(el => getComputedStyle(el).backgroundImage);
    assert(bgImage && bgImage !== 'none', `${themeId} must use custom background art`);
    assert(await storyPage.locator('.item-card.recommended').count() > 0, `${themeId} must show recommended items`);
  }
  results.push('5/5 story themes browser flow PASS');

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
  results.push('album save/render PASS');
  await storyContext.close();

  await fs.writeFile(`${outDir}/results.txt`, results.join('\n') + '\n', 'utf8');
  console.log(results.join('\n'));
} finally {
  await browser.close();
}
