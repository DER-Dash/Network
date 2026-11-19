'use strict';
/* Fault Lines (Watts Up): an 11 kV feeder has tripped and locked out. Find the faulted section with as few
   switching operations as possible, isolate it and restore everyone else. Two modes: today's puzzle (the same
   for everyone, one go a day, level set by the weekday, scored on the shared scoreboard) and practice (random).

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
const SCORE_URL='https://script.google.com/macros/s/AKfycbx_0hkrfzn5_ApQWr3UwqT-p7SuOf8ubJHBLxNGGQECIbDEJzfIRNRsWquE--FUOhmMNg/exec';
const HOME_HOST='www.wattsupelectricity.co.uk',SHARE_URL='https://www.wattsupelectricity.co.uk/fault-lines/';

/* ---------- Today's puzzle ---------- */
// the date in the UK, so everyone's puzzle changes at UK midnight
function todayUK(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch(e){return new Date().toISOString().slice(0,10);}}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const utc=d=>{const[y,m,da]=d.split('-').map(Number);return Date.UTC(y,m-1,da);};
const dayNo=d=>Math.round((utc(d)-Date.UTC(2026,10,19))/864e5)+1;   // puzzle #1 was 19 November 2026
const dayBefore=d=>new Date(utc(d)-864e5).toISOString().slice(0,10);
// the level follows the weekday: Mon-Tue Easy, Wed-Thu Medium, Fri-Sun Hard (the scoreboard checks this too)
function dailyLevel(d){const wd=new Date(utc(d)).getUTCDay();return wd===1||wd===2?'easy':wd===3||wd===4?'medium':'hard';}
const fmtDate=d=>new Date(utc(d)).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
// the result grid: one square per switching operation, then the declaration. Gives nothing away about where the fault was.
const SQ={o:'⬜',c:'⬜',h:'🟩',t:'🟥',n:'🟧',i:'💡'};
function gridRows(s){const a=[...s.moves].map(c=>SQ[c]);a.push(s.result&&s.result.correct?'✅':'⬛');const r=[];for(let i=0;i<a.length;i+=6)r.push(a.slice(i,i+6).join(''));return r;}
function shareText(){const r=st.result;
  return `Fault Lines #${P.no} · ${LEVELS[P.level].name}\n${gridRows(st).join('\n')}\n${st.steps} steps, par ${P.par}: ${golf(r.d)} · Grade ${r.grade} · ${nf(r.pts)}\n${SHARE_URL}`;}

let P=null,st=null,sel=null,crew=null,busy=false,mode='practice';
const games={practice:null,daily:null,career:null,lc:null};   // each mode keeps its own puzzle while you switch between them

/* ---------- Puzzle ---------- */
/* opt (career and Losing Control puzzles only; without it every puzzle comes out exactly as before, so daily
   puzzles never change): L level overrides; fault (section index, spur j = n+j); tees (sections the spurs tee off);
   fpi/man (one character per main switch: F indicator working, ? not responding, . none / M manual, . remote);
   spFpi/spMan (the same per spur); rec (main switches that are auto-reclosers); oh true or false (all overhead
   or all cable); cust (scale customers to about this total); t0 (minutes after midnight the feeder tripped); names {primary, feeder, neighbour}. */
