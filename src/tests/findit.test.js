// "Find it yourself": an unlocated 11 kV fault in Losing Control opens as a Fault Lines puzzle in a frame over the paused
// shift. Fault Lines builds that feeder with the fault in the right half and posts the result back; a find locates the
// fault straight away, and a quick one shortens the repair.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8'),FL=fs.readFileSync(path.join(__dirname,'..','..','build','fault-lines.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
const base=w=>{w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);};
async function shift(scn){const d=new JSDOM(CR,{url:'https://www.wattsupelectricity.co.uk/control-room/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse:base}),w=d.window,doc=w.document;await wait(30);const G=w.__fc;
  doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
  {const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}const S=G.S;S.sched.length=0;S.events.length=0;G.run(2);return{w,doc,G,S};}
const fault=(S,k,sec)=>{S.rngC=()=>.99;S.sched.push({k,m:S.t,dur:80,sec,tr:false,cause:'Test fault',done:false});};
const post=(w,data)=>w.dispatchEvent(new w.MessageEvent('message',{data,origin:w.location.origin}));
async function puzzle(d,sent){const w=new JSDOM(FL,{url:'https://www.wattsupelectricity.co.uk/fault-lines/?lc='+encodeURIComponent(JSON.stringify(d)),runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){base(w);
  if(sent)Object.defineProperty(w,'parent',{value:{postMessage:(m,o)=>sent.push({m,o})},configurable:true});}}).window;await wait(30);return w;}
(async()=>{
 let d0;
 // Losing Control: the button, the frame, pausing
 {const {w,doc,G,S}=await shift('storm');
  fault(S,'lv:hw1',1);G.run(1);const F=S.lff.hw[1];ok(F&&!F.found,'a permanent fault locks out the feeder, location unknown');
  G.select('lf:hw1',true);const b=doc.querySelector('#qp [data-find="hw1"]');ok(!!b,'the feeder\'s pop-up offers Find it yourself');
  G.select('as:load_hw');ok(!!doc.querySelector('.find-note [data-find="hw1"]'),'so does the substation\'s demand panel');
  const t0=S.t;doc.querySelector('[data-find="hw1"]').click();const fr=doc.getElementById('findFrame');
  ok(S.paused&&fr&&!doc.getElementById('findOv').hidden,'tapping it pauses the shift and opens Fault Lines over it');
  const u=new URL(fr.getAttribute('src'),w.location.href);d0=JSON.parse(u.searchParams.get('lc'));
  ok(u.pathname==='/fault-lines/'&&d0.k==='hw1'&&d0.h===1&&d0.f==='Kings Hill'&&d0.pr==='Hertz House'&&d0.t===F.start&&d0.c>0,`it asks for that feeder, with the fault in the far half (${JSON.stringify(d0)})`);
  post(w,{type:'fl-lc',k:'hw1',t:F.start,done:true,correct:true,quick:true});
  ok(doc.getElementById('findOv').hidden&&!S.paused,'the result closes the puzzle and the shift carries on');
  ok(F.found&&F.sec===1&&F.until<S.t+F.dur&&F.until>=S.t+15,`found: located now, and a quick find shortens the repair (${F.until-S.t} of ${F.dur} min)`);
  const vis=()=>[...doc.querySelectorAll('[data-find="hw1"]')].filter(x=>!x.closest('[hidden]'));ok(!vis().length,'no Find it yourself on the panel once it\'s found');
  G.select('lf:hw1',true);ok(!vis().length,'nor on the feeder\'s pop-up');
  // a wrong answer: patrol carries on
  fault(S,'lv:rv1',0);G.run(1);const F2=S.lff.rv[1];G.select('lf:rv1',true);doc.querySelector('[data-find="rv1"]').click();
  post(w,{type:'fl-lc',k:'rv1',t:F2.start,done:true,correct:false});ok(!F2.found&&/wrong section/.test(doc.body.textContent),'wrong section: still unlocated, and the log says patrol carries on');
  // giving up
  G.select('lf:rv1',true);doc.querySelector('[data-find="rv1"]').click();doc.getElementById('findClose').click();ok(!F2.found&&!S.paused&&doc.getElementById('findOv').hidden,'Back to the shift without finishing changes nothing');
  // a message from somewhere else is ignored
  G.select('lf:rv1',true);doc.querySelector('[data-find="rv1"]').click();w.dispatchEvent(new w.MessageEvent('message',{data:{type:'fl-lc',k:'rv1',t:F2.start,done:true,correct:true},origin:'https://evil.example'}));
  ok(!F2.found&&!doc.getElementById('findOv').hidden,'results from another website are ignored');doc.getElementById('findClose').click();}
 // Fault Lines: the puzzle for that feeder
 {const sent=[],w=await puzzle(d0,sent),G=w.__fl,P=G.P,doc=w.document;const tee=f=>f<P.n?f:P.secs[f].tee;
  ok(G.mode==='lc'&&P.lc&&P.feeder==='Kings Hill'&&P.primary==='Hertz House'&&tee(P.fault)>=3,'opens that feeder with the fault in the far half');
  ok(doc.getElementById('modes').hidden&&!doc.getElementById('lcBar').hidden&&doc.getElementById('helpOv').hidden,'Losing Control banner instead of the mode tabs, and no how-to-play card');
  ok(P.t0===d0.m,'the puzzle clock starts at the shift\'s time');
  ok(Math.abs(P.secs.reduce((a,x)=>a+x.cust,0)-d0.c)<=100,'customer numbers match the feeder');
  ok(P.secs.slice(0,P.n).every(x=>x.oh),'overhead feeder in Losing Control, overhead here');
  let m,n=0;while(n++<80&&(m=G.nextMove(G.st)).declare==null)G.act(m.k,m.act);G.declare(m.declare);
  ok(/Back to the shift/.test(doc.getElementById('endNext').textContent)&&/repair starts now/.test(doc.getElementById('endBody').textContent),'end card explains what happens back in the control room');
  doc.getElementById('endNext').click();const r=sent[0]&&sent[0].m;
  ok(r&&r.type==='fl-lc'&&r.k==='hw1'&&r.t===d0.t&&r.done&&r.correct&&r.quick&&sent[0].o==='https://www.wattsupelectricity.co.uk','sends the result back to Losing Control, to its own site only');
  ok(!w.localStorage.getItem('fl-best')&&!w.localStorage.getItem('fl-streak'),'doesn\'t count towards practice bests or the daily streak');}
 {let near=0,far=0;for(let s=1;s<=60;s++){for(const h of [0,1]){const w=await puzzle({...d0,h,s,oh:false}),P=w.__fl.P,t=P.fault<P.n?P.fault:P.secs[P.fault].tee;
    if(h===0&&t<3)near++;if(h===1&&t>=3)far++;if(s===1&&h===0)ok(P.secs.every(x=>!x.oh),'cable feeder: all cable here');}}
  ok(near===60&&far===60,'the fault is always in the half Losing Control chose');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
