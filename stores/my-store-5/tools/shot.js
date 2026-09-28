const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const [,, file, vw, out] = process.argv;
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
  const p=await b.newPage({viewport:{width:+vw,height:900},deviceScaleFactor:1});
  await p.goto('file://'+__dirname+'/'+file,{waitUntil:'networkidle'}).catch(()=>{});
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(600);
  const m=await p.evaluate(()=>{
    const r=s=>{const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return {y:Math.round(b.top+scrollY),h:Math.round(b.height),w:Math.round(b.width),x:Math.round(b.left)}};
    const secs=[...document.querySelectorAll('.shopify-section')].map(s=>{const b=s.getBoundingClientRect();return [s.id.replace('shopify-section-',''),Math.round(b.height)]});
    return {secs, fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight),
      heroTitle:r('.sf-hero__title'), heroBtn:r('.sf-hero__btn'), card:r('.sf-prod__item'), cardImg:r('.sf-card__media'),
      cat:r('.sf-cat__media'), rev:r('.sf-rev__card'), revPhoto:r('.sf-rev__photo'), col:r('.sf-col__media'), news:r('.sf-news__media'),
      h2:getComputedStyle(document.querySelector('.sf-h2')).fontSize, hscroll: document.documentElement.scrollWidth > innerWidth,
      page: document.documentElement.scrollHeight};
  });
  console.log(JSON.stringify(m));
  await p.screenshot({path:out, fullPage:true}); await b.close();
})();
