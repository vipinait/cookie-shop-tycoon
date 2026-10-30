const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../satisfaction.js');
const { chromium } = require('playwright');
const path = require('node:path');
test('pricing, inventory, zero demand, and score bounds', () => {
  assert.equal(calculate(75, 200, 50, 50).score, 82);
  assert.equal(calculate(75, 100, 50, 0).score, 58);
  assert.equal(calculate(75, 300, 50, 25).score, 61);
  assert.equal(calculate(75, 200, 0, 0).inventoryChange, 0);
  assert.equal(calculate(98, 200, 50, 50).change, 2);
  assert.equal(calculate(0, 2000, 50, 0).score, 0);
  assert.ok(calculate(98, 200, 50, 50).limited);
  assert.ok(calculate(75, 400, 50, 50).score < calculate(75, 200, 50, 50).score);
});
test('game: daily receipt, history, save/reload, reset, old saves, mobile, and 30 days', async () => {
  const server = require('node:http').createServer((req, res) => {
    const name = req.url === '/' ? 'index.html' : req.url.slice(1);
    if (!['index.html', 'game.js', 'satisfaction.js', 'style.css'].includes(name)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(require('node:fs').readFileSync(path.resolve(__dirname, '..', name)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(() => { localStorage.clear(); Math.random = () => .5; });
    await page.reload();
    await page.evaluate(() => Math.random = () => .5);
    assert.match(await page.locator('#satisfaction').innerText(), /75/);
    async function day(baked, price, ads = 0) {
      await page.locator('#quantity').fill(String(baked));
      await page.locator('#price').fill(String(price));
      await page.locator('#advertising').fill(String(ads));
      await page.locator('#open-shop').click();
      await page.waitForFunction(() => !document.querySelector('#receipt').hidden);
    }
    await day(50, 2);
    assert.match(await page.locator('#satisfaction').innerText(), /82/);
    assert.match(await page.locator('.satisfaction-feedback').innerText(), /Met all demand/);
    await day(0, 4);
    assert.match(await page.locator('.satisfaction-feedback').innerText(), /Inventory fell short/);
    assert.match(await page.locator('.satisfaction-feedback').innerText(), /expensive/);
    assert.equal(await page.locator('#history tr').count(), 2);
    const score = await page.locator('#satisfaction').innerText();
    await page.reload();
    assert.equal(await page.locator('#satisfaction').innerText(), score);
    await page.setViewportSize({ width: 375, height: 812 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#restart').click();
    await page.locator('#cancel-reset').click();
    assert.equal(await page.locator('#satisfaction').innerText(), score);
    await page.locator('#restart').click();
    await page.locator('#confirm-reset').click();
    await page.waitForFunction(() => document.querySelector('#history-count').textContent === '0 days in the books');
    assert.match(await page.locator('#satisfaction').innerText(), /75/);
    // Legacy rows retain their financial progress and explicitly lack historical feedback.
    await page.evaluate(() => localStorage.setItem('kevins-cookie-shop-v1', JSON.stringify({ cash: 100000, history: [{day:1,baked:50,sold:30,revenue:6000,expenses:3000,profit:3000,cash:13000,ads:0,price:200}] })));
    await page.reload();
    assert.match(await page.locator('#history').innerText(), /older save/);
    await day(50, 2);
    assert.match(await page.locator('#satisfaction').innerText(), /82/);
    for (let i = 2; i < 30; i++) await day(50, 2);
    assert.equal(await page.locator('#history tr').count(), 30);
    assert.ok(await page.locator('#open-shop').isDisabled());
    assert.match(await page.locator('#satisfaction').innerText(), /100/);
    assert.match(await page.locator('.satisfaction-feedback').innerText(), /limited/);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
