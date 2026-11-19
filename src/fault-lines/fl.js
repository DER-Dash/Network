'use strict';
/* Fault Lines (Watts Up): an 11 kV feeder has tripped and locked out. Find the faulted section with as few
   switching operations as possible, isolate it and restore everyone else. Practice mode: random puzzles.

   The feeder is radial: breaker CB at the primary, sections 0..n-1, switch i between section i and i+1,
   and a normally open point (NOP) at the far end to a neighbouring feeder that is always live. */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Math.round(n).toLocaleString('en-GB');
const fmtT=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
function rngFrom(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem('fl-'+k);localStorage.setItem('fl-'+k,v);}catch(e){return null;}};

const LEVELS={
  easy:{name:'Easy',n:5,manualP:0,nopManual:false,fpiP:1,fpiFail:0,dist:.2,bangP:.9,herring:0,showCand:true,
    blurb:'Five sections, every switch remote, every fault passage indicator working. Possible fault sections are shaded.'},
  medium:{name:'Medium',n:7,manualP:.35,nopManual:true,fpiP:.6,fpiFail:.2,dist:.35,bangP:.7,herring:0,showCand:false,
    blurb:'Seven sections, some manual switches that need a crew, and not every indicator is working.'},
  hard:{name:'Hard',n:9,manualP:.5,nopManual:true,fpiP:.4,fpiFail:.3,dist:null,bangP:.6,herring:.6,showCand:false,
    blurb:'Nine sections, few indicators, no distance estimate, and not every caller is right.'}};
const STREETS=['Mill Lane','Station Road','Church Street','Orchard Close','Ferry Lane','Kiln Way','Brook Street','Copper Row','Volt Avenue','Spark Street','Coil Close','Pylon Road','Ohm Grove','Fuse Lane','Amp Terrace','Relay Road','Meadow View','Quarry Hill','Hawthorn Drive','Beacon Rise','Canal Side','Market Place','Willow Bank','Foundry Street'];
const PRIMARIES=['Kings Hill','Hertz House','Ohm No','Shocking Place','Joule Street'],NEIGHBOURS=['Bramble Lane','Ampere Avenue','Capacitor Close','Dynamo Drive'];
const FEEDERS=['Town Centre','Riverside','Business Park','Hill Top','Old Village','Ring Road'];
const BANG_OH=['"There was a flash and a bang on the wires across the field, then everything went off."','"A branch came down on the overhead line by the farm gate."','"Heard a crack from the pole outside, and the lights went."'];
const BANG_UG=['"Workmen were digging up the pavement, there was a bang and the power went."','"There\'s a smell of burning coming from the road works."','"A loud thump from under the road, then everything went off."'];
const PLAIN=['"Is there a power cut? Everything\'s gone off."','"The lights flickered a couple of times, then went off."','"No power here. How long will it be?"','"We\'ve lost everything, is it just us?"'];
const HERRING=['"Heard a loud bang about the time it went off. Might have been fireworks though."','"Something went bang down the road, could have been a car backfiring."'];
const REMOTE_MIN=2,MANUAL_MIN=15;

let P=null,st=null,sel=null;

