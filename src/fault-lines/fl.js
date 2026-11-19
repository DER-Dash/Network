'use strict';
/* Fault Lines (Watts Up): an 11 kV feeder has tripped and locked out. Find the faulted section with as few
   switching operations as possible, isolate it and restore everyone else. Practice mode: random puzzles.

   The feeder: breaker CB at the primary, main sections 0..n-1, switch i between main section i and i+1, and a
   normally open point (NOP) at the far end to a neighbouring feeder that is always live. Spurs are teed off
   main sections through their own spur switch: spur j is section n+j, its switch is device 'p'+j.
   Devices are named 'cb', 'nop', '0'..'n-2' (main switches) and 'p0'.. (spur switches). */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Math.round(n).toLocaleString('en-GB');
const fmtT=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
function rngFrom(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem('fl-'+k);localStorage.setItem('fl-'+k,v);}catch(e){return null;}};

const LEVELS={
  easy:{name:'Easy',n:5,spurs:1,manualP:0,spurManualP:0,nopManual:false,fpiP:1,fpiFail:0,dist:.2,bangP:.9,herring:0,showCand:true},
  medium:{name:'Medium',n:7,spurs:2,manualP:.35,spurManualP:.7,nopManual:true,fpiP:.6,fpiFail:.2,dist:.35,bangP:.7,herring:0,showCand:false},
  hard:{name:'Hard',n:9,spurs:3,manualP:.5,spurManualP:.85,nopManual:true,fpiP:.4,fpiFail:.3,dist:null,bangP:.6,herring:.6,showCand:false}};
const STREETS=['Mill Lane','Station Road','Church Street','Orchard Close','Ferry Lane','Kiln Way','Brook Street','Copper Row','Volt Avenue','Spark Street','Coil Close','Pylon Road','Ohm Grove','Fuse Lane','Amp Terrace','Relay Road','Meadow View','Quarry Hill','Hawthorn Drive','Beacon Rise','Canal Side','Market Place','Willow Bank','Foundry Street','Furnace Farm','Dynamo Lane','Ridge Farm'];
const PRIMARIES=['Kings Hill','Hertz House','Ohm No','Shocking Place','Joule Street'],NEIGHBOURS=['Bramble Lane','Ampere Avenue','Capacitor Close','Dynamo Drive'];
const FEEDERS=['Town Centre','Riverside','Business Park','Hill Top','Old Village','Ring Road'];
const BANG_OH=['"There was a flash and a bang on the wires across the field, then everything went off."','"A branch came down on the overhead line by the farm gate."','"Heard a crack from the pole outside, and the lights went."'];
const BANG_UG=['"Workmen were digging up the pavement, there was a bang and the power went."','"There\'s a smell of burning coming from the road works."','"A loud thump from under the road, then everything went off."'];
const PLAIN=['"Is there a power cut? Everything\'s gone off."','"The lights flickered a couple of times, then went off."','"No power here. How long will it be?"','"We\'ve lost everything, is it just us?"'];
const HERRING=['"Heard a loud bang about the time it went off. Might have been fireworks though."','"Something went bang down the road, could have been a car backfiring."'];
const REMOTE_MIN=2,MANUAL_MIN=15;

let P=null,st=null,sel=null,crew=null,busy=false;

