/*! Firm Capacity / Firm Capacity: Control Room
 * © 2026 Steve Backhouse. All rights reserved.
 * Not open source: copying, re-hosting or reuse of this code or content without
 * written permission is prohibited. See https://github.com/DER-Dash/Network/blob/main/LICENSE */
(function(){
const $=id=>document.getElementById(id);
const GAME='cr'; // replaced with 'fc' when the generation game is built
const CR_URL='https://der-dash.github.io/Network/control-room/',FC_URL='https://der-dash.github.io/Network/';
const CFG=GAME==='fc'?{start:300,end:1380,rate:5.1,pre:'fcg-',salt:'fcg1',def:'may',tag:'Generation',docTitle:'Firm Capacity',site:FC_URL,
    band:'Generation · keeping Blackout Canyon inside firm capacity. Mostly.',eyebrow:'Generation · Blackout Canyon 33 kV',h2:'Keep Blackout Canyon inside firm capacity',
    board:'Generation',share:'Firm Capacity',other:{url:CR_URL,hdr:'Control room game →',foot:'Play the control room game',
    box:'<b>Prefer switching?</b> Try the control room game: switch, transfer and restore supply across Blackout Canyon\'s substations through faults and planned work.',cta:'Play the control room game →'}}
  :{start:480,end:1200,rate:3.4,pre:'fc4-',salt:'fc5',def:'mesh',tag:'Control room',docTitle:'Firm Capacity Control Room',site:CR_URL,
    band:'Control room · keeping Blackout Canyon switched on. Mostly.',eyebrow:'Control room · Blackout Canyon 33 kV',h2:'Run the Blackout Canyon network',
    board:'Control room',share:'Firm Capacity: Control Room',other:{url:FC_URL,hdr:'Generation game →',foot:'Play the generation game',
    box:'<b>Prefer generation?</b> Try the generation game: balance solar, wind, batteries and flexibility to keep the transformers inside their rating.',cta:'Play the generation game →'}};
let R=60;const START=CFG.start,END=CFG.end,TAU=45,TRIP_T=140,SOC_MAX=60;
const CUST_TOTAL=60000,SHORT_INT=3,CREW_ON=GAME==='cr',MANUAL=['tie','it','nop','lk'],CREW_SPEED=70,CREW_OP=2,DEPOT={x:1150,y:62};
const EMERG=1.2,EMERG_MIN=30,SHORT=1.5,SHORT_MIN=5,PAR_MAX=30,OV_MIN=10,INCIDENT_PTS=500,AL_ON=.8,AL_OFF=.75;
const RATE={1:CFG.rate,2:CFG.rate*2,4:CFG.rate*4};
const isManual=k=>CREW_ON&&MANUAL.includes(k.split(':')[0]);
const CAREER=GAME==='cr'?['grid','storm','heat','jan','snow','gsp','mesh']:['may','storm','jan'];
const RANKS=GAME==='cr'?[[0,'Trainee control engineer'],[3,'Assistant control engineer'],[6,'Control engineer'],[10,'Senior control engineer'],[14,'Control room manager'],[18,'Head of network operations']]
  :[[0,'Trainee flexibility analyst'],[2,'Flexibility analyst'],[4,'Flexibility engineer'],[6,'Senior flexibility engineer'],[9,'DSO manager']];
const ACH=[
  {id:'first',name:'First shift',d:'Finish any shift.'},
  {id:'clean',name:'Clean sheet',d:'Finish a shift with no switching incidents.'},
  {id:'solid',name:'Rock solid',d:'Finish a shift with no minutes at risk.'},
  {id:'quick',name:'Quick hands',d:'Finish a shift where every interruption was restored inside 3 minutes.',cr:1},
  {id:'nobody',name:'Nobody noticed',d:'Finish a shift with no customers off at all.'},
  {id:'mbb',name:'Make before break',d:'Transfer a substation to Ampy Place without an interruption.',cr:1},
  {id:'crews',name:'Crew boss',d:'Complete 8 crew jobs in one shift.',cr:1},
  {id:'vf',name:'Volt Face value',d:'Have 20 MW on Volt Face backfeeds at once.',cr:1},
  {id:'heat',name:'Keep your cool',d:'Grade A or B on the Heatwave.',cr:1},
  {id:'gsp',name:'Grid guardian',d:'Finish the Grid emergency without National Grid disconnecting a transformer.',cr:1},
  {id:'cheap',name:'Bargain hunter',d:'Finish a generation shift spending under £2,000.',fc:1},
  {id:'textbook',name:'Textbook',d:'Grade A on every career shift.'}].filter(a=>GAME==='cr'?!a.fc:!a.cr);
function career(){try{return JSON.parse(ls('career')||'null')||{stars:{},ach:{},best:{}};}catch(e){return{stars:{},ach:{},best:{}};}}
function saveCareer(c){ls('career',JSON.stringify(c));}
const starsOf=c=>CAREER.reduce((a,k)=>a+(c.stars[k]||0),0);
const rankOf=n=>{let r=RANKS[0][1];RANKS.forEach(([t,nm])=>{if(n>=t)r=nm;});return r;};
const nextRank=n=>RANKS.find(([t])=>t>n);
const unlockedK=(c,k)=>{const i=CAREER.indexOf(k);return i<=0||(c.stars[CAREER[i-1]]||0)>=1;};
const starStr=n=>'★'.repeat(n)+'☆'.repeat(3-n);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtT=m=>{m=Math.round(m);m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
const gbp=x=>'£'+Math.round(x).toLocaleString('en-GB');
const mw=x=>Math.round(x)+' MW';
const nf=v=>Math.round(v).toLocaleString('en-GB');
const sgn=v=>(v>0?'+':v<0?'−':'')+Math.abs(Math.round(v));
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(CFG.pre+k);localStorage.setItem(CFG.pre+k,v);}catch(e){return null;}}
function rngFrom(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h|0;}
function makeNoise(rng,step){const n=Math.ceil(1500/step)+3;const p=Array.from({length:n},()=>rng()*2-1);return m=>{const x=Math.max(0,m)/step,i=Math.floor(x),f=x-i,w=(1-Math.cos(Math.PI*f))/2;return p[i]*(1-w)+p[i+1]*w;};}
function interp(k,h){for(let i=1;i<k.length;i++){if(h<=k[i][0]){const[h0,v0]=k[i-1],[h1,v1]=k[i];return v0+(v1-v0)*(h-h0)/(h1-h0);}}return k[k.length-1][1];}
const pick=(rng,a)=>a[Math.floor(rng()*a.length)];
function todayUK(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch(e){return new Date().toISOString().slice(0,10);}}
function fmtDate(d){const[y,mo,da]=d.split('-').map(Number);return new Date(Date.UTC(y,mo-1,da)).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});}
function gauss(A,b){const n=b.length,M=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];const d=M[c][c]||1e-9;
    for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c]/d;if(!f)continue;for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k];}}
  return M.map((r,i)=>r[n]/(r[i]||1e-9));}
const FAULTS=['Lightning strike on the overhead line','Tree contact on the overhead line','Bird strike on the overhead line','Insulator flashover','Cable joint failure'];

const SCENARIOS={
  jan:{color:'var(--c-cold)',diff:3,title:'Cold Thursday',when:'Thursday 14 January',focus:'Peak demand',soc0:45,nbShape:'demand',
    blurb:'A cold, still evening peak pulls hard on the transformers and the neighbouring networks. T1 is out for maintenance in the morning, when icy lines are most likely to fault.',
    demand:[[0,80],[4,72],[6,78],[7.5,106],[9,116],[11,112],[13,110],[15,114],[16.5,134],[17.5,150],[18.5,146],[20,130],[21.5,112],[23,94],[24,84]],
    solar:{peak:35,start:7.8,end:16.2,cloud:.2},wind:{mean:22,var:12},faults:2,
    causes:['Ice build-up on the overhead line','Conductor clash in icy wind','Cable joint failure','Insulator flashover'],
    build(r){return{events:[{tx:0,start:570,end:750,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:480,end:600,mult:3,label:'Ice and snow'}]};}},
  storm:{color:'var(--c-storm)',diff:2,title:'Storm day',when:'Monday 2 November',focus:'Faults and switching',soc0:30,nbShape:'demand',
    blurb:'Two bands of gale-force wind bring faults on transformers and feeders, and gusty wind output can shut down without warning. Expect to switch.',
    demand:[[0,72],[4,64],[6,70],[7.5,98],[9,112],[12,102],[15,106],[16.5,124],[17.5,142],[18.5,140],[20,124],[22,96],[24,74]],
    solar:{peak:90,start:6.9,end:17.1,cloud:.35},wind:{mean:48,var:14},faults:4,
    causes:['Wind-borne debris on the overhead line','Tree contact on the overhead line','Conductor clash in high wind','Lightning strike on the overhead line'],
    build(r){const a=540+Math.round(r()*120),b=900+Math.round(r()*90),s=1005+Math.round(r()*90);
      return{events:[],cutout:{start:s,end:s+75},risk:[{start:a,end:a+180,mult:3,label:'Severe gale'},{start:b,end:b+180,mult:3,label:'Severe gale'}]};}},
  grid:{color:'var(--mv)',diff:1,title:'Switching shift',when:'Tuesday 8 December',focus:'Switching only',soc0:0,nbShape:'demand',noGen:true,
    blurb:'No generation and no flexibility, just switching. T3 is out for maintenance in the afternoon and the evening peak pushes past firm capacity. Move load between substations and onto the neighbours.',
    demand:[[0,88],[4,78],[6,84],[7.5,114],[9,124],[11,118],[13,116],[15,122],[16.5,144],[17.5,160],[18.5,156],[20,140],[21.5,120],[23,100],[24,92]],
    solar:{peak:0,start:7.8,end:16.2,cloud:0},wind:{mean:0,var:0},faults:2.5,nb:{kn:{base:72,dip:26},fm:{base:70,dip:24}},
    causes:['Cable joint failure','Insulator flashover','Tree contact on the overhead line','Digger strike on the underground cable'],
    build(r){return{events:[{tx:2,start:780,end:900,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:1020,end:1190,mult:2,label:'Freezing fog'}]};}},
  mesh:{color:'var(--c-kn)',diff:3,title:'Interconnected',when:'Friday 22 January',focus:'Switching · 5 substations',soc0:0,nbShape:'demand',noGen:true,mesh:true,
    blurb:'Kilowatt Close joins the network, normally fed through Marsh Lane, with a backup route from Ohm No. The Marsh Lane feeder is out for planned work all morning, and the evening peak is the biggest yet. No generation, just switching.',
    demand:[[0,92],[4,82],[6,88],[7.5,120],[9,132],[11,126],[13,122],[15,128],[16.5,152],[17.5,174],[18.5,170],[20,152],[21.5,128],[23,106],[24,96]],
    solar:{peak:0,start:7.8,end:16.2,cloud:0},wind:{mean:0,var:0},faults:3,nb:{kn:{base:76,dip:28},fm:{base:74,dip:26}},
    shares:{hw:.24,ml:.17,rv:.20,js:.20,kc:.19},
    causes:['Cable joint failure','Insulator flashover','Digger strike on the underground cable','Tree contact on the overhead line'],
    build(r){return{events:[{fd:'ml',start:540,end:720,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:960,end:1140,mult:2,label:'Heavy snow'}]};}},
  snow:{color:'var(--c-cold)',diff:3,title:'Snow day',when:'Friday 4 December',focus:'Generation, switching and 11 kV links',soc0:40,nbShape:'demand',links:true,vfi:[1],
    blurb:'Heavy snow and the biggest peak of the winter. The Ohm No feeder is out for planned work over lunch. New 11 kV links join neighbouring substations: open a feeder breaker and close its link to move that feeder next door. Use them with generation, the battery and Volt Face to ride the evening peak.',
    demand:[[0,90],[4,80],[6,86],[7.5,116],[9,128],[11,122],[13,120],[15,126],[16.5,148],[17.5,164],[18.5,160],[20,144],[21.5,124],[23,104],[24,94]],
    solar:{peak:25,start:8,end:15.8,cloud:.3},wind:{mean:30,var:14},faults:2.5,
    causes:['Snow loading on the overhead line','Conductor clash in heavy snow','Cable joint failure','Snow-laden branch on the overhead line'],
    build(r){return{events:[{fd:'rv',start:600,end:840,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:900,end:1140,mult:3,label:'Heavy snow'}]};}},
  heat:{color:'var(--c-solar)',diff:2,title:'Heatwave',when:'Thursday 17 July',focus:'Derated network',soc0:0,nbShape:'demand',noGen:true,derate:.85,
    blurb:'Hot ground and air cut every rating by 15%: each transformer is good for 51 MW, and feeders, ties and interconnectors carry less. Air conditioning pushes the peak into the afternoon, when hot cable joints are most likely to fail.',
    demand:[[0,70],[4,62],[6,66],[8,84],[10,100],[12,112],[14,122],[15.5,127],[17,124],[18.5,116],[20,104],[22,88],[24,74]],
    solar:{peak:0,start:5,end:21,cloud:0},wind:{mean:0,var:0},faults:2.5,nb:{kn:{base:60,dip:22},fm:{base:56,dip:20}},
    causes:['Cable joint failure in hot ground','Overheated cable termination','Insulator flashover','Digger strike on the underground cable'],
    build(r){return{events:[],cutout:null,risk:[{start:720,end:1020,mult:2.5,label:'Extreme heat'}]};}},
  gsp:{color:'var(--alarm)',diff:3,title:'Grid emergency',when:'Wednesday 13 January',focus:'Cut demand at the GSP',soc0:0,nbShape:'demand',noGen:true,
    gsp:{warn:900,start:930,deadline:955,end:1110,limit:100},
    blurb:'At 15:30 Steve Towers loses a supergrid transformer. National Grid will instruct you to hold Blackout Canyon and Ampy Place to 100 MW at the grid supply point until 18:30. Ampy Place is on the same grid supply, so moving load there does not help.',
    demand:[[0,84],[4,74],[6,80],[7.5,110],[9,120],[11,114],[13,112],[15,118],[16.5,140],[17.5,154],[18.5,150],[20,134],[21.5,116],[23,96],[24,88]],
    solar:{peak:0,start:7.8,end:16.2,cloud:0},wind:{mean:0,var:0},faults:1.5,nb:{kn:{base:70,dip:24},fm:{base:72,dip:22}},
    causes:['Cable joint failure','Insulator flashover','Conductor clash in icy wind','Digger strike on the underground cable'],
    build(r){return{events:[],cutout:null,risk:[{start:1080,end:1200,mult:2,label:'Freezing fog'}]};}}
};

const SCENARIOS_FC={
  may:{color:'var(--c-solar)',diff:1,title:'Sunny Sunday',when:'Sunday 17 May',focus:'Reverse power flow',soc0:20,nbShape:'solar',
    blurb:'Low demand and strong sun push power back up into the grid. T2 is out for maintenance through the middle of the day, and thunderstorms may build in the afternoon.',
    demand:[[0,50],[4,45],[6,47],[8,58],[10,68],[12,74],[14,73],[16,76],[18,92],[19.5,104],[21,98],[22.5,78],[24,56]],
    solar:{peak:165,start:5.5,end:20.5,cloud:.07},wind:{mean:32,var:12},faults:1.5,
    causes:['Lightning strike on the overhead line','Tree contact on the overhead line','Bird strike on the overhead line','Insulator flashover'],
    build(r){const s=780+Math.round(r()*180);return{events:[{tx:1,start:600,end:900,planned:true,cause:'Planned maintenance'}],cutout:null,
      risk:[{start:s,end:s+180,mult:4,label:'Thunderstorm risk'}]};}},
  jan:{color:'var(--c-cold)',diff:3,title:'Cold Thursday',when:'Thursday 14 January',focus:'Peak demand',soc0:45,nbShape:'demand',
    blurb:'A cold, still evening peak pulls hard on the transformers. T1 is out for maintenance in the morning, when icy lines are most likely to fault. Watch the battery charge.',
    demand:[[0,80],[4,72],[6,78],[7.5,106],[9,116],[11,112],[13,110],[15,114],[16.5,134],[17.5,150],[18.5,146],[20,130],[21.5,112],[23,94],[24,84]],
    solar:{peak:35,start:7.8,end:16.2,cloud:.2},wind:{mean:22,var:12},faults:1.5,
    causes:['Ice build-up on the overhead line','Conductor clash in icy wind','Cable joint failure','Insulator flashover'],
    build(r){return{events:[{tx:0,start:570,end:750,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:360,end:540,mult:3,label:'Ice and snow'}]};}},
  storm:{color:'var(--c-storm)',diff:2,title:'Storm day',when:'Monday 2 November',focus:'Faults and swings',soc0:30,nbShape:'demand',
    blurb:'Two bands of gale-force wind make line faults far more likely, and gusty wind output can shut down without warning. Both directions matter.',
    demand:[[0,72],[4,64],[6,70],[7.5,98],[9,112],[12,102],[15,106],[16.5,124],[17.5,142],[18.5,140],[20,124],[22,96],[24,74]],
    solar:{peak:90,start:6.9,end:17.1,cloud:.35},wind:{mean:48,var:14},faults:3,
    causes:['Wind-borne debris on the overhead line','Tree contact on the overhead line','Conductor clash in high wind','Lightning strike on the overhead line'],
    build(r){const a=420+Math.round(r()*180),b=900+Math.round(r()*120),s=1005+Math.round(r()*105);
      return{events:[],cutout:{start:s,end:s+75},risk:[{start:a,end:a+180,mult:3,label:'Severe gale'},{start:b,end:b+180,mult:3,label:'Severe gale'}]};}}};
if(SCENARIOS.jan)SCENARIOS.tut={...SCENARIOS.jan,hidden:true,title:'Tutorial · Cold Thursday',focus:'Learn the control room',faults:0,
  blurb:'Cold Thursday, 15:30: the evening peak is building. Learn generation, flexibility and switching on the real network.',build(r){return{events:[],cutout:null,risk:[]};}};
if(GAME==='fc'){Object.keys(SCENARIOS).forEach(k=>delete SCENARIOS[k]);Object.assign(SCENARIOS,SCENARIOS_FC);}

/* ---------- Network ---------- */
const PR={
  hw:{id:'hw',name:'Hartwell',share:.30,nb:'kn',tie:45,fr:70,x1:110,x2:320,fx:215},
  ml:{id:'ml',name:'Marsh Lane',share:.20,nb:'kn',tie:40,fr:170,x1:370,x2:560,fx:465},
  rv:{id:'rv',name:'Ohm No',share:.25,nb:'fm',tie:40,fr:80,x1:610,x2:830,fx:715},
  js:{id:'js',name:'Joule Street',share:.25,nb:'fm',tie:45,fr:70,x1:880,x2:1060,fx:970}};
PR.kc={id:'kc',name:'Kilowatt Close',share:.19,nb:null,fd:false,x1:500,x2:760,fx:600,y:500,lx:540};
['hw','ml','rv','js'].forEach(p=>PR[p].fd=true);
let PIDS=['hw','ml','rv','js'];
const NBS={kn:{id:'kn',name:'Ampy Place',same:true,base:65,dip:25},fm:{id:'fm',name:'Watts This',same:false,base:60,dip:22},vf:{id:'vf',name:'Volt Face',same:false,base:52,dip:14}};
let VFI=[1,2];const VF_ON=GAME==='cr';
const LINKS={hm:{a:['hw',2],b:['ml',0],r:15},mr:{a:['ml',2],b:['rv',0],r:15},rj:{a:['rv',2],b:['js',0],r:15}};let LKIDS=[];
const grpOf=s=>!s||s==='off'?null:s==='fm'?'wt':'st';
const ITS={hm:{id:'hm',a:'hw',b:'ml',x:345,r:30},mr:{id:'mr',a:'ml',b:'rv',x:585,r:30},rj:{id:'rj',a:'rv',b:'js',x:855,r:30}};
ITS.mk={id:'mk',a:'ml',b:'kc',x:520,sy:420,r:40,v:true,nc:true,left:true};ITS.rk={id:'rk',a:'rv',b:'kc',x:690,sy:420,r:40,v:true};
let ITIDS=['hm','mr','rj'];
const pY=p=>PR[p].y||PY;
const TIESW={hw:{x:75,y:330,path:'M110 330 H40',lx:48,ly:354,anc:'start'},
  ml:{x:210,y:545,path:'M380 330 V545 H40',lx:210,ly:567,anc:'middle'},
  rv:{x:1090,y:575,path:'M830 330 V575 H1160',lx:1090,ly:597,anc:'middle'},
  js:{x:1110,y:330,path:'M1060 330 H1160',lx:1152,ly:354,anc:'end'}};
const TXX=[460,600,740],BCY=200,PY=330;
const SECS={B1:{tx:[0],x1:180,x2:521},B2:{tx:[1],x1:539,x2:661},B3:{tx:[2],x1:679,x2:1000}};
const FSEC={hw:'B1',ml:'B1',rv:'B3',js:'B3'},BSX={'12':530,'23':670},BSIDS=['12','23'];
const isBC=n=>n[0]==='I',isSrcN=n=>n==='kn'||n==='fm'||isBC(n);
const SERVICES=[
  {id:'solar',prim:'ml',ic:'solar',tc:'var(--c-solar)',name:'Marsh Lane Solar Farm',kind:'Solar farm',dir:'export',arm:0,use:60,gen:true,ramp:15,fail:.05,allow:90},
  {id:'wind',prim:'rv',ic:'wind',tc:'var(--c-wind)',name:'Spinney Windy Things',kind:'Wind farm',dir:'export',arm:0,use:85,cap:60,gen:true,ramp:10,fail:.05,allow:50},
  {id:'bchg',prim:'hw',ic:'batt',tc:'var(--c-batt)',name:'Kings Hill Battery',kind:'Battery charging',dir:'export',arm:6,use:35,cap:30,soc:true,ramp:30,fail:.03},
  {id:'bdis',prim:'hw',ic:'batt',tc:'var(--c-batt)',name:'Kings Hill Battery',kind:'Battery discharging',dir:'import',arm:6,use:90,cap:30,soc:true,ramp:30,fail:.03},
  {id:'chp',prim:'rv',ic:'gas',tc:'var(--c-gas)',name:'Ohm No CHP',kind:'Gas engine',dir:'import',arm:8,use:140,cap:25,ramp:8,fail:.10},
  {id:'dsr',prim:'hw',ic:'dsr',tc:'var(--c-dsr)',name:'Hartwell Industrial Estate',kind:'Demand response',dir:'import',arm:5,use:200,cap:15,ramp:5,fail:.12},
];
const SV=Object.fromEntries(SERVICES.map(s=>[s.id,s]));
const ASSETS=[
  {id:'load_hw',type:'load',prim:'hw',x:128,name:'Demand'},
  {id:'batt',type:'batt',prim:'hw',x:215,name:'Battery',col:'var(--c-batt)'},
  {id:'dsr',type:'dsr',prim:'hw',x:285,name:'DSR',col:'var(--c-dsr)'},
  {id:'load_ml',type:'load',prim:'ml',x:432,name:'Demand'},
  {id:'solar',type:'solar',prim:'ml',x:505,name:'Solar',col:'var(--c-solar)'},
  {id:'load_rv',type:'load',prim:'rv',x:645,name:'Demand'},
  {id:'chp',type:'chp',prim:'rv',x:710,name:'CHP',col:'var(--c-gas)'},
  {id:'wind',type:'wind',prim:'rv',x:775,name:'Wind',col:'var(--c-wind)'},
  {id:'load_js',type:'load',prim:'js',x:935,name:'Demand'},
  {id:'load_kc',type:'load',prim:'kc',x:600,name:'Demand'}];
const LF={hw:[.4,.35,.25],ml:[.45,.3,.25],rv:[.4,.35,.25],js:[.35,.35,.3],kc:[.5,.3,.2]};
const LFN={hw:['Town Centre','Kings Hill','Hartwell Park'],ml:['Marsh Road','Station','Mill Lane'],rv:['Ohm Street','Resistor Row','Circuit Park'],js:['High Street','Joule Park','Watt Way'],kc:['Close North','Close South','Ampere Avenue']};
const LDX=[-22,0,22],lfOn=p=>S.lf[p].reduce((a,on,i)=>a+(on?LF[p][i]:0),0);
function linkOf(p,i){for(const k of LKIDS){const L=LINKS[k];if(L.a[0]===p&&L.a[1]===i)return{k,q:L.b[0],j:L.b[1]};if(L.b[0]===p&&L.b[1]===i)return{k,q:L.a[0],j:L.a[1]};}return null;}
const subOn=(p,sup)=>{const v=(sup||S.supNow||S.sup||{})[p];return !!v&&v!=='off';};
// where an 11 kV feeder gets its supply: its own substation, Volt Face, the substation at the other end of an 11 kV link, or nowhere
function feedOf(p,i,sup){if(!S.lf[p])return null;
  if(S.lf[p][i])return subOn(p,sup)?p:null;
  if(VF_ON&&VFI.includes(i)&&S.nop[p][i])return'vf';
  const l=linkOf(p,i);if(l&&S.lk[l.k]&&S.lf[l.q]&&S.lf[l.q][l.j]&&subOn(l.q,sup))return l.q;return null;}
function dem(c,p){let f=0;PIDS.forEach(q=>LF[q].forEach((v,i)=>{if(feedOf(q,i)===p)f+=S.share[q]*v;}));return c.demand*f;}
const lfP=id=>[id.slice(0,2),+id.slice(2)];
const vfFrac=p=>VFI.reduce((a,i)=>a+(feedOf(p,i)==='vf'?LF[p][i]:0),0),lfMW=(p,i)=>S.c?S.c.demand*S.share[p]*LF[p][i]:0;
const ASB=Object.fromEntries(ASSETS.map(a=>[a.id,a]));
const ICONS={solar:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  wind:'<path d="M12 11v11M12 11V2.5M12 11l8.2 4.8M12 11l-8.2 4.8M9 22h6"/>',
  batt:'<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3M7 12h4M9 10v4"/>',
  gas:'<path d="M12 2.5c2.5 3.5 6.5 6 6.5 11a6.5 6.5 0 0 1-13 0c0-3 1.8-4.6 3-6.5.8 1.8 1.6 2.8 3 3.2-.4-2.6-.2-5 .5-7.7z"/>',
  dsr:'<path d="M3 21V10l5 3v-3l5 3V7l8 4v10zM3 21h18M8 17h2M13 17h2"/>',
  load:'<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5"/>',
  brk:'<rect x="6" y="6" width="12" height="12"/><path d="M12 2v4M12 18v4"/>',
  tx:'<circle cx="12" cy="9" r="5.5"/><circle cx="12" cy="15" r="5.5"/>',
  tie:'<path d="M3 12h6M15 12h6"/><rect x="9" y="8" width="6" height="8"/>',
  sub:'<path d="M3 8h18M7 8v10M12 8v10M17 8v10"/>',
  nb:'<path d="M3 7h13l-3-3M21 17H8l3 3"/>'};
const LOGO='<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#0B1F3A"/><circle cx="50" cy="50" r="38" fill="none" stroke="#FFD23F" stroke-width="5"/><path d="M56 20 L32 55 H47 L42 80 L68 45 H53 L60 20 Z" fill="#FFD23F"/></svg>';
const BAND=`<div class="sheet-brand wu"><div class="wu-lock"><svg viewBox="0 0 100 100" role="img" aria-label="Watts Up"><rect width="100" height="100" rx="22" fill="#0B1F3A"/><circle cx="50" cy="50" r="38" fill="none" stroke="#FFD23F" stroke-width="5"/><path d="M56 20 L32 55 H47 L42 80 L68 45 H53 L60 20 Z" fill="#FFD23F"/></svg><div><b>Watts <span>Up</span></b><small>Electricity Distribution</small></div></div><p class="tag">${CFG.band}</p></div>`;
const SPK_ON='<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SPK_OFF='<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
const capOf=s=>s.id==='solar'?Math.max(5,Math.ceil(S.sc.solar.peak/5)*5):s.cap;
const NOGEN=()=>!!S.sc.noGen;
const devName=k=>{const[t,i]=k.split(':');return t==='bs'?(i==='12'?'T1–T2 bus section breaker':'T2–T3 bus section breaker'):t==='tx'?`T${+i+1}`:t==='bc'?`${PR[i].name} breaker`:t==='in'?`${PR[i].name} incomer`:t==='lf'?`${LFN[i.slice(0,2)][+i.slice(2)]} 11 kV feeder`:t==='nop'?`${LFN[i.slice(0,2)][+i.slice(2)]} backfeed from Volt Face`:t==='lk'?`${PR[LINKS[i].a[0]].name} – ${PR[LINKS[i].b[0]].name} 11 kV link`:t==='tie'?`${PR[i].name} – ${NBS[PR[i].nb].name} tie`:`${PR[ITS[i].a].name} – ${PR[ITS[i].b].name} interconnector`;};

const SITE_URL=CFG.site;
const SCORE_URL='https://script.google.com/macros/s/AKfycbx_0hkrfzn5_ApQWr3UwqT-p7SuOf8ubJHBLxNGGQECIbDEJzfIRNRsWquE--FUOhmMNg/exec';
const r13=s=>s.replace(/[a-z]/g,c=>String.fromCharCode((c.charCodeAt(0)-84)%26+97));
const BAD_SUB=r13('shpx,fuvg,phag,jnax,gjng,obyybpx,onfgneq,ovgpu,avtt,snttbg,ergneq,juber,fyhg,chffl,anmv,uvgyre,zbgures,nffubyr,nefrubyr,qvyqb,wvmm,fcnfgvp,oryyraq,abapr,cnrqb,crqb').split(',');
const BAD_TOK=r13('qvpx,pbpx,cevpx,nefr,nff,gvgf,gvg,cvff,penc,xabo,abo,encr,snt,cnxv,pbba,puvax,xvxr,genaal,fcnm,phz,cbea,frk,nany,cbb,gheq').split(',');
function rude(n){const s=n.toLowerCase().replace(/[@4]/g,'a').replace(/3/g,'e').replace(/[1!|]/g,'i').replace(/0/g,'o').replace(/[5$]/g,'s').replace(/7/g,'t');
  const flat=s.replace(/[^a-z]/g,'').replace(/scunthorpe|snigger|shiitake|shitake|penistone/g,'');if(BAD_SUB.some(w=>flat.includes(w)))return true;
  return s.split(/[^a-z]+/).some(t=>BAD_TOK.includes(t));}
