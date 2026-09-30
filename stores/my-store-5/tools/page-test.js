// Test local de la page "Sostieni George" (sf-shop-main, sf-ugc, sf-rv-list).
// OUT=out-page.html SIZES=1 sh build.sh 1 horizon page ; node page-test.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  let html = fs.readFileSync(path.join(__dirname, 'out-page.html'), 'utf8');
  const mod = `export class CartLinesUpdateEvent extends Event { constructor(d){ super('cart:lines-update',{bubbles:true}); Object.assign(this,d); }
    static createPromise(){ let res,rej; const promise=new Promise((a,b)=>{res=a;rej=b}); return {promise,resolve:res,reject:rej}; }
    static createCartFromAjaxResponse(c){ return {totalQuantity:c.item_count}; } }`;
  html = html.replace('<head>', `<head><script type="importmap">{"imports":{"@shopify/events":"data:text/javascript,${encodeURIComponent(mod)}"}}</script>`);
  html = html.replace('</body>', `<div id="cart-drawer"></div><script>window.__log=[];var d=document.getElementById('cart-drawer');d.isOpen=false;d.open=function(){d.isOpen=true;__log.push('drawer-open')};
    document.addEventListener('cart:lines-update',function(e){__log.push('event:'+e.action+':'+JSON.stringify(e.lines))});</script></body>`);
  const f = path.join(__dirname, 'out-page-test.html'); fs.writeFileSync(f, html);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let added = null;
  await p.route('**/cart/add.js', (r) => { added = JSON.parse(r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: added.items, sections: {} }) }); });
  await p.route('**/cart.js', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ item_count: 1, items: [] }) }));
  await p.goto('file://' + f, { waitUntil: 'load' }); await p.waitForTimeout(400);
  const T = async (n, fn) => console.log(n.padEnd(26), JSON.stringify(await p.evaluate(fn)));
  const st = () => ({ id: document.querySelector('[data-sf-id]').value, price: document.querySelector('[data-price]').textContent, badge: document.querySelector('[data-badge]').hidden ? null : document.querySelector('[data-badge]').textContent,
    btn: document.querySelector('[data-atc-label]').textContent, dis: document.querySelector('[data-sf-atc]').disabled, stock: document.querySelector('[data-stock]').textContent,
    thumb: [...document.querySelectorAll('[data-sf-thumb]')].findIndex((t) => t.classList.contains('is-active')) });
  await p.evaluate((s) => { window.st = eval('(' + s + ')'); }, st.toString());
  await T('initial', () => st());
  await p.click('.sf-sw[data-val="Black"]'); await T('swatch Black', () => st());
  await p.click('.sf-sw[data-val="Brown"]'); await T('swatch Brown (sold out)', () => st());
  await p.click('.sf-sw[data-val="Beige"]'); await p.click('.sf-size[data-val="M"]'); await T('Beige + M', () => st());
  await p.click('[data-sf-zoom]'); await T('zoom open', () => ({ open: !document.querySelector('[data-sf-lb]').hidden })); await p.keyboard.press('Escape'); await T('zoom closed', () => ({ open: !document.querySelector('[data-sf-lb]').hidden }));
  await p.click('[data-sf-atc]'); await p.waitForTimeout(500); console.log('POST', JSON.stringify(added)); await T('log', () => window.__log);
  await p.click('[data-tab="q"]'); await T('tab questions', () => ({ r: document.querySelector('[data-pane="r"]').hidden, q: document.querySelector('[data-pane="q"]').hidden }));
  await p.click('[data-tab="r"]');
  await p.fill('[data-q]', 'zzz'); await T('search zzz', () => ({ shown: [...document.querySelectorAll('.sf-rl__item')].filter((x) => !x.hidden).length }));
  await p.fill('[data-q]', ''); await T('search cleared', () => ({ shown: [...document.querySelectorAll('.sf-rl__item')].filter((x) => !x.hidden).length }));
  await p.selectOption('[data-sort]', 'high'); await T('sort high', () => ({ ok: true }));
  for (const w of [1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200); await T('overflow @' + w, () => ({ hscroll: document.documentElement.scrollWidth > innerWidth })); }
  await p.screenshot({ path: 'g390.png', fullPage: true });
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