/* ---------- Puzzle ---------- */
function makePuzzle(level,seed){
  const L=LEVELS[level],r=rngFrom(seed),pick=a=>a[Math.floor(r()*a.length)],n=L.n;
  const names=STREETS.slice();for(let i=names.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  const secs=[];let km=0;
  for(let i=0;i<n;i++){const len=Math.round((.4+r()*1.1)*10)/10;secs.push({name:names[i],cust:10*Math.round(4+r()*36),oh:r()<.5,km:len,from:Math.round(km*10)/10});km+=len;}
  const sw=[];for(let i=0;i<n-1;i++){const fpi=r()<L.fpiP;sw.push({manual:r()<L.manualP,fpi,fail:fpi&&r()<L.fpiFail});}
  // spurs: teed off different main sections, mostly overhead with a pole-mounted switch
  const tees=[...Array(n).keys()];for(let i=tees.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[tees[i],tees[j]]=[tees[j],tees[i]];}
  const sp=[];tees.slice(0,L.spurs).sort((a,b)=>a-b).forEach((t,j)=>{const T=secs[t],len=Math.round((.3+r()*.9)*10)/10,fpi=r()<L.fpiP;
    secs.push({name:names[n+j],cust:10*Math.round(2+r()*16),oh:r()<.75,km:len,from:Math.round((T.from+T.km/2)*10)/10,tee:t,spur:j});
    sp.push({tee:t,manual:r()<L.spurManualP,fpi,fail:fpi&&r()<L.fpiFail});});
  const N=secs.length,fault=Math.floor(r()*N),F=secs[fault];
  const cause=F.oh?pick(['Tree branch on the overhead line','Insulator flashover','Conductor clash in high wind','Bird strike on the overhead line']):pick(['Cable joint failure','Digger strike on the underground cable','Water ingress in a cable joint']);
  let dist=null;if(L.dist){const mid=F.from+F.km/2,e=L.dist*(.6+r()*.8);const lo=Math.max(0,mid-mid*e-.1*r()),hi=mid+mid*e+.1*r();dist={lo:Math.round(lo*10)/10,hi:Math.round(hi*10)/10};}
  const calls=[],t0=600+Math.floor(r()*600);
  if(r()<L.bangP)calls.push({sec:fault,txt:pick(F.oh?BANG_OH:BANG_UG)});
  if(r()<L.herring){let h=Math.floor(r()*N);if(h===fault)h=(h+1+Math.floor(r()*(N-1)))%N;calls.push({sec:h,txt:pick(HERRING)});}
  while(calls.length<(level==='easy'?3:4)){calls.push({sec:Math.floor(r()*N),txt:pick(PLAIN)});}
  for(let i=calls.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[calls[i],calls[j]]=[calls[j],calls[i]];}
  calls.forEach((c,i)=>c.m=t0+2+i*2+Math.floor(r()*2));
  const anyOh=secs.slice(0,n).some(s=>s.oh);
  return{level,seed,n,N,secs,sw,sp,nopManual:L.nopManual,fault,cause,dist,calls,t0,
    primary:pick(PRIMARIES),feeder:pick(FEEDERS),neighbour:pick(NEIGHBOURS),
    prot:F.oh?'Earth fault protection operated. The breaker auto-reclosed once onto the fault, tripped again and locked out.':anyOh?'Overcurrent protection operated. The breaker auto-reclosed once onto the fault, tripped again and locked out.':'Overcurrent protection operated. Underground cable, so no auto-reclose: the breaker locked out straight away.'};}

/* ---------- Switching model ---------- */
const newState=()=>({cb:false,sw:P.sw.map(()=>true),sp:P.sp.map(()=>true),nop:false,steps:0,mins:0,cml:0,trips:0,nbTrips:0,hints:0,obs:[],log:[],ended:false,result:null});
const teeOf=f=>f<P.n?f:P.secs[f].tee,spurIds=()=>P.sp.map((x,j)=>P.n+j);
function addSpurs(s,set){P.sp.forEach((x,j)=>{if(s.sp[j]&&set.has(x.tee))set.add(P.n+j);});return set;}
function fedA(s){const A=new Set();if(s.cb)for(let k=0;k<P.n;k++){A.add(k);if(k===P.n-1||!s.sw[k])break;}return addSpurs(s,A);}
function fedB(s){const B=new Set();if(s.nop)for(let k=P.n-1;k>=0;k--){B.add(k);if(k===0||!s.sw[k-1])break;}return addSpurs(s,B);}
const custOff=s=>{const A=fedA(s),B=fedB(s);return P.secs.reduce((a,x,i)=>a+(A.has(i)||B.has(i)?0:x.cust),0);};
const secName=f=>P.secs[f].name+(f>=P.n?' spur':'');
const devName=k=>k==='cb'?`${P.primary} breaker`:k==='nop'?`normally open point to ${P.neighbour}`:k[0]==='p'?`spur switch to ${P.secs[P.n+ +k.slice(1)].name}`:`switch between ${P.secs[+k].name} and ${P.secs[+k+1].name}`;
const isManual=k=>k==='cb'?false:k==='nop'?P.nopManual:k[0]==='p'?P.sp[+k.slice(1)].manual:P.sw[+k].manual;
const isClosed=(s,k)=>k==='cb'?s.cb:k==='nop'?s.nop:k[0]==='p'?s.sp[+k.slice(1)]:s.sw[+k];
function setDev(s,k,v){if(k==='cb')s.cb=v;else if(k==='nop')s.nop=v;else if(k[0]==='p')s.sp[+k.slice(1)]=v;else s.sw[+k]=v;}
const nameList=set=>{const a=[...set].sort((x,y)=>teeOf(x)-teeOf(y)||x-y).map(secName);return a.length>5?`${a.length} sections from ${a[0]} to ${a[a.length-1]}`:a.join(', ');};
const cloneSt=s=>({...s,sw:s.sw.slice(),sp:s.sp.slice(),obs:s.obs.slice(),log:[]});

// one switching operation on state s. Returns a short result for the log, or {refused} when it would parallel the feeders.
function operate(s,k,act){
  const close=act==='close';if(isClosed(s,k)===close)return{noop:true};
  if(close){const t=cloneSt(s);setDev(t,k,true);const A=fedA(t),B=fedB(t);if([...A].some(i=>B.has(i)))return{refused:`Closing the ${devName(k)} would parallel this feeder with ${P.neighbour} primary, which is on a different grid supply. Open a switch between them first.`};}
  const man=isManual(k),dt=man?MANUAL_MIN:REMOTE_MIN;s.cml+=custOff(s)*dt;s.mins+=dt;s.steps+=man?2:1;
  const A0=fedA(s),B0=fedB(s);setDev(s,k,close);
  const out={k,act,man,t:P.t0+s.mins};
  if(!close){out.txt=`Opened the ${devName(k)}.`;const off=[...A0,...B0].filter(i=>!fedA(s).has(i)&&!fedB(s).has(i));if(off.length)out.txt+=` ${nameList(new Set(off))} off supply.`;return out;}
  const A=fedA(s),B=fedB(s);
  if(A.size>A0.size){if(A.has(P.fault)){s.cb=false;s.trips++;s.obs.push({reg:[...A],trip:true});out.trip=true;out.txt=`Closed the ${devName(k)}: the ${P.primary} breaker tripped straight away. The fault is somewhere in ${nameList(A)}.`;}
    else{s.obs.push({reg:[...A],trip:false});out.txt=`Closed the ${devName(k)}: it held. ${nameList(A)} on supply.`;}}
  if(B.size>B0.size&&!out.trip){if(B.has(P.fault)){s.nop=false;s.nbTrips++;s.obs.push({reg:[...B],trip:true});out.trip=true;out.nb=true;out.txt=`Closed the ${devName(k)}: the ${P.neighbour} feeder breaker tripped, taking its own customers off too. They've opened the normally open point and put their feeder back. The fault is somewhere in ${nameList(B)}.`;}
    else{s.obs.push({reg:[...B],trip:false});out.txt=(out.txt?out.txt+' ':`Closed the ${devName(k)}: it held. `)+`${nameList(B)} on from ${P.neighbour}.`;}}
  if(!out.txt)out.txt=`Closed the ${devName(k)}. Nothing new is on supply yet.`;
  return out;}

/* ---------- What is known: sections that fit every clue and test ---------- */
const fpiFlag=i=>teeOf(P.fault)>i,spFlag=j=>P.fault===P.n+j;
function candidates(s){const c=[];
  for(let f=0;f<P.N;f++){let ok=true;const t=teeOf(f);
    P.sw.forEach((w,i)=>{if(w.fpi&&!w.fail&&(t>i)!==fpiFlag(i))ok=false;});
    P.sp.forEach((w,j)=>{if(w.fpi&&!w.fail&&(f===P.n+j)!==spFlag(j))ok=false;});
    s.obs.forEach(o=>{if(o.reg.includes(f)!==o.trip)ok=false;});
    if(P.dist){const a=P.secs[f].from,b=a+P.secs[f].km;if(b<P.dist.lo||a>P.dist.hi)ok=false;}
    if(ok)c.push(f);}
  return c.length?c:[...Array(P.N).keys()];}

/* ---------- The expert: the next move, for hints and to set par ---------- */
// a target arrangement as an ordered list of [device, 'open'|'close']: opens first, then closes, the breaker last
function firstOp(s,cfg){for(const[k,a]of cfg)if(a==='open'&&isClosed(s,k))return{k,act:'open'};
  for(const[k,a]of cfg)if(a==='close'&&k!=='cb'&&!isClosed(s,k))return{k,act:'close'};
  for(const[k,a]of cfg)if(a==='close'&&k==='cb'&&!s.cb)return{k,act:'close'};return null;}
const opCost=(s,cfg)=>cfg.reduce((a,[k,v])=>a+((v==='close')!==isClosed(s,k)?(isManual(k)?2:1):0),0);
function restoreCfg(f){const n=P.n,cfg=[];
  if(f>=n){const j=f-n;cfg.push(['p'+j,'open'],['nop','open']);P.sw.forEach((w,i)=>cfg.push([String(i),'close']));P.sp.forEach((w,q)=>{if(q!==j)cfg.push(['p'+q,'close']);});cfg.push(['cb','close']);return cfg;}
  cfg.push(f>0?[String(f-1),'open']:['cb','open']);cfg.push(f<n-1?[String(f),'open']:['nop','open']);
  for(let i=0;i<f-1;i++)cfg.push([String(i),'close']);for(let i=f+1;i<n-1;i++)cfg.push([String(i),'close']);
  P.sp.forEach((w,q)=>{if(w.tee!==f)cfg.push(['p'+q,'close']);});
  if(f<n-1)cfg.push(['nop','close']);if(f>0)cfg.push(['cb','close']);return cfg;}
function nextMove(s){const C=candidates(s),n=P.n,Cs=new Set(C);
  if(C.length===1){const f=C[0],m=firstOp(s,restoreCfg(f));
    if(!m)return{declare:f,why:`Everything else that can be is back on. Tap ${secName(f)} and declare the fault there.`};
    return{...m,why:`The fault must be in ${secName(f)}. `+(m.act==='open'?`Isolate it: open the ${devName(m.k)}.`:`Restore the rest: close the ${devName(m.k)}.`)};}
  // a test: energise the main line up to section i (switch i open), with one possible spur left out, then close the breaker
  let best=null;
  for(let i=0;i<n;i++){const spIn=P.sp.map((w,j)=>j).filter(j=>P.sp[j].tee<=i&&Cs.has(n+j));
    for(const e of [null,...spIn]){const cfg=[['nop','open']];if(i<n-1)cfg.push([String(i),'open']);if(e!=null)cfg.push(['p'+e,'open']);
      for(let j=0;j<i;j++)cfg.push([String(j),'close']);spIn.forEach(j=>{if(j!==e)cfg.push(['p'+j,'close']);});cfg.push(['cb','close']);
      const R=C.filter(f=>f<n?f<=i:(P.secs[f].tee<=i&&f-n!==e)),k=R.length;if(!k||k===C.length)continue;
      const sc=Math.max(k,C.length-k)*100+opCost(s,cfg);if(!best||sc<best.sc)best={sc,cfg,R};}}
  if(!best)return{declare:C[0],why:'Declare where you think it is.'};
  const m=firstOp(s,best.cfg),poss=C.length>5?`${C.length} sections`:C.map(secName).join(', ');
  if(!m)return{declare:C[0],why:'Declare where you think it is.'};
  return{...m,why:`Possible: ${poss}. `+(m.k==='cb'?`Close the breaker to test: if it holds, the fault isn't in ${nameList(new Set(best.R))}.`:m.act==='open'?`Set up a test: open the ${devName(m.k)}.`:`Set up a test: close the ${devName(m.k)}.`)};}
function solvePar(){const s=newState();let n=0;while(n++<80){const m=nextMove(s);if(m.declare!=null)break;operate(s,m.k,m.act);}return s.steps;}

/* ---------- Game ---------- */
function newPuzzle(level,seed){level=level||ls('level')||'easy';if(!LEVELS[level])level='easy';ls('level',level);
  P=makePuzzle(level,seed==null?(Math.random()*2**31)|0:seed);P.par=solvePar();st=newState();sel=null;busy=false;
  layout();crew={x:DEPOT.x,y:DEPOT.y,at:null};
  st.log.push({t:P.t0,txt:`${P.feeder} 11 kV feeder at ${P.primary} primary tripped and locked out. ${nf(custOff(st))} customers are off.`,lvl:'alarm'});
  render();closeSheet();$('endOv').hidden=true;}
// apply an operation now (the test hook and remote switches)
function act(k,a){if(!st||st.ended)return null;const r=operate(st,k,a);
  if(r.noop){toast(`The ${devName(k)} is already ${a==='open'?'open':'closed'}.`);return r;}
  if(r.refused){toast(r.refused);return r;}
  st.log.push({t:r.t,txt:r.txt+(r.man?` (a crew drove out to operate it: ${MANUAL_MIN} min)`:''),lvl:r.trip?'alarm':'ok'});closeSheet();render();
  if(r.trip)flash();return r;}
// from the page: a manual switch needs the crew to drive there first
function actUI(k,a){if(!st||st.ended||busy)return;
  const t=operate(cloneSt(st),k,a);if(t.noop||t.refused){act(k,a);return;}
  if(!isManual(k)){act(k,a);return;}
  const to=crewSpot(k),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  busy=true;closeSheet();toast(`Crew on the way to the ${devName(k)}…`);
  const from={x:crew.x,y:crew.y},d=Math.hypot(to.x-from.x,to.y-from.y),dur=reduce?0:Math.min(1800,500+d*2.4),t0=performance.now();
  const g=$('crew');if(g){g.classList.add('driving');g.classList.toggle('left',to.x<from.x);}
  const step=now=>{const f=dur?Math.min(1,(now-t0)/dur):1,e=f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2;crew.x=from.x+(to.x-from.x)*e;crew.y=from.y+(to.y-from.y)*e;
    const g2=$('crew');if(g2)g2.setAttribute('transform',`translate(${crew.x.toFixed(1)} ${crew.y.toFixed(1)}) scale(1.35)`);
    if(f<1){requestAnimationFrame(step);return;}
    crew.at=k;if(g2){g2.classList.remove('driving');g2.classList.add('working');}const dv=document.querySelector(`[data-dev="${k}"]`);if(dv)dv.classList.add('busy');
    setTimeout(()=>{busy=false;const tt=$('toast');if(tt)tt.hidden=true;act(k,a);},reduce?0:650);};
  requestAnimationFrame(step);}
function hint(){if(!st||st.ended||busy)return;const m=nextMove(st);st.hints++;
  st.log.push({t:P.t0+st.mins,txt:'Hint: '+m.why,lvl:'hint'});render();
  if(m.k!=null)select(m.k);else if(m.declare!=null)select('s'+m.declare);}
function declare(f){if(!st||st.ended)return;st.ended=true;
  const s=st,F=P.fault,A=fedA(s),B=fedB(s),correct=f===F,on=i=>A.has(i)||B.has(i);
  const iso=!on(F)&&(F>=P.n?!s.sp[F-P.n]:(F===0?!s.cb||!s.sw[0]:!s.sw[F-1])&&(F===P.n-1?!s.nop:!s.sw[F]));
  // spurs teed off a faulted main section can't come back until it's repaired
  const lost=i=>i===F||(F<P.n&&i>=P.n&&P.secs[i].tee===F);
  const healthyOff=P.secs.reduce((a,x,i)=>a+(!lost(i)&&!on(i)?x.cust:0),0);
  const d=s.steps-P.par;let pts=1000+(d<0?-d*50:-d*40)-s.trips*100-s.nbTrips*250-s.hints*50-Math.round(s.cml/500)-(correct?0:400)-(iso?0:200)-Math.round(healthyOff/2);
  pts=Math.max(0,pts);const grade=pts>=900?'A':pts>=750?'B':pts>=600?'C':pts>=400?'D':'E';
  s.result={f,correct,iso,healthyOff,pts,grade,d};
  const best=JSON.parse(ls('best')||'{}');if(!(best[P.level]>=pts)){best[P.level]=pts;ls('best',JSON.stringify(best));}
  ls('played',String(+(ls('played')||0)+1));
  closeSheet();render();showEnd();}
const golf=d=>d<=-3?'Albatross':d===-2?'Eagle':d===-1?'Birdie':d===0?'Par':d===1?'Bogey':d===2?'Double bogey':`+${d} over par`;

/* ---------- Layout and drawing ---------- */
// main line down x = X; a spur tees off to the right at SX and runs down beside it
const X=74,SX=124,TOP=96,SW=11,DEPOT={x:318,y:40};let LY=null;
function layout(){let y=TOP;const m=[];
  for(let i=0;i<P.n;i++){const j=P.sp.findIndex(w=>w.tee===i),top=y,h=j>=0?136:52,bot=top+h,sw=bot+SW+2;
    m.push({top,bot,sw,label:j>=0?top+22:(top+bot)/2-4,spur:j,tee:top+52,spSw:top+78,spTop:top+91,spBot:bot-2});y=sw+SW+2;}
  LY=m;}
function devXY(k){if(k==='cb')return{x:X,y:TOP-SW-12};if(k==='nop')return{x:X,y:LY[P.n-1].sw};if(k[0]==='p'){const L=LY[P.sp[+k.slice(1)].tee];return{x:SX,y:L.spSw};}return{x:X,y:LY[+k].sw};}
// where the crew stands at a manual switch: beside it, clear of its labels
function crewSpot(k){const p=devXY(k);return k==='nop'?{x:p.x-34,y:p.y+4}:k[0]==='p'?{x:p.x-26,y:p.y+4}:{x:p.x+28,y:p.y+4};}
const CREW='<g class="van"><rect x="-12" y="-9" width="15" height="11" rx="2"/><path d="M3 -6 h5 l4 4 v4 h-9z"/><circle class="wh" cx="-7" cy="3" r="2.6"/><circle class="wh" cx="7" cy="3" r="2.6"/></g>'+
  '<g class="man"><path class="leg" d="M-1.6 -3 L-2 5 M1.6 -3 L2 5"/><rect class="vest" x="-4" y="-11" width="8" height="8.5" rx="2.4"/><circle class="face" cx="0" cy="-14" r="2.7"/><path class="hat" d="M-3.2 -14.8 A3.2 3.4 0 0 1 3.2 -14.8 Z"/></g>';
function svg(){const s=st,A=fedA(s),B=fedB(s),on=i=>A.has(i)||B.has(i),L=LEVELS[P.level],C=L.showCand&&!s.ended?new Set(candidates(s)):null,last=LY[P.n-1],H=last.sw+66;
  let o=`<svg viewBox="0 0 360 ${H}" class="fl-svg" role="img" aria-label="${esc(P.feeder)} 11 kV feeder, ${P.n} sections and ${P.sp.length} spur${P.sp.length===1?'':'s'}">`;
  o+=`<text class="t-prim" x="${X-44}" y="22">${esc(P.primary.toUpperCase())} PRIMARY · 11 kV</text><line class="bus" x1="${X-44}" y1="34" x2="${X+90}" y2="34"/>`;
  o+=`<g class="depot"><path d="M${DEPOT.x+6} ${DEPOT.y-26} l14 -10 l14 10 v14 h-28z"/><text x="352" y="${DEPOT.y+12}" text-anchor="end">DEPOT</text></g>`;
  o+=`<line class="cond ${s.cb?'live':'dead'}" x1="${X}" y1="34" x2="${X}" y2="${TOP}"/>`;
  const end=i=>s.ended&&i===P.fault,bolt=(x,y)=>`<path class="bolt" d="M${x+9} ${y-12} l-7 11 h5 l-4 11 l10 -14 h-5 l4 -8 z"/>`;
  const label=(i,x,y,sub)=>{const S=P.secs[i],lv=on(i);return `<text class="t-sec${sel==='s'+i?' sel':''}" x="${x}" y="${y}">${esc(S.name)}${i>=P.n?' <tspan class="t-spur">spur</tspan>':''}${end(i)?' · FAULT':''}</text><text class="t-sub" x="${x}" y="${y+17}">${sub}</text><text class="t-st ${lv?'on':'off'}" x="350" y="${y}" text-anchor="end">${lv?'ON':'OFF'}</text>`;};
  const fpi=(w,flag,x,y)=>w.fpi?`<g class="${w.fail?'fpi none':flag?'fpi on':'fpi off'}"><rect x="${x}" y="${y-10}" width="30" height="16" rx="8"/><text x="${x+15}" y="${y+2}" text-anchor="middle">${w.fail?'?':'FPI'}</text></g>`:'';
  const dev=(k,x,y,man,c,extra)=>`<g data-dev="${k}" class="devg">`+(man?`<circle class="dev${c?'':' open'}${sel===k?' sel':''}${extra||''}" cx="${x}" cy="${y}" r="${SW}"/>`:`<rect class="dev${c?'':' open'}${sel===k?' sel':''}${extra||''}" x="${x-SW}" y="${y-SW}" width="${SW*2}" height="${SW*2}" rx="2"/>`)+'</g>';
  P.secs.slice(0,P.n).forEach((x,i)=>{const Ly=LY[i],lv=on(i),hasSp=Ly.spur>=0;
    if(C&&C.has(i))o+=`<rect class="cand" x="${X-14}" y="${Ly.top}" width="${352-X+14}" height="${hasSp?44:Ly.bot-Ly.top}" rx="6"/>`;
    o+=`<line class="cond ${lv?'live':'dead'}${x.oh?' oh':''}" x1="${X}" y1="${Ly.top}" x2="${X}" y2="${Ly.bot}"/>`;
    if(end(i))o+=bolt(X,hasSp?Ly.top+20:(Ly.top+Ly.bot)/2);
    o+=label(i,X+24,Ly.label,`${x.cust} customers · ${x.oh?'overhead':'cable'} · ${x.km} km`);
    o+=`<rect class="hit" data-sel="s${i}" x="${X-16}" y="${Ly.top}" width="${352-X+16}" height="${hasSp?44:Ly.bot-Ly.top}"/>`;
    if(hasSp){const j=Ly.spur,f=P.n+j,S=P.secs[f],w=P.sp[j],sl=on(f),c=s.sp[j];
      if(C&&C.has(f))o+=`<rect class="cand" x="${SX-14}" y="${Ly.spTop-4}" width="${352-SX+14}" height="${Ly.spBot-Ly.spTop+6}" rx="6"/>`;
      o+=`<path class="cond ${lv?'live':'dead'}" d="M${X} ${Ly.tee} H${SX} V${Ly.spSw-SW-2}"/><circle class="tee" cx="${X}" cy="${Ly.tee}" r="4"/>`;
      o+=`<line class="cond ${sl?'live':'dead'}${S.oh?' oh':''}" x1="${SX}" y1="${Ly.spTop}" x2="${SX}" y2="${Ly.spBot}"/>`;
      if(end(f))o+=bolt(SX,(Ly.spTop+Ly.spBot)/2);
      o+=dev('p'+j,SX,Ly.spSw,w.manual,c)+fpi(w,spFlag(j),SX+18,Ly.spSw);
      o+=label(f,SX+20,Ly.spTop+16,`${S.cust} customers · ${S.oh?'overhead':'cable'} · ${S.km} km`);
      o+=`<rect class="hit" data-sel="s${f}" x="${SX-16}" y="${Ly.spTop}" width="${352-SX+16}" height="${Ly.spBot-Ly.spTop+2}"/><rect class="hit" data-sel="p${j}" x="${SX-22}" y="${Ly.spSw-20}" width="44" height="40"/>`;}});
  P.sw.forEach((w,i)=>{const y=LY[i].sw,k=String(i);
    o+=dev(k,X,y,w.manual,s.sw[i])+`<text class="t-km" x="${X-20}" y="${y+16}" text-anchor="end">${(P.secs[i+1].from).toFixed(1)} km</text>`+fpi(w,fpiFlag(i),X-56,y);
    o+=`<rect class="hit" data-sel="${k}" x="${X-24}" y="${y-22}" width="48" height="44"/>`;});
  {const y=TOP-SW-12;o+=`<g data-dev="cb" class="devg"><rect class="dev cb${s.cb?'':' open'}${sel==='cb'?' sel':''}" x="${X-SW-1}" y="${y-SW-1}" width="${SW*2+2}" height="${SW*2+2}" rx="2"/></g><text class="t-dev" x="${X+20}" y="${y+5}">Feeder breaker</text><rect class="hit" data-sel="cb" x="${X-26}" y="${y-22}" width="140" height="44"/>`;}
  {const y=last.sw;o+=dev('nop',X,y,P.nopManual,s.nop)+`<text class="t-dev" x="${X+20}" y="${y+5}">Normally open point</text>`;
    o+=`<path class="cond live nb" d="M${X} ${y+SW} V${y+44} H350"/><text class="t-nb" x="350" y="${y+37}" text-anchor="end">To ${esc(P.neighbour)} primary (live)</text>`;
    o+=`<rect class="hit" data-sel="nop" x="${X-26}" y="${y-22}" width="160" height="44"/>`;}
  if(crew)o+=`<g id="crew" class="crew${crew.at?'':' home'}" transform="translate(${crew.x.toFixed(1)} ${crew.y.toFixed(1)}) scale(1.35)">${CREW}</g>`;
  return o+'</svg>';}
function render(){if(!P)return;const s=st;
  $('lvl').textContent=LEVELS[P.level].name;document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===P.level)));
  $('stSteps').textContent=s.steps;$('stPar').textContent=P.par;$('stOff').textContent=nf(custOff(s));$('stTime').textContent=fmtT(P.t0+s.mins);$('stTrips').textContent=s.trips+s.nbTrips;
  $('stOffBox').classList.toggle('bad',custOff(s)>0);
  $('diagram').innerHTML=svg();
  $('cFeeder').textContent=`${P.feeder} 11 kV feeder · ${P.primary} primary`;
  $('cProt').textContent=P.prot;
  $('cDist').innerHTML=P.dist?`Relay distance estimate: <b>${P.dist.lo.toFixed(1)}–${P.dist.hi.toFixed(1)} km</b> from the primary.`:'No distance estimate from this relay.';
  const fp=[...P.sw.map((w,i)=>w.fpi?{w,where:`After ${P.secs[i].name}`,flag:fpiFlag(i)}:null),...P.sp.map((w,j)=>w.fpi?{w,where:`${P.secs[P.n+j].name} spur switch`,flag:spFlag(j)}:null)].filter(Boolean);
  $('cFpi').innerHTML=fp.length?fp.map(({w,where,flag})=>`<li><span class="fpi-tag ${w.fail?'none':flag?'on':'off'}">${w.fail?'?':'FPI'}</span><span>${esc(where)}: ${w.fail?'no reading (indicator not responding)':flag?'<b>flagged</b>, fault current passed through here':'not flagged'}</span></li>`).join(''):'<li>No fault passage indicators on this feeder.</li>';
  $('cCalls').innerHTML=P.calls.map(c=>`<li><span class="tm">${fmtT(c.m)}</span><b>${esc(P.secs[c.sec].name)}</b><q>${esc(c.txt.replace(/^"|"$/g,''))}</q></li>`).join('');
  $('log').innerHTML=s.log.slice().reverse().map(l=>`<li class="${l.lvl}"><span class="tm">${fmtT(l.t)}</span>${esc(l.txt)}</li>`).join('');
  $('hintBtn').disabled=s.ended;}