function makePuzzle(level,seed,opt){opt=opt||{};
  const L={...LEVELS[level],...(opt.L||{})},r=rngFrom(seed),pick=a=>a[Math.floor(r()*a.length)],n=L.n;
  const names=STREETS.slice();for(let i=names.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  const secs=[];let km=0;
  for(let i=0;i<n;i++){const len=Math.round((.4+r()*1.1)*10)/10;const cu=10*Math.round(4+r()*36),oh=r()<.5;secs.push({name:names[i],cust:cu,oh:opt.oh!=null?opt.oh:oh,km:len,from:Math.round(km*10)/10});km+=len;}
  const sw=[];for(let i=0;i<n-1;i++){const fpi=r()<L.fpiP;sw.push({manual:r()<L.manualP,fpi,fail:fpi&&r()<L.fpiFail});}
  // spurs: teed off different main sections, mostly overhead with a pole-mounted switch
  const tees=[...Array(n).keys()];for(let i=tees.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[tees[i],tees[j]]=[tees[j],tees[i]];}
  const sp=[];(opt.tees||tees.slice(0,L.spurs)).slice().sort((a,b)=>a-b).forEach((t,j)=>{const T=secs[t],len=Math.round((.3+r()*.9)*10)/10,fpi=r()<L.fpiP;
    const cu=10*Math.round(2+r()*16),so=r()<.75;secs.push({name:names[n+j],cust:cu,oh:opt.oh!=null?opt.oh:so,km:len,from:Math.round((T.from+T.km/2)*10)/10,tee:t,spur:j});
    sp.push({tee:t,manual:r()<L.spurManualP,fpi,fail:fpi&&r()<L.fpiFail});});
  const ch=(str,i)=>str&&str[i]!==undefined?str[i]:null,setW=(w,f,m)=>{if(f!=null){w.fpi=f!=='.';w.fail=f==='?';}if(m!=null)w.manual=m==='M';};
  sw.forEach((w,i)=>setW(w,ch(opt.fpi,i),ch(opt.man,i)));sp.forEach((w,j)=>setW(w,ch(opt.spFpi,j),ch(opt.spMan,j)));
  (opt.rec||[]).forEach(i=>{sw[i].rec=true;sw[i].manual=false;});
  if(opt.cust){const tot=secs.reduce((a,x)=>a+x.cust,0);secs.forEach(x=>x.cust=Math.max(10,10*Math.round(x.cust*opt.cust/tot/10)));}
  const N=secs.length,fr=Math.floor(r()*N),fault=opt.fault!=null?opt.fault:fr,F=secs[fault];
  const cause=F.oh?pick(['Tree branch on the overhead line','Insulator flashover','Conductor clash in high wind','Bird strike on the overhead line']):pick(['Cable joint failure','Digger strike on the underground cable','Water ingress in a cable joint']);
  let dist=null;if(L.dist){const mid=F.from+F.km/2,e=L.dist*(.6+r()*.8);const lo=Math.max(0,mid-mid*e-.1*r()),hi=mid+mid*e+.1*r();dist={lo:Math.round(lo*10)/10,hi:Math.round(hi*10)/10};}
  const calls=[],t0r=600+Math.floor(r()*600),t0=opt.t0!=null?opt.t0:t0r;
  if(r()<L.bangP)calls.push({sec:fault,txt:pick(F.oh?BANG_OH:BANG_UG)});
  if(r()<L.herring){let h=Math.floor(r()*N);if(h===fault)h=(h+1+Math.floor(r()*(N-1)))%N;calls.push({sec:h,txt:pick(HERRING)});}
  while(calls.length<(level==='easy'?3:4)){calls.push({sec:Math.floor(r()*N),txt:pick(PLAIN)});}
  for(let i=calls.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[calls[i],calls[j]]=[calls[j],calls[i]];}
  calls.forEach((c,i)=>c.m=t0+2+i*2+Math.floor(r()*2));
  const anyOh=secs.slice(0,n).some(s=>s.oh);
  const Q={level,seed,n,N,secs,sw,sp,nopManual:L.nopManual,showCand:L.showCand,fault,cause,dist,calls,t0,
    primary:pick(PRIMARIES),feeder:pick(FEEDERS),neighbour:pick(NEIGHBOURS),
    prot:F.oh?'Earth fault protection operated. The breaker auto-reclosed once onto the fault, tripped again and locked out.':anyOh?'Overcurrent protection operated. The breaker auto-reclosed once onto the fault, tripped again and locked out.':'Overcurrent protection operated. Underground cable, so no auto-reclose: the breaker locked out straight away.'};
  if(opt.names)Object.assign(Q,opt.names);
  // auto-reclosers: the nearest one upstream of the fault trips, recloses twice onto it and locks out, and the breaker holds
  const recs=sw.map((w,i)=>w.rec?i:-1).filter(i=>i>=0);
  if(recs.length){const t=fault<n?fault:secs[fault].tee,up=recs.filter(i=>i<t),j=up.length?up[up.length-1]:null,nm=i=>`${secs[i].name} and ${secs[i+1].name}`;Q.lock=j;
    Q.prot=j!=null?`The auto-recloser between ${nm(j)} tripped, reclosed twice onto the fault and locked out. The ${Q.primary} breaker held, so everything before the recloser is still on.`
      :`The ${Q.primary} breaker tripped, auto-reclosed onto the fault and locked out. The auto-recloser between ${nm(recs[0])} didn't operate, so the fault is before it.`;}
  return Q;}

/* ---------- Switching model ---------- */
function newState(){const s={cb:false,sw:P.sw.map(()=>true),sp:P.sp.map(()=>true),nop:false,steps:0,mins:0,cml:0,trips:0,nbTrips:0,hints:0,obs:[],log:[],ended:false,result:null,moves:'',ops:[]};
  if(P.lock!=null){s.cb=true;s.sw[P.lock]=false;s.obs.push({reg:beyond(P.lock),trip:true});}   // a recloser locked out: the fault is beyond it
  else if(P.sw.some(w=>w.rec))s.obs.push({reg:beyond(P.sw.findIndex(w=>w.rec)),trip:false});   // the breaker locked out: before the first recloser
  return s;}
// every section beyond main switch j: main sections after it and the spurs teed off them
const beyond=j=>[...Array(P.N).keys()].filter(f=>teeOf(f)>j);
const teeOf=f=>f<P.n?f:P.secs[f].tee,spurIds=()=>P.sp.map((x,j)=>P.n+j);
function addSpurs(s,set){P.sp.forEach((x,j)=>{if(s.sp[j]&&set.has(x.tee))set.add(P.n+j);});return set;}
function fedA(s){const A=new Set();if(s.cb)for(let k=0;k<P.n;k++){A.add(k);if(k===P.n-1||!s.sw[k])break;}return addSpurs(s,A);}
function fedB(s){const B=new Set();if(s.nop)for(let k=P.n-1;k>=0;k--){B.add(k);if(k===0||!s.sw[k-1])break;}return addSpurs(s,B);}
const custOff=s=>{const A=fedA(s),B=fedB(s);return P.secs.reduce((a,x,i)=>a+(A.has(i)||B.has(i)?0:x.cust),0);};
const secName=f=>P.secs[f].name+(f>=P.n?' spur':'');
const devName=k=>k==='cb'?`${P.primary} breaker`:k==='nop'?`normally open point to ${P.neighbour}`:k[0]==='p'?`spur switch to ${P.secs[P.n+ +k.slice(1)].name}`:`${P.sw[+k].rec?'auto-recloser':'switch'} between ${P.secs[+k].name} and ${P.secs[+k+1].name}`;
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
  if(!close){out.code='o';out.txt=`Opened the ${devName(k)}.`;const off=[...A0,...B0].filter(i=>!fedA(s).has(i)&&!fedB(s).has(i));if(off.length)out.txt+=` ${nameList(new Set(off))} off supply.`;return out;}
  const A=fedA(s),B=fedB(s);
  // an auto-recloser between the breaker and the fault trips first, leaving everything before it on
  const rj=A.size>A0.size&&A.has(P.fault)?P.sw.map((w,i)=>w.rec&&s.sw[i]&&i<teeOf(P.fault)?i:-1).filter(i=>i>=0).pop():undefined;
  if(rj!=null){s.sw[rj]=false;s.trips++;const after=fedA(s),gone=[...A].filter(i=>!after.has(i));s.obs.push({reg:gone,trip:true},{reg:[...after],trip:false});out.trip=true;out.rec=true;
    out.txt=`Closed the ${devName(k)}: the ${devName(String(rj))} tripped onto the fault and locked out. ${nameList(after)} stayed on. The fault is somewhere in ${nameList(new Set(gone))}.`;}
  else if(A.size>A0.size){if(A.has(P.fault)){s.cb=false;s.trips++;s.obs.push({reg:[...A],trip:true});out.trip=true;out.txt=`Closed the ${devName(k)}: the ${P.primary} breaker tripped straight away. The fault is somewhere in ${nameList(A)}.`;}
    else{s.obs.push({reg:[...A],trip:false});out.txt=`Closed the ${devName(k)}: it held. ${nameList(A)} on supply.`;}}
  if(B.size>B0.size&&!out.trip){if(B.has(P.fault)){s.nop=false;s.nbTrips++;s.obs.push({reg:[...B],trip:true});out.trip=true;out.nb=true;out.txt=`Closed the ${devName(k)}: the ${P.neighbour} feeder breaker tripped, taking its own customers off too. They've opened the normally open point and put their feeder back. The fault is somewhere in ${nameList(B)}.`;}
    else{s.obs.push({reg:[...B],trip:false});out.txt=(out.txt?out.txt+' ':`Closed the ${devName(k)}: it held. `)+`${nameList(B)} on from ${P.neighbour}.`;}}
  if(!out.txt)out.txt=`Closed the ${devName(k)}. Nothing new is on supply yet.`;
  out.code=out.trip?(out.nb?'n':'t'):A.size>A0.size||B.size>B0.size?'h':'c';
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
function stash(){if(P)games[mode]={P,st,crew};}
function setUp(level,seed,opt){P=makePuzzle(level,seed,opt);P.par=solvePar();st=newState();sel=null;busy=false;
  layout();crew={x:DEPOT.x,y:DEPOT.y,at:null};
  st.log.push({t:P.t0,txt:`${P.feeder} 11 kV feeder at ${P.primary} primary tripped and locked out. ${nf(custOff(st))} customers are off.`,lvl:'alarm'});}
function show(){layout();render();closeSheet();$('endOv').hidden=true;}
// practice: a random puzzle at the chosen level
function newPuzzle(level,seed){stash();mode='practice';level=level||ls('level')||'easy';if(!LEVELS[level])level='easy';ls('level',level);
  setUp(level,seed==null?(Math.random()*2**31)|0:seed);games.practice={P,st,crew};show();}
// today's puzzle: the same seed for everyone. Moves are saved as you go, so a reload picks up where you were.
function startDaily(){if(busy)return;stash();mode='daily';const date=todayUK(),g=games.daily;
  if(g&&g.P.daily===date){({P,st,crew}=g);sel=null;show();return;}
  setUp(dailyLevel(date),hashStr('fault-lines|'+date));P.daily=date;P.no=dayNo(date);
  let sv=null;try{sv=JSON.parse(ls('day-'+date)||'null');}catch(e){}
  if(sv&&Array.isArray(sv.ops)){sv.ops.forEach(o=>{if(o==='hint')doHint();else{const[k,a]=String(o).split(':');apply(k,a);}});
    if(sv.f!=null&&sv.f>=0&&sv.f<P.N)finish(+sv.f,true);}
  games.daily={P,st,crew};show();if(st.ended)showEnd();}
function setMode(m){if(busy)return;if(m==='daily')startDaily();else if(m==='career')careerTab();else if(games.practice){stash();mode='practice';({P,st,crew}=games.practice);sel=null;show();}else newPuzzle();}
const dailyKey=()=>'day-'+P.daily;

/* ---------- Career (the puzzles are in career.js) ---------- */
const carStars=()=>{try{return(JSON.parse(ls('career')||'{}')||{}).s||{};}catch(e){return{};}};
const carPassed=()=>{const c=carStars();return CAREER.filter(x=>c[x.id]>0).length;};
const carTotal=()=>{const c=carStars();return CAREER.reduce((a,x)=>a+(c[x.id]||0),0);};
const carOpen=i=>i===0||(carStars()[CAREER[i-1].id]||0)>0;
// 3 stars: found, isolated, everyone else back on, at or under par, no hints. 2: found, isolated and restored. 1: found it.
const starsFor=r=>!r.correct?0:!(r.iso&&!r.healthyOff)?1:r.d<=0&&!st.hints?3:2;
const starTxt=n=>'★'.repeat(n)+'☆'.repeat(3-n);
function startCareer(i){if(busy||!CAREER[i]||!carOpen(i))return;stash();mode='career';const c=CAREER[i];
  setUp(c.lv,c.seed,c.o);P.career=i;games.career={P,st,crew};show();showCareer('brief');}
// the Career tab: back to the puzzle in hand, or on to the next one you haven't passed
function careerTab(){const g=games.career;
  if(g){stash();mode='career';({P,st,crew}=g);sel=null;show();if(st.ended)showCareer('list');return;}
  const c=carStars(),i=CAREER.findIndex(x=>!(c[x.id]>0));startCareer(i<0?CAREER.length-1:i);}
function showCareer(view){const ov=$('carOv'),c=carStars(),i=P&&P.career!=null?P.career:0,x=CAREER[i];
  const head=`<p class="eyebrow">Career · ${rankOf(carPassed())} · ${carTotal()} of ${CAREER.length*3} stars</p>`;
  if(view==='brief')$('carCard').innerHTML=head+`<h2 id="carT">${i+1}. ${esc(x.title)}</h2><p class="lesson">${esc(x.brief)}</p>
    ${c[x.id]?`<p class="fine">Your best: <span class="stars">${starTxt(c[x.id])}</span></p>`:''}<p class="fine">★★★ at par or better with no hints, everything isolated and restored. ★★ found, isolated and restored. ★ found it.</p>
    <div class="row"><button type="button" class="btn" data-carlist>All puzzles</button><button type="button" class="btn primary" data-carclose>Start</button></div>`;
  else $('carCard').innerHTML=head+`<h2 id="carT">Career</h2><p class="fine">Thirty puzzles, each teaching one idea. Find the fault to unlock the next.</p>`+
    RANKS.map((rk,r)=>`<h3>${esc(rk)}</h3><ol class="car-list" start="${r*6+1}">${CAREER.slice(r*6,r*6+6).map((y,j)=>{const k=r*6+j,open=carOpen(k);
      return `<li><button type="button" class="car-item${P&&P.career===k?' cur':''}" data-car="${k}"${open?'':' disabled'}><span>${k+1}. ${esc(y.title)}</span><span class="stars">${open?starTxt(c[y.id]||0):'🔒'}</span></button></li>`;}).join('')}</ol>`).join('')+
    `<div class="row"><button type="button" class="btn primary" data-carclose>Close</button></div>`;
  ov.hidden=false;const f=ov.querySelector('[data-carclose]');if(f)f.focus();}
function careerEnd(){const r=st.result,k=r.car,i=P.career,nx=CAREER[i+1];
  return `<div class="daily-end"><h3>Career · ${i+1}. ${esc(CAREER[i].title)}</h3><p class="big-stars stars">${starTxt(k.stars)}</p>
    ${k.best>k.stars?`<p class="fine">Your best is still ${starTxt(k.best)}.</p>`:''}
    ${k.promo?`<p class="promo">Promoted: <b>${esc(k.promo)}</b></p>`:''}
    ${!r.correct?'<p class="fine">Find the fault to unlock the next puzzle.</p>':nx?`<p class="fine">Next: ${i+2}. ${esc(nx.title)}</p>`:'<p class="fine">That was the last one. Go back for three stars on every puzzle.</p>'}</div>`;}

/* ---------- From Losing Control: "Find it yourself" ----------
   Losing Control opens this page in a frame with ?lc={k,t,f,pr,h,oh,c,s,e,m}: feeder key and fault start time (sent
   back so it knows which fault), feeder and primary names, which half the fault is in (0 near, 1 far), overhead or
   cable, customers, a seed, an easy shift, and m, the shift clock in minutes after midnight. The near half here is the first three main sections and their spurs. */
function lcParams(){try{const v=new URLSearchParams(location.search).get('lc');if(!v)return null;const d=JSON.parse(v);return d&&typeof d==='object'?d:null;}catch(e){return null;}}
function startLc(d){stash();mode='lc';const lv=d.e?'easy':'medium',seed=(Math.round(Number(d.s))||1)>>>0;
  const o={L:{n:6,spurs:1,showCand:!!d.e},oh:!!d.oh,cust:Math.max(100,Math.min(20000,Math.round(Number(d.c))||1500)),
    t0:Number.isFinite(+d.m)?((Math.round(+d.m)%1440)+1440)%1440:undefined,names:{primary:String(d.pr||'Kings Hill').slice(0,40),feeder:String(d.f||'Town Centre').replace(/ feeder$/i,'').slice(0,40)}};
  const Q=makePuzzle(lv,seed,o),half=d.h?1:0,inHalf=[...Array(Q.N).keys()].filter(f=>((f<Q.n?f:Q.secs[f].tee)>=3)===!!half);
  setUp(lv,seed,{...o,fault:inHalf[Math.floor(rngFrom(seed^0x5bd1e995)()*inHalf.length)]});P.lc=d;games.lc={P,st,crew};show();}
function lcBack(){const r=st.result,m={type:'fl-lc',k:P.lc.k,t:P.lc.t,done:!!r,correct:!!(r&&r.correct),grade:r?r.grade:'',steps:st.steps,par:P.par,quick:!!(r&&r.correct&&st.steps<=P.par+2)};
  if(window.parent&&window.parent!==window)window.parent.postMessage(m,location.origin==='null'?'*':location.origin);else location.href='../control-room/';}
function save(){if(P&&P.daily)ls(dailyKey(),JSON.stringify({ops:st.ops,f:st.result?st.result.f:null}));}
// one operation on the puzzle in play: log it and add it to the result grid
function apply(k,a){const r=operate(st,k,a);if(r.noop||r.refused)return r;
  st.log.push({t:r.t,txt:r.txt+(r.man?` (a crew drove out to operate it: ${MANUAL_MIN} min)`:''),lvl:r.trip?'alarm':'ok'});
  st.moves+=r.code;st.ops.push(k+':'+a);return r;}
// apply an operation now (the test hook and remote switches)
function act(k,a){if(!st||st.ended)return null;const r=apply(k,a);
  if(r.noop){toast(`The ${devName(k)} is already ${a==='open'?'open':'closed'}.`);return r;}
  if(r.refused){toast(r.refused);return r;}
  save();closeSheet();render();if(r.trip)flash();return r;}
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
function doHint(){const m=nextMove(st);st.hints++;st.moves+='i';st.ops.push('hint');
  st.log.push({t:P.t0+st.mins,txt:'Hint: '+m.why,lvl:'hint'});return m;}
function hint(){if(!st||st.ended||busy)return;const m=doHint();save();render();
  if(m.k!=null)select(m.k);else if(m.declare!=null)select('s'+m.declare);}
function declare(f){if(!st||st.ended)return;finish(f,false);save();closeSheet();render();showEnd();}
// end the puzzle and score it. replay: rebuilding today's finished puzzle after a reload, so nothing is counted twice.
function finish(f,replay){st.ended=true;
  const s=st,F=P.fault,A=fedA(s),B=fedB(s),correct=f===F,on=i=>A.has(i)||B.has(i);
  const iso=!on(F)&&(F>=P.n?!s.sp[F-P.n]:(F===0?!s.cb||!s.sw[0]:!s.sw[F-1])&&(F===P.n-1?!s.nop:!s.sw[F]));
  // spurs teed off a faulted main section can't come back until it's repaired
  const lost=i=>i===F||(F<P.n&&i>=P.n&&P.secs[i].tee===F);
  const healthyOff=P.secs.reduce((a,x,i)=>a+(!lost(i)&&!on(i)?x.cust:0),0);
  const d=s.steps-P.par;let pts=1000+(d<0?-d*50:-d*40)-s.trips*100-s.nbTrips*250-s.hints*50-Math.round(s.cml/500)-(correct?0:400)-(iso?0:200)-Math.round(healthyOff/2);
  pts=Math.max(0,pts);const grade=pts>=900?'A':pts>=750?'B':pts>=600?'C':pts>=400?'D':'E';
  s.result={f,correct,iso,healthyOff,pts,grade,d};if(replay)return;
  ls('played',String(+(ls('played')||0)+1));
  if(P.lc)return;
  if(P.career!=null){const id=CAREER[P.career].id,before=carPassed(),c=carStars(),n=starsFor(s.result),best=Math.max(c[id]||0,n);c[id]=best;ls('career',JSON.stringify({s:c}));
    const after=carPassed();s.result.car={stars:n,best,promo:rankOf(after)!==rankOf(before)?rankOf(after):null};return;}
  if(P.daily){let k={};try{k=JSON.parse(ls('streak')||'{}')||{};}catch(e){}
    if(k.last!==P.daily){const n=k.last===dayBefore(P.daily)?(k.n||0)+1:1;k={last:P.daily,n,best:Math.max(k.best||0,n)};ls('streak',JSON.stringify(k));}}
  else{let best={};try{best=JSON.parse(ls('best')||'{}')||{};}catch(e){}if(!(best[P.level]>=pts)){best[P.level]=pts;ls('best',JSON.stringify(best));}}}
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
function svg(){const s=st,A=fedA(s),B=fedB(s),on=i=>A.has(i)||B.has(i),L=LEVELS[P.level],C=P.showCand&&!s.ended?new Set(candidates(s)):null,last=LY[P.n-1],H=last.sw+66;
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
    o+=dev(k,X,y,w.manual,s.sw[i])+(w.rec?`<text class="ar ${s.sw[i]?'c':'o'}" x="${X}" y="${y+3.5}" text-anchor="middle">AR</text>`:'')+`<text class="t-km" x="${X-20}" y="${y+16}" text-anchor="end">${(P.secs[i+1].from).toFixed(1)} km</text>`+fpi(w,fpiFlag(i),X-56,y);
    o+=`<rect class="hit" data-sel="${k}" x="${X-24}" y="${y-22}" width="48" height="44"/>`;});
  {const y=TOP-SW-12;o+=`<g data-dev="cb" class="devg"><rect class="dev cb${s.cb?'':' open'}${sel==='cb'?' sel':''}" x="${X-SW-1}" y="${y-SW-1}" width="${SW*2+2}" height="${SW*2+2}" rx="2"/></g><text class="t-dev" x="${X+20}" y="${y+5}">Feeder breaker</text><rect class="hit" data-sel="cb" x="${X-26}" y="${y-22}" width="140" height="44"/>`;}
  {const y=last.sw;o+=dev('nop',X,y,P.nopManual,s.nop)+`<text class="t-dev" x="${X+20}" y="${y+5}">Normally open point</text>`;
    o+=`<path class="cond live nb" d="M${X} ${y+SW} V${y+44} H350"/><text class="t-nb" x="350" y="${y+37}" text-anchor="end">To ${esc(P.neighbour)} primary (live)</text>`;
    o+=`<rect class="hit" data-sel="nop" x="${X-26}" y="${y-22}" width="160" height="44"/>`;}
  if(crew)o+=`<g id="crew" class="crew${crew.at?'':' home'}" transform="translate(${crew.x.toFixed(1)} ${crew.y.toFixed(1)}) scale(1.35)">${CREW}</g>`;
  return o+'</svg>';}
