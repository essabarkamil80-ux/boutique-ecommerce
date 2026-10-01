// Banc de test local : rend le theme "sf-" avec LiquidJS en emulant les objets/filtres Shopify.
// Usage : node render.js [avecImages=0|1] > out.html
const { Liquid, Tag, Hash } = require('liquidjs');
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..', 'theme');
const withImg = process.argv[2] === '1';
const MODE = ['product', 'page', 'contact'].includes(process.argv[4]) ? process.argv[4] : 'index';

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

// {% form 'product', product, id: x, class: y %}
engine.registerTag('form', class extends Tag {
  constructor(token, remain, liquid) { super(token, remain, liquid); this.args = token.args; this.tpls = [];
    const stream = this.liquid.parser.parseStream(remain).on('tag:endform', () => stream.stop())
      .on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error('form non ferme'); });
    stream.start(); }
  * render(ctx, emitter) {
    const m = /class:\s*'([^']*)'/.exec(this.args) || []; const i = /id:\s*([\w]+)/.exec(this.args);
    emitter.write(`<form method="post" action="/cart/add" class="${m[1] || ''}" novalidate>`);
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter); emitter.write('</form>');
  }
});

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
f('payment_type_svg_tag', (t, cls) => `<svg class="${(cls && cls[1]) || ''}" viewBox="0 0 40 26"><rect width="40" height="26" rx="3" fill="#fff" stroke="#ddd"/><text x="20" y="16" font-size="7" text-anchor="middle">${t}</text></svg>`);
f('default_errors', () => 'errors');
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
  if (MODE !== 'index') { for (const k of Object.keys(settings)) if (settings[k] === '' && /^(image|photo|before|after|avatar_\d)$/.test(k)) settings[k] = fakeImg(k + ' ' + type, 900, 900); }
  if (type === 'sf-hero') settings.image = fakeImg('hero photo', 1200, 1200);
  if (type === 'sf-promo') { settings.image = fakeImg('promo photo', 2000, 760); if (process.env.PROMO_IMG) settings.image.src = 'data:image/webp;base64,' + fs.readFileSync(process.env.PROMO_IMG).toString('base64'); }
}


// --- faux produit (7 couleurs, une image) ------------------------------------------
const COLORS = ['Gray', 'Black', 'Beige', 'Blue', 'Purple', 'Pink', 'Brown'];
const mkMedia = (id, n) => Object.assign(fakeImg('product ' + n, 1254, 1254), { id, alt: n === 1 ? 'Sculpt leggings' : '' });
const MEDIA = [mkMedia(101, 1), mkMedia(102, 2), mkMedia(103, 3), mkMedia(104, 4), mkMedia(105, 5)];
const SZ = process.env.SIZES === '1' ? ['S', 'M', 'L'] : null;
const VARIANTS = []; COLORS.forEach((c, i) => (SZ || [null]).forEach((z, k) => VARIANTS.push({ id: 5000 + i * 10 + k, title: z ? c + ' / ' + z : c, url: '/products/x?variant=' + (5000 + i * 10 + k), options: z ? [c, z] : [c], price: 4999, compare_at_price: 5999,
  available: !(c === 'Brown' || (c === 'Gray' && z === 'L')), featured_media: c === 'Black' ? MEDIA[1] : (c === 'Beige' ? MEDIA[2] : null) })));
class OV { constructor(n, sel) { this.n = n; this.selected = sel; this.swatch = { color: null }; } toString() { return this.n; } }
const PRODUCT = { id: 11190618194257, title: 'Essabar&Co Sculpt 3D Leggings', url: '/products/x', handle: 'x', tags: [], media: MEDIA, featured_media: MEDIA[0],
  variants: VARIANTS, selected_or_first_available_variant: VARIANTS[0], has_only_default_variant: false,
  options_with_values: [{ name: 'Couleur', position: 1, values: COLORS.map((c, i) => new OV(c, i === 0)) }].concat(SZ ? [{ name: 'Size', position: 2, values: SZ.map((z, i) => new OV(z, i === 0)) }] : []),
  description: '<p>Scolpisci la tua silhouette.</p>', metafields: {}, available: true, price: 4999, compare_at_price: 5999, price_min: 4999, price_varies: false };