function select(k){if(busy)return;sel=k;render();openSheet();}
function openSheet(){const k=sel,s=st,sh=$('sheet');if(!k||!st){closeSheet();return;}
  let h='';
  if(k[0]==='s'){const i=+k.slice(1),x=P.secs[i],live=fedA(s).has(i)||fedB(s).has(i);
    h=`<div class="sh-h"><b>${esc(secName(i))}</b><button type="button" class="sh-x" data-close aria-label="Close">×</button></div><p class="sh-s">${x.cust} customers · ${x.oh?'overhead line':'underground cable'} · ${x.km} km, ${i>=P.n?`teed off ${esc(P.secs[x.tee].name)}`:`starting ${x.from.toFixed(1)} km from the primary`} · ${live?'on supply':'off supply'}</p>`+
      (s.ended?'':`<div class="sh-row"><button type="button" class="btn primary" data-declare="${i}">Declare the fault is here</button></div><p class="sh-n">This ends the puzzle. Isolate the section and restore everyone else first for the best score.</p>`);}
  else{const c=isClosed(s,k),man=isManual(k);
    h=`<div class="sh-h"><b>${esc(devName(k)[0].toUpperCase()+devName(k).slice(1))}</b><button type="button" class="sh-x" data-close aria-label="Close">×</button></div><p class="sh-s"><span class="sh-st">${c?'Closed':'Open'}</span> · ${man?`manual: the crew drives out, ${MANUAL_MIN} min, 2 steps`:`remote: ${REMOTE_MIN} min, 1 step`}</p>`+
      (s.ended?'':`<div class="sh-row">${['open','close'].map(a=>{const same=c===(a==='close');return `<button type="button" class="btn${same?' same':' primary'}" data-act="${a}" data-k="${k}">${a==='open'?'Open':'Close'}${same?' <small>already</small>':''}</button>`;}).join('')}</div>`);}
  sh.innerHTML=h;sh.hidden=false;}
