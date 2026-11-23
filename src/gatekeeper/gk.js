'use strict';
/* Gatekeeper (Watts Up): the connections and planning game. You are the connections and planning engineer for
   Blackout Canyon over a ten-year career, one year per round. Applications arrive in a queue; you make each one
   an offer (firm, firm after reinforcement, flexible, timed, hold, refuse), customers respond, you plan
   reinforcement, then the year plays out and you get a report card. Close to GB rules with some artistic licence:
   first come first served until the Gate 2 reform, milestones, flexible connections managed by ANM on a
   last in, first off basis with a curtailment limit (Access SCR style), demand customers pay nothing towards
   reinforcement, generation pays a share.

   Time model: 12 months x 3 day types (weekday, windy weekday, sunny weekend) x 24 hours = 864 points, each
   weighted by the number of days it stands for. Planning (firm headroom) uses worst-case profiles; the year
   itself runs on actual profiles with ANM curtailing flexible customers. */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Math.round(n).toLocaleString('en-GB');
const f1=n=>(Math.round(n*10)/10).toFixed(1);
const money=m=>'£'+(Math.abs(m)<100?f1(m):nf(m))+'m';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rngFrom(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const rngFor=(...k)=>rngFrom(hashStr(k.join('|')));
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem('gk-'+k);if(v===null)localStorage.removeItem('gk-'+k);else localStorage.setItem('gk-'+k,v);}catch(e){return null;}};
const YEARS=10,SAVE_V=1,BUDGET=8,AMBER_H=200,CUST_PER_MW=400;
const SCORE_URL='https://script.google.com/macros/s/AKfycbx_0hkrfzn5_ApQWr3UwqT-p7SuOf8ubJHBLxNGGQECIbDEJzfIRNRsWquE--FUOhmMNg/exec';
const HOME_HOST='www.wattsupelectricity.co.uk',LC_URL='../control-room/#gk';
// the UK date, and the Monday of this week (the week's canyon changes at UK midnight on Monday)
function todayUK(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch(e){return new Date().toISOString().slice(0,10);}}
function mondayOf(d){const[y,m,da]=d.split('-').map(Number),t=Date.UTC(y,m-1,da),wd=(new Date(t).getUTCDay()+6)%7;return new Date(t-wd*864e5).toISOString().slice(0,10);}
const weekSeed=monday=>hashStr('gatekeeper|week|'+monday);
const fmtDay=d=>{const[y,m,da]=d.split('-').map(Number);return new Date(Date.UTC(y,m-1,da)).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});};

/* ---------- Time model ---------- */
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_L=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DT=[{id:'wd',w:5/7*.9},{id:'wy',w:5/7*.1,windy:1},{id:'we',w:2/7,sunny:1}];
const PTS=[];
for(let m=0;m<12;m++)for(let d=0;d<DT.length;d++)for(let h=0;h<24;h++)PTS.push({m,d:DT[d],h,wt:365/12*DT[d].w,s:(1+Math.cos(2*Math.PI*m/12))/2});
const NP=PTS.length;
const DAILY=[.55,.52,.5,.5,.52,.58,.7,.82,.86,.84,.82,.8,.79,.78,.78,.8,.88,.98,1,.95,.86,.76,.66,.6];
const EVD=[.1,.06,.05,.05,.05,.08,.15,.3,.4,.4,.4,.45,.5,.5,.5,.6,.8,1,1,.95,.8,.6,.35,.2];
const HPD=[.5,.45,.45,.45,.5,.7,.9,1,.85,.7,.6,.55,.5,.5,.55,.65,.85,.95,1,.95,.85,.75,.65,.55];
const P_BASE=PTS.map(p=>(.62+.38*p.s)*DAILY[p.h]*(p.d.sunny?.82:1));
function solarClear(p){const c=Math.cos(2*Math.PI*(p.m-5.5)/12),dl=12+4.3*c,x=(p.h+.5-(13-dl/2))/dl;
  return x<=0||x>=1?0:Math.pow(Math.sin(Math.PI*x),1.3)*(.55+.4*c);}
const P_SOLAR_CLEAR=PTS.map(solarClear);
const P_SOLAR=PTS.map((p,i)=>P_SOLAR_CLEAR[i]*(p.d.sunny?1:p.d.windy?.4:.55));
const P_WIND=PTS.map(p=>p.d.windy?.85:.25+.15*p.s);
const P_CHP=PTS.map(p=>!p.d.sunny&&p.h>=7&&p.h<22?.4+.6*p.s:.1);
const P_EVHUB=PTS.map(p=>EVD[p.h]*(.85+.15*p.s)*(p.d.sunny?.8:1));
const P_DEPOT=PTS.map(p=>p.h>=17&&p.h<21?1:p.h>=21||p.h<6?.5:.1);   // the vans come back at teatime and plug straight in
const P_DEPOT_T=PTS.map(p=>p.h>=22||p.h<6?.85:0);                    // timed: overnight only
const P_HP=PTS.map(p=>(.25+.75*p.s)*HPD[p.h]*(p.d.sunny?.95:1));
const P_DC=PTS.map(p=>.8+.12*(1-p.s));
const battImpOK=h=>h<6||h>=22||(h>=10&&h<16),battExpOK=h=>(h>=16&&h<20)||(h>=7&&h<9);
// battery behaviour, + import (charging), - export: follows the market. Charges on windy evenings, which is the
// winter peak: that's the risk of a firm battery. Timed: only charges and exports in the agreed hours.
function battAct(p,timed){const h=p.h;let v=0;
  if(p.d.windy){if(h>=16&&h<20)v=1;else if(h>=7&&h<9)v=-.6;}
  else if(p.d.sunny){if(h>=11&&h<15)v=1;else if(h>=17&&h<20)v=-1;}
  else{if(h>=1&&h<5)v=.7;else if(h>=11&&h<14)v=.4*(1-p.s)+.1;else if(h>=17&&h<20)v=-1;else if(h>=7&&h<9)v=-.4;}
  if(timed){if(v>0&&!battImpOK(h))v=0;if(v<0&&!battExpOK(h))v=0;if(p.d.windy&&h>=0&&h<4)v=1;}
  return v;}
const UNIT={};
// a customer's profile per MW: act (what it actually does), imp and exp (what planning has to allow for)
function unit(kind,sub,timed){const k=kind+'|'+(sub||'')+'|'+(timed?1:0);if(UNIT[k])return UNIT[k];
  const act=new Float64Array(NP),imp=new Float64Array(NP),exp=new Float64Array(NP);
  for(let i=0;i<NP;i++){const p=PTS[i];let a=0,pi=0,pe=0;
    switch(kind){
      case 'solar':a=-P_SOLAR[i];pe=P_SOLAR_CLEAR[i];break;
      case 'wind':a=-P_WIND[i];pe=1;break;
      case 'chp':a=-P_CHP[i];pe=1;break;
      case 'batt':a=battAct(p,timed);pi=timed?(battImpOK(p.h)?1:0):1;pe=timed?(battExpOK(p.h)?1:0):1;break;
      case 'ev':a=sub==='depot'?(timed?P_DEPOT_T[i]:P_DEPOT[i]):P_EVHUB[i];pi=a;break;
      case 'homes':a=P_HP[i];pi=a;break;
      case 'dc':a=P_DC[i];pi=Math.max(a,.95);break;}
    act[i]=a;imp[i]=pi;exp[i]=pe;}
  return UNIT[k]={act,imp,exp};}
const U=c=>unit(c.kind,c.sub,c.offer==='timed');

/* ---------- Network ---------- */
const PRIMS={
  hw:{name:'Hertz House',F:45,R:38,FL:30,peak:32,area:'town'},
  ml:{name:'Shocking Place',F:30,R:26,FL:25,peak:18,area:'rural'},
  rv:{name:'Ohm No',F:40,R:32,FL:22,peak:26,area:'rural'},
  js:{name:'Joule Street',F:45,R:36,FL:30,peak:37,area:'town'},
  kc:{name:'Kilowatt Close',F:35,R:28,FL:30,peak:0,area:'new'}};
const GSP0={F:150,R:100};
const KINDS={
  solar:{name:'Solar farm',ic:'☀️',gen:1,mw:[5,25],fl:.25,tol:8,pat:2,spec:.3,at:['ml','rv','ml','rv','hw']},
  batt:{name:'Battery storage',ic:'🔋',gen:1,dem:1,mw:[5,25],fl:.35,tol:10,pat:2,spec:.45,at:['hw','ml','rv','js']},
  ev:{name:'EV charging',ic:'🔌',dem:1,mw:[2,8],tol:3,pat:1,spec:.15,at:['js','hw','rv','js']},
  homes:{name:'Housing estate',ic:'🏘️',dem:1,mw:[1,5],tol:0,pat:2,spec:.05,noFlex:1,at:['js','hw','js','hw','rv']},
  dc:{name:'Data centre',ic:'🖥️',dem:1,mw:[12,28],tol:1.5,pat:1,spec:.45,at:['hw','rv','js']},
  wind:{name:'Wind farm',ic:'🌬️',gen:1,fl:.5},chp:{name:'Gas CHP',ic:'🔥',gen:1,fl:1}};
const NAMES={
  solar:['Sunny Side Solar','Ray Of Light Solar','Photon Farm','Sun Dial Fields','Bright Acres Solar','Daylight Robbery Solar','Solar Plexus','Glare Necessities Farm','Here Comes The Sun Farm','Sunny Delight Fields','Beam Me Up Solar'],
  batt:['Volt Vault','Amp Up Storage','Power Bank Holiday','Stored Glory','Cell Block H','Lithium Grove','Charge Of The Light Brigade','Megawatt Hours Ltd'],
  hub:['Plug & Play Services','Charge Ahead Hub','Juice Box Services','Watt A Charge Hub','Fast Lane Chargers'],
  depot:['Van Diesel No More Depot','Kingswatt Bus Depot','Parcel Force Field Depot','Fleet Street Depot','Last Mile Depot'],
  homes:['Pylon Park','Meadow Rise','Heatpump Heights','Cosy Close','Orchard Grange','Radiator Row','Thermostat Gardens','Underfloor Fields'],
  dc:['Byte Me Data Centre','Cloud Nein','Server Ville','Gigawatt Gateway','Data Mine','Cache Point','The Hard Drive']};
const BUILDS={
  tx:{name:'Uprate the transformers',cost:5,yrs:2,max:2,what:'+15 MW firm demand, +12 MW export'},
  fl:{name:'New switchgear',cost:2,yrs:1,max:2,what:'+15 MVA fault level'},
  gsp:{name:'Fourth supergrid transformer at Blackout Canyon',cost:12,yrs:3,max:1,what:'+60 MW demand, +50 MW export at the grid supply point'},
  kc:{name:'New primary: Kilowatt Close',cost:10,yrs:3,max:1,what:'Takes a quarter of Joule Street and a sixth of Hertz House demand, and opens a new area for connections'}};
const FLEX_COST=.4,FLEX_MW=5;
const GROWTH=[0,0,.015,.018,.02,.022,.025,.028,.032,.04,.055];   // underlying demand growth at the start of each year (EVs, heat pumps)
const EVENTS={
  2:{t:'Cold winter forecast',b:'The Met Office expects a cold winter. Peak demand will run about 5% above your planning forecast this year, and your headroom figures don\'t know that.',fx:s=>{s.weather=1.05;}},
  3:{t:'Ofgem reform: Gate 2',b:'The queue moves from first come, first served to <b>first ready and needed, first connected</b>. From now on, generation and storage need Gate 2 before you give them a confirmed date: <b>ready</b> (land rights and planning) and <b>needed</b> (in the regional plan, which says Shocking Place already has all the solar it needs). Projects that pass go to the front of the queue; the rest go on the Gate 1 waiting list. And contracted projects that miss their milestones can now be removed from the queue: do it, or they keep sitting on headroom.',fx:s=>{s.reform=true;}},
  4:{t:'Landowner objection',b:'A landowner has objected to your cable route. Your furthest-along reinforcement is delayed by a year.',fx:s=>{const b=s.builds.filter(b=>!b.applied).sort((a,b)=>a.done-b.done)[0];if(b){b.done++;s.cust.forEach(c=>{if(!c.gone&&!c.built&&c.waitB&&c.waitB.includes(b.id))c.conn=Math.max(c.conn,b.done);});s.evNote=`${BUILDS[b.kind].name}${b.prim?' at '+PRIMS[b.prim].name:''} now ready in year ${b.done}.`;}else s.evNote='Luckily you had nothing under construction, so nothing is held up.';}},
  5:{t:'Flexible by default',b:'Ofgem expects network operators to offer flexible connections first wherever they speed things up. Customers know it too: they\'ll put up with half as much curtailment again as before.',fx:s=>{s.flexDefault=true;}},
  6:{t:'Demand connections reform',b:'Data centres are queuing up across the country, and a lot of them are speculative. Demand projects now need Gate 2 too: land rights, planning, and a place in the plan. Data centres are only needed in the AI growth zone at Hertz House (and Kilowatt Close, if you build it).',fx:s=>{s.demandReform=true;}},
  7:{t:'A big customer cancels',b:'',fx:s=>{const c=s.cust.filter(c=>!c.gone&&!c.existing&&c.offer!=='flex').sort((a,b)=>b.mw-a.mw)[0];if(c){c.gone=true;s.evNote=`${c.name} (${f1(c.mw)} MW at ${PRIMS[c.prim].name}) has pulled out${c.built?' and disconnected':''}, freeing up its headroom.`;}else s.evNote='Nobody to cancel: your queue is all flexible.';}},
  8:{t:'Storm season',b:'Two deep lows are forecast to cross Blackout Canyon this winter. Two storms this year instead of one: wherever you are over firm capacity, customers will go off.',fx:s=>{s.storms=2;}},
  9:{t:'Another cold winter',b:'A cold winter is forecast again: peak demand about 5% above plan.',fx:s=>{s.weather=1.05;}},
  10:{t:'The net zero year',b:'Heat pumps and EVs at full speed: underlying demand grows 5.5% this year. Every application left in the queue wants connecting.',fx:()=>{}}};

