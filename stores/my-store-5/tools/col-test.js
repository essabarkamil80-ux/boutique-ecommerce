// Galerie filtree par couleur : COLMEDIA=1 OUT=out-product.html sh build.sh 1 horizon product ; node col-test.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const f = path.join(__dirname, 'out-product.html');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + f, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const st = () => p.evaluate(() => ({ vis: [...document.querySelectorAll('[data-sf-thumb]')].filter((t) => !t.parentNode.hidden).map((t) => t.dataset.color + ':' + t.dataset.media),
    active: (document.querySelector('[data-sf-thumb].is-active') || {}).dataset && document.querySelector('[data-sf-thumb].is-active').dataset.media,
    main: document.querySelector('.sf-pdp__stage img').alt, nav: document.querySelector('[data-sf-next-img]') && document.querySelector('[data-sf-next-img]').hidden,
    sel: [...document.querySelectorAll('.sf-tier.is-selected select[data-opt]')].map((s) => s.value) }));
  console.log('initial', JSON.stringify(await st()));
  await p.selectOption('.sf-tier.is-selected select[data-opt="1"]', 'Pink'); console.log('row->Pink', JSON.stringify(await st()));
  await p.click('[data-sf-next-img]'); console.log('next', JSON.stringify(await st()));
  await p.click('[data-sf-next-img]'); await p.click('[data-sf-next-img]'); console.log('wrap', JSON.stringify(await st()));
  await p.click('.sf-pdp__opt .sf-pill[data-val="Beige"]').catch(() => {}); console.log('pill Beige', JSON.stringify(await st()));
  console.log('errors', errs);
  await b.close();
})();
