const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for (const w of [1440,1024,390]) { const p=await b.newPage({viewport:{width:w,height:900}});
 await p.goto('file://'+__dirname+'/out-promo.html'); await p.waitForTimeout(500);
 const el=await p.$('.sf-promo'); await el.screenshot({path:`promo${w}.png`});
 console.log(w, JSON.stringify(await p.evaluate(()=>{const e=document.querySelector('.sf-promo').getBoundingClientRect(); const m=document.querySelector('.sf-promo__media').getBoundingClientRect(); return {h:Math.round(e.height), mediaW:Math.round(m.width), hscroll:document.documentElement.scrollWidth>innerWidth}}))); }
await b.close();})();
