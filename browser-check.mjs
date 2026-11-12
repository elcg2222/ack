import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require = createRequire(new URL('./source/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const label = process.argv[2] === 'modified' ? 'modified' : 'baseline';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', route => {
    const url = route.request().url();
    return url.startsWith('http://127.0.0.1:5187/') || url.startsWith('data:') || url.startsWith('blob:') ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [], consoleErrors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto('http://127.0.0.1:5187/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const body = await page.locator('body').innerText();
  await page.screenshot({ path: new URL(`./${label}-ui.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
  const result = { errors, consoleErrors, body, canvasCount: await page.locator('canvas').count(), browser: browser.version(), url: page.url() };
  await writeFile(new URL(`./BROWSER_${label.toUpperCase()}.json`,import.meta.url),JSON.stringify(result,null,2),'utf8');
  console.log(JSON.stringify({label,errorCount:errors.length,uniqueErrors:[...new Set(errors)],consoleErrors:consoleErrors.slice(0,2),canvasCount:result.canvasCount},null,2));
} finally { await browser.close(); }