function render(){if(!P)return;const s=st;
  const daily=!!P.daily,car=P.career!=null,lc=!!P.lc,today=todayUK(),dl=LEVELS[dailyLevel(today)].name;
  $('modeName').textContent=daily?`Daily #${P.no}`:car?`Career ${P.career+1}/${CAREER.length}`:lc?'Losing Control':'Practice';
  $('lvl').textContent=car?CAREER[P.career].title:lc?'Find it yourself':LEVELS[P.level].name;
  $('modes').hidden=lc;$('lcBar').hidden=!lc;if(lc)$('lcFeeder').textContent=`${P.feeder} feeder at ${P.primary}`;
  $('carTag').textContent=`${rankOf(carPassed())} · ${carTotal()}★`;
  document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(!daily&&b.dataset.level===P.level)));
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  let done=null;try{done=JSON.parse(ls('day-'+today)||'null');}catch(e){}
  $('dailyTag').textContent=`#${dayNo(today)} · ${dl}`+(done&&done.f!=null?' · done ✓':'');
  $('pracTag').textContent=games.practice?LEVELS[games.practice.P.level].name:'Random puzzles';
  const nb=$('newBtn');nb.textContent=daily?'Results':car?'Puzzles':lc?'Back to shift':'New puzzle';nb.disabled=daily&&!s.ended;
  $('stSteps').textContent=s.steps;$('stPar').textContent=P.par;$('stOff').textContent=nf(custOff(s));$('stTime').textContent=fmtT(P.t0+s.mins);$('stTrips').textContent=s.trips+s.nbTrips;
  $('stOffBox').classList.toggle('bad',custOff(s)>0);
  $('legAr').hidden=!P.sw.some(w=>w.rec);
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
// shake only the drawing that shows the trip: the next redraw replaces it, so later switching doesn't shake
function flash(){const v=$('diagram').querySelector('.fl-svg');if(v)v.classList.add('trip');}
function showEnd(){const r=st.result,s=st,F=P.secs[P.fault],daily=!!P.daily,car=P.career!=null,lc=!!P.lc;
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
      <li class="tot"><span>Score</span><b>${nf(r.pts)}</b></li></ul>`+(daily?dailyEnd():car?careerEnd():lc?lcEnd():'');
  const nx=car&&r.correct&&CAREER[P.career+1];
  $('endLevel').textContent=daily||lc?'See the feeder':car?'All puzzles':'Change level';
  $('endNext').textContent=daily?'Practice':car?(nx?'Next puzzle':'Try again'):lc?'Back to the shift':'Next puzzle';
  $('endOv').hidden=false;$('endNext').focus();if(daily)loadBoard();}
// today's puzzle: the result grid, share, the scoreboard
const getName=()=>{try{return localStorage.getItem('fc-name')||'';}catch(e){return '';}};   // shared with Losing Control
const saveName=n=>{try{localStorage.setItem('fc-name',n);}catch(e){}};
const subKey=()=>'sub-'+P.daily;
function lcEnd(){const r=st.result;return `<div class="daily-end"><p>${r.correct?`Back in the control room, the fault on the ${esc(P.feeder)} feeder counts as found, so the repair starts now instead of waiting for line patrol.${st.steps<=P.par+2?' A quick find (within two steps of par): the crew arrives knowing exactly where to go, so the repair is shorter too.':''} You still need to switch the healthy half back on there.`:'Wrong section, so the crew found nothing there. Back in the control room, line patrol carries on looking.'}</p></div>`;}
function dailyEnd(){let k={},sub=null;try{k=JSON.parse(ls('streak')||'{}')||{};sub=JSON.parse(ls(subKey())||'null');}catch(e){}
  return `<div class="daily-end">
    <h3>Today's result · #${P.no}</h3>
    <div class="grid-box"><pre class="grid" aria-label="Your moves as coloured squares">${gridRows(st).join('\n')}</pre>
      <p class="fine grid-key">⬜ open · 🟩 close held · 🟥 tripped · 🟧 neighbour tripped · 💡 hint · ✅ found · ⬛ wrong</p></div>
    ${k.last===P.daily&&k.n>1?`<p class="streak">Streak: <b>${k.n} days</b>${k.best>k.n?` · best ${k.best}`:''}</p>`:''}
    <div class="row l"><button type="button" class="btn primary" id="shareBtn">Share result</button><span class="fine" id="shareMsg" role="status"></span></div>
    <h3>Today's scoreboard</h3>
    ${sub?`<p class="fine ok" id="subMsg">Submitted as ${esc(sub.name)}: #${sub.rank} of ${sub.total} when you sent it.</p>`:
      `<div class="sub-row"><input id="pName" type="text" maxlength="20" autocomplete="nickname" placeholder="Your name" aria-label="Your name" value="${esc(getName())}"><button type="button" class="btn" id="submitBtn">Add my score</button></div><p class="fine" id="subMsg" role="status">One go a day: your first score counts.</p>`}
    <div id="board" class="board"></div>
    <p class="fine">A new puzzle every day at midnight (UK time). Mon–Tue Easy, Wed–Thu Medium, Fri–Sun Hard.</p>
    <p class="fine">Fancy a longer go? <a href="../control-room/">Play Losing Control</a>, the control room game.</p></div>`;}
async function share(){const t=shareText(),m=v=>{const e=$('shareMsg');if(e)e.textContent=v;};
  try{if(navigator.share){await navigator.share({text:t});m('Shared.');return;}}catch(e){if(e&&e.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(t);m('Copied. Paste it into a message or post.');return;}catch(e){}
  const row=$('shareBtn').parentNode;if(!$('shareTxt')){const ta=document.createElement('textarea');ta.id='shareTxt';ta.className='share-txt';ta.rows=5;ta.readOnly=true;ta.value=t;row.after(ta);}
  $('shareTxt').select();m('Copy this to share it.');}
const subMsg=(t,c)=>{const e=$('subMsg');if(e){e.textContent=t;e.className='fine '+(c||'');}};
async function submitScore(){const inp=$('pName'),btn=$('submitBtn');if(!inp||!st.result||!P.daily)return;
  const nm=inp.value.trim().replace(/\s+/g,' ').slice(0,20);if(nm.length<2){subMsg('Enter your name first.','err');inp.focus();return;}
  saveName(nm);btn.disabled=true;subMsg('Sending…');const r=st.result,date=P.daily;
  try{const res=await fetch(SCORE_URL,{method:'POST',body:JSON.stringify({game:'fl',site:location.hostname,name:nm,day:P.level,mode:'fl-daily-'+date,
      steps:st.steps,par:P.par,trips:st.trips,nbTrips:st.nbTrips,hints:st.hints,cml:Math.round(st.cml),correct:r.correct,iso:r.iso,healthyOff:r.healthyOff,moves:st.moves})});
    const j=await res.json();
    if(!j.ok){if(j.error==='name'){btn.disabled=false;subMsg('Please choose a different name.','err');return;}
      if(j.error==='site'){subMsg(`Scores can only be saved on the original game at ${HOME_HOST}.`,'err');return;}
      if(!(j.version>=22)){subMsg("Today's scoreboard isn't switched on yet, so this score wasn't saved.",'err');return;}throw new Error(j.error);}
    ls('sub-'+date,JSON.stringify({name:j.name||nm,rank:j.rank,total:j.total}));inp.disabled=true;btn.textContent='Added';
    subMsg(j.repeat?`You'd already sent a score today, so that one stands: #${j.rank} of ${j.total}.`:`Added. You're #${j.rank} of ${j.total} today.`,'ok');loadBoard();
  }catch(e){btn.disabled=false;subMsg("Couldn't reach the scoreboard, so your score wasn't saved. Try again in a moment.",'err');}}