function getName(){try{return localStorage.getItem('fc-name')||'';}catch(e){return '';}}
function saveName(n){try{localStorage.setItem('fc-name',n);}catch(e){}}
let lastSubmit=null,boardDay='mesh',boardMode='daily',boardFrom='start';
const GA=window.FC_GA||null;
function loadGA(){if(!GA||window.__gaLoaded)return;window.__gaLoaded=true;window['ga-disable-'+GA]=false;window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());window.gtag('config',GA);const sc=document.createElement('script');sc.async=true;sc.src='https://www.googletagmanager.com/gtag/js?id='+GA;document.head.appendChild(sc);}
function consent(){try{return localStorage.getItem('fc-consent');}catch(e){return null;}}
function track(name,params){try{if(GA&&consent()==='yes'&&typeof window.gtag==='function')window.gtag('event',name,{game:GAME==='fc'?'generation':'control_room',...params});}catch(e){}}
function initConsent(){if(!GA)return;$('cookieSettings').hidden=false;const c=consent();if(c==='yes')loadGA();else if(c!=='no')$('cookie').hidden=false;}
function setConsent(yes){try{localStorage.setItem('fc-consent',yes?'yes':'no');}catch(e){}$('cookie').hidden=true;if(yes)loadGA();else{window['ga-disable-'+GA]=true;
  document.cookie.split(';').map(c=>c.split('=')[0].trim()).filter(n=>/^_ga/.test(n)).forEach(n=>{document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.'+location.hostname;});}}
const MQ=matchMedia('(max-width: 700px)');let PHONE=MQ.matches;
let S=null,speed=1,autoPause=true,chosen=ls('day')||CFG.def,mode=ls('mode')||'daily',acc=0,lastFrame=performance.now(),lastChart=0,logDirty=true,queued=[];
if(!SCENARIOS[chosen])chosen='mesh';if(mode!=='daily'&&mode!=='free')mode='daily';
let tipsOn=ls('tips')!=='off',zoomed=true;

/* ---------- Sound ---------- */
const SND={on:ls('sound')!=='off',ctx:null,hum:null};
function audio(){if(!SND.on)return null;try{if(!SND.ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;SND.ctx=new A();}if(SND.ctx.state==='suspended')SND.ctx.resume();}catch(e){return null;}return SND.ctx;}
function tone(f,dur,when,type,vol,f2){const a=audio();if(!a)return;const t=a.currentTime+(when||0);const o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||.08,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.05);}
function clunk(v){const a=audio();if(!a)return;const t=a.currentTime;const len=Math.floor(a.sampleRate*.22),b=a.createBuffer(1,len,a.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,5);const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=1200;const g=a.createGain();g.gain.value=v||.5;
  s.connect(f);f.connect(g);g.connect(a.destination);s.start(t);tone(95,.3,0,'sine',(v||.5)*.9,38);}
const sfx={
  fault(){clunk();[0,.25,.5].forEach((d,i)=>tone(i%2?660:880,.18,.15+d,'square',.045));},
  trip(){clunk();tone(440,.35,.1,'sawtooth',.05,220);},
  incident(){clunk();[0,.18,.36,.54].forEach((d,i)=>tone(i%2?520:780,.14,.1+d,'square',.05));},
  emerg(){[0,.2].forEach(d=>tone(990,.12,d,'square',.04));},
  alarm(){tone(740,.12,0,'triangle',.07);tone(740,.12,.22,'triangle',.07);},
  warn(){tone(620,.14,0,'sine',.07);tone(820,.18,.16,'sine',.07);},
  ok(){tone(660,.12,0,'triangle',.08);tone(990,.16,.12,'triangle',.08);},
  op(){clunk(.25);},
  lost(){clunk();tone(320,1.4,.15,'sawtooth',.07,50);},
  done(){[523,659,784,1047].forEach((f,i)=>tone(f,.3,i*.13,'triangle',.11));},
  click(){tone(1400,.04,0,'square',.025);}
};
function play(k){if(S&&S.silent)return;try{sfx[k]&&sfx[k]();}catch(e){}}
function humTo(level){const a=SND.ctx;if(!a)return;try{
  if(!SND.hum){const g=a.createGain();g.gain.value=0;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=700;
    const o1=a.createOscillator();o1.frequency.value=100;const o2=a.createOscillator();o2.type='triangle';o2.frequency.value=200;const g2=a.createGain();g2.gain.value=.4;
    o1.connect(g);o2.connect(g2);g2.connect(g);g.connect(f);f.connect(a.destination);o1.start();o2.start();SND.hum={g,o2};}
  const v=(!SND.on||level<=0)?0:.004+.045*clamp((level-.5)/.9,0,1);SND.hum.g.gain.setTargetAtTime(v,a.currentTime,.25);
  SND.hum.o2.frequency.setTargetAtTime(200+80*clamp(level-1,0,.5),a.currentTime,.3);}catch(e){}}
/* ---------- Background music: an original ambient score made live with Web Audio ---------- */
const MUS={on:ls('music')==='on',timer:null,next:0,step:0,bus:null,filt:null,tense:0};
const midiF=m=>440*Math.pow(2,(m-69)/12),E8=60/72/2;
const CALM=[{c:[57,60,64],b:45},{c:[53,57,60],b:41},{c:[55,60,64],b:48},{c:[55,59,62],b:43}];
const TENSE=[{c:[57,60,64],b:45},{c:[53,57,62],b:38},{c:[53,57,60],b:41},{c:[56,59,64],b:40}];
function mNote(a,f,t,dur,type,vol,att,dest){const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.setTargetAtTime(0,t+Math.max(att,dur*.6),dur*.35);o.connect(g);g.connect(dest||MUS.filt);o.start(t);o.stop(t+dur+1.2);}
function musicTick(){const a=SND.ctx;if(!a||!MUS.bus)return;
  const want=S&&S.running&&!S.ended&&!S.paused?((anyOver()||(S.sec&&S.sec.insecure))?1:0):0;MUS.tense+=(want-MUS.tense)*.08;
  MUS.bus.gain.setTargetAtTime(document.hidden?0:(S&&S.running&&!S.paused?.9:.55),a.currentTime,.8);
  MUS.filt.frequency.setTargetAtTime(900+1600*MUS.tense,a.currentTime,1.5);
  while(MUS.next<a.currentTime+.6){const st=MUS.step,t=MUS.next,bar=Math.floor(st/16),pos=st%16,tense=MUS.tense>.5,P=(tense?TENSE:CALM)[bar%4];
    if(pos===0){P.c.forEach((m,i)=>{mNote(a,midiF(m),t,E8*16,'triangle',.022,1.6);mNote(a,midiF(m)*1.004,t,E8*16,'sine',.018,2.2);});mNote(a,midiF(P.b),t,E8*7,'sine',.07,.08);}
    if(pos===8)mNote(a,midiF(P.b),t,E8*7,'sine',.055,.08);
    const tones=[...P.c,P.c[0]+12,P.c[1]+12],pat=[0,2,1,3,2,4,3,1];
    if(tense||pos%2===0)mNote(a,midiF(tones[pat[pos%8]]+12),t,E8*1.6,'triangle',tense?.026:.02,.01);
    if(tense&&pos%4===0)mNote(a,midiF(P.b-12)*2,t,E8*.9,'square',.012,.005);
    MUS.next+=E8;MUS.step++;}}
function setMusic(on){MUS.on=on;ls('music',on?'on':'off');const b=$('musicBtn');if(b){b.setAttribute('aria-pressed',String(on));b.classList.toggle('on',on);b.setAttribute('aria-label',on?'Music on. Turn music off':'Music off. Turn music on');}
  const a=on?audio():SND.ctx;
  if(on&&a&&!MUS.timer){MUS.bus=a.createGain();MUS.bus.gain.value=0;MUS.filt=a.createBiquadFilter();MUS.filt.type='lowpass';MUS.filt.frequency.value=900;MUS.filt.Q.value=.6;
    const dl=a.createDelay(1),fb=a.createGain(),wet=a.createGain();dl.delayTime.value=E8*3;fb.gain.value=.32;wet.gain.value=.35;
    MUS.filt.connect(MUS.bus);MUS.filt.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(MUS.bus);MUS.bus.connect(a.destination);
    MUS.next=a.currentTime+.15;MUS.step=0;MUS.timer=setInterval(musicTick,150);}
  if((!on||!a)&&MUS.timer){clearInterval(MUS.timer);MUS.timer=null;const bus=MUS.bus;if(bus&&SND.ctx){bus.gain.setTargetAtTime(0,SND.ctx.currentTime,.3);setTimeout(()=>{try{bus.disconnect();}catch(e){}},1500);}MUS.bus=null;}}
function setSound(on){SND.on=on;ls('sound',on?'on':'off');if(!on&&MUS.timer){clearInterval(MUS.timer);MUS.timer=null;if(MUS.bus){try{MUS.bus.disconnect();}catch(e){}}MUS.bus=null;}const b=$('muteBtn');b.innerHTML=on?SPK_ON:SPK_OFF;b.setAttribute('aria-label',on?'Sound on. Turn sound off':'Sound off. Turn sound on');b.setAttribute('aria-pressed',String(on));if(on){audio();if(ls('music')==='on'&&!MUS.timer)setMusic(true);}else humTo(0);}

/* ---------- Topology and load flow ---------- */
function islands(extra){const par={B1:'B1',B2:'B2',B3:'B3'},f=n=>par[n]===n?n:(par[n]=f(par[n]));
  if(S.bs['12'].closed||extra==='bs:12')par[f('B1')]=f('B2');
  if(S.bs['23'].closed||extra==='bs:23')par[f('B2')]=f('B3');
  const L={};['B1','B2','B3'].forEach(sc=>{const r=f(sc);(L[r]=L[r]||{id:'I'+r.slice(1),secs:[],txs:[]}).secs.push(sc);SECS[sc].tx.forEach(i=>{if(!S.tx[i].out)L[r].txs.push(i);});});
  const list=Object.values(L),of={},byId={};list.forEach(I=>{I.alive=I.txs.length>0;byId[I.id]=I;I.secs.forEach(sc=>of[sc]=I.id);});return{of,list,byId};}
function edgesNow(extra){const IS=islands(extra),E=[];
  PIDS.forEach(p=>{const f=S.fd[p];if(PR[p].fd){const I=IS.byId[IS.of[FSEC[p]]];const xb=extra==='bc:'+p,xi=extra==='in:'+p;if(I.alive&&(f.brk||xb)&&(f.inc||xi)&&(!f.fault||((xb||xi)&&f.fault.ready)))E.push({id:'bc:'+p,a:I.id,b:p,x:1,r:PR[p].fr});}
    if(PR[p].nb&&(S.tie[p].closed||extra==='tie:'+p))E.push({id:'tie:'+p,a:p,b:PR[p].nb,x:1.5,r:PR[p].tie});});
  ITIDS.forEach(k=>{const it=S.it[k];if((it.closed&&!it.fault)||extra==='it:'+k)E.push({id:'it:'+k,a:ITS[k].a,b:ITS[k].b,x:1.2,r:ITS[k].r});});
  LKIDS.forEach(k=>{const L=LINKS[k],fa=S.lf[L.a[0]][L.a[1]]||extra==='lf:'+L.a[0]+L.a[1],fb=S.lf[L.b[0]][L.b[1]]||extra==='lf:'+L.b[0]+L.b[1];if((S.lk[k]||extra==='lk:'+k)&&fa&&fb)E.push({id:'lk:'+k,a:L.a[0],b:L.b[0],x:6,r:L.r});});
  E.IS=IS;return E;}
function groupsOf(E){const IS=E.IS,nodes=[...IS.list.map(i=>i.id),'kn','fm',...PIDS],par={};nodes.forEach(n=>par[n]=n);const f=n=>par[n]===n?n:(par[n]=f(par[n]));
  E.forEach(e=>{par[f(e.a)]=f(e.b);});const G={};nodes.forEach(n=>{const r=f(n);(G[r]=G[r]||{nodes:[],src:[]}).nodes.push(n);});
  Object.values(G).forEach(g=>{g.src=g.nodes.filter(n=>n==='kn'||n==='fm'||(isBC(n)&&IS.byId[n].alive));});
  return{of:n=>G[f(n)],list:Object.values(G),E,IS};}
function kindOf(g){if(!g.src.length)return'off';const b=g.src.some(isBC);if(g.src.includes('fm')&&g.src.length>1)return'bad';if(g.src.includes('kn')&&b)return'par';return b?'bc':g.src[0];}
function solve(pn){
  const E=edgesNow(),T=groupsOf(E),flows={},sup={},inj={kn:0,fm:0},isl={};E.IS.list.forEach(I=>inj[I.id]=0);
  T.list.forEach(g=>{const k=kindOf(g);g.nodes.forEach(n=>{if(PR[n]){sup[n]=k;isl[n]=g.src.find(isBC)||null;}});if(k==='off')return;
    const unk=g.nodes.filter(n=>!g.src.includes(n)),idx={};unk.forEach((n,i)=>idx[n]=i);const ge=E.filter(e=>g.nodes.includes(e.a));
    let th=[];if(unk.length){const A=unk.map(()=>new Array(unk.length).fill(0)),b=unk.map(n=>-(PR[n]?pn[n]:0));
      ge.forEach(e=>{const y=1/e.x,ia=idx[e.a],ib=idx[e.b];if(ia!=null)A[ia][ia]+=y;if(ib!=null)A[ib][ib]+=y;if(ia!=null&&ib!=null){A[ia][ib]-=y;A[ib][ia]-=y;}});
      th=gauss(A,b);}
    const ang=n=>idx[n]==null?0:th[idx[n]];
    ge.forEach(e=>{const fl=(ang(e.a)-ang(e.b))/e.x;flows[e.id]=fl;if(isSrcN(e.a))inj[e.a]+=fl;if(isSrcN(e.b))inj[e.b]-=fl;});});
  return{E,flows,sup,inj,isl,groups:T,IS:E.IS};}
const wBC=k=>k==='bc'?1:k==='par'?.5:0;

/* ---------- Setup ---------- */
function genFaults(rng,sc,risk){
  const mult=m=>{let k=1;risk.forEach(w=>{if(m>=w.start&&m<w.end)k=Math.max(k,w.mult);});return k;};
  let integ=0;for(let m=START+20;m<END;m++)integ+=mult(m);
  const comps=GAME==='fc'?['tx:0','tx:1','tx:2']:['tx:0','tx:1','tx:2',...PIDS.filter(p=>PR[p].fd).map(p=>'fd:'+p),...ITIDS.filter(k=>ITS[k].nc).map(k=>'ic:'+k)],base=sc.faults/(comps.length*integ),out=[];
  comps.forEach(k=>{for(let m=START+20;m<END;m++){if(rng()<base*mult(m)){const dur=Math.round(90+rng()*150);out.push({k,m,dur,cause:pick(rng,sc.causes||FAULTS),done:false});m+=dur;}}});
  return out.sort((a,b)=>a.m-b.m);
}
const zeroD=()=>({solar:0,wind:0,bchg:0,bdis:0,chp:0,dsr:0});
function newGame(key){
  const sc=SCENARIOS[key],date=todayUK(),daily=mode==='daily';
  const seed=daily?hashStr(date+'|'+key+'|'+CFG.salt):((Math.random()*2**31)|0);
  const rng=rngFrom(seed),b=sc.build(rng);
  const N={d:makeNoise(rng,15),c1:makeNoise(rng,25),c2:makeNoise(rng,6),w1:makeNoise(rng,40),w2:makeNoise(rng,5)};
  PIDS=sc.mesh?['hw','ml','rv','js','kc']:['hw','ml','rv','js'];ITIDS=sc.mesh?['hm','mr','rj','mk','rk']:['hm','mr','rj'];LKIDS=GAME==='cr'&&sc.links?['hm','mr','rj']:[];VFI=sc.vfi||[1,2];
  const share=sc.shares||{hw:.30,ml:.20,rv:.25,js:.25};
  {const D=sc.derate||1;R=Math.round(60*D);Object.values(PR).forEach(P=>{if(P.fr0==null){P.fr0=P.fr;P.tie0=P.tie;}if(P.fr0!=null)P.fr=Math.round(P.fr0*D);if(P.tie0!=null)P.tie=Math.round(P.tie0*D);});
   Object.values(ITS).forEach(t=>{if(t.r0==null)t.r0=t.r;t.r=Math.round(t.r0*D);});}
  const sched=genFaults(rng,sc,b.risk),dv=sc.demand.map(x=>x[1]);
  S={key,sc,mode,date,seed,t:START-60,dmin:Math.min(...dv),dmax:Math.max(...dv),
    events:b.events.map(e=>({...e,fired:false,noticed:false})),cutout:b.cutout?{...b.cutout,fired:false,done:false}:null,
    risk:b.risk,sched,N,rng2:rngFrom(seed^0x5bd1e995),
    tx:[0,1,2].map(()=>({temp:60,out:null,em:0,sh:0,L:0,flow:0})),
    share,lf:Object.fromEntries(Object.keys(LF).map(p=>[p,LF[p].map(()=>true)])),nop:Object.fromEntries(Object.keys(LF).map(p=>[p,LF[p].map(()=>false)])),lk:{hm:false,mr:false,rj:false},vfLoad:0,fd:Object.fromEntries(PIDS.map(p=>[p,{brk:!!PR[p].fd,inc:!!PR[p].fd,fault:null}])),
    tie:Object.fromEntries(PIDS.map(p=>[p,{closed:false}])),
    it:Object.fromEntries(ITIDS.map(k=>[k,{closed:!!ITS[k].nc,fault:null}])),
    ov:{},edL:{},flows:{},alarms:{},bs:{'12':{closed:true},'23':{closed:true}},bsf:{'12':0,'23':0},isl:{},islands:[],inj:{kn:0,fm:0},parMin:0,
    sup:Object.fromEntries(PIDS.map(p=>[p,'bc'])),pn:Object.fromEntries(PIDS.map(p=>[p,0])),wB:Object.fromEntries(PIDS.map(p=>[p,1])),spare:{kn:65,fm:60},
    manual:{},armed:{},act:{},autoP:{},manP:{},called:{},fail:{},allow:{},allowLogged:{},
    soc:sc.soc0,op:null,sel:null,cust:{ci:0,cml:0,si:0,off:{}},crews:[1,2,3].map(n=>({n,x:DEPOT.x,y:DEPOT.y,from:null,to:null,dep:0,arr:0,at:'depot',job:null})),crewJobs:0,parOk:0,vfPeak:0,gspOver:0,gspTrips:0,gspLoad:0,
    cost:{arm:0,use:0,short:0,curt:0,gen:0},insecureMin:0,overloadMin:0,trips:0,faults:0,incidents:0,ens:0,peakL:0,
    hist:[],full:[],marks:[],log:[],chain:[],running:false,paused:true,ended:false,silent:true,lost:null,emergOn:false,autoOn:false,tipShown:{}};
  SERVICES.forEach(s=>{S.manual[s.id]=0;S.armed[s.id]=0;S.act[s.id]=0;S.autoP[s.id]=0;S.manP[s.id]=0;S.called[s.id]=false;S.fail[s.id]=0;S.allow[s.id]=s.allow||0;});
  const c0=comps(S.t,false),L0=Math.abs(PIDS.reduce((a,p)=>a+netP(c0,p,zeroD()),0))/3/R;S.tx.forEach(t=>t.temp=20+100*L0*L0);
  buildMimic();
  for(let i=0;i<60;i++)step();
  S.silent=false;S.alarms={};S.cost={arm:0,use:0,short:0,curt:0,gen:0};S.insecureMin=0;S.overloadMin=0;S.peakL=0;S.ens=0;S.cust={ci:0,cml:0,si:0,off:{}};S.crewJobs=0;S.parOk=0;S.vfPeak=0;S.gspOver=0;S.gspTrips=0;S.log=[];S.full=[];S.marks=[];S.chain=[];queued=[];
  logE(START,`Shift starts. ${sc.when}: ${sc.blurb}`,'info');
  if(daily)logE(START,`Today's challenge (${fmtDate(date)}): everyone gets the same weather and fault times.`,'info');
  S.events.filter(e=>e.planned).forEach(e=>logE(START,e.fd?`Notice: ${PR[e.fd].name} feeder planned outage ${fmtT(e.start)}–${fmtT(e.end)}. Field staff will open both ends of it at ${fmtT(e.start)}, so move ${PR[e.fd].name} and anything fed through it beforehand.`:`Notice: T${e.tx+1} planned outage ${fmtT(e.start)}–${fmtT(e.end)}. Field staff will switch it out; you restore it afterwards.`,'warn'));
  S.risk.forEach(w=>logE(START,`Weather warning: ${w.label.toLowerCase()} ${fmtT(w.start)}–${fmtT(w.end)}. Faults are ${w.mult}× more likely.`,'warn'));
  $('scnLabel').innerHTML=esc(sc.title+' · Blackout Canyon 33 kV')+(daily?` <span class="mode-tag">Daily ${esc(fmtDate(date))}</span>`:'');
  $('dayLabel').textContent=sc.when;
  hideBanner();hideTip();lastSky='';lastInsp='';closeSheet();applyZoom();render(true);
}

function comps(m,fc){
  const h=m/60,sc=S.sc,N=S.N;
  let demand=interp(sc.demand,clamp(h,0,24));if(!fc)demand*=1+.025*N.d(m);
  let solar=0;const f=(h-sc.solar.start)/(sc.solar.end-sc.solar.start);
  if(sc.solar.peak>0&&f>0&&f<1){const clear=sc.solar.peak*Math.pow(Math.sin(Math.PI*f),1.4);const red=sc.solar.cloud*(fc?1:1+.7*N.c1(m)+.3*N.c2(m));solar=Math.max(0,clear*(1-red));}
  let wind=0;if(sc.wind.mean>0){wind=sc.wind.mean+sc.wind.var*N.w1(m);if(!fc)wind+=4*N.w2(m);wind=clamp(wind,0,60);}
  if(!fc&&S.cutout&&m>=S.cutout.start&&m<S.cutout.end){const k=Math.min(1,(m-S.cutout.start)/4,(S.cutout.end-m)/10);wind*=1-clamp(k,0,1);}
  return{demand,solar,wind};
}
function netP(c,p,a){let v=dem(c,p);
  if(p==='hw')v+=-a.dsr+a.bchg-a.bdis;
  if(p==='ml')v+=-(c.solar-a.solar);
  if(p==='rv')v+=-(c.wind-a.wind)-a.chp;
  return v;}
function availability(c,m){if(NOGEN())return zeroD();const a={solar:c.solar,wind:c.wind,bchg:S.soc<SOC_MAX-.3?30:0,bdis:S.soc>.3?Math.min(30,S.soc*60):0,chp:25,dsr:15};
  SERVICES.forEach(s=>{if(s.gen&&S.allow[s.id]<=0)a[s.id]=0;if(S.fail[s.id]>m)a[s.id]=0;});return a;}
function spareOf(k,m){const sc=S.sc,nb=(sc.nb&&sc.nb[k])||NBS[k];let sh;
  if(sc.nbShape==='solar'){const h=m/60,f=(h-sc.solar.start)/(sc.solar.end-sc.solar.start);sh=f>0&&f<1?Math.pow(Math.sin(Math.PI*f),1.4):0;}
  else sh=(interp(sc.demand,clamp(m/60,0,24))-S.dmin)/(S.dmax-S.dmin);
  return nb.base-nb.dip*sh;}

function logE(m,text,lvl){S.log.unshift({m,text,lvl});if(S.log.length>60)S.log.pop();logDirty=true;}
function mark(m,type,label){if(!S.silent)S.marks.push({m,type,label});}
function queueAlert(text,lvl,pause){if(!S.silent)queued.push({text,lvl,pause,m:S.t});}
function incident(m,msg,el){S.incidents++;S.chain.push('a switching incident');mark(m,'incident','Incident');logE(m,'Switching incident: '+msg,'alarm');queueAlert('Switching incident: '+msg,'alarm',true);play('incident');fx(el);}
function openEdge(id){const[t,k]=id.split(':');if(t==='bs')S.bs[k].closed=false;else if(t==='bc')S.fd[k].brk=false;else if(t==='in')S.fd[k].inc=false;else if(t==='tie')S.tie[k].closed=false;else if(t==='it')S.it[k].closed=false;else if(t==='lk')S.lk[k]=false;}
const isClosed=id=>{const[t,k]=id.split(':');return t==='bs'?S.bs[k].closed:t==='bc'?S.fd[k].brk:t==='in'?S.fd[k].inc:t==='tie'?S.tie[k].closed:t==='lk'?!!S.lk[k]:S.it[k].closed;};
const fdOn=p=>{const f=S.fd[p];return !!PR[p].fd&&f.brk&&f.inc&&!f.fault;};
const elOf=id=>{const[t,k]=id.split(':');return t==='bs'?'bsg_'+k:t==='bc'||t==='in'?'fdg_'+k:t==='lf'?'lfb_'+k:t==='nop'?'nopb_'+k:t==='lk'?'lkg_'+k:t==='tie'?'tieg_'+k:'itg_'+k;};

/* ---------- Simulation step (one game minute) ---------- */
function step(){
  const m=S.t;
  S.tx.forEach((t,i)=>{if(t.out&&!t.out.ready&&m>=t.out.until){t.out.ready=true;
    if(GAME==='fc'){t.out=null;t.em=0;t.sh=0;mark(m,'xfer',`T${i+1} restored`);const msg=`T${i+1} is back in service.`;logE(m,msg,'ok');queueAlert(msg,'ok',false);play('ok');return;}
    const msg=t.out.kind==='planned'?`T${i+1} maintenance is finished. Close the T${i+1} breaker to put it back in service.`:t.out.kind==='trip'?`T${i+1} has been inspected after its trip. Close the T${i+1} breaker to put it back in service.`:`T${i+1} has been repaired. Close the T${i+1} breaker to put it back in service.`;
    logE(m,msg,'ok');queueAlert(msg,'ok',false);play('ok');}});
  ITIDS.forEach(k=>{const f=S.it[k];if(f.fault&&!f.fault.ready&&m>=f.fault.until){f.fault.ready=true;const msg=`The ${devName('it:'+k)} has been repaired. It can be closed again.`;logE(m,msg,'ok');queueAlert(msg,'ok',false);play('ok');}});
  PIDS.forEach(p=>{const f=S.fd[p];if(f.fault&&!f.fault.ready&&m>=f.fault.until){f.fault.ready=true;const msg=f.fault.planned?`${PR[p].name} feeder maintenance is finished. Close its breaker at Blackout Canyon and its incomer at ${PR[p].name} to put it back.`:`The ${PR[p].name} feeder has been repaired. Close its breaker at Blackout Canyon and its incomer at ${PR[p].name} to put it back.`;logE(m,msg,'ok');queueAlert(msg,'ok',false);play('ok');}});
  for(const e of S.events){
    if(!e.noticed&&m>=e.start-60&&m<e.start){e.noticed=true;logE(m,`${e.fd?PR[e.fd].name+' feeder':'T'+(e.tx+1)} planned outage starts in an hour, at ${fmtT(e.start)}.`,'warn');}
    if(!e.fired&&m>=e.start&&e.fd){e.fired=true;const f=S.fd[e.fd],was=f.brk&&f.inc;f.brk=false;f.inc=false;f.fault={until:Math.max(e.end,f.fault&&!f.fault.ready?f.fault.until:0),ready:false,label:'Planned maintenance',planned:true};mark(m,'planned',PR[e.fd].name+' feeder out');
      const s=`Field staff have opened both ends of the ${PR[e.fd].name} feeder (the breaker at Blackout Canyon and the incomer at ${PR[e.fd].name}) for planned work on the feeder until ${fmtT(e.end)}.`;logE(m,s,'warn');queueAlert(s,'warn',!!was);play('warn');}
    if(!e.fired&&m>=e.start){e.fired=true;const t=S.tx[e.tx];
      if(!t.out){t.out={kind:'planned',until:e.end,ready:false,label:e.cause};mark(m,'planned',`T${e.tx+1} out`);const s=`Field staff have switched out T${e.tx+1} for planned maintenance until ${fmtT(e.end)}.`;logE(m,s,'warn');queueAlert(s,'warn',false);play('warn');}}
  }
  if(!S.silent)for(const f of S.sched){if(f.done||m<f.m)continue;f.done=true;const[type,id]=f.k.split(':');
    if(type==='tx'){const i=+id,t=S.tx[i];if(t.out)continue;
      t.out={kind:'fault',until:m+f.dur,ready:false,label:f.cause};S.faults++;S.chain.push(`a fault on the T${i+1} circuit`);mark(m,'fault',`T${i+1} fault`);
      const s=`Fault on the T${i+1} circuit: ${f.cause.toLowerCase()}. T${i+1} tripped. Repair expected by ${fmtT(m+f.dur)}.`;logE(m,s,'alarm');queueAlert(s,'alarm',true);play('fault');fx('cct'+i);}
    else if(type==='ic'){const it=S.it[id];if(it.fault)continue;it.fault={until:m+f.dur,ready:false,label:f.cause};const was=it.closed;it.closed=false;S.faults++;S.chain.push(`a fault on the ${devName('it:'+id)}`);mark(m,'fault',devName('it:'+id)+' fault');
      const s=`Fault on the ${devName('it:'+id)}: ${f.cause.toLowerCase()}. ${was?'It tripped. ':''}Repair expected by ${fmtT(m+f.dur)}.`;logE(m,s,'alarm');queueAlert(s,'alarm',true);play('fault');fx('itg_'+id);}
    else{const p=id,fd=S.fd[p];if(fd.fault)continue;
      fd.fault={until:m+f.dur,ready:false,label:f.cause};S.faults++;S.chain.push(`a fault on the ${PR[p].name} feeder`);mark(m,'fault',`${PR[p].name} feeder fault`);
      const was=fd.brk&&fd.inc;fd.brk=false;fd.inc=false;
      const s=`Fault on the ${PR[p].name} 33 kV feeder: ${f.cause.toLowerCase()}. ${was?`Its breaker at Blackout Canyon and the incomer at ${PR[p].name} both tripped. `:''}Repair expected by ${fmtT(m+f.dur)}.`+(was?` Restore ${PR[p].name} through ${PR[p].nb?'the '+NBS[PR[p].nb].name+' tie or ':''}an interconnector.`:'');
      logE(m,s,'alarm');queueAlert(s,'alarm',true);play('fault');fx('fdg_'+p);}}
  if(S.cutout&&!S.cutout.fired&&m>=S.cutout.start){S.cutout.fired=true;mark(m,'fail','Wind stop');const s=`Spinney Windy Things shut down on high wind speed. Restart expected around ${fmtT(S.cutout.end)}.`;logE(m,s,'alarm');queueAlert(s,'alarm',true);play('warn');}
  if(S.cutout&&S.cutout.fired&&!S.cutout.done&&m>=S.cutout.end){S.cutout.done=true;logE(m,'Spinney Windy Things restarting.','ok');}
  if(S.op&&m>=S.op.at){const op=S.op;S.op=null;doOp(op,m);}
  if(!S.silent)stepCrews(m);

  const c=comps(m,false),n=S.tx.filter(t=>!t.out).length;
  // Protection on topology: out-of-phase and long parallels
  let topo=groupsOf(edgesNow());
  topo.list.forEach(g=>{if(kindOf(g)==='bad'&&!S.silent){const ties=PIDS.filter(p=>g.nodes.includes(p)&&PR[p].nb==='fm'&&S.tie[p].closed);ties.forEach(p=>S.tie[p].closed=false);
    incident(m,`Out-of-phase paralleling: Blackout Canyon or Ampy Place was connected to Watts This, which is on a different grid supply. The Watts This ${ties.length>1?'ties':'tie'} tripped.`,'pMimic');}});
  topo=groupsOf(edgesNow());
  const parG=topo.list.filter(g=>kindOf(g)==='par');
  if(parG.length){S.parMin++;if(S.parMin>PAR_MAX&&!S.silent){parG.forEach(g=>PIDS.filter(p=>g.nodes.includes(p)&&PR[p].nb==='kn'&&S.tie[p].closed).forEach(p=>S.tie[p].closed=false));S.parMin=0;
    incident(m,`Blackout Canyon was paralleled with Ampy Place for more than ${PAR_MAX} minutes, so the Ampy Place tie protection tripped. Open one side within ${PAR_MAX} minutes of closing the other.`,'pMimic');}}else{if(S.parMin>0&&!S.silent)S.parOk++;S.parMin=0;}
  const pre=solve(Object.fromEntries(PIDS.map(p=>[p,0]))),sup=pre.sup,wB={};S.isl=pre.isl;S.supNow=sup;
  PIDS.forEach(p=>{wB[p]=sup[p]==='par'?(fdOn(p)?1:.5):wBC(sup[p]);
    if(!S.silent){const was=S.sup[p];
      if(was!=='off'&&sup[p]==='off'){logE(m,`${PR[p].name} is off supply.`,'alarm');mark(m,'off',PR[p].name+' off');}
      if(was==='off'&&sup[p]!=='off'){logE(m,`${PR[p].name} customers back on supply${sup[p]==='kn'||sup[p]==='fm'?' from '+NBS[sup[p]].name:''}.`,'ok');play('ok');}}});
  S.sup=sup;S.wB=wB;
  const av=availability(c,m);SERVICES.forEach(s=>{if(sup[s.prim]==='off')av[s.id]=0;});
  const manT={},autoT={};SERVICES.forEach(s=>{manT[s.id]=Math.min(S.manual[s.id],av[s.id]);autoT[s.id]=0;});
  const pn0={};PIDS.forEach(p=>pn0[p]=netP(c,p,manT));
  const sol0=solve(pn0);
  sol0.IS.list.forEach(I=>{if(!I.alive)return;const net0=sol0.inj[I.id]||0,C=I.txs.length*R,mine=s=>S.isl[s.prim]===I.id;
  if(Math.abs(net0)>C*.98){
    const dir=net0>0?'import':'export';let need=Math.abs(net0)-C*.96;
    SERVICES.filter(s=>s.dir===dir&&S.armed[s.id]>0&&wB[s.prim]>0&&mine(s)).sort((a,b)=>a.use-b.use).forEach(s=>{if(need<=0)return;const w=wB[s.prim];
      const room=Math.max(0,Math.min(S.armed[s.id],av[s.id]-manT[s.id]));if(room<=0)return;
      if(!S.called[s.id]){S.called[s.id]=true;if(!S.silent&&S.rng2()<s.fail){S.fail[s.id]=m+30;mark(m,'fail',s.name);
        const msg=s.gen?`${s.name} didn't respond to the curtailment signal (communications fault). It's unavailable until ${fmtT(m+30)}.`:`${s.name} failed to ${s.id==='chp'?'start':'respond'}. It's unavailable until ${fmtT(m+30)}.`;
        logE(m,msg,'alarm');queueAlert(msg,'alarm',false);return;}}
      const u=Math.min(room,need/w);autoT[s.id]=u;need-=u*w;});
  }else if(Math.abs(net0)<C*.9)SERVICES.filter(mine).forEach(s=>S.called[s.id]=false);});
  SERVICES.forEach(s=>{const tgt=manT[s.id]+autoT[s.id],a=S.act[s.id];let v=tgt>a?Math.min(tgt,a+s.ramp):Math.max(tgt,a-s.ramp);v=Math.min(v,av[s.id]);S.act[s.id]=Math.max(0,v);});
  const pn={};PIDS.forEach(p=>pn[p]=netP(c,p,S.act));
  const sol=solve(pn);S.islands=sol.IS.list.map(I=>({...I,inj:sol.inj[I.id]||0}));
  const net=S.islands.reduce((a,I)=>a+(I.alive?I.inj:0),0);
  S.c=c;S.av=av;S.net=net;S.n=n;S.pn=pn;S.flows=sol.flows;S.inj=sol.inj;S.split=S.islands.filter(I=>I.alive).length>1||!S.bs['12'].closed||!S.bs['23'].closed;
  S.tx.forEach((t,i)=>{const I=S.islands.find(J=>J.txs.includes(i));if(t.out||!I){t.flow=0;t.L=0;}else{t.flow=I.inj/I.txs.length;t.L=Math.abs(t.flow)/R;}const target=t.out?22:20+100*t.L*t.L;t.temp+=(target-t.temp)/TAU;});
  {const share=sc=>{const I=S.islands.find(J=>J.secs.includes(sc));return I&&I.alive?I.inj/I.txs.length*SECS[sc].tx.filter(i=>!S.tx[i].out).length:0;},
    load=sc=>PIDS.filter(p=>FSEC[p]===sc).reduce((a,p)=>a+(sol.flows['bc:'+p]||0),0);
    S.bsf['12']=S.bs['12'].closed?share('B1')-load('B1'):0;
    S.bsf['23']=S.bs['23'].closed?(S.bs['12'].closed?share('B1')+share('B2')-load('B1')-load('B2'):share('B2')-load('B2')):0;}
  const tripped=[];
  S.tx.forEach((t,i)=>{if(t.out)return;let why=null;
    if(t.L>SHORT)why='instantaneous overcurrent protection';
    else{t.sh=t.L>EMERG?t.sh+1:0;t.em=t.L>1.0001?t.em+1:Math.max(0,t.em-1);
      if(t.sh>=SHORT_MIN)why='overcurrent protection';else if(t.em>=EMERG_MIN)why='overload protection, with its emergency rating used up';else if(t.temp>=TRIP_T)why='winding temperature protection';}
    if(why){t.out={kind:'trip',until:m+90,ready:false,label:why[0].toUpperCase()+why.slice(1)};t.em=0;t.sh=0;S.trips++;tripped.push({i,why});}});
  if(tripped.length&&!S.silent){const names=tripped.map(x=>'T'+(x.i+1)).join(' and ');S.chain.push(`${names} tripping on ${tripped[0].why}`);mark(m,'trip',names+' trip');
    const s=`Overload trip: ${names} (${tripped[0].why}). The flow moves onto what is left. Inspection takes 90 minutes.`;logE(m,s,'alarm');queueAlert(s,'alarm',true);play('trip');tripped.forEach(x=>fx('cct'+x.i));}
  // circuit ratings
  S.spare={kn:spareOf('kn',m),fm:spareOf('fm',m),vf:VF_ON?spareOf('vf',m):0};
  S.lkLoad={};LKIDS.forEach(k=>{const L=LINKS[k];let f=0;if(S.lk[k]){if(feedOf(L.a[0],L.a[1])===L.b[0])f=lfMW(L.a[0],L.a[1]);else if(feedOf(L.b[0],L.b[1])===L.a[0])f=lfMW(L.b[0],L.b[1]);}S.lkLoad[k]=f;
    const id='lk:'+k,Lr=f/L.r;if(!(S.lf[L.a[0]][L.a[1]]&&S.lf[L.b[0]][L.b[1]])){S.ov[id+'x']=Lr>1.0001?(S.ov[id+'x']||0)+1:0;
      if(S.ov[id+'x']>=OV_MIN&&!S.silent){S.ov[id+'x']=0;S.lk[k]=false;S.trips++;S.chain.push(`the ${devName(id)} tripping`);mark(m,'trip',devName(id)+' trip');const s3=`Overload trip: the ${devName(id)} opened because it carried over its ${L.r} MW rating.`;logE(m,s3,'alarm');queueAlert(s3,'alarm',true);play('trip');fx('lkg_'+k);}}});
  S.vfLoad=VF_ON?PIDS.reduce((a,p)=>a+c.demand*S.share[p]*vfFrac(p),0):0;
  {const L=S.vfLoad/Math.max(1,S.spare.vf);S.ov.vf=VF_ON&&L>1.0001?(S.ov.vf||0)+1:0;
   if(S.ov.vf>=OV_MIN&&!S.silent){S.ov.vf=0;const tr=[];PIDS.forEach(p=>VFI.forEach(i=>{if(S.nop[p][i]&&!S.lf[p][i]){S.nop[p][i]=false;tr.push(LFN[p][i]);}}));S.trips++;S.chain.push('the Volt Face backfeeds tripping');mark(m,'trip','Volt Face trip');
     const s2=`Overload trip: Volt Face ran out of spare capacity and its backfeeds tripped (${tr.join(', ')}). Those customers are off until you restore them.`;logE(m,s2,'alarm');queueAlert(s2,'alarm',true);play('trip');}}const edL={};
  sol.E.forEach(e=>{let L=Math.abs(sol.flows[e.id]||0)/e.r;if(e.id.startsWith('tie:')){const nb=PR[e.id.slice(4)].nb;L=Math.max(L,Math.abs(sol.inj[nb])/Math.max(1,S.spare[nb]));}edL[e.id]=L;
    S.ov[e.id]=GAME==='cr'&&L>1.0001?(S.ov[e.id]||0)+1:0;
    if(S.ov[e.id]>=OV_MIN&&!S.silent){S.ov[e.id]=0;openEdge(e.id);S.trips++;S.chain.push(`the ${devName(e.id)} tripping`);mark(m,'trip',devName(e.id)+' trip');
      const why=e.id.startsWith('tie:')?`${NBS[PR[e.id.slice(4)].nb].name} ran out of spare capacity or the tie was over its ${e.r} MW rating`:`it was over its ${e.r} MW rating`;
      const s=`Overload trip: the ${devName(e.id)} opened because ${why}.`;logE(m,s,'alarm');queueAlert(s,'alarm',true);play('trip');fx(elOf(e.id));}});
  Object.keys(S.ov).forEach(k=>{if(!(k in edL))S.ov[k]=0;});S.edL=edL;
  if(!S.silent)updateAlarms(m,sol);
  if(S.sc.gsp){const G=S.sc.gsp;S.gspLoad=Math.max(0,S.net)+Math.max(0,S.inj.kn||0);
    if(!S.silent){
      if(m===G.warn){const s1=`National Grid warning: a supergrid transformer at Steve Towers is failing. From ${fmtT(G.start)} you will have to hold Blackout Canyon plus Ampy Place to ${G.limit} MW until ${fmtT(G.end)}. Ampy Place shares the grid supply, so it does not help. Use Watts This, Volt Face and, if you must, 11 kV feeders.`;logE(m,s1,'alarm');queueAlert(s1,'alarm',true);play('warn');}
      if(m===G.start){const s2=`National Grid instruction: Steve Towers is down to one supergrid transformer. Get below ${G.limit} MW by ${fmtT(G.deadline)} (now ${Math.round(S.gspLoad)} MW).`;logE(m,s2,'alarm');queueAlert(s2,'alarm',true);play('emerg');mark(m,'fail','GSP limit');}
      if(m>=G.deadline&&m<G.end){if(S.gspLoad>G.limit+.5){S.gspOver++;S.insecureMin++;
          if(S.gspOver>=15){S.gspOver=0;const live=S.tx.map((t,i)=>[t,i]).filter(([t])=>!t.out).sort((a,b)=>Math.abs(b[0].flow)-Math.abs(a[0].flow));
            if(live.length){const[t,i]=live[0];t.out={kind:'trip',until:m+90,ready:false,label:'Disconnected by National Grid'};S.gspTrips++;S.trips++;S.chain.push('National Grid disconnecting T'+(i+1));mark(m,'trip','GSP disconnect');
              const s3=`National Grid disconnected T${i+1} at Steve Towers to protect the grid, because Blackout Canyon stayed above the ${G.limit} MW limit. It can be closed again after 90 minutes.`;logE(m,s3,'alarm');queueAlert(s3,'alarm',true);play('trip');fx('cct'+i);}}}
        else S.gspOver=0;}
      if(m===G.end){logE(m,'National Grid has lifted the Steve Towers limit. Normal running can resume.','ok');queueAlert('National Grid has lifted the Steve Towers limit.','ok',false);play('ok');}}}
  let allOff=true;
  {const C=S.cust;PIDS.forEach(p=>LF[p].forEach((f,i)=>{const k=p+i,fed=feedOf(p,i,sup)!==null,n=Math.round(CUST_TOTAL*S.share[p]*f);
    if(!fed){const o=C.off[k]=(C.off[k]||0)+1;if(o===SHORT_INT){C.ci+=n;C.cml+=SHORT_INT*n;}else if(o>SHORT_INT)C.cml+=n;}
    else if(C.off[k]){if(C.off[k]<SHORT_INT)C.si+=n;C.off[k]=0;}}));
   S.ens=C.ci/100+C.cml/500+C.si/500;S.vfPeak=Math.max(S.vfPeak,S.vfLoad||0);}
  PIDS.forEach(p=>{if(sup[p]==='off'){if(p==='ml')S.cost.gen+=c.solar*SV.solar.use/60;if(p==='rv')S.cost.gen+=c.wind*SV.wind.use/60;}else allOff=false;});
  if(allOff&&!S.silent){loseSite(m);return;}
  if(!S.silent&&S.tx.every(t=>!t.out)&&PIDS.every(p=>sup[p]!=='off'))S.chain=[];
  const live=S.tx.filter(t=>!t.out),maxL=live.length?Math.max(...live.map(t=>t.L)):0;S.peakL=Math.max(S.peakL,maxL);
  const emerg=maxL>1;if(emerg)S.overloadMin++;
  if(emerg&&!S.emergOn&&!S.silent){play('emerg');mark(m,'emerg','Emergency rating');}S.emergOn=emerg;
  let autoTot=0;
  SERVICES.forEach(s=>{const a=S.act[s.id],mp=Math.min(a,manT[s.id]),ap=a-mp;S.manP[s.id]=mp;S.autoP[s.id]=ap;autoTot+=ap;
    S.cost.arm+=S.armed[s.id]*s.arm/60;
    if(s.gen){S.cost.curt+=a*s.use/60;S.allow[s.id]=Math.max(0,S.allow[s.id]-a/60);
      if(S.allow[s.id]<=0&&!S.allowLogged[s.id]&&!S.silent&&!NOGEN()){S.allowLogged[s.id]=true;const msg=`${s.name} has used its curtailment allowance. It can't be curtailed again this shift.`;logE(m,msg,'warn');queueAlert(msg,'warn',false);}}
    else{S.cost.use+=ap*s.use/60;S.cost.short+=mp*s.use*1.5/60;}});
  if(autoTot>.5&&!S.autoOn)mark(m,'flex','Flex in');S.autoOn=autoTot>.5;
  S.soc=clamp(S.soc+(S.act.bchg*.92-S.act.bdis)/60,0,SOC_MAX);
  S.sec=security(av);if(S.sec.insecure&&!S.silent)S.insecureMin++;
  S.hist.push({m,net,n});if(S.hist.length>70)S.hist.shift();
  if(!S.silent)S.full.push({m,net,n,ins:S.sec.insecure,off:PIDS.filter(p=>sup[p]==='off').length});
  S.t++;
  flushAlerts();
  if(S.t>=END&&!S.silent)endShift();
}

function security(av){let worst=null;const rank=r=>r.insecure?1e6+r.short-r.cover:r.exposed?5e5+r.abs:(r.after||0);
  S.islands.forEach(I=>{if(!I.alive)return;const abs=Math.abs(I.inj),k=I.txs.length,dir=I.inj>=0?'import':'export';let cv=0;
    SERVICES.forEach(s=>{if(s.dir!==dir||S.isl[s.prim]!==I.id)return;const w=S.wB[s.prim];if(!w)return;cv+=w*Math.max(0,Math.min(S.armed[s.id]-S.autoP[s.id],av[s.id]-S.act[s.id]));});
    let r;if(k<2)r={n:k,dir,abs,cover:cv,short:0,after:null,post:null,insecure:false,exposed:abs>.5};
    else{const cap=(k-1)*R,short=Math.max(0,abs-cap);r={n:k,dir,abs,cover:cv,short,after:abs/cap,post:Math.max(0,abs-cv)/cap,insecure:short>cv+.5,exposed:false};}
    r.id=I.id;r.inj=I.inj;r.secs=I.secs;if(!worst||rank(r)>rank(worst))worst=r;});
  return worst||{n:0,dir:'import',abs:0,cover:0,short:0,after:null,post:null,insecure:false,exposed:false,secs:[]};}
function worstIsl(){let w=null;S.islands.forEach(I=>{if(!I.alive)return;const L=Math.abs(I.inj)/I.txs.length/R;if(!w||L>w.L)w={L,k:I.txs.length,inj:I.inj,txs:I.txs};});return w;}
const secName=secs=>secs.length===3?'Blackout Canyon':'the '+secs.map(sc=>({B1:'T1',B2:'T2',B3:'T3'})[sc]).join('/')+' section';

/* ---------- Alarms ---------- */
function alarmCands(sol){const c=[];
  S.tx.forEach((t,i)=>{if(!t.out)c.push({id:'tx:'+i,sel:'tx:'+i,name:`Transformer T${i+1}`,L:t.L,trip:t.L>EMERG?SHORT_MIN-t.sh:t.L>1?EMERG_MIN-t.em:null});});
  sol.E.forEach(e=>{const L=Math.abs(sol.flows[e.id]||0)/e.r;c.push({id:e.id,sel:e.id,name:ucfirst(devName(e.id)),L:e.id.startsWith('tie:')?Math.abs(sol.flows[e.id]||0)/e.r:L,trip:(S.ov[e.id]||0)>0?OV_MIN-S.ov[e.id]:null});});
  if(S.sc.gsp&&S.t>=S.sc.gsp.start&&S.t<S.sc.gsp.end)c.push({id:'gsp',sel:null,name:'Steve Towers GSP limit',L:S.gspLoad/S.sc.gsp.limit,trip:S.t>=S.sc.gsp.deadline&&S.gspOver>0?15-S.gspOver:null});
  LKIDS.forEach(k=>{const f=(S.lkLoad||{})[k]||0;if(f>.5)c.push({id:'lkx:'+k,sel:'lk:'+k,name:ucfirst(devName('lk:'+k)),L:f/LINKS[k].r,trip:(S.ov['lk:'+k+'x']||0)>0?OV_MIN-S.ov['lk:'+k+'x']:null});});
  if(S.vfLoad>.5)c.push({id:'nb:vf',sel:'nb:vf',name:'Volt Face spare capacity',L:S.vfLoad/Math.max(1,S.spare.vf),trip:(S.ov.vf||0)>0?OV_MIN-S.ov.vf:null});
  ['kn','fm'].forEach(k=>{if(Math.abs(sol.inj[k])>.5)c.push({id:'nb:'+k,sel:'nb:'+k,name:`${NBS[k].name} spare capacity`,L:Math.abs(sol.inj[k])/Math.max(1,S.spare[k]),trip:null});});
  return c;}
function updateAlarms(m,sol){const A=S.alarms,seen={};
  alarmCands(sol).forEach(c=>{const a=A[c.id];seen[c.id]=1;
    if(!a&&c.L>=AL_ON){A[c.id]={...c,since:m,lvl:c.L>1?'over':'high',ack:false};
      if(c.L>1){const s=`Overload alarm: ${c.name} at ${Math.round(c.L*100)}%.`;logE(m,s,'alarm');queueAlert(s,'alarm',true);play('emerg');}
      else{logE(m,`High load alarm: ${c.name} at ${Math.round(c.L*100)}% of its rating.`,'warn');play('alarm');}}
    else if(a){if(c.L<AL_OFF){delete A[c.id];logE(m,`Alarm cleared: ${c.name}.`,'ok');return;}
      const lvl=c.L>1?'over':'high';
      if(lvl==='over'&&a.lvl!=='over'){a.ack=false;const s=`Overload alarm: ${c.name} at ${Math.round(c.L*100)}%.`;logE(m,s,'alarm');queueAlert(s,'alarm',true);play('emerg');}
      Object.assign(a,{L:c.L,trip:c.trip,lvl,name:c.name});}});
  Object.keys(A).forEach(k=>{if(!seen[k])delete A[k];});}
const anyOver=()=>S&&Object.values(S.alarms).some(a=>a.lvl==='over');
let lastAl='';
function renderAlarms(){const list=Object.values(S.alarms).sort((a,b)=>(b.lvl==='over')-(a.lvl==='over')||b.L-a.L),un=list.filter(a=>!a.ack).length;
  const h=list.length?`<ul class="al-list">${list.map(a=>`<li class="al ${a.lvl}${a.ack?'':' unack'}"><button type="button" data-sel="${a.sel}" data-k="al-${a.id}"><span class="al-l">${a.lvl==='over'?'Overload':'High load'}</span><span class="al-n">${esc(a.name)}</span><span class="al-v">${Math.round(a.L*100)}%</span><span class="al-t">since ${fmtT(a.since)}${a.trip!=null?' · trips in '+a.trip+' min':a.lvl==='over'&&a.id.startsWith('nb:')?' · ties trip in '+OV_MIN+' min if it stays over':''}</span></button></li>`).join('')}</ul>`
    :'<p class="empty">No alarms. Anything above 80% of its rating shows here.</p>';
  const k=h+'|'+un;if(k!==lastAl){lastAl=k;$('alBody').innerHTML=h;}
  txt('alCount',list.length?String(list.length):'');setAttr($('alCount'),'class','al-count'+(list.some(a=>a.lvl==='over')?' over':list.length?' high':''));
  $('ackBtn').hidden=!un;setAttr($('pAlarm'),'class','panel p-alarm'+(un?' ringing':''));
  setAttr($('dAl'),'class','al-count'+(list.some(a=>a.lvl==='over')?' over':list.length?' high':''));txt('dAl',list.length?String(list.length):'');}
function ackAll(){Object.values(S.alarms).forEach(a=>a.ack=true);lastAl='';render(true);}

/* ---------- Switching ---------- */
function opLabel(k,act){const[type,id]=k.split(':');
  if(type==='tx')return `${act==='close'?'Close':'Open'} T${+id+1} breaker`;
  if(type==='bc')return `${act==='close'?'Close':'Open'} ${PR[id].name} breaker at Blackout Canyon`;
  if(type==='in')return `${act==='close'?'Close':'Open'} ${PR[id].name} incomer`;
  if(type==='lf')return `${act==='close'?'Close':'Open'} the ${devName(k)} at ${PR[id.slice(0,2)].name}`;
  if(type==='nop')return `${act==='close'?'Close':'Open'} the ${devName(k)}`;
  if(type==='bs')return `${act==='close'?'Close':'Open'} the ${devName(k)}`;
  if(type==='tie')return `${act==='close'?'Close':'Open'} ${NBS[PR[id].nb].name} tie to ${PR[id].name}`;
  if(type==='lk')return `${act==='close'?'Close':'Open'} the ${devName(k)}`;
  return `${act==='close'?'Close':'Open'} ${PR[ITS[id].a].name} – ${PR[ITS[id].b].name} interconnector`;}
const crewAt=k=>S.crews.find(c=>c.at===k&&!c.to);
const crewFor=k=>S.crews.find(c=>c.job&&c.job.k===k);
function devXY(k){const b=SELBOX[k];return b?{x:b[0]+b[2]/2,y:b[1]+b[3]/2}:{x:DEPOT.x,y:DEPOT.y};}
function crewPos(c,tNow){if(!c.to)return{x:c.x,y:c.y};const f=clamp((tNow-c.dep)/Math.max(.01,c.arr-c.dep),0,1),dx=c.to.x-c.from.x,dy=c.to.y-c.from.y,tot=Math.abs(dx)+Math.abs(dy)||1,d=f*tot;
  return d<=Math.abs(dx)?{x:c.from.x+Math.sign(dx)*d,y:c.from.y}:{x:c.to.x,y:c.from.y+Math.sign(dy)*(d-Math.abs(dx))};}
function dispatch(k,act){if(!S||S.ended||!CREW_ON)return;
  if(crewFor(k)){showBanner({m:S.t,text:`Crew ${crewFor(k).n} is already on its way to the ${devName(k)}.`,lvl:'warn'});return;}
  let c=crewAt(k)&&!crewAt(k).job?crewAt(k):null;const tgt=devXY(k);
  if(!c){const idle=S.crews.filter(x=>!x.job);if(!idle.length){showBanner({m:S.t,text:'All three field crews are busy. Wait for one to finish its job.',lvl:'warn'},'Crews walk to manual switches, which takes time. Send one ahead to stand by where you will need it.');return;}
    c=idle.sort((a,b)=>{const pa=crewPos(a,S.t),pb=crewPos(b,S.t);return(Math.abs(pa.x-tgt.x)+Math.abs(pa.y-tgt.y))-(Math.abs(pb.x-tgt.x)+Math.abs(pb.y-tgt.y));})[0];}
  const p=crewPos(c,S.t),dist=Math.abs(p.x-tgt.x)+Math.abs(p.y-tgt.y),travel=c.at===k?0:Math.max(2,Math.round(dist/CREW_SPEED));
  if(travel){c.from={x:p.x,y:p.y};c.to=tgt;c.dep=S.t;c.arr=S.t+travel;c.at=null;}
  c.job={k,act,at:S.t+travel+(act?CREW_OP:0),arr:S.t+travel};
  logE(S.t,act?`Crew ${c.n} sent to ${opLabel(k,act).toLowerCase()}. Arrives ${fmtT(S.t+travel)}, done by ${fmtT(c.job.at)}.`:`Crew ${c.n} sent to stand by at the ${devName(k)}. Arrives ${fmtT(S.t+travel)}.`,'info');
  play('click');lastInsp='';render(true);}
function stepCrews(m){if(!CREW_ON)return;S.crews.forEach(c=>{
  if(c.to&&m>=c.arr){c.x=c.to.x;c.y=c.to.y;c.to=null;c.at=c.job?c.job.k:c.at;}
  if(c.job&&m>=c.job.at){const j=c.job;c.job=null;c.at=j.k;if(j.act){S.crewJobs++;doOp({k:j.k,act:j.act},m);}else logE(m,`Crew ${c.n} is standing by at the ${devName(j.k)}.`,'ok');}});}
function issueOp(k,act){if(!S||S.ended||GAME==='fc')return;
  if(isManual(k)){dispatch(k,act);return;}
  if(S.op){showBanner({m:S.t,text:`Wait for the current operation (${opLabel(S.op.k,S.op.act).toLowerCase()}) to finish.`,lvl:'warn'},'Each operation takes one minute.');return;}
  S.op={k,act,at:S.t+1};logE(S.t,`Operating: ${opLabel(k,act).toLowerCase()}.`,'info');play('click');lastInsp='';render(true);}
function doOp(op,m){const[type,id]=op.k.split(':');play('op');
  if(type==='tx'){const i=+id,t=S.tx[i];
    if(op.act==='close'){if(!t.out)return;
      if(!t.out.ready){t.out.until+=30;incident(m,`T${i+1} was closed before ${t.out.kind==='planned'?'its maintenance was finished':t.out.kind==='trip'?'its inspection was finished':'it was repaired'}. Protection tripped it straight away, and it now takes 30 minutes longer to come back.`,'cct'+i);return;}
      const alive=S.tx.some(x=>!x.out);t.out=null;t.em=0;t.sh=0;mark(m,'xfer',`T${i+1} restored`);logE(m,`T${i+1} breaker closed. T${i+1} is back in service.`,'ok');
      if(!alive){const g=groupsOf(edgesNow());if(g.list.some(x=>kindOf(x)==='bad'))logE(m,'Re-energising Blackout Canyon joined it to Watts This.','warn');}}
    else{if(t.out)return;t.out={kind:'open',until:m,ready:true,label:'Switched out by control'};mark(m,'xfer',`T${i+1} opened`);logE(m,`T${i+1} breaker opened. T${i+1} is switched out.`,'warn');}
    return;}
  const k=op.k,nm=devName(k);
  if(type==='nop'){const[p,i]=lfP(id),v=S.nop[p][i];if((op.act==='close')===v)return;const mwv=Math.round(lfMW(p,i)),fn=LFN[p][i];
    if(op.act==='close'&&S.lf[p][i]){incident(m,`The ${nm} was closed while the ${fn} feeder breaker at ${PR[p].name} was still closed. That paralleled Blackout Canyon with Volt Face, which is on a different grid supply, so the backfeed tripped straight away. Open the feeder breaker first.`,'nopb_'+id);return;}
    S.nop[p][i]=op.act==='close';mark(m,'xfer',nm+(v?' opened':' closed'));
    logE(m,v?(S.lf[p][i]?`${ucfirst(nm)} opened.`:`${ucfirst(nm)} opened: about ${mwv} MW of ${fn} customers are off supply.`):`${ucfirst(nm)} closed: ${fn} (about ${mwv} MW) is now fed from Volt Face.`,v&&!S.lf[p][i]?'warn':'ok');return;}
  if(type==='lf'&&op.act==='close'){const[p,i]=lfP(id),l=linkOf(p,i);
    if(l&&S.lk[l.k]&&S.lf[l.q][l.j]&&subOn(l.q)&&subOn(p)&&grpOf(S.sup[p])!==grpOf(S.sup[l.q])){incident(m,`The ${nm} breaker at ${PR[p].name} was closed while it was linked at 11 kV to ${PR[l.q].name}, which is on a different grid supply. That paralleled two grid supplies, so the breaker tripped straight away. Open the 11 kV link first.`,'lfb_'+id);return;}
    if(l&&S.lk[l.k]&&S.lf[l.q][l.j]&&subOn(l.q)&&subOn(p))logE(m,`${ucfirst(nm)} closed with the ${devName('lk:'+l.k)} closed: ${PR[p].name} and ${PR[l.q].name} are now paralleled at 11 kV. Open one side to finish the transfer.`,'warn');}
  if(type==='lf'&&op.act==='close'){const[p,i]=lfP(id);if(S.nop[p][i]){incident(m,`The ${nm} breaker at ${PR[p].name} was closed while ${LFN[p][i]} was still fed from Volt Face. That paralleled two different grid supplies, so the breaker tripped straight away. Open the Volt Face backfeed first.`,'lfb_'+id);return;}}
  if(type==='lf'){const[p,i]=lfP(id),v=S.lf[p][i];if((op.act==='close')===v)return;S.lf[p][i]=op.act==='close';const mwv=Math.round(S.c.demand*S.share[p]*LF[p][i]);
    mark(m,'xfer',nm+(v?' opened':' closed'));logE(m,v?`${ucfirst(nm)} at ${PR[p].name} opened: about ${mwv} MW of customers are off supply.`:`${ucfirst(nm)} at ${PR[p].name} closed: about ${mwv} MW of customers are back on.`,v?'warn':'ok');return;}
  if(op.act==='open'){if(!isClosed(k))return;openEdge(k);mark(m,'xfer',nm+' opened');logE(m,`${ucfirst(nm)} opened.`,'info');return;}
  if(isClosed(k))return;
  if(type==='bc'||type==='in'){const f=S.fd[id];if(f.fault&&!f.fault.ready){f.fault.until+=30;incident(m,f.fault.planned?`The ${nm} was closed while field staff were still working on the feeder. It tripped straight away, and the work now takes 30 minutes longer.`:`The ${nm} was closed onto the faulted feeder. It tripped straight away, and the repair now takes 30 minutes longer.`,'fdg_'+id);return;}}
  if(type==='it'){const f=S.it[id];if(f.fault&&!f.fault.ready){f.fault.until+=30;incident(m,`The ${devName(k)} was closed onto its fault. It tripped straight away, and the repair now takes 30 minutes longer.`,'itg_'+id);return;}}
  const before=groupsOf(edgesNow()),after=groupsOf(edgesNow(k));
  const ends=G=>type==='bc'||type==='in'?[G.IS.of[FSEC[id]],id]:type==='bs'?[G.IS.of[id==='12'?'B1':'B2'],G.IS.of[id==='12'?'B2':'B3']]:type==='tie'?[id,PR[id].nb]:type==='lk'?[LINKS[id].a[0],LINKS[id].b[0]]:[ITS[id].a,ITS[id].b];
  const[ea,eb]=ends(before),ga=before.of(ea),gb=before.of(eb),gj=after.of(ends(after)[0]),kind=kindOf(gj);
  if(kind==='bad'){
    let tripped=[];
    if(type==='tie'&&PR[id].nb==='fm'){const p=id;if(S.fd[p].inc){S.fd[p].inc=false;tripped.push(`${PR[p].name} incomer`);}
      ITIDS.filter(k2=>(ITS[k2].a===p||ITS[k2].b===p)&&S.it[k2].closed).forEach(k2=>{S.it[k2].closed=false;tripped.push(devName('it:'+k2));});}
    else{const g=ga.src.includes('fm')?ga:gb;PIDS.filter(p=>g.nodes.includes(p)&&PR[p].nb==='fm'&&S.tie[p].closed).forEach(p=>{S.tie[p].closed=false;tripped.push(`${NBS.fm.name} tie to ${PR[p].name}`);});}
    if(type==='bc'||type==='in')S.fd[id].fault=S.fd[id].fault&&S.fd[id].fault.ready?null:S.fd[id].fault;
    incident(m,`Out-of-phase close: closing the ${nm} tried to parallel Watts This with ${gj.src.filter(s=>s!=='fm').map(s=>isBC(s)?'Blackout Canyon':NBS[s].name).filter((v,i,a)=>a.indexOf(v)===i).join(' and ')}, which is on a different grid supply. The ${nm} tripped${tripped.length?', and so did the '+tripped.join(', '):''}.`,elOf(k));
    return;}
  if(type==='bs')S.bs[id].closed=true;
  else if(type==='bc'||type==='in'){if(type==='bc')S.fd[id].brk=true;else S.fd[id].inc=true;S.fd[id].fault=S.fd[id].fault&&S.fd[id].fault.ready?null:S.fd[id].fault;}
  else if(type==='tie')S.tie[id].closed=true;else if(type==='lk')S.lk[id]=true;else{S.it[id].closed=true;if(S.it[id].fault&&S.it[id].fault.ready)S.it[id].fault=null;}
  S.ov[type==='in'?'bc:'+id:k]=0;mark(m,'xfer',nm+' closed');
  if(kind==='par'&&kindOf(ga)!=='par'&&kindOf(gb)!=='par')logE(m,`${ucfirst(nm)} closed. Blackout Canyon is now paralleled with Ampy Place: open one side within ${PAR_MAX} minutes.`,'warn');
  else{const wasOff=!ga.src.length||!gb.src.length;logE(m,`${ucfirst(nm)} closed.`+(wasOff&&gj.src.length?' Supply restored to the dead side.':''),'ok');}
}
const ucfirst=s=>s[0].toUpperCase()+s.slice(1);

function loseSite(m){
  queued=[];const ch=S.chain.length?S.chain.slice(-4):['a loss of supply'];
  const why=ch.length>1?ch.slice(0,-1).join(', ')+' and then '+ch[ch.length-1]:ch[0];
  S.lost={m,why};mark(m,'lost','Site lost');
  logE(m,`Blackout Canyon lost. After ${why}, all ${PIDS.length===5?'five':'four'} substations were off supply at once.`,'alarm');
  S.net=0;play('lost');fx('pMimic');endShift();
}
function guidance(){
  const off=PIDS.filter(p=>S.sup[p]==='off');
  if(off.length){const p=off[0];return `${PR[p].name} is off supply. Restore it through ${PR[p].fd?'its Blackout Canyon breaker, ':''}${PR[p].nb?'the '+NBS[PR[p].nb].name+' tie or ':''}an interconnector, if that route is healthy.`;}
  const over=Object.keys(S.edL).filter(k=>S.edL[k]>1);
  if(over.length){const k=over[0];if(k.startsWith('tie:')){const nb=PR[k.slice(4)].nb,u=Math.abs(S.inj[nb]||0),sp=S.spare[nb],fl=Math.abs(S.flows[k]||0);if(u>sp&&fl<=PR[k.slice(4)].tie)return `${NBS[nb].name} is supplying ${Math.round(u)} MW but only has ${Math.round(sp)} MW spare, so its ties trip in ${OV_MIN-(S.ov[k]||0)} min. Move a substation back onto Blackout Canyon or onto another route.`;}return `The ${devName(k)} is overloaded and trips in ${OV_MIN-(S.ov[k]||0)} min. ${GAME==='fc'?'Change the generation or flexibility on it.':'Move some load off it.'}`;}
  const wi=worstIsl();if(!wi)return 'Blackout Canyon has no transformers in service. Only substations fed from a neighbour have supply.';
  const pct=Math.round(wi.L*100),dirCut=wi.inj>0?'Cut import':'Cut export',need=Math.ceil(Math.abs(wi.inj)-wi.k*R),t=S.tx[wi.txs[0]];
  const autoTot=SERVICES.reduce((a,s)=>a+S.autoP[s.id],0),how=NOGEN()?'Move a substation onto a neighbour':GAME==='fc'?'using generation and flexibility':'or move a substation onto a neighbour';
  if(pct>120)return `Transformers at ${pct}%, above the 120% emergency rating. Protection trips in ${SHORT_MIN-t.sh} min. ${NOGEN()?how+' now: at least '+need+' MW.':dirCut+' by at least '+need+' MW now, '+how+'.'}`;
  if(pct>100)return `Transformers at ${pct}% on their emergency rating: ${EMERG_MIN-t.em} min to get under 100%. ${NOGEN()?how+': at least '+need+' MW.':dirCut+' by at least '+need+' MW, '+how+'.'}`;
  if(autoTot>.5)return `Armed flexibility is switching in: ${Math.round(autoTot)} MW so far. Loading is ${pct}%.`;
  return `Loading is ${pct}%. Check the next-loss panel.`;
}
function flushAlerts(){
  if(!queued.length)return;
  if(S.tut){queued=[];return;}
  const top=queued.find(q=>q.lvl==='alarm')||queued.find(q=>q.lvl==='warn')||queued[queued.length-1];
  const pause=queued.some(q=>q.pause);queued=[];
  showBanner(top,guidance());
  if(pause&&autoPause&&S.running){S.paused=true;acc=0;}
}
function showBanner(a,g){const b=$('banner');b.className='banner '+(a.lvl==='alarm'?'alarm':a.lvl==='warn'?'warn':'');
  $('bannerMsg').innerHTML=`<b>${fmtT(a.m)}</b>${esc(a.text)}<span class="g">${esc(g)}</span>`;b.hidden=false;$('resumeBtn').hidden=!(S.paused&&S.running);}
function hideBanner(){$('banner').hidden=true;}

/* ---------- Effects ---------- */
function fx(id){if(S.silent)return;const p=$('pMimic');p.classList.remove('flashing');void p.offsetWidth;p.classList.add('flashing');
  const g=$(id);if(g&&g!==p){g.classList.remove('tripflash');setTimeout(()=>{g.classList.add('tripflash');setTimeout(()=>g.classList.remove('tripflash'),1800);},10);}}

/* ---------- Diagram ---------- */
const SELBOX={};
const arw=(id,x,y)=>`<path id="${id}" class="arw hid" d="M${x-6} ${y-4}L${x+6} ${y-4}L${x} ${y+5}Z"/>`;
function setArw(id,v,axis){const e=$(id);if(!e)return;const on=Math.abs(v)>=.5;e.classList.toggle('hid',!on);if(!on)return;
  const r=axis==='v'?(v>0?0:180):(v>0?-90:90);const t=`rotate(${r}deg)`;if(e.style.transform!==t)e.style.transform=t;}
const TIEARW={hw:[96,330,-1],ml:[300,545,-1],rv:[1000,575,1],js:[1085,330,1]};
const ADJ_TIP={batt:['Discharge more: offsets Hartwell\'s load','Charge more: adds load at Hartwell'],dsr:['Reduce demand more','Reduce demand less'],chp:['Run the gas engine harder','Run the gas engine less'],solar:['Curtail less','Curtail more'],wind:['Curtail less','Curtail more']};
function adjBtn(id,x,y,d){const up=d>0,tip=(ADJ_TIP[id]||['Turn up','Turn down'])[up?0:1];return `<g class="adj" id="adj_${id}_${up?'u':'d'}" data-adj="${id}" data-d="${d}" role="button" aria-label="${tip}"><title>${tip}</title><rect x="${x}" y="${y}" width="22" height="19" rx="4"/><path d="${up?`M${x+5} ${y+13.5}h12l-6-8z`:`M${x+5} ${y+5.5}h12l-6 8z`}"/></g>`;}
function buildMimic(){
  const ng=S&&NOGEN();
  let s=`<text class="t-bus" x="400" y="26">STEVE TOWERS GSP · 132 kV</text><line class="bus hv" x1="400" y1="40" x2="800" y2="40"/>`;
  s+=`<rect class="hit" data-sel="nb:kn" x="12" y="222" width="104" height="340"/>
    <text class="nb-name kn" x="16" y="236">AMPY PLACE</text><text id="nbs_kn" class="nb-s" x="16" y="251">Spare 65 MW</text><text class="nb-r" x="16" y="264">Same grid supply</text>
    <line class="bus nbus kn" x1="40" y1="276" x2="40" y2="560"/>`;
  s+=`<rect class="hit" data-sel="nb:fm" x="1074" y="222" width="122" height="370"/>
    <text class="nb-name fm" x="1188" y="236" text-anchor="end">WATTS THIS</text><text id="nbs_fm" class="nb-s" x="1188" y="251" text-anchor="end">Spare 60 MW</text><text class="nb-r" x="1188" y="264" text-anchor="end">Different grid supply</text>
    <line class="bus nbus fm" x1="1160" y1="276" x2="1160" y2="590"/>`;
  SELBOX['nb:kn']=[10,220,110,344];SELBOX['nb:fm']=[1072,220,126,374];
  TXX.forEach((x,i)=>{
    s+=`<g id="cct${i}" class="cct">
    <line id="ca${i}" class="cond hv" x1="${x}" y1="40" x2="${x}" y2="76"/><line id="fa${i}" class="flow" x1="${x}" y1="44" x2="${x}" y2="76"/>
    <rect class="brk" id="hb${i}" x="${x-6}" y="50" width="12" height="12"/>
    <circle class="wdg hv" cx="${x}" cy="92" r="16"/><circle class="wdg mv" cx="${x}" cy="114" r="16"/>
    <line id="cb${i}" class="cond mv" x1="${x}" y1="130" x2="${x}" y2="${BCY}"/><line id="fb${i}" class="flow" x1="${x}" y1="134" x2="${x}" y2="${BCY-4}"/>
    <rect class="brk sw" id="lb${i}" x="${x-8}" y="158" width="16" height="16"/>
    <g id="bolt${i}" hidden><path class="bolt" d="M${x-24} 66 l-8 14 h7 l-5 13 l12 -17 h-7 l6 -10 z"/></g>
    <text class="tx-name" x="${x+22}" y="88">T${i+1}</text>
    <text id="load${i}" class="tx-load" x="${x+22}" y="106">0%</text>
    <text id="flow${i}" class="tx-flow" x="${x+22}" y="121">0 MW</text>
    <rect class="tbar" x="${x+22}" y="127" width="62" height="6" rx="2"/><rect id="tf${i}" class="tfill" x="${x+22}" y="127" width="0" height="6" rx="2"/>
    <text id="tt${i}" class="ttxt" x="${x+22}" y="146">60°C</text>
    <text id="em${i}" class="tx-em" x="${x+22}" y="162"></text>${arw('txa'+i,x,143)}
    <rect class="hit" data-sel="tx:${i}" x="${x-24}" y="46" width="132" height="132"/></g>`;
    SELBOX['tx:'+i]=[x-26,44,136,136];});
  ['B1','B2','B3'].forEach(sc=>{s+=`<line class="bus mv" id="bus_${sc}" x1="${SECS[sc].x1}" y1="${BCY}" x2="${SECS[sc].x2}" y2="${BCY}"/>`;});
  s+=`<text class="t-bus" x="1000" y="${BCY-10}" text-anchor="end" style="font-size:12px">BLACKOUT CANYON 33 kV</text>`;
  BSIDS.forEach(k=>{const x=BSX[k];s+=`<g id="bsg_${k}"><rect id="bsb_${k}" class="brk sw" x="${x-8}" y="${BCY-8}" width="16" height="16"/><text class="bs-t" x="${x}" y="${BCY+24}" text-anchor="middle">BS</text>${arw('bsa_'+k,x,BCY-16)}
    <rect class="hit" data-sel="bs:${k}" x="${x-18}" y="${BCY-26}" width="36" height="56"/></g>`;SELBOX['bs:'+k]=[x-15,BCY-15,30,30];});
  PIDS.forEach(p=>{const P=PR[p],x=P.fx,sw=TIESW[p],py=pY(p);
    if(P.fd)s+=`<g id="fdg_${p}"><line id="fdl_${p}" class="cond mv" x1="${x}" y1="${BCY}" x2="${x}" y2="${PY}"/><line id="fdf_${p}" class="flow" x1="${x}" y1="${BCY+34}" x2="${x}" y2="${PY-4}"/>
      <rect id="fbk_${p}" class="brk sw" x="${x-9}" y="${BCY+14}" width="18" height="18"/>
      <rect id="fin_${p}" class="brk sw" x="${x-9}" y="${PY-50}" width="18" height="18"/><text class="bs-t" x="${x-14}" y="${PY-37}" text-anchor="end">IN</text>
      <g id="fdb_${p}" hidden><path class="bolt" d="M${x+20} 238 l-8 14 h7 l-5 13 l12 -17 h-7 l6 -10 z"/></g>
      <text id="fdt_${p}" class="fd-t" x="${x+14}" y="${BCY+28}"></text>
      <text id="fdv_${p}" class="fd-v" x="${x+12}" y="262"></text>${arw('fda_'+p,x,252)}
      <rect class="hit" data-sel="bc:${p}" x="${x-22}" y="${BCY+6}" width="44" height="38"/></g>`;
    if(P.fd)SELBOX['bc:'+p]=[x-16,BCY+8,32,32],SELBOX['in:'+p]=[x-16,PY-57,32,32];
    s+=`<rect class="hit" data-sel="prim:${p}" x="${P.x1-4}" y="${py-38}" width="${P.x2-P.x1+8}" height="48"/>
      <line id="pb_${p}" class="bus mv" x1="${P.x1}" y1="${py}" x2="${P.x2}" y2="${py}"/>
      <text class="p-name" x="${P.lx||P.x1}" y="${py-22}">${P.name.toUpperCase()}</text><text id="ps_${p}" class="p-stat" x="${P.lx||P.x1}" y="${py-9}">From BC</text><text id="pn_${p}" class="p-net" x="${P.x2}" y="${py-9}" text-anchor="end"></text>`;
    if(P.fd)s+=`<rect class="hit" data-sel="in:${p}" x="${x-22}" y="${PY-62}" width="44" height="42"/>`;
    SELBOX['prim:'+p]=[P.x1-6,py-40,P.x2-P.x1+12,52];
    if(P.nb)s+=`<g id="tieg_${p}"><path id="tl_${p}" class="tie-l ${P.nb}" d="${sw.path}"/>
      <rect id="tsw_${p}" class="brk sw open man" x="${sw.x-9}" y="${sw.y-9}" width="18" height="18" rx="${CREW_ON?9:0}"/>
      <text id="tt_${p}" class="tie-t" x="${sw.lx}" y="${sw.ly}" text-anchor="${sw.anc}">open</text>${arw('tia_'+p,TIEARW[p][0],TIEARW[p][1])}
      <rect class="hit" data-sel="tie:${p}" x="${sw.x-24}" y="${sw.y-22}" width="48" height="52"/></g>`;
    if(P.nb)SELBOX['tie:'+p]=[sw.x-17,sw.y-17,34,34];
  });
  ITIDS.forEach(k=>{const t=ITS[k],x1=PR[t.a].x2,x2=PR[t.b].x1;
    if(t.v){s+=`<g id="itg_${k}"><path id="itl_${k}" class="tie-l it" d="M${t.x} ${pY(t.a)} V${pY(t.b)}"/>
      <rect id="itsw_${k}" class="brk sw open man" x="${t.x-9}" y="${t.sy-9}" width="18" height="18" rx="${CREW_ON?9:0}"/>
      <text id="itt_${k}" class="tie-t" x="${t.left?t.x:t.x+14}" y="${t.left?t.sy+28:t.sy+4}" text-anchor="${t.left?'middle':'start'}">open</text>${arw('ita_'+k,t.x,t.sy-38)}
      <rect class="hit" data-sel="it:${k}" x="${t.left?t.x-40:t.x-22}" y="${t.sy-22}" width="${t.left?80:102}" height="${t.left?56:44}"/></g>`;
      SELBOX['it:'+k]=[t.x-17,t.sy-17,34,34];return;}
    s+=`<g id="itg_${k}"><path id="itl_${k}" class="tie-l it" d="M${x1} ${PY} H${x2}"/>
      <rect id="itsw_${k}" class="brk sw open man" x="${t.x-9}" y="${PY-9}" width="18" height="18" rx="${CREW_ON?9:0}"/>
      <text id="itt_${k}" class="tie-t" x="${t.x}" y="${PY+26}" text-anchor="middle">open</text>${arw('ita_'+k,t.x,PY-15)}
      <rect class="hit" data-sel="it:${k}" x="${t.x-22}" y="${PY-22}" width="44" height="54"/></g>`;
    SELBOX['it:'+k]=[t.x-17,PY-17,34,34];});
  ASSETS.filter(a=>PIDS.includes(a.prim)&&(!ng||a.type==='load')).forEach(a=>{const x=a.x,y=pY(a.prim)+48,ay=pY(a.prim);let sym='';const col=a.col||'var(--muted)';
    if(a.type==='load'){const p=a.prim,by=ay+16;
      sym=LDX.map((dx,i)=>`<line id="lfl_${p}${i}" class="cond mv" x1="${x+dx}" y1="${by}" x2="${x+dx}" y2="${y+4}"/><rect id="lfb_${p}${i}" class="brk sw" x="${x+dx-6}" y="${by+8}" width="12" height="12"/><path id="lft_${p}${i}" class="sym" d="M${x+dx-7} ${y+4} L${x+dx+7} ${y+4} L${x+dx} ${y+17} Z"/>`).join('');
      s+=`<line id="alb_load_${p}" class="cond mv" x1="${x-24}" y1="${by}" x2="${x+24}" y2="${by}" style="stroke-width:3"/>`;
      if(VF_ON)VFI.forEach(i=>{const fx=x+LDX[i];sym+=`<path id="nopl_${p}${i}" class="vf-l" d="M${fx} ${y+17} V${y+24} M${fx} ${y+34} V${y+40}"/><rect id="nopb_${p}${i}" class="brk sw nop open" x="${fx-5}" y="${y+24}" width="10" height="10" rx="5"/>`;});}
    if(a.type==='dsr')sym=`<path class="sym-o" d="M${x-11} ${y} L${x+11} ${y} L${x} ${y+20} Z"/>`;
    if(a.type==='solar')sym=`<rect class="sym-o" x="${x-15}" y="${y}" width="30" height="24"/><path class="sym-l" d="M${x-15} ${y+24} L${x+15} ${y}"/><path class="sym-l" d="M${x+3} ${y+18} h8 M${x+3} ${y+21} h8"/>`;
    if(a.type==='wind')sym=`<circle class="sym-o" cx="${x}" cy="${y+14}" r="14"/><g id="blades" class="blades"><path class="sym-l" d="M${x} ${y+14} V${y+4} M${x} ${y+14} L${x+8.7} ${y+19} M${x} ${y+14} L${x-8.7} ${y+19}"/></g>`;
    if(a.type==='batt')sym=`<path class="sym-l" d="M${x-15} ${y} h30 M${x-8} ${y+6} h16 M${x-15} ${y+12} h30 M${x-8} ${y+18} h16" style="stroke-width:2.5"/>`;
    if(a.type==='chp')sym=`<circle class="sym-o" cx="${x}" cy="${y+14}" r="14"/><text x="${x}" y="${y+19}" text-anchor="middle" style="font:700 13px var(--f-display)">G~</text>`;
    s+=a.type==='load'?`<line id="al_${a.id}" class="cond mv" x1="${x}" y1="${ay}" x2="${x}" y2="${ay+16}"/>`:`<line id="al_${a.id}" class="cond mv" x1="${x}" y1="${ay}" x2="${x}" y2="${y}"/><line id="afl_${a.id}" class="flow" x1="${x}" y1="${ay+4}" x2="${x}" y2="${y}"/>`;
    s+=`
      <g class="asym" style="--sc:${a.type==='load'?'var(--ink)':col}">${sym}</g>
      <text class="a-name" x="${x}" y="${y+46+(a.type==='load'&&VF_ON?10:0)}" text-anchor="middle" style="fill:${a.type==='load'?'var(--muted)':col}">${a.name}</text>
      <text id="av_${a.id}" class="a-val" x="${x}" y="${y+62+(a.type==='load'&&VF_ON?10:0)}" text-anchor="middle">0 MW</text>
      <text id="as_${a.id}" class="a-sub" x="${x}" y="${y+77+(a.type==='load'&&VF_ON?10:0)}" text-anchor="middle"></text>
      <rect class="hit" data-sel="as:${a.id}" x="${x-30}" y="${a.type==='load'?y+24:y-8}" width="${a.type==='load'?60:48}" height="${a.type==='load'?60:92}"/>`;
    if(a.type==='load')LDX.forEach((dx,i)=>{s+=`<rect class="hit" data-sel="lf:${a.prim}${i}" x="${x+dx-11}" y="${ay+18}" width="22" height="${y-ay+4}"/>`;SELBOX['lf:'+a.prim+i]=[x+dx-10,ay+20,20,20];
      if(VF_ON&&VFI.includes(i)){s+=`<rect class="hit" data-sel="nop:${a.prim}${i}" x="${x+dx-11}" y="${y+19}" width="22" height="22"/>`;SELBOX['nop:'+a.prim+i]=[x+dx-9,y+20,18,18];}});
    if(a.type!=='load')s+=adjBtn(a.id,x+19,y-4,1)+adjBtn(a.id,x+19,y+18,-1);
    SELBOX['as:'+a.id]=[x-32,y-10,a.type==='load'?64:76,96];});
  LKIDS.forEach(k=>{const L=LINKS[k],A=ASSETS.find(a=>a.id==='load_'+L.a[0]),B=ASSETS.find(a=>a.id==='load_'+L.b[0]);if(!A||!B)return;
    const y=pY(L.a[0])+48,xa=A.x+LDX[L.a[1]],xb=B.x+LDX[L.b[1]],oa=xa+(L.a[1]===2?22:-22),ob=xb+(L.b[1]===0?-22:22),yl=y+100,mx=(oa+ob)/2;
    s+=`<g id="lkg_${k}"><path id="lkl_${k}" class="lk-l" d="M${xa} ${y+17} V${y+22} H${oa} V${yl} H${ob} V${y+22} H${xb} V${y+17}"/>
      <rect id="lksw_${k}" class="brk sw open man" x="${mx-8}" y="${yl-8}" width="16" height="16" rx="8"/><text id="lkt_${k}" class="tie-t" x="${mx}" y="${yl+20}" text-anchor="middle">open</text>
      <rect class="hit" data-sel="lk:${k}" x="${mx-24}" y="${yl-20}" width="48" height="46"/></g>`;SELBOX['lk:'+k]=[mx-15,yl-15,30,30];});
  if(VF_ON){s+=`<g id="vfg"><text class="nb-name vf" x="16" y="34">VOLT FACE 11 kV</text><text id="nbs_vf" class="nb-s" x="16" y="49">Spare 44 MW</text><text class="nb-r" x="16" y="62">Backfeeds 11 kV demand feeders</text><text class="nb-r" x="16" y="75">Different grid supply: open first</text>
      <path class="vf-l" d="M16 84 h26"/><rect class="brk sw nop open" x="46" y="79" width="10" height="10" rx="5"/><text class="nb-r" x="62" y="88">backfeed under each feeder</text>
      <rect class="hit" data-sel="nb:vf" x="8" y="18" width="210" height="76"/></g>`;SELBOX['nb:vf']=[8,18,210,76];}
  if(S.sc.gsp)s+=`<text id="gspT" class="gsp-t" x="812" y="44"></text>`;
  if(CREW_ON)SELBOX.depot=[1080,22,114,74];
  s+=`<rect id="coachRing" class="coach-ring" x="0" y="0" width="0" height="0" rx="10" visibility="hidden"/>`;
  if(CREW_ON){s+=`<g class="depot"><text class="nb-name crew-n" x="1188" y="34" text-anchor="end">CREW DEPOT</text><text class="nb-r" x="1188" y="48" text-anchor="end">3 field crews</text><path class="depot-i" d="M1094 76 l11 -10 l11 10 v11 h-22z"/></g><g id="crews">`+
    [1,2,3].map(n=>`<g id="crew${n}" class="crew"><g class="crew-b"><circle cx="0" cy="-15" r="3.6"/><path d="M0 -11 V-3 M0 -9 l-5 4 M0 -9 l5 4 M0 -3 l-4 7 M0 -3 l4 7"/></g><text class="crew-t" x="7" y="-12">${n}</text></g>`).join('')+'</g>';}
  s+=`<rect id="selbox" class="selbox" x="0" y="0" width="0" height="0" rx="6" visibility="hidden"/>`;
  if(GAME==='fc')s=s.replace(/<rect class="hit" data-sel="(?:bc|in|tie|it|bs|lf|nop|lk|nb):[^"]*"[^>]*\/>/g,'');
  {const lg=$('lgLK');if(lg)lg.hidden=!LKIDS.length;}
  const el=$('mimic');el.setAttribute('viewBox',PIDS.includes('kc')?'0 0 1200 640':'0 0 1200 610');el.innerHTML=s;
}
function txt(id,v){const e=$(id);if(e&&e.textContent!==v)e.textContent=v;}
function setAttr(e,k,v){if(e&&e.getAttribute(k)!==v)e.setAttribute(k,v);}
function setFlow(el,v){if(!el)return;if(Math.abs(v)<.5){el.classList.add('idle');return;}el.classList.remove('idle');el.classList.toggle('rev',v<0);
  const d=Math.max(.35,2.2-Math.abs(v)/60).toFixed(1)+'s';if(el.style.animationDuration!==d)el.style.animationDuration=d;}
const arrow=v=>v>=0?'▼':'▲';
function tieLimit(p){return Math.round(Math.min(PR[p].tie,S.spare[PR[p].nb]));}
const supLbl=k=>k==='bc'?'From BC':k==='par'?`PARALLEL ${PAR_MAX-S.parMin} MIN`:k==='kn'?'From Ampy Place':k==='fm'?'From Watts This':'OFF SUPPLY';
function edgeTxt(id,closed,lim){const L=S.edL[id]||0,ov=S.ov[id]||0,fl=Math.abs(S.flows[id]||0);
  return closed?(ov>0?`TRIP IN ${OV_MIN-ov} MIN`:`${Math.round(fl)}/${lim} MW`):`open · ${lim} MW`;}
const edgeCls=(id,closed)=>{const L=S.edL[id]||0;return 'tie-t'+(closed&&L>1?' alarm':closed&&L>.85?' warn':'');};

function renderMimic(){
  const opK=S.op?S.op.k:null,IS=S.islands,secAlive=sc=>{const I=IS.find(J=>J.secs.includes(sc));return !!(I&&I.alive);};
  S.tx.forEach((t,i)=>{
    const g=$('cct'+i);g.classList.toggle('out',!!t.out);g.classList.toggle('planned',!!t.out&&t.out.kind==='planned');g.classList.toggle('ready',!!t.out&&!!t.out.ready);
    g.dataset.lvl=t.out?'':t.L>1?'alarm':t.L>.9?'warn':'ok';
    const b=$('bolt'+i);if(t.out&&!t.out.ready&&(t.out.kind==='fault'||t.out.kind==='trip'))b.removeAttribute('hidden');else b.setAttribute('hidden','');
    const hc=t.out?'':t.L>1?' h3':t.L>.8?' h2':' h1',w=t.out?'':(3.5+2.5*Math.min(t.L,1.5)).toFixed(1);
    [['ca','hv'],['cb','mv']].forEach(([p,v])=>{const e=$(p+i);setAttr(e,'class','cond '+v+hc);if(e&&e.style.strokeWidth!==(w?w+'px':''))e.style.strokeWidth=w?w+'px':'';});
    txt('load'+i,t.out?(t.out.ready?'READY':t.out.kind==='planned'?'PLANNED':t.out.kind==='trip'?'TRIPPED':t.out.kind==='open'?'OPEN':'FAULTED'):Math.round(t.L*100)+'%');
    txt('flow'+i,t.out?(t.out.ready?'Close breaker':'Back '+fmtT(t.out.until)):`${Math.round(Math.abs(t.flow))} MW ${arrow(t.flow)}`);
    const f=clamp((t.temp-20)/(TRIP_T-20),0,1);const tf=$('tf'+i);setAttr(tf,'width',(62*f).toFixed(1));
    setAttr(tf,'class','tfill'+(t.temp>=TRIP_T-8?' alarm':t.temp>=TRIP_T-25?' warn':''));
    txt('tt'+i,`${Math.round(t.temp)}°C`);
    txt('em'+i,t.out||t.L<=1?'':t.L>EMERG?`TRIP IN ${SHORT_MIN-t.sh} MIN`:`EMERG ${EMERG_MIN-t.em} MIN`);setAttr($('em'+i),'class','tx-em'+(t.L>EMERG?' alarm':''));
    setAttr($('lb'+i),'class','brk sw'+(t.out?' open':'')+(opK==='tx:'+i?' operating':''));setAttr($('hb'+i),'class','brk'+(t.out?' open':''));
    setFlow($('fa'+i),t.out?0:t.flow);setFlow($('fb'+i),t.out?0:t.flow);setArw('txa'+i,t.out?0:t.flow,'v');
  });
  ['B1','B2','B3'].forEach(sc=>setAttr($('bus_'+sc),'class','bus mv'+(secAlive(sc)?'':' dead')));
  BSIDS.forEach(k=>{setAttr($('bsb_'+k),'class','brk sw'+(S.bs[k].closed?'':' open')+(opK==='bs:'+k?' operating':''));setArw('bsa_'+k,S.bs[k].closed?S.bsf[k]:0,'h');});
  PIDS.forEach(p=>{const f=S.fd[p],sup=S.sup[p],fid='bc:'+p,en=fdOn(p)&&secAlive(FSEC[p]),fl=S.flows[fid]||0;
    if(PR[p].fd){setAttr($('fdl_'+p),'class','cond mv'+(en?'':' dead'));setFlow($('fdf_'+p),en?fl:0);setArw('fda_'+p,en?fl:0,'v');
    setAttr($('fbk_'+p),'class','brk sw'+(f.brk?'':' open')+(f.fault&&!f.fault.ready&&!f.fault.planned?' trip':'')+(opK===fid?' operating':''));
    setAttr($('fin_'+p),'class','brk sw'+(f.inc?'':' open')+(f.fault&&!f.fault.ready&&!f.fault.planned?' trip':'')+(opK==='in:'+p?' operating':''));
    const fb=$('fdb_'+p);if(f.fault&&!f.fault.ready&&!f.fault.planned)fb.removeAttribute('hidden');else fb.setAttribute('hidden','');
    txt('fdt_'+p,f.fault?(f.fault.ready?(f.fault.planned?'WORK DONE':'REPAIRED'):f.fault.planned?'WORK':'FAULT'):(S.ov[fid]>0?`TRIP IN ${OV_MIN-S.ov[fid]} MIN`:''));setAttr($('fdt_'+p),'class','fd-t'+(f.fault&&(f.fault.ready||f.fault.planned)?f.fault.ready?' ok':' warn':''));
    txt('fdv_'+p,en?`${Math.round(Math.abs(fl))}/${PR[p].fr} MW ${arrow(fl)}`:'');setAttr($('fdv_'+p),'class','fd-v'+((S.edL[fid]||0)>1?' alarm':(S.edL[fid]||0)>.85?' warn':''));}
    setAttr($('pb_'+p),'class','bus mv'+(sup==='off'?' dead':''));
    const ds=sup==='par'&&!S.tie[p].closed?(fdOn(p)?'bc':'kn'):sup;txt('ps_'+p,supLbl(ds));txt('pn_'+p,sup==='off'?'':`net ${Math.round(Math.abs(S.pn[p]))} MW ${S.pn[p]>=0?'▼':'▲'}`);setAttr($('ps_'+p),'class','p-stat'+(ds==='off'?' off':ds==='par'?' par':ds==='kn'||ds==='fm'?' nb '+ds:''));
    const tid='tie:'+p,tc=S.tie[p].closed;if(!PR[p].nb)return;
    setAttr($('tl_'+p),'class','tie-l '+PR[p].nb+(tc?' on':''));
    setAttr($('tsw_'+p),'class','brk sw'+(tc?'':' open')+(opK===tid?' operating':''));
    setArw('tia_'+p,tc?(S.flows[tid]||0)*TIEARW[p][2]:0,'h');txt('tt_'+p,edgeTxt(tid,tc,tieLimit(p)));setAttr($('tt_'+p),'class',edgeCls(tid,tc));
  });
  ITIDS.forEach(k=>{const id='it:'+k,c=S.it[k].closed,ft=S.it[k].fault;setArw('ita_'+k,c&&!ft?(S.flows[id]||0):0,ITS[k].v?'v':'h');
    setAttr($('itl_'+k),'class','tie-l it'+(c?' on':''));setAttr($('itsw_'+k),'class','brk sw'+(c?'':' open')+(opK===id?' operating':''));
    txt('itt_'+k,ft?(ft.ready?'REPAIRED':'FAULT'):edgeTxt(id,c,ITS[k].r));setAttr($('itt_'+k),'class',ft&&!ft.ready?'tie-t alarm':edgeCls(id,c));});
  ['kn','fm'].forEach(nb=>{const sp=Math.max(0,S.spare[nb]),u=Math.abs(S.inj[nb]||0),L=u/Math.max(1,sp);txt('nbs_'+nb,u>=.5?`Using ${Math.round(u)} of ${Math.round(sp)} MW`:`Spare ${Math.round(sp)} MW`);setAttr($('nbs_'+nb),'class','nb-s'+(u<.5?'':L>1?' alarm':L>=AL_ON?' warn':''));});
  const c=S.c,a=S.act,on=p=>S.sup[p]!=='off';
  PIDS.forEach(p=>{const d=dem(c,p)-(p==='hw'?a.dsr:0),n=S.lf[p].filter((v,i)=>feedOf(p,i)!==null).length,nv=S.lf[p].filter((v,i)=>feedOf(p,i)==='vf').length,nl=S.lf[p].filter((v,i)=>{const f=feedOf(p,i);return f&&f!==p&&f!=='vf';}).length;txt('av_load_'+p,on(p)?mw(d):'Off supply');txt('as_load_'+p,(n<3?`${3-n} feeder${n===2?'':'s'} off`:'')+(nv?`${n<3?' · ':''}${nv} on Volt Face`:'')+(nl?`${n<3||nv?' · ':''}${nl} linked`:''));setAttr($('as_load_'+p),'class','a-sub'+(n<3?'':' muted'));
    setAttr($('al_load_'+p),'class','cond mv'+(on(p)?'':' dead'));setAttr($('alb_load_'+p),'class','cond mv'+(on(p)?'':' dead'));
    S.lf[p].forEach((v,i)=>{const k='lf:'+p+i,live=v&&on(p),vfd=!v&&S.nop[p][i];setAttr($('lfb_'+p+i),'class','brk sw'+(v?'':' open')+(opK===k?' operating':''));setAttr($('lfl_'+p+i),'class','cond mv'+(live?'':' dead'));setAttr($('lft_'+p+i),'class','sym'+(live?'':vfd?' vf':' off'));
      {const fo=feedOf(p,i);if(fo&&fo!==p&&fo!=='vf')setAttr($('lft_'+p+i),'class','sym lk');}
      if(VF_ON&&VFI.includes(i)){const nk='nop:'+p+i,nc=S.nop[p][i];setAttr($('nopb_'+p+i),'class','brk sw nop'+(nc?'':' open')+(opK===nk?' operating':''));setAttr($('nopl_'+p+i),'class','vf-l'+(nc?' on':''));}});});
  LKIDS.forEach(k=>{const id='lk:'+k,c2=!!S.lk[k],f=(S.lkLoad||{})[k]||0,par=(S.flows||{})[id];setAttr($('lksw_'+k),'class','brk sw man'+(c2?'':' open')+(opK===id||crewFor(id)?' operating':''));setAttr($('lkl_'+k),'class','lk-l'+(c2?' on':''));
    txt('lkt_'+k,!c2?`open · ${LINKS[k].r} MW`:par!=null?`parallel ${Math.round(Math.abs(par))}/${LINKS[k].r} MW`:f>.5?`${Math.round(f)}/${LINKS[k].r} MW`:'closed · no load');setAttr($('lkt_'+k),'class','tie-t'+(f>LINKS[k].r?' alarm':f>LINKS[k].r*AL_ON?' warn':''));});
  if(VF_ON){const sp=Math.max(0,S.spare.vf||0),u=S.vfLoad||0,L=u/Math.max(1,sp);txt('nbs_vf',u>=.5?`Using ${Math.round(u)} of ${Math.round(sp)} MW`:`Spare ${Math.round(sp)} MW`);setAttr($('nbs_vf'),'class','nb-s'+(u<.5?'':L>1?' alarm':L>=AL_ON?' warn':''));}
  if(!NOGEN()){
    const cut=!!(S.cutout&&S.cutout.fired&&!S.cutout.done);
    const gen=(id,raw,p)=>{const out=on(p)?raw-a[id]:0;txt('av_'+id,on(p)?mw(out):'Off');setFlow($('afl_'+id),-out);setAttr($('al_'+id),'class','cond mv'+(on(p)?'':' dead'));
      txt('as_'+id,!on(p)?'':a[id]>.5?`−${Math.round(a[id])} curtailed`:S.fail[id]>S.t?'not responding':id==='wind'&&cut?'high-wind stop':S.armed[id]>0?`auto −${S.armed[id]}`:out>.5?'full output':'');
      setAttr($('as_'+id),'class','a-sub'+(a[id]>.5||S.fail[id]>S.t||(id==='wind'&&cut)?'':' muted'));return out;};
    const wnd=gen('wind',c.wind,'rv');gen('solar',c.solar,'ml');
    const bl=$('blades');if(bl)bl.classList.toggle('still',wnd<1);
    const bat=on('hw')?a.bdis-a.bchg:0;
    txt('av_batt',!on('hw')?'Off':Math.abs(bat)<.5?'Idle':mw(Math.abs(bat)));setFlow($('afl_batt'),-bat);setAttr($('al_batt'),'class','cond mv'+(on('hw')?'':' dead'));
    txt('as_batt',(Math.abs(bat)<.5||!on('hw')?'':bat>0?'discharging · ':'charging · ')+`${Math.round(S.soc/SOC_MAX*100)}%`+(S.armed.bdis||S.armed.bchg?' · armed':''));setAttr($('as_batt'),'class','a-sub'+(bat<-.5?'':' muted'));
    ['chp','dsr'].forEach(id=>{const p=SV[id].prim,v=on(p)?a[id]:0;txt('av_'+id,!on(p)?'Off':v>.5?(id==='dsr'?'−':'+')+mw(v):'Standby');
      setFlow($('afl_'+id),id==='chp'?-v:0);setAttr($('al_'+id),'class','cond mv'+(on(p)?'':' dead'));
      txt('as_'+id,S.fail[id]>S.t?'not responding':S.armed[id]>0?`armed ${S.armed[id]}`:'');setAttr($('as_'+id),'class','a-sub'+(S.fail[id]>S.t?'':' muted'));});
    ASSETS.filter(x=>x.type!=='load').forEach(x=>{const off=!on(x.prim)||S.ended;['u','d'].forEach(k=>{const e=$(`adj_${x.id}_${k}`);if(e)e.classList.toggle('dis',off);});});
  }
  if(CREW_ON){const tNow=S.t+(S.running&&!S.paused&&!S.ended?acc:0);S.crews.forEach((c,i)=>{const g=$('crew'+c.n);if(!g)return;const p=crewPos(c,tNow),same=S.crews.filter((d,j)=>j<i&&!d.to&&!c.to&&Math.abs(d.x-c.x)<1&&Math.abs(d.y-c.y)<1).length,
    off=c.to?(i-1)*7:(c.at==='depot'?(i-1)*16:14+same*12);setAttr(g,'transform',`translate(${(p.x+off).toFixed(1)} ${(p.y+(c.at==='depot'&&!c.to?16:-4)+(c.to?(i-1)*5:0)).toFixed(1)}) scale(1.25)`);g.classList.toggle('walk',!!c.to&&S.running&&!S.paused);g.classList.toggle('busy',!!c.job);});}
  if(S.sc.gsp){const G=S.sc.gsp,on=S.t>=G.start&&S.t<G.end;txt('gspT',on?`LIMIT ${G.limit} MW · NOW ${Math.round(S.gspLoad)} MW`:S.t>=G.warn&&S.t<G.start?'SUPERGRID FAULT EXPECTED':'');setAttr($('gspT'),'class','gsp-t'+(on&&S.gspLoad>G.limit?' alarm':on?' ok':''));}
  const sb=$('selbox'),bx=S.sel&&SELBOX[S.sel];
  if(bx){setAttr(sb,'x',String(bx[0]));setAttr(sb,'y',String(bx[1]));setAttr(sb,'width',String(bx[2]));setAttr(sb,'height',String(bx[3]));setAttr(sb,'visibility','visible');}else setAttr(sb,'visibility','hidden');
}

/* ---------- Control panel ---------- */
let lastInsp='';
const ico=(k,c)=>`<span class="ico" style="--tc:${c||'var(--accent)'}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg></span>`;
const facts=rows=>`<dl class="facts">${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const back=`<div class="i-back"><button type="button" class="linkish" data-sel="none" data-k="back">← All controls</button></div>`;
function opBtn(k,act,label){if(GAME==='fc')return '';
  if(isManual(k)){const j=crewFor(k),here=crewAt(k),dis=S.ended;
    return `<button type="button" class="btn primary op-btn" data-op="${k}:${act}" data-k="op-${k}"${dis||j?' disabled':''}>${j?`Crew ${j.n}: ${j.job.act?'done':'there'} ${fmtT(j.job.at)}`:esc(label)+(here?'':' (send crew)')}</button>`;}const pend=S.op&&S.op.k===k,dis=S.ended||(S.op&&!pend);
  return `<button type="button" class="btn primary op-btn" data-op="${k}:${act}" data-k="op-${k}"${dis||pend?' disabled':''}>${pend?'Operating… ready '+fmtT(S.op.at):esc(label)}</button>`;}
function stepper(f,id,val,label,k,signed){return `<div class="ctl"><span class="lbl">${label}</span><div class="stepper"><button type="button" data-f="${f}" data-id="${id}" data-d="-5" data-k="${k}-" aria-label="5 MW less">−</button><output>${signed?sgn(val):val}<small>MW</small></output><button type="button" data-f="${f}" data-id="${id}" data-d="5" data-k="${k}+" aria-label="5 MW more">+</button></div></div>`;}
function supTxt(p){const s=S.sup[p];return s==='bc'?'From Blackout Canyon':s==='par'?`Paralleled with Ampy Place · ${PAR_MAX-S.parMin} min left`:s==='kn'?'From Ampy Place':s==='fm'?'From Watts This':'Off supply';}
function svcSetting(id){
  if(id==='solar'||id==='wind')return {v:S.act[id]>.5?`−${Math.round(S.act[id])}`:'0',st:`curtail ${S.manual[id]} · auto ${S.armed[id]}`};
  if(id==='batt'){const b=S.act.bdis-S.act.bchg;return {v:sgn(b),st:`now ${sgn(S.manual.bdis-S.manual.bchg)} · armed ↑${S.armed.bdis} ↓${S.armed.bchg}`};}
  return {v:S.act[id]>.5?(id==='dsr'?'−':'+')+Math.round(S.act[id]):'0',st:`now ${S.manual[id]} · armed ${S.armed[id]}`};}
function edgeRow(id){const[t,k]=id.split(':'),L=S.edL[id]||0,ov=S.ov[id]||0,fl=Math.abs(S.flows[id]||0),r=t==='bc'?PR[k].fr:t==='tie'?tieLimit(k):ITS[k].r;
  return `<li><button type="button" data-sel="${id==='bc:'+k?'bc:'+k:id}" data-k="e-${id}"><span class="nm">${esc(ucfirst(devName(id)))}</span><span class="st${ov>0?' off':L>.85?' warn':''}">${ov>0?'Overloaded · trips in '+(OV_MIN-ov)+' min':'Closed · '+Math.round(L*100)+'% of limit'}</span><span class="v">${Math.round(fl)}/${r}</span></button></li>`;}
function summaryHtml(){
  const subs=PIDS.map(p=>{const s=S.sup[p];return `<li><button type="button" data-sel="prim:${p}" data-k="s-${p}"><span class="nm">${PR[p].name}</span><span class="st${s==='off'?' off':s==='par'?' warn':''}">${esc(supTxt(p))}</span><span class="v">${sgn(S.pn[p])}</span></button></li>`;}).join('');
  const closedTies=[...PIDS.filter(p=>PR[p].nb&&S.tie[p].closed).map(p=>'tie:'+p),...ITIDS.filter(k=>S.it[k].closed).map(k=>'it:'+k)].map(edgeRow).join('')+LKIDS.filter(k=>S.lk[k]).map(k=>`<li><button type="button" data-sel="lk:${k}" data-k="s-lk${k}"><span class="nm">${esc(ucfirst(devName('lk:'+k)))}</span><span class="st">11 kV link closed</span><span class="v">${Math.round((S.lkLoad||{})[k]||0)}/${LINKS[k].r}</span></button></li>`).join('');
  const hotFeeders=PIDS.filter(p=>PR[p].fd&&(S.edL['bc:'+p]||0)>.85).map(p=>edgeRow('bc:'+p)).join('');
  const ids=['solar','wind','batt','chp','dsr'];
  const gens=NOGEN()?'':ids.map(id=>{const st=svcSetting(id),f=id==='batt'?S.fail.bdis>S.t||S.fail.bchg>S.t:S.fail[id]>S.t;
    return `<li><button type="button" data-sel="as:${id}" data-k="g-${id}"><span class="nm">${esc(id==='batt'?'Kings Hill Battery':SV[id].name)}</span><span class="st${f?' off':''}">${f?'Not responding':esc(st.st)}</span><span class="v">${st.v}</span></button></li>`;}).join('');
  const outs=[...S.tx.map((t,i)=>t.out?`<li><button type="button" data-sel="tx:${i}" data-k="o-tx${i}"><span class="nm">T${i+1}</span><span class="st${t.out.ready?' warn':' off'}">${t.out.ready?'Ready: close its breaker':esc(t.out.label)+' · '+fmtT(t.out.until)}</span><span class="v"></span></button></li>`:''),
    ...PIDS.flatMap(p=>S.lf[p].map((v,i)=>v?'':S.nop[p][i]?`<li><button type="button" data-sel="nop:${p}${i}" data-k="o-vf${p}${i}"><span class="nm">${esc(LFN[p][i])} (${PR[p].name})</span><span class="st">On Volt Face backfeed</span><span class="v">${mw(lfMW(p,i))}</span></button></li>`:`<li><button type="button" data-sel="lf:${p}${i}" data-k="o-lf${p}${i}"><span class="nm">${esc(LFN[p][i])} (${PR[p].name})</span><span class="st off">11 kV feeder open · customers off</span><span class="v"></span></button></li>`)),
    ...BSIDS.map(k=>S.bs[k].closed?'':`<li><button type="button" data-sel="bs:${k}" data-k="o-bs${k}"><span class="nm">${esc(ucfirst(devName('bs:'+k)))}</span><span class="st warn">Open: busbar running split</span><span class="v"></span></button></li>`),
    ...ITIDS.map(k=>{const f=S.it[k].fault;return f?`<li><button type="button" data-sel="it:${k}" data-k="o-it${k}"><span class="nm">${esc(ucfirst(devName('it:'+k)))}</span><span class="st${f.ready?' warn':' off'}">${f.ready?'Repaired: can close':'Faulted · repair '+fmtT(f.until)}</span><span class="v"></span></button></li>`:'';}),
    ...PIDS.map(p=>{const f=S.fd[p];if(PR[p].fd&&!f.fault&&!(f.brk&&f.inc))return `<li><button type="button" data-sel="bc:${p}" data-k="o-fd${p}"><span class="nm">${PR[p].name} feeder</span><span class="st warn">${!f.brk&&!f.inc?'Both ends open':!f.brk?'BC breaker open':'Incomer open'}</span><span class="v"></span></button></li>`;return f.fault?`<li><button type="button" data-sel="bc:${p}" data-k="o-fd${p}"><span class="nm">${PR[p].name} feeder</span><span class="st${f.fault.ready?' warn':' off'}">${f.fault.ready?'Ready: close both ends':(f.fault.planned?'Planned work · until ':'Faulted · repair ')+fmtT(f.fault.until)}</span><span class="v"></span></button></li>`:'';})].join('');
  return `<div class="i-h">${ico('sub')}<div><h3>Control desk</h3><div class="kind">Select anything on the diagram to operate it.${NOGEN()?' This shift has no generation or flexibility: manage loading by switching.':' ▲ ▼ beside a generator turn it up or down now.'}</div></div></div>
    ${S.op?`<p class="i-state warn">Operating: ${esc(opLabel(S.op.k,S.op.act))} · ready ${fmtT(S.op.at)}</p>`:''}
    <h4 class="i-sub">Substations · net MW (+ import)</h4><ul class="i-list">${subs}</ul>
    ${outs?`<h4 class="i-sub">Out of service</h4><ul class="i-list">${outs}</ul>`:''}
    ${closedTies||hotFeeders?`<h4 class="i-sub">Closed ties and busy feeders · MW / limit</h4><ul class="i-list">${closedTies}${hotFeeders}</ul>`:''}
    ${CREW_ON?`<h4 class="i-sub">Field crews</h4><ul class="i-list">${S.crews.map(c=>`<li><button type="button" ${c.job||c.at&&c.at!=='depot'?`data-sel="${(c.job&&c.job.k)||c.at}"`:'disabled'} data-k="crew${c.n}"><span class="nm">Crew ${c.n}</span><span class="st${c.job?' warn':''}">${c.job?(c.to?`Walking to ${esc(devName(c.job.k))} · ${fmtT(c.arr)}`:`At ${esc(devName(c.job.k))}`)+(c.job.act?` · ${c.job.act} ${fmtT(c.job.at)}`:''):c.at==='depot'?'At the depot':`Standing by at ${esc(devName(c.at))}`}</span><span class="v"></span></button></li>`).join('')}</ul>`:''}
    ${gens?`<h4 class="i-sub">Generation and flexibility · MW</h4><ul class="i-list">${gens}</ul>`:''}`;}
function txHtml(i){const t=S.tx[i];let st='',cls='ok';
  if(t.out){st=t.out.ready?`Out of service (${t.out.kind==='open'?'opened by control':t.out.kind==='planned'?'maintenance finished':t.out.kind==='trip'?'inspected':'repaired'}). Ready to close.`:`${t.out.label}. ${t.out.kind==='planned'?'Maintenance until':t.out.kind==='trip'?'Inspection until':'Repair until'} ${fmtT(t.out.until)}.`;cls=t.out.ready?'warn':'alarm';}
  else if(t.L>EMERG){st=`Above emergency rating: trips in ${SHORT_MIN-t.sh} min.`;cls='alarm';}
  else if(t.L>1){st=`On emergency rating: ${EMERG_MIN-t.em} min left.`;cls='alarm';}
  else st='In service.';
  return `${back}<div class="i-h">${ico('tx','var(--hv)')}<div><h3>Transformer T${i+1}</h3><div class="kind">132/33 kV · 60 MVA · Blackout Canyon</div></div></div>
    ${facts([['Loading',t.out?'–':Math.round(t.L*100)+'%'],['Flow',t.out?'–':`${mw(Math.abs(t.flow))} ${t.flow>=0?'import':'export'}`],['Hot-spot',Math.round(t.temp)+'°C'],['Breaker',t.out?'Open':'Closed']])}
    <p class="i-state ${cls}">${esc(st)}</p>
    <div class="op-row">${t.out?opBtn('tx:'+i,'close',`Close T${i+1} breaker`):opBtn('tx:'+i,'open',`Open T${i+1} breaker`)}</div>
    <p class="i-note">Emergency rating: up to 120% for ${EMERG_MIN} minutes, 120–150% for ${SHORT_MIN} minutes. Closing equipment before it's ready trips it again.</p>`;}
function bcHtml(p){const f=S.fd[p],nm=PR[p].name,id='bc:'+p,fl=S.flows[id]||0,I=S.islands.find(J=>J.secs.includes(FSEC[p])),al=!!(I&&I.alive),en=fdOn(p)&&al;let st,cls;
  if(f.fault&&!f.fault.ready){st=`Feeder ${f.fault.planned?'out for planned work':'faulted: '+f.fault.label.toLowerCase()}. ${f.fault.planned?'Work':'Repair'} until ${fmtT(f.fault.until)}. Keep both ends open until then.`;cls='alarm';}
  else if(f.fault){st='Feeder ready. Close both ends to put it back.';cls='warn';}
  else if(S.ov[id]>0){st=`Overloaded: trips in ${OV_MIN-S.ov[id]} min.`;cls='alarm';}
  else if(f.brk&&f.inc){st=al?'Feeder healthy and energised.':'Feeder healthy, but its busbar section is dead.';cls=al?'ok':'warn';}
  else{st=`Feeder healthy but out of service: ${!f.brk&&!f.inc?'both ends are':!f.brk?'the Blackout Canyon breaker is':'the '+nm+' incomer is'} open.`;cls='warn';}
  return `${back}<div class="i-h">${ico('brk','var(--mv)')}<div><h3>${nm} 33 kV feeder</h3><div class="kind">Breaker at Blackout Canyon, incomer at ${nm}</div></div></div>
    ${facts([['BC breaker',f.brk?'Closed':'Open'],[nm+' incomer',f.inc?'Closed':'Open'],['Feeder',f.fault?(f.fault.ready?'Ready':f.fault.planned?'Planned work':'Faulted'):'Healthy'],['Flow',en?`${mw(Math.abs(fl))} ${fl>=0?'to':'from'} ${nm}`:'–'],['Rating',mw(PR[p].fr)]])}
    <p class="i-state ${cls}">${esc(st)}</p>
    <div class="op-row">${f.brk?opBtn(id,'open','Open BC breaker'):opBtn(id,'close','Close BC breaker')}${f.inc?opBtn('in:'+p,'open',`Open ${nm} incomer`):opBtn('in:'+p,'close',`Close ${nm} incomer`)}</div>
    <p class="i-note">The feeder only carries power with both ends closed. With the incomer open, ${nm} can be fed from a tie or interconnector without back-feeding the feeder.</p>
    <div class="op-row">${PR[p].nb?`<button type="button" class="btn" data-sel="tie:${p}" data-k="go-tie">${esc(NBS[PR[p].nb].name)} tie</button>`:''}<button type="button" class="btn" data-sel="prim:${p}" data-k="go-prim">${esc(nm)} substation</button></div>`;}
const RULE_KN=`<p class="i-rule kn"><b>Ampy Place is on the same grid supply as Blackout Canyon.</b> You can transfer without an interruption: close the new route first, then open the old one within ${PAR_MAX} minutes.</p>`;
const RULE_FM=`<p class="i-rule fm"><b>Watts This is on a different grid supply. Never parallel it with Blackout Canyon or Ampy Place.</b> Open the old route first, then close the new one. Customers lose supply for the minutes in between.</p>`;
function tieHtml(p){const id='tie:'+p,c=S.tie[p].closed,nb=PR[p].nb,nm=PR[p].name,lim=tieLimit(p),ov=S.ov[id]||0,fl=-(S.flows[id]||0);let st,cls='ok';
  if(!c){st='Normally open point. Open.';cls='';}
  else if(ov>0){st=`Overloaded: trips in ${OV_MIN-ov} min. Get the flow below ${lim} MW.`;cls='alarm';}
  else if(S.sup[p]==='par'){st=`Paralleled: open one route within ${PAR_MAX-S.parMin} min.`;cls='warn';}
  else st=`Closed.`;
  return `${back}<div class="i-h">${ico('tie','var(--c-'+nb+')')}<div><h3>${nm} – ${NBS[nb].name} tie</h3><div class="kind">33 kV normally open point</div></div></div>
    ${facts([['Switch',c?'Closed':'Open'],['Flow',c?`${mw(Math.abs(fl))} ${fl>=0?'into '+nm:'into '+NBS[nb].name}`:'–'],['Tie rating',mw(PR[p].tie)],[NBS[nb].name+' spare',`${mw(Math.abs(S.inj[nb]||0))} used of ${mw(S.spare[nb])}`]])}
    <p class="i-state ${cls}">${esc(st)}</p>
    <div class="op-row">${c?opBtn(id,'open',`Open ${NBS[nb].name} tie`):opBtn(id,'close',`Close ${NBS[nb].name} tie`)}</div>
    ${nb==='kn'?RULE_KN:RULE_FM}
    <p class="i-note">${nm} needs about ${mw(Math.abs(S.pn[p]))} right now (${S.pn[p]>=0?'import':'export'}). A tie that stays above its limit for ${OV_MIN} minutes trips.</p>
    <div class="op-row"><button type="button" class="btn" data-sel="bc:${p}" data-k="go-bc">${esc(nm)} breaker</button><button type="button" class="btn" data-sel="nb:${nb}" data-k="go-nb">${esc(NBS[nb].name)}</button></div>`;}
function bsHtml(k){const id='bs:'+k,c=S.bs[k].closed,fl=S.bsf[k]||0,[a,b]=k==='12'?['T1','T2']:['T2','T3'];
  return `${back}<div class="i-h">${ico('brk','var(--mv)')}<div><h3>${a}–${b} bus section breaker</h3><div class="kind">33 kV bus section at Blackout Canyon · normally closed</div></div></div>
    ${facts([['Breaker',c?'Closed':'Open'],['Flow',c&&Math.abs(fl)>.5?`${mw(Math.abs(fl))} towards the ${fl>0?b:a} section`:'–']])}
    <p class="i-state ${c?'ok':'warn'}">${c?'Closed. The transformers either side share the load.':'Open. Blackout Canyon is running split.'}</p>
    <div class="op-row">${c?opBtn(id,'open','Open bus section'):opBtn(id,'close','Close bus section')}</div>
    <p class="i-rule">With a bus section open, each part of the busbar is supplied only by its own transformers. The T1 section feeds Hartwell and Marsh Lane, the T2 section has no feeders, and the T3 section feeds Ohm No and Joule Street. Losing the only transformer on a section takes its substations off supply.</p>`;}
function itHtml(k){const t=ITS[k],id='it:'+k,c=S.it[k].closed,A=PR[t.a].name,B=PR[t.b].name,ov=S.ov[id]||0,fl=S.flows[id]||0;let st,cls='ok';
  const ft=S.it[k].fault;if(ft&&!ft.ready){st=`Faulted: ${ft.label.toLowerCase()}. Repair until ${fmtT(ft.until)}.`;cls='alarm';}else if(ft){st='Repaired. It can be closed again.';cls='warn';}
  else if(!c){st=t.nc?'Open (normally closed).':'Normally open point. Open.';cls='';}else if(ov>0){st=`Overloaded: trips in ${OV_MIN-ov} min.`;cls='alarm';}else st='Closed.';
  return `${back}<div class="i-h">${ico('tie','var(--mv)')}<div><h3>${A} – ${B} interconnector</h3><div class="kind">33 kV ${t.nc?'normally closed circuit':'normally open point'} between substations · ${t.r} MW</div></div></div>
    ${facts([['Switch',c?'Closed':'Open'],['Flow',c?`${mw(Math.abs(fl))} towards ${fl>=0?B:A}`:'–'],[A,esc(supTxt(t.a))],[B,esc(supTxt(t.b))]])}
    <p class="i-state ${cls}">${esc(st)}</p>
    <div class="op-row">${c?opBtn(id,'open','Open interconnector'):opBtn(id,'close','Close interconnector')}</div>
    <p class="i-rule">Closing it joins ${A} and ${B}. If both are fed from Blackout Canyon, that's fine and they share the load. If one is fed from a neighbour, the neighbour's rules apply.</p>
    <p class="i-note">Use it to feed a substation whose own feeder is out, or to share load between feeders. Its rating is ${t.r} MW.</p>`;}
function lkHtml(k){const L=LINKS[k],a=L.a,b=L.b,id='lk:'+k,c=!!S.lk[k],f=(S.lkLoad||{})[k]||0,fa=S.lf[a[0]][a[1]],fb=S.lf[b[0]][b[1]];
  return `${back}<div class="i-h">${ico('tie','var(--c-lk)')}<div><h3>${esc(ucfirst(devName(id)))}</h3><div class="kind">11 kV normally open point between ${esc(LFN[a[0]][a[1]])} and ${esc(LFN[b[0]][b[1]])} · manual</div></div></div>
    ${facts([['Link',c?'Closed':'Open'],['Carrying',c?mw(f):'–'],['Rating',mw(L.r)],[`${LFN[a[0]][a[1]]} breaker`,fa?'Closed':'Open'],[`${LFN[b[0]][b[1]]} breaker`,fb?'Closed':'Open']])}
    <div class="op-row">${c?opBtn(id,'open','Open the 11 kV link'):opBtn(id,'close','Close the 11 kV link')}</div>
    <p class="i-rule">To move a feeder onto the other substation, open its breaker first, then close the link. If both substations are on the same grid supply (Blackout Canyon or Ampy Place) you can close the link first and then open the breaker, with no interruption. Never link to a substation fed from Watts This.</p>`;}
function vfHtml(){const on=[];PIDS.forEach(p=>VFI.forEach(i=>{if(S.nop[p][i]&&!S.lf[p][i])on.push(`<li><button type="button" data-sel="nop:${p}${i}" data-k="vf-${p}${i}"><span class="nm">${esc(LFN[p][i])} (${PR[p].name})</span><span class="st">Fed from Volt Face</span><span class="v">${mw(lfMW(p,i))}</span></button></li>`);}));
  return `${back}<div class="i-h">${ico('nb','var(--c-vf)')}<div><h3>Volt Face 11 kV</h3><div class="kind">Neighbouring 11 kV network on a different grid supply</div></div></div>
    ${facts([['Spare capacity',mw(S.spare.vf)],['Using now',mw(S.vfLoad)],['Backfeeds',`${PIDS.length*VFI.length} normally open points`],['Grid supply','Different GSP']])}
    <p class="i-rule fm"><b>Volt Face is on a different grid supply. Never parallel it with Blackout Canyon.</b> To move an 11 kV feeder onto Volt Face, open the feeder's breaker at the substation first, then close its Volt Face backfeed. Its customers are off for the minute in between. To move it back, open the backfeed, then close the breaker.</p>
    <p class="i-note">The second and third 11 kV feeder at every substation have a backfeed (the small switch under the feeder). Customers fed from Volt Face stay on even if their substation loses supply. If Volt Face is over its spare capacity for ${OV_MIN} minutes, all its backfeeds trip.</p>
    ${on.length?`<h4 class="i-sub">Fed from Volt Face now</h4><ul class="i-list">${on.join('')}</ul>`:''}`;}
function nbHtml(k){const nb=NBS[k],ties=PIDS.filter(p=>PR[p].nb===k);
  return `${back}<div class="i-h">${ico('nb','var(--c-'+k+')')}<div><h3>${nb.name}</h3><div class="kind">Neighbouring 33 kV network</div></div></div>
    ${facts([['Spare capacity',mw(S.spare[k])],['Grid supply',nb.same?'Steve Towers (same)':'Different GSP'],['Ties',ties.map(p=>PR[p].name).join(', ')],['Taking now',mw(Math.abs(S.inj[k]||0))]])}
    ${nb.same?RULE_KN:RULE_FM}<p class="i-note">Spare capacity changes through the day as ${nb.name}'s own demand${S.sc.nbShape==='solar'?' and solar':''} change. It's shared by both ties.</p>
    <div class="op-row">${ties.map(p=>`<button type="button" class="btn" data-sel="tie:${p}" data-k="go-t${p}">${esc(PR[p].name)} tie</button>`).join('')}</div>`;}
function primHtml(p){const P=PR[p],c=S.c,on=S.sup[p]!=='off';
  const assets=ASSETS.filter(a=>a.prim===p&&a.type!=='load'&&!NOGEN());
  const its=ITIDS.filter(k=>ITS[k].a===p||ITS[k].b===p);
  return `${back}<div class="i-h">${ico('sub','var(--mv)')}<div><h3>${P.name} substation</h3><div class="kind">33/11 kV · ${Math.round(S.share[p]*100)}% of the area's demand</div></div></div>
    ${facts([['Supply',esc(supTxt(p))],['Net',`${mw(Math.abs(S.pn[p]))} ${S.pn[p]>=0?'import':'export'}`],['Demand',on?mw(dem(c,p)):'Off supply'],P.fd?['Feeder rating',mw(P.fr)]:['Normally fed','Through Marsh Lane']])}
    <div class="op-row">${P.fd?`<button type="button" class="btn" data-sel="bc:${p}" data-k="go-bc">Feeder breaker</button>`:''}${P.nb?`<button type="button" class="btn" data-sel="tie:${p}" data-k="go-tie">${esc(NBS[P.nb].name)} tie</button>`:''}${its.map(k=>`<button type="button" class="btn" data-sel="it:${k}" data-k="go-${k}">${esc(PR[ITS[k].a===p?ITS[k].b:ITS[k].a].name)} interconnector</button>`).join('')}${assets.map(a=>`<button type="button" class="btn" data-sel="as:${a.id}" data-k="go-${a.id}">${esc(a.name)}</button>`).join('')}</div>`;}
function assetHtml(id){const a=ASB[id];
  if(a.type==='load'){const p=a.prim;return `${back}<div class="i-h">${ico('load','var(--muted)')}<div><h3>${PR[p].name} demand</h3><div class="kind">Homes and businesses</div></div></div>
    ${facts([['Demand now',S.sup[p]==='off'?'Off supply':mw(dem(S.c,p))],['Supply',esc(supTxt(p))]])}
    <h4 class="i-sub">11 kV feeders</h4><ul class="i-list">${S.lf[p].map((v,i)=>`<li><button type="button" data-sel="lf:${p}${i}" data-k="lf-${p}${i}"><span class="nm">${esc(LFN[p][i])}</span><span class="st${v||S.nop[p][i]?'':' warn'}">${v?'From '+esc(PR[p].name):S.nop[p][i]?'From Volt Face':'Open · customers off'}</span><span class="v">${mw(S.c.demand*S.share[p]*LF[p][i])}</span></button></li>`).join('')}</ul>
    <div class="op-row">${S.lf[p].map((v,i)=>opBtn('lf:'+p+i,v?'open':'close',`${v?'Open':'Close'} ${LFN[p][i]}`)).join('')}</div>
    ${VF_ON?`<div class="op-row">${VFI.map(i=>opBtn('nop:'+p+i,S.nop[p][i]?'open':'close',`${S.nop[p][i]?'Open':'Close'} ${LFN[p][i]} backfeed`)).join('')}</div><p class="i-note">Backfeeds move a feeder onto Volt Face, a neighbouring 11 kV network on a different grid supply. Open the feeder breaker first, then close the backfeed.</p>`:''}
    <p class="i-note">Opening an 11 kV feeder takes its customers off supply to cut the load on the network. Every minute customers are off supply costs 1 point per MW, so use it as a last resort and close it again as soon as you can.</p>`;}
  const p=a.prim,off=S.sup[p]==='off';
  if(id==='batt'){const b=S.act.bdis-S.act.bchg,f=S.fail.bdis>S.t||S.fail.bchg>S.t;
    return `${back}<div class="i-h">${ico('batt','var(--c-batt)')}<div><h3>Kings Hill Battery</h3><div class="kind">30 MW / 60 MWh battery at Hartwell</div></div></div>
      ${facts([['Output',off?'Disconnected':b>.5?`Discharging ${mw(b)}`:b<-.5?`Charging ${mw(-b)}`:'Idle'],['Charge',`${Math.round(S.soc/SOC_MAX*100)}% · ${Math.round(S.soc)} MWh`]])}
      <p class="prices"><span>Arm <b>£6</b>/MW/h each way</span><span>Discharge <b>£90</b>/MWh (now £135)</span><span>Charge <b>£35</b>/MWh (now £52.50)</span><span>Ramps <b>30</b> MW/min</span></p>
      <div class="ctrls">${stepper('bnow','batt',S.manual.bdis-S.manual.bchg,'Now <em>· + discharge (offsets load), − charge (adds load)</em>','bn',true)}${stepper('arm','bdis',S.armed.bdis,'Armed discharge <em>· on import overload</em>','ad')}${stepper('arm','bchg',S.armed.bchg,'Armed charge <em>· on export overload</em>','ac')}</div>
      <p class="i-state ${f?'alarm':''}">${f?'Not responding until '+fmtT(Math.max(S.fail.bdis,S.fail.bchg)):S.autoP.bdis>.5||S.autoP.bchg>.5?'Armed response active':''}</p>`;}
  const s=SV[id],f=S.fail[id]>S.t,act=S.act[id],av=S.av[id];
  let st='';
  if(f)st=`Not responding until ${fmtT(S.fail[id])}.`;else if(s.gen&&S.allow[id]<=0)st='Curtailment allowance used up for this shift.';
  else if(S.autoP[id]>.5)st=`Armed response active: ${Math.round(S.autoP[id])} MW.`;else if(act<S.manual[id]-.5)st=av<S.manual[id]-.5?`Only ${mw(av)} available.`:'Ramping…';
  const gen=s.gen,raw=id==='solar'?S.c.solar:id==='wind'?S.c.wind:0;
  return `${back}<div class="i-h">${ico(s.ic,s.tc)}<div><h3>${s.name}</h3><div class="kind">${s.kind} at ${PR[p].name}${gen?' · runs at full output':''}</div></div></div>
    ${facts(gen?[['Output',off?'Disconnected':mw(raw-act)],['Curtailed',mw(act)],['Available',mw(raw)],['Allowance left',`${Math.round(S.allow[id])} of ${s.allow} MWh`]]
      :[['Output',off?'Disconnected':act>.5?mw(act):'Standby'],['Available',mw(av)]])}
    ${gen?`<p class="prices"><span>Compensation <b>£${s.use}</b>/MWh</span><span>No fee to stand ready</span><span>Ramps <b>${s.ramp}</b> MW/min</span></p>`
      :`<p class="prices"><span>Arm <b>£${s.arm}</b>/MW/h</span><span>Use <b>£${s.use}</b>/MWh</span><span>Now <b>£${s.use*1.5}</b>/MWh</span><span>Ramps <b>${s.ramp}</b> MW/min</span></p>`}
    <div class="ctrls">${gen?stepper('man',id,S.manual[id],'Curtail now','cn')+stepper('arm',id,S.armed[id],'Auto-curtail <em>· on export overload</em>','ca')
      :stepper('man',id,S.manual[id],(id==='dsr'?'Reduce demand now':'Run now')+' <em>· 1.5× price</em>','mn')+stepper('arm',id,S.armed[id],'Armed <em>· on import overload</em>','am')}</div>
    <p class="i-state ${f?'alarm':''}">${esc(st)}</p>
    <p class="i-note">Armed response only helps Blackout Canyon while ${PR[p].name} is fed from it.</p>`;}
function inspHtml(){const sel=S.sel;if(!sel)return summaryHtml();const[type,id]=sel.split(':');
  if(type==='tx')return txHtml(+id);if(type==='bc'||type==='in')return bcHtml(id);if(type==='lf'||type==='nop')return assetHtml('load_'+id.slice(0,2));if(type==='lk')return lkHtml(id);if(type==='nb'&&id==='vf')return vfHtml();if(type==='tie')return tieHtml(id);if(type==='it')return itHtml(id);if(type==='bs')return bsHtml(id);if(type==='nb')return nbHtml(id);if(type==='prim')return primHtml(id);if(type==='as'&&ASB[id]&&(!NOGEN()||ASB[id].type==='load'))return assetHtml(id);return summaryHtml();}
function renderInsp(){const h=inspHtml();if(h===lastInsp)return;lastInsp=h;const el=$('inspBody'),ae=document.activeElement,k=ae&&el.contains(ae)&&ae.dataset?ae.dataset.k:null;el.innerHTML=h;if(k){const f=el.querySelector(`[data-k="${k}"]`);if(f)f.focus();}}
const QP_T=GAME==='fc'?[]:['tx','bc','in','tie','it','bs','lf','nop','lk'],isSw=k=>!!k&&QP_T.includes(k.split(':')[0]);
function select(k,fromDiagram){S.sel=k==='none'?null:k;S.qp=!!fromDiagram&&isSw(S.sel);lastInsp='';
  if(PHONE){if(S.qp)closeSheet();else if(S.sel)openSheet();}render(true);}
let lastQP='';
function qpHtml(k){const[t,id]=k.split(':');let closed,st,cls='';
  if(t==='tx'){const x=S.tx[+id];closed=!x.out;
    st=x.out?(x.out.ready?'ready to close':`${x.out.kind==='planned'?'work':x.out.kind==='trip'?'inspection':x.out.kind==='open'?'opened':'repair'}${x.out.kind==='open'?'':' until '+fmtT(x.out.until)}`):`${Math.round(x.L*100)}% loaded`;
    cls=x.out?(x.out.ready?'warn':'alarm'):x.L>1?'alarm':x.L>AL_ON?'warn':'ok';}
  else if(t==='bc'||t==='in'){const f=S.fd[id],fl=Math.abs(S.flows['bc:'+id]||0),L=S.edL['bc:'+id]||0;closed=t==='bc'?f.brk:f.inc;
    st=f.fault?(f.fault.ready?'feeder ready':`${f.fault.planned?'work':'fault'} until ${fmtT(f.fault.until)}`):fdOn(id)&&S.islands.some(J=>J.alive&&J.secs.includes(FSEC[id]))?`${Math.round(fl)}/${PR[id].fr} MW`:`other end ${(t==='bc'?f.inc:f.brk)?'closed':'open'}`;
    cls=f.fault&&!f.fault.ready?'alarm':f.fault?'warn':L>1?'alarm':L>AL_ON?'warn':'';}
  else if(t==='tie'){closed=S.tie[id].closed;const fl=Math.abs(S.flows[k]||0),lim=tieLimit(id);
    st=closed?`${Math.round(fl)}/${lim} MW`+(S.sup[id]==='par'?` · parallel ${PAR_MAX-S.parMin} min left`:''):(PR[id].nb==='fm'?'different grid supply: open the old route first':'same grid supply: can parallel');
    cls=closed&&S.sup[id]==='par'?'warn':PR[id].nb==='fm'&&!closed?'warn':'';}
  else if(t==='it'){const it=S.it[id],fl=Math.abs(S.flows[k]||0);closed=it.closed;
    st=it.fault?(it.fault.ready?'repaired':'fault until '+fmtT(it.fault.until)):closed?`${Math.round(fl)}/${ITS[id].r} MW`:'normally open';cls=it.fault&&!it.fault.ready?'alarm':'';}
  else if(t==='lk'){const L=LINKS[id],a=L.a,b=L.b;closed=!!S.lk[id];const f=(S.lkLoad||{})[id]||0,fa=S.lf[a[0]][a[1]],fb=S.lf[b[0]][b[1]];
    st=closed?(fa&&fb?`paralleling ${PR[a[0]].name} and ${PR[b[0]].name}`:f>.5?`carrying ${Math.round(f)}/${L.r} MW`:'closed, no load'):fa&&fb?`both feeder breakers closed: open one first`:`can move ${(!fa?LFN[a[0]][a[1]]:LFN[b[0]][b[1]])} onto ${PR[!fa?b[0]:a[0]].name}`;
    cls=closed&&fa&&fb?'warn':f>L.r?'alarm':'';}
  else if(t==='nop'){const[p,i]=lfP(id),mwv=Math.round(lfMW(p,i));closed=S.nop[p][i];
    st=closed?`feeding ${mwv} MW · Volt Face ${Math.round(S.vfLoad)}/${Math.round(S.spare.vf)} MW`:S.lf[p][i]?'feeder breaker closed: open it first':`${mwv} MW off · Volt Face spare ${Math.round(Math.max(0,S.spare.vf-S.vfLoad))} MW`;
    cls=!closed&&S.lf[p][i]?'warn':S.vfLoad>S.spare.vf?'alarm':'';}
  else if(t==='lf'){const[p,i]=lfP(id),mwv=S.c?Math.round(S.c.demand*S.share[p]*LF[p][i]):0;closed=S.lf[p][i];
    st=!closed&&S.nop[p][i]?`fed from Volt Face (${mwv} MW)`:!closed?`${mwv} MW of customers off`:S.sup[p]==='off'?'substation off supply':`${mwv} MW of demand`;cls=closed?'':'warn';}
  else{closed=S.bs[id].closed;st=closed?`${Math.round(Math.abs(S.bsf[id]||0))} MW across`:'busbar running split';cls=closed?'':'warn';}
  const act=closed?'open':'close',title=t==='tx'?`T${+id+1} breaker`:ucfirst(devName(k))+(t==='bc'?' at Blackout Canyon':t==='lf'||t==='nop'?' · '+PR[id.slice(0,2)].name:'');
  return `<div class="qp-h"><b>${esc(title)}</b><button type="button" class="qp-x" id="qpClose" aria-label="Close this pop-up">×</button></div>
    <p class="qp-s ${cls}"><span class="qp-st">${closed?'Closed':'Open'}</span> · ${esc(st)}</p>${isManual(k)?qpCrew(k):''}
    <div class="qp-row">${opBtn(k,act,act==='close'?'Close':'Open')}${isManual(k)&&!crewAt(k)&&!crewFor(k)?`<button type="button" class="btn" data-crew="${k}">Send crew</button>`:''}<button type="button" class="btn" id="qpMore">Details</button></div>`;}
function qpCrew(k){const j=crewFor(k),h=crewAt(k);return `<p class="qp-crew">${j?`Crew ${j.n} ${j.to?'walking there, arrives '+fmtT(j.arr):'on site'}${j.job.act?', will '+j.job.act+' it by '+fmtT(j.job.at):''}.`:h?`Crew ${h.n} is standing by here: operating takes ${CREW_OP} min.`:'Manual switch: a field crew has to walk here first.'}</p>`;}
function renderQP(){const q=$('qp');if(!q)return;const k=S&&!S.ended&&S.qp&&S.sel;
  if(!k||!isSw(k)||!SELBOX[k]){if(!q.hidden){q.hidden=true;lastQP='';}return;}
  const h=qpHtml(k);if(h!==lastQP){const ae=document.activeElement,fid=ae&&q.contains(ae)?ae.id:'',fk=ae&&q.contains(ae)&&ae.dataset?ae.dataset.k:'';q.innerHTML=h;lastQP=h;const f=fid?$(fid):fk?[...q.querySelectorAll('[data-k]')].find(x=>x.dataset.k===fk):null;if(f)f.focus();}
  q.hidden=false;
  const ms=$('mscroll'),r=$('mimic').getBoundingClientRect(),mr=ms.getBoundingClientRect();if(!r.width)return;const vb=($('mimic').getAttribute('viewBox')||'0 0 1200 610').split(' ').map(Number),sc=Math.min(r.width/vb[2],r.height/vb[3]),padX=(r.width-vb[2]*sc)/2,padY=(r.height-vb[3]*sc)/2,bx=SELBOX[k],W=q.offsetWidth,H=q.offsetHeight,ox=r.left-mr.left+ms.scrollLeft+padX,oy=r.top-mr.top+ms.scrollTop+padY,cw=vb[2]*sc,ch=vb[3]*sc;
  let l=ox+(bx[0]+bx[2]/2)*sc-W/2,tp=oy+(bx[1]+bx[3])*sc+6;
  if(tp+H>oy+ch)tp=oy+bx[1]*sc-H-6;
  l=Math.max(ox+4,Math.min(l,ox+cw-W-4));tp=Math.max(oy+2,tp);
  q.style.left=Math.round(l)+'px';q.style.top=Math.round(tp)+'px';}
function openSheet(){$('pInsp').classList.add('open');}
function closeSheet(){$('pInsp').classList.remove('open');}

function adjust(f,id,d){if(!S||S.ended||NOGEN())return;
  if(f==='bnow'){nudge('batt',d>0?1:-1,true);return;}
  const s=SV[id],o=f==='arm'?S.armed:S.manual;o[id]=clamp(o[id]+d,0,capOf(s));
  play('click');lastChart=0;render(true);}
function nudge(id,dir,quiet){if(!S||S.ended||NOGEN())return;const M=S.manual;
  if(id==='solar'||id==='wind')M[id]=clamp(M[id]-5*dir,0,capOf(SV[id]));
  else if(id==='batt'){if(dir>0){if(M.bchg>0)M.bchg=Math.max(0,M.bchg-5);else M.bdis=Math.min(30,M.bdis+5);}else{if(M.bdis>0)M.bdis=Math.max(0,M.bdis-5);else M.bchg=Math.min(30,M.bchg+5);}}
  else M[id]=clamp(M[id]+5*dir,0,capOf(SV[id]));
  play('click');lastChart=0;if(!quiet&&!PHONE&&S.sel!=='as:'+id){S.sel='as:'+id;lastInsp='';}render(true);}

/* ---------- Security panel ---------- */
function renderSec(){
  const sec=S.sec,n=S.n,dirW=S.net>=0?'import':'export';
  const live=S.tx.filter(t=>!t.out),maxL=live.length?Math.max(...live.map(t=>t.L)):0,t0=live[0];
  let pill='ok',ptxt='N-1 secure',adv='',advL='';
  const fixTxt=NOGEN()?'switching':GAME==='fc'?(dirW==='export'?'turn-down':'turn-up'):`${dirW==='export'?'turn-down':'turn-up'} or switching`;
  if(n===0){pill='alarm';ptxt='No supply';adv='Blackout Canyon has no transformers in service. Only substations fed from a neighbour have supply.';advL='alarm';}
  else if(maxL>1){pill='alarm';ptxt='Emergency';const wi=worstIsl(),need=Math.ceil(Math.abs(wi.inj)-wi.k*R);
    adv=maxL>EMERG?`Above the 120% emergency rating at ${Math.round(maxL*100)}%. Protection trips in ${SHORT_MIN-t0.sh} min. Take ${need} MW off Blackout Canyon now.`
      :`On the emergency rating at ${Math.round(maxL*100)}%: ${EMERG_MIN-t0.em} min left to get under 100%. Take ${need} MW off Blackout Canyon using ${fixTxt}.`;advL='alarm';}
  else if(sec.exposed){pill='alarm';ptxt='Exposed';adv=S.split?`Only one transformer feeds ${secName(sec.secs)}. Losing it takes that section's substations off supply. Close a bus section or move load onto a neighbour.`:'Only one transformer left. Another loss takes every substation fed from Blackout Canyon off supply.';advL='warn';}
  else if(sec.insecure){pill='alarm';ptxt='At risk';const p=Math.round(sec.post*100),more=Math.ceil(sec.short-sec.cover);
    const what=sec.post>SHORT?`would trip the remaining ${sec.n-1===1?'transformer':'transformers'} straight away (${p}%)`
      :sec.post>EMERG?`would push the others to ${p}%, and protection would trip them within ${SHORT_MIN} minutes`
      :`would push the others to ${p}%. You'd have 30 minutes on the emergency rating to fix it`;
    adv=NOGEN()?`A fault now ${what}. Move about ${more} MW onto Ampy Place or Watts This.`:`A fault now ${what}. Arm at least ${more} MW more ${dirW==='export'?'turn-down':'turn-up'}${GAME==='fc'?'':', or move a substation onto a neighbour'}.`;advL='warn';}
  else if(sec.short>.5)adv=`Covered: ${Math.round(sec.cover)} MW armed against a ${Math.ceil(sec.short)} MW shortfall if another transformer trips.`;
  else adv=`${ucfirst(secName(sec.secs||[]))} could lose ${sec.n===3?'any one':'another'} transformer without overloading.`+(S.split?' The busbar is split.':'');
  const off=PIDS.filter(p=>S.sup[p]==='off');
  if(off.length){adv=`${off.map(p=>PR[p].name).join(' and ')} ${off.length>1?'are':'is'} off supply. `+adv;advL='alarm';if(pill==='ok'){pill='alarm';ptxt='Customers off';}}
  const over=Object.keys(S.edL).filter(k=>S.edL[k]>1);
  if(over.length){adv=`The ${devName(over[0])} is overloaded. `+adv;advL='alarm';if(pill==='ok'){pill='alarm';ptxt='Circuit overload';}}
  const p=$('pill');setAttr(p,'class','pill '+pill);txt('pill',ptxt);
  const outs=S.tx.map((t,i)=>t.out?i:-1).filter(i=>i>=0);
  txt('secSub',outs.length?(outs.some(i=>S.tx[i].out.kind!=='planned')?'Post-fault running':'Planned outage running'):'All transformers in');
  txt('fIn',`${n} of 3`);txt('fNet',n?`${mw(Math.abs(S.net))} ${dirW}`:'–');
  txt('fLoad',n?Math.round(maxL*100)+'%':'–');
  txt('fAfter',sec.after==null?(n===1?'Off supply':'–'):`${n-1} left at ${Math.round(sec.after*100)}%`);
  txt('fShort',mw(sec.short));txt('fCover',mw(sec.cover));
  const ad=$('advice');setAttr(ad,'class','advice '+advL);txt('advice',adv);
  const A=S.ahead;let at='';
  if(A){if(A.uncAt!=null)at=`Uncovered N-1 shortfall from ${fmtT(A.uncAt)}, peaking at ${Math.ceil(A.worstUnc)} MW of ${A.uncDir} around ${fmtT(A.worstUncAt)}.`;
    else if(A.worstShort>.5)at=`Shortfall of up to ${Math.ceil(A.worstShort)} MW (${A.worstDir}) around ${fmtT(A.worstAt)}, covered by what you have armed or dispatched.`;
    else at=`No N-1 shortfall forecast ${GAME==='fc'?'with the current generation and flexibility':'with the current switching'}. Faults themselves are never forecast.`;
    if(A.overAt!=null)at=`Overload forecast at ${fmtT(A.overAt)}${NOGEN()?'':' even with armed flex'}. `+at;}
  txt('aheadTxt',at);
  const w=S.risk.filter(r=>r.end>S.t&&r.start<S.t+360);const wt=$('weatherTxt');
  const wh=w.map(r=>`<b>${esc(r.label)}</b> ${r.start<=S.t?'now, until '+fmtT(r.end):fmtT(r.start)+'–'+fmtT(r.end)}: faults ${r.mult}× more likely.`).join(' ');
  if(wt.innerHTML!==wh)wt.innerHTML=wh;wt.hidden=!w.length;
  const ul=$('outs');const html=outs.map(i=>{const o=S.tx[i].out;return`<li><b>T${i+1}</b> · ${o.ready?'ready to close':esc(o.label)+' · until '+fmtT(o.until)}</li>`;}).join('')+
    PIDS.filter(p=>S.fd[p].fault).map(p=>{const f=S.fd[p].fault;return `<li><b>${PR[p].name} feeder</b> · ${f.ready?'repaired':(f.planned?'planned work':'faulted')+' · until '+fmtT(f.until)}</li>`;}).join('')+
    ITIDS.filter(k=>S.it[k].fault).map(k=>{const f=S.it[k].fault;return `<li><b>${esc(ucfirst(devName('it:'+k)))}</b> · ${f.ready?'repaired':'faulted · until '+fmtT(f.until)}</li>`;}).join('')+
    S.events.filter(e=>e.planned&&!e.fired).map(e=>`<li><b>${e.fd?PR[e.fd].name+' feeder':'T'+(e.tx+1)}</b> · planned outage ${fmtT(e.start)}–${fmtT(e.end)}</li>`).join('');
  if(ul.innerHTML!==html)ul.innerHTML=html;
}

/* ---------- Look-ahead ---------- */
function outAt(i,m){const t=S.tx[i];if(t.out)return t.out.ready?true:t.out.until>m;return S.events.some(e=>e.planned&&!e.fired&&e.tx!=null&&e.tx===i&&m>=e.start&&m<e.end);}
const nAt=m=>[0,1,2].filter(i=>!outAt(i,m)).length;
function computeAhead(){
  const pts=[];let A={worstShort:0,worstAt:null,worstDir:'',worstUnc:0,worstUncAt:null,uncAt:null,uncDir:'',overAt:null};const wB=S.wB;
  for(let m=S.t;m<=Math.min(S.t+360,1440);m+=5){
    const c=comps(m,true),av=availability(c,m);if(!NOGEN())av.bdis=S.soc>.3?30:0;
    const del={};SERVICES.forEach(s=>del[s.id]=Math.min(S.manual[s.id],av[s.id]));
    const fc=PIDS.reduce((x,p)=>x+netP(c,p,zeroD())*wB[p],0),net=PIDS.reduce((x,p)=>x+netP(c,p,del)*wB[p],0);
    const dir=net>=0?'import':'export',abs=Math.abs(net),n=nAt(m);
    const arm=SERVICES.filter(s=>s.dir===dir&&wB[s.prim]).reduce((a,s)=>a+wB[s.prim]*Math.max(0,Math.min(S.armed[s.id],av[s.id]-del[s.id])),0);
    const over=Math.max(0,abs-n*R-arm);
    let unc=0,short=0;if(n>=2){short=Math.max(0,abs-(n-1)*R);unc=Math.max(0,short-arm);}
    if(short>A.worstShort){A.worstShort=short;A.worstAt=m;A.worstDir=dir;}
    if(unc>.5&&A.uncAt==null){A.uncAt=m;A.uncDir=dir;}
    if(unc>A.worstUnc){A.worstUnc=unc;A.worstUncAt=m;A.uncDir=dir;}
    if(over>.5&&A.overAt==null)A.overAt=m;
    const hrs=(m-S.t)/60,sc=S.sc,wsum=PIDS.reduce((a,p)=>a+wB[p]*S.share[p],0);
    const band=(2+.03*c.demand*wsum+.6*sc.solar.cloud*c.solar*wB.ml+.35*sc.wind.var*wB.rv)*Math.min(1,Math.pow(hrs/4,.7));
    pts.push({m,fc,n,unc,over,band});
  }
  S.ahead=A;return pts;
}
function drawChart(){
  const W=PHONE?360:640,H=230,L=PHONE?32:40,Rr=12,T=12,B=26,x0=S.t-60,span=420,Y=200;
  const X=m=>L+(m-x0)/span*(W-L-Rr),Yv=v=>T+(Y-v)/(2*Y)*(H-T-B);
  const pts=computeAhead();let s='';
  S.risk.forEach(r=>{const a=Math.max(r.start,x0),b=Math.min(r.end,x0+span);if(b<=a)return;
    s+=`<rect class="riskband" x="${X(a).toFixed(1)}" y="${T}" width="${(X(b)-X(a)).toFixed(1)}" height="${H-T-B}"/><text class="risklbl" x="${(X(a)+4).toFixed(1)}" y="${H-B-20}">${esc(r.label.toUpperCase())}</text>`;});
  pts.forEach(p=>{const w=(X(p.m+5)-X(p.m)+.5).toFixed(1);if(p.over>.5)s+=`<rect class="band-over" x="${X(p.m).toFixed(1)}" y="${T}" width="${w}" height="${H-T-B}"/>`;else if(p.unc>.5)s+=`<rect class="band-insec" x="${X(p.m).toFixed(1)}" y="${T}" width="${w}" height="${H-T-B}"/>`;});
  [-180,-120,-60,0,60,120,180].forEach(v=>{s+=`<line class="${v?'gl':'g0'}" x1="${L}" x2="${W-Rr}" y1="${Yv(v)}" y2="${Yv(v)}"/><text class="ax" x="${L-6}" y="${Yv(v)+3.5}" text-anchor="end">${Math.abs(v)}</text>`;});
  s+=`<text class="zone" x="${L+6}" y="${T+12}">IMPORT ▼</text><text class="zone" x="${L+6}" y="${H-B-6}">EXPORT ▲</text>`;
  const tk=PHONE?120:60;for(let h=Math.ceil(x0/tk)*tk;h<=x0+span;h+=tk){const x=X(h);s+=`<line class="gl" x1="${x}" x2="${x}" y1="${H-B}" y2="${H-B+4}"/><text class="ax" x="${x}" y="${H-8}" text-anchor="middle">${fmtT(h)}</text>`;}
  if(pts.length>1){const up=pts.map(p=>X(p.m).toFixed(1)+' '+Yv(clamp(p.fc+p.band,-Y,Y)).toFixed(1)),dn=pts.slice().reverse().map(p=>X(p.m).toFixed(1)+' '+Yv(clamp(p.fc-p.band,-Y,Y)).toFixed(1));
    s+=`<path class="fcband" d="M${up.join(' L')} L${dn.join(' L')} Z"/>`;}
  const capPts=[...S.hist.map(h=>({m:h.m,n:h.n})),...pts.map(p=>({m:p.m,n:p.n}))];
  const stepPath=f=>{let d='';capPts.forEach((p,i)=>{const x=X(p.m).toFixed(1),y=Yv(f(p.n)).toFixed(1);d+=i?` H${x} V${y}`:`M${x} ${y}`;});return d;};
  s+=`<path class="capN" d="${stepPath(n=>n*R)}"/><path class="capN" d="${stepPath(n=>-n*R)}"/>`;
  s+=`<path class="capN1" d="${stepPath(n=>Math.max(0,n-1)*R)}"/><path class="capN1" d="${stepPath(n=>-Math.max(0,n-1)*R)}"/>`;
  s+=`<path class="fc" d="${pts.map((p,i)=>(i?'L':'M')+X(p.m).toFixed(1)+' '+Yv(clamp(p.fc,-Y,Y)).toFixed(1)).join(' ')}"/>`;
  if(S.hist.length)s+=`<path class="hist" d="${S.hist.map((h,i)=>(i?'L':'M')+X(h.m).toFixed(1)+' '+Yv(clamp(h.net,-Y,Y)).toFixed(1)).join(' ')}"/>`;
  const xn=X(S.t);s+=`<line class="nowl" x1="${xn}" x2="${xn}" y1="${T}" y2="${H-B}"/><text class="ax" x="${xn+4}" y="${T+9}" style="fill:var(--ink)">now</text>`;
  if(END>x0&&END<x0+span)s+=`<line class="g0" x1="${X(END)}" x2="${X(END)}" y1="${T}" y2="${H-B}" style="stroke-dasharray:2 3"/><text class="ax" x="${X(END)-4}" y="${T+9}" text-anchor="end">shift ends</text>`;
  const ch=$('chart');ch.setAttribute('viewBox',`0 0 ${W} ${H}`);ch.innerHTML=s;
}

/* ---------- Sky ---------- */
let lastSky='';
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mixC=(a,b,f)=>{const A=hex(a),B=hex(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*f).toString(16).padStart(2,'0')).join('');};
function skyAt(m){const sc=S.sc,r=sc.solar.start,st=sc.solar.end,h=m/60;
  const K=[[r-2,'#0c1238','#1c2152'],[r-.6,'#1d2160','#5a3f80'],[r+.3,'#4a5aa6','#f29a62'],[r+1.8,'#4f93dc','#cfe6ff'],[st-1.8,'#4f93dc','#cfe6ff'],[st-.2,'#4a55a0','#f59a5e'],[st+.8,'#252b6a','#6b4a8e'],[st+2,'#0c1238','#1c2152']];
  let top=K[0][1],bot=K[0][2];
  if(h>=K[K.length-1][0]){top=K[K.length-1][1];bot=K[K.length-1][2];}
  else for(let i=1;i<K.length;i++){if(h<=K[i][0]){const f=clamp((h-K[i-1][0])/(K[i][0]-K[i-1][0]),0,1);top=mixC(K[i-1][1],K[i][1],f);bot=mixC(K[i-1][2],K[i][2],f);break;}}
  const day=h>r&&h<st,cl=sc.noGen?.25:sc.solar.cloud,grey=cl>.3&&day?.45:cl>.15&&day?.2:0;
  if(grey){top=mixC(top,'#7a8190',grey);bot=mixC(bot,'#aeb4bf',grey);}
  return{top,bot,day,f:(h-r)/(st-r),cloud:cl};}
function renderSky(){const k=S.key+'|'+Math.floor(S.t/3);if(k===lastSky)return;lastSky=k;const s=skyAt(S.t);
  let body='';
  if(s.day){const x=8+102*s.f,y=40-30*Math.sin(Math.PI*s.f);body+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#ffd54a" opacity=".35"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="#ffe27a"/>`;}
  else body+=`<circle cx="96" cy="13" r="6" fill="#ecebff"/><circle cx="99" cy="11" r="5.5" fill="${s.top}"/><circle cx="20" cy="10" r=".9" fill="#fff"/><circle cx="44" cy="18" r=".7" fill="#fff"/><circle cx="66" cy="8" r=".8" fill="#fff"/>`;
  if(s.cloud>.15){const cc=s.cloud>.3?'#c9ced8':'#ffffff',op=s.cloud>.3?.9:.7;body+=`<g fill="${cc}" opacity="${op}"><ellipse cx="34" cy="26" rx="14" ry="6"/><ellipse cx="44" cy="22" rx="9" ry="6"/><ellipse cx="82" cy="32" rx="12" ry="5"/></g>`;
    if(s.cloud>.3)body+=`<path d="M30 33l-2 6M38 33l-2 6M46 33l-2 6" stroke="#dfe7ff" stroke-width="1.2" opacity=".8"/>`;}
  $('sky').innerHTML=`<svg viewBox="0 0 118 46" preserveAspectRatio="none"><defs><linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.top}"/><stop offset="1" stop-color="${s.bot}"/></linearGradient></defs><rect width="118" height="46" fill="url(#skyG)"/>${body}<rect y="42" width="118" height="4" fill="#1b2a1f" opacity=".55"/></svg>`;
  $('dClock').style.background=`linear-gradient(${s.top},${s.bot})`;}

/* ---------- Tips ---------- */
const TIPS=[
  {id:'diagram',el:'pMimic',when:()=>true,text:'Everything is run from this diagram. Select a breaker, tie, interconnector, transformer, substation or generator, and its controls open in the control panel.'},
  {id:'adj',el:'pMimic',when:()=>S.t>=START+3&&!NOGEN(),text:'The ▲ and ▼ buttons beside each generator turn it up or down straight away. Select a generator to arm an automatic response too: it switches in if a transformer overloads.'},
  {id:'firm',el:'kFirmBox',when:()=>S.t>=START+6,text:'Firm capacity is what Blackout Canyon could carry if one more transformer tripped. Keep the flow inside it by moving substations onto Ampy Place or Watts This'+'.'},
  {id:'switch',el:'pMimic',when:()=>S.t>=START+12,text:`Switching order matters. Ampy Place shares our grid supply: close the new route first, then open the old one within ${PAR_MAX} minutes. Watts This is on a different grid supply: open the old route first, then close the new one. Never parallel with Watts This.`},
  {id:'ics',el:'pMimic',when:()=>S.t>=START+20,text:'The dashed links between substations are interconnectors. Close one to feed a substation from its neighbour when its own feeder is out. Each is rated 30 MW, and feeders have ratings too: anything over its rating for '+OV_MIN+' minutes trips. The alarm list warns you at 80%.'},
  {id:'outage',el:'pSec',when:()=>S.events.some(e=>e.planned&&!e.fired&&e.start-S.t<=60),text:()=>{const e=S.events.find(x=>x.planned&&!x.fired);return e&&e.fd?`Field staff will open the ${PR[e.fd].name} breaker within the hour. Move ${PR[e.fd].name}, and anything fed through it, onto another route before then, or those customers lose supply.`:'A planned outage starts within the hour and firm capacity will drop by 60 MW. Set up switching first. When the work is finished, you have to close the transformer breaker yourself.';}},
  {id:'fault',el:'pMimic',when:()=>S.faults>0,text:'Something has tripped. Equipment must be repaired before you close it again, or it trips and counts as an incident. Customers on a faulted feeder can be restored through a tie or an interconnector.'}
];
if(GAME==='fc'){const FT={diagram:'Everything is shown on this diagram. Select a transformer, substation or generator for its details. Breakers and ties are run from the control room game, so here you keep the network in balance with generation and flexibility.',
  firm:'Firm capacity is what Blackout Canyon could carry if one more transformer tripped. Keep the flow inside it by turning generation and flexibility up or down, and arm responses for when a transformer trips.',
  outage:'A planned transformer outage starts within the hour and firm capacity will drop by 60 MW. Arm flexibility or adjust generation before it starts. The transformer comes back by itself when the work is finished.',
  fault:'A transformer has tripped. The others now carry the load and can run on their emergency rating for a while. Bring the flow down with generation and flexibility before they trip too. It comes back by itself once repaired.'};
  for(let i=TIPS.length-1;i>=0;i--){const t=TIPS[i];if(t.id==='switch'||t.id==='ics')TIPS.splice(i,1);else if(FT[t.id])t.text=FT[t.id];}}
if(GAME==='cr')TIPS.splice(TIPS.findIndex(t=>t.id==='ics')+1,0,{id:'vf',el:'pMimic',when:()=>S.t>=START+40||S.tx.filter(t=>!t.out).length<3,text:'Short of capacity? The small switches under the 11 kV feeders are backfeeds from Volt Face, a neighbouring network on a different grid supply. Open the feeder breaker first, then close its backfeed, to move those customers off Blackout Canyon.'});
let tipActive=null;
function checkTips(){if(S.tut||!tipsOn||tipActive||!S.running||S.ended||!$('overlay').hidden)return;
  const t=TIPS.find(x=>!S.tipShown[x.id]&&x.when());if(!t)return;S.tipShown[t.id]=true;tipActive=t;
  const list=TIPS.filter(x=>x.id!=='adj'||!NOGEN());
  txt('tipK',`Tip ${list.filter(x=>S.tipShown[x.id]).length} of ${list.length}`);txt('tipP',typeof t.text==='function'?t.text():t.text);$('tip').hidden=false;
  const el=$(t.el);if(el){el.classList.add('hl');if(t.el!=='kFirmBox'&&el.scrollIntoView)el.scrollIntoView({block:'nearest',behavior:'smooth'});}
  S.tipPause=!S.paused;S.paused=true;acc=0;}
function hideTip(){if(tipActive){const el=$(tipActive.el);if(el)el.classList.remove('hl');}tipActive=null;$('tip').hidden=true;}
function tipOk(){const wasPause=S.tipPause;hideTip();if(TIPS.every(x=>S.tipShown[x.id]))ls('tips','off');if(wasPause&&S.running&&!S.ended&&$('banner').hidden){S.paused=false;acc=0;}}

/* ---------- Render ---------- */
function renderLog(){if(!logDirty)return;logDirty=false;
  $('log').innerHTML=S.log.length?S.log.map(l=>`<li class="${l.lvl}"><time>${fmtT(l.m)}</time><span>${esc(l.text)}</span></li>`).join(''):'<li class="empty">Nothing yet.</li>';}
const spendOf=c=>c.arm+c.use+c.short+c.curt+c.gen;
function render(force){
  txt('clock',fmtT(S.t));txt('kSpend',gbp(spendOf(S.cost)));txt('kInc',String(S.incidents));$('kInc').classList.toggle('bad',S.incidents>0);
  {const n=S.sec?S.sec.n:S.n,abs=S.sec?S.sec.abs:Math.abs(S.net||0),live=S.tx.filter(t=>!t.out),maxL=live.length?Math.max(...live.map(t=>t.L)):0;let fv,fs,fc,dt;
    if(n>=2){const cap=(n-1)*R,hd=cap-abs;fv=`${Math.round(abs)} / ${cap} MW`;
      if(hd>=0){fs=`${Math.round(hd)} MW headroom`;fc='ok';dt=`Firm +${Math.round(hd)}`;}
      else{const cov=!(S.sec&&S.sec.insecure);fs=`${Math.round(-hd)} MW over · ${cov?'covered by flex':'not covered'}`;fc=cov?'warn':'bad';dt=`Firm −${Math.round(-hd)}`;}}
    else if(n===1){fv=`${Math.round(abs)} / 0 MW`;fs='No firm capacity left';fc='bad';dt='No firm cap';}
    else{fv='–';fs='No transformers in';fc='bad';dt='No supply';}
    if(maxL>1){fc='bad';dt=maxL>EMERG?'Trip imminent':`Emerg ${EMERG_MIN-live[0].em}m`;}
    if(PIDS.some(p=>S.sup[p]==='off')&&fc==='ok'){fc='warn';dt='Cust. off';}
    if(S.split&&fs)fs+=' · split bus';txt('kFirm',fv);txt('kFirmSub',fs);setAttr($('kFirmBox'),'class','kpi kpi-firm'+(fc==='ok'?'':' '+fc)+(tipActive&&tipActive.el==='kFirmBox'?' hl':''));
    setAttr($('dPill'),'class','pill '+(fc==='ok'?'ok':fc==='warn'?'warn':'alarm'));txt('dPill',dt);}
  txt('kIns',S.insecureMin+' min');$('kIns').classList.toggle('bad',S.insecureMin>0);
  renderMimic();renderInsp();renderQP();renderAlarms();renderLog();renderSky();
  const now=performance.now();if(force||now-lastChart>350){lastChart=now;drawChart();}
  renderSec();
  const pl=S.ended?'Shift over':!S.running?'Start':S.paused?'Resume':'Pause';txt('playBtn',pl);txt('dPlay',pl);txt('dClock',fmtT(S.t));
  $('resumeBtn').hidden=!(S.paused&&S.running&&!S.ended);
}
let lastRender=0;
function frame(now){
  const dt=Math.min(.25,(now-lastFrame)/1000);lastFrame=now;
  if(S&&S.running&&!S.paused&&!S.ended){acc+=dt*RATE[speed]*(anyOver()?.5:1);while(acc>=1&&!S.paused&&!S.ended){acc-=1;step();}}
  if(S&&now-lastRender>90){lastRender=now;checkTips();render(false);tutTick(now);
    const live=S.tx.filter(t=>!t.out);humTo(S.running&&!S.paused&&!S.ended&&live.length?Math.max(...live.map(t=>t.L)):0);}
  requestAnimationFrame(frame);
}

/* ---------- Tutorial (control room) ---------- */
const TUT=[
  {t:'next',x:'pMimic',h:'Welcome to the control room',b:'It\'s Cold Thursday, 15:30, and the evening peak is building. This is Blackout Canyon: power comes from the Steve Towers grid supply point at the top, through three transformers (T1–T3), onto the 33 kV busbar, and out to four substations: Hartwell, Marsh Lane, Ohm No and Joule Street.'},
  {t:'next',x:'kFirmBox',h:'Firm capacity',b:()=>`Each transformer is rated ${R} MW. Firm capacity is what you could still carry if one more transformer tripped: ${2*R} MW with all three in. You're importing about ${Math.round(Math.abs(S.net))} MW now, and the peak at 17:30 will be well over firm capacity.`},
  {t:'next',x:'as:batt',h:'Generation and flexibility',b:'Each substation has demand, and some have generation or flexibility: the Kings Hill battery and demand response at Hartwell, solar at Marsh Lane, wind and a gas CHP at Ohm No. The ▲ ▼ buttons beside each one turn it up or down now. Every MW you produce locally is a MW Blackout Canyon doesn\'t have to import.'},
  {t:'act',x:'as:batt',go:()=>nudge('batt',1,true),done:()=>S.manual.bdis>=20,h:'Discharge the battery',b:'Press ▲ beside the Kings Hill Battery four times to discharge 20 MW into Hartwell. Batteries are quick but limited: watch its charge.'},
  {t:'act',x:'as:chp',go:()=>nudge('chp',1,true),done:()=>S.manual.chp>=15,h:'Run the CHP',b:'Press ▲ beside the Ohm No CHP three times to run 15 MW. Running something now costs 1.5× its normal price, so spend only what you need.'},
  {t:'act',x:'as:dsr',go:()=>{select('as:dsr');adjust('arm','dsr',5);},done:()=>S.armed.dsr>=10,h:'Arm demand response',b:'Better still, arm flexibility in advance. Select the Hartwell DSR and press + on Armed twice (10 MW). Armed services cost a small fee per hour, and switch in by themselves the moment a transformer overloads.'},
  {t:'next',x:'depot',h:'Remote and manual switches',b:'Now switching. Squares are remote-controlled breakers: they operate from here in a minute. Circles are manual switches: a field crew has to walk there from this depot first, so they take longer.'},
  {t:'next',x:'bc:js',h:'A fault!',enter(){S.sched.push({k:'fd:js',m:S.t,dur:900,cause:'Ice build-up on the overhead line',done:false});for(let i=0;i<2;i++)step();},b:'Ice has brought down the Joule Street 33 kV feeder. Its breaker at Blackout Canyon and its incomer at Joule Street both tripped, so Joule Street is off supply.'},
  {t:'act',x:'tie:js',k:'tie:js',a:'close',done:()=>S.tie.js.closed,h:'Restore from Watts This',b:'Tap the Joule Street – Watts This tie (the orange circle on the right) and press Close. Watts This is on a different grid supply, but Joule Street is dead, so closing onto it is safe. A crew will walk there first.'},
  {t:'next',x:'prim:js',h:'Customers back on',b:()=>`Joule Street is back, fed from Watts This, and that load is off Blackout Canyon too. It was off for more than 3 minutes, so those customers count as interrupted (CI: ${nf(S.cust.ci)}) and every minute added customer minutes lost (CML). Restore inside 3 minutes and it's only a short interruption.`},
  {t:'next',x:'tx:1',h:'T2 has tripped!',enter(){const t=S.tx[1];if(!t.out){t.out={kind:'fault',until:S.t+120,ready:false,label:'Cable joint failure'};S.faults++;logE(S.t,'Fault on the T2 circuit: cable joint failure. T2 tripped.','alarm');}for(let i=0;i<2;i++)step();},
    b:()=>{const L=Math.round(Math.max(...S.tx.filter(t=>!t.out).map(t=>t.L))*100),fc=Math.round(Math.abs(S.net));return L>100?`T2 has tripped on a cable fault. T1 and T3 now carry everything, ${L}% each, so they're on their emergency rating: 30 minutes to get below 100%. Your armed demand response switched in by itself${S.act.dsr>.5?` (${Math.round(S.act.dsr)} MW)`:''}. Take more load off now.`
      :`T2 has tripped on a cable fault. T1 and T3 now carry everything, but thanks to the battery, the CHP and Joule Street being on Watts This they're only at ${L}%. Had they gone over 100%, your armed demand response would have switched in by itself. Firm capacity is now just ${R} MW against ${fc} MW, and the peak is still climbing, so another trip would hurt. Take load off before it does.`;}},
  {t:'act',x:'tie:hw',k:'tie:hw',a:'close',done:()=>S.tie.hw.closed,h:'Make before break',b:'Move Hartwell onto Ampy Place. Ampy Place shares our grid supply, so you can do it without an interruption. First make: tap the Hartwell – Ampy Place tie (the green circle on the left) and press Close.'},
  {t:'act',x:'bc:hw',k:'bc:hw',a:'open',done:()=>!S.fd.hw.brk,h:'…then break',b:()=>`Blackout Canyon and Ampy Place are now running in parallel. You have ${PAR_MAX} minutes to open one side. Tap the Hartwell breaker at Blackout Canyon and press Open.`},
  {t:'act',x:'lf:ml1',k:'lf:ml1',a:'open',done:()=>!S.lf.ml[1],h:'Volt Face backfeeds',b:'Volt Face is a neighbouring 11 kV network on a different grid supply. It can pick up some 11 kV feeders. First open the Station 11 kV feeder breaker at Marsh Lane (the middle small square).'},
  {t:'act',x:'nop:ml1',k:'nop:ml1',a:'close',done:()=>S.nop.ml[1],h:'Close the backfeed',b:'Now tap the pink circle under that feeder, its Volt Face backfeed, and press Close. A crew walks there; the Station customers are off until it closes.'},
  {t:'next',x:'pAlarm',h:'Alarms',b:'Anything over 80% of its rating raises an alarm here, with a countdown if it will trip. Press Acknowledge to quieten them.'},
  {t:'next',x:'pSec',h:'Next-loss check',b:()=>`This tells you whether you'd survive another transformer trip, and what to do if not. You're carrying about ${Math.round(Math.abs(S.net))} MW on two transformers now. Keep it green and you're running a secure network.`},
  {t:'next',x:null,h:'Tutorial complete',b:'You\'ve used the battery, CHP and armed demand response, restored a faulted feeder from a neighbour, made a make-before-break transfer after a transformer trip, and moved a feeder onto Volt Face. That\'s the control room. Ready for your first shift?'}];
const readMs=st=>Math.max(4500,(typeof st.b==='function'?st.b():st.b).length*55);
let tutRepeat=ls('tutRepeat')==='on',wakeLock=null;
function kioskLayout(on){const h=document.documentElement;h.classList.toggle('kiosk',!!on);
  if(on){const b=document.querySelector('header.bar');h.style.setProperty('--kh',(b?b.getBoundingClientRect().height:90)+'px');hideBanner();}else h.style.removeProperty('--kh');
  if(S)render(true);}
addEventListener('resize',()=>{if(document.documentElement.classList.contains('kiosk'))kioskLayout(true);});
async function keepAwake(on){try{if(on&&'wakeLock' in navigator&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});}else if(!on&&wakeLock){await wakeLock.release();wakeLock=null;}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S&&S.tut&&S.tut.kiosk)keepAwake(true);});
function tutStart(auto,kiosk){speed=1;document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.speed==='1'));txt('dSpeed','1×');
  const m0=mode;mode='free';newGame('tut');mode=m0;
  S.silent=true;while(S.t<930)step();S.silent=false;S.log=[];S.full=[];S.marks=[];S.alarms={};S.cust={ci:0,cml:0,si:0,off:{}};S.cost={arm:0,use:0,short:0,curt:0,gen:0};S.insecureMin=0;S.overloadMin=0;S.ens=0;S.peakL=0;queued=[];
  logE(S.t,'Tutorial: Cold Thursday, 15:30. The evening peak is building.','info');S.tut={i:-1,auto:!!auto||!!kiosk,kiosk:!!kiosk,shown:0,acted:false,doneAt:0};kioskLayout(!!kiosk);if(kiosk){tutRepeat=true;keepAwake(true);const ck=$('cookie');if(ck)ck.hidden=true;}hideTip();begin();tutGo(0);track('tutorial_start',{auto:!!auto,kiosk:!!kiosk});}
