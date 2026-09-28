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

  // Outfit state invariants in the actual browser UI.
  await page.locator('[data-category="dress"]').click();
  await page.locator('[data-item="dress_05"]').click();
  await page.locator('[data-category="top"]').click();
  await page.locator('[data-item="top_01"]').click();
  let value = await outfit(page);
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

  // Scroll position must survive item selection and delayed sparkle re-render.
  await page.locator('[data-category="dress"]').click();
  const before = await page.locator('.item-rail').evaluate(el => {
    const previousBehavior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = Math.min(190, Math.max(0, el.scrollWidth - el.clientWidth));
    const value = el.scrollLeft;
    el.dispatchEvent(new Event('scroll'));
    el.style.scrollBehavior = previousBehavior;
    return value;
  });
  await page.waitForTimeout(80);
  await page.locator('[data-item="dress_08"]').evaluate(el => el.click());
  await page.waitForTimeout(950);
  const after = await page.locator('.item-rail').evaluate(el => el.scrollLeft);
  assert(Math.abs(after - before) <= 8, `item rail scroll must persist (before=${before}, after=${after})`);

  // Category rail position must survive category change.
  const catBefore = await page.locator('.category-rail').evaluate(el => {
    const previousBehavior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const value = el.scrollLeft;
    el.dispatchEvent(new Event('scroll'));
    el.style.scrollBehavior = previousBehavior;
    return value;
  });
  await page.waitForTimeout(80);
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

  await fs.writeFile(`${outDir}/results.txt`, results.join('\n') + '\n', 'utf8');
  console.log(results.join('\n'));
} finally {
  await browser.close();
}