/* ---------- State ---------- */
let S=null,selApp=null,selPrim=null,playTimer=null;
function newCareer(seed,mode,week){
  S={v:SAVE_V,seed:seed>>>0,mode:mode||'free',week:week||null,t:Date.now(),year:0,seq:1,nextId:1,cap:{},gsp:{...GSP0},peak:{},prims:['hw','ml','rv','js'],kc:false,
    builds:[],cust:[],queue:[],held:[],reform:false,flexDefault:false,demandReform:false,weather:1,storms:1,
    flexBuy:{},spend:0,yr:null,hist:[],phase:'queue',resp:null,report:null,evNote:'',usedNames:[]};
  Object.keys(PRIMS).forEach(p=>{S.cap[p]={F:PRIMS[p].F,R:PRIMS[p].R,FL:PRIMS[p].FL};S.peak[p]=PRIMS[p].peak;});
  const ex=(name,kind,mw,prim)=>S.cust.push({id:S.nextId++,seq:0,name,kind,mw,prim,offer:'firm',built:true,existing:true,acc:0,conn:0,land:true,planning:true});
  ex('Shocking Place Solar Farm','solar',10,'ml');ex('Spinney Windy Things','wind',12,'rv');ex('Ohm No CHP','chp',8,'rv');
  // inherited from your predecessor: contracted but not connected, first come first served
  const inh=(name,kind,mw,prim,spec,land,planning,conn,sub)=>{S.cust.push({id:S.nextId++,seq:S.seq++,name,kind,sub,mw,prim,offer:'firm',built:false,inherited:true,spec,land,planning,acc:0,conn,tol:KINDS[kind].tol,pat:2});S.usedNames.push(name);};
  inh('Sunbeam Meadows Solar','solar',20,'ml',true,false,false,1);
  inh('Kings Hill Battery 2','batt',15,'hw',true,true,false,2);
  inh('Meadow Rise','homes',3,'js',false,true,false,2);
  startYear();}

function startYear(){
  S.year++;S.weather=1;S.storms=1;S.flexBuy={};S.spend=0;S.evNote='';
  if(S.year>1)Object.keys(S.peak).forEach(p=>S.peak[p]*=1+GROWTH[S.year]);
  const ev=EVENTS[S.year];if(ev)ev.fx(S);
  // build spend continues each year a job is under construction
  S.builds.forEach(b=>{if(!b.applied&&b.done<=S.year)applyBuild(S,b);});
  S.builds.forEach(b=>{if(!b.applied&&b.start<S.year)S.spend+=b.yearCost;});
  energise();
  S.yr={complaints:0,g2:0,notes:[],genMW:0,accMW:0,delay:[],comp:0};
  const r=rngFor(S.seed,'storm',S.year);S.stormPlan=[];
  for(let k=0;k<S.storms;k++)S.stormPlan.push({p:S.prims[Math.floor(r()*S.prims.length)],m:[0,1,11][Math.floor(r()*3)]});
  // held applications come back (some speculative ones quietly withdraw); then the new ones
  const back=[];S.held.forEach(a=>{const rr=rngFor(S.seed,'held',S.year,a.id)();
    if(a.spec&&rr<.6)return;
    if(!a.spec&&!a.planning&&rr<.6)a.planning=true;else if(!a.spec&&!a.land&&rr<.5)a.land=true;
    a.pat--;a.back=true;delete a.choice;back.push(a);});
  S.held=[];S.queue=back.concat(makeApps());S.queue.forEach((a,i)=>a.app=i+1);queueSort();
  S.phase='queue';S.resp=null;S.report=null;selApp=null;
  save();}

// Before the reform, the queue is in the order applications arrived (last year's held ones first). After it, projects
// that meet Gate 2 (ready and needed) go ahead of earlier ones that don't: first ready and needed, first connected.
function queueSort(){if(!S.reform)return;const k=a=>g2Applies(a)&&!gate2(a)?1:0;
  S.queue=S.queue.map((a,i)=>[a,i]).sort((x,y)=>k(x[0])-k(y[0])||x[1]-y[1]).map(x=>x[0]);}
function makeApps(){const r=rngFor(S.seed,'apps',S.year),y=S.year,out=[];
  const n=4+Math.ceil(y*.45);
  const w={solar:3,batt:y>=2?2:.6,ev:1+y*.25,homes:2,dc:y>=6?2+(y-6)*.6:y>=4?.5:0};
  if(y===10){w.homes=3;w.ev=4;}
  const tot=Object.values(w).reduce((a,b)=>a+b,0);
  for(let k=0;k<n;k++){let x=r()*tot,kind='solar';for(const kk in w){x-=w[kk];if(x<=0){kind=kk;break;}}
    const K=KINDS[kind];let sub=kind==='ev'?(r()<.5?'hub':'depot'):undefined;
    let mw=K.mw[0]+r()*(K.mw[1]-K.mw[0]);if(kind==='dc')mw+=y>=8?5:0;mw=kind==='homes'||kind==='ev'?Math.round(mw*2)/2:Math.round(mw);
    const at=K.at.concat(S.kc&&(kind==='homes'||kind==='ev'||kind==='dc')?['kc','kc']:[]);
    const prim=at[Math.floor(r()*at.length)];
    const spec=r()<K.spec;
    const land=spec?r()<.25:r()<.85,planning=spec?r()<.1:r()<.6;
    const list=NAMES[sub||kind];let name=list[Math.floor(r()*list.length)];
    let nm=name,i=2;while(S.usedNames.includes(nm))nm=name+' '+(['','','II','III','IV','V','VI'][i]||('Phase '+i)),i++;S.usedNames.push(nm);
    out.push({id:S.nextId++,name:nm,kind,sub,mw,prim,spec,land,planning,tol:Math.round(K.tol*(.7+.6*r())*10)/10,pat:K.pat+(r()<.3?1:0)});}
  return out;}

function applyBuild(s,b){b.applied=true;
  if(b.kind==='tx'){s.cap[b.prim].F+=15;s.cap[b.prim].R+=12;}
  else if(b.kind==='fl')s.cap[b.prim].FL+=15;
  else if(b.kind==='gsp'){s.gsp.F+=60;s.gsp.R+=50;}
  else if(b.kind==='kc'){s.kc=true;if(!s.prims.includes('kc'))s.prims.push('kc');s.peak.kc=.25*s.peak.js+.15*s.peak.hw;s.peak.js*=.75;s.peak.hw*=.85;}}
const readyDelay=c=>c.spec?Infinity:(c.land?0:1)+(c.planning?0:1);
function energise(){S.cust.forEach(c=>{if(!c.gone&&!c.built&&!c.spec&&S.year>=c.conn+(c.slip||0)&&(!c.waitB||c.waitB.every(id=>{const b=S.builds.find(x=>x.id===id);return b&&b.applied;})))c.built=true;});}
const missed=c=>!c.gone&&!c.built&&!c.existing&&S.year>c.conn;
// "Needed": the regional plan (an artistic take on Clean Power 2030 and the strategic plan) says what each area needs.
// Shocking Place already has all the solar the plan wants; data centres are needed only in the AI growth zone at
// Hertz House (and Kilowatt Close once it's built). Storage, housing and EV charging are needed everywhere.
const needed=a=>a.kind==='solar'?a.prim!=='ml':a.kind==='dc'?(a.prim==='hw'||a.prim==='kc'):true;
const gate2=a=>a.land&&a.planning&&needed(a);
const g2Applies=a=>S.reform&&(KINDS[a.kind].gen||S.demandReform);

/* ---------- Network configuration (with builds still under construction, or proposed ones) ---------- */
function cfg(s,extra,inProg){const C={cap:{},gsp:{...s.gsp},peak:{...s.peak},prims:s.prims.slice()};
  Object.keys(s.cap).forEach(p=>C.cap[p]={...s.cap[p]});
  const fake={cap:C.cap,gsp:C.gsp,peak:C.peak,prims:C.prims,kc:s.kc};
  (inProg?s.builds.filter(b=>!b.applied):[]).concat(extra||[]).forEach(b=>applyBuild(fake,{...b}));
  return C;}
const dsrAt=(s,p,i)=>{const q=PTS[i];return s.flexBuy[p]&&q.s>.5&&!q.d.sunny&&q.h>=16&&q.h<20?FLEX_MW:0;};
const baseDem=(s,C,p,i,actual)=>C.peak[p]*P_BASE[i]*(actual?s.weather:1)-dsrAt(s,p,i);
const flOf=c=>(KINDS[c.kind].fl||0)*c.mw;

// Firm planning view: worst-case profiles of every contracted firm or timed customer (built or not), no flexible ones
function plan(s,extra,C){C=C||cfg(s);const out={p:{},gsp:{}};
  const list=s.cust.filter(c=>!c.gone).concat(extra?[].concat(extra):[]);
  const gD=new Float64Array(NP),gE=new Float64Array(NP);
  C.prims.forEach(p=>{const cap=C.cap[p],D=new Float64Array(NP),E=new Float64Array(NP);let flU=0;
    list.forEach(c=>{if(c.prim!==p)return;flU+=flOf(c);if(c.offer==='flex')return;const u=U(c);for(let i=0;i<NP;i++){D[i]+=c.mw*u.imp[i];E[i]+=c.mw*u.exp[i];}});
    let dem=Infinity,gen=Infinity,dh=0,gh=0,dm=0,gm=0;
    for(let i=0;i<NP;i++){const b=baseDem(s,C,p,i,false),w=PTS[i].wt,hd=cap.F-(b+D[i]),hg=cap.R-(E[i]-b);
      if(hd<dem)dem=hd;if(hg<gen)gen=hg;if(hd<0){dh+=w;dm-=hd*w;}if(hg<0){gh+=w;gm-=hg*w;}gD[i]+=b+D[i];gE[i]+=E[i]-b;}
    out.p[p]={dem,gen,dh,gh,dm,gm,flU,flC:cap.FL,F:cap.F,R:cap.R};});
  let dem=Infinity,gen=Infinity,dh=0,gh=0,dm=0,gm=0;
  for(let i=0;i<NP;i++){const w=PTS[i].wt,hd=C.gsp.F-gD[i],hg=C.gsp.R-gE[i];if(hd<dem)dem=hd;if(hg<gen)gen=hg;if(hd<0){dh+=w;dm-=hd*w;}if(hg<0){gh+=w;gm-=hg*w;}}
  out.gsp={dem,gen,dh,gh,dm,gm,F:C.gsp.F,R:C.gsp.R};
  return out;}

// The year itself: actual profiles; ANM curtails flexible customers, last in first off, at the primary and then the GSP
function simulate(s,opt){opt=opt||{};const C=opt.C||cfg(s),prims=C.prims;
  const list=s.cust.filter(c=>!c.gone&&C.cap[c.prim]&&prims.includes(c.prim)&&(c.built||opt.all)).concat(opt.extra?[opt.extra]:[]);
  const firm={},flex={};prims.forEach(p=>{firm[p]=[];flex[p]=[];});
  list.forEach(c=>{if(!firm[c.prim])return;(c.offer==='flex'?flex:firm)[c.prim].push(c);});
  prims.forEach(p=>flex[p].sort((a,b)=>b.seq-a.seq));
  const flexAll=[].concat(...prims.map(p=>flex[p])).sort((a,b)=>b.seq-a.seq);
  const R={p:{},gsp:{bh:0,bm:0,maxD:0,maxE:0},cut:{},pot:{},months:[],cml:0,storms:[]};
  prims.forEach(p=>R.p[p]={bh:0,bm:0,maxD:0,maxE:0,cut:0});
  for(let m=0;m<12;m++){R.months[m]={p:{},gsp:{maxD:0,maxE:0,bh:0},cut:0,bh:0,cml:0};prims.forEach(p=>R.months[m].p[p]={maxD:0,maxE:0,bh:0,cut:0});}
  const v=new Map();list.forEach(c=>{R.cut[c.id]=0;R.pot[c.id]=0;Object.defineProperty(c,'_a',{value:U(c).act,configurable:true,enumerable:false,writable:true});});
  const storms=(opt.storms||[]).map(x=>({...x,cml:0,lostMW:0})),pro=s.anm==='pro';
  // ANM: take 'need' MW off flexible customers in direction dir (+1 import, -1 export). Last in, first off (the list is
  // newest first) or pro rata (everyone at this constraint gives up the same share). Returns the MW taken off.
  function curtail(list,need,dir,w,M,net){let done=0;const take=(c,k)=>{v.set(c,v.get(c)-k*dir);done+=k;R.cut[c.id]+=k*w;R.p[c.prim].cut+=k*w;M.p[c.prim].cut+=k*w;M.cut+=k*w;if(net)net[c.prim]-=k*dir;};
    if(pro){let tot=0;for(const c of list){const x=v.get(c)*dir;if(x>0)tot+=x;}if(tot<=1e-9)return 0;const f=Math.min(1,need/tot);for(const c of list){const x=v.get(c)*dir;if(x>0)take(c,x*f);}return done;}
    for(const c of list){if(need-done<=1e-9)break;const x=v.get(c)*dir;if(x>0)take(c,Math.min(x,need-done));}return done;}
  for(let i=0;i<NP;i++){const pt=PTS[i],w=pt.wt,M=R.months[pt.m];let g=0;const net={};
    for(const p of prims){let n=baseDem(s,C,p,i,true);
      for(const c of firm[p])n+=c.mw*c._a[i];
      for(const c of flex[p]){const x=c.mw*c._a[i];v.set(c,x);R.pot[c.id]+=Math.abs(x)*w;n+=x;}
      const F=C.cap[p].F,Rv=C.cap[p].R;
      if(n>F){const k=curtail(flex[p],n-F,1,w,M);n-=k;}
      else if(n<-Rv){const k=curtail(flex[p],-Rv-n,-1,w,M);n+=k;}
      net[p]=n;g+=n;}
    if(g>C.gsp.F){const k=curtail(flexAll,g-C.gsp.F,1,w,M,net);g-=k;}
    else if(g<-C.gsp.R){const k=curtail(flexAll,-C.gsp.R-g,-1,w,M,net);g+=k;}
    for(const p of prims){const n=net[p],F=C.cap[p].F,Rv=C.cap[p].R,o=Math.max(0,n-F)+Math.max(0,-Rv-n),P=R.p[p],MP=M.p[p];
      if(o>1e-6){P.bh+=w;P.bm+=o*w;MP.bh+=w;M.bh+=w;}
      if(n/F>P.maxD)P.maxD=n/F;if(-n/Rv>P.maxE)P.maxE=-n/Rv;if(n/F>MP.maxD)MP.maxD=n/F;if(-n/Rv>MP.maxE)MP.maxE=-n/Rv;
      for(const st of storms)if(st.p===p&&st.m===pt.m&&pt.d.id==='wd'&&pt.h>=16&&pt.h<=20&&n>F){const cm=C.peak[p]*CUST_PER_MW*((n-F)/n)*60;st.cml+=cm;st.lostMW=Math.max(st.lostMW,n-F);R.cml+=cm;M.cml+=cm;}}
    const og=Math.max(0,g-C.gsp.F)+Math.max(0,-C.gsp.R-g);if(og>1e-6){R.gsp.bh+=w;R.gsp.bm+=og*w;M.gsp.bh+=w;M.bh+=w;}
    if(g/C.gsp.F>R.gsp.maxD)R.gsp.maxD=g/C.gsp.F;if(-g/C.gsp.R>R.gsp.maxE)R.gsp.maxE=-g/C.gsp.R;
    if(g/C.gsp.F>M.gsp.maxD)M.gsp.maxD=g/C.gsp.F;if(-g/C.gsp.R>M.gsp.maxE)M.gsp.maxE=-g/C.gsp.R;}
  R.storms=storms;
  return R;}