function tutGo(i){const T=S.tut;if(!T)return;T.i=i;const st=TUT[i];if(!st){tutDone();return;}
  if(st.enter)st.enter();T.shown=performance.now();T.acted=false;T.doneAt=0;T.pressing=false;
  S.paused=st.t==='next';acc=0;S.sel=null;S.qp=false;lastInsp='';if(PHONE)closeSheet();
  if(st.t==='next'&&i===TUT.length-1)S.paused=true;
  renderCoach(true);render(true);
  if(PHONE){const pm=$('pMimic');if(pm)window.scrollTo({top:pm.getBoundingClientRect().top+window.scrollY-8,behavior:'smooth'});}
  if(st.x&&SELBOX[st.x]&&PHONE){const sc=$('mscroll'),svg=$('mimic'),k=svg.getBoundingClientRect().width/1200,b=SELBOX[st.x];sc.scrollLeft=Math.max(0,(b[0]+b[2]/2)*k-sc.clientWidth/2);}}
function tutAct(){const st=TUT[S.tut.i];if(!st||st.t!=='act'||st.done())return;S.tut.acted=true;
  if(st.go){S.tut.pressing=true;return;}
  if(isManual(st.k)?!crewFor(st.k):!S.op){select(st.k,true);setTimeout(()=>{if(!S||!S.tut)return;issueOp(st.k,st.a);S.qp=false;render(true);},900);}}
