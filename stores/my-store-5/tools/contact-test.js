// Test local de la page contact : accordeon, choix "commande", champs du formulaire, debordement.
// OUT=out-contact.html sh build.sh 1 horizon contact ; node contact-test.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + __dirname + '/out-contact.html'); await p.waitForTimeout(300);
  const T = async (n, fn) => console.log(n.padEnd(24), JSON.stringify(await p.evaluate(fn)));
  const open = () => [...document.querySelectorAll('.sf-ct__q')].map((q) => q.classList.contains('is-open'));
  await p.evaluate((s) => { window.open_ = eval('(' + s + ')'); }, open.toString());
  await T('initial', () => open_());
  await p.click('.sf-ct__q:nth-child(2) .sf-ct__qb'); await T('open Q2 (closes Q5)', () => open_());
  await p.click('.sf-ct__q:nth-child(2) .sf-ct__qb'); await T('close Q2', () => open_());
  await T('Q2 answer', () => document.querySelector('.sf-ct__q:nth-child(2) .sf-ct__qa').textContent);
  await p.click('[data-has="no"]'); await T('Not yet', () => ({ orderHidden: document.querySelector('[data-order-field]').hidden, v: document.querySelector('[data-has-input]').value }));
  await p.click('[data-has="yes"]'); await T('I have an order', () => ({ orderHidden: document.querySelector('[data-order-field]').hidden, v: document.querySelector('[data-has-input]').value }));
  await T('form fields', () => [...document.querySelectorAll('.sf-ct__form [name]')].map((e) => e.name + (e.required ? '*' : '')));
  await T('reasons', () => [...document.querySelectorAll('.sf-ct__sel option')].map((o) => o.textContent));
  await T('links', () => [...document.querySelectorAll('.sf-ct__links a')].map((a) => a.textContent.trim() + ' -> ' + a.getAttribute('href')));
  for (const w of [1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(150); await T('overflow @' + w, () => ({ hscroll: document.documentElement.scrollWidth > innerWidth })); }
  await p.screenshot({ path: 'c390.png', fullPage: true }); console.log('errors', JSON.stringify(errs)); await b.close();
})();
