const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [w, tag] of [[1440, 'd'], [390, 'm']]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('file://' + path.join(__dirname, 'out-page.html'), { waitUntil: 'load' }); await p.waitForTimeout(500);
    const info = await p.evaluate(() => ({ n: document.querySelectorAll('.sf-shop__usp').length, texts: [...document.querySelectorAll('.sf-shop__usp > b')].map((x) => x.textContent),
      svgs: new Set([...document.querySelectorAll('.sf-shop__uico svg')].map((s) => s.innerHTML)).size, hscroll: document.documentElement.scrollWidth > innerWidth, open: [...document.querySelectorAll('.sf-shop__acc')].map((d) => d.open) }));
    console.log(tag, JSON.stringify(info), errs);
    const el = await p.$('.sf-shop__usps'); await el.screenshot({ path: `usp-${tag}.png` });
    const ac = await p.$('.sf-shop__accs'); await ac.screenshot({ path: `acc-${tag}.png` });
    await p.close();
  }
  await b.close();
})();
