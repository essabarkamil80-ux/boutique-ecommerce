// Banc de test local : rend le theme "sf-" avec LiquidJS en emulant les objets/filtres Shopify.
// Usage : node render.js [avecImages=0|1] > out.html
const { Liquid, Tag, Hash } = require('liquidjs');
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..', 'theme');
const withImg = process.argv[2] === '1';

const CSS = [];
const engine = new Liquid({ root: [path.join(T, 'snippets')], extname: '.liquid', strictFilters: true,
  jsTruthy: false, ownPropertyOnly: false, dynamicPartials: true });

// {% schema %}, {% javascript %} : ignores ; {% stylesheet %} : collecte le CSS
for (const name of ['schema', 'javascript', 'stylesheet']) {
  engine.registerTag(name, class extends Tag {
    constructor(token, remain, liquid) { super(token, remain, liquid); this.body = [];
      const end = 'end' + name; let t;
      while ((t = remain.shift())) { if (t.name === end) return; this.body.push(t.getText()); }
      throw new Error('tag ' + name + ' non ferme'); }
    * render() { if (name === 'stylesheet') CSS.push(this.body.join('')); return ''; }
  });
}

// --- faux objets image ---------------------------------------------------------
const PAL = ['#cdb8ad', '#b9c7c2', '#d9c4bb', '#a9b7bd', '#c9b2c0', '#d8cbb8'];
let imgN = 0;
function fakeImg(label, w = 1200, h = 1500) {
  const c = PAL[imgN++ % PAL.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${c}"/><text x="50%" y="52%" font-family="sans-serif" font-size="${Math.round(w / 12)}" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  return { __img: true, src: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'), alt: label, width: w, height: h, media_type: 'image', aspect_ratio: w / h };
}

// --- filtres Shopify -------------------------------------------------------------
const f = (n, fn) => engine.registerFilter(n, fn);
f('image_url', (img) => (img && img.__img ? img.src : ''));
f('image_tag', function (src, ...args) {
  const o = {}; for (const a of args) if (Array.isArray(a)) o[a[0]] = a[1];
  const attrs = Object.entries(o).filter(([k]) => !['widths'].includes(k)).map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`).join(' ');
  return `<img src="${src}" ${attrs}>`;
});
f('placeholder_svg_tag', (name, cls) => `<svg class="${cls || ''}" viewBox="0 0 525 525" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><rect width="525" height="525" fill="none"/><path d="M190 180h145v165H190z" opacity=".6"/><circle cx="262" cy="150" r="30" opacity=".6"/></svg>`);
f('money', (c) => '€' + (Number(c) / 100).toFixed(2).replace('.', ','));
f('time_tag', (d) => 'September 25, 2026');
f('at_least', (a, b) => Math.max(Number(a), Number(b)));
f('handleize', (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'));
f('asset_url', (s) => s); f('stylesheet_tag', (s) => '');

// --- lecture des sections avec les valeurs par defaut du schema --------------------
function schemaOf(file) {
  const src = fs.readFileSync(path.join(T, 'sections', file + '.liquid'), 'utf8');
  const m = src.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  return { src, schema: JSON.parse(m[1]) };
}
function defaults(list) { const o = {}; for (const s of list || []) if (s.id) o[s.id] = s.default !== undefined ? s.default : (s.type === 'checkbox' ? false : ''); return o; }

const IMGKEYS = new Set(['image', 'photo', 'logo_img']);
function injectImages(type, settings, label) {
  if (!withImg) return;
  if (type === 'sf-hero') settings.image = fakeImg('hero photo', 1200, 1200);
  if (type === 'sf-promo') settings.image = fakeImg('promo photo', 2000, 760);
}

async function renderSection(id, conf, ctxBase) {
  const { src, schema } = schemaOf(conf.type);
  const settings = Object.assign(defaults(schema.settings), conf.settings || {});
  injectImages(conf.type, settings);
  const blocks = (conf.block_order || []).map((k) => {
    const b = conf.blocks[k]; const def = (schema.blocks || []).find((x) => x.type === b.type);
    const st = Object.assign(defaults(def && def.settings), b.settings || {});
    if (withImg && (b.type === 'category' || b.type === 'color' || b.type === 'review')) {
      const key = b.type === 'review' ? 'photo' : 'image';
      st[key] = fakeImg(st.label || st.name || b.type, 900, b.type === 'review' ? 506 : 900);
    }
    return { id: k, type: b.type, settings: st, shopify_attributes: '' };
  });
  const ctx = Object.assign({}, ctxBase, { section: { id, settings, blocks } });
  const out = await engine.parseAndRender(src, ctx);
  return `<div class="shopify-section" id="shopify-section-${id}">${out}</div>`;
}

(async () => {
  const ctxBase = {
    shop: { name: 'My Store 5', customer_accounts_enabled: true },
    routes: { root_url: '/', cart_url: '/cart', account_url: '/account', all_products_collection_url: '/collections/all' },
    cart: { item_count: 2 },
    linklists: {}, product: null,
  };
  // menu de demo : resolu via le reglage link_list
  const menu = { links: ['3D Leggings', '3D Shorts', '3D T-shirts', '3D Sleeves', 'Contact', 'Track Your Order'].map((t) => ({ title: t, url: '#', links: [] })) };
  const hg = JSON.parse(fs.readFileSync(path.join(T, 'sections/header-group.json'), 'utf8'));
  const idx = JSON.parse(fs.readFileSync(path.join(T, 'templates/index.json'), 'utf8'));
  let html = '';
  for (const k of hg.order) {
    const conf = JSON.parse(JSON.stringify(hg.sections[k]));
    if (conf.type === 'sf-header') conf.settings.menu = menu;
    html += await renderSection(k, conf, ctxBase);
  }
  html += '<main>';
  for (const k of idx.order) html += await renderSection(k, idx.sections[k], ctxBase);
  html += '</main>';
  process.stdout.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><style>${CSS.join('\n')}</style></head><body>${html}</body></html>`);
})().catch((e) => { console.error('ERREUR :', e.message); process.exit(1); });