function tutTick(now){const T=S&&S.tut;if(!T||S.ended)return;const st=TUT[T.i];if(!st)return;
  if(st.t==='act'&&st.go&&T.pressing&&!st.done()&&now-(T.lastGo||0)>650){T.lastGo=now;st.go();}
  if(st.t==='act'){if(st.done()){if(!T.doneAt){T.doneAt=now;play('ok');}else if(now-T.doneAt>900)tutGo(T.i+1);}
    else if(T.auto&&!T.acted&&now-T.shown>2600)tutAct();
    else if(T.acted&&!st.go&&!S.op&&!crewFor(st.k)&&now-T.shown>4000&&!st.done())T.acted=false;}
  else if(T.auto&&T.i<TUT.length-1&&now-T.shown>readMs(st))tutGo(T.i+1);
  else if(T.auto&&T.i===TUT.length-1&&tutRepeat&&now-T.shown>Math.max(9000,readMs(st))){tutStart(true,T.kiosk);return;}
  renderCoach(false);}
let lastCoach='';
function renderCoach(force){const el=$('coach');if(!el)return;const T=S&&S.tut;
  if(!T||S.ended){if(!el.hidden){el.hidden=true;lastCoach='';}document.querySelectorAll('.coach-hl').forEach(e=>e.classList.remove('coach-hl'));setAttr($('coachRing'),'visibility','hidden');return;}
  const st=TUT[T.i],last=T.i===TUT.length-1,b=typeof st.b==='function'?st.b():st.b,
    wait=st.t==='act'&&(S.op&&S.op.k===st.k||crewFor(st.k)),j=st.t==='act'&&crewFor(st.k);
  const h=`<div class="coach-top"><span class="coach-n">${T.kiosk?'Demonstration':'Tutorial'} · ${T.i+1} of ${TUT.length}</span><button type="button" class="coach-x" data-tut="exit" aria-label="Exit the tutorial">×</button></div>
    <h3>${esc(st.h)}</h3><p>${esc(b)}</p>
    ${st.t==='act'?`<p class="coach-st">${st.done()?'✓ Done':wait?(j?`Crew ${j.n} ${j.to?'walking there, arrives '+fmtT(j.arr):'on site'}…`:'Operating…'):T.auto?'Watch: the demo does this for you.':'Your turn: do this on the diagram.'}</p>`:''}
    ${T.auto&&last&&tutRepeat?`<p class="coach-st">Starting again in a few seconds…</p>`:''}
    <div class="coach-row">${T.auto?`<button type="button" class="btn${tutRepeat?' on':''}" data-tut="repeat" aria-pressed="${tutRepeat}">↻ Repeat: ${tutRepeat?'on':'off'}</button>`:''}${T.kiosk?'':last?`<button type="button" class="btn primary" data-tut="career">Start my career</button><button type="button" class="btn" data-tut="menu">Start screen</button><button type="button" class="btn" data-tut="again">Replay demo</button>`
      :`<button type="button" class="btn" data-tut="mode">${T.auto?'Let me do it':'Auto-play'}</button>${st.t==='act'&&!T.auto&&!wait&&!st.done()?'<button type="button" class="btn" data-tut="show">Show me</button>':''}${st.t==='next'?`<button type="button" class="btn primary" data-tut="next">${T.auto?'Next now':'Next'}</button>`:''}`}</div>`;
  if(force||h!==lastCoach){el.innerHTML=h;lastCoach=h;}el.hidden=false;
  document.querySelectorAll('.coach-hl').forEach(e=>e.classList.remove('coach-hl'));
  const r=$('coachRing');if(st.x&&SELBOX[st.x]){const bx=SELBOX[st.x];setAttr(r,'x',String(bx[0]-6));setAttr(r,'y',String(bx[1]-6));setAttr(r,'width',String(bx[2]+12));setAttr(r,'height',String(bx[3]+12));setAttr(r,'visibility','visible');}
  else{setAttr(r,'visibility','hidden');const e=st.x&&$(st.x);if(e)e.classList.add('coach-hl');}}