async function renderSection(id, conf, ctxBase) {
  const { src, schema } = schemaOf(conf.type);
  const settings = Object.assign(defaults(schema.settings), conf.settings || {});
  injectImages(conf.type, settings);
  const blocks = (conf.block_order || []).map((k) => {
    const b = conf.blocks[k]; const def = (schema.blocks || []).find((x) => x.type === b.type);
    const st = Object.assign(defaults(def && def.settings), b.settings || {});
    if (withImg && MODE !== 'index') { for (const k of Object.keys(st)) if (st[k] === '' && /^(image|photo|before|after)$/.test(k)) st[k] = fakeImg((st.name || st.title || b.type) + ' ' + k, 700, 900); }
    if (withImg && MODE === 'index' && (b.type === 'category' || b.type === 'color' || b.type === 'review')) {
      const key = b.type === 'review' ? 'photo' : 'image';
      st[key] = fakeImg(st.label || st.name || b.type, 900, b.type === 'review' ? 506 : 900);
    }
    return { id: k, type: b.type, settings: st, shopify_attributes: '' };
  });
  const ctx = Object.assign({}, ctxBase, { section: { id, settings, blocks } });
  if (MODE === 'product') ctx.product = PRODUCT;
  for (const d of schema.settings || []) if (d.type === 'product' && settings[d.id]) settings[d.id] = PRODUCT;
  const out = await engine.parseAndRender(src, ctx);
  return `<div class="shopify-section" id="shopify-section-${id}">${out}</div>`;
}

(async () => {
  const ctxBase = {
    shop: { name: 'My Store 5', customer_accounts_enabled: true, email: 'hello@example.com', shipping_policy: { url: '/policies/shipping-policy' }, refund_policy: { url: '/policies/refund-policy' }, privacy_policy: { url: '/policies/privacy-policy' }, terms_of_service: { url: '/policies/terms-of-service' }, enabled_payment_types: ['visa', 'master', 'paypal', 'apple_pay', 'google_pay', 'shopify_pay'] }, form: { 'posted_successfully?': process.env.POSTED === '1', errors: false, email: '' }, customer: null,
    routes: { root_url: '/', cart_add_url: '/cart/add.js', cart_url: '/cart', account_url: '/account', all_products_collection_url: '/collections/all' },
    cart: { item_count: 2, currency: { iso_code: 'EUR' } }, request: { locale: { iso_code: 'en' }, design_mode: process.env.DM === '1' }, recommendations: { products: [] }, collections: { all: { products_count: 1, products: [PRODUCT] } }, settings: {},
    linklists: {}, product: null,
  };
  // menu de demo : resolu via le reglage link_list
  const menu = { links: ['3D Leggings', '3D Shorts', '3D T-shirts', '3D Sleeves', 'Contact', 'Track Your Order'].map((t) => ({ title: t, url: '#', links: [] })) };
  const hg = JSON.parse(fs.readFileSync(path.join(T, 'sections/header-group.json'), 'utf8'));
  const idx = JSON.parse(fs.readFileSync(path.join(T, MODE === 'product' ? 'templates/product.json' : MODE === 'page' ? 'templates/page.sostieni-george.json' : MODE === 'contact' ? 'templates/page.contact.json' : 'templates/index.json'), 'utf8'));
  let html = '';
  for (const k of hg.order) {
    const conf = JSON.parse(JSON.stringify(hg.sections[k]));
    if (conf.type === 'sf-header') conf.settings.menu = menu;
    html += await renderSection(k, conf, ctxBase);
  }
  html += '<main>';
  for (const k of idx.order) html += await renderSection(k, idx.sections[k], ctxBase);
  html += '</main>';
  if (MODE !== 'index') { const fg = JSON.parse(fs.readFileSync(path.join(T, 'sections/footer-group.json'), 'utf8')); for (const k of fg.order) html += await renderSection(k, JSON.parse(JSON.stringify(fg.sections[k])), ctxBase); }
  const HG = process.argv[3] === 'horizon' ? fs.readFileSync(path.join(__dirname, 'horizon-globals.css'), 'utf8') : '';
  process.stdout.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><style>${HG}</style><style>${CSS.join('\n')}</style></head><body>${html}</body></html>`);
})().catch((e) => { console.error('ERREUR :', e.message); process.exit(1); });