/* ---------- Assessing an application ---------- */
const dims=a=>({d:!!KINDS[a.kind].dem,g:!!KINDS[a.kind].gen});
const mk=(a,offer)=>({...a,offer,seq:1e9,built:true});
// new breach hours and MWh that this application adds, in the directions it affects
function delta(b,w,a){const D=dims(a),P=b.p[a.prim],W=w.p[a.prim],G=b.gsp,WG=w.gsp;let h=0,m=0;
  if(D.d){h+=W.dh-P.dh+WG.dh-G.dh;m+=W.dm-P.dm+WG.dm-G.dm;}
  if(D.g){h+=W.gh-P.gh+WG.gh-G.gh;m+=W.gm-P.gm+WG.gm-G.gm;}
  return {h:Math.max(0,h),m:Math.max(0,m),prim:(D.d&&W.dm-P.dm>1e-6)||(D.g&&W.gm-P.gm>1e-6),gsp:(D.d&&WG.dm-G.dm>1e-6)||(D.g&&WG.gm-G.gm>1e-6)};}
// offers already chosen for applications ahead of this one in the queue count as if accepted (first come, first served)
let sending=false;
const asCust=x=>mk(x,x.choice==='timed'?'timed':'firm');
const pend=a=>{if(sending||S.phase!=='queue')return [];const i=S.queue.indexOf(a);return S.queue.slice(0,i<0?S.queue.length:i).filter(x=>x.choice==='firm'||x.choice==='timed').map(asCust);};
const pendAll=()=>sending||S.phase!=='queue'?[]:S.queue.filter(x=>x.choice==='firm'||x.choice==='timed').map(asCust);
const clsOf=(d,flBad)=>flBad||d.h>AMBER_H?'red':d.h>0||d.m>.01?'amber':'green';
function assess(a,b0){const pd=pend(a),b=pd.length||!b0?plan(S,pd):b0,w=plan(S,pd.concat([mk(a,'firm')])),d=delta(b,w,a),P=b.p[a.prim];
  const flU=P.flU+flOf(a),flBad=flU>P.flC+1e-9;
  return {b,w,d,flBad,flU,cls:clsOf(d,flBad)};}
const buildsAt=(kind,prim)=>S.builds.filter(b=>b.kind===kind&&(b.prim||null)===(prim||null));
// the reinforcement that would let it connect firm: returns {builds:[new ones], reuse:[in progress], done, cost} or null
function reinfFor(a){const D=dims(a),add=[],reuse=new Set();
  for(let k=0;k<6;k++){const C=cfg(S,add,true),pd=pend(a),b=plan(S,pd,C),w=plan(S,pd.concat([mk(a,'firm')]),C),d=delta(b,w,a),P=b.p[a.prim];
    const flBad=P.flU+flOf(a)>P.flC+1e-9;
    if(!flBad&&d.h===0&&d.m<=.01){
      S.builds.filter(x=>!x.applied).forEach(x=>{if((x.prim===a.prim&&(x.kind==='tx'||x.kind==='fl'))||x.kind==='gsp'||(x.kind==='kc'&&D.d&&(a.prim==='js'||a.prim==='hw')))reuse.add(x);});
      if(!add.length&&!reuse.size)return null;
      const yrs=add.map(x=>S.year+BUILDS[x.kind].yrs).concat([...reuse].map(x=>x.done));
      const cost=add.reduce((t,x)=>t+BUILDS[x.kind].cost,0);
      return {builds:add,reuse:[...reuse],done:Math.max(S.year,...yrs),cost,contrib:KINDS[a.kind].gen?Math.min(cost*.5,.1*a.mw):0};}
    const cnt=kind=>buildsAt(kind,kind==='gsp'||kind==='kc'?null:a.prim).length+add.filter(x=>x.kind===kind&&(x.prim||null)===(kind==='gsp'||kind==='kc'?null:a.prim)).length;
    let added=false;
    if(flBad&&cnt('fl')<BUILDS.fl.max){add.push({kind:'fl',prim:a.prim});added=true;}
    if(d.prim&&cnt('tx')<BUILDS.tx.max){add.push({kind:'tx',prim:a.prim});added=true;}
    else if(d.prim&&D.d&&!KINDS[a.kind].gen&&(a.prim==='js'||a.prim==='hw')&&cnt('kc')<1){add.push({kind:'kc'});added=true;}
    if(d.gsp&&cnt('gsp')<BUILDS.gsp.max){add.push({kind:'gsp'});added=true;}
    if(!added)return null;}
  return null;}
// pro rata: how much a new flexible connection raises the curtailment of the flexible customers already connected or contracted
function othersImpact(a){const x=mk(a,'flex');x.id=-1;const others=S.cust.filter(c=>!c.gone&&c.offer==='flex');if(!others.length)return null;
  const pc=R=>{let c=0,p=0;others.forEach(o=>{c+=R.cut[o.id]||0;p+=R.pot[o.id]||0;});return p>0?c/p*100:0;};
  return {before:pc(simulate(S,{all:true})),after:pc(simulate(S,{all:true,extra:x}))};}
function flexEst(a){const x=mk(a,'flex');x.id=-1;const R=simulate(S,{all:true,extra:x});return R.pot[-1]>0?R.cut[-1]/R.pot[-1]*100:0;}
const tolNow=a=>a.tol*(S.flexDefault?1.5:1);
const canTimed=a=>a.kind==='batt'||(a.kind==='ev'&&a.sub==='depot');
// every offer this application could get now, with what it would mean
function offers(a){const A=assess(a),out=[],g2=g2Applies(a),g2bad=g2&&!gate2(a);
  const firmNote=A.cls==='green'?'Fits within firm capacity all year.':A.cls==='amber'?`Fits most of the year, but breaks firm limits about ${nf(A.d.h)} hours a year.`:A.flBad?'Over the fault level limit: not safe to connect.':`Breaks firm limits about ${nf(A.d.h)} hours a year.`;
  out.push({type:'firm',label:'Firm connection',avail:!A.flBad,cls:A.cls,conn:S.year,line:`Full capacity, any time. ${firmNote}`});
  if(A.cls!=='green'){const r=reinfFor(a);
    out.push(r?{type:'reinf',label:'Firm after reinforcement',avail:true,conn:r.done,r,contrib:r.contrib,
      line:`Connects in year ${r.done}${r.done>S.year?` (${r.done-S.year} year${r.done-S.year>1?'s':''} to wait)`:''} once ${[...r.builds.map(x=>BUILDS[x.kind].name.toLowerCase()+(x.prim?' at '+PRIMS[x.prim].name:'')),...r.reuse.map(x=>'the '+BUILDS[x.kind].name.toLowerCase()+' already under way')].join(' and ')} ${r.builds.length+r.reuse.length>1?'are':'is'} done. ${r.cost?`New work: ${money(r.cost)}`:'No new work needed'}${r.contrib?`, customer pays ${money(r.contrib)}`:r.cost?', customer pays nothing (demand)':''}.`}
      :{type:'reinf',label:'Firm after reinforcement',avail:false,line:'Too big for this site, even after every upgrade you could build.'});}
  if(!KINDS[a.kind].noFlex){if(A.flBad)out.push({type:'flex',label:'Flexible connection',avail:false,line:'Curtailment can\'t fix fault level: it needs new switchgear first.'});
    else{const est=flexEst(a),pro=S.anm==='pro',imp=pro?othersImpact(a):null;out.push({type:'flex',label:'Flexible connection',avail:true,conn:S.year,est,limit:Math.max(3,Math.ceil(est+2)),
      line:`Connect now; your ANM system curtails it when the network is tight, ${pro?'shared pro rata with the other flexible customers':'newest first'}. Estimated curtailment ${f1(est)}% of its ${KINDS[a.kind].gen?'output':'use'}.${imp&&imp.after-imp.before>=.05?` The flexible customers already here go from ${f1(imp.before)}% to ${f1(imp.after)}%.`:''} Above the limit you agree, you pay compensation.`});}}
  if(canTimed(a)){const t=mk(a,'timed'),b=A.b,w=plan(S,pend(a).concat([t])),d=delta(b,w,a),cls=clsOf(d,A.flBad);
    out.push({type:'timed',label:'Timed connection',avail:!A.flBad,cls,conn:S.year,line:`${a.kind==='batt'?'Charges only overnight and 10:00 to 16:00, exports only 07:00 to 09:00 and 16:00 to 20:00.':'Charges only 22:00 to 06:00.'} ${cls==='green'?'Fits within firm capacity.':`Still breaks firm limits about ${nf(d.h)} hours a year.`}`});}
  out.push({type:'hold',label:g2bad?'Gate 1: waiting list':'Ask for more information',avail:true,line:g2bad?'Doesn\'t meet Gate 2 yet. It keeps a place on the waiting list and comes back next year if it is still going.':'Put off the decision for a year. Real projects come back; speculative ones often drop out.'});
  out.push({type:'refuse',label:'Refuse',avail:true,line:'No connection. Expect a complaint if there was a way to connect it.'});
  if(g2bad)out.forEach(o=>{if(['firm','reinf','flex','timed'].includes(o.type)&&o.avail)o.g2=true;});
  return {A,list:out};}

/* ---------- Offers and responses ---------- */
function acceptP(a,o){const K=KINDS[a.kind];
  if(a.spec)return o.type==='reinf'&&o.contrib>0?.4:.95;
  if(o.type==='firm')return .96;
  if(o.type==='reinf'){const d=o.conn-S.year;let p=d<=a.pat?.92-.1*d:.12;if(o.contrib>1.5)p-=.15;return clamp(p,.05,.95);}
  if(o.type==='flex'){const t=tolNow(a);return o.est<=t?.92:o.est<=1.6*t?.5:.1;}
  if(o.type==='timed')return a.kind==='batt'?.8:.88;
  return 0;}
function sendOffers(){sending=true;try{return sendOffers0();}finally{sending=false;tut('sent');}}
// Could this application realistically have been connected this year? (Gate 1 projects after the reform don't count.)
function viable(a,O){if(a.spec||(g2Applies(a)&&!gate2(a)))return false;const Y=S.year;
  return O.list.some(x=>x.avail&&((x.type==='firm'&&x.cls!=='red')||(x.type==='timed'&&x.cls!=='red')||(x.type==='flex'&&acceptP(a,x)>=.5)||(x.type==='reinf'&&x.conn-Y<=a.pat)));}
function sendOffers0(){const res=[],Y=S.year;S.yr.genMW=0;S.yr.accMW=0;S.yr.delay=[];S.yr.viaMW=0;S.yr.waitMW=0;
  S.queue.forEach(a=>{if(!a.spec)S.yr.genMW+=a.mw;});
  for(const a of S.queue){const O=offers(a),o=O.list.find(x=>x.type===a.choice&&x.avail)||O.list.find(x=>x.type==='hold');
    const via=viable(a,O);if(via)S.yr.viaMW+=a.mw;
    const r=rngFor(S.seed,'resp',Y,a.id)(),row={a,type:o.type,label:o.label,g2:!!o.g2};
    if(o.g2){S.yr.g2++;row.g2pen=true;}
    if(o.type==='hold'){
      if(a.pat<=0&&!a.spec&&!(g2Applies(a)&&!gate2(a))){row.out='walked';row.complaint=true;row.q='We\'ve waited long enough. We\'re writing to Ofgem.';S.yr.complaints++;}
      else{row.out='held';row.q=a.spec?'We\'ll get back to you.':'Understood. We\'ll come back next year.';S.held.push(a);}}
    else if(o.type==='refuse'){row.out='refused';
      const feasible=O.list.some(x=>['firm','reinf','flex','timed'].includes(x.type)&&x.avail&&(x.type!=='firm'||x.cls!=='red'));
      const legit=a.spec||(g2Applies(a)&&!gate2(a));
      if(feasible&&!legit){row.complaint=true;S.yr.complaints++;row.q='There was room to connect us. We\'ve complained to Ofgem.';}else row.q=a.spec?'Fair enough.':'Disappointed, but we understand.';}
    else{const p=acceptP(a,o);
      if(r<p){row.out='accepted';
        const c={...a,offer:o.type==='reinf'?'firm':o.type,acc:Y,seq:S.seq++,built:false};delete c.choice;
        let conn=Y;
        if(o.type==='reinf'){const R=reinfFor(a);const ids=[];
          if(R){R.builds.forEach(x=>ids.push(startBuild(x.kind,x.prim,R.builds.length&&x===R.builds[0]?R.contrib:0)));R.reuse.forEach(x=>ids.push(x.id));conn=R.done;}
          c.waitB=ids;c.reinf=true;c.contrib=R?R.contrib:0;}
        if(o.type==='flex'){c.limit=o.limit;c.est=o.est;}
        c.conn=Math.max(conn,Y+(a.spec?0:readyDelay(a)));if(a.spec)c.conn=Y+1+Math.floor(r*3);
        // some real projects run late: they miss their milestone but would still be built (the developer usually says why)
        if(!a.spec){const sr=rngFor(S.seed,'slip',a.name,Y)();c.slip=sr<.2?(sr<.06?2:1):0;}
        S.cust.push(c);
        if(!a.spec){S.yr.accMW+=a.mw;S.yr.delay.push(c.conn-Y);}
        row.q=a.spec?'Signed by return of post.':o.type==='flex'?`We can live with ${f1(o.est)}% curtailment. Signed.`:o.type==='reinf'?`Year ${c.conn} it is. Signed.`:'Signed and returned. Thank you.';
        if(!a.spec&&readyDelay(a)>0)row.q+=` (${a.land?'':'land rights '}${!a.land&&!a.planning?'and ':''}${a.planning?'':'planning'} still to sort, so it connects in year ${c.conn}.)`;}
      else{row.out='walked';
        const why=o.type==='reinf'?(o.conn-Y>a.pat?'too slow':'too expensive'):o.type==='flex'?'too much curtailment':o.type==='timed'?'the hours don\'t work for us':'we\'ve found another site';
        row.q=`No thanks: ${why}.`;
        if(o.type==='reinf'&&o.conn-Y>a.pat+1){row.complaint=true;S.yr.complaints++;row.q+=' We\'re complaining to Ofgem about the delay.';}}}
    if(!a.spec&&row.out!=='accepted'&&!(g2Applies(a)&&!gate2(a)))S.yr.waitMW+=a.mw;
    res.push(row);}
  S.queue=[];energise();S.resp=res;S.phase='plan';selApp=null;save();return res;}