function tutDone(){if(!S)return;S.tut=null;S.ended=true;S.running=false;S.paused=true;renderCoach(true);track('tutorial_done',{});
  $('sheet').innerHTML=`${BAND}<p class="eyebrow">Tutorial</p><h2>You're ready for the control room</h2>
    <ul class="rules"><li>▲ ▼ turn generation and flexibility up or down now; arming it makes it switch in by itself when a transformer overloads.</li><li>Remote breakers (squares) operate in a minute; manual switches (circles) need a field crew.</li><li>Different grid supply (Watts This, Volt Face): open the old route first, then close the new one.</li><li>Same grid supply (Ampy Place): close the new route, then open the old one within ${PAR_MAX} minutes.</li><li>Restore customers inside 3 minutes and it only counts as a short interruption.</li><li>Keep the next-loss check green before things go wrong.</li></ul>
    <div class="go"><button type="button" class="btn" data-tut="again">Replay the demo</button><span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-tut="menu">Start screen</button><button type="button" class="btn primary big" data-tut="career">Start my career</button></span></div>`;
  $('overlay').hidden=false;}
function tutClick(a){
  if(a==='kiosk'){tutStart(true,true);return;}
  if(a==='demo'||a==='play'||a==='again'){tutStart(a!=='play');return;}
  if(a==='repeat'){tutRepeat=!tutRepeat;ls('tutRepeat',tutRepeat?'on':'off');renderCoach(true);return;}
  if(!S)return;
  if(a==='next'&&S.tut){tutGo(S.tut.i+1);return;}
  if(a==='show'&&S.tut){tutAct();return;}
  if(a==='mode'&&S.tut){S.tut.auto=!S.tut.auto;S.tut.shown=performance.now();S.tut.acted=false;renderCoach(true);return;}
  if(a==='exit'||a==='menu'){keepAwake(false);kioskLayout(false);S.tut=null;renderCoach(true);S.running=false;S.paused=true;newGame(chosen);startSheet();return;}
  if(a==='career'){kioskLayout(false);S.tut=null;renderCoach(true);mode='career';ls('mode',mode);const c=career();chosen=CAREER.find(k=>unlockedK(c,k)&&!(c.stars[k]>=1))||CAREER[0];ls('day',chosen);newGame(chosen);startSheet();return;}}

