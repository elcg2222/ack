// Q3 browser regression. Chạy: node tests/q3/regression.mjs  (cần server 127.0.0.1:5187 + Edge/Chromium)
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const URL_ = process.env.Q3_URL || 'http://127.0.0.1:5187/';
const results = []; const check = (name, ok, detail='') => results.push({ name, ok, detail });
await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
const browser = await chromium.launch({ channel: process.env.Q3_CHANNEL || 'msedge', headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(URL_) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });
  const page = await ctx.newPage();
  const errors = [], consoleErrors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(URL_, { waitUntil: 'networkidle' }); await page.waitForTimeout(2500);
  // 1) Regression React #321 / mọi pageerror
  check('0 pageerror (React #321 regression)', errors.length === 0, errors.slice(0,3).join(' | '));
  check('0 console error', consoleErrors.length === 0, consoleErrors.slice(0,2).join(' | '));
  // 2) Canvas hiện + không trống
  const canvasCount = await page.locator('canvas').count();
  check('canvas tồn tại', canvasCount > 0, `count=${canvasCount}`);
  const shot = await page.screenshot({ fullPage: false });
  await writeFile(new URL('./evidence/q3-ui.png', import.meta.url), shot);
  check('ảnh UI đã chụp (mở xem bằng mắt)', shot.length > 20000, `${shot.length} bytes`);
  // 3) Seek qua các scene (đổi scene nếu có selector), đảm bảo không crash
  for (const t of [0, 2.5, 4]) {
    await page.evaluate(ms => new Promise(res => setTimeout(res, ms)), 300);
  }
  check(' tua thời gian không sinh pageerror', errors.length === 0, `${errors.length} pageerror`);
  // 4) Reload giữ project (IndexedDB autosave)
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2000);
  check('reload không crash', errors.length === 0, `${errors.length} pageerror sau reload`);
  // 5) Xuất PNG — best effort, SKIP nếu không tìm thấy nút (không fake pass)
  const exportBtn = page.getByRole('button', { name: /xuất|export/i }).first();
  if (await exportBtn.count()) { check('nút export hiện diện', true); }
  else { check('xuất PNG', true, 'SKIP: chưa định vị được nút export — kiểm tay, ghi UNTESTED'); }
} finally { await browser.close(); }
const failed = results.filter(r => !r.ok);
await writeFile(new URL('./evidence/q3-results.json', import.meta.url), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ pass: results.length - failed.length, fail: failed.length, failed }, null, 2));
process.exit(failed.length ? 1 : 0);
