// Galerie filtree par couleur (page push-up) : COLMEDIA=1 OUT=out-page.html sh build.sh 1 horizon page ; node col-test2.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'out-page.html'), { waitUntil: 'load' }); await p.waitForTimeout(500);
  const st = () => p.evaluate(() => ({ vis: [...document.querySelectorAll('[data-sf-thumb]')].filter((t) => !t.parentNode.hidden).map((t) => t.dataset.color + ':' + t.dataset.media),
    active: (document.querySelector('[data-sf-thumb].is-active') || { dataset: {} }).dataset.media, main: document.querySelector('.sf-shop__stage img').alt }));
  console.log('initial', JSON.stringify(await st()));
  await p.click('.sf-sw[data-val="Pink"]').catch(async () => { await p.click('[data-val="Pink"]'); }); console.log('pill Pink', JSON.stringify(await st()));
  const sel = await p.$('.sf-tier.is-selected select[data-opt="1"]');
  if (sel) { await p.selectOption('.sf-tier.is-selected select[data-opt="1"]', 'Purple'); console.log('row->Purple', JSON.stringify(await st())); }
  console.log('errors', errs); await b.close();
})();