/* ---------- Puzzle ---------- */
function makePuzzle(level,seed){
  const L=LEVELS[level],r=rngFrom(seed),pick=a=>a[Math.floor(r()*a.length)],n=L.n;
  const names=STREETS.slice();for(let i=names.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  const secs=[];let km=0;
  for(let i=0;i<n;i++){const len=Math.round((.4+r()*1.1)*10)/10;secs.push({name:names[i],cust:10*Math.round(4+r()*36),oh:r()<.5,km:len,from:Math.round(km*10)/10});km+=len;}
  const sw=[];for(let i=0;i<n-1;i++){const fpi=r()<L.fpiP;sw.push({manual:r()<L.manualP,fpi,fail:fpi&&r()<L.fpiFail});}
  const fault=Math.floor(r()*n),F=secs[fault];
  const cause=F.oh?pick(['Tree branch on the overhead line','Insulator flashover','Conductor clash in high wind','Bird strike on the overhead line']):pick(['Cable joint failure','Digger strike on the underground cable','Water ingress in a cable joint']);
  let dist=null;if(L.dist){const mid=F.from+F.km/2,e=L.dist*(.6+r()*.8);const lo=Math.max(0,mid-mid*e-.1*r()),hi=mid+mid*e+.1*r();dist={lo:Math.round(lo*10)/10,hi:Math.round(hi*10)/10};}
  const calls=[],t0=600+Math.floor(r()*600);
  if(r()<L.bangP)calls.push({sec:fault,txt:pick(F.oh?BANG_OH:BANG_UG)});
  if(r()<L.herring){let h=Math.floor(r()*n);if(h===fault)h=(h+1+Math.floor(r()*(n-1)))%n;calls.push({sec:h,txt:pick(HERRING)});}
  while(calls.length<(level==='easy'?3:4)){calls.push({sec:Math.floor(r()*n),txt:pick(PLAIN)});}
  for(let i=calls.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[calls[i],calls[j]]=[calls[j],calls[i]];}
  calls.forEach((c,i)=>c.m=t0+2+i*2+Math.floor(r()*2));
  const anyOh=secs.some(s=>s.oh);
  return{level,seed,n,secs,sw,nopManual:L.nopManual,fault,cause,dist,calls,t0,
    primary:pick(PRIMARIES),feeder:pick(FEEDERS),neighbour:pick(NEIGHBOURS),
    prot:F.oh?'Earth fault protection operated. The breaker auto-reclosed once onto the fault, tripped again and locked out.':anyOh?'Overcurrent protection operated. The breaker auto-reclosed once onto the fault, tripped again and locked out.':'Overcurrent protection operated. Underground cable, so no auto-reclose: the breaker locked out straight away.'};}

/* ---------- Switching model ---------- */
const newState=()=>({cb:false,sw:P.sw.map(()=>true),nop:false,steps:0,mins:0,cml:0,trips:0,nbTrips:0,hints:0,obs:[],log:[],ended:false,result:null});
function fedA(s){const A=new Set();if(!s.cb)return A;for(let k=0;k<P.n;k++){A.add(k);if(k===P.n-1||!s.sw[k])break;}return A;}
function fedB(s){const B=new Set();if(!s.nop)return B;for(let k=P.n-1;k>=0;k--){B.add(k);if(k===0||!s.sw[k-1])break;}return B;}
const custOff=s=>{const A=fedA(s),B=fedB(s);return P.secs.reduce((a,x,i)=>a+(A.has(i)||B.has(i)?0:x.cust),0);};
const devName=k=>k==='cb'?`${P.primary} breaker`:k==='nop'?`normally open point to ${P.neighbour}`:`switch between ${P.secs[+k].name} and ${P.secs[+k+1].name}`;
const isManual=k=>k==='cb'?false:k==='nop'?P.nopManual:P.sw[+k].manual;
const isClosed=(s,k)=>k==='cb'?s.cb:k==='nop'?s.nop:s.sw[+k];
function setDev(s,k,v){if(k==='cb')s.cb=v;else if(k==='nop')s.nop=v;else s.sw[+k]=v;}
const nameList=set=>[...set].sort((a,b)=>a-b).map(i=>P.secs[i].name);

// one switching operation on state s. Returns a short result for the log, or {refused} when it would parallel the feeders.
function operate(s,k,act){
  const close=act==='close';if(isClosed(s,k)===close)return{noop:true};
  if(close){const t={...s,sw:s.sw.slice()};setDev(t,k,true);const A=fedA(t),B=fedB(t);if([...A].some(i=>B.has(i)))return{refused:`Closing the ${devName(k)} would parallel this feeder with ${P.neighbour} primary, which is on a different grid supply. Open a switch between them first.`};}
  const man=isManual(k),dt=man?MANUAL_MIN:REMOTE_MIN;s.cml+=custOff(s)*dt;s.mins+=dt;s.steps+=man?2:1;
  const A0=fedA(s),B0=fedB(s);setDev(s,k,close);
  const out={k,act,man,t:P.t0+s.mins};
  if(!close){out.txt=`Opened the ${devName(k)}.`;const off=[...A0,...B0].filter(i=>!fedA(s).has(i)&&!fedB(s).has(i));if(off.length)out.txt+=` ${nameList(new Set(off)).join(', ')} off supply.`;return out;}
  const A=fedA(s),B=fedB(s);
  if(k!=='nop'&&A.size>A0.size){if(A.has(P.fault)){s.cb=false;s.trips++;s.obs.push({reg:[...A],trip:true});out.trip=true;out.txt=`Closed the ${devName(k)}: the ${P.primary} breaker tripped straight away. The fault is somewhere in ${nameList(A).join(', ')}.`;}
    else{s.obs.push({reg:[...A],trip:false});out.txt=`Closed the ${devName(k)}: it held. ${nameList(A).join(', ')} ${A.size>1?'are':'is'} on supply.`;}}
  if(B.size>B0.size&&!out.trip){if(B.has(P.fault)){s.nop=false;s.nbTrips++;s.obs.push({reg:[...B],trip:true});out.trip=true;out.nb=true;out.txt=`Closed the ${devName(k)}: the ${P.neighbour} feeder breaker tripped, taking its own customers off too. They've opened the normally open point and put their feeder back. The fault is somewhere in ${nameList(B).join(', ')}.`;}
    else{s.obs.push({reg:[...B],trip:false});out.txt=(out.txt?out.txt+' ':`Closed the ${devName(k)}: it held. `)+`${nameList(B).join(', ')} ${B.size>1?'are':'is'} back on from ${P.neighbour}.`;}}
  if(!out.txt)out.txt=`Closed the ${devName(k)}. Nothing new is on supply yet.`;
  return out;}

/* ---------- What is known: sections that fit every clue and test ---------- */
function candidates(s,useCalls){const L=LEVELS[P.level],c=[];
  for(let f=0;f<P.n;f++){let ok=true;
    P.sw.forEach((w,i)=>{if(w.fpi&&!w.fail&&(f>i)!==fpiFlag(i))ok=false;});
    s.obs.forEach(o=>{if(o.reg.includes(f)!==o.trip)ok=false;});
    if(P.dist){const a=P.secs[f].from,b=a+P.secs[f].km;if(b<P.dist.lo||a>P.dist.hi)ok=false;}
    if(ok)c.push(f);}
  return c.length?c:[...Array(P.n).keys()];}
const fpiFlag=i=>P.fault>i;

// the next move an expert would make: used for hints, and to set par
function nextMove(s){const C=candidates(s),n=P.n;
  if(C.length===1){const f=C[0];
    if(f>0&&s.sw[f-1])return{k:String(f-1),act:'open',why:`The fault must be in ${P.secs[f].name}. Open the switch on its primary side.`};
    if(f===0&&s.cb&&s.sw[0])return{k:'cb',act:'open',why:`The fault must be in ${P.secs[0].name}. Open the breaker first.`};
    if(f<n-1&&s.sw[f])return{k:String(f),act:'open',why:`The fault must be in ${P.secs[f].name}. Open the switch on its far side.`};
    if(f>0&&!s.cb){for(let j=0;j<f-1;j++)if(!s.sw[j])return{k:String(j),act:'close',why:'Close the switches between the primary and the faulted section.'};return{k:'cb',act:'close',why:`${P.secs[f].name} is isolated. Close the breaker to restore everything before it.`};}
    if(f<n-1&&!s.nop){for(let j=f+1;j<n-1;j++)if(!s.sw[j])return{k:String(j),act:'close',why:'Close the switches beyond the faulted section.'};return{k:'nop',act:'close',why:`Close the normally open point to restore everything beyond ${P.secs[f].name} from ${P.neighbour}.`};}
    return{declare:f,why:`Everything else is back on. Tap ${P.secs[f].name} and declare the fault there.`};}
  // split the possible sections in two: open the switch after the middle one, then close the breaker
  const lo=C[0],hi=C[C.length-1];let best=lo,bd=1e9;for(let i=lo;i<hi;i++){const d=Math.abs(C.filter(f=>f<=i).length-C.filter(f=>f>i).length)+(P.sw[i].manual?.6:0);if(d<bd){bd=d;best=i;}}
  for(let j=0;j<best;j++)if(!s.sw[j])return{k:String(j),act:'close',why:'Close the switches between the primary and where you want to test.'};
  if(s.sw[best])return{k:String(best),act:'open',why:`The fault could be anywhere from ${P.secs[lo].name} to ${P.secs[hi].name}. Split it: open the switch after ${P.secs[best].name}, then close the breaker.`};
  if(!s.cb)return{k:'cb',act:'close',why:`Close the breaker. If it holds, the fault is beyond ${P.secs[best].name}; if it trips, it's before.`};
  return{k:String(best),act:'close',why:'Close the next switch to extend the test.'};}
function solvePar(){const s=newState();let n=0;while(n++<60){const m=nextMove(s);if(m.declare!=null)break;operate(s,m.k,m.act);}return s.steps;}

/* ---------- Game ---------- */
function newPuzzle(level,seed){level=level||ls('level')||'easy';if(!LEVELS[level])level='easy';ls('level',level);
  P=makePuzzle(level,seed==null?(Math.random()*2**31)|0:seed);P.par=solvePar();st=newState();sel=null;
  st.log.push({t:P.t0,txt:`${P.feeder} 11 kV feeder at ${P.primary} primary tripped and locked out. ${nf(custOff(st))} customers are off.`,lvl:'alarm'});
  render();closeSheet();$('endOv').hidden=true;}
function act(k,a){if(!st||st.ended)return;const r=operate(st,k,a);
  if(r.noop){toast(`The ${devName(k)} is already ${a==='open'?'open':'closed'}.`);return;}
  if(r.refused){toast(r.refused);return;}
  st.log.push({t:r.t,txt:r.txt+(r.man?` (a crew went to operate it: ${MANUAL_MIN} min)`:''),lvl:r.trip?'alarm':'ok'});closeSheet();render();
  if(r.trip)flash();}
function hint(){if(!st||st.ended)return;const m=nextMove(st);st.hints++;
  st.log.push({t:P.t0+st.mins,txt:'Hint: '+m.why,lvl:'hint'});render();
  if(m.k!=null)select(m.k);else if(m.declare!=null)select('s'+m.declare);}
function declare(f){if(!st||st.ended)return;st.ended=true;
  const s=st,F=P.fault,A=fedA(s),B=fedB(s),correct=f===F;
  const iso=!A.has(F)&&!B.has(F)&&(F===0?!s.cb||!s.sw[0]:!s.sw[F-1])&&(F===P.n-1?!s.nop:!s.sw[F]);
  const healthyOff=P.secs.reduce((a,x,i)=>a+(i!==F&&!A.has(i)&&!B.has(i)?x.cust:0),0);
  const d=s.steps-P.par;let pts=1000+(d<0?-d*50:-d*40)-s.trips*100-s.nbTrips*250-s.hints*50-Math.round(s.cml/500)-(correct?0:400)-(iso?0:200)-Math.round(healthyOff/2);
  pts=Math.max(0,pts);const grade=pts>=900?'A':pts>=750?'B':pts>=600?'C':pts>=400?'D':'E';
  s.result={f,correct,iso,healthyOff,pts,grade,d};
  const best=JSON.parse(ls('best')||'{}');if(!(best[P.level]>=pts)){best[P.level]=pts;ls('best',JSON.stringify(best));}
  const n=+(ls('played')||0)+1;ls('played',String(n));
  closeSheet();render();showEnd();}
const golf=d=>d<=-3?'Albatross':d===-2?'Eagle':d===-1?'Birdie':d===0?'Par':d===1?'Bogey':d===2?'Double bogey':`+${d} over par`;

/* ---------- Drawing ---------- */
const X=74,TOP=96,ROW=78,SW=11;
// switch i (and the NOP, at i = n-1) sits below section i
const swY=i=>TOP+(i+1)*ROW-SW,secTop=i=>i===0?TOP:swY(i-1)+SW+2,secBot=i=>swY(i)-SW-2;
function svg(){const s=st,A=fedA(s),B=fedB(s),L=LEVELS[P.level],C=L.showCand&&!s.ended?new Set(candidates(s)):null,H=swY(P.n-1)+66;
  let o=`<svg viewBox="0 0 360 ${H}" class="fl-svg" role="img" aria-label="${esc(P.feeder)} 11 kV feeder, ${P.n} sections">`;
  // primary busbar and breaker
  o+=`<text class="t-prim" x="${X-44}" y="22">${esc(P.primary.toUpperCase())} PRIMARY · 11 kV</text><line class="bus" x1="${X-44}" y1="34" x2="${X+90}" y2="34"/>`;
  o+=`<line class="cond ${s.cb?'live':'dead'}" x1="${X}" y1="34" x2="${X}" y2="${TOP}"/>`;
  P.secs.forEach((x,i)=>{const live=A.has(i)||B.has(i),y0=secTop(i),y1=secBot(i),ym=(y0+y1)/2,end=s.ended&&i===P.fault;
    if(C&&C.has(i))o+=`<rect class="cand" x="${X-14}" y="${y0}" width="${352-X+14}" height="${y1-y0}" rx="6"/>`;
    o+=`<line class="cond ${live?'live':'dead'}${x.oh?' oh':''}" x1="${X}" y1="${y0}" x2="${X}" y2="${y1}"/>`;
    if(end)o+=`<path class="bolt" d="M${X+9} ${ym-12} l-7 11 h5 l-4 11 l10 -14 h-5 l4 -8 z"/>`;
    o+=`<text class="t-sec${sel==='s'+i?' sel':''}" x="${X+24}" y="${ym-4}">${esc(x.name)}${end?' · FAULT':''}</text><text class="t-sub" x="${X+24}" y="${ym+13}">${x.cust} customers · ${x.oh?'overhead':'cable'} · ${x.km} km</text>`;
    o+=`<text class="t-st ${live?'on':'off'}" x="350" y="${ym-4}" text-anchor="end">${live?'ON':'OFF'}</text>`;
    o+=`<rect class="hit" data-sel="s${i}" x="${X-16}" y="${y0}" width="${352-X+16}" height="${y1-y0}"/>`;});
  // switches with their fault passage indicators
  P.sw.forEach((w,i)=>{const y=swY(i),c=s.sw[i],k=String(i);
    o+=w.manual?`<circle class="dev${c?'':' open'}${sel===k?' sel':''}" cx="${X}" cy="${y}" r="${SW}"/>`:`<rect class="dev${c?'':' open'}${sel===k?' sel':''}" x="${X-SW}" y="${y-SW}" width="${SW*2}" height="${SW*2}" rx="2"/>`;
    o+=`<text class="t-km" x="${X-20}" y="${y+16}" text-anchor="end">${(P.secs[i+1].from).toFixed(1)} km</text>`;
    if(w.fpi){const cls=w.fail?'fpi none':fpiFlag(i)?'fpi on':'fpi off';o+=`<g class="${cls}"><rect x="${X-56}" y="${y-10}" width="30" height="16" rx="8"/><text x="${X-41}" y="${y+2}" text-anchor="middle">${w.fail?'?':'FPI'}</text></g>`;}
    o+=`<rect class="hit" data-sel="${k}" x="${X-24}" y="${y-22}" width="48" height="44"/>`;});
  // breaker at the top, NOP at the bottom
  {const y=TOP-SW-12;o+=`<rect class="dev cb${s.cb?'':' open'}${sel==='cb'?' sel':''}" x="${X-SW-1}" y="${y-SW-1}" width="${SW*2+2}" height="${SW*2+2}" rx="2"/><text class="t-dev" x="${X+20}" y="${y+5}">Feeder breaker</text><rect class="hit" data-sel="cb" x="${X-26}" y="${y-22}" width="140" height="44"/>`;}
  {const y=swY(P.n-1),n=s.nop;
    o+=P.nopManual?`<circle class="dev nop${n?'':' open'}${sel==='nop'?' sel':''}" cx="${X}" cy="${y}" r="${SW}"/>`:`<rect class="dev nop${n?'':' open'}${sel==='nop'?' sel':''}" x="${X-SW}" y="${y-SW}" width="${SW*2}" height="${SW*2}" rx="2"/>`;
    o+=`<text class="t-dev" x="${X+20}" y="${y+5}">Normally open point</text>`;
    o+=`<path class="cond live nb" d="M${X} ${y+SW} V${y+44} H350"/><text class="t-nb" x="350" y="${y+37}" text-anchor="end">To ${esc(P.neighbour)} primary (live)</text>`;
    o+=`<rect class="hit" data-sel="nop" x="${X-26}" y="${y-22}" width="160" height="44"/>`;}
  return o+'</svg>';}
function render(){if(!P)return;const s=st;
  $('lvl').textContent=LEVELS[P.level].name;document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===P.level)));
  $('stSteps').textContent=s.steps;$('stPar').textContent=P.par;$('stOff').textContent=nf(custOff(s));$('stTime').textContent=fmtT(P.t0+s.mins);$('stTrips').textContent=s.trips+s.nbTrips;
  $('stOffBox').classList.toggle('bad',custOff(s)>0);
  $('diagram').innerHTML=svg();
  $('cFeeder').textContent=`${P.feeder} 11 kV feeder · ${P.primary} primary`;
  $('cProt').textContent=P.prot;
  $('cDist').innerHTML=P.dist?`Relay distance estimate: <b>${P.dist.lo.toFixed(1)}–${P.dist.hi.toFixed(1)} km</b> from the primary.`:'No distance estimate from this relay.';
  const fp=P.sw.map((w,i)=>w.fpi?{i,w}:null).filter(Boolean);
  $('cFpi').innerHTML=fp.length?fp.map(({i,w})=>`<li><span class="fpi-tag ${w.fail?'none':fpiFlag(i)?'on':'off'}">${w.fail?'?':'FPI'}</span><span>After ${esc(P.secs[i].name)}: ${w.fail?'no reading (indicator not responding)':fpiFlag(i)?'<b>flagged</b>, fault current passed through here':'not flagged'}</span></li>`).join(''):'<li>No fault passage indicators on this feeder.</li>';
  $('cCalls').innerHTML=P.calls.map(c=>`<li><span class="tm">${fmtT(c.m)}</span><b>${esc(P.secs[c.sec].name)}</b><q>${esc(c.txt.replace(/^"|"$/g,''))}</q></li>`).join('');
  $('log').innerHTML=s.log.slice().reverse().map(l=>`<li class="${l.lvl}"><span class="tm">${fmtT(l.t)}</span>${esc(l.txt)}</li>`).join('');
  $('hintBtn').disabled=s.ended;}
