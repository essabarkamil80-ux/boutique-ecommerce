// Test fonctionnel local de sf-pdp : lots, couleur/taille, galerie, fenetre des tailles, ajout au panier (reseau simule).
// Usage : OUT=out-product.html sh build.sh 1 horizon product ; node pdp-test.js        (produit a 1 option)
//         SIZES=1 OUT=out-product.html sh build.sh 1 horizon product ; SIZES=1 node pdp-test.js   (couleur + taille)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const SIZES = process.env.SIZES === '1';
(async () => {
  let html = fs.readFileSync(path.join(__dirname, 'out-product.html'), 'utf8');
  const mod = `export class CartLinesUpdateEvent extends Event { constructor(d){ super('cart:lines-update',{bubbles:true}); Object.assign(this,d); }
    static createPromise(){ let res,rej; const promise=new Promise((a,b)=>{res=a;rej=b}); return {promise,resolve:res,reject:rej}; }
    static createCartFromAjaxResponse(c){ return {totalQuantity:c.item_count}; } }`;
  html = html.replace('<head>', `<head><script type="importmap">{"imports":{"@shopify/events":"data:text/javascript,${encodeURIComponent(mod)}"}}</script>`);
  html = html.replace('</body>', `<div id="cart-drawer"></div><script>window.__log=[];var d=document.getElementById('cart-drawer');d.isOpen=false;d.open=function(){d.isOpen=true;__log.push('drawer-open')};
    document.addEventListener('cart:lines-update',function(e){__log.push('event:'+e.action+':'+JSON.stringify(e.lines)); e.promise.then(function(r){__log.push('resolved:'+r.cart.totalQuantity)})});</script></body>`);
  const f = path.join(__dirname, 'out-product-test.html'); fs.writeFileSync(f, html);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let added = null;
  await p.route('**/cart/add.js', (r) => { added = JSON.parse(r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: added.items, sections: {} }) }); });
  await p.route('**/cart.js', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ item_count: 3, items: [] }) }));
  await p.goto('file://' + f, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const T = async (name, fn) => { const v = await p.evaluate(fn); console.log(name.padEnd(30), JSON.stringify(v)); return v; };
  await p.evaluate(() => { window.st = () => ({ id: document.querySelector('[data-sf-id]').value, label: document.querySelector('[data-atc-label]').textContent, price: document.querySelector('[data-atc-price]').textContent,
    dis: document.querySelector('[data-sf-atc]').disabled, thumb: [...document.querySelectorAll('[data-sf-thumb]')].findIndex((t) => t.classList.contains('is-active')),
    pills: document.querySelectorAll('.sf-pdp__opt').length, rows: document.querySelectorAll('.sf-tier.is-selected [data-row]').length,
    sel: [...document.querySelectorAll('.sf-tier.is-selected select[data-opt]')].map((s) => s.value) }); });
  await T('initial', () => st());
  const sel = (n, v) => p.selectOption(`.sf-tier.is-selected select[data-opt="${n}"]`, v);
  await sel(1, 'Black'); await T('color Black', () => st());
  await sel(1, 'Brown'); await T('color Brown (sold out)', () => st());
  await sel(1, 'Beige'); await T('color Beige', () => st());
  await p.click('.sf-tier:nth-of-type(3) .sf-tier__top');
  await T('tier 2 selected', () => ({ ...st(), tierPrice: document.querySelector('.sf-tier.is-selected [data-price]').textContent, count: document.querySelector('.sf-tier.is-selected [data-count]').textContent,
    save: document.querySelector('.sf-tier.is-selected [data-save]').textContent, pill: document.querySelector('.sf-tier.is-selected [data-perpiece]').hidden }));
  if (SIZES) {
    await p.click('[data-sf-size-open]'); await p.waitForTimeout(400);
    await T('popup open', () => ({ shown: !document.querySelector('[data-sf-size]').hidden, circles: [...document.querySelectorAll('.sf-size__circles button')].map((x) => x.textContent), on: document.querySelector('.sf-size__circles .is-on').textContent, cta: document.querySelector('[data-size-cta]').textContent }));
    await p.screenshot({ path: 'pdp-popup.png' });
    await p.click('.sf-size__circles button:nth-child(3)'); await T('popup pick L', () => ({ on: document.querySelector('.sf-size__circles .is-on').textContent, cta: document.querySelector('[data-size-cta]').textContent }));
    await p.click('[data-unit="in"]'); await T('unit in', () => ({ list: [...document.querySelectorAll('.sf-size__list li')].map((x) => x.textContent) }));
    await p.click('[data-size-cta]'); await p.waitForTimeout(500);
    await T('after CTA (size L)', () => ({ ...st(), closed: document.querySelector('[data-sf-size]').hidden }));
    await p.click('[data-sf-size-open]'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await T('Escape closes', () => ({ closed: document.querySelector('[data-sf-size]').hidden }));
    await p.click('[data-sf-size-open]'); await p.waitForTimeout(300); await p.click('.sf-size__x'); await p.waitForTimeout(400);
    await T('X closes', () => ({ closed: document.querySelector('[data-sf-size]').hidden }));
    await sel(1, 'Gray'); await sel(2, 'S'); await T('Gray S', () => st());
  } else {
    await p.click('[data-sf-size-open]'); await p.waitForTimeout(400);
    await T('popup (no sizes)', () => ({ shown: !document.querySelector('[data-sf-size]').hidden, empty: !document.querySelector('[data-size-empty]').hidden, cta: document.querySelector('[data-size-cta]').hidden }));
    await p.click('.sf-size__x'); await p.waitForTimeout(400);
  }
  await p.click('[data-sf-atc]'); await p.waitForTimeout(600);
  console.log('POST items :', JSON.stringify(added));
  await T('log', () => window.__log); await T('header badge', () => document.querySelector('[data-sf-count]').textContent);
  await p.click('[data-sf-thumb][data-media="104"]'); await T('thumb 4', () => st());
  await T('result card', () => ({ panels: document.querySelectorAll('.sf-res__panel').length, tabsHidden: getComputedStyle(document.querySelector('.sf-res__tabs')).display === 'none', singleImg: !!document.querySelector('.sf-res__pics--one') }));
  await T('timer', () => { const t = document.querySelector('[data-timer]'); return { exists: !!t, hidden: t && t.hidden, text: t && t.querySelector('[data-t]').textContent, subHidden: document.querySelector('[data-sub]').hidden }; });
  await T('benefits', () => [...document.querySelectorAll('.sf-pdp__ben li')].map((l) => l.querySelector('svg') ? l.textContent.trim() : 'NO ICON'));
  await T('badge/proof (empty by default)', () => ({ award: !!document.querySelector('.sf-pdp__award'), proof: !!document.querySelector('.sf-pdp__gproof') }));
  await T('cards in reviews', () => ({ n: document.querySelectorAll('.sf-rev__card').length }));
  for (const w of [1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200); await T('overflow @' + w, () => ({ hscroll: document.documentElement.scrollWidth > innerWidth })); }
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
