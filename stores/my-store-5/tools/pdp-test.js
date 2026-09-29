// Test fonctionnel local de sf-pdp : variantes, lots, galerie, ajout au panier (reseau simule).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  let html = fs.readFileSync(path.join(__dirname, 'out-product.html'), 'utf8');
  const mod = `export class CartLinesUpdateEvent extends Event { constructor(d){ super('cart:lines-update',{bubbles:true}); Object.assign(this,d); }
    static createPromise(){ let res,rej; const promise=new Promise((a,b)=>{res=a;rej=b}); return {promise,resolve:res,reject:rej}; }
    static createCartFromAjaxResponse(c){ return {totalQuantity:c.item_count}; } }`;
  html = html.replace('<head>', `<head><script type="importmap">{"imports":{"@shopify/events":"data:text/javascript,${encodeURIComponent(mod)}"}}</script>`);
  html = html.replace('</body>', `<div id="cart-drawer"></div><script>window.__log=[];var d=document.getElementById('cart-drawer');d.isOpen=false;d.open=function(){d.isOpen=true;__log.push('drawer-open')};
    document.addEventListener('cart:lines-update',function(e){__log.push('event:'+e.action+':'+JSON.stringify(e.lines)); e.promise.then(function(r){__log.push('resolved:'+r.cart.totalQuantity+':'+r.detail.sections)})});</script></body>`);
  const f = path.join(__dirname, 'out-product-test.html'); fs.writeFileSync(f, html);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let added = null;
  await p.route('**/cart/add.js', (r) => { added = JSON.parse(r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: added.items, sections: { 'cart-drawer': '<x>' } }) }); });
  await p.route('**/cart.js', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ item_count: 3, items: [] }) }));
  await p.goto('file://' + f, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const T = async (name, fn) => { const v = await p.evaluate(fn); console.log(name.padEnd(34), JSON.stringify(v)); };
  const st = () => ({ id: document.querySelector('[data-sf-id]').value, label: document.querySelector('[data-atc-label]').textContent, price: document.querySelector('[data-atc-price]').textContent,
    cmp: document.querySelector('[data-atc-compare]').textContent, dis: document.querySelector('[data-sf-atc]').disabled, main: document.querySelector('.sf-pdp__stage img').src.slice(-12),
    activeThumb: [...document.querySelectorAll('[data-sf-thumb]')].findIndex((t) => t.classList.contains('is-active')), optval: document.querySelector('[data-sf-optval]').textContent });
  await p.evaluate((src) => { window.st = eval('(' + src + ')'); }, st.toString());
  await T('initial (Gray)', st);
  await p.click('.sf-pill:has-text("Black")'); await T('click Black', st);
  await p.click('.sf-pill:has-text("Brown")'); await T('click Brown (sold out)', st);
  await p.click('.sf-pill:has-text("Beige")'); await T('click Beige', st);
  await p.click('.sf-tier:nth-of-type(3) .sf-tier__top'); await T('tier 2 selected', () => ({ ...st(), rows: [...document.querySelectorAll('.sf-tier.is-selected [data-row]')].length, visible: getComputedStyle(document.querySelector('.sf-tier.is-selected .sf-tier__rows')).display,
    tierPrice: document.querySelector('.sf-tier.is-selected [data-price]').textContent, count: document.querySelector('.sf-tier.is-selected [data-count]').textContent, save: document.querySelector('.sf-tier.is-selected [data-save]').textContent }));
  const rows = await p.$$('.sf-tier.is-selected [data-row]');
  await (await rows[1].$('[data-var]')).selectOption({ label: 'Blue' }); await (await rows[1].$('[data-qty]')).selectOption('2');
  await T('row2 Blue x2', () => ({ ...st(), count: document.querySelector('.sf-tier.is-selected [data-count]').textContent, tierPrice: document.querySelector('.sf-tier.is-selected [data-price]').textContent }));
  await p.screenshot({ path: 'pdp-tier2.png', clip: { x: 780, y: 480, width: 580, height: 760 } });
  await p.click('[data-sf-atc]'); await p.waitForTimeout(600);
  console.log('POST items :', JSON.stringify(added));
  await T('log', () => window.__log); await T('header badge', () => document.querySelector('[data-sf-count]').textContent);
  await p.click('[data-sf-thumb][data-media="104"]'); await T('thumb 4', st);
  await p.click('[data-sf-next-img]'); await T('next image', st);
  await p.click('.sf-res__tab[data-tab="2"]'); await T('result tab 3', () => ({ shown: [...document.querySelectorAll('.sf-res__panel')].map((x) => !x.hidden) }));
  await T('reviews pager', () => ({ pager: !document.querySelector('[data-pager]').hidden }));
  for (const w of [1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200); await T('overflow @' + w, () => ({ hscroll: document.documentElement.scrollWidth > innerWidth, sw: document.documentElement.scrollWidth })); }
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
