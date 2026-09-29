// Trouve la taille de police (px CSS) qui reproduit une largeur de texte mesuree sur la reference.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const jobs=JSON.parse(process.argv[2]);   // [{txt, weight, target, style?, family?}]
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+__dirname+'/fonts-size.html');await p.evaluate(()=>document.fonts.ready);
for(const f of ['400','600','700']) await p.evaluate(w=>document.fonts.load(w+' 20px "Source Sans 3"'),f);
await p.evaluate(()=>document.fonts.load('italic 400 20px "Source Sans 3"'));
const out=await p.evaluate((jobs)=>jobs.map(j=>{
  const c=document.createElement('canvas').getContext('2d'); const fam=j.family||'Source Sans 3'; const ls=j.ls||0;
  const w=s=>{c.font=(j.style||'normal')+' '+j.weight+' '+s+'px "'+fam+'"'; return c.measureText(j.txt).width + ls*s*j.txt.length};
  let s=8; while(w(s)<j.target && s<80) s+=0.05; return {txt:j.txt.slice(0,34), weight:j.weight, size:+s.toFixed(1)};
}),jobs);
console.log(JSON.stringify(out,null,1));await b.close();})();