/* ---------- Start sheet ---------- */
const BOLT='M7 0 0 8h4l-2 6 7-9H5l2-5z';
const diffHtml=(d,c)=>`<span class="diff" style="--sc:${c}">${[1,2,3].map(k=>`<svg viewBox="0 0 9 14" aria-hidden="true"><path class="${k<=d?'on':'off'}" d="${BOLT}"/></svg>`).join('')}<em>${['','Easier','Medium','Hardest'][d]}</em></span>`;
const FC_RULES=`
    <li>Blackout Canyon takes power from the Steve Towers 132 kV grid supply point through three 60 MVA transformers, and feeds <b>Hartwell</b>, <b>Marsh Lane</b>, <b>Ohm No</b> and <b>Joule Street</b>. Keep each transformer under 100%, in either direction.</li>
    <li><b>Generation and flexibility</b> are your only tools. Marsh Lane has a solar farm, Ohm No has a wind farm and a gas CHP, and Hartwell has the Kings Hill battery and demand response. Strong sun or wind pushes power back up through the transformers, and peaks pull hard the other way.</li>
    <li><b>▲ ▼</b> beside a generator turn it up or down now. Select one to <b>arm</b> an automatic response that switches in by itself if a transformer overloads. Arming and using flexibility costs money, and spending costs points.</li>
    <li><b>Firm capacity</b> is what's left if one more transformer trips. After a loss the others can run at up to 120% for 30 minutes, or 120–150% for ${SHORT_MIN} minutes. Above that they trip, so be ready before a fault, not after it.</li>
    <li>Transformer faults and planned work come back by themselves when they're finished. The breakers, ties and interconnectors on the diagram are run from the control room game.</li>
    <li>If every transformer trips, Blackout Canyon is lost and the shift ends.</li>`;