function startBuild(kind,prim,contrib){const B=BUILDS[kind],id=S.nextId++;
  const b={id,kind,prim:prim||null,cost:B.cost,contrib:contrib||0,start:S.year,done:S.year+B.yrs,yearCost:Math.max(0,B.cost-(contrib||0))/B.yrs,applied:false};
  S.builds.push(b);S.spend+=b.yearCost;return id;}
function canBuild(kind,prim){if(kind==='kc'&&(S.kc||buildsAt('kc').length))return false;return buildsAt(kind,prim).length<BUILDS[kind].max;}

/* ---------- The year and the report ---------- */
function runYear(){const R=simulate(S,{storms:S.stormPlan});
  // curtailment against each flexible customer's limit: compensation above it
  let cut=0,pot=0,over=[],comp=0;
  S.cust.forEach(c=>{if(c.gone||!c.built||c.offer!=='flex')return;const ct=R.cut[c.id]||0,pt=R.pot[c.id]||0;cut+=ct;pot+=pt;
    const pct=pt>0?ct/pt*100:0;c.lastPct=pct;if(pct>c.limit+1e-9){const ex=(pct-c.limit)/100*pt;comp+=ex*100/1e6;over.push({c,pct});}});
  S.spend+=comp;
  const bm=Object.values(R.p).reduce((t,x)=>t+x.bm,0)+R.gsp.bm,bh=Object.values(R.p).reduce((t,x)=>t+x.bh,0)+R.gsp.bh;
  const zombies=S.reform?S.cust.filter(missed).length:0;
  const y=S.yr,genMW=y.genMW,avgD=y.delay.length?y.delay.reduce((a,b)=>a+b,0)/y.delay.length:0;
  // Connections: what you connected against what could realistically have been connected this year (viable)
  const via=y.viaMW!=null?y.viaMW:genMW,waitMW=y.waitMW||0;
  // Cost: overspend hurts; so does leaving the allowance unspent while real customers wait
  const unspent=Math.max(0,BUDGET-S.spend)/BUDGET,under=Math.round(80*unspent*Math.min(1,waitMW/15));
  const sc={
    conn:via>0?clamp(100*Math.pow(Math.min(1,y.accMW/via),1.5)*(1-.15*avgD),0,100):100,
    sec:clamp(100-2.5*Math.sqrt(bm)-R.cml/250,0,100),
    curt:pot>0?clamp(100-6*(cut/pot*100)-15*over.length,0,100):100,
    cost:S.spend>BUDGET?clamp(100-200*(S.spend-BUDGET)/BUDGET,0,100):clamp(100-under,0,100),
    reg:clamp(100-12*y.complaints-6*y.g2-4*zombies-(R.cml>0?10:0),0,100)};
  const avg=(sc.conn+sc.sec+sc.curt+sc.cost+sc.reg)/5,grade=gradeOf(avg);
  S.report={year:S.year,sc,avg,grade,R:{p:R.p,gsp:R.gsp,months:R.months,cml:R.cml,storms:R.storms},bm,bh,cut,pot,over:over.map(o=>({name:o.c.name,pct:o.pct,limit:o.c.limit})),comp,zombies,
    accMW:y.accMW,genMW,viaMW:via,waitMW,under,avgD,complaints:y.complaints,g2:y.g2,spend:S.spend};
  S.hist.push({year:S.year,grade,avg,sc});
  S.phase=S.year>=YEARS?'end':'report';save();return S.report;}
