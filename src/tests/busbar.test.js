// Busbar fault: protection trips one random 33 kV section at Blackout Canyon (its transformer, bus section breakers
// and feeder breakers). Closing anything onto it before the repair is an incident; afterwards it all goes back.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
async function start(){const d=new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
  await wait(30);const doc=d.window.document;doc.querySelector('[data-mode="free"]').click();doc.querySelector('[data-scn="busbar"]').click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
  const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();const G=d.window.__fc,bb=G.S.sched.find(f=>f.k.startsWith('bb:'));G.S.sched.length=0;return{G,S:G.S,doc,bb};}
const until=(G,f,n=200)=>{for(let i=0;i<n&&!f()&&!G.S.ended;i++)G.run(1);};
(async()=>{
 // every shift has one busbar fault mid-morning, on a section picked at random
 {const secs=new Set();let good=true;for(let j=0;j<8;j++){const {bb}=await start();if(!bb||bb.m<540||bb.m>690||bb.dur<330)good=false;else secs.add(bb.k);}
  ok(good,'each shift has a busbar fault between 09:00 and 11:30 lasting at least 5½ hours');ok(secs.size>=2,'the faulted section varies: '+[...secs].join(', '));}
 // section 1: T1, bus section 1-2 and the Hertz House and Shocking Place feeders trip
 {const {G,S,doc}=await start();G.run(2);S.sched.push({k:'bb:B1',m:S.t,dur:120,cause:'Busbar insulator failure',done:false});G.run(2);
  ok(S.bb&&S.bb.sec==='B1'&&S.tx[0].out&&S.tx[0].out.kind==='bus'&&!S.bs['12'].closed&&S.bs['23'].closed&&!S.fd.hw.brk&&!S.fd.ml.brk&&S.fd.rv.brk,'section 1 fault trips T1, BS 1-2 and both feeders on it');
  ok(S.sup.hw==='off'&&S.sup.ml==='off'&&S.sup.rv==='bc','Hertz House and Shocking Place are off; Ohm No is still on');
  ok(/BUSBAR FAULT/.test(doc.getElementById('bbt_B1').textContent)&&/flt/.test(doc.getElementById('bus_B1').getAttribute('class')),'faulted section is marked on the diagram');
  const u0=S.bb.until;G.op('bc:hw','close');G.run(2);ok(S.incidents===1&&!S.fd.hw.brk&&S.bb.until===u0+30&&S.tx[0].out.until===u0+30,'closing a feeder breaker onto it is an incident and adds 30 minutes');
  G.op('tie:hw','close');until(G,()=>S.tie.hw.closed);G.op('it:mr','close');until(G,()=>S.it.mr.closed);G.run(1);
  ok(S.sup.hw!=='off'&&S.sup.ml!=='off','restored through the Hertz House tie and the Shocking Place–Ohm No interconnector');
  until(G,()=>S.bb.ready,300);ok(S.bb.ready&&S.log.some(l=>/busbar section 1 \(T1\) has been repaired/.test(l.text)),'repair finishes with instructions');
  G.op('tx:0','close');until(G,()=>!S.tx[0].out);G.op('bs:12','close');until(G,()=>S.bs['12'].closed);
  G.op('bc:hw','close');until(G,()=>S.fd.hw.brk);G.op('tie:hw','open');until(G,()=>!S.tie.hw.closed);
  G.op('bc:ml','close');until(G,()=>S.fd.ml.brk);G.op('it:mr','open');until(G,()=>!S.it.mr.closed);G.run(2);
  ok(['hw','ml','rv','js'].every(p=>S.sup[p]==='bc')&&S.incidents===1&&doc.getElementById('bbt_B1').textContent==='','back to normal running with no further incidents');}
 // section 2: no customers off, but T2 is out and the busbar is split
 {const {G,S}=await start();G.run(2);S.sched.push({k:'bb:B2',m:S.t,dur:120,cause:'Busbar insulator failure',done:false});G.run(2);
  ok(S.tx[1].out&&!S.bs['12'].closed&&!S.bs['23'].closed&&['hw','ml','rv','js'].every(p=>S.sup[p]==='bc'),'section 2 fault: T2 out and both bus sections open, nobody off');
  G.op('bs:23','close');G.run(2);ok(S.incidents===1&&!S.bs['23'].closed,'closing a bus section breaker onto it is an incident');
  G.op('tx:1','close');G.run(2);ok(S.incidents===2&&!!S.tx[1].out,'closing T2 onto it is an incident');}
 // section 3: Ohm No and Joule Street
 {const {G,S}=await start();G.run(2);S.sched.push({k:'bb:B3',m:S.t,dur:120,cause:'Busbar insulator failure',done:false});G.run(2);
  ok(S.tx[2].out&&!S.bs['23'].closed&&S.bs['12'].closed&&!S.fd.rv.brk&&!S.fd.js.brk&&S.sup.rv==='off'&&S.sup.js==='off'&&S.sup.hw==='bc','section 3 fault: T3, BS 2-3, Ohm No and Joule Street out');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
