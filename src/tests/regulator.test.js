// The regulator's report card, Ofwatt's weekly letter in a career, and rare events.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
const ALL=['quiet','grid','storm','heat','jan','ev','snow','xmas','morning','gsp','mesh','comms','busbar','endure','black'];
function mk(store){return new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);
  Object.entries(store||{}).forEach(([k,v])=>w.localStorage.setItem(k,v));}});}
async function start(scn){const d=mk(),doc=d.window.document;await wait(30);doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
  const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();const G=d.window.__fc;G.S.sched.length=0;G.run(2);return{w:d.window,doc,G,S:G.S};}
const until=(G,f,n=300)=>{for(let i=0;i<n&&!f();i++)G.run(1);return f();};
(async()=>{
 // report card: long interruptions counted after 3 hours, shown at the end of the shift
 {const {doc,G,S}=await start('grid');G.op('lf:hw2','open');G.run(200);
  ok((S.cust.long||0)>0,`customers off for over 3 hours count as long interruptions (${S.cust.long})`);
  let t=0;while(!S.ended&&t++<2000)G.run(5);
  const r=S.reg,card=doc.querySelector('.reg');ok(!!r&&!!card&&/Regulator's report card/.test(card.textContent),'the end of the shift shows the regulator\'s report card');
  ok(r.lg>0&&r.pLg<0&&r.tot===r.pCi+r.pCml+r.pLg+r.pInc,`incentives add up (${JSON.stringify(r)})`);}
 // a career's fifth shift brings Ofwatt's letter on the week
 {const full={stars:Object.fromEntries(ALL.map(k=>[k,2])),ach:{first:1},best:{},run:{at:'jan',from:'quiet',stars:{},t:Date.now()}};
  const d=mk({'fc4-career':JSON.stringify(full),'fc4-mode':'career'}),w=d.window,doc=w.document;await wait(40);
  // play shift 5 (Cold Thursday) in the career
  const b=doc.querySelector('.hero-go');if(b)b.click();await wait(20);const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();
  const G=w.__fc,S=G.S;ok(S.key==='jan'&&S.mode==='career','career shift 5 (Cold Thursday) started');S.sched.length=0;G.run(5);S.t=1438;let t=0;while(!S.ended&&t++<50)G.run(1);await wait(50);
  const L=doc.getElementById('letter');ok(L&&!L.hidden&&/Ofwatt/.test(L.textContent)&&/week 1/i.test(L.textContent),'Ofwatt\'s letter on week 1 opens after shift 5');
  ok(/not yet reported/.test(L.textContent)&&/Heatwave/.test(L.textContent)&&/Cold Thursday/.test(L.textContent),'shifts played before the report card existed show as not yet reported');
  L.querySelector('[data-letter-ok]').click();ok(L.hidden&&!!doc.querySelector('[data-regletter]'),'closing it returns to the results, with a button to read it again');
  const c=JSON.parse(w.localStorage.getItem('fc4-career'));ok(c.reg&&c.reg.jan&&typeof c.reg.jan.tot==='number','the shift\'s report is kept in the career');}
 // rare events, switched on
 {const {G,S}=await start('storm');G.rare(true);S.rngE=()=>0;// always happens
  G.op('lf:hw2','open');G.run(2);ok(S.lf.hw[2]&&S.log.some(l=>/failed to open/.test(l.text)),'a breaker can fail to operate: still closed, try again');
  G.op('lf:hw2','open');G.run(2);ok(S.lf.hw[2],'second failure allowed');G.op('lf:hw2','open');G.run(2);ok(!S.lf.hw[2],'at most two failures a shift: the third attempt works');
  G.op('mid:ml1','open');G.run(1);const c=S.crews.find(x=>x.job&&x.job.k==='mid:ml1');ok(c&&S.log.some(l=>/held up by/.test(l.text)),'a crew can be held up on the way');}
 {const {doc,G,S}=await start('storm');G.rare(true);S.falseAl={m:S.t+1,done:false};S.rngE=()=>0;G.run(3);
  const a=Object.values(S.alarms).find(x=>x.fake);ok(a&&a.ev==='trip'&&S.lf[a.sel.split(':')[1].slice(0,2)][+a.sel.split(':')[1].slice(2)],'false trip alarm: the alarm shows a trip but the breaker is still closed');
  doc.querySelector(`[data-al="${a.id}"]`).click();await wait(150);const pb=doc.querySelector(`[data-fakepoll="${a.id}"]`);ok(!!pb,'the alarm offers Poll the RTU');
  pb.click();ok(!S.alarms[a.id]&&S.log.some(l=>/false indication/.test(l.text)),'polling shows it was a false indication and clears the alarm');}
 {const {G,S}=await start('quiet');G.rare(true);S.rngE=()=>0;G.op('lf:hw2','open');G.run(2);ok(!S.lf.hw[2],'no rare events on the Quiet shift');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
