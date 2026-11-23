// Gatekeeper: the network summary in the application sheet, the year 3 and 6 lessons, and the Losing Control result.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../../build/gatekeeper.html'),'utf8');
let fails=0,n=0;const ok=(c,m)=>{if(!c){fails++;console.error('FAIL',m);}else console.log('ok',m);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const boot=store=>new JSDOM(html,{runScripts:'dangerously',url:`http://e${++n}.test/`,pretendToBeVisual:true,beforeParse(w){w.__GK_FAST=true;w.HTMLElement.prototype.scrollIntoView=function(){};
  Object.entries(store||{}).forEach(([k,v])=>w.localStorage.setItem(k,v));}}).window;
const hold=G=>{G.S.queue.forEach(a=>a.choice='hold');G.sendOffers();G.runYear();G.startYear();};
(async()=>{
 {const w=boot({'gk-seen':'1','gk-tut':'done'}),d=w.document;await wait(60);const G=w.__gk;
  d.querySelector('.app').click();const sh=d.getElementById('sheet');
  ok(sh.querySelectorAll('.netsum li').length===G.S.prims.length+1,'the sheet lists every substation and the grid supply point');
  ok(sh.querySelector('.netsum li.me'),'its own substation is highlighted');
  const f=sh.querySelector('.off[data-o="firm"] .eff'),fl=sh.querySelector('.off[data-o="flex"] .eff');
  ok(f&&/→/.test(f.textContent),'the firm offer says what it does to headroom: '+(f&&f.textContent));
  ok(!fl||/curtailed/.test(fl.textContent),'a flexible offer says it uses no firm headroom');
  const r=sh.querySelector('.off[data-o="reinf"]:not([disabled]) .eff');ok(!r||/After the upgrade/.test(r.textContent),'reinforcement shows headroom after the upgrade');}
 // year 3 and year 6 lessons
 {const w=boot({'gk-seen':'1','gk-tut':'done'}),d=w.document;await wait(60);const G=w.__gk;G.newCareer(4);hold(G);hold(G);
  d.getElementById('ov').hidden=true;G.render();const c=d.getElementById('coach');
  ok(!c.hidden&&/Gate 2 order/.test(c.textContent),'year 3: the lesson starts after the news card');
  let k=0;while(!c.hidden&&d.getElementById('tOk')&&k<10){d.getElementById('tOk').click();k++;}
  ok(k===4&&c.hidden&&G.S.lessons[3]===1,'four steps, then done for this career');
  G.render();ok(c.hidden,'not shown again');
  for(let i=0;i<3;i++)hold(G);d.getElementById('ov').hidden=true;G.render();
  ok(G.S.year===6&&!c.hidden&&/data centres/i.test(c.textContent),'year 6: demand reform lesson');
  d.getElementById('tSkip').click();ok(c.hidden&&w.localStorage.getItem('gk-lessons')==='off','Turn off tips stops them');}
 // back from Losing Control
 {const res={v:1,at:Date.now(),exportAt:1,year:4,grade:'B',score:23456,lost:false,risk:12,cml:800};
  const w=boot({'gk-seen':'1','gk-tut':'done','gk-result':JSON.stringify(res)}),d=w.document;await wait(60);const G=w.__gk;
  ok(!d.getElementById('toast').hidden&&/year 4 network got a B/.test(d.getElementById('toast').textContent),'a toast on return from Losing Control');
  G.showMenu();ok(/Planned it, ran it/.test(d.getElementById('ovCard').textContent)&&/23,456 points/.test(d.getElementById('ovCard').textContent),'the menu shows the result and the badge');
  const w2=boot({'gk-seen':'1','gk-tut':'done','gk-result':JSON.stringify({...res,lost:true,grade:'Lost'})}),d2=w2.document;await wait(60);w2.__gk.showMenu();
  ok(!/★ Planned it/.test(d2.getElementById('ovCard').textContent)&&/was lost/.test(d2.getElementById('ovCard').textContent),'no badge if Blackout Canyon was lost');}
 console.log(fails?`${fails} FAILED`:'all passed');process.exit(fails?1:0);})();