function careerBox(){const c=career(),n=starsOf(c),nr=nextRank(n),got=ACH.filter(a=>c.ach[a.id]);
  return `<div class="career"><div class="career-top"><div><span class="k">Rank</span><b>${esc(rankOf(n))}</b><span class="s">${n} of ${CAREER.length*3} stars${nr?` · ${nr[0]-n} more for ${esc(nr[1])}`:''}</span></div>
    <div><span class="k">Achievements</span><b>${got.length} of ${ACH.length}</b></div></div>
    <div class="ach">${ACH.map(a=>`<span class="badge${c.ach[a.id]?' got':''}" title="${esc(a.d)}">${c.ach[a.id]?'🏅':'○'} ${esc(a.name)}</span>`).join('')}</div>
    <p class="fine">Finish a shift to unlock the next one. Grade A earns 3 stars, B 2, C or D 1. Career shifts use random faults and count on the free-play scoreboard.</p></div>`;}
function startSheet(){
  const date=todayUK();
  const cc=career(),keys=mode==='career'?CAREER.filter(k=>SCENARIOS[k]):Object.keys(SCENARIOS).filter(k=>!SCENARIOS[k].hidden);
  if(mode==='career'&&!unlockedK(cc,chosen)){chosen=CAREER.find(k=>unlockedK(cc,k)&&!(cc.stars[k]>=1))||CAREER[0];}
  const sc=keys.map(k=>[k,SCENARIOS[k]]).map(([k,v])=>`<button type="button" class="scn${mode==='career'&&!unlockedK(cc,k)?' locked':''}" data-scn="${k}"${mode==='career'&&!unlockedK(cc,k)?' disabled':''} style="--sc:${v.color}" aria-pressed="${k===chosen}"><span class="f">${mode==='career'?`Shift ${CAREER.indexOf(k)+1} · `:''}${v.focus}</span><b>${v.title}${mode==='career'?` <span class="stars">${unlockedK(cc,k)?starStr(cc.stars[k]||0):'🔒'}</span>`:''}</b>${diffHtml(v.diff,v.color)}<span class="d">${v.when}</span><p>${v.blurb}</p></button>`).join('');
  $('sheet').innerHTML=`${BAND}<p class="eyebrow">${CFG.eyebrow}</p>
  <h2>${CFG.h2}</h2>
  ${GAME==='cr'?`<div class="tut-cta"><div><b>New to the control room?</b><span>A guided tutorial on Cold Thursday's evening peak, using generation and switching. Watch it run as a demonstration, or do each step yourself with instructions as you go.</span></div><div class="tut-b"><button type="button" class="btn" data-tut="demo">Watch the demo</button><button type="button" class="btn" data-tut="kiosk" title="Runs the demo on its own, over and over, and keeps the screen awake. For a display stand.">Display mode</button><button type="button" class="btn primary" data-tut="play">Play the tutorial</button></div></div>`:''}
  <ul class="rules">${GAME==='fc'?FC_RULES:`
    <li>Blackout Canyon takes power from the Steve Towers 132 kV grid supply point through three 60 MVA transformers, and feeds four substations: <b>Hartwell</b>, <b>Marsh Lane</b>, <b>Ohm No</b> and <b>Joule Street</b>.${GAME==='cr'?' On the Interconnected shift, <b>Kilowatt Close</b> is fed through Marsh Lane, with a backup route from Ohm No.':''} Keep each transformer under 100%, in either direction.</li>
    <li>The 33 kV busbar has two normally closed <b>bus section breakers</b> (BS), between T1 and T2 and between T2 and T3. Opening one splits the busbar, so each section is supplied only by its own transformers. Arrows on the diagram show which way power is flowing.</li>
    <li><b>Firm capacity</b> is what's left if one more transformer trips. After a loss the others can run at up to 120% for 30 minutes, or 120–150% for ${SHORT_MIN} minutes. Above that they trip.</li>
    <li><b>Everything is run from the diagram.</b> Tap a breaker or switch and press Open or Close in the pop-up. Tap anything else for its details. In the generation days, ▲ ▼ beside a generator turn it up or down now, and armed flexibility switches in by itself on overload.</li>
    <li><b>Neighbours:</b> Hartwell and Marsh Lane have ties to <b>Ampy Place</b>, which shares our grid supply: close the new route, then open the old one within ${PAR_MAX} minutes. Ohm No and Joule Street have ties to <b>Watts This</b>, on a different grid supply: open the old route first, then close the new one. Get the order wrong and protection trips.</li>
    <li><b>Interconnectors</b> link neighbouring substations so one can feed another. Feeders, ties and interconnectors all have ratings, and neighbours have limited spare capacity. Anything over its limit for ${OV_MIN} minutes trips, and an alarm sounds at 80% so you have warning.</li>
    <li><b>Field crews:</b> breakers at substations are remote-controlled and operate in a minute. Ties, interconnectors and Volt Face backfeeds (drawn as circles ○) are manual: one of three field crews has to walk there from the depot first. Send a crew ahead to stand by where you'll need it.</li>
    <li><b>The 3-minute rule:</b> customers count as interrupted (CI) only if they're off for 3 minutes or more, and every minute after that adds customer minutes lost (CML). Restore within 3 minutes and it's only a short interruption.</li>
    <li><b>11 kV links</b> (Snow day) join an 11 kV feeder at one substation to a feeder at the next. Open a feeder breaker and close its link to move that feeder onto the neighbouring substation. With both on the same grid supply you can close the link first for a transfer with no interruption. Each link is rated 15 MW.</li>
    <li><b>Volt Face</b> is a neighbouring 11 kV network on a different grid supply. The second and third 11 kV feeders at each substation have a backfeed from it (the small switch under the feeder). Open the feeder breaker first, then close the backfeed, and those customers move onto Volt Face, which takes the load off Blackout Canyon. Volt Face has limited spare capacity too.</li>
    <li><b>Demand feeders:</b> each substation supplies three 11 kV feeders, each with its own breaker. Opening one sheds that part of the demand, which can save an overload, but its customers count as off supply until you close it again.</li>
    <li><b>Feeders have a breaker at each end:</b> one at Blackout Canyon and an incomer at the substation. A feeder fault trips both, and the feeder only carries power again once both are closed.</li>
    <li>Planned work and faulted equipment must be finished before you close it again. Closing either end of a feeder before then is an incident. Repaired transformers and feeders stay out until you close their breakers. Each operation takes one minute.</li>
    <li>Customers off supply cost points every minute. If every substation is off supply at once, Blackout Canyon is lost and the shift ends.</li>
  `}</ul>
  <h3>Mode</h3><div class="modes">
    <button type="button" class="mode" data-mode="daily" aria-pressed="${mode==='daily'}"><b>Today's challenge · ${esc(fmtDate(date))}</b><span>Same weather and fault times for everyone today.</span></button>
    <button type="button" class="mode" data-mode="free" aria-pressed="${mode==='free'}"><b>Free play</b><span>Random faults every game. Good for practice.</span></button>
    <button type="button" class="mode" data-mode="career" aria-pressed="${mode==='career'}"><b>Career</b><span>Work through the shifts in order, earn stars and climb the ranks.</span></button></div>
  ${mode==='career'?careerBox():''}
  <h3>Choose a day</h3><div class="scns">${sc}</div>
  <div class="go"><div class="opts"><label class="chk"><input type="checkbox" id="ovPause" ${autoPause?'checked':''}> Pause on faults and overloads</label><label class="chk"><input type="checkbox" id="ovTips" ${tipsOn?'checked':''}> Show tips</label></div>
  <span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-feedback>Feedback</button><button id="sheetBoardBtn" type="button" class="btn">Scoreboard</button><button id="startBtn" type="button" class="btn primary big">Start shift at ${fmtT(START)}</button></span></div>
  <div class="other-game"><p>${CFG.other.box}</p><a class="btn" href="${CFG.other.url}" target="_top">${CFG.other.cta}</a></div>
  <p class="fine">Shift runs ${fmtT(START)}–${fmtT(END)}, about 3½ minutes at 1×. Time slows to half speed while anything is overloaded. MW and MVA are treated as equal. No faults in the first 20 minutes, so you can set up.</p>`;
  $('overlay').hidden=false;
}

/* ---------- End of shift ---------- */
function computeScore(){
  const spend=spendOf(S.cost),L=S.lost,surv=(L?L.m:END)-START;
  const parts={surv:surv*10,bonus:L?0:5000,risk:-S.insecureMin*20,spend:-Math.round(spend/10),ens:-Math.round(S.ens),inc:-S.incidents*INCIDENT_PTS};
  return{total:Math.max(0,Object.values(parts).reduce((a,b)=>a+b,0)),parts,surv,spend};
}
function endShift(){
  if(S.tut){tutDone();return;}
  S.ended=true;S.running=false;S.paused=true;hideBanner();hideTip();humTo(0);closeSheet();S.sel=null;lastInsp='';
  const L=S.lost,sc=computeScore();let g='✕',gl='alarm',gd='';
  if(!L){
    if(S.insecureMin===0&&S.overloadMin===0&&S.incidents===0&&S.ens<100){g='A';gl='ok';gd='Secure all shift, no incidents and almost no customers off. Textbook control.';}
    else if(S.insecureMin<=20&&S.incidents<=1&&S.ens<1500){g='B';gl='ok';gd='A solid shift with only brief exposure.';}
    else if(S.insecureMin<=90&&S.incidents<=2){g='C';gl='warn';gd='Blackout Canyon stayed on, but there were costly moments.';}
    else{g='D';gl='warn';gd='You got through it, but customers and the network took a beating.';}
    play('done');
  }
  S.final={...sc,grade:L?'Lost':g,gl,gd,result:L?'lost':'complete'};
  {const c=career(),before=starsOf(c),done=!L,st=L?0:{A:3,B:2,C:1,D:1}[g]||0,newA=[];const prevUnl=CAREER.filter(k=>unlockedK(c,k));
   const award=(id,ok)=>{if(ok&&!c.ach[id]&&ACH.some(a=>a.id===id)){c.ach[id]=1;newA.push(ACH.find(a=>a.id===id));}};
   award('first',done);award('clean',done&&S.incidents===0);award('solid',done&&S.insecureMin===0);award('quick',done&&S.cust.ci===0&&S.cust.si>0);award('nobody',done&&S.cust.ci===0&&S.cust.si===0);
   award('mbb',S.parOk>0);award('crews',S.crewJobs>=8);award('vf',S.vfPeak>=20);award('heat',done&&S.key==='heat'&&(g==='A'||g==='B'));award('gsp',done&&S.key==='gsp'&&S.gspTrips===0);award('cheap',done&&GAME==='fc'&&sc.spend<2000);
   let up=false;if(S.mode==='career'&&st>(c.stars[S.key]||0)){c.stars[S.key]=st;up=true;}
   award('textbook',CAREER.every(k=>(c.stars[k]||0)>=3));saveCareer(c);
   const after=starsOf(c),newUnl=CAREER.filter(k=>unlockedK(c,k)&&!prevUnl.includes(k));
   S.careerRes={st,up,newA,newUnl,rankUp:rankOf(after)!==rankOf(before)?rankOf(after):null,rank:rankOf(after),stars:after,next:CAREER[CAREER.indexOf(S.key)+1]};}S.submitted=null;S.unlocked=true;S.shareMsg='';
  const base={scenario:S.key,mode:S.mode,score:sc.total,incidents:S.incidents,minutes_at_risk:S.insecureMin};
  if(L)track('site_lost',{...base,lost_at:fmtT(L.m)});else track('shift_complete',{...base,grade:g});
  showEnd();
}
function drawReplay(){
  const F=S.full;if(F.length<2)return'';
  const W=PHONE?360:640,H=210,L=PHONE?30:38,Rr=10,T=22,B=24,span=END-START;
  let Y=120;F.forEach(p=>{Y=Math.max(Y,Math.abs(p.net)+10,p.n*R);});Y=Math.min(240,Math.ceil(Y/60)*60);
  const X=m=>L+(m-START)/span*(W-L-Rr),Yv=v=>T+(Y-clamp(v,-Y,Y))/(2*Y)*(H-T-B);let s='';
  let run=null;F.forEach((p,i)=>{if(p.ins&&run==null)run=p.m;if(run!=null&&(!p.ins||i===F.length-1)){s+=`<rect class="rp-ins" x="${X(run).toFixed(1)}" y="${T}" width="${Math.max(1,X(p.m)-X(run)).toFixed(1)}" height="${H-T-B}"/>`;run=null;}});
  run=null;F.forEach((p,i)=>{if(p.off&&run==null)run=p.m;if(run!=null&&(!p.off||i===F.length-1)){s+=`<rect class="rp-off" x="${X(run).toFixed(1)}" y="${H-B-4}" width="${Math.max(2,X(p.m)-X(run)).toFixed(1)}" height="4"/>`;run=null;}});
  for(let v=-Y;v<=Y;v+=60)s+=`<line class="${v?'gl':'g0'}" x1="${L}" x2="${W-Rr}" y1="${Yv(v)}" y2="${Yv(v)}"/><text class="ax" x="${L-5}" y="${Yv(v)+3.5}" text-anchor="end">${Math.abs(v)}</text>`;
  const tk=PHONE?360:180;for(let h=START;h<=END;h+=tk)s+=`<text class="ax" x="${X(h)}" y="${H-8}" text-anchor="middle">${fmtT(h)}</text>`;
  const stp=f=>{let d='';F.forEach((p,i)=>{const x=X(p.m).toFixed(1),y=Yv(f(p.n)).toFixed(1);d+=i?` H${x} V${y}`:`M${x} ${y}`;});return d;};
  s+=`<path class="capN" d="${stp(n=>n*R)}"/><path class="capN" d="${stp(n=>-n*R)}"/><path class="capN1" d="${stp(n=>Math.max(0,n-1)*R)}"/><path class="capN1" d="${stp(n=>-Math.max(0,n-1)*R)}"/>`;
  s+=`<path class="rp-net" d="${F.map((p,i)=>(i?'L':'M')+X(p.m).toFixed(1)+' '+Yv(p.net).toFixed(1)).join(' ')}"/>`;
  S.marks.forEach(k=>{const x=X(k.m);
    if(k.type==='fault'||k.type==='trip')s+=`<path class="rp-f" transform="translate(${(x-4).toFixed(1)} 3)" d="${BOLT}"><title>${esc(fmtT(k.m)+' '+k.label)}</title></path>`;
    else if(k.type==='flex')s+=`<rect class="rp-flex" x="${(x-3.5).toFixed(1)}" y="${H-B-12}" width="7" height="7" transform="rotate(45 ${x.toFixed(1)} ${H-B-8.5})"><title>${esc(fmtT(k.m)+' armed flex switched in')}</title></rect>`;
    else if(k.type==='xfer')s+=`<rect class="rp-x" x="${(x-3).toFixed(1)}" y="${T-12}" width="6" height="6"><title>${esc(fmtT(k.m)+' '+k.label)}</title></rect>`;
    else if(k.type==='fail'||k.type==='incident')s+=`<path class="rp-fail" d="M${(x-4.5).toFixed(1)} ${H-B-6} l4.5 -8 l4.5 8z"><title>${esc(fmtT(k.m)+' '+k.label)}</title></path>`;
    else if(k.type==='lost'){const last=F[F.length-1],y=Yv(last.net);s+=`<path class="rp-lost" d="M${x-7} ${y-7}l14 14M${x+7} ${y-7}l-14 14"/>`;}});
  const legend=`<span><i style="border-color:var(--mv)"></i>Blackout Canyon net flow</span><span><i style="border-color:var(--warn);border-top-style:dashed"></i>Firm capacity</span><span><i class="box" style="background:var(--alarm);opacity:.3"></i>At risk</span><span><i class="box" style="background:var(--alarm)"></i>Customers off</span><span style="color:var(--alarm)">⚡ Fault or trip</span>${NOGEN()?'':'<span style="color:var(--c-solar)">◆ Flex in</span>'}<span style="color:var(--c-wind)">■ Switching</span><span style="color:var(--c-gas)">▲ Incident${NOGEN()?'':' or no response'}</span>`;
  return `<div class="replay"><h3>Your shift</h3><div class="scroll"><svg class="rp" viewBox="0 0 ${W} ${H}" role="img" aria-label="Blackout Canyon net flow through the shift against capacity, with faults and switching marked">${s}</svg></div><div class="legend" style="margin-top:6px">${legend}</div>
    <p class="rp-sum">Peak loading ${Math.round(S.peakL*100)}% · ${S.faults} ${S.faults===1?'fault':'faults'} · ${S.incidents} ${S.incidents===1?'incident':'incidents'} · ${nf(S.cust.ci)} customers interrupted (${(S.cust.cml/CUST_TOTAL).toFixed(1)} min lost each) · ${S.insecureMin} min at risk</p></div>`;
}
function showEnd(){
  const c=S.cost,F=S.final,L=S.lost,sg=v=>(v<0?'−':'+')+nf(Math.abs(v));
  const costs=NOGEN()?'':`<table class="sum"><tbody>
    <tr><td>Curtailment compensation (solar, wind)</td><td>${gbp(c.curt)}</td></tr>
    <tr><td>Availability fees (armed flex)</td><td>${gbp(c.arm)}</td></tr>
    <tr><td>Utilisation (armed response)</td><td>${gbp(c.use)}</td></tr>
    <tr><td>Short-notice dispatch</td><td>${gbp(c.short)}</td></tr>
    <tr><td>Generators disconnected (compensation)</td><td>${gbp(c.gen)}</td></tr>
    <tr class="tot"><td>Total spend</td><td>${gbp(F.spend)}</td></tr></tbody></table>`;
  const score=`<div class="score"><div class="score-big"><small>Score</small><b>${nf(F.total)}</b></div>
    <table class="sum"><tbody>
      <tr><td>Time on supply (${F.surv} min × 10)</td><td>${sg(F.parts.surv)}</td></tr>
      <tr><td>Full shift bonus</td><td>${sg(F.parts.bonus)}</td></tr>
      <tr><td>Minutes at risk (${S.insecureMin} × 20)</td><td>${sg(F.parts.risk)}</td></tr>
      <tr><td>Customer interruptions: ${nf(S.cust.ci)} CI, ${nf(S.cust.cml)} CML, ${nf(S.cust.si)} short (under 3 min)</td><td>${sg(F.parts.ens)}</td></tr>
      <tr><td>Switching incidents (${S.incidents} × ${INCIDENT_PTS})</td><td>${sg(F.parts.inc)}</td></tr>
      ${NOGEN()?'':`<tr><td>Spend (${gbp(F.spend)} ÷ 10)</td><td>${sg(F.parts.spend)}</td></tr>`}</tbody></table></div>`;
  const sub=`<div class="submit"><label for="pName">Add your score to the scoreboard (optional)</label>
    <div class="sub-row"><input id="pName" maxlength="20" autocomplete="nickname" placeholder="e.g. Sparky Sue" value="${esc(getName())}" ${S.submitted?'disabled':''}>
    <button id="submitScore" type="button" class="btn primary" ${S.submitted?'disabled':''}>${S.submitted?'Submitted':'Submit score'}</button></div>
    <p id="submitMsg" class="fine ${S.submitted?'ok':''}">${S.submitted?`Submitted. You're #${S.submitted.rank} of ${S.submitted.total} on ${esc(S.sc.title)}.`:''}</p></div>
  <div class="share-row"><button type="button" class="btn" id="shareBtn">Share my score</button><p class="fine" id="shareMsg">${esc(S.shareMsg||'')}</p></div>`;
  const lk=S.unlocked?'':' disabled';
  const CRn=S.careerRes,nextOk=S.mode==='career'&&CRn&&CRn.next&&unlockedK(career(),CRn.next);
  const btns=`<div class="go"><button type="button" class="btn" id="againBtn"${lk}>Choose another day</button><span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="sheetBoardBtn"${lk}>Scoreboard</button><button type="button" class="btn${nextOk?'':' primary big'}" id="replayBtn"${lk}>${L?'Try again':'Replay '+esc(S.sc.title)}</button>${nextOk?`<button type="button" class="btn primary big" data-next="${CRn.next}">Start next day: ${esc(SCENARIOS[CRn.next].title)} →</button>`:''}</span></div>
  <p class="lock-note" id="lockNote" ${S.unlocked?'hidden':''}>Enter your name and submit your score to carry on.</p>
  <p class="fine">${S.mode==='daily'?"Today's challenge keeps the same faults if you try again.":S.mode==='career'?'Career shifts change the faults every game.':'Free play changes the faults every game.'}</p>
  <p class="fine">Spotted a bug or got an idea? <button type="button" class="linkish" data-feedback>Send feedback</button></p>`;
  const head=L?`<h2>Blackout Canyon lost at ${fmtT(L.m)}</h2>
    <div class="grade"><span class="lt alarm">✕</span><p style="margin:0;max-width:52ch">After ${esc(L.why)}, all ${PIDS.length===5?'five':'four'} substations were off supply at once.</p></div>
    <p style="margin:0 0 14px">You held on for ${Math.floor((L.m-START)/60)} h ${(L.m-START)%60} min. Keep Blackout Canyon inside firm capacity${GAME==='fc'?', and arm flexibility so it switches in when a transformer trips':', and use the ties and interconnectors to keep substations on when things trip'}.</p>`
   :`<h2>Shift complete</h2><div class="grade"><span class="lt ${F.gl}">${F.grade}</span><p style="margin:0;max-width:44ch">${F.gd}</p></div>`;
  const CR=S.careerRes,nr=CR&&nextRank(CR.stars),pr=CR?RANKS.filter(([t])=>t<=CR.stars).pop()[0]:0,pct=CR?(nr?Math.round((CR.stars-pr)/(nr[0]-pr)*100):100):0;
  const cbox=CR&&(S.mode==='career'||CR.newA.length)?`<div class="career end">${S.mode==='career'?`<div class="rankcard${CR.rankUp?' up':''}"><span class="k">${CR.rankUp?'Promoted! You are now':'Your rank'}</span><b>${esc(CR.rank)}</b>
        <div class="rankbar"><i style="width:${pct}%"></i></div><span class="s">${CR.stars} of ${CAREER.length*3} career stars${nr?` · ${nr[0]-CR.stars} more for ${esc(nr[1])}`:' · top rank reached'}</span></div>
      <p class="cstars">${starStr(CR.st)} <span>${CR.up?'New best for this shift':'Stars for this shift'}</span></p>`:''}
      ${CR.newUnl.length?`<p>Unlocked: <b>${CR.newUnl.map(k=>esc(SCENARIOS[k].title)).join(', ')}</b></p>`:''}
      ${CR.newA.length?`<div class="ach">${CR.newA.map(a=>`<span class="badge got" title="${esc(a.d)}">🏅 ${esc(a.name)}</span>`).join('')}</div>`:''}
      ${S.mode!=='career'?'':CR.next?(unlockedK(career(),CR.next)?`<button type="button" class="btn primary big" data-next="${CR.next}">Start next day: ${esc(SCENARIOS[CR.next].title)} →</button>`:`<p class="fine">Finish this shift to unlock ${esc(SCENARIOS[CR.next].title)}. Press Try again below.</p>`):`<p><b>That's every career shift done.</b> Replay any of them to earn more stars.</p>`}</div>`:'';
  $('sheet').innerHTML=`${BAND}<p class="eyebrow">${esc(S.sc.title)}, ${esc(S.sc.when)} · ${S.mode==='daily'?"Today's challenge, "+fmtDate(S.date):S.mode==='career'?'Career · '+esc(CR?CR.rank:''):'Free play'}</p>${head}${cbox}${drawReplay()}${score}${sub}${costs}${btns}`;
  $('overlay').hidden=false;
}

function unlockEnd(){S.unlocked=true;['againBtn','sheetBoardBtn','replayBtn'].forEach(i=>{const b=$(i);if(b)b.disabled=false;});const n=$('lockNote');if(n)n.hidden=true;}
function setMsg(t,cls){const m=$('submitMsg');if(m){m.textContent=t;m.className='fine '+(cls||'');}}
const MPRE=GAME==='cr'?'cr-':'',modeKey=(md,date)=>md==='daily'?MPRE+'daily-'+date:MPRE+'free';
async function submitScore(){
  const inp=$('pName'),btn=$('submitScore');if(!inp||S.submitted)return;
  const nm=inp.value.trim().replace(/\s+/g,' ').slice(0,20);if(!nm){setMsg('Enter a name first.','err');inp.focus();return;}
  if(rude(nm)){setMsg('Please choose a different name.','err');inp.focus();return;}
  saveName(nm);const F=S.final;btn.disabled=true;setMsg('Sending…');
  try{
    const r=await fetch(SCORE_URL,{method:'POST',body:JSON.stringify({game:GAME,name:nm,day:S.key,mode:modeKey(S.mode,S.date),result:F.result,survived:F.surv,spend:Math.round(F.spend),faults:S.faults,risk:S.insecureMin,ens:Math.round(S.ens),incidents:S.incidents,grade:F.grade})});
    const j=await r.json();
    if(!j.ok){if(j.error==='name'){btn.disabled=false;setMsg('Please choose a different name.','err');return;}
      if(!(j.version>=(GAME==='cr'?3:1))){setMsg("The scoreboard isn't switched on yet, so this score wasn't saved.",'err');unlockEnd();return;}throw new Error(j.error||'rejected');}
    S.submitted={rank:j.rank,total:j.total};lastSubmit={name:j.name||nm,score:j.score,day:S.key,mode:S.mode};
    track('score_submitted',{scenario:S.key,mode:S.mode,score:j.score});
    inp.disabled=true;btn.textContent='Submitted';setMsg(`Submitted. You're #${j.rank} of ${j.total} on ${S.sc.title}.`,'ok');unlockEnd();
  }catch(e){btn.disabled=false;setMsg("Couldn't reach the scoreboard, so your score wasn't saved. Try again, or carry on without it.",'err');unlockEnd();}
}
async function shareScore(){
  const F=S.final,t=`I scored ${nf(F.total)} on ${CFG.share} (${S.sc.title}${S.mode==='daily'?", today's challenge":''}) for Watts Up${S.lost||GAME==='fc'?'':' with '+S.incidents+' switching incidents'}. Can you beat it?`;
  const msg=v=>{S.shareMsg=v;txt('shareMsg',v);};
  try{if(navigator.share){await navigator.share({title:CFG.share,text:t,url:SITE_URL});msg('Shared.');track('share',{method:'native'});return;}}catch(e){if(e&&e.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(t+' '+SITE_URL);msg('Copied. Paste it into a message or post.');track('share',{method:'copy'});return;}catch(e){}
  const row=$('shareBtn').parentNode;if(!$('shareTxt')){const ta=document.createElement('textarea');ta.id='shareTxt';ta.className='share-txt';ta.rows=3;ta.readOnly=true;ta.value=t+' '+SITE_URL;row.appendChild(ta);}
  $('shareTxt').select();msg('Copy this text to share it.');
}
function showBoard(day){
  boardDay=day||boardDay;
  const tabs=Object.entries(SCENARIOS).filter(([k,v])=>!v.hidden).map(([k,v])=>`<button type="button" data-board="${k}" style="--sc:${v.color}" aria-pressed="${k===boardDay}">${v.title}</button>`).join('');
  $('sheet').innerHTML=`${BAND}<p class="eyebrow">Scoreboard · ${CFG.board}</p><h2>Top control engineers</h2>
    <div class="board-modes" role="group" aria-label="Mode"><button type="button" data-bmode="daily" aria-pressed="${boardMode==='daily'}">Today's challenge · ${esc(fmtDate(todayUK()))}</button><button type="button" data-bmode="free" aria-pressed="${boardMode==='free'}">Free play</button></div>
    <div class="board-tabs" role="group" aria-label="Day">${tabs}</div>
    <div class="board" id="boardList"></div>
    <div class="go"><span></span><button type="button" class="btn primary" id="boardBack">Back</button></div>
    <p class="fine">Each player's best score. Score = 10 per minute on supply, 5,000 for finishing the shift, minus 20 per minute at risk, customer interruptions (CI ÷ 100) and customer minutes lost (CML ÷ 500), with interruptions under 3 minutes counting far less, 500 per switching incident and 1 per £10 spent.</p>`;
  $('overlay').hidden=false;loadBoard();
}
async function loadBoard(){
  const el=$('boardList'),day=boardDay,bm=boardMode;if(!el)return;
  el.innerHTML='<p class="empty">Loading scores…</p>';
  try{
    const r=await fetch(SCORE_URL+'?game='+GAME+'&day='+encodeURIComponent(day)+'&mode='+encodeURIComponent(modeKey(bm,todayUK())));const j=await r.json();
    if(boardDay!==day||boardMode!==bm||!$('boardList'))return;if(!j.ok)throw new Error('bad');
    if(!(j.version>=(GAME==='cr'?3:1))){el.innerHTML="<p class=\"empty\">The scoreboard is coming soon.</p>";return;}
    const rows=j.scores;
    if(!rows.length){el.innerHTML=`<p class="empty">No scores for ${bm==='daily'?"today's challenge":'this day'} yet. Be the first.</p>`;return;}
    el.innerHTML=`<table class="board-t"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Result</th><th>Grade</th></tr></thead><tbody>${
      rows.slice(0,20).map((x,i)=>`<tr class="${i<3?'top':''}${lastSubmit&&lastSubmit.day===day&&lastSubmit.mode===bm&&x.name===lastSubmit.name?' me':''}"><td>${i+1}</td><td class="nm">${esc(x.name)}</td><td>${Number(x.score).toLocaleString('en-GB')}</td><td>${x.result==='complete'?'Full shift':'Lost at '+fmtT(START+Number(x.survived))}</td><td>${esc(x.grade)}</td></tr>`).join('')}</tbody></table>`;
  }catch(e){if($('boardList'))el.innerHTML="<p class=\"empty\">Couldn't load the scoreboard. Check your connection and try again.</p>";}
}

/* ---------- Panels ---------- */
let collapsed={};try{collapsed=JSON.parse(ls('col')||'null')||{pLog:true};}catch(e){collapsed={pLog:true};}
function applyCollapsed(){Object.keys(collapsed).forEach(id=>{const p=$(id);if(p)p.classList.toggle('collapsed',!!collapsed[id]);});}
function applyZoom(){const z=PHONE&&zoomed;$('mimic').classList.toggle('zoom',z);txt('zoomBtn',z?'Fit':'Zoom');setAttr($('zoomBtn'),'aria-pressed',String(z));
  if(z){const sc=$('mscroll');sc.scrollLeft=Math.max(0,(sc.scrollWidth-sc.clientWidth)*.3);}}

/* ---------- Events ---------- */
function begin(){$('overlay').hidden=true;S.running=true;S.paused=false;acc=0;audio();if(MUS.on&&!MUS.timer)setMusic(true);track('shift_start',{scenario:S.key,mode:S.mode});render(true);}
document.addEventListener('click',e=>{
  const adj=e.target.closest('[data-adj]');if(adj){nudge(adj.dataset.adj,+adj.dataset.d);return;}
  const op=e.target.closest('[data-op]');if(op){if(op.disabled)return;const[t,i,a]=op.dataset.op.split(':');if(op.closest('#qp')&&S){S.qp=false;}issueOp(t+':'+i,a);return;}
  const st=e.target.closest('[data-f]');if(st){adjust(st.dataset.f,st.dataset.id,+st.dataset.d);return;}
  const sl=e.target.closest('[data-sel]');if(sl&&S){select(sl.dataset.sel,!!sl.closest('#mimic'));return;}
  if(S&&S.sel&&e.target.closest&&e.target.closest('#mimic')){select('none');return;}
  const tu=e.target.closest('[data-tut]');if(tu){tutClick(tu.dataset.tut);return;}
  const cw=e.target.closest('[data-crew]');if(cw&&S){if(cw.closest('#qp'))S.qp=false;dispatch(cw.dataset.crew,null);return;}
  const nx=e.target.closest('[data-next]');if(nx){chosen=nx.dataset.next;ls('day',chosen);newGame(chosen);begin();return;}
  const sc=e.target.closest('[data-scn]');if(sc){if(sc.disabled)return;chosen=sc.dataset.scn;ls('day',chosen);document.querySelectorAll('[data-scn]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.scn===chosen));newGame(chosen);return;}
  const md=e.target.closest('[data-mode]');if(md){mode=md.dataset.mode;ls('mode',mode);const sy=$('sheet').scrollTop;if(mode==='career'&&!unlockedK(career(),chosen))chosen=CAREER[0];newGame(chosen);startSheet();$('sheet').scrollTop=sy;return;}
  const sp=e.target.closest('[data-speed]');if(sp){speed=+sp.dataset.speed;document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',b===sp));txt('dSpeed',speed+'×');return;}
  const tg=e.target.closest('[data-tog]');if(tg){const id=tg.dataset.tog;collapsed[id]=!collapsed[id];ls('col',JSON.stringify(collapsed));applyCollapsed();return;}
  const bb=e.target.closest('[data-board]');if(bb){boardDay=bb.dataset.board;document.querySelectorAll('[data-board]').forEach(x=>x.setAttribute('aria-pressed',x===bb));loadBoard();return;}
  const bmo=e.target.closest('[data-bmode]');if(bmo){boardMode=bmo.dataset.bmode;document.querySelectorAll('[data-bmode]').forEach(x=>x.setAttribute('aria-pressed',x===bmo));loadBoard();return;}
  const btn=e.target.closest('button');const id=btn?btn.id:'';
  if(id==='ackBtn'){ackAll();return;}
  if(id==='cookieYes'){setConsent(true);return;}if(id==='cookieNo'){setConsent(false);return;}if(id==='cookieSettings'){$('cookie').hidden=false;return;}
  if(id==='shareBtn'){shareScore();return;}
  if(id==='submitScore'){submitScore();return;}
  if(id==='boardBtn'||id==='sheetBoardBtn'){if(S.running&&!S.ended){S.paused=true;acc=0;}boardFrom=S.ended?'end':$('overlay').hidden?'game':'start';boardMode=S.mode;showBoard(S.key);return;}
  if(id==='boardBack'){if(boardFrom==='end'&&S.ended)showEnd();else if(boardFrom==='game'){$('overlay').hidden=true;render(true);}else startSheet();return;}
  if(id==='muteBtn'){setSound(!SND.on);return;}
  if(id==='musicBtn'){if(!SND.on)setSound(true);setMusic(!MUS.on);return;}
  if(id==='zoomBtn'){zoomed=!zoomed;applyZoom();return;}
  if(id==='qpClose'){S.qp=false;S.sel=null;lastInsp='';render(true);return;}
  if(id==='qpMore'){S.qp=false;lastInsp='';if(PHONE)openSheet();else $('pInsp').scrollIntoView({block:'nearest',behavior:'smooth'});render(true);return;}
  if(id==='inspClose'){S.sel=null;lastInsp='';closeSheet();render(true);return;}
  if(id==='dCtl'){if($('pInsp').classList.contains('open'))closeSheet();else{openSheet();render(true);}return;}
  if(id==='tipOk'){tipOk();return;}
  if(id==='tipSkip'){tipsOn=false;ls('tips','off');tipOk();return;}
  if(id==='dSpeed'){speed=speed===1?2:speed===2?4:1;document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.speed===speed));txt('dSpeed',speed+'×');return;}
  if(id==='dPlay'){$('playBtn').click();return;}
  if(id==='startBtn'){autoPause=$('ovPause').checked;$('autoPause').checked=autoPause;tipsOn=$('ovTips').checked;ls('tips',tipsOn?'on':'off');if(S.key!==chosen||S.t!==START||S.mode!==mode)newGame(chosen);begin();return;}
  if(id==='replayBtn'){newGame(S.key);begin();return;}
  if(id==='againBtn'||id==='newBtn'){if(S.running)S.paused=true;hideTip();newGame(chosen);startSheet();return;}
  if(id==='playBtn'){if(S.ended)return;if(!S.running)begin();else{S.paused=!S.paused;if(!S.paused){hideBanner();if(tipActive)hideTip();}acc=0;render(true);}return;}
  if(id==='resumeBtn'){S.paused=false;acc=0;hideBanner();render(true);return;}
  if(id==='dismissBtn'){hideBanner();return;}
});
$('autoPause').addEventListener('change',e=>autoPause=e.target.checked);
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target&&e.target.id==='pName'){e.preventDefault();submitScore();return;}
  if(e.key==='Escape'&&S&&S.sel){S.sel=null;lastInsp='';closeSheet();render(true);return;}
  const g=e.target.closest&&e.target.closest('[data-adj],[data-sel]');
  if(g&&g.tagName!=='BUTTON'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();g.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
  if(e.code==='Space'&&$('overlay').hidden&&!/INPUT|BUTTON|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();$('playBtn').click();}});
