// Customer calls, slow RTU telemetry and the Christmas Day flood. Run python3 src/build.py first.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(c,msg)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+msg);};
const mk=h=>new JSDOM(h||html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
async function start(scn,h){const d=mk(h),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}return{doc,w,G,S:G.S};}
const until=(G,f,max=600)=>{for(let i=0;i<max&&!f();i++)G.run(1);return f();};
const cls=(doc,id)=>doc.getElementById(id).getAttribute('class')||'';
const click=(doc,el)=>el.dispatchEvent(new doc.defaultView.MouseEvent('click',{bubbles:true}));
(async()=>{
 // 1. A slow RTU: callers ring before the alarm, a hint gives the half, polling brings the trip through
 {const {doc,G,S}=await start('storm');S.sched.length=0;S.callQ.length=0;G.run(2);
  S.rngC=()=>0;// every roll says yes: hint call and slow RTU
  const m0=S.t;S.sched.push({k:'lv:hw1',m:S.t,dur:80,sec:1,tr:false,cause:'Tree branch blown onto the line',done:false});G.run(1);
  ok(!!S.tele.hw1,'trip on Kings Hill held back by a slow RTU');
  ok(!S.lf.hw[1],'breaker really is open');
  ok(!/\bopen\b/.test(cls(doc,'lfb_hw1')),'diagram still shows the breaker closed ('+cls(doc,'lfb_hw1')+')');
  ok(!Object.values(S.alarms).some(a=>a.sel==='lf:hw1'),'no trip alarm yet');
  G.run(8);
  ok(S.calls.length>0&&S.calls.every(c=>c.p==='hw'&&c.i===1),'calls from Kings Hill customers: '+S.calls.length);
  const hint=S.calls.find(c=>c.kind==='hint');ok(!!hint&&hint.sx===1,'a hint call came from the faulted second half');
  ok(!!S.calls.find(c=>c.kind==='prio'),'Kings Hill Hospital rang (priority call)');
  ok(doc.querySelectorAll('#callBody .call').length>0&&!!doc.querySelector('#callBody [data-poll="hw"]'),'call panel shows calls with a poll button');
  ok(S.loss.some(e=>e.r==='lvcall'),'debrief records the unreported trip');
  const f=S.lff.hw[1];ok(!f.found,'fault not found yet');
  click(doc,doc.querySelector('#callBody [data-poll="hw"]'));G.run(2);
  ok(!S.tele.hw1,'polling the RTU brings the trip through');
  ok(Object.values(S.alarms).some(a=>a.sel==='lf:hw1'&&a.ev==='trip'),'trip alarm now on the list');
  ok(/\bopen\b/.test(cls(doc,'lfb_hw1')),'diagram now shows the breaker open');
  ok(S.log.some(l=>/before the alarm came through/.test(l.text)),'log says how late the alarm was');
  // the patrol starts from the alarm, not the fault
  const seen=f.seen;ok(seen>m0,'patrol clock starts at '+seen+', not '+m0);
  // act on the hint: open the mid-point switch, close the breaker, the first half holds
  G.op('mid:hw1','open');until(G,()=>!S.mid.hw[1],120);G.op('lf:hw1','close');G.run(3);
  ok(S.lff.hw[1]&&S.lff.hw[1].found&&S.lff.hw[1].sec===1&&S.lf.hw[1],'fault located in the second half and the first half is back on');
  ok(S.trial===0,'no trial close onto the fault needed');
  // calls from a restored half show as back on
  until(G,()=>!S.lff.hw[1],200);G.op('mid:hw1','close');until(G,()=>S.mid.hw[1],120);G.run(2);
  ok(doc.querySelectorAll('#callBody .call.done').length>0&&!doc.querySelector('#callBody [data-poll]'),'calls marked back on once restored');
 }
 // 2. A normal 11 kV fault: alarm straight away, no telemetry delay
 {const {G,S}=await start('storm');S.sched.length=0;G.run(2);S.rngC=()=>.99;
  S.sched.push({k:'lv:js1',m:S.t,dur:80,sec:0,tr:false,cause:'Cable joint failure',done:false});G.run(1);
  ok(!S.tele.js1&&Object.values(S.alarms).some(a=>a.sel==='lf:js1'),'ordinary fault alarms at once');
  G.run(10);ok(S.calls.length>0&&!S.calls.some(c=>c.kind==='hint'),'plain calls, no hint this time');
  // polling with nothing outstanding says so
  G.S.polls.push({p:'js',at:S.t});G.run(1);ok(S.log.some(l=>/RTU at Joule Street: nothing new/.test(l.text)),'empty poll reports nothing new');
 }
 // 3. Operating on a feeder with an unreported trip reveals it
 {const {G,S}=await start('storm');S.sched.length=0;G.run(2);S.rngC=()=>0;
  S.sched.push({k:'lv:rv1',m:S.t,dur:80,sec:0,tr:false,cause:'Cable joint failure',done:false});G.run(1);ok(!!S.tele.rv1,'held back');
  G.op('lf:rv1','open');G.run(2);ok(!S.tele.rv1&&S.log.some(l=>/was already open/.test(l.text)),'operating on it reveals the trip');}
 // 4. The RTU catches up on its own
 {const {G,S}=await start('storm');S.sched.length=0;G.run(2);S.rngC=()=>0;
  S.sched.push({k:'lv:ml0',m:S.t,dur:80,sec:1,tr:false,cause:'Cable joint failure',done:false});G.run(1);const u=S.tele.ml0.until;
  until(G,()=>!S.tele.ml0,40);ok(!S.tele.ml0&&S.t-1<=u+1,'RTU catches up by itself at '+u);}
 // 5. The easy shift never hides a trip
 {let hid=0;for(let r=0;r<3;r++){const {G,S}=await start('quiet');S.rngC=()=>0;G.run(700);hid+=S.log.filter(l=>/before the alarm came through/.test(l.text)).length;}ok(hid===0,'quiet shift: no delayed alarms');}

 // 6. Christmas Day, doing nothing: the flood trips the live switchgear
 {const {doc,G,S}=await start('xmas');S.sched.length=0;
  ok(S.crews.length===1,'one crew');ok(!!S.flood&&S.flood.p==='rv','flood at Ohm No');
  ok(doc.getElementById('flood').hasAttribute('hidden'),'gauge hidden before the warning');
  until(G,()=>S.flood.warned);G.run(1);ok(!doc.getElementById('flood').hasAttribute('hidden'),'gauge shown after the warning');
  const y0=+doc.getElementById('flood_w').getAttribute('height');G.run(60);const y1=+doc.getElementById('flood_w').getAttribute('height');ok(y1>y0,'water rises on the gauge '+y0+' -> '+y1);
  until(G,()=>S.flood.arrived);
  ok(S.flood.live===true&&S.incidents===1,'flood reached live switchgear: incident');
  ok(!S.pt.rv.closed&&S.lf.rv.every(v=>!v)&&S.pt.rv.fault&&S.pt.rv.fault.flood,'transformer and feeder breakers tripped');
  ok(S.loss.some(e=>e.r==='flood'),'debrief has the flood');
  G.op('pt:rv','close');G.run(2);ok(S.incidents===2&&!S.pt.rv.closed,'closing onto the flooded switchgear is an incident');
  until(G,()=>S.pt.rv.fault.ready,800);ok(S.log.some(l=>/dried and tested/.test(l.text)),'switchgear back after drying out');
  G.op('pt:rv','close');G.run(2);ok(S.pt.rv.closed&&S.pt.rv.fault===null,'transformer back in');
 }
 // 7. Christmas Day done properly: move Ohm No away and make the switchboard dead
 {const {G,S}=await start('xmas');S.sched.length=0;until(G,()=>S.flood.warned);
  const ci0=S.cust.ci;
  G.op('lk:mr','close');until(G,()=>S.lk.mr,200);G.op('lf:rv0','open');G.run(2);// Ohm Street over the link to Shocking Place, make before break
  G.op('lf:rv1','open');G.run(2);G.op('nop:rv1','close');until(G,()=>S.nop.rv[1],200);
  G.op('lf:rv2','open');G.run(2);G.op('nop:rv2','close');until(G,()=>S.nop.rv[2],200);
  G.op('pt:rv','open');G.run(2);
  ok(S.t<S.flood.at,'all done by '+S.t+', before the water at '+S.flood.at);
  ok([0,1,2].every(i=>[0,1].every(s=>G.S.lf.rv[i]===false)),'Ohm No feeder breakers open');
  until(G,()=>S.flood.arrived);
  ok(S.flood.live===false&&S.incidents===0,'water reached dead switchgear: no incident');
  ok(!S.loss.some(e=>e.r==='flood'),'no flood loss');
  {const sec=G.S;ok([0,1,2].every(i=>[0,1].every(x=>S.cust.off['rv'+i+'s'+x]?false:true)),'Ohm No customers still on supply '+JSON.stringify(Object.fromEntries(Object.entries(S.cust.off).filter(([k,v])=>k.startsWith('rv')&&v))));}
  until(G,()=>S.ended,1400);ok(S.ended,'shift finishes');
 }
 // 8. Generation game has no calls panel
 {const gh=fs.readFileSync(path.join(__dirname,'..','..','build','generation.html'),'utf8');const d=mk(gh);await wait(30);ok(!d.window.document.getElementById('pCalls'),'generation game: no calls panel');}
 ok(!errs.length,'no script errors '+errs.slice(0,4).join(' | '));
 console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);})();