function closeSheet(){sel=null;const sh=$('sheet');if(sh)sh.hidden=true;if(P&&st)$('diagram').innerHTML=svg();}
let toastT=0;function toast(t){const e=$('toast');e.textContent=t;e.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,4200);}
function flash(){const d=$('diagram');d.classList.remove('trip');void d.offsetWidth;d.classList.add('trip');}
function showEnd(){const r=st.result,s=st,F=P.secs[P.fault];
  $('endGrade').textContent=r.grade;$('endGrade').className='grade g-'+r.grade;
  $('endTitle').textContent=r.correct?(r.iso&&!r.healthyOff?'Found, isolated and restored':'Found it'):'Wrong section';
  $('endBody').innerHTML=`<p>The fault was on <b>${esc(secName(P.fault))}</b>: ${esc(P.cause.toLowerCase())}.${r.correct?'':` You declared ${esc(secName(r.f))}, so the crew found nothing there.`}</p>
    <ul class="res">
      <li><span>Steps</span><b>${s.steps} · par ${P.par}</b><em>${golf(r.d)}</em></li>
      <li><span>Closed onto the fault</span><b>${s.trips}</b>${s.nbTrips?`<em>+ ${s.nbTrips} neighbour trip${s.nbTrips>1?'s':''}</em>`:''}</li>
      <li><span>Customer minutes lost</span><b>${nf(s.cml)}</b></li>
      <li><span>Faulted section isolated</span><b>${r.iso?'Yes':'No'}</b></li>
      <li><span>Healthy customers left off</span><b>${nf(r.healthyOff)}</b></li>
      ${s.hints?`<li><span>Hints used</span><b>${s.hints}</b></li>`:''}
      <li class="tot"><span>Score</span><b>${nf(r.pts)}</b></li></ul>`;
  $('endOv').hidden=false;$('endNext').focus();}