document.addEventListener('fc:pause',()=>{if(S&&S.running&&!S.ended&&!S.paused){S.paused=true;acc=0;render(true);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)humTo(0);});
addEventListener('resize',()=>{if(S)renderQP();});
MQ.addEventListener('change',()=>{PHONE=MQ.matches;applyZoom();if(!PHONE)closeSheet();if(S)render(true);});

if(!SCENARIOS[chosen])chosen=CFG.def;
document.title=CFG.docTitle;document.querySelectorAll('.bar .mode-tag').forEach(e=>e.textContent=CFG.tag);
{const h=$('hdrOther');if(h){h.href=CFG.other.url;h.textContent=CFG.other.hdr;}const f=$('otherGame');if(f){f.href=CFG.other.url;f.textContent=CFG.other.foot;}}
if(!VF_ON){const l=$('lgVF');if(l)l.remove();}if(!CREW_ON){const l=$('lgMan');if(l)l.remove();}
txt('clock',fmtT(START));txt('dClock',fmtT(START));
setSound(SND.on);applyCollapsed();{const b=$('musicBtn');if(b){b.setAttribute('aria-pressed',String(MUS.on));b.classList.toggle('on',MUS.on);}}
if(GAME==='cr'&&/(^|[?&#])demo\b/.test(location.search+location.hash))setTimeout(()=>tutStart(true,true),300);newGame(chosen);startSheet();initConsent();requestAnimationFrame(frame);
window.__fc={get S(){return S;},run(n){for(let i=0;i<n&&S&&!S.ended;i++)step();render(true);},op(k,a){issueOp(k,a);},select};
})();
