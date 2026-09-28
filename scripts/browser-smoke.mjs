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
    const hatFits = [...new Set(window.GAME_DATA.items.filter(item => item.category === 'hat').map(item => item.hatFit))];
    return { layers, images, hatFits };
  });
  assert(fit.images.length === 5 && fit.images.every(image => image.x === '0' && image.y === '0' && image.width === '360' && image.height === '480' && image.preserve === 'xMidYMid meet'), 'body and selected wearables must preserve the shared 360x480 canvas');
  assert(fit.layers.indexOf('body') < fit.layers.indexOf('pants') && fit.layers.indexOf('pants') < fit.layers.indexOf('top') && fit.layers.indexOf('shoes') < fit.layers.indexOf('hair') && fit.layers.indexOf('hair') < fit.layers.indexOf('hat'), `wearable layer order must keep clothing below hair and hat (${fit.layers.join(' > ')})`);
  assert(fit.hatFits.includes('cap') && fit.hatFits.includes('sunhat') && fit.hatFits.includes('beanie') && fit.hatFits.includes('crown'), `hats must use four explicit fits (${fit.hatFits.join(', ')})`);
  results.push('shared art canvas, garment alignment, four hat fits, and hair/hat layer order PASS');
  await page.locator('[data-action="reset"]').click();

  // Outfit state invariants in the actual browser UI.
  let value;
  await page.locator('[data-category="dress"]').click();
  await page.locator('[data-item="dress_05"]').click();
  await page.locator('[data-action="undo"]').click();
  value = await outfit(page);
  assert(!value.dress && value.shoes === 'shoes_01', 'undo must restore the previous outfit');
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
  assert(value.hair === 'hair_01' && value.shoes === 'shoes_01' && !value.dress && !value.top && !value.skirt && !value.pants, 'reset must restore the default outfit');
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

  // Custom Se-yeon art must be filtered from other characters across restore, UI, random, story, and album paths.
  const compatibilityProbe = await browser.newPage();
  await compatibilityProbe.goto(baseURL, { waitUntil: 'networkidle' });
  const customIds = await compatibilityProbe.evaluate(() => window.GAME_DATA.items.filter(item => item.asset).map(item => item.id));
  const customCategories = await compatibilityProbe.evaluate(() => [...new Set(window.GAME_DATA.items.filter(item => item.asset).map(item => item.category))]);
  await compatibilityProbe.context().close();
  for (const characterId of ['girl02', 'bear01', 'rabbit01']) {
    const compatibilityContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const compatibilityPage = await compatibilityContext.newPage();
    await compatibilityPage.addInitScript(() => localStorage.setItem('seyeon-closet-save', JSON.stringify({
      characterId: 'girl01', mode: 'free', outfit: { hair:'hair_03', dress:'dress_05', top:'top_02', shoes:'shoes_02', headAccessory:'headAccessory_01', bag:'bag_01', toy:'toy_01' },
      album: [{ characterId:'bear01', outfit:{ hair:'hair_03', dress:'dress_05', shoes:'shoes_02' }, backgroundId:'room', character:'곰돌이', background:'아이 방', items:['무지개 원피스'], date:'26. 9. 29.' }]
    })));
    await compatibilityPage.goto(baseURL, { waitUntil: 'networkidle' });
    await compatibilityPage.locator('[data-action="characters"]').click();
    await compatibilityPage.locator(`[data-character="${characterId}"]`).click();
    const restored = await outfit(compatibilityPage);
    assert(Object.values(restored).every(id => !customIds.includes(id)), `${characterId} must discard incompatible saved art`);
    for (const category of customCategories) {
      await compatibilityPage.locator(`[data-category="${category}"]`).click();
      for (const id of customIds.filter(id => id.startsWith(`${category}_`))) {
        assert((await compatibilityPage.locator(`[data-item="${id}"]`).count()) === 0, `${characterId} item rail must hide ${id}`);
      }
    }
    for (let i = 0; i < 4; i += 1) {
      await compatibilityPage.locator('[data-action="random"]').click();
      const randomized = await outfit(compatibilityPage);
      assert(Object.values(randomized).every(id => !customIds.includes(id)), `${characterId} magic outfit ${i} must exclude custom art`);
    }
    await compatibilityPage.locator('[data-action="home"]').click();
    await compatibilityPage.locator('[data-action="stories"]').click();
    await compatibilityPage.locator('[data-theme="picnic"]').click();
    await compatibilityPage.locator(`[data-character="${characterId}"]`).click();
    assert((await compatibilityPage.locator('[data-item="dress_05"]').count()) === 0, `${characterId} story must not offer incompatible recommendations`);
    assert((await compatibilityPage.locator('.item-card.recommended[data-item^="dress_"]').count()) === 0, `${characterId} story must not recommend incompatible dresses`);
    await compatibilityPage.locator('[data-action="home"]').click();
    await compatibilityPage.locator('[data-action="album"]').click();
    assert((await compatibilityPage.locator('.photo-art image[href*="/clothes/"]').count()) === 0, `${characterId} legacy album art must use compatible rendering`);
    await compatibilityContext.close();
  }
  results.push('custom art compatibility: saved data, item rail, magic, story recommendations, and album PASS for 3 characters');

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