async function loadBoard(){const el=$('board'),date=P&&P.daily;if(!el||!date)return;el.innerHTML='<p class="fine">Loading scores…</p>';
  let me='';try{me=(JSON.parse(ls('sub-'+date)||'null')||{}).name||'';}catch(e){}
  try{const res=await fetch(SCORE_URL+'?game=fl&mode='+encodeURIComponent('fl-daily-'+date));const j=await res.json();if(!$('board')||!P||P.daily!==date)return;
    if(!j.ok||!(j.version>=22)){el.innerHTML='<p class="fine">Today\'s scoreboard is coming soon.</p>';return;}
    if(!j.scores.length){el.innerHTML='<p class="fine">No scores yet today. Be the first.</p>';return;}
    el.innerHTML=`<table class="board-t"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Steps</th><th>Grade</th></tr></thead><tbody>${j.scores.slice(0,10).map((x,i)=>
      `<tr class="${me&&x.name.toLowerCase()===me.toLowerCase()?'me':''}"><td>${i+1}</td><td class="nm">${esc(x.name)}</td><td>${nf(x.score)}</td><td>${x.steps}/${x.par}${x.correct?'':' ⬛'}</td><td>${esc(x.grade)}</td></tr>`).join('')}</tbody></table>`+
      (j.scores.length>10?`<p class="fine">${j.scores.length} players today.</p>`:'');
  }catch(e){if($('board'))el.innerHTML='<p class="fine">Couldn\'t load the scoreboard. Check your connection.</p>';}}
