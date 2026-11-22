// Switching schedules and permits to work (control room).
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
async function start(scn){const d=new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
  await wait(30);const doc=d.window.document;doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
  const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();const G=d.window.__fc;G.S.sched.length=0;G.run(2);return{w:d.window,doc,G,S:G.S};}
const until=(G,f,n=200)=>{for(let i=0;i<n&&!f();i++)G.run(1);return f();};
(async()=>{
 // a schedule runs its steps in order, crews and all, and skips a step that's already done
 {const {doc,G,S}=await start('storm');
  doc.getElementById('planBtn').click();ok(S.plan.draft&&!doc.getElementById('planBox').hidden,'Schedule opens planning mode and the schedule panel');
  G.select('lf:hw2',true);const add=doc.querySelector('#qp [data-plan="lf:hw2|open"]');ok(!!add&&!doc.querySelector('#qp [data-op]'),'in planning mode the pop-up adds steps instead of operating');
  add.click();ok(S.plan.steps.length===1&&S.lf.hw[2],'tapping Open adds a step and operates nothing');
  G.plan.add('nop:hw2','close');G.plan.add('mid:hw2','close');ok(S.plan.steps.length===3,'three steps planned');
  G.plan.issue();ok(S.plan.on&&!S.plan.draft,'issued: running');
  until(G,()=>!S.plan.on,120);
  ok(!S.lf.hw[2]&&S.nop.hw[2]&&S.plan.steps.map(x=>x.st).join()==='done,done,skip','breaker opened, Volt Face backfeed closed by a crew, mid-point already closed so skipped');
  ok(S.sup.hw!=='off'&&S.log.some(l=>/Switching schedule complete/.test(l.text)),'schedule complete, logged');}
 // a step that causes a switching incident stops the schedule there
 {const {G,S}=await start('storm');G.plan.toggle();G.plan.add('nop:ml1','close');G.plan.add('lf:ml1','open');G.plan.issue();
  until(G,()=>!S.plan.on,120);
  ok(S.incidents===1&&S.plan.steps[0].st==='fail'&&S.plan.steps[1].st==='wait'&&S.lf.ml[1],'closing the backfeed with the breaker still closed is an incident: the schedule stops and step 2 never runs');}
 // permits to work
 {const {doc,G,S}=await start('storm');S.rngC=()=>0.99;
  S.sched.push({k:'lv:js0',m:S.t,dur:90,sec:0,tr:false,cause:'Cable joint failure',done:false});G.run(1);const F=S.lff.js[0];
  G.op('mid:js0','open');until(G,()=>!S.mid.js[0],120);G.op('lf:js0','close');G.run(2);
  ok(F.found&&F.sec===0&&F.until==null,'located in the first half: the repair waits for a permit');
  G.select('lf:js0',true);ok(/Issue permit to work/.test(doc.getElementById('qp').textContent),'the feeder pop-up offers Issue permit to work once it is isolated');
  G.op('mid:js0','close');until(G,()=>S.mid.js[0],120);G.ptw.issue('js',0);G.run(1);
  ok(!S.crews.some(c=>c.job&&c.job.k==='ptw:js0')&&/isn't isolated/.test(doc.getElementById('bannerMsg').textContent),'not isolated: the permit is refused and says what to open');
  G.op('mid:js0','open');until(G,()=>!S.mid.js[0],120);G.ptw.issue('js',0);until(G,()=>F.ptw==='issued',60);
  ok(F.ptw==='issued'&&F.until>S.t,'isolated: a crew applies earths, the permit is issued and the repair starts');
  const inc=S.incidents;G.plan.toggle();G.plan.add('mid:js0','close');G.plan.issue();G.run(3);
  ok(!S.plan.on&&S.plan.steps[0].st==='fail'&&!S.mid.js[0]&&S.incidents===inc,'a schedule step closing a locked-off switch stops the schedule, nothing operates');
  until(G,()=>F.ptw==='done',200);ok(F.ptw==='done'&&!!S.lff.js[0],'repaired: earths stay on until the permit is cancelled');
  G.select('lf:js0',true);doc.querySelector('#qp [data-ptw="cancel:js0"]').click();until(G,()=>!S.lff.js[0],60);
  ok(!S.lff.js[0],'Cancel permit to work: the crew removes the earths and hands the section back');
  G.op('mid:js0','close');until(G,()=>S.mid.js[0],120);G.op('lf:js0','close');G.run(2);ok(S.lf.js[0]&&S.cust.off.js0s0===0&&S.cust.off.js0s1===0,'feeder back to normal');}
 // easy shifts keep the old behaviour: no permits
 {const {G,S}=await start('quiet');S.sched.push({k:'lv:hw0',m:S.t,dur:40,sec:1,tr:false,cause:'x',done:false});G.run(2);ok(S.lff.hw[0].until!=null,'quiet shift: the repair starts by itself, no permit');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
