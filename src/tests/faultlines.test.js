// Fault Lines practice mode: puzzles are solvable, the expert bot finds and isolates every fault at par,
// tests give the right answers, and the page works through clicks.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const HTML=fs.readFileSync(path.join(__dirname,'..','..','build','fault-lines.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
(async()=>{
 const d=new JSDOM(HTML,{url:'https://e.test/fault-lines/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
 await wait(30);const w=d.window,doc=w.document,G=w.__fl;
 ok(!doc.getElementById('helpOv').hidden,'first visit shows how to play');
 // the expert bot, on many puzzles at every level
 for(const lv of ['easy','medium','hard']){let solved=0,atPar=0,pars=[],N=300;
  for(let k=0;k<N;k++){G.newPuzzle(lv,1000+k);const P=G.P,s=G.st;let n=0,m;while(n++<80&&(m=G.nextMove(s)).declare==null)G.act(m.k,m.act);
   G.declare(m.declare);const r=s.result;if(r.correct&&r.iso&&!r.healthyOff)solved++;if(s.steps===P.par)atPar++;pars.push(P.par);}
  ok(solved===N,`${lv}: expert finds, isolates and restores every fault (${solved}/${N})`);
  ok(atPar===N,`${lv}: expert matches par every time`);
  console.log(`   ${lv} par ${Math.min(...pars)}–${Math.max(...pars)}, mean ${(pars.reduce((a,b)=>a+b,0)/N).toFixed(1)}`);}
 // the switching model
 {G.newPuzzle('medium',77);const P=G.P,s=G.st,f=P.fault;
  ok(s.cb===false&&G.custOff(s)===P.secs.reduce((a,x)=>a+x.cust,0),'starts with the breaker locked out and everyone off');
  const r=G.operate(s,'cb','close');ok(r.trip&&!s.cb&&s.trips===1,'closing the breaker straight back on trips it');
  if(f<P.n-1){G.operate(s,String(f),'open');const r2=G.operate(s,'nop','close');ok(!r2.trip&&!r2.refused&&s.nop,'back-feed beyond the fault holds');}
  G.operate(s,'cb','close');ok(!s.cb,'breaker still trips onto the fault');
  if(f>0){G.operate(s,String(f-1),'open');G.operate(s,'cb','close');ok(s.cb,'with the fault isolated, the breaker holds');}
  const s2=G.st;s2.sw=s2.sw.map(()=>true);s2.cb=true;s2.nop=false;const rp=G.operate(s2,'nop','close');ok(!!rp.refused,'closing the NOP onto a live feeder is refused: it would parallel two primaries');}
 // through the page: tap a switch, open it, tap a section, declare
 {G.newPuzzle('easy',5);const click=sel=>doc.querySelector(sel).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  click('.hit[data-sel="1"]');ok(!doc.getElementById('sheet').hidden&&doc.querySelectorAll('#sheet [data-act]').length===2,'tapping a switch offers Open and Close');
  click('#sheet [data-act="open"]');ok(G.st.sw[1]===false&&G.st.steps===1,'Open works and costs a step');
  click('#hintBtn');ok(G.st.hints===1&&/Hint/.test(doc.getElementById('log').textContent),'hint logged');
  click('.hit[data-sel="s2"]');ok(!!doc.querySelector('#sheet [data-declare="2"]'),'tapping a section offers to declare the fault');
  click('#sheet [data-declare="2"]');ok(!doc.getElementById('endOv').hidden&&/Score/.test(doc.getElementById('endBody').textContent),'declaring ends the puzzle with a score');
  click('#endNext');ok(doc.getElementById('endOv').hidden&&!G.st.ended,'next puzzle starts');}
 // only closing onto the fault shakes the diagram, not the switching after it
 {G.newPuzzle('easy',8);const doc2=doc;G.act('cb','close');ok(!!doc2.querySelector('#diagram .fl-svg.trip'),'closing onto the fault shakes the diagram');
  G.act('nop','close');G.act('0','open');ok(!doc2.querySelector('.trip'),'the switching after it doesn\'t shake it again');}
 // spurs: faults land on them too, and opening the spur switch isolates one
 {let onSpur=0;for(let k=0;k<300;k++){G.newPuzzle('hard',5000+k);if(G.P.fault>=G.P.n)onSpur++;}ok(onSpur>30,`faults land on spurs too (${onSpur}/300 on Hard)`);
  let k=0;do{G.newPuzzle('medium',9000+k++);}while(G.P.fault<G.P.n);const P=G.P,s=G.st,j=P.fault-P.n;
  ok(doc.querySelectorAll('.hit[data-sel^="p"]').length===P.sp.length&&!!doc.querySelector(`.hit[data-sel="s${P.fault}"]`),'spurs and their switches are drawn and tappable');
  G.act('cb','close');ok(!s.cb&&s.trips===1,'spur fault trips the breaker when the feeder is re-energised');
  G.act('p'+j,'open');G.act('cb','close');ok(s.cb&&!G.fedA(s).has(P.fault)&&G.custOff(s)===P.secs[P.fault].cust,'with the spur switch open, everyone but the faulted spur is back on');
  G.declare(P.fault);ok(s.result.correct&&s.result.iso&&s.result.healthyOff===0,'spur fault found and isolated');}
 // the crew drives out to a manual switch before it operates
 {let k=0;do{G.newPuzzle('hard',300+k++);}while(!G.P.sw.some(w=>w.manual));const i=G.P.sw.findIndex(w=>w.manual),s=G.st,c0={...G.crew};
  G.actUI(String(i),'open');ok(G.busy&&s.sw[i],'manual switch: the crew sets off and the switch has not moved yet');
  let n=0;while(G.busy&&n++<100)await wait(40);
  ok(!G.busy&&!s.sw[i]&&s.steps===2&&(G.crew.x!==c0.x||G.crew.y!==c0.y)&&G.crew.at===String(i),'crew arrived, operated it (2 steps), and is standing at the switch');
  ok(!!doc.querySelector('#crew:not(.home)'),'crew drawn on site');}
 // random play never throws
 for(let k=0;k<200;k++){G.newPuzzle(['easy','medium','hard'][k%3],k);const P=G.P;for(let j=0;j<25;j++){const ks=['cb','nop',...P.sw.map((x,i)=>String(i))];G.act(ks[Math.floor(Math.random()*ks.length)],Math.random()<.5?'open':'close');}G.declare(Math.floor(Math.random()*P.n));}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