function select(k){sel=k;render();openSheet();}
function openSheet(){const k=sel,s=st,sh=$('sheet');if(!k||!st){closeSheet();return;}
  let h='';
  if(k[0]==='s'){const i=+k.slice(1),x=P.secs[i],live=fedA(s).has(i)||fedB(s).has(i);
    h=`<div class="sh-h"><b>${esc(x.name)}</b><button type="button" class="sh-x" data-close aria-label="Close">×</button></div><p class="sh-s">${x.cust} customers · ${x.oh?'overhead line':'underground cable'} · ${x.km} km, starting ${x.from.toFixed(1)} km from the primary · ${live?'on supply':'off supply'}</p>`+
      (s.ended?'':`<div class="sh-row"><button type="button" class="btn primary" data-declare="${i}">Declare the fault is here</button></div><p class="sh-n">This ends the puzzle. Isolate the section and restore everyone else first for the best score.</p>`);}
  else{const c=isClosed(s,k),man=isManual(k);
    h=`<div class="sh-h"><b>${esc(devName(k)[0].toUpperCase()+devName(k).slice(1))}</b><button type="button" class="sh-x" data-close aria-label="Close">×</button></div><p class="sh-s"><span class="sh-st">${c?'Closed':'Open'}</span> · ${man?`manual: a crew goes, ${MANUAL_MIN} min, 2 steps`:`remote: ${REMOTE_MIN} min, 1 step`}</p>`+
      (s.ended?'':`<div class="sh-row">${['open','close'].map(a=>{const same=c===(a==='close');return `<button type="button" class="btn${same?' same':' primary'}" data-act="${a}" data-k="${k}">${a==='open'?'Open':'Close'}${same?' <small>already</small>':''}</button>`;}).join('')}</div>`);}
  sh.innerHTML=h;sh.hidden=false;}