function showHelp(on){$('helpOv').hidden=!on;if(on)$('helpGo').focus();}

/* ---------- Events ---------- */
document.addEventListener('click',e=>{const t=e.target;
  const h=t.closest('[data-sel]');if(h&&(!st.ended||h.dataset.sel[0]==='s')){select(h.dataset.sel);return;}
  const a=t.closest('[data-act]');if(a){actUI(a.dataset.k,a.dataset.act);return;}
  const d=t.closest('[data-declare]');if(d){declare(+d.dataset.declare);return;}
  if(t.closest('[data-close]')){closeSheet();return;}
  const lv=t.closest('[data-level]');if(lv){newPuzzle(lv.dataset.level);showHelp(false);return;}
  if(t.id==='hintBtn'){hint();return;}
  if(t.id==='newBtn'||t.id==='endNext'){newPuzzle(P&&P.level);return;}
  if(t.id==='helpBtn'){showHelp(true);return;}
  if(t.id==='helpGo'){showHelp(false);ls('seen','1');return;}
  if(t.id==='endLevel'){$('endOv').hidden=true;showHelp(true);return;}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('helpOv').hidden)showHelp(false);else closeSheet();}});

newPuzzle();
if(!ls('seen'))showHelp(true);
window.__fl={get P(){return P;},get st(){return st;},get crew(){return crew;},get busy(){return busy;},newPuzzle,act,actUI,declare,hint,operate,candidates,nextMove,fedA,fedB,custOff};
