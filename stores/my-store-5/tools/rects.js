// Position/hauteur de chaque section (px CSS) + capture pleine page, pour comparer a la reference.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const [,, file, vw, out] = process.argv;
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:+vw,height:900},deviceScaleFactor:1});
  await p.goto('file://'+__dirname+'/'+file,{waitUntil:'networkidle'}).catch(()=>{});
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
  const secs=await p.evaluate(()=>[...document.querySelectorAll('.shopify-section')].map(s=>{const r=s.getBoundingClientRect();return [s.id.replace('shopify-section-',''),Math.round(r.top+scrollY),Math.round(r.height)]}));
  console.log(JSON.stringify(secs));
  await p.screenshot({path:out,fullPage:true}); await b.close();
})();