function closeSheet(){sel=null;const sh=$('sheet');if(sh)sh.hidden=true;if(P&&st)$('diagram').innerHTML=svg();}
let toastT=0;function toast(t){const e=$('toast');e.textContent=t;e.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,4200);}
function flash(){const d=$('diagram');d.classList.remove('trip');void d.offsetWidth;d.classList.add('trip');}
function showEnd(){const r=st.result,s=st,F=P.secs[P.fault];
  $('endGrade').textContent=r.grade;$('endGrade').className='grade g-'+r.grade;
  $('endTitle').textContent=r.correct?(r.iso&&!r.healthyOff?'Found, isolated and restored':'Found it'):'Wrong section';
  $('endBody').innerHTML=`<p>The fault was in <b>${esc(F.name)}</b>: ${esc(P.cause.toLowerCase())}.${r.correct?'':` You declared ${esc(P.secs[r.f].name)}, so the crew found nothing there.`}</p>
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
  const h=t.closest('[data-sel]');if(h&&!st.ended){select(h.dataset.sel);return;}
  if(h&&st.ended&&h.dataset.sel[0]==='s'){select(h.dataset.sel);return;}
  const a=t.closest('[data-act]');if(a){act(a.dataset.k,a.dataset.act);return;}
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
window.__fl={get P(){return P;},get st(){return st;},newPuzzle,act,declare,hint,operate,candidates,nextMove,fedA,fedB,custOff};
