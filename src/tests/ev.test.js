// EV evening shift, the shift debrief and the domain lock (control room).
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
const pub=fs.readFileSync(path.join(__dirname,'..','..','control-room','index.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)fails++;};
function mk(src,url,store){return new JSDOM(src,{url,runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);
  if(store)Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,v));}});}
async function start(scn,md,store){const d=mk(html,'https://e.test/',store),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector(`[data-mode="${md||'free'}"]`).click();const b=doc.querySelector(`[data-scn="${scn}"]`);if(b&&!b.disabled)b.click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}return{w,doc,G,S:G.S};}
(async()=>{
 // EV evening: a 12-hour shift, 10:00 to 22:00, with a late surge the look-ahead under-reads
 {const {doc,G,S}=await start('ev');ok(S.key==='ev'&&S.t===600,'EV evening starts at 10:00');
  ok(doc.querySelector('[data-scn="ev"]')&&/EV evening/.test(doc.querySelector('[data-scn="ev"]').textContent),'listed in free play');
  const f1630=G.comps(990,true).demand,a1630=G.comps(990,false).demand;
  ok(Math.abs(a1630-f1630)<6,`no surge before 17:00 (forecast ${f1630.toFixed(0)}, actual ${a1630.toFixed(0)})`);
  const f=G.comps(1125,true).demand,a=G.comps(1125,false).demand;
  ok(a-f>=10,`18:45: actual ${a.toFixed(0)} MW well above the look-ahead's ${f.toFixed(0)} MW`);
  ok(S.events.some(e=>e.tx===2&&e.end===1035),'T3 back from maintenance at 17:15');
  ok(/10:00–22:00/.test(doc.getElementById('runTxt').textContent),'run text: '+doc.getElementById('runTxt').textContent);
  let peak=0,pk=0;for(let m=1020;m<=1260;m+=5){const d=G.comps(m,false).demand;if(d>peak){peak=d;pk=m;}}
  ok(peak>155&&peak<185&&pk>=1080,`evening peak ${peak.toFixed(0)} MW at ${Math.floor(pk/60)}:${String(pk%60).padStart(2,'0')}, after the usual 17:30`);
  // a quiet run with the surge: the clock reaches 22:00 and the shift is scored as 720 minutes
  S.sched.length=0;S.events.length=0;S.surgeK=.85;let n=0;while(!S.ended&&n<800){G.run(1);n++;}
  ok(S.ended&&(S.lost||S.final.surv===720),'12-hour shift: '+(S.lost?'lost at '+S.lost.m:S.final.surv+' min'));}
 // other shifts keep their faults and demand: surge only where defined
 {const {G,S}=await start('jan');ok(!S.sc.surge&&Math.abs(G.comps(1125,true).demand-G.comps(1125,false).demand)<6,'Cold Thursday has no surge');}
 // career: EV evening sits after Cold Thursday and doesn't take away unlocks
 {const {doc}=await start('quiet','career',{'fc4-career':JSON.stringify({stars:{quiet:3,grid:3,storm:2,heat:2,jan:1},ach:{},best:{}})});
  const st=k=>doc.querySelector(`[data-scn="${k}"]`);ok(!st('ev').disabled&&!st('snow').disabled,'Cold Thursday star unlocks both EV evening and Snow day');
  ok(/Shift 6/.test(st('ev').textContent),'EV evening is career shift 6');ok(st('gsp').disabled,'Grid emergency still locked');}
 {const {doc}=await start('quiet','career',{'fc4-career':JSON.stringify({stars:{quiet:3,grid:3},ach:{},best:{}})});
  ok(doc.querySelector('[data-scn="ev"]').disabled,'EV evening locked until Cold Thursday is done');}
 // debrief: leave a substation off after a feeder fault, and its cost tops the list
 {const {doc,G,S}=await start('quiet');S.sched.length=0;G.run(3);
  S.sched.push({k:'fd:js',m:S.t,dur:45,cause:'Cable joint failure',done:false});let n=0;while(!S.ended&&n<800){G.run(1);n++;}
  const top=(S.loss||[]).filter(e=>e.r!=='repair'&&e.r!=='ar').sort((a,b)=>b.pts-a.pts);
  ok(top[0]&&top[0].k==='sub:js'&&top[0].r==='sub_fd','biggest loss: Joule Street off after its feeder fault');
  const lost=(S.loss||[]).reduce((a,e)=>a+e.pts,0),ded=-(S.final.parts.ens+S.final.parts.risk+S.final.parts.inc+S.final.parts.trial+S.final.parts.spend+(S.final.parts.prio||0));
  ok(Math.abs(lost-ded)<=6,`debrief adds up to the points lost (${lost.toFixed(0)} vs ${ded})`);
  const db=doc.querySelector('.debrief');ok(db&&/Joule Street off supply/.test(db.textContent)&&/tie or an interconnector/.test(db.textContent),'debrief shows the moment and a tip');
  ok(db.querySelectorAll('li').length>=1&&db.querySelectorAll('li').length<=3,'at most three moments');}
 {const {doc,G,S}=await start('quiet');S.sched.length=0;let n=0;while(!S.ended&&n<800){G.run(1);n++;}
  ok(/Nothing cost you points/.test(doc.querySelector('.debrief').textContent),'clean shift: nothing to fix');}
 // EV evening tips override the general ones
 {const {doc,G,S}=await start('ev');S.sched.length=0;let n=0;while(!S.ended&&n<800){G.run(1);n++;}
  const db=doc.querySelector('.debrief');ok(db&&(S.insecureMin===0||/under-reads the EV surge/.test(db.textContent)),'EV evening at-risk tip mentions the surge ('+S.insecureMin+' min at risk)');}
 // domain lock on the published page
 {const d=mk(pub,'https://copycat.example/games/');await wait(50);const doc=d.window.document;
  ok(doc.querySelector('.sitelock')&&/Play the original at der-dash.github.io/.test(doc.body.textContent)&&!doc.getElementById('startBtn'),'another site gets the "play the original" screen');
  ok(doc.querySelector('a[href="https://der-dash.github.io/Network/control-room/"]'),'links to the original');}
 {const d=mk(pub,'https://der-dash.github.io/Network/control-room/');await wait(50);const doc=d.window.document;
  ok(doc.getElementById('startBtn')&&!doc.querySelector('.sitelock'),'runs normally on der-dash.github.io');}
 for(const u of ['https://www.wattsupelectricity.co.uk/control-room/','https://wattsupelectricity.co.uk/control-room/']){const d=mk(pub,u);await wait(50);const doc=d.window.document;
  ok(doc.getElementById('startBtn')&&!doc.querySelector('.sitelock'),'runs normally on '+new URL(u).hostname);}
 ok(/site:location\.hostname/.test(pub),'scores are sent with the site name');
 ok(!errs.length,'no script errors '+errs.slice(0,3).join(' | '));
 if(fails)console.log(fails+' failed');process.exit(fails?1:0);})();
