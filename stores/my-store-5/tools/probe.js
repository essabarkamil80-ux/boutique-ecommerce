// Mesure les proprietes que les regles globales d'Horizon pourraient deformer.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto('file://'+__dirname+'/'+process.argv[2],{waitUntil:'networkidle'}).catch(()=>{});
  await p.evaluate(()=>document.fonts.ready);
  const r=await p.evaluate(()=>{
    const cs=(s,props)=>{const e=document.querySelector(s); if(!e) return 'ABSENT'; const c=getComputedStyle(e); return props.map(k=>k+'='+c.getPropertyValue(k)).join(' | ')};
    return {
      'h1 hero (marges, casse)':        cs('.sf-hero__title',['margin-top','margin-bottom','text-transform','letter-spacing']),
      'h2 Best Sellers (marges, casse)':cs('.sf-prod__head .sf-h2',['margin-top','margin-bottom','text-transform','letter-spacing','font-family']),
      'h2 Categories (marge haute)':    cs('.sf-cat__title',['margin-top','margin-bottom','text-transform']),
      'h3 News (casse, espacement)':    cs('.sf-news__title',['text-transform','letter-spacing','margin-bottom']),
      'ul rail (retrait gauche)':       cs('.sf-prod__rail',['padding-left','padding-right','list-style-type']),
      'ul trust (retrait gauche)':      cs('.sf-trust__row',['padding-left','padding-right']),
      'ul categories (retrait)':        cs('.sf-cat__grid',['padding-left','list-style-type']),
      'ul press (retrait)':             cs('.sf-press__set',['padding-left']),
      'blockquote avis':                cs('.sf-rev__quote',['margin-top','margin-left','padding-left','border-left-width','font-style']),
      'p hero':                         cs('.sf-hero__line',['margin-top','margin-bottom','line-height']),
      'promo (padding haut, wrap)':     cs('.sf-promo__wrap',['padding-top','padding-left']),
    };
  });
  for(const [k,v] of Object.entries(r)) console.log(k.padEnd(34), v);
  await b.close();
})();
