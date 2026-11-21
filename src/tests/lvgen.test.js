// A fault in the second half of an 11 kV feeder: a mobile generator connects to the LV there and restores those
// customers before the repair is done, without tripping on the fault.
const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)fails++;};
function mk(){return new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});}
async function start(scn){const d=mk(),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}return{w,doc,G,S:G.S};}
(async()=>{
 {const {G,S}=await start('quiet');S.sched.length=0;G.run(3);const t0=S.t;
  S.sched.push({k:'lv:hw0',m:S.t,dur:40,sec:1,tr:false,cause:'Cable joint failure',done:false});G.run(2);
  const f=S.lff.hw[0];ok(f&&f.found&&f.sec===1&&f.until-t0>=120,`11 kV repair takes at least 120 min (${f&&f.until-t0})`);
  G.op('mid:hw0','open');let t=0;while(S.mid.hw[0]&&t++<40)G.run(1);G.op('lf:hw0','close');G.run(2);
  S.mgPick='M';G.op('mg:hw0','close');t=0;const u=()=>S.mgu.find(x=>x.site==='hw0');while(!(u()&&u().conn)&&t++<120)G.run(1);
  ok(u()&&u().conn&&u().lv,`generator connected to the LV after ${t} min`);G.run(2);
  ok(S.lff.hw[0]&&S.lff.hw[0].sec===1,'fault still there while the generator runs');
  ok(u().conn&&S.trial===0,'generator did not trip on the 11 kV fault');
  ok(S.t<S.lff.hw[0].until,`customers back before the repair (${S.lff.hw[0].until-S.t} min to spare)`);
  // repair done: closing the mid-point switch with the generator still on is an incident; disconnecting first is fine
  while(S.lff.hw[0]&&!S.ended)G.run(1);ok(u().conn,'generator keeps supplying after the repair until disconnected');
  G.op('mg:hw0','open');t=0;while(u().conn&&t++<40)G.run(1);ok(!u().conn,'generator disconnected');
  G.op('mid:hw0','close');t=0;while(!S.mid.hw[0]&&t++<40)G.run(1);G.run(1);ok(S.mid.hw[0]&&S.incidents===0,'feeder back together with no incident');}
 // generator sizes: collected from the yard and towed; too small trips, big enough holds; always quicker than the repair
 for(const sz of ['S','L']){const {G,S}=await start('quiet');S.sched.length=0;let t=0;while(S.t<1050&&t++<700)G.run(1);// evening peak
  S.sched.push({k:'lv:hw0',m:S.t,dur:30,sec:1,tr:false,cause:'Cable joint failure',done:false});G.run(2);const F=S.lff.hw[0],rep=F.until;
  if(sz==='S'){const need=+(S.c.demand*S.share.hw*.4*.5).toFixed(1);ok(need>5,'evening peak: far half of Town Centre needs '+need+' MW, more than a small generator');}
  S.mgPick=sz;const t0=S.t;G.op('mg:hw0','close');G.run(1);const c=S.crews.find(x=>x.job&&x.job.k==='mg:hw0');if(sz==='S')ok(c&&c.via&&c.via.x===1150,'crew goes via the yard to collect it');
  t=0;while(!S.log.some(l=>/connected to the LV/.test(l.text))&&t++<150)G.run(1);const dt=S.t-t0;G.run(3);const u=S.mgu.find(x=>x.site==='hw0');
  ok(dt<rep-t0,`${sz==='S'?'small':'large'} generator collected, towed and connected in ${dt} min, before the repair (${rep-t0} min)`);
  ok(sz==='S'?!u.conn&&S.log.some(l=>/tripped on overload/.test(l.text)):u.conn,sz==='S'?'too small: it trips on overload':'large generator holds the load');}
 // a substation transformer fault: generator offered on every feeder, picks up the whole feeder through a closed breaker
 {const {G,S,doc}=await start('grid');S.sched.length=0;G.run(3);S.sched.push({k:'pt:rv',m:S.t,dur:200,cause:'Tap changer fault',done:false});G.run(2);
  doc.querySelector('.hit[data-sel="lf:rv0"]').dispatchEvent(new doc.defaultView.MouseEvent('click',{bubbles:true}));await wait(5);
  ok(doc.querySelectorAll('#qp [data-mgfor="rv0"]').length===3,'transformer fault: Ohm Street pop-up offers a generator');
  S.mgPick='L';G.op('mg:rv0','close');let t=0;const u=()=>S.mgu.find(x=>x.site==='rv0');while(!(u()&&!u().pend)&&t++<150)G.run(1);G.run(3);
  ok(u().conn&&!S.cust.off.rv0s0&&!S.cust.off.rv0s1&&S.cust.off.rv2s0>0,'large generator restores the whole of Ohm Street only');}
 // too small: it trips; swap it for a bigger one, and the small one goes back to the yard. Or just send one back.
 {const {G,S,doc}=await start('quiet');S.sched.length=0;let t=0;while(S.t<1050&&t++<700)G.run(1);
  S.sched.push({k:'lv:hw0',m:S.t,dur:30,sec:1,tr:false,cause:'Cable joint failure',done:false});G.run(2);
  S.mgPick='S';G.op('mg:hw0','close');const small=()=>S.mgu.find(x=>x.sz==='S'&&x.site==='hw0');t=0;while(!S.log.some(l=>/tripped on overload/.test(l.text))&&t++<150)G.run(1);
  ok(small()&&!small().conn,'small generator tripped and is parked at Town Centre');
  doc.querySelector('.hit[data-sel="lf:hw0"]').dispatchEvent(new doc.defaultView.MouseEvent('click',{bubbles:true}));await wait(5);
  const lbl=[...doc.querySelectorAll('#qp button')].map(b=>b.textContent);ok(lbl.some(x=>/Reconnect it/.test(x))&&lbl.some(x=>/Back to yard/.test(x))&&doc.querySelectorAll('#qp [data-mgfor="hw0"]').length===3,'pop-up offers reconnect, back to yard, or a swap: '+lbl.join(' | '));
  doc.querySelector('#qp [data-mgsz="L"][data-mgfor="hw0"]').click();t=0;const big=()=>S.mgu.find(x=>x.sz==='L'&&x.site==='hw0');while(!(big()&&big().conn)&&t++<150)G.run(1);G.run(3);
  ok(big()&&big().conn&&!S.mgu.some(x=>x.sz==='S'&&x.site),'large generator swapped in and holds; the small one is back in the yard');
  G.op('mg:hw0','open');t=0;while(big().conn&&t++<60)G.run(1);ok(!big().conn&&big().site==='hw0','disconnected, parked');
  G.op('mg:hw0','open');t=0;while(S.mgu.some(x=>x.site==='hw0')&&t++<60)G.run(1);ok(!S.mgu.some(x=>x.site),'back to yard: every generator is in the yard again');}
 // a fault in the first half: a generator on the LV at the first-half substations brings those customers back before the repair,
 // alongside the far half coming back from the far end; closing the breaker onto it is a switching incident
 {const {G,S,doc}=await start('quiet');S.sched.length=0;G.run(3);const t0=S.t;
  S.sched.push({k:'lv:hw0',m:S.t,dur:40,sec:0,tr:false,cause:'Cable joint failure',done:false});G.run(2);const f=S.lff.hw[0];
  ok(f&&f.found&&f.sec===0,'first-half fault found');G.op('mid:hw0','open');let t=0;while(S.mid.hw[0]&&t++<40)G.run(1);
  doc.querySelector('.hit[data-sel="lf:hw0"]').dispatchEvent(new doc.defaultView.MouseEvent('click',{bubbles:true}));await wait(5);
  ok(doc.querySelectorAll('#qp [data-mgfor="hw0n"]').length===3&&doc.querySelectorAll('#qp [data-mgfor="hw0"]').length===3,'feeder pop-up offers a generator for each half');
  S.mgPick='L';G.op('mg:hw0n','close');t=0;const u=()=>S.mgu.find(x=>x.site==='hw0n');while(!(u()&&u().conn)&&t++<150)G.run(1);
  ok(u()&&u().conn&&S.t<f.until,`first-half generator connected at ${S.t-t0} min, before the repair (${f.until-t0})`);G.run(2);
  ok(!S.cust.off.hw0s0&&S.cust.off.hw0s1>0,'first half back on from the generator, far half still off');
  ok(!doc.getElementById('mgg_hw0n').hasAttribute('hidden')&&/\bon\b/.test(doc.getElementById('mgg_hw0n').getAttribute('class')),'first-half generator drawn');
  S.mgPick='M';G.op('mg:hw0','close');t=0;const v=()=>S.mgu.find(x=>x.site==='hw0');while(!(v()&&v().conn)&&t++<150)G.run(1);G.run(2);
  ok(v()&&v().conn&&!S.cust.off.hw0s0&&!S.cust.off.hw0s1&&u().conn,'second generator at the far end: whole feeder back on');
  t=0;while(S.lff.hw[0]&&t++<300)G.run(1);const i0=S.incidents;G.op('lf:hw0','close');G.run(3);
  ok(S.incidents===i0+1&&!u().conn,'closing the breaker onto the first-half generator is a switching incident');}
 // a substation transformer fault (no 11 kV fault): the first half can still have a generator on its LV
 {const {G,S,doc}=await start('grid');S.sched.length=0;G.run(3);S.sched.push({k:'pt:hw',m:S.t,dur:300,cause:'Tap changer fault',done:false});G.run(2);
  doc.querySelector('.hit[data-sel="lf:hw0"]').dispatchEvent(new doc.defaultView.MouseEvent('click',{bubbles:true}));await wait(5);
  ok(doc.querySelectorAll('#qp [data-mgfor="hw0n"]').length===3,'transformer fault: Town Centre pop-up offers a first-half generator too');
  G.op('mid:hw0','open');let t=0;while(S.mid.hw[0]&&t++<40)G.run(1);
  S.mgPick='L';G.op('mg:hw0n','close');t=0;const u=()=>S.mgu.find(x=>x.site==='hw0n');while(!(u()&&u().conn)&&t++<150)G.run(1);
  S.mgPick='M';G.op('mg:hw0','close');t=0;const v=()=>S.mgu.find(x=>x.site==='hw0');while(!(v()&&v().conn)&&t++<150)G.run(1);G.run(2);
  ok(u().conn&&v().conn&&!S.cust.off.hw0s0&&!S.cust.off.hw0s1&&S.incidents===0,'one generator on each half: all of Town Centre back on with the transformer still out');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