function showHelp(on){$('helpOv').hidden=!on;if(on)$('helpGo').focus();}

/* ---------- Events ---------- */
document.addEventListener('click',e=>{const t=e.target;
  const h=t.closest('[data-sel]');if(h&&(!st.ended||h.dataset.sel[0]==='s')){select(h.dataset.sel);return;}
  const a=t.closest('[data-act]');if(a){actUI(a.dataset.k,a.dataset.act);return;}
  const d=t.closest('[data-declare]');if(d){declare(+d.dataset.declare);return;}
  if(t.closest('[data-close]')){closeSheet();return;}
  const lv=t.closest('[data-level]');if(lv){newPuzzle(lv.dataset.level);showHelp(false);return;}
  const md=t.closest('[data-mode]');if(md){setMode(md.dataset.mode);return;}
  if(t.id==='hintBtn'){hint();return;}
  if(t.id==='shareBtn'){share();return;}
  if(t.id==='submitBtn'){submitScore();return;}
  const cr=t.closest('[data-car]');if(cr){$('carOv').hidden=true;startCareer(+cr.dataset.car);return;}
  if(t.closest('[data-carlist]')){showCareer('list');return;}
  if(t.closest('[data-carclose]')){$('carOv').hidden=true;return;}
  if(t.id==='newBtn'&&P&&P.daily){if(st.ended)showEnd();return;}
  if(t.id==='endNext'&&P&&P.daily){setMode('practice');return;}
  if(t.id==='newBtn'&&P&&P.career!=null){showCareer('list');return;}
  if(t.id==='endNext'&&P&&P.career!=null){const nx=st.result.correct&&CAREER[P.career+1];$('endOv').hidden=true;startCareer(nx?P.career+1:P.career);return;}
  if(P&&P.lc&&(t.id==='newBtn'||t.id==='endNext')){lcBack();return;}
  if(t.id==='newBtn'||t.id==='endNext'){newPuzzle(P&&P.level);return;}
  if(t.id==='helpBtn'){showHelp(true);return;}
  if(t.id==='helpGo'){showHelp(false);ls('seen','1');return;}
  if(t.id==='endLevel'){$('endOv').hidden=true;if(P.career!=null)showCareer('list');else if(!P.daily&&!P.lc)showHelp(true);return;}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='pName')submitScore();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('helpOv').hidden)showHelp(false);else if(!$('carOv').hidden)$('carOv').hidden=true;else closeSheet();}});

// opened from Losing Control: that feeder. Otherwise today's puzzle, unless it's already done today: then practice.
{const lc=lcParams();if(lc)startLc(lc);else{let d=null;try{d=JSON.parse(ls('day-'+todayUK())||'null');}catch(e){}if(d&&d.f!=null)newPuzzle();else startDaily();
  if(!ls('seen'))showHelp(true);}}
window.__fl={get P(){return P;},get st(){return st;},get crew(){return crew;},get busy(){return busy;},get mode(){return mode;},custom:(lv,seed,opt)=>{stash();mode='practice';setUp(lv,seed,opt);games.practice={P,st,crew};show();},newPuzzle,startDaily,setMode,startCareer,showCareer,startLc,lcBack,makePuzzle,CAREER,act,actUI,declare,hint,operate,candidates,nextMove,fedA,fedB,custOff,todayUK,dailyLevel,dayNo,shareText,gridRows,submitScore,loadBoard};