const careerScore=()=>Math.round(S.hist.reduce((t,h)=>t+h.avg,0)*10);
const gradeOf=x=>x>=85?'A':x>=70?'B':x>=55?'C':x>=40?'D':'E';
const starsOf=g=>({A:3,B:2,C:1}[g]||0);
function letter(rep){const s=rep.sc,worst=Object.entries(s).sort((a,b)=>a[1]-b[1])[0][0];
  const L={conn:`Developers in Blackout Canyon tell us they can't get connected. You connected ${f1(rep.accMW)} MW of the ${f1(rep.viaMW!=null?rep.viaMW:rep.genMW)} MW of real projects you had a way to connect${rep.avgD>.5?`, and made them wait ${f1(rep.avgD)} years on average`:''}. We expect better use of flexible connections and reinforcement.`,
    sec:`The network spent ${nf(rep.bh)} hours over its firm limits this year${rep.R.cml>0?`, and ${nf(rep.R.cml)} customer minutes were lost in the storm`:''}. You are connecting customers faster than you are building the network to carry them.`,
    curt:`Flexible customers lost ${nf(rep.cut)} MWh to curtailment${rep.over.length?`, and ${rep.over.length} went past their curtailment limit`:''}. Flexible connections only work if customers trust the estimates you give them.`,
    cost:rep.spend>BUDGET?`You spent ${money(rep.spend)} against an allowance of ${money(BUDGET)}. Customers pay for overspend through their bills, and we will be looking at it closely.`:`You left ${money(BUDGET-rep.spend)} of your ${money(BUDGET)} allowance unspent while ${f1(rep.waitMW)} MW of real projects waited to connect. An allowance not spent on the network customers need is not a saving.`,
    reg:`We received ${rep.complaints} complaint${rep.complaints===1?'':'s'} about your connections service${rep.g2?`, and you gave confirmed dates to ${rep.g2} project${rep.g2===1?'':'s'} that didn't meet Gate 2`:''}${rep.zombies?`. ${rep.zombies} project${rep.zombies===1?' is':'s are'} still holding queue positions after missing milestones`:''}. Please treat the queue fairly and by the rules.`};
  if(rep.avg>=85)return s[worst]<70?`A good year overall, with one concern. ${L[worst]}`:'A good year. Keep it up.';
  return L[worst];}

/* ---------- Save ---------- */
function save(){if(!S)return;S.t=Date.now();ls('save',JSON.stringify(S));}
// what goes online: the game without the month-by-month detail of the last year
function saveData(){const o=JSON.parse(JSON.stringify(S));if(o.report&&o.report.R)delete o.report.R.months;return JSON.stringify(o);}
function load(){try{const s=JSON.parse(ls('save')||'null');if(s&&s.v===SAVE_V&&s.year>=1)return s;}catch(e){}return null;}

/* ---------- Rendering ---------- */
const PHASE_TIP={queue:'Tap each application to study it and make an offer. When every one has an offer, send them.',plan:'Offers are out. Build reinforcement if you need it, then run the year.',report:'',end:''};
function render(){if(!S)return;
  $('yr').textContent=S.year;{const w=$('wkTag');if(w){w.hidden=S.mode!=='week';w.textContent=S.mode==='week'?'Week of '+fmtDay(S.week):'';}}
  $('stBudget').textContent=money(BUDGET-S.spend);$('stBudgetBox').classList.toggle('bad',S.spend>BUDGET);
  const done=S.queue.filter(a=>a.choice).length;
  $('stQueue').textContent=S.phase==='queue'?`${done}/${S.queue.length}`:'sent';
  const last=S.hist[S.hist.length-1];$('stGrade').textContent=last?last.grade:'–';
  $('stStars').textContent=S.hist.reduce((t,h)=>t+starsOf(h.grade),0);
  $('phaseTip').textContent=PHASE_TIP[S.phase]||'';
  const rules=[S.reform?'Gate 2 rules':'First come, first served',S.anm==='pro'?'pro rata curtailment':'',S.demandReform?'demand readiness checks':'',S.flexDefault?'flexible by default':''].filter(Boolean).join(' · ');
  $('rules').textContent=rules;
  renderNet();renderQueue();renderPipe();renderBuilds();renderDock();renderTut();}

function bar(used,limit,ghost){const u=clamp(used/limit,0,1.2),g=ghost==null?null:clamp(ghost/limit,0,1.2);
  const cl=x=>x>1?'alarm':x>.9?'warn':'ok';
  return `<i class="gbar"><s class="${cl(u)}" style="width:${Math.min(100,u*100).toFixed(1)}%"></s>${g!=null&&g>u?`<u class="${cl(g)}" style="left:${Math.min(100,u*100).toFixed(1)}%;width:${(Math.min(100,g*100)-Math.min(100,u*100)).toFixed(1)}%"></u>`:''}<b class="lim"></b></i>`;}
function hr(x){return `${x<0?'−':''}${f1(Math.abs(x))} MW`;}
function renderNet(){const b=plan(S,pendAll()),a=S.phase==='queue'&&selApp?S.queue.find(x=>x.id===selApp):null,A=a?assess(a,b):null;
  const G=b.gsp,AG=A&&A.w.gsp;
  $('gsp').innerHTML=`<div class="gsp"><div class="gsp-h"><b>Blackout Canyon grid supply point</b><span>T1–T3 · ${S.gsp.F} MW firm</span></div>
    <div class="g"><span>Demand headroom</span>${bar(G.F-G.dem,G.F,AG&&dims(a).d?G.F-AG.dem:null)}<em class="${G.dem<0?'neg':''}">${hr(G.dem)}${AG&&dims(a).d&&Math.abs(AG.dem-G.dem)>.05?` → ${hr(AG.dem)}`:''}</em></div>
    <div class="g"><span>Export headroom</span>${bar(G.R-G.gen,G.R,AG&&dims(a).g?G.R-AG.gen:null)}<em class="${G.gen<0?'neg':''}">${hr(G.gen)}${AG&&dims(a).g&&Math.abs(AG.gen-G.gen)>.05?` → ${hr(AG.gen)}`:''}</em></div></div>`;
  let h='';
  S.prims.forEach(p=>{const W=A&&a.prim===p?A.w.p[p]:null,P=W?A.b.p[p]:b.p[p],D=a?dims(a):{};
    const nQ=S.queue.filter(x=>x.prim===p).length,flG=W?A.flU:null;
    h+=`<button type="button" class="tile${a&&a.prim===p?' sel c-'+A.cls:''}" data-p="${p}"><b class="tn">${esc(PRIMS[p].name)}</b>
      <div class="g"><span>Demand</span>${bar(P.F-P.dem,P.F,W&&D.d?P.F-W.dem:null)}<em class="${P.dem<0?'neg':''}">${hr(P.dem)}${W&&D.d&&Math.abs(W.dem-P.dem)>.05?` → ${hr(W.dem)}`:''}</em></div>
      <div class="g"><span>Export</span>${bar(P.R-P.gen,P.R,W&&D.g?P.R-W.gen:null)}<em class="${P.gen<0?'neg':''}">${hr(P.gen)}${W&&D.g&&Math.abs(W.gen-P.gen)>.05?` → ${hr(W.gen)}`:''}</em></div>
      <div class="g"><span>Fault level</span>${bar(P.flU,P.flC,flG)}<em>${Math.round(P.flU/P.flC*100)}%${flG!=null&&flG>P.flU?` → ${Math.round(flG/P.flC*100)}%`:''}</em></div>
      ${nQ&&S.phase==='queue'?`<small class="tq">${nQ} in the queue</small>`:''}</button>`;});
  const kcB=buildsAt('kc')[0];
  if(kcB&&!kcB.applied)h+=`<div class="tile ghost"><b class="tn">Kilowatt Close</b><p>New primary under construction. Ready in year ${kcB.done}.</p></div>`;
  $('tiles').innerHTML=h;}
function fitTag(cls){return `<i class="fit c-${cls}">${cls==='green'?'Fits firm':cls==='amber'?'Fits some of the year':'Doesn\'t fit firm'}</i>`;}
function readyTags(a){const g2=g2Applies(a);
  return `<i class="${a.land?'y':'n'}">Land ${a.land?'✓':'✗'}</i><i class="${a.planning?'y':'n'}">Planning ${a.planning?'✓':'✗'}</i>${g2?`<i class="${needed(a)?'y':'n'}">Needed ${needed(a)?'✓':'✗'}</i><i class="g2 ${gate2(a)?'y':'n'}">${gate2(a)?'Gate 2 ✓':'Gate 1 only'}</i>`:''}`;}
const g2Why=a=>[a.land?'':'land rights',a.planning?'':'planning',needed(a)?'':'a need in the regional plan'].filter(Boolean).join(', ');
const kindLine=a=>`${KINDS[a.kind].name}${a.kind==='ev'?(a.sub==='depot'?' (fleet depot)':' (public hub)'):''} · ${f1(a.mw)} MW ${a.kind==='batt'?'import and export':KINDS[a.kind].gen?'export':'import'} · ${PRIMS[a.prim].name}`;
const OFF_SHORT={firm:'Firm',reinf:'After reinforcement',flex:'Flexible',timed:'Timed',hold:'Hold',refuse:'Refuse'};
function renderQueue(){const el=$('queue');
  if(S.phase!=='queue'){el.innerHTML=S.resp?`<p class="tip">Offers sent for year ${S.year}. <button type="button" class="link" id="seeResp">See the responses</button></p>`:'';const sr=$('seeResp');if(sr)sr.onclick=showResponses;$('qCount').textContent='';return;}
  $('qCount').textContent=`${S.queue.length} applications · ${S.reform?'Gate 2 projects first':'in the order they applied'}`;
  const b0=plan(S,[]);el.innerHTML=S.queue.map((a,i)=>{const A=assess(a,b0);
    return `<button type="button" class="app${a.choice?' chosen':''}${selApp===a.id?' sel':''}" data-a="${a.id}"><span class="ic" aria-hidden="true">${KINDS[a.kind].ic}</span>
      <span class="ab"><b><span class="qpos">${i+1}</span>${esc(a.name)}${a.back?' <small class="back">back again</small>':''}${S.reform&&a.app&&a.app>i+1&&g2Applies(a)&&gate2(a)?' <small class="up">moved up: Gate 2</small>':''}</b><small>${kindLine(a)}</small>
      <span class="tags">${fitTag(A.cls)}${readyTags(a)}</span></span>
      <span class="chip${a.choice?'':' none'}">${a.choice?OFF_SHORT[a.choice]:'Choose'}</span></button>`;}).join('')||'<p class="tip">No applications this year.</p>';}
const NOTES=['"Our planning appeal is decided next spring."','"The panels are on a ship. On site early next year."','"Finance closes in the new year, then we start."','"The contractor went bust; a new one starts in March."'];
// what the developer says when chased: real late projects usually explain; speculative ones mostly don't answer
function devNote(c){const r=rngFor(S.seed,'note',c.name)();if(c.spec)return r<.3?NOTES[Math.floor(r*13)%NOTES.length]:'No reply to our letters.';return r<.8?NOTES[Math.floor(r*17)%NOTES.length]:'No reply to our letters.';}
function custStatus(c){if(c.built)return '';
  if(missed(c))return `<span class="st n">Missed milestone (due year ${c.conn})</span><small class="dev">${esc(devNote(c))}</small>`;
  if(c.waitB&&c.waitB.length)return `<span class="st">Waiting for reinforcement, year ${c.conn}</span>`;
  return `<span class="st">Building, connects year ${c.conn}</span>`;}
function renderPipe(){const list=S.cust.filter(c=>!c.gone&&!c.built&&!c.existing);
  $('pipe').innerHTML=list.length?list.map(c=>`<li><span class="ic" aria-hidden="true">${KINDS[c.kind].ic}</span><span><b>${esc(c.name)}</b><small>${KINDS[c.kind].name} · ${f1(c.mw)} MW · ${PRIMS[c.prim].name} · ${c.offer==='flex'?'flexible':c.offer==='timed'?'timed':'firm'}${c.inherited?' · inherited':''}</small>${custStatus(c)}</span>
    ${missed(c)?`<button type="button" class="btn sm" data-rm="${c.id}" ${S.reform?'':'disabled'}>${S.reform?'Remove':'Can\'t remove yet'}</button>`:''}</li>`).join(''):'<li class="none">Nothing waiting.</li>';
  const con=S.cust.filter(c=>!c.gone&&c.built&&!c.existing);
  $('connSum').textContent=con.length?`${con.length} connected since you started: ${f1(con.reduce((t,c)=>t+c.mw,0))} MW (${con.filter(c=>c.offer==='flex').length} flexible).`:'';}
function renderBuilds(){const l=S.builds.filter(b=>!b.applied),f=Object.keys(S.flexBuy);
  $('builds').innerHTML=(l.map(b=>`<li><b>${BUILDS[b.kind].name}${b.prim?' · '+PRIMS[b.prim].name:''}</b><small>Ready year ${b.done} · ${money(b.yearCost)} a year</small></li>`).join('')+
    f.map(p=>`<li><b>Flexibility services · ${PRIMS[p].name}</b><small>This winter: ${FLEX_MW} MW of demand turn-down at teatime peaks</small></li>`).join(''))||'<li class="none">Nothing under construction.</li>';}
function renderDock(){const go=$('goBtn'),re=$('reBtn');
  if(S.phase==='queue'){const n=S.queue.filter(a=>!a.choice).length;go.textContent=n?`Send offers (${n} to go)`:'Send offers';go.disabled=n>0;re.disabled=false;}
  else if(S.phase==='plan'){go.textContent='Run the year ▶';go.disabled=false;re.disabled=false;}
  else if(S.phase==='report'){go.textContent=`Start year ${S.year+1}`;go.disabled=false;re.disabled=true;}
  else{go.textContent='Ofgem verdict';go.disabled=false;re.disabled=true;}}

/* ---------- Sheet: one application ---------- */
function openApp(id){const a=S.queue.find(x=>x.id===id);if(!a)return;selApp=id;const O=offers(a),A=O.A,P=A.b.p[a.prim],W=A.w.p[a.prim],D=dims(a);
  const K=KINDS[a.kind];
  let g='';
  if(D.d)g+=`<div class="g"><span>Demand headroom at ${esc(PRIMS[a.prim].name)}</span>${bar(P.F-P.dem,P.F,P.F-W.dem)}<em class="${W.dem<0?'neg':''}">${hr(P.dem)} → ${hr(W.dem)}</em></div>`;
  if(D.g)g+=`<div class="g"><span>Export headroom at ${esc(PRIMS[a.prim].name)}</span>${bar(P.R-P.gen,P.R,P.R-W.gen)}<em class="${W.gen<0?'neg':''}">${hr(P.gen)} → ${hr(W.gen)}</em></div>`;
  if(K.gen)g+=`<div class="g"><span>Fault level</span>${bar(P.flU,P.flC,A.flU)}<em class="${A.flBad?'neg':''}">${Math.round(P.flU/P.flC*100)}% → ${Math.round(A.flU/P.flC*100)}%</em></div>`;
  const GG=A.b.gsp,GW=A.w.gsp;
  if((D.d&&Math.abs(GW.dem-GG.dem)>.05&&GW.dem<10)||(D.g&&Math.abs(GW.gen-GG.gen)>.05&&GW.gen<10))g+=`<div class="g"><span>Grid supply point</span>${D.d?bar(GG.F-GG.dem,GG.F,GG.F-GW.dem):bar(GG.R-GG.gen,GG.R,GG.R-GW.gen)}<em class="${(D.d?GW.dem:GW.gen)<0?'neg':''}">${hr(D.d?GG.dem:GG.gen)} → ${hr(D.d?GW.dem:GW.gen)}</em></div>`;
  const why=A.cls==='green'?'Fits within firm capacity all year.':A.flBad?'Over the fault level limit at this substation.':`As a firm connection it would break firm limits about ${nf(A.d.h)} hours a year${A.d.gsp&&!A.d.prim?' at the grid supply point':''}${D.g&&!D.d?' (mostly sunny days)':D.d&&!D.g?' (mostly winter teatimes)':''}.`;
  const g2=g2Applies(a);
  // what each offer does to firm headroom here, so the network tiles aren't needed on a phone
  const eff=o=>{if(!o.avail)return '';if(o.type==='flex')return `Uses no firm headroom: curtailed instead.`;if(o.type==='hold'||o.type==='refuse')return 'No change to the network.';
    let w=W,C=null;if(o.type==='timed')w=plan(S,pend(a).concat([mk(a,'timed')])).p[a.prim];
    if(o.type==='reinf'&&o.r){C=cfg(S,o.r.builds,true);w=plan(S,pend(a).concat([mk(a,'firm')]),C).p[a.prim];}
    const bits=[];if(D.d)bits.push(`demand ${hr(P.dem)} → <b class="${w.dem<0?'neg':''}">${hr(w.dem)}</b>`);if(D.g)bits.push(`export ${hr(P.gen)} → <b class="${w.gen<0?'neg':''}">${hr(w.gen)}</b>`);
    return `${o.type==='reinf'?'After the upgrade, ':''}${esc(PRIMS[a.prim].name)} ${bits.join(', ')}.`;};
  const strip=S.prims.map(p=>{const q=A.b.p[p],me=p===a.prim;return `<li class="${me?'me':''}"><b>${esc(PRIMS[p].name)}</b><span class="${q.dem<0?'neg':''}">D ${f1(q.dem)}</span><span class="${q.gen<0?'neg':''}">E ${f1(q.gen)}</span></li>`;}).join('')
    +`<li><b>Grid supply</b><span class="${A.b.gsp.dem<0?'neg':''}">D ${f1(A.b.gsp.dem)}</span><span class="${A.b.gsp.gen<0?'neg':''}">E ${f1(A.b.gsp.gen)}</span></li>`;
  $('sheet').innerHTML=`<div class="sh-h"><div><b>${KINDS[a.kind].ic} ${esc(a.name)}</b><p class="sh-s">${kindLine(a)}</p></div><button type="button" class="sh-x" id="shX" aria-label="Close">×</button></div>
    <p class="tags">${fitTag(A.cls)}${readyTags(a)}</p>
    <p class="sh-n">Wants connecting this year. Will wait ${a.pat} year${a.pat===1?'':'s'}${a.back?' more':''}${K.noFlex?'':`, and put up with about ${f1(tolNow(a))}% curtailment`}.${g2&&!gate2(a)?` <b>Doesn't meet Gate 2</b> (no ${g2Why(a)}): no confirmed date under the new rules.`:''}</p>
    <div class="gauges">${g}</div><p class="sh-why c-${A.cls}">${why}</p>
    <details class="netsum"><summary>Your network now: firm headroom in MW</summary><ul>${strip}</ul><p class="fine">D demand at winter peak, E export on sunny days, counting offers chosen above this one in the queue.</p></details>
    <h3>Your offer</h3><div class="offers">${O.list.map(o=>`<button type="button" class="off${a.choice===o.type?' on':''}" data-o="${o.type}" ${o.avail?'':'disabled'} aria-pressed="${a.choice===o.type}">
      <b>${o.label}${o.cls&&o.cls!=='green'&&o.avail?` <i class="fit c-${o.cls}">${o.cls==='amber'?'some risk':'overloads'}</i>`:''}${o.g2?' <i class="fit c-red">breaks Gate 2</i>':''}</b><small>${o.line}</small>${eff(o)?`<small class="eff">${eff(o)}</small>`:''}</button>`).join('')}</div>`;
  $('sheet').hidden=false;$('sheet').scrollTop=0;tut('open');
  $('shX').onclick=closeSheet;
  $('sheet').querySelectorAll('.off').forEach(b=>b.onclick=()=>{a.choice=b.dataset.o;save();
    const nx=S.queue.find(x=>!x.choice);closeSheet();tut('choose',a);toast(`${a.name}: ${OFF_SHORT[a.choice].toLowerCase()}.${nx?'':' Every application has an offer: send them when you\'re ready.'}`);});
  render();}
function openPrim(p){const b=plan(S).p[p],cs=S.cust.filter(c=>!c.gone&&c.prim===p);selApp=null;
  $('sheet').innerHTML=`<div class="sh-h"><div><b>${esc(PRIMS[p].name)} primary</b><p class="sh-s">Firm capacity ${S.cap[p].F} MW · export limit ${S.cap[p].R} MW · fault level ${S.cap[p].FL} MVA · peak demand forecast ${f1(S.peak[p])} MW${S.flexBuy[p]?` (less ${FLEX_MW} MW flexibility)`:''}</p></div><button type="button" class="sh-x" id="shX" aria-label="Close">×</button></div>
    <p class="sh-n">Demand headroom ${hr(b.dem)}, export headroom ${hr(b.gen)}. Headroom is the worst hour of the year, counting every firm customer you've contracted, connected or not. Flexible customers don't use it up: they get curtailed instead.</p>
    <h3>Customers</h3><ul class="plist">${cs.map(c=>`<li>${KINDS[c.kind].ic} <b>${esc(c.name)}</b> ${f1(c.mw)} MW · ${c.existing?'existing':c.offer==='flex'?`flexible${c.lastPct!=null?`, ${f1(c.lastPct)}% curtailed last year (limit ${c.limit}%)`:''}`:c.offer}${c.built?'':' · not connected yet'}</li>`).join('')||'<li>None yet.</li>'}</ul>`;
  $('sheet').hidden=false;$('shX').onclick=closeSheet;render();}
function closeSheet(){$('sheet').hidden=true;selApp=null;render();}
let toastT=null;function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,3200);}

/* ---------- Overlays ---------- */
function ov(html,cls){$('sheet').hidden=true;const o=$('ov'),c=$('ovCard');c.className='card'+(cls?' '+cls:'');c.innerHTML=html;o.hidden=false;o.scrollTop=0;const f=c.querySelector('.btn.primary');if(f)f.focus();}
function closeOv(){$('ov').hidden=true;stopPlay();render();tut('close');}
function showHelp(){ov(`<h2>Gatekeeper</h2>
  <p>You're the connections and planning engineer for Blackout Canyon, for ten years. Everyone wants connecting: solar farms, batteries, EV chargers, housing estates and, later, data centres. Connect them quickly and cheaply, without overloading the network or curtailing everyone into a fury.</p>
  <ol><li><b>Study each application.</b> The gauges show its effect on headroom at its substation: demand at winter peak, export on sunny days, and fault level.</li>
  <li><b>Make an offer.</b> Firm if it fits. Firm after reinforcement if you'll build for it. Flexible: connect now and curtail it when the network is tight. Timed: only in agreed hours. Or hold it, or refuse.</li>
  <li><b>Customers respond.</b> Too slow, too expensive or too much curtailment and they walk. Unfair treatment and they complain to Ofgem.</li>
  <li><b>Reinforce.</b> Transformers, switchgear, a new primary, or buy flexibility for the winter. Big jobs take years, and you have ${money(BUDGET)} a year.</li>
  <li><b>Run the year</b> and get your report: five scores, a grade, and a letter from the regulator.</li></ol>
  <p class="fine"><b>Headroom</b> counts every firm customer you've contracted, built or not. Speculative projects that never build still sit on it. From year 3 the Gate 2 reform lets you clear them out. <b>Flexible</b> customers are curtailed last in, first off, and if they go over the curtailment limit you agreed, you pay compensation. Generation pays a share of reinforcement; demand customers pay nothing. Close to the GB rules, with some artistic licence. Blackout Canyon and everyone in it are made up.</p>
  <div class="row"><button type="button" class="btn" id="hNew">New career</button><button type="button" class="btn primary" id="hGo">Play</button></div>`);
  $('hGo').onclick=()=>{ls('seen','1');closeOv();maybeEvent();};$('hNew').onclick=()=>showNew();}
function maybeEvent(){const ev=EVENTS[S.year];if(!ev||S.phase!=='queue'||ls('evseen')===S.seed+'-'+S.year)return;
  ov(`<p class="eyebrow">Year ${S.year} news</p><h2>${ev.t}</h2><p>${ev.b}</p>${S.evNote?`<p><b>${esc(S.evNote)}</b></p>`:''}<div class="row"><button type="button" class="btn primary" id="evOk">To the queue</button></div>`);
  $('evOk').onclick=()=>{ls('evseen',S.seed+'-'+S.year);closeOv();};}
function showResponses(){const r=S.resp||[];const ic={accepted:'✅',walked:'🚶',held:'⏸️',refused:'✖️'};
  const acc=r.filter(x=>x.out==='accepted');
  ov(`<h2>Customers respond</h2><p class="fine">${acc.length} of ${r.length} accepted${r.some(x=>x.complaint)?`, ${r.filter(x=>x.complaint).length} complained to Ofgem`:''}.</p>
    <ul class="resp">${r.map(x=>`<li class="o-${x.out}"><span class="ri">${ic[x.out]}</span><span><b>${esc(x.a.name)}</b> <small>${x.label}</small><q>${esc(x.q)}</q>${x.complaint?'<em class="cmp">Complaint to Ofgem</em>':''}${x.g2pen?'<em class="cmp">Confirmed date without Gate 2</em>':''}</span></li>`).join('')}</ul>
    <div class="row"><button type="button" class="btn" id="rRe">Reinforce</button><button type="button" class="btn primary" id="rOk">Plan the year</button></div>`);
  $('rOk').onclick=closeOv;$('rRe').onclick=showReinforce;}
function showReinforce(){const opts=[];
  S.prims.forEach(p=>{['tx','fl'].forEach(k=>opts.push({k,p}));});opts.push({k:'gsp'});if(!S.kc)opts.push({k:'kc'});
  const ro=S.phase==='report'||S.phase==='end';
  const left=BUDGET-S.spend;
  const row=o=>{const B=BUILDS[o.k],inP=buildsAt(o.k,o.p||null).filter(b=>!b.applied),can=!ro&&canBuild(o.k,o.p||null);
    return `<li><span><b>${B.name}${o.p?' · '+PRIMS[o.p].name:''}</b><small>${B.what}. ${money(B.cost)} over ${B.yrs} year${B.yrs>1?'s':''} (${money(B.cost/B.yrs)} a year), ready year ${S.year+B.yrs}.${inP.length?` <b>Under way: ready year ${inP.map(b=>b.done).join(', ')}.</b>`:''}</small></span>
      <button type="button" class="btn sm${can?'':' same'}" data-b="${o.k}" data-p="${o.p||''}" ${can?'':'disabled'}>${can?'Build':inP.length?'Under way':'Done'}</button></li>`;};
  const flexRow=p=>`<li><span><b>Flexibility services · ${PRIMS[p].name}</b><small>Pay local customers to turn down ${FLEX_MW} MW at winter teatime peaks this year. ${money(FLEX_COST)}. Counts towards firm demand capacity.</small></span>
    <button type="button" class="btn sm${S.flexBuy[p]?' same':''}" data-f="${p}" ${ro||S.flexBuy[p]?'disabled':''}>${S.flexBuy[p]?'Bought':'Buy'}</button></li>`;
  ov(`<h2>Reinforcement</h2><p class="fine">Allowance ${money(BUDGET)} a year. Left this year: <b class="${left<0?'neg':''}">${money(left)}</b>. Building costs are spread over the years it takes. Overspend hurts your cost score.</p>
    <h3>Flexible connections: who gets curtailed first</h3>
    <div class="sync-tabs" role="group" aria-label="Curtailment rule"><button type="button" class="sync-t" data-anm="lifo" aria-pressed="${S.anm!=='pro'}" ${ro?'disabled':''}>Last in, first off</button><button type="button" class="sync-t" data-anm="pro" aria-pressed="${S.anm==='pro'}" ${ro?'disabled':''}>Pro rata</button></div>
    <p class="fine">${S.anm==='pro'?'<b>Pro rata:</b> everyone behind a constraint is curtailed by the same share. Fairer to newcomers, so new flexible offers look better, but every new connection eats into existing customers\' curtailment and their limits.':'<b>Last in, first off:</b> the newest flexible customer is curtailed first. Existing customers keep what they were promised, but newcomers behind a busy constraint get high estimates and walk away.'} Applies to the whole network from this year.</p>
    <h3>This winter</h3><ul class="blist">${S.prims.map(flexRow).join('')}</ul>
    <h3>Build</h3><ul class="blist">${opts.map(row).join('')}</ul>
    <div class="row"><button type="button" class="btn primary" id="bOk">Done</button></div>`);
  $('bOk').onclick=closeOv;
  $('ovCard').querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{startBuild(b.dataset.b,b.dataset.p||null,0);save();toast(`${BUILDS[b.dataset.b].name} started.`);showReinforce();});
  $('ovCard').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{S.flexBuy[b.dataset.f]=true;S.spend+=FLEX_COST;save();showReinforce();});
  $('ovCard').querySelectorAll('[data-anm]').forEach(b=>b.onclick=()=>{S.anm=b.dataset.anm==='pro'?'pro':'lifo';save();showReinforce();});}
function stopPlay(){if(playTimer){clearInterval(playTimer);playTimer=null;}}
function playYear(){tut('run');const rep=runYear(),R=rep.R;let m=-1;
  const prims=Object.keys(R.p);
  ov(`<p class="eyebrow">Year ${rep.year}</p><h2>The year plays out</h2><p class="month" id="pM">January</p><div class="prog"><s id="pBar"></s></div>
    <div class="pl" id="pRows">${prims.map(p=>`<div class="pr" data-p="${p}"><b>${esc(PRIMS[p].name)}</b><span class="g"><span>Peak</span><i class="gbar"><s id="pd-${p}"></s></i><em id="pdt-${p}">–</em></span><span class="g"><span>Export</span><i class="gbar"><s id="pe-${p}"></s></i><em id="pet-${p}">–</em></span><small id="pn-${p}"></small></div>`).join('')}</div>
    <p class="ticker" id="pT"></p>
    <div class="tot"><div><span>Hours over firm</span><b id="tH">0</b></div><div><span>Curtailed</span><b id="tC">0 MWh</b></div><div><span>Customer minutes lost</span><b id="tL">0</b></div></div>
    <div class="row"><button type="button" class="btn primary" id="pSkip">Skip to the report</button></div>`,'play');
  let H=0,Cc=0,L=0;
  const step=()=>{m++;if(m>=12){stopPlay();$('pSkip').textContent='See the report';$('pT').textContent='Year over.';return;}
    const M=R.months[m];$('pM').textContent=MONTHS_L[m];$('pBar').style.width=((m+1)/12*100)+'%';
    prims.forEach(p=>{const x=M.p[p],d=clamp(x.maxD,0,1.3),e=clamp(x.maxE,0,1.3);
      const sd=$('pd-'+p),se=$('pe-'+p);sd.style.width=Math.min(100,d*100)+'%';sd.className=d>1?'alarm':d>.9?'warn':'ok';
      se.style.width=Math.min(100,e*100)+'%';se.className=e>1?'alarm':e>.9?'warn':'ok';
      $('pdt-'+p).textContent=Math.round(x.maxD*100)+'%';$('pet-'+p).textContent=Math.round(Math.max(0,x.maxE)*100)+'%';
      const n=[];if(x.bh>0)n.push(`⚠️ ${nf(x.bh)} h over firm`);if(x.cut>.5)n.push(`✂️ ${nf(x.cut)} MWh curtailed`);$('pn-'+p).textContent=n.join(' · ');
      document.querySelector(`.pr[data-p="${p}"]`).classList.toggle('hot',x.bh>0);});
    H+=M.bh;Cc+=M.cut;L+=M.cml;$('tH').textContent=nf(H);$('tC').textContent=nf(Cc)+' MWh';$('tL').textContent=nf(L);
    const st=R.storms.filter(s=>s.m===m);
    const t=st.length?st.map(s=>s.cml>0?`⛈️ Storm at ${PRIMS[s.p].name}: a transformer trips with the substation ${f1(s.lostMW)} MW over firm capacity. ${nf(s.cml)} customer minutes lost.`:`⛈️ Storm at ${PRIMS[s.p].name}: a transformer trips, but the other carries the load. Nobody goes off.`).join(' ')
      :m===5||m===6?'☀️ Sunny weekends: solar pushes power back up through the transformers.':m===0||m===11?'🥶 Winter teatime peaks.':'';
    $('pT').textContent=t;};
  step();playTimer=setInterval(step,window.__GK_FAST?1:700);
  $('pSkip').onclick=()=>{stopPlay();showReport();};}
function showReport(){const r=S.report;if(!r)return;const s=r.sc;
  const rows=[['conn','Connections',`${f1(r.accMW)} MW of real projects connected or contracted, out of ${f1(r.viaMW!=null?r.viaMW:r.genMW)} MW that could have been${r.avgD>0?`, ${f1(r.avgD)} years' wait on average`:''}`],
    ['sec','Network security',`${nf(r.bh)} hours over firm limits${r.R.cml>0?`, ${nf(r.R.cml)} customer minutes lost`:''}`],
    ['curt','Curtailment',r.pot>0?`${nf(r.cut)} MWh curtailed (${f1(r.cut/r.pot*100)}%)${r.over.length?`, ${r.over.length} over their limit: ${money(r.comp)} compensation`:''}`:'No flexible customers connected'],
    ['cost','Cost',`${money(r.spend)} spent of ${money(BUDGET)}${r.under?`: ${money(BUDGET-r.spend)} left unspent while ${f1(r.waitMW)} MW of real projects waited`:''}`],
    ['reg','Regulator rating',`${r.complaints} complaint${r.complaints===1?'':'s'}${r.g2?`, ${r.g2} Gate 2 breach${r.g2===1?'':'es'}`:''}${r.zombies?`, ${r.zombies} stale project${r.zombies===1?'':'s'} left in the queue`:''}`]];
  const nx=EVENTS[r.year+1],end=r.year>=YEARS;
  ov(`<div class="end-h"><span class="grade g-${r.grade}">${r.grade}</span><div><p class="eyebrow">Year ${r.year} of ${YEARS}</p><h2>Year-end report</h2></div></div>
    <ul class="res">${rows.map(([k,n,d])=>`<li><span>${n}</span><b>${Math.round(s[k])}</b><i class="gbar"><s class="${s[k]>=70?'ok':s[k]>=40?'warn':'alarm'}" style="width:${s[k]}%"></s></i><em>${d}</em></li>`).join('')}</ul>
    <h3>From Ofgem</h3><blockquote class="letter">${esc(letter(r))}</blockquote>
    ${end?'':`<h3>Next year</h3><p>Underlying demand grows about ${f1(GROWTH[r.year+1]*100)}%.${nx?` <b>${nx.t}.</b>`:''}</p>`}
    ${lcCard()}<p class="lc-hand"><a class="btn" id="repLC" href="${LC_URL}" target="_top">Run this network in Losing Control →</a><span class="fine">A control room shift on the network you've built, with switching, faults and crews: your flexible customers are the flexibility you can call.</span></p>
    <div class="row"><button type="button" class="btn" id="repClose">Back to the network</button><button type="button" class="btn primary" id="repGo">${end?'Ofgem verdict':`Start year ${r.year+1}`}</button></div>`);
  $('repClose').onclick=closeOv;$('repGo').onclick=()=>{if(end)showEnd();else{closeOv();startYear();render();maybeEvent();syncQuiet();}};
  {const lc=$('repLC');if(lc)lc.onclick=e=>{exportNet();};}
  tut('report');}
function showEnd(){const h=S.hist,avg=h.reduce((t,x)=>t+x.avg,0)/h.length,g=gradeOf(avg),stars=h.reduce((t,x)=>t+starsOf(x.grade),0);
  const V={A:'Ofgem holds Blackout Canyon up as an example to every network in the country. You connected people fast, kept the lights on and spent wisely.',B:'A solid decade. Ofgem notes a few bumps, but Blackout Canyon is in good shape for net zero.',C:'Ofgem is satisfied, just. Developers grumble, and the network has some catching up to do.',D:'Ofgem opens an investigation into your connections service. Expect a lot of meetings.',E:'Ofgem takes the unusual step of naming you in a press release. It is not a compliment.'};
  ov(`<div class="end-h"><span class="grade g-${g}">${g}</span><div><p class="eyebrow">Ten years at Blackout Canyon</p><h2>The Ofgem verdict</h2></div></div>
    <p>${V[g]}</p><p class="stars">${'★'.repeat(stars)}${'☆'.repeat(30-stars)}<br><small>${stars} of 30 stars</small></p>
    <table class="hist"><tr><th>Year</th>${h.map(x=>`<td>${x.year}</td>`).join('')}</tr><tr><th>Grade</th>${h.map(x=>`<td class="g-${x.grade}">${x.grade}</td>`).join('')}</tr></table>
    <p class="fine">Connected over the decade: ${f1(S.cust.filter(c=>!c.gone&&c.built&&!c.existing).reduce((t,c)=>t+c.mw,0))} MW, ${S.cust.filter(c=>!c.gone&&c.built&&c.offer==='flex').length} of them flexible.</p>
    <p class="score-big"><small>Career score</small><b>${nf(careerScore())}</b><span class="fine">${S.mode==='week'?`The week's canyon, week of ${fmtDay(S.week)}`:'Free play'}</span></p>
    ${submitBox()}
    ${lcCard()}<p class="lc-hand"><a class="btn" id="eLC" href="${LC_URL}" target="_top">Run your network in Losing Control →</a><span class="fine">Take the network you built into a control room shift, with switching, faults and field crews. The flexible customers you connected are the flexibility you can call, and any reinforcement you skipped is the overload you're fighting.</span></p>
    <div class="row"><button type="button" class="btn" id="eBack">Back to the network</button><button type="button" class="btn primary" id="eNew">New career</button></div>`);
  $('eBack').onclick=closeOv;$('eNew').onclick=()=>showNew();$('eLC').onclick=()=>{exportNet();};wireSubmit();
  const b=bestGet(),sc=careerScore();if(!b||sc>b.score)ls('best',JSON.stringify({score:sc,grade:g,stars}));}

/* ---------- Menu and new games ---------- */
function showMenu(){const L=syncGet(),b=bestGet(),played=S.hist.length>0;
  ov(`<h2>Gatekeeper</h2><p class="fine">Year ${S.year} of ${YEARS} · ${S.mode==='week'?`the week's canyon (week of ${fmtDay(S.week)})`:'free play'}${b?` · your best career ${nf(b.score)}`:''}</p>
    <div class="menu">
      <button type="button" class="btn" id="mHelp">How to play</button>
      <button type="button" class="btn" id="mTut">Replay the tutorial</button>
      <button type="button" class="btn" id="mBoard">Scoreboard</button>
      <button type="button" class="btn" id="mNew">New career</button>
      ${played?`<a class="btn" id="mLC" href="${LC_URL}" target="_top">Run your network in Losing Control →</a>`:''}
    </div>
    ${lcCard()}${syncBox()}
    <div class="row"><button type="button" class="btn primary" id="mClose">Back to the game</button></div>`);
  $('mClose').onclick=closeOv;$('mHelp').onclick=showHelp;$('mBoard').onclick=()=>showBoard();$('mNew').onclick=()=>showNew();
  $('mTut').onclick=()=>{ls('tut',null);ls('lessons',null);closeOv();if(S.year===1&&S.phase==='queue'){tutI=0;renderTut();}else showNew(true);};
  {const l=$('mLC');if(l)l.onclick=()=>{exportNet();};}
  wireSync();}
function showNew(fromTut){const wk=mondayOf(todayUK()),inProg=S&&S.year>1&&S.phase!=='end';
  ov(`<h2>New career</h2><p>${fromTut?'The tutorial runs in year 1 of a new career. ':''}Ten years at Blackout Canyon, from year 1.${inProg?` <b>Your current career (year ${S.year}) will be lost.</b>`:''}</p>
    <div class="levels"><button type="button" class="btn lv" id="nWeek"><b>The week's canyon</b><small>Week of ${fmtDay(wk)}: the same applications and events for everyone this week, with its own scoreboard.</small></button>
    <button type="button" class="btn lv" id="nFree"><b>A random canyon</b><small>Different applications every time. Free play scoreboard.</small></button></div>
    <div class="row"><button type="button" class="btn" id="nNo">${inProg?'Keep playing':'Back'}</button></div>`);
  const go=(m)=>{ls('evseen',null);if(fromTut)ls('tut',null);newCareer(m==='week'?weekSeed(wk):Date.now(),m,m==='week'?wk:null);ls('seen','1');closeOv();tutI=0;maybeEvent();syncQuiet(true);};
  $('nWeek').onclick=()=>go('week');$('nFree').onclick=()=>go('free');$('nNo').onclick=closeOv;}

/* ---------- Scoreboard: whole careers, free play and the week's canyon ---------- */
const modeKey=()=>S.mode==='week'?'gk-week-'+S.week:'gk-free';
let boardMode=null;
async function showBoard(m){boardMode=m||boardMode||modeKey();const wk=mondayOf(todayUK()),wkKey='gk-week-'+wk;
  const tabs=[[wkKey,`This week's canyon`],['gk-free','Free play']];if(S.mode==='week'&&S.week!==wk)tabs.unshift(['gk-week-'+S.week,`Week of ${fmtDay(S.week)}`]);
  ov(`<h2>Scoreboard</h2><p class="fine">Whole ten-year careers: the sum of your yearly report cards × 10, up to 10,000. Each player's best career.</p>
    <div class="sync-tabs" role="group" aria-label="Board">${tabs.map(([k,t])=>`<button type="button" class="sync-t" data-bm="${k}" aria-pressed="${k===boardMode}">${t}</button>`).join('')}</div>
    <div id="boardBody"><p class="fine">Loading…</p></div>
    <div class="row"><button type="button" class="btn primary" id="bClose">Close</button></div>`);
  $('bClose').onclick=closeOv;$('ovCard').querySelectorAll('[data-bm]').forEach(b=>b.onclick=()=>showBoard(b.dataset.bm));
  const me=(syncGet()||{}).name||getName(),key=boardMode;
  try{const r=await fetch(SCORE_URL+'?game=gk&mode='+encodeURIComponent(key));const j=await r.json();if(key!==boardMode||!$('boardBody'))return;
    if(!j.ok||!(j.version>=23)){$('boardBody').innerHTML='<p class="fine">The Gatekeeper scoreboard is coming soon.</p>';return;}
    $('boardBody').innerHTML=j.scores.length?`<table class="board-t"><tr><th>#</th><th>Name</th><th>Score</th><th>Grade</th><th>Stars</th></tr>${j.scores.map((x,i)=>`<tr class="${me&&x.name.toLowerCase()===me.toLowerCase()?'me':''}"><td>${i+1}</td><td class="nm">${esc(x.name)}</td><td>${nf(x.score)}</td><td>${esc(x.grade)}</td><td>${x.stars}★</td></tr>`).join('')}</table>`:'<p class="fine">No careers finished yet. Be the first.</p>';}
  catch(e){if($('boardBody'))$('boardBody').innerHTML=`<p class="fine">Couldn't reach the scoreboard. ${location.hostname.endsWith('wattsupelectricity.co.uk')?'Check your connection and try again.':`It works on the game's own website, ${HOME_HOST}.`}</p>`;}}
function getName(){try{return localStorage.getItem('fc-name')||'';}catch(e){return '';}}
function saveName(n){try{localStorage.setItem('fc-name',n);}catch(e){}}
const bestGet=()=>{try{return JSON.parse(ls('best')||'null');}catch(e){return null;}};
const r13=s=>s.replace(/[a-z]/g,c=>String.fromCharCode((c.charCodeAt(0)-84)%26+97));
const BAD_SUB=r13('shpx,fuvg,phag,jnax,gjng,obyybpx,onfgneq,ovgpu,avtt,snttbg,ergneq,juber,fyhg,chffl,anmv,uvgyre,zbgures,nffubyr,nefrubyr,qvyqb,wvmm,fcnfgvp,oryyraq,abapr,cnrqb,crqb').split(',');
const BAD_TOK=r13('qvpx,pbpx,cevpx,nefr,nff,gvgf,gvg,cvff,penc,xabo,abo,encr,snt,cnxv,pbba,puvax,xvxr,genaal,fcnm,phz,cbea,frk,nany,cbb,gheq').split(',');
function rude(n){const s=n.toLowerCase().replace(/[@4]/g,'a').replace(/3/g,'e').replace(/[1!|]/g,'i').replace(/0/g,'o').replace(/[5$]/g,'s').replace(/7/g,'t');
  const flat=s.replace(/[^a-z]/g,'').replace(/scunthorpe|snigger|shiitake|shitake|penistone/g,'');if(BAD_SUB.some(w=>flat.includes(w)))return true;
  return s.split(/[^a-z]+/).some(t=>BAD_TOK.includes(t));}
function submitBox(){const d=S.submitted;
  return `<div class="submit"><label for="pName">Put your career on the scoreboard</label><div class="sub-row"><input id="pName" maxlength="20" autocomplete="nickname" placeholder="e.g. Sparky Sue" value="${esc(getName())}" ${d?'disabled':''}>
    <button type="button" class="btn primary" id="subBtn" ${d?'disabled':''}>${d?'Submitted':'Submit'}</button></div>
    <p class="fine ${d?'ok':''}" id="subMsg">${d?`Submitted. You're #${d.rank} of ${d.total}.`:''}</p><p class="fine"><button type="button" class="link" id="seeBoard">See the scoreboard</button></p></div>`;}
function wireSubmit(){const b=$('subBtn');if(b)b.onclick=submitScore;const sb=$('seeBoard');if(sb)sb.onclick=()=>showBoard(modeKey());}
async function submitScore(){const inp=$('pName'),btn=$('subBtn'),msg=(t,c)=>{const m=$('subMsg');if(m){m.textContent=t;m.className='fine '+(c||'');}};
  const nm=inp.value.trim().replace(/\s+/g,' ').slice(0,20);if(nm.length<2||rude(nm)){msg('Please choose a different name: 2 to 20 letters or numbers, nothing rude.','err');inp.focus();return;}
  saveName(nm);btn.disabled=true;msg('Sending…');
  try{const r=await fetch(SCORE_URL,{method:'POST',body:JSON.stringify({game:'gk',site:location.hostname,name:nm,mode:modeKey(),seed:S.seed,years:S.hist.map(h=>h.sc)})});const j=await r.json();
    if(!j.ok){btn.disabled=false;msg(j.error==='name'?'Please choose a different name.':j.error==='site'?`Scores can only be saved on the game's own website, ${HOME_HOST}.`:!(j.version>=23)?'The Gatekeeper scoreboard isn\'t switched on yet, so this score wasn\'t saved.':'The scoreboard didn\'t accept that score.','err');return;}
    S.submitted={rank:j.rank,total:j.total};save();inp.disabled=true;btn.textContent='Submitted';msg(`Submitted. You're #${j.rank} of ${j.total}${j.best>j.score?` (your best is ${nf(j.best)})`:''}.`,'ok');}
  catch(e){btn.disabled=false;msg(`Couldn't reach the scoreboard, so your score wasn't saved.${location.hostname.endsWith('wattsupelectricity.co.uk')?' Try again.':` It works on the game's own website, ${HOME_HOST}.`}`,'err');}}

/* ---------- Saving online: the same name and PIN as Losing Control ----------
   The scoreboard keeps the game in progress (the newest save wins) and your best career. The link is shared with
   Losing Control on this site (fc-sync), so a player who already saves their career there is saved here too. */
const SYNC_KEY='fc-sync';
function syncGet(){try{const v=JSON.parse(localStorage.getItem(SYNC_KEY)||'null');return v&&v.name&&/^\d{4}$/.test(v.pin)?v:null;}catch(e){return null;}}
function syncSet(v){try{if(v)localStorage.setItem(SYNC_KEY,JSON.stringify(v));else localStorage.removeItem(SYNC_KEY);}catch(e){}}
const SYNC_ERR={name:'Please choose a different name: 2 to 20 letters or numbers, nothing rude.',pin_format:'The PIN must be 4 digits.',
  pin:'That name is already saved with a different PIN. If it\'s yours, check the PIN. If not, pick another name.',locked:'Too many wrong PINs for that name. Try again in 15 minutes.',
  site:`Saving online only works on the game's own website, ${HOME_HOST}.`,net:'Couldn\'t reach the scoreboard. Check your connection and try again.',
  none:'Nothing is saved under that name. Check the spelling, or choose Save this game.',big:'This game is too big to save online.',
  old:'The scoreboard hasn\'t been updated for Gatekeeper yet. Try again later.'};
let syncBusy=false,syncNote='',syncTab='';
async function syncGame(name,pin,intent){if(syncBusy)return{ok:false,error:'busy'};syncBusy=true;
  try{const b=bestGet();const r=await fetch(SCORE_URL,{method:'POST',body:JSON.stringify({type:'career',intent:intent||'sync',game:'gk',site:location.hostname,name,pin,career:intent==='load'?{save:'',t:0,best:b}:{save:saveData(),t:S.t,best:b}})});const j=await r.json();
    if(!j||!j.ok){const e=(j&&j.error)||'net';return{ok:false,error:SYNC_ERR[e]?e:'old',triesLeft:j&&j.triesLeft};}
    if(!(j.version>=23)||!j.career||!('save' in j.career))return{ok:false,error:'old'};
    syncSet({name:j.name,pin,at:Date.now()});
    const c=j.career;let loaded=false;
    if(c.best&&(!b||c.best.score>b.score))ls('best',JSON.stringify(c.best));
    if(c.save&&(intent==='load'||c.t>S.t+1000)){try{const g=JSON.parse(c.save);if(g&&g.v===SAVE_V&&g.year>=1){S=g;ls('save',JSON.stringify(S));loaded=true;}}catch(e){}}
    return{ok:true,created:!!j.created,loaded,name:j.name};}
  catch(e){return{ok:false,error:'net'};}finally{syncBusy=false;}}
// in the background with the saved link: when the game opens and after each year
async function syncQuiet(){const L=syncGet();if(!L||!S)return null;const r=await syncGame(L.name,L.pin);
  if(r.ok){syncNote='';if(r.loaded){closeOv();$('sheet').hidden=true;render();toast(`Carried on from your other device: year ${S.year}.`);}}
  else if(r.error==='pin'||r.error==='name'){syncSet(null);syncNote=`Saving stopped: the saved PIN no longer matches the name ${L.name}. Save online again from the menu.`;}
  else if(r.error!=='busy')syncNote=r.error==='net'?'Not saved online just now: couldn\'t reach the scoreboard. It will try again after next year.':SYNC_ERR[r.error]||'';
  return r;}
function syncBox(){const L=syncGet(),note=`<p class="fine" id="syncMsg" role="status">${esc(syncNote)}</p>`;
  if(L)return `<div class="sync on"><h3>Saved online</h3><p class="fine">As <b>${esc(L.name)}</b>. Your game saves after every year. On another phone or computer, open the menu and load it with the same name and PIN.</p>
    <div class="sub-row"><button type="button" class="btn" id="syNow">Save now</button><button type="button" class="btn" id="syOff">Stop saving on this device</button></div>${note}</div>`;
  const ld=(syncTab||'save')==='load';
  return `<div class="sync"><h3>Play on any device</h3><div class="sync-tabs" role="group"><button type="button" class="sync-t" data-sy="save" aria-pressed="${!ld}">Save this game</button><button type="button" class="sync-t" data-sy="load" aria-pressed="${ld}">Load a saved game</button></div>
    <p class="fine">${ld?'Saved a game on another device? Enter the same name and PIN to carry on here.':'Save it online with a name and a 4-digit PIN. The same name and PIN as your Losing Control career.'}</p>
    <div class="sub-row sy"><input id="syName" maxlength="20" autocomplete="nickname" placeholder="Name" value="${esc(getName())}" aria-label="Name"><input id="syPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="PIN" aria-label="4-digit PIN"><button type="button" class="btn primary" id="syGo">${ld?'Load':'Save'}</button></div>${note}</div>`;}
function wireSync(){const q=s=>$('ovCard').querySelector(s);
  $('ovCard').querySelectorAll('[data-sy]').forEach(b=>b.onclick=()=>{syncTab=b.dataset.sy;syncNote='';showMenu();});
  const say=t=>{const m=$('syncMsg');if(m)m.textContent=t;};
  if(q('#syGo'))q('#syGo').onclick=async()=>{const ld=(syncTab||'save')==='load',n=$('syName').value.replace(/\s+/g,' ').trim(),p=$('syPin').value.trim();
    if(n.length<2||rude(n)){say(SYNC_ERR.name);return;}if(!/^\d{4}$/.test(p)){say(SYNC_ERR.pin_format);return;}
    say(ld?'Loading…':'Saving…');const r=await syncGame(n,p,ld?'load':'sync');
    if(!r.ok){if(r.error!=='busy')say(r.error==='pin'&&r.triesLeft?`${SYNC_ERR.pin} ${r.triesLeft} ${r.triesLeft===1?'try':'tries'} left.`:SYNC_ERR[r.error]||SYNC_ERR.net);return;}
    if(!getName())saveName(r.name);
    syncNote=r.loaded?`Loaded. Welcome back, ${r.name}: year ${S.year}.`:r.created?`Saved online as ${r.name}.`:ld?`Loaded ${r.name}. This device already had the newest game.`:`Saved online as ${r.name}.`;syncTab='';render();showMenu();};
  if(q('#syNow'))q('#syNow').onclick=async()=>{say('Saving…');const r=await syncQuiet();if(r&&r.ok)syncNote=r.loaded?`Loaded a newer game from another device: year ${S.year}.`:'Saved. Everything is up to date.';showMenu();};
  if(q('#syOff'))q('#syOff').onclick=()=>{syncSet(null);syncNote='This device no longer saves online. Your game is still here.';showMenu();};}

/* ---------- Into Losing Control ----------
   The network you've built, for a Losing Control control room shift (same site, so localStorage 'gk-export').
   kD: how loaded the grid supply point is at peak compared with the network you inherited; E: export at its worst, as a share of the export limit.
   Flexible customers become the flexibility you can call there. */
function gspPeaks(st){const C=cfg(st),list=st.cust.filter(c=>!c.gone&&c.built&&C.prims.includes(c.prim)).map(c=>[c.mw,U(c).act]);let D=0,E=0;
  for(let i=0;i<NP;i++){let g=0;for(const p of C.prims)g+=C.peak[p]*P_BASE[i]-dsrAt(st,p,i);for(const [m,a] of list)g+=m*a[i];if(g>D)D=g;if(-g>E)E=-g;}
  return {D:D/C.gsp.F,E:E/C.gsp.R,F:C.gsp.F};}
function baseState(){const s={cap:{},gsp:{...GSP0},peak:{},prims:['hw','ml','rv','js'],kc:false,builds:[],flexBuy:{},weather:1,
  cust:[{kind:'solar',mw:10,prim:'ml',offer:'firm',built:true},{kind:'wind',mw:12,prim:'rv',offer:'firm',built:true},{kind:'chp',mw:8,prim:'rv',offer:'firm',built:true}]};
  Object.keys(PRIMS).forEach(p=>{s.cap[p]={F:PRIMS[p].F,R:PRIMS[p].R,FL:PRIMS[p].FL};s.peak[p]=PRIMS[p].peak;});return s;}
function exportNet(){const g=gspPeaks(S),b=gspPeaks(baseState()),flex=S.cust.filter(c=>!c.gone&&c.built&&c.offer==='flex');
  const grp=f=>{const l=flex.filter(f).sort((a,b)=>b.mw-a.mw);return{mw:Math.round(l.reduce((t,c)=>t+c.mw,0)*10)/10,names:l.map(c=>c.name).slice(0,3),n:l.length};};
  const done=S.hist.length,last=S.hist[done-1];
  const x={v:1,at:Date.now(),year:done,grade:last?last.grade:'',mode:S.mode,kD:Math.round(g.D/b.D*1000)/1000,E:Math.round(g.E*1000)/1000,
    gspF:S.gsp.F,sgt:S.gsp.F>GSP0.F,dsr:grp(c=>!KINDS[c.kind].gen),batt:grp(c=>c.kind==='batt'),solar:grp(c=>c.kind==='solar'),
    flexBuy:Object.keys(S.flexBuy).length*FLEX_MW};
  ls('export',JSON.stringify(x));return x;}

/* ---------- Back from Losing Control ----------
   Losing Control writes localStorage 'gk-result' when a Your network shift ends. Finishing it earns the
   Planned it, ran it badge (in Losing Control's achievements too). */
const lcResult=()=>{try{const r=JSON.parse(ls('result')||'null');return r&&r.v===1?r:null;}catch(e){return null;}};
function lcCard(){const r=lcResult();if(!r)return '';
  return `<div class="lc-res"><p class="eyebrow">Your network in Losing Control</p><p><b>Year ${r.year} network: ${r.lost?'Blackout Canyon was lost':'grade '+esc(r.grade)}</b> · ${nf(r.score)} points · ${nf(r.cml||0)} customer minutes lost${r.risk?` · ${nf(r.risk)} min at risk`:''}</p>
    ${r.lost?'<p class="fine">Finish the shift to earn the Planned it, ran it badge.</p>':'<p><span class="pbadge">★ Planned it, ran it</span></p>'}</div>`;}
function lcBack(){const r=lcResult();if(!r||r.at<=+(ls('resultSeen')||0))return;ls('resultSeen',String(r.at));
  toast(`Back from Losing Control: your year ${r.year} network ${r.lost?'was lost':'got a '+r.grade}${r.lost?'':'. Planned it, ran it!'}`);}

/* ---------- First-year tutorial ---------- */
const TUT=[
  {id:'queue',t:'Welcome to Gatekeeper. These are this year\'s applications to connect to your network. Tap one to study it.',el:'#queue',on:'open'},
  {id:'study',t:'The bars show how much firm headroom it would use at its substation. <b>Fits firm</b> means a firm connection is safe all year; <b>Doesn\'t fit firm</b> means it would overload the network at times. Pick an offer at the bottom.',el:'.offers',on:'choose',top:true},
  {id:'flex',t:'Now find one marked <b>Doesn\'t fit firm</b> and look at its <b>Flexible connection</b>: it connects now and gets curtailed when the network is tight. If the estimated curtailment is no more than the customer will put up with, they\'ll usually sign.',el:'#queue',on:'choose',skip:()=>!S.queue.some(a=>!a.choice&&assess(a).cls!=='green')},
  {id:'pipe',t:'Down here: your predecessor promised connections that haven\'t been built yet. They hold firm headroom whether or not they ever get built. Under the old rules you can\'t remove them; from year 3 you can.',el:'#pipe',ok:true},
  {id:'send',t:'Give every application an offer (holding or refusing counts), then press <b>Send offers</b>.',el:'#goBtn',on:'sent'},
  {id:'reinf',t:'Customers have replied. <b>Reinforce</b> builds transformers, switchgear or a new primary, which take years, out of £8m a year. You don\'t need any yet. Press <b>Run the year</b>.',el:'#goBtn',on:'run',when:()=>$('ov').hidden},
  {id:'report',t:'Your report card: five scores, a grade and a letter from Ofgem. Every year brings new applications, and news that changes the rules. Good luck.',el:'.res',ok:true,last:true,when:()=>!$('ov').hidden&&!!document.querySelector('.res')}];
let tutI=0,tutScrolled=-1;
const tutOn=()=>S&&S.year===1&&!ls('tut')&&!!ls('seen');
function tut(ev,a){if(!tutOn())return;let st=TUT[tutI];if(!st)return;
  if(st.on===ev)tutNext();else renderTut();}
function tutNext(){tutI++;while(TUT[tutI]&&TUT[tutI].skip&&TUT[tutI].skip())tutI++;if(!TUT[tutI]){ls('tut','done');}renderTut();}
/* Short guided lessons when the rules change (year 3: Gate 2; year 6: demand reform), after the year's news card.
   Shown once per career; "Turn off tips" stops them on this device. */
const LESSONS={
  3:[{t:'New rules: the queue is now in <b>Gate 2 order</b>. Projects that are ready and needed have moved ahead of earlier ones that aren\'t, and offers nearer the top use headroom first.',el:'#queue'},
     {t:'Gate 2 needs three things: <b>land</b>, <b>planning</b> and a <b>need</b> in the regional plan. Give <b>Gate 1 only</b> projects no confirmed date: put them on the waiting list. That draws no complaint.',el:'.app .g2'},
     {t:'Contracted projects that missed their milestone can now be <b>removed</b>. Read what the developer says: real projects usually explain why they\'re late; speculative ones mostly don\'t reply. Remove a real one and they\'ll complain.',el:'#pipe'},
     {t:'Also new: on the <b>Reinforce</b> screen you choose who gets curtailed first, last in first off or pro rata.',el:'#reBtn'}],
  6:[{t:'Demand projects now need <b>Gate 2</b> too. Data centres are only <b>needed</b> in the Hertz House growth zone (and Kilowatt Close, if you build it). Anywhere else they\'re Gate 1 only.',el:'#queue'},
     {t:'Data centres are big and steady: 12 to 35 MW. A firm one can use up a substation on its own. Try a flexible offer, or plan a new primary or a fourth supergrid transformer.',el:'#tiles'}]};
let lesI=0;
const lesson=()=>{const L=LESSONS[S&&S.year];return L&&S.phase==='queue'&&!(S.lessons&&S.lessons[S.year])&&ls('lessons')!=='off'&&ls('seen')?L:null;};
function renderLesson(el){const L=lesson();if(!L||!$('ov').hidden||!$('sheet').hidden){el.hidden=true;return;}
  if(lesI>=L.length)lesI=0;const st=L[lesI],last=lesI===L.length-1,t=document.querySelector(st.el);if(t)t.classList.add('tut-hl');
  el.innerHTML=`<p><span class="coach-n">Year ${S.year} · ${lesI+1}/${L.length}</span> ${st.t}</p><div class="coach-b"><button type="button" class="link" id="tSkip">Turn off tips</button><button type="button" class="btn sm primary" id="tOk">${last?'Got it':'Next'}</button></div>`;
  el.classList.remove('low');el.hidden=false;
  if(t&&t.scrollIntoView&&tutScrolled!==100+lesI){tutScrolled=100+lesI;t.scrollIntoView({block:'center',behavior:'smooth'});}
  const done=()=>{(S.lessons=S.lessons||{})[S.year]=1;lesI=0;save();renderTut();};
  $('tSkip').onclick=()=>{ls('lessons','off');done();};$('tOk').onclick=()=>{if(last)done();else{lesI++;renderTut();}};}
function renderTut(){const el=$('coach');document.querySelectorAll('.tut-hl').forEach(x=>x.classList.remove('tut-hl'));
  if(!(tutOn()&&TUT[tutI]))return renderLesson(el);
  const st=tutOn()&&TUT[tutI];if(!st||(st.when&&!st.when())||(!$('ov').hidden&&!st.when)||(st.id==='study'&&$('sheet').hidden)){el.hidden=true;return;}
  if(st.id==='send'&&S.phase!=='queue'){tutI++;return renderTut();}
  const t=document.querySelector(st.el);if(t)t.classList.add('tut-hl');
  el.innerHTML=`<p><span class="coach-n">${tutI+1}/${TUT.length}</span> ${st.t}</p><div class="coach-b"><button type="button" class="link" id="tSkip">Skip the tutorial</button>${st.ok?`<button type="button" class="btn sm primary" id="tOk">${st.last?'Done':'Got it'}</button>`:''}</div>`;
  el.classList.toggle('low',!!st.top);el.hidden=false;
  if(t&&t.scrollIntoView&&tutScrolled!==tutI&&(st.el==='#queue'||st.el==='#pipe')){tutScrolled=tutI;t.scrollIntoView({block:st.el==='#pipe'?'center':'start',behavior:'smooth'});}
  $('tSkip').onclick=()=>{ls('tut','done');renderTut();};const ok=$('tOk');if(ok)ok.onclick=()=>tutNext();}

/* ---------- Wiring ---------- */
function go(){if(S.phase==='queue'){if(S.queue.some(a=>!a.choice))return;sendOffers();render();showResponses();}
  else if(S.phase==='plan')playYear();
  else if(S.phase==='report'){closeOv();startYear();render();maybeEvent();}
  else showEnd();}
function init(){
  S=load();if(!S){const wk=mondayOf(todayUK());newCareer(weekSeed(wk),'week',wk);}
  document.addEventListener('click',e=>{const t=e.target.closest('[data-a],[data-p],[data-rm]');if(!t||t.closest('#ov'))return;
    if(t.dataset.a&&S.phase==='queue')openApp(+t.dataset.a);
    else if(t.dataset.rm){const c=S.cust.find(x=>x.id===+t.dataset.rm);if(c&&S.reform&&missed(c)){c.gone=true;if(!c.spec&&S.yr){S.yr.complaints++;S.yr.terminated=(S.yr.terminated||0)+1;}save();toast(c.spec?`${c.name} removed from the queue. Its headroom is free again.`:`${c.name} removed. It was a real project, nearly ready to build: the developer has complained to Ofgem.`);render();}}
    else if(t.dataset.p&&t.classList.contains('tile'))openPrim(t.dataset.p);});
  $('goBtn').onclick=go;$('reBtn').onclick=showReinforce;$('helpBtn').onclick=showMenu;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('ov').hidden&&!playTimer)closeOv();else if(!$('sheet').hidden)closeSheet();}});
  render();
  if(!ls('seen'))showHelp();
  else if(S.phase==='report'&&S.report)showReport();
  else if(S.phase==='end')showEnd();
  else maybeEvent();
  syncQuiet();lcBack();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)lcBack();});addEventListener('focus',lcBack);}
if(typeof window!=='undefined'&&window.__GK_TEST)window.__gk={get S(){return S;},set S(v){S=v;},newCareer,startYear,plan,simulate,assess,offers,reinfFor,flexEst,sendOffers,runYear,startBuild,render,devNote,lcResult,gate2,g2Applies,PTS,unit,go,exportNet,gspPeaks,baseState,saveData,weekSeed,mondayOf,careerScore,showBoard,showMenu,syncGame,get tutI(){return tutI;}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
