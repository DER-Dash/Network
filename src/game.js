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
// Domain lock: the published pages only run on der-dash.github.io. build.py turns SITE_LOCK on for the
// GitHub Pages copies; the standalone copies in build/ (tests, previews) stay unlocked.
const HOME_HOST='der-dash.github.io',SITE_LOCK=false;
if(SITE_LOCK&&!/^(der-dash\.github\.io|localhost|127\.0\.0\.1)$/i.test(location.hostname)){siteLock();return;}
function siteLock(){try{document.title=CFG.docTitle;document.body.className='';document.body.innerHTML=`<main class="sitelock" style="max-width:34rem;margin:12vh auto;padding:0 16px;text-align:center">
  <svg viewBox="0 0 100 100" width="72" height="72" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#0B1F3A"/><circle cx="50" cy="50" r="38" fill="none" stroke="#FFD23F" stroke-width="5"/><path d="M56 20 L32 55 H47 L42 80 L68 45 H53 L60 20 Z" fill="#FFD23F"/></svg>
  <h1 style="margin:16px 0 8px">${CFG.share}</h1><p>This is a copy of the game running on another website. Scores and feedback only work on the original.</p>
  <p style="margin-top:20px"><a class="btn primary big" href="${CFG.site}" target="_top" rel="noopener">Play the original at ${HOME_HOST} →</a></p>
  <p class="fine" style="margin-top:24px">© 2026 Steve Backhouse. All rights reserved.</p></main>`;}catch(e){}}
let R=60,START=CFG.start,END=CFG.end;const TAU=45,TRIP_T=140,SOC_MAX=60;
const CUST_TOTAL=60000,SHORT_INT=3,CREW_ON=GAME==='cr',MANUAL=['tie','it','nop','lk','mid','mg'],CREW_SPEED=70,CREW_OP=2,DEPOT={x:1150,y:62};
// 11 kV fault finding, auto-reclose and mobile generators (control room only)
const LV_ON=GAME==='cr',SECF=[.5,.5],PATROL=60,TRIAL_PTS=50,MG_N=2,MG_CAP=8,MG_CONN=45;
const LF_OH={hw:[0,1,1],ml:[0,1,1],rv:[0,1,1],js:[0,1,1],kc:[0,0,1]};// 1 = overhead line (auto-reclose), 0 = underground cable
const OH_CAUSES=['Tree branch blown onto the line','Lightning strike','Conductor clash in the wind','Bird contact on the line','Broken insulator'];
const CABLE_CAUSES=['Cable joint failure','Third-party dig-in','Cable insulation failure'];
// Priority customers (control room only): a hospital, care homes and Priority Services Register customers on some
// 11 kV feeders. While their half of the feeder is off supply they cost pts a minute on top of the usual CI/CML.
const PRIO_ON=GAME==='cr';
const PRK={hosp:{label:'Hospital',ch:'H',pts:25},care:{label:'Care home',ch:'C',pts:15},psr:{label:'Priority Services Register customers',ch:'P',pts:10}};
const PRIO={hw1:{kind:'hosp',name:'Kings Hill Hospital',sec:1},ml2:{kind:'care',name:'Mill Lane Care Home',sec:0},rv1:{kind:'psr',name:'Resistor Row PSR customers',sec:1},js2:{kind:'care',name:'Watt Way Care Home',sec:1},kc1:{kind:'psr',name:'Close South PSR customers',sec:0}};
const prioOf=(p,i)=>PRIO_ON?PRIO[p+i]||null:null;
const prioTxt=P=>`${P.name}: ${P.kind==='psr'?'on':'fed from'} the ${P.sec?'second':'first'} half · ${PRK[P.kind].pts} extra points a minute while off`;
const SECN=['first half (breaker to mid-point switch)','second half (beyond the mid-point switch)'];
// Customer calls (control room only): customers ring in when their supply is lost. Some calls on an 11 kV fault say what
// the caller saw or heard, which points to the faulted half. On some 11 kV faults the substation RTU is slow to report
// the trip, so the calls come before the alarm: poll the RTU to get the trip through.
const CALLS_ON=GAME==='cr',CALL_MAX=6,TELE_P=.35,TELE_MIN=14,TELE_VAR=10;
const ROADS=['Road','Lane','Close','Gardens','Avenue','Crescent','Way','Drive','Terrace','Mews','Grove','Rise'];
const ROADN=['Amp','Coil','Diode','Faraday','Fuse','Gauss','Henry','Joule','Kelvin','Lumen','Maxwell','Ohm','Pylon','Relay','Siemens','Spark','Tesla','Volta','Weber','Dynamo'];
const CALL_TXT=['No power at all here.','The lights have just gone out. Is there a power cut?','Everything has gone off, and the whole street is dark.','My neighbours are off too.','Power\'s gone. I\'ve got a freezer full of food.','Is there a problem? We\'ve lost everything.','The electric\'s off. Any idea how long?','We\'ve no power. The street lights are out as well.'];
const HINT_OH=['Heard a loud bang from the pole at the end of the road, then the lights went.','There\'s a big branch lying across the overhead wires.','Saw a blue flash and sparks up on the line, then everything went off.','One of the wires on the poles is hanging down low over the field.'];
const HINT_UG=['There\'s a smell of burning from the pavement, and the power went at the same time.','Workmen were digging by the junction, there was a bang, and everything went off.','Smoke is coming out of a crack in the footpath outside.'];
const HINT_PRIO={hosp:'Estates manager at Kings Hill Hospital: we\'ve lost the mains and we\'re running on our standby generators.',care:'Calling from the care home: the power\'s off and we have residents on oxygen concentrators.',psr:'I\'m on the Priority Services Register. My medical equipment has gone onto its battery.'};
const EMERG=1.2,EMERG_MIN=30,SHORT=1.5,SHORT_MIN=5,PAR_MAX=30,OV_MIN=10,INCIDENT_PTS=500,AL_ON=.8,AL_OFF=.75;
const RATE={1:CFG.rate,2:CFG.rate*2,4:CFG.rate*4};
const ISO_A=25;// easy shifts: minutes per fault that customers can be left off and still get an A
const isManual=k=>CREW_ON&&MANUAL.includes(k.split(':')[0]);
const CAREER=GAME==='cr'?['quiet','grid','storm','heat','jan','ev','snow','xmas','gsp','mesh','endure']:['may','storm','jan'];
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
  {id:'endure',name:'Weathered it',d:'Grade A or B on Storm endurance.',cr:1},
  {id:'dry',name:'Dry feet',d:'On Christmas Day, make the Ohm No switchboard dead before the flood water reaches it.',cr:1},
  {id:'gsp',name:'Grid guardian',d:'Finish the Grid emergency without National Grid disconnecting a transformer.',cr:1},
  {id:'cheap',name:'Bargain hunter',d:'Finish a generation shift spending under £2,000.',fc:1},
  {id:'textbook',name:'Textbook',d:'Grade A on every career shift.'}].filter(a=>GAME==='cr'?!a.fc:!a.cr);
function career(){try{return JSON.parse(ls('career')||'null')||{stars:{},ach:{},best:{}};}catch(e){return{stars:{},ach:{},best:{}};}}
function saveCareer(c){ls('career',JSON.stringify(c));}
const starsOf=c=>CAREER.reduce((a,k)=>a+(c.stars[k]||0),0);
const rankOf=n=>{let r=RANKS[0][1];RANKS.forEach(([t,nm])=>{if(n>=t)r=nm;});return r;};
const nextRank=n=>RANKS.find(([t])=>t>n);
// Shifts added to the career later. A shift after one of these still unlocks from the shift before it,
// so existing careers keep what they had unlocked.
const CAREER_ADDED=['ev','xmas'];
const unlockedK=(c,k)=>{let i=CAREER.indexOf(k);if(i<=0)return true;if(!CAREER_ADDED.includes(k))while(i>1&&CAREER_ADDED.includes(CAREER[i-1]))i--;return CAREER.slice(i-1).some(j=>(c.stars[j]||0)>=1);};
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

// A cold winter weekday: shared by Cold Thursday in both games and the EV evening shift
const COLD_EVE=[[0,80],[4,72],[6,78],[7.5,106],[9,116],[11,112],[13,110],[15,114],[16.5,134],[17.5,150],[18.5,146],[20,130],[21.5,112],[23,94],[24,84]];
const SCENARIOS={
  quiet:{color:'var(--ok)',diff:1,title:'Quiet shift',when:'Wednesday 14 October',focus:'Easy faults · first switching',soc0:0,nbShape:'demand',noGen:true,easy:true,faults:2.5,
    blurb:'A mild autumn day with no generation and no planned work. Faults are found straight away and repaired quickly, so every one is a simple switching job. If a substation feeder trips, send a crew to close its tie or an interconnector. If an 11 kV feeder trips, the fault is in the far half: open the mid-point switch and close the breaker. Put things back once repairs are done.',
    demand:[[0,62],[4,56],[6,60],[7.5,80],[9,88],[11,84],[13,82],[15,86],[16.5,98],[17.5,106],[18.5,104],[20,94],[21.5,82],[23,70],[24,64]],
    solar:{peak:0,start:7.2,end:17.8,cloud:0},wind:{mean:0,var:0},
    causes:['Cable joint failure','Insulator flashover','Bird strike on the overhead line','Tree contact on the overhead line'],
    build(r){return{events:[],cutout:null,risk:[]};}},
  grid:{color:'var(--mv)',diff:1,title:'Switching shift',when:'Tuesday 8 December',focus:'Switching only',soc0:0,nbShape:'demand',noGen:true,
    blurb:'No generation and no flexibility, just switching. T3 is out for maintenance in the afternoon and the evening peak pushes past firm capacity. Move load between substations and onto the neighbours.',
    demand:[[0,88],[4,78],[6,84],[7.5,114],[9,124],[11,118],[13,116],[15,122],[16.5,144],[17.5,160],[18.5,156],[20,140],[21.5,120],[23,100],[24,92]],
    solar:{peak:0,start:7.8,end:16.2,cloud:0},wind:{mean:0,var:0},faults:2.5,nb:{kn:{base:72,dip:26},fm:{base:70,dip:24}},
    causes:['Cable joint failure','Insulator flashover','Tree contact on the overhead line','Digger strike on the underground cable'],
    build(r){return{events:[{tx:2,start:780,end:900,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:1020,end:1190,mult:2,label:'Freezing fog'}]};}},
  storm:{color:'var(--c-storm)',diff:2,title:'Storm day',when:'Monday 2 November',focus:'Faults and switching',soc0:30,nbShape:'demand',
    blurb:'Two bands of gale-force wind bring faults on transformers and feeders, and gusty wind output can shut down without warning. Expect to switch.',
    demand:[[0,72],[4,64],[6,70],[7.5,98],[9,112],[12,102],[15,106],[16.5,124],[17.5,142],[18.5,140],[20,124],[22,96],[24,74]],
    solar:{peak:90,start:6.9,end:17.1,cloud:.35},wind:{mean:48,var:14},faults:4,
    causes:['Wind-borne debris on the overhead line','Tree contact on the overhead line','Conductor clash in high wind','Lightning strike on the overhead line'],
    build(r){const a=540+Math.round(r()*120),b=900+Math.round(r()*90),s=1005+Math.round(r()*90);
      return{events:[],cutout:{start:s,end:s+75},risk:[{start:a,end:a+180,mult:3,label:'Severe gale'},{start:b,end:b+180,mult:3,label:'Severe gale'}]};}},
  heat:{color:'var(--c-solar)',diff:2,title:'Heatwave',when:'Thursday 17 July',focus:'Derated network',soc0:0,nbShape:'demand',noGen:true,derate:.85,
    blurb:'Hot ground and air cut every rating by 15%: each transformer is good for 51 MW, and feeders, ties and interconnectors carry less. Air conditioning pushes the peak into the afternoon, when hot cable joints are most likely to fail.',
    demand:[[0,70],[4,62],[6,66],[8,84],[10,100],[12,112],[14,122],[15.5,127],[17,124],[18.5,116],[20,104],[22,88],[24,74]],
    solar:{peak:0,start:5,end:21,cloud:0},wind:{mean:0,var:0},faults:2.5,nb:{kn:{base:60,dip:22},fm:{base:56,dip:20}},
    causes:['Cable joint failure in hot ground','Overheated cable termination','Insulator flashover','Digger strike on the underground cable'],
    build(r){return{events:[],cutout:null,risk:[{start:720,end:1020,mult:2.5,label:'Extreme heat'}]};}},
  jan:{color:'var(--c-cold)',diff:3,title:'Cold Thursday',when:'Thursday 14 January',focus:'Peak demand',soc0:45,nbShape:'demand',
    blurb:'A cold, still evening peak pulls hard on the transformers and the neighbouring networks. T1 is out for maintenance in the morning, when icy lines are most likely to fault.',
    demand:COLD_EVE,
    solar:{peak:35,start:7.8,end:16.2,cloud:.2},wind:{mean:22,var:12},faults:2,
    causes:['Ice build-up on the overhead line','Conductor clash in icy wind','Cable joint failure','Insulator flashover'],
    build(r){return{events:[{tx:0,start:570,end:750,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:480,end:600,mult:3,label:'Ice and snow'}]};}},
  ev:{color:'var(--c-batt)',diff:3,title:'EV evening',when:'Monday 7 December',focus:'Late surge · look-ahead reads low',start:600,end:1320,soc0:45,nbShape:'demand',
    blurb:'A cold Monday and the first hard frost since half of Blackout Canyon bought an electric car. Until 17:00 it looks like an ordinary cold evening. Then everyone gets home and plugs in at once, and the surge comes later and bigger than the look-ahead shows: it only knows about the chargers it has seen before. T3 is back from maintenance at 17:15. Get it in service, and get load onto the neighbours, before the surge rather than during it.',
    demand:COLD_EVE,surge:{start:17,peak:18.75,end:21.75,mw:24,seen:.35},
    solar:{peak:35,start:7.8,end:16.2,cloud:.2},wind:{mean:22,var:12},faults:2,
    causes:['Ice build-up on the overhead line','Overheated cable joint under EV load','Cable joint failure','Insulator flashover'],
    tips:{risk:'On this shift the look-ahead under-reads the EV surge. Treat its 18:00–20:00 forecast as a floor: get T3 back, move substations onto the neighbours and arm flex before 17:00, not when the alarms start.',
      sub:'Under the EV surge every tie and interconnector is near its limit. Restore through the route with the most headroom, and check the neighbours\' spare capacity before closing.'},
    build(r){return{events:[{tx:2,start:840,end:1035,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:1020,end:1200,mult:2,label:'Hard frost'}]};}},
  snow:{color:'var(--c-cold)',diff:3,title:'Snow day',when:'Friday 4 December',focus:'Generation, switching and 11 kV links',soc0:40,nbShape:'demand',links:true,vfi:[1],
    blurb:'Heavy snow and the biggest peak of the winter. The Ohm No feeder is out for planned work over lunch. New 11 kV links join neighbouring substations: open a feeder breaker and close its link to move that feeder next door. Use them with generation, the battery and Volt Face to ride the evening peak.',
    demand:[[0,90],[4,80],[6,86],[7.5,116],[9,128],[11,122],[13,120],[15,126],[16.5,148],[17.5,164],[18.5,160],[20,144],[21.5,124],[23,104],[24,94]],
    solar:{peak:25,start:8,end:15.8,cloud:.3},wind:{mean:30,var:14},faults:2.5,
    causes:['Snow loading on the overhead line','Conductor clash in heavy snow','Cable joint failure','Snow-laden branch on the overhead line'],
    build(r){return{events:[{fd:'rv',start:600,end:840,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:900,end:1140,mult:3,label:'Heavy snow'}]};}},
  // Christmas Day: low demand and one crew. The River Ohm rises towards the 11 kV switchgear in the basement at Ohm No:
  // if the switchboard is still live when the water reaches it, it flashes over and trips.
  xmas:{color:'var(--c-cold)',diff:2,title:'Christmas Day',when:'Friday 25 December',focus:'One crew · flood warning',sky:.6,soc0:0,nbShape:'demand',noGen:true,links:true,crews:1,faults:2,
    blurb:'Low demand, one crew on call and turkeys in every oven by 11:00. After two days of rain the River Ohm is rising towards the 11 kV switchgear in the basement at Ohm No. If the water reaches it while it is still live, it trips. Move Ohm No\'s customers onto other supplies and make the switchboard dead before the water gets there, with only one crew to do the manual switching.',
    demand:[[0,64],[4,56],[6,58],[8,66],[9.5,84],[11,100],[12.25,106],[13.5,96],[15,86],[16.5,94],[17.5,98],[19,94],[21,86],[23,74],[24,66]],
    solar:{peak:0,start:8,end:16,cloud:0},wind:{mean:0,var:0},nb:{kn:{base:70,dip:16},fm:{base:68,dip:14}},
    causes:['Tree contact on the overhead line','Waterlogged cable joint failure','Insulator flashover in heavy rain','Cable joint failure'],
    tips:{risk:'Demand is low on Christmas Day, so the network is rarely at risk. Spend the slack moving Ohm No before the flood, not after.',
      lvfind:'With one crew, every trip counts. Use the callers\' reports to tell which half is faulted, and send the crew straight to the mid-point switch.'},
    build(r){const at=765+Math.round(r()*50);return{events:[],cutout:null,risk:[{start:480,end:1200,mult:1.5,label:'Heavy rain'}],
      flood:{p:'rv',warn:570,at,end:at+210+Math.round(r()*40)}};}},
  gsp:{color:'var(--alarm)',diff:3,title:'Grid emergency',when:'Wednesday 13 January',focus:'Cut demand at the GSP',soc0:0,nbShape:'demand',noGen:true,
    gsp:{warn:900,start:930,deadline:955,end:1110,limit:100},
    blurb:'At 15:30 Steve Towers loses a supergrid transformer. National Grid will instruct you to hold Blackout Canyon and Ampy Place to 100 MW at the grid supply point until 18:30. Ampy Place is on the same grid supply, so moving load there does not help.',
    demand:[[0,84],[4,74],[6,80],[7.5,110],[9,120],[11,114],[13,112],[15,118],[16.5,140],[17.5,154],[18.5,150],[20,134],[21.5,116],[23,96],[24,88]],
    solar:{peak:0,start:7.8,end:16.2,cloud:0},wind:{mean:0,var:0},faults:1.5,nb:{kn:{base:70,dip:24},fm:{base:72,dip:22}},
    causes:['Cable joint failure','Insulator flashover','Conductor clash in icy wind','Digger strike on the underground cable'],
    build(r){return{events:[],cutout:null,risk:[{start:1080,end:1200,mult:2,label:'Freezing fog'}]};}},
  mesh:{color:'var(--c-kn)',diff:3,title:'Interconnected',when:'Friday 22 January',focus:'Switching · 5 substations',soc0:0,nbShape:'demand',noGen:true,mesh:true,
    blurb:'Kilowatt Close joins the network, normally fed through Shocking Place, with a backup route from Ohm No. The Shocking Place feeder is out for planned work all morning, and the evening peak is the biggest yet. No generation, just switching.',
    demand:[[0,92],[4,82],[6,88],[7.5,120],[9,132],[11,126],[13,122],[15,128],[16.5,152],[17.5,174],[18.5,170],[20,152],[21.5,128],[23,106],[24,96]],
    solar:{peak:0,start:7.8,end:16.2,cloud:0},wind:{mean:0,var:0},faults:3,nb:{kn:{base:76,dip:28},fm:{base:74,dip:26}},
    shares:{hw:.24,ml:.17,rv:.20,js:.20,kc:.19},
    causes:['Cable joint failure','Insulator flashover','Digger strike on the underground cable','Tree contact on the overhead line'],
    build(r){return{events:[{fd:'ml',start:540,end:720,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:960,end:1140,mult:2,label:'Heavy snow'}]};}},
  endure:{color:'var(--c-storm)',diff:3,title:'Storm endurance',when:'Tuesday 3 November',focus:'18-hour storm shift',start:360,end:1440,soc0:30,nbShape:'demand',links:true,
    blurb:'The storm stalls over Blackout Canyon and you have the whole of it: 06:00 to midnight. Three bands of severe gale, strong wind in between, the wind farm cutting out and no planned work to hide behind. The 11 kV links and Volt Face are there when the ties run out. Pace yourself.',
    demand:[[0,74],[4,66],[6,72],[7.5,100],[9,114],[12,104],[15,108],[16.5,128],[17.5,146],[18.5,144],[20,128],[22,100],[24,78]],
    solar:{peak:60,start:7,end:16.6,cloud:.45},wind:{mean:50,var:14},faults:7,
    causes:['Wind-borne debris on the overhead line','Tree contact on the overhead line','Conductor clash in high wind','Lightning strike on the overhead line','Fallen tree on the overhead line'],
    build(r){const a=420+Math.round(r()*60),b=780+Math.round(r()*90),c=1140+Math.round(r()*60),s=900+Math.round(r()*120);
      return{events:[],cutout:{start:s,end:s+90},risk:[{start:360,end:1440,mult:1.5,label:'Strong wind'},{start:a,end:a+180,mult:3,label:'Severe gale'},{start:b,end:b+180,mult:3,label:'Severe gale'},{start:c,end:c+180,mult:3,label:'Severe gale'}]};}}
};

const SCENARIOS_FC={
  may:{color:'var(--c-solar)',diff:1,title:'Sunny Sunday',when:'Sunday 17 May',focus:'Reverse power flow',soc0:20,nbShape:'solar',
    blurb:'Low demand and strong sun push power back up into the grid. T2 is out for maintenance through the middle of the day, and thunderstorms may build in the afternoon.',
    demand:[[0,50],[4,45],[6,47],[8,58],[10,68],[12,74],[14,73],[16,76],[18,92],[19.5,104],[21,98],[22.5,78],[24,56]],
    solar:{peak:165,start:5.5,end:20.5,cloud:.07},wind:{mean:32,var:12},faults:1.5,
    causes:['Lightning strike on the overhead line','Tree contact on the overhead line','Bird strike on the overhead line','Insulator flashover'],
    build(r){const s=780+Math.round(r()*180);return{events:[{tx:1,start:600,end:900,planned:true,cause:'Planned maintenance'}],cutout:null,
      risk:[{start:s,end:s+180,mult:4,label:'Thunderstorm risk'}]};}},
  storm:{color:'var(--c-storm)',diff:2,title:'Storm day',when:'Monday 2 November',focus:'Faults and swings',soc0:30,nbShape:'demand',
    blurb:'Two bands of gale-force wind make line faults far more likely, and gusty wind output can shut down without warning. Both directions matter.',
    demand:[[0,72],[4,64],[6,70],[7.5,98],[9,112],[12,102],[15,106],[16.5,124],[17.5,142],[18.5,140],[20,124],[22,96],[24,74]],
    solar:{peak:90,start:6.9,end:17.1,cloud:.35},wind:{mean:48,var:14},faults:3,
    causes:['Wind-borne debris on the overhead line','Tree contact on the overhead line','Conductor clash in high wind','Lightning strike on the overhead line'],
    build(r){const a=420+Math.round(r()*180),b=900+Math.round(r()*120),s=1005+Math.round(r()*105);
      return{events:[],cutout:{start:s,end:s+75},risk:[{start:a,end:a+180,mult:3,label:'Severe gale'},{start:b,end:b+180,mult:3,label:'Severe gale'}]};}},
  jan:{color:'var(--c-cold)',diff:3,title:'Cold Thursday',when:'Thursday 14 January',focus:'Peak demand',soc0:45,nbShape:'demand',
    blurb:'A cold, still evening peak pulls hard on the transformers. T1 is out for maintenance in the morning, when icy lines are most likely to fault. Watch the battery charge.',
    demand:COLD_EVE,
    solar:{peak:35,start:7.8,end:16.2,cloud:.2},wind:{mean:22,var:12},faults:1.5,
    causes:['Ice build-up on the overhead line','Conductor clash in icy wind','Cable joint failure','Insulator flashover'],
    build(r){return{events:[{tx:0,start:570,end:750,planned:true,cause:'Planned maintenance'}],cutout:null,risk:[{start:360,end:540,mult:3,label:'Ice and snow'}]};}}};
if(SCENARIOS.jan)SCENARIOS.tut={...SCENARIOS.jan,hidden:true,title:'Tutorial · Cold Thursday',focus:'Learn the control room',faults:0,
  blurb:'Cold Thursday, 15:30: the evening peak is building. Learn generation, flexibility and switching on the real network.',build(r){return{events:[],cutout:null,risk:[]};}};
if(GAME==='fc'){Object.keys(SCENARIOS).forEach(k=>delete SCENARIOS[k]);Object.assign(SCENARIOS,SCENARIOS_FC);}
// Handover notes: a short note from the engineer going off shift, shown before each career shift starts
const HANDOVER=GAME==='cr'?{
  quiet:{from:'Pat, night shift',text:'Quiet night, nothing tripped. Everything is in its normal running arrangement and all three crews are back at the depot. Kings Hill Hospital is on the far half of the Kings Hill feeder, so if that one locks out, get the far half back first.'},
  grid:{from:'Pat, night shift',text:'No flexibility contracts today, so it\'s switching or nothing. T3 comes out for maintenance at 13:00 and freezing fog is forecast from 17:00. Decide where each substation goes before T3 comes out, not after.'},
  storm:{from:'Pat, night shift',text:'The wind is picking up, with one band of severe gale due in the morning and another in the afternoon. Spinney Windy Things will cut out if the gusts get too strong. Send a crew to stand by at a tie before each band arrives.'},
  heat:{from:'Jo, night shift',text:'It never cooled down overnight. The cables are still warm and every rating is down 15%. The heat peaks between 12:00 and 17:00, which is when the cable joints go, and Ampy Place and Watts This have less spare than usual.'},
  jan:{from:'Jo, night shift',text:'Icy night, and the lines are still carrying ice. T1 comes out for maintenance at 09:30, right after the worst of it, and is back at 12:30. Don\'t let the evening peak catch you with the battery flat.'},
  ev:{from:'Sam, early shift',text:'Feels like a normal cold Monday, but there are far more electric cars about than last winter. T3 comes out at 14:00 and isn\'t back until 17:15. Last Monday the look-ahead said 18:00 would be fine, and it wasn\'t. Don\'t trust it after 17:00.'},
  snow:{from:'Jo, night shift',text:'Snow all night, and heavier snow is forecast from 15:00. The Ohm No feeder comes out at 10:00 for four hours of planned work, so move Ohm No before field staff open it. The new 11 kV links are commissioned and ready to use.'},
  xmas:{from:'Pat, night shift',text:'Merry Christmas. Quiet night and demand will stay low, but there\'s only one crew on call today, so think before you send them anywhere. The River Ohm has been rising since midnight. The 11 kV switchgear at Ohm No is in the basement, so watch for a flood warning and have a plan for Ohm Street, Resistor Row and Circuit Park.'},
  gsp:{from:'Jo, night shift',text:'National Grid rang about a supergrid transformer at Steve Towers that has been gassing. Nothing official yet, but if it fails they\'ll want demand cut fast. Know how much Watts This and Volt Face can take before the afternoon.'},
  mesh:{from:'Pat, night shift',text:'Kilowatt Close is live, fed through Shocking Place with a backup route from Ohm No. The Shocking Place feeder comes out at 09:00 for planned work, so sort out both of them first thing. Close South has Priority Services Register customers: don\'t leave them off.'},
  endure:{from:'Pat, night shift',text:'Three trips since midnight, all repaired and back to normal running, and it\'s getting worse, not better. Three crews have to cover the whole storm, so plan their trips. Use the quiet spells to put the network back to normal.'}}
:{
  may:{from:'Sam, night shift',text:'Clear skies, so the solar farm will be flat out by mid-morning while demand stays low. T2 comes out for maintenance at 10:00 and is out through the solar peak until 15:00. Thunderstorms may build in the afternoon.'},
  storm:{from:'Sam, night shift',text:'Two bands of severe gale are on the way. Spinney Windy Things may cut out in the gusts, so don\'t count on the wind farm. Watch both directions: export while it\'s blowing, import when it stops.'},
  jan:{from:'Jo, night shift',text:'Ice on the lines overnight, and more is forecast until 09:00. T1 comes out for maintenance at 09:30 and is back at 12:30. Keep the battery charged for the evening peak.'}};
function handoverSheet(){const h=HANDOVER[S.key],sc=S.sc,n=CAREER.indexOf(S.key)+1;
  let ho=$('hoOverlay');if(!ho){ho=document.createElement('div');ho.id='hoOverlay';ho.className='overlay';ho.setAttribute('role','dialog');ho.setAttribute('aria-modal','true');ho.setAttribute('aria-label','Handover');ho.innerHTML='<div class="sheet" id="hoSheet"></div>';document.body.appendChild(ho);}
  $('hoSheet').innerHTML=`${BAND}<div class="handover" style="--sc:${sc.color}">
    <p class="ho-eyebrow">Shift ${n} · ${esc(sc.title)} · ${esc(sc.when)}</p>
    <h2>Handover</h2>
    <figure class="ho-note"><blockquote>${esc(h.text)}</blockquote><figcaption>${esc(h.from)}, ${fmtT(START)}</figcaption></figure>
    <p class="fine">It's also in the event log if you need it later.</p>
    <div class="ho-go"><button type="button" class="btn" id="hoBack">Back</button><button type="button" class="btn primary big" id="hoGo">Take the handover · start at ${fmtT(START)}</button></div></div>`;
  $('overlay').hidden=true;ho.hidden=false;ho.scrollTop=0;const g=$('hoGo');if(g)g.focus();}
const hideHO=()=>{const ho=$('hoOverlay');if(ho)ho.hidden=true;};

/* ---------- Network ---------- */
const PR={
  hw:{id:'hw',name:'Hertz House',share:.30,nb:'kn',tie:45,fr:70,x1:110,x2:320,fx:215},
  ml:{id:'ml',name:'Shocking Place',share:.20,nb:'kn',tie:40,fr:170,x1:370,x2:560,fx:465},
  rv:{id:'rv',name:'Ohm No',share:.25,nb:'fm',tie:40,fr:80,x1:610,x2:830,fx:715},
  js:{id:'js',name:'Joule Street',share:.25,nb:'fm',tie:45,fr:70,x1:880,x2:1060,fx:970}};
PR.kc={id:'kc',name:'Kilowatt Close',share:.19,nb:null,fd:false,x1:500,x2:760,fx:600,y:GAME==='cr'?588:558,lx:540};
['hw','ml','rv','js'].forEach(p=>PR[p].fd=true);
let PIDS=['hw','ml','rv','js'];
const NBS={kn:{id:'kn',name:'Ampy Place',same:true,base:65,dip:25},fm:{id:'fm',name:'Watts This',same:false,base:60,dip:22},vf:{id:'vf',name:'Volt Face',same:false,base:52,dip:14}};
let VFI=[1,2];const VF_ON=GAME==='cr';
const LINKS={hm:{a:['hw',2],b:['ml',0],r:15},mr:{a:['ml',2],b:['rv',0],r:15},rj:{a:['rv',2],b:['js',0],r:15}};let LKIDS=[];
const grpOf=s=>!s||s==='off'?null:s==='fm'?'wt':'st';
const ITS={hm:{id:'hm',a:'hw',b:'ml',x:345,r:30},mr:{id:'mr',a:'ml',b:'rv',x:585,r:30},rj:{id:'rj',a:'rv',b:'js',x:855,r:30}};
ITS.mk={id:'mk',a:'ml',b:'kc',x:520,sy:GAME==='cr'?499:449,r:40,v:true,nc:true,left:true};ITS.rk={id:'rk',a:'rv',b:'kc',x:690,sy:GAME==='cr'?499:449,r:40,v:true};
let ITIDS=['hm','mr','rj'];
const pY=p=>PR[p].y||PY;
const TIESW={hw:{x:75,y:330,path:'M110 330 H40',lx:48,ly:354,anc:'start'},
  ml:{x:210,y:603,path:'M380 330 V603 H40',lx:210,ly:625,anc:'middle'},
  rv:{x:1090,y:633,path:'M830 330 V633 H1160',lx:1090,ly:655,anc:'middle'},
  js:{x:1110,y:330,path:'M1060 330 H1160',lx:1152,ly:354,anc:'end'}};
const TXX=[460,600,740],BCY=200,PY=330;
const SECS={B1:{tx:[0],x1:180,x2:521},B2:{tx:[1],x1:539,x2:661},B3:{tx:[2],x1:679,x2:1000}};
const FSEC={hw:'B1',ml:'B1',rv:'B3',js:'B3'},BSX={'12':530,'23':670},BSIDS=['12','23'];
const isBC=n=>n[0]==='I',isSrcN=n=>n==='kn'||n==='fm'||isBC(n);
const SERVICES=[
  {id:'solar',prim:'ml',ic:'solar',tc:'var(--c-solar)',name:'Shocking Place Solar Farm',kind:'Solar farm',dir:'export',arm:0,use:60,gen:true,ramp:15,fail:.05,allow:90},
  {id:'wind',prim:'rv',ic:'wind',tc:'var(--c-wind)',name:'Spinney Windy Things',kind:'Wind farm',dir:'export',arm:0,use:85,cap:60,gen:true,ramp:10,fail:.05,allow:50},
  {id:'bchg',prim:'hw',ic:'batt',tc:'var(--c-batt)',name:'Kings Hill Battery',kind:'Battery charging',dir:'export',arm:6,use:35,cap:30,soc:true,ramp:30,fail:.03},
  {id:'bdis',prim:'hw',ic:'batt',tc:'var(--c-batt)',name:'Kings Hill Battery',kind:'Battery discharging',dir:'import',arm:6,use:90,cap:30,soc:true,ramp:30,fail:.03},
  {id:'chp',prim:'rv',ic:'gas',tc:'var(--c-gas)',name:'Ohm No CHP',kind:'Gas engine',dir:'import',arm:8,use:140,cap:25,ramp:8,fail:.10},
  {id:'dsr',prim:'hw',ic:'dsr',tc:'var(--c-dsr)',name:'Hertz House Industrial Estate',kind:'Demand response',dir:'import',arm:5,use:200,cap:15,ramp:5,fail:.12},
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
const LFN={hw:['Town Centre','Kings Hill','Hertz House Park'],ml:['Marsh Road','Station','Mill Lane'],rv:['Ohm Street','Resistor Row','Circuit Park'],js:['High Street','Joule Park','Watt Way'],kc:['Close North','Close South','Ampere Avenue']};
const LDX=GAME==='cr'?[-26,0,26]:[-22,0,22],LVD=GAME==='cr'?18:0,TXD=58,lfOn=p=>S.lf[p].reduce((a,on,i)=>a+(on?LF[p][i]:0),0);
function linkOf(p,i){for(const k of LKIDS){const L=LINKS[k];if(L.a[0]===p&&L.a[1]===i)return{k,q:L.b[0],j:L.b[1]};if(L.b[0]===p&&L.b[1]===i)return{k,q:L.a[0],j:L.a[1]};}return null;}
const subOn=(p,sup)=>{const v=(sup||S.supNow||S.sup||{})[p];return !!v&&v!=='off';};
// 33/11 kV transformer at each substation, fed through an automatic 33 kV breaker. With it open (or tripped)
// the 33 kV bar stays live but the 11 kV feeders lose their supply from the substation.
const ptOn=p=>!S.pt||!S.pt[p]||S.pt[p].closed,subLv=(p,sup)=>subOn(p,sup)&&ptOn(p);
// where an 11 kV feeder gets its supply: its own substation, Volt Face, the substation at the other end of an 11 kV link, or nowhere
// Each 11 kV feeder has two halves split by a mid-point switch: half 0 is next to the substation breaker,
// half 1 is the far end, where the Volt Face backfeed, the 11 kV link and a mobile generator connect.
const midOn=(p,i)=>!S.mid||!S.mid[p]||S.mid[p][i]!==false;
const mgAt=k=>(S.mgu||[]).find(u=>u.site===k);
const mgOn=(p,i)=>{const u=mgAt(p+i);return !!(u&&u.conn);};
function farSrc(p,i,sup){if(VF_ON&&VFI.includes(i)&&S.nop[p][i])return'vf';
  const l=linkOf(p,i);if(l&&S.lk[l.k]&&S.lf[l.q]&&S.lf[l.q][l.j]&&midOn(l.q,l.j)&&subLv(l.q,sup))return l.q;
  if(mgOn(p,i))return'mg';return null;}
function secFeed(p,i,s,sup){if(!S.lf[p])return null;const mid=midOn(p,i);
  if(S.lf[p][i]){const n=subLv(p,sup)?p:null;return s===0||mid?n:farSrc(p,i,sup);}
  return s===1||mid?farSrc(p,i,sup):null;}
function feedOf(p,i,sup){const a=secFeed(p,i,0,sup);return a!==null?a:secFeed(p,i,1,sup);}
const secOff=(p,i)=>[0,1].filter(s=>secFeed(p,i,s)===null);
function dem(c,p){let f=0;PIDS.forEach(q=>LF[q].forEach((v,i)=>SECF.forEach((h,s)=>{if(secFeed(q,i,s)===p)f+=S.share[q]*v*h;})));return c.demand*f;}
const lfP=id=>[id.slice(0,2),+id.slice(2)];
const srcMW=(p,i,src)=>SECF.reduce((a,h,s)=>a+(secFeed(p,i,s)===src?h:0),0)*lfMW(p,i);
const vfFrac=p=>VFI.reduce((a,i)=>a+SECF.reduce((b,h,s)=>b+(secFeed(p,i,s)==='vf'?LF[p][i]*h:0),0),0),lfMW=(p,i)=>S.c?S.c.demand*S.share[p]*LF[p][i]:0;
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
  nb:'<path d="M3 7h13l-3-3M21 17H8l3 3"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 3.5l3 2 3-2M9 20.5l3-2 3 2"/>',
  storm:'<path d="M7 16a4 4 0 0 1 .3-8A5.5 5.5 0 0 1 18 9.5a3.3 3.3 0 0 1 0 6.5"/><path d="M13 11l-3 5h4l-2 5"/>',
  heat:'<circle cx="12" cy="7" r="3"/><path d="M12 1.5v1M6.5 7h-1M18.5 7h-1M3.5 14c2.1-1.5 4.2 1.5 6.3 0s4.2-1.5 6.3 0 2.8 1.2 4.4 0M3.5 19c2.1-1.5 4.2 1.5 6.3 0s4.2-1.5 6.3 0 2.8 1.2 4.4 0"/>',
  plug:'<path d="M9 2v5M15 2v5M6 7h12v3a6 6 0 0 1-12 0zM12 16v3a3 3 0 0 0 3 3h3"/>',
  flood:'<path d="M4 11l8-6 8 6M6 10v4M18 10v4"/><path d="M2.5 17c2-1.5 3.8 1.5 5.8 0s3.8-1.5 5.8 0 3.8 1.5 5.8 0M2.5 21c2-1.5 3.8 1.5 5.8 0s3.8-1.5 5.8 0 3.8 1.5 5.8 0"/>',
  pylon:'<path d="M12 2 7.5 22M12 2l4.5 20M4 7h16M6 12h12M9.6 7l4.8 5M14.4 7l-4.8 5M8.6 17h6.8M8.6 17l6.8 5M15.4 17l-6.8 5"/>'};
// Each day's scene: the icon on its card and the weather drawn behind the diagram
const SCENE={xmas:'flood',ev:'plug',quiet:'sun',grid:'pylon',storm:'storm',heat:'heat',jan:'snow',snow:'snow',gsp:'pylon',mesh:'pylon',endure:'storm',may:'sun',tut:'snow'};
const WX={xmas:'rain',ev:'snow',grid:'cloud',gsp:'cloud',mesh:'snow'};
const sceneOf=k=>SCENE[k]||'pylon',wxOf=k=>WX[k]||{pylon:'cloud'}[sceneOf(k)]||sceneOf(k);
const LOGO='<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#0B1F3A"/><circle cx="50" cy="50" r="38" fill="none" stroke="#FFD23F" stroke-width="5"/><path d="M56 20 L32 55 H47 L42 80 L68 45 H53 L60 20 Z" fill="#FFD23F"/></svg>';
const BAND=`<div class="sheet-brand wu"><div class="wu-lock"><svg viewBox="0 0 100 100" role="img" aria-label="Watts Up"><rect width="100" height="100" rx="22" fill="#0B1F3A"/><circle cx="50" cy="50" r="38" fill="none" stroke="#FFD23F" stroke-width="5"/><path d="M56 20 L32 55 H47 L42 80 L68 45 H53 L60 20 Z" fill="#FFD23F"/></svg><div><b>Watts <span>Up</span></b><small>Electricity Distribution</small></div></div><p class="tag">${CFG.band}</p></div>`;
const SPK_ON='<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SPK_OFF='<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
const capOf=s=>s.id==='solar'?Math.max(5,Math.ceil(S.sc.solar.peak/5)*5):s.cap;
const NOGEN=()=>!!S.sc.noGen;
const devName=k=>{const[t,i]=k.split(':');return t==='pt'?`${PR[i].name} transformer breaker`:t==='bs'?(i==='12'?'T1–T2 bus section breaker':'T2–T3 bus section breaker'):t==='tx'?`T${+i+1}`:t==='bc'?`${PR[i].name} breaker`:t==='in'?`${PR[i].name} incomer`:t==='lf'?`${LFN[i.slice(0,2)][+i.slice(2)]} 11 kV feeder`:t==='nop'?`${LFN[i.slice(0,2)][+i.slice(2)]} backfeed from Volt Face`:t==='mid'?`${LFN[i.slice(0,2)][+i.slice(2)]} mid-point switch`:t==='mg'?`mobile generator at ${LFN[i.slice(0,2)][+i.slice(2)]}`:t==='lk'?`${PR[LINKS[i].a[0]].name} – ${PR[LINKS[i].b[0]].name} 11 kV link`:t==='tie'?`${PR[i].name} – ${NBS[PR[i].nb].name} tie`:`${PR[ITS[i].a].name} – ${PR[ITS[i].b].name} interconnector`;};

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
/* ---------- Career sync: the same career on any device, under a name and a 4-digit PIN ----------
   The scoreboard keeps each player's career against their name and a scrambled PIN, and merges what
   every device sends (best stars per shift, every achievement). The link is shared by both games on
   this site; each game syncs its own career. Pulled when the game opens, pushed after every shift. */
const SYNC_KEY='fc-sync';
function syncGet(){try{const v=JSON.parse(localStorage.getItem(SYNC_KEY)||'null');return v&&v.name&&/^\d{4}$/.test(v.pin)?v:null;}catch(e){return null;}}
function syncSet(v){try{if(v)localStorage.setItem(SYNC_KEY,JSON.stringify(v));else localStorage.removeItem(SYNC_KEY);}catch(e){}}
function mergeCareer(a,b){const o={stars:{...(a.stars||{})},ach:{...(a.ach||{})},best:{...(a.best||{})}};
  Object.entries((b&&b.stars)||{}).forEach(([k,v])=>{v=Math.round(+v||0);if(v>=1&&v<=3&&v>(o.stars[k]||0))o.stars[k]=v;});
  Object.keys((b&&b.ach)||{}).forEach(k=>{if(b.ach[k])o.ach[k]=1;});return o;}
const SYNC_ERR={name:'Please choose a different name: 2 to 20 letters or numbers, nothing rude.',pin_format:'The PIN must be 4 digits.',
  pin:'That name is already saved with a different PIN. If it\'s yours, check the PIN. If not, pick another name.',locked:'Too many wrong PINs for that name. Try again in 15 minutes.',
  site:'Career saving only works on the game\'s own website.',net:'Couldn\'t reach the scoreboard. Check your connection and try again.',
  old:'The scoreboard hasn\'t been updated for saving careers yet. Try again later.'};
let syncBusy=false,syncNote='';
async function syncCareer(name,pin){if(syncBusy)return{ok:false,error:'busy'};syncBusy=true;
  try{const r=await fetch(SCORE_URL,{method:'POST',body:JSON.stringify({type:'career',game:GAME,site:location.hostname,name,pin,career:career()})});const j=await r.json();
    if(!j||!j.ok){const e=(j&&j.error)||'net';return{ok:false,error:SYNC_ERR[e]?e:'old',triesLeft:j&&j.triesLeft};}
    const before=JSON.stringify(career()),m=mergeCareer(career(),j.career);saveCareer(m);syncSet({name:j.name,pin,at:Date.now()});
    return{ok:true,created:!!j.created,changed:JSON.stringify(m)!==before,name:j.name};}
  catch(e){return{ok:false,error:'net'};}finally{syncBusy=false;}}
// a background sync with the saved link: on opening the game and after each shift
async function syncQuiet(){for(let i=0;syncBusy&&i<100;i++)await new Promise(r=>setTimeout(r,200));const L=syncGet();if(!L)return null;const r=await syncCareer(L.name,L.pin);
  if(r.ok)syncNote='';
  else if(r.error==='pin'||r.error==='name'){syncSet(null);syncNote=`Your career stopped syncing: the saved PIN no longer matches the name ${L.name}. Save it online again below.`;}
  else if(r.error!=='busy')syncNote=r.error==='net'?'Not synced just now: couldn\'t reach the scoreboard. It will try again after your next shift.':SYNC_ERR[r.error]||'';
  return r;}
function syncWhen(at){if(!at)return'';const t=new Date(at);return t.toDateString()===new Date().toDateString()?t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):t.toLocaleDateString('en-GB',{day:'numeric',month:'short'});}
function syncBox(){const L=syncGet(),w=L?syncWhen(L.at):'',note=`<p class="sync-msg" id="syncMsg" role="status">${esc(syncNote)}</p>`;
  if(L)return `<div class="sync on" id="syncBox"><p><b class="sync-k">Saved online</b> as <b>${esc(L.name)}</b>${w?` · last synced ${w}`:''}. It syncs after every shift. On another phone or computer, open Career and enter the same name and PIN.</p>
    <div class="sync-row"><button type="button" class="btn" id="syncNow">Sync now</button><button type="button" class="btn" id="syncOff">Stop syncing on this device</button></div>${note}</div>`;
  return `<div class="sync" id="syncBox"><p class="sync-h">Play your career on any device</p><p class="fine">Save it online with a name and a 4-digit PIN. On another phone or computer, enter the same name and PIN to carry on where you left off. Stars and achievements from every device are kept, and the same name and PIN work in both games.</p>
    <div class="sync-row"><label>Name<input id="syName" maxlength="20" autocomplete="nickname" placeholder="e.g. Sparky Sue" value="${esc(getName())}"></label><label>PIN<input id="syPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 digits"></label><button type="button" class="btn primary" id="syncBtn">Save career online</button></div>
    ${note}<p class="fine">Saved in the game's scoreboard: the name, the PIN scrambled so nobody can read it, and your stars and achievements. Forgotten your PIN? Send feedback and ask for the name to be freed up.</p></div>`;}
// re-draw the start screen after a sync, if it's showing, without losing the player's place
function refreshStart(force){const sh=$('sheet');if(!sh||$('overlay').hidden||!sh.querySelector('#pick'))return;
  const ae=document.activeElement;if(!force&&ae&&sh.contains(ae)&&ae.tagName==='INPUT'){const b=$('syncBox');if(b)b.outerHTML=syncBox();return;}
  const y=sh.scrollTop;startSheet();sh.scrollTop=y;}
const syncSay=t=>{const m=$('syncMsg');if(m)m.textContent=t;};
async function syncLink(){const n=(($('syName')||{}).value||'').replace(/\s+/g,' ').trim(),p=(($('syPin')||{}).value||'').trim();
  if(n.length<2||rude(n)){syncSay(SYNC_ERR.name);return;}if(!/^\d{4}$/.test(p)){syncSay(SYNC_ERR.pin_format);return;}
  const b=$('syncBtn');if(b)b.disabled=true;syncSay('Saving…');const r=await syncCareer(n,p);if(b)b.disabled=false;
  if(!r.ok){if(r.error!=='busy')syncSay(r.error==='pin'&&r.triesLeft?`${SYNC_ERR.pin} ${r.triesLeft} ${r.triesLeft===1?'try':'tries'} left before a 15-minute wait.`:SYNC_ERR[r.error]||SYNC_ERR.net);return;}
  if(!getName())saveName(r.name);
  syncNote=r.created?`Saved. Your career is online as ${r.name}.`:r.changed?`Welcome back, ${r.name}. Your progress from your other devices is loaded here.`:`Synced as ${r.name}. Everything is up to date.`;
  track('career_sync',{created:r.created?1:0});refreshStart(true);}
async function syncNow(){syncSay('Syncing…');const r=await syncQuiet();if(!r)return;
  if(r.ok)syncNote=r.changed?'Synced. New progress from another device is loaded here.':'Synced. Everything is up to date.';refreshStart(true);}
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
  click(){tone(1400,.04,0,'square',.025);},
  ar(){clunk();tone(520,.08,.35,'triangle',.05);},
  ring(){[0,.16,.5,.66].forEach(d=>tone(1250,.11,d,'sine',.035));}
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
  LKIDS.forEach(k=>{const L=LINKS[k],fa=S.lf[L.a[0]][L.a[1]]||extra==='lf:'+L.a[0]+L.a[1],fb=S.lf[L.b[0]][L.b[1]]||extra==='lf:'+L.b[0]+L.b[1];const ma=midOn(L.a[0],L.a[1])||extra==='mid:'+L.a[0]+L.a[1],mb=midOn(L.b[0],L.b[1])||extra==='mid:'+L.b[0]+L.b[1];if((S.lk[k]||extra==='lk:'+k)&&fa&&fb&&ma&&mb)E.push({id:'lk:'+k,a:L.a[0],b:L.b[0],x:6,r:L.r});});
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
  const comps=sc.easy?PIDS.filter(p=>PR[p].fd).map(p=>'fd:'+p):GAME==='fc'?['tx:0','tx:1','tx:2']:['tx:0','tx:1','tx:2',...PIDS.filter(p=>PR[p].fd).map(p=>'fd:'+p),...ITIDS.filter(k=>ITS[k].nc).map(k=>'ic:'+k)],base=sc.faults/(comps.length*integ),out=[];
  comps.forEach(k=>{for(let m=START+20;m<END;m++){if(rng()<base*mult(m)){const dur=Math.round(sc.easy?40+rng()*30:90+rng()*150);out.push({k,m,dur,cause:pick(rng,sc.causes||FAULTS),done:false});m+=dur;}}});
  return out.sort((a,b)=>a.m-b.m);
}
// 11 kV faults (overhead ones may be transient and auto-reclose) and transient 33 kV trips. A separate
// random stream keeps the existing fault times unchanged, and the daily challenge is still the same for everyone.
function genLvFaults(seed,sc,risk){if(!LV_ON||!sc.faults)return[];
  const rng=rngFrom(seed^0x2c1b3c6d),mult=m=>{let k=1;risk.forEach(w=>{if(m>=w.start&&m<w.end)k=Math.max(k,w.mult);});return k;};
  let integ=0;for(let m=START+20;m<END;m++)integ+=mult(m);
  const comps=[];PIDS.forEach(p=>LF[p].forEach((v,i)=>comps.push({k:'lv:'+p+i,w:LF_OH[p][i]?3:1,oh:!!LF_OH[p][i]})));
  PIDS.filter(p=>PR[p].fd).forEach(p=>comps.push({k:'ar:'+p,w:2,oh:true}));
  const W=comps.reduce((a,c)=>a+c.w,0),tot=sc.faults*2.2,out=[];
  comps.forEach(c=>{for(let m=START+20;m<END;m++){if(rng()<tot*c.w/W*mult(m)/integ){
    if(c.k.startsWith('ar:'))out.push({k:c.k,m,dur:0,cause:pick(rng,OH_CAUSES),done:false});
    else{const tr=c.oh&&rng()<.6,dur=Math.round(sc.easy?40+rng()*30:50+rng()*100);out.push({k:c.k,m,dur,sec:rng()<.5&&!sc.easy?0:1,tr,cause:pick(rng,c.oh?OH_CAUSES:CABLE_CAUSES),done:false});if(!tr)m+=dur+PATROL;}}}});
  return out;}
// 33/11 kV transformer faults at the substations (control room, not the easy shift). Own random stream too.
const PT_CAUSES=['Buchholz relay alarm and trip','Transformer differential protection operated','Tap changer fault','Low oil level alarm and trip'];
function genPtFaults(seed,sc,risk){if(!LV_ON||!sc.faults||sc.easy)return[];
  const rng=rngFrom(seed^0x7f4a7c15),out=[],subs=sc.mesh?['hw','ml','rv','js','kc']:['hw','ml','rv','js'],tot=sc.faults*.2,n=END-START-80;
  subs.forEach(p=>{for(let m=START+40;m<END-40;m++){if(rng()<tot/subs.length/n){const dur=Math.round(90+rng()*90);out.push({k:'pt:'+p,m,dur,cause:pick(rng,PT_CAUSES),done:false});m+=dur;}}});
  return out;}
const spanOf=k=>{const v=SCENARIOS[k]||{};return{start:v.start!=null?v.start:CFG.start,end:v.end!=null?v.end:CFG.end};};
const runText=()=>{const r=Math.round((END-START)/CFG.rate/60*2)/2;return `Shift runs ${fmtT(START)}–${END>=1440?'24:00':fmtT(END)}, about ${Math.floor(r)}${r%1?'½':''} minutes at 1×.`;};
const zeroD=()=>({solar:0,wind:0,bchg:0,bdis:0,chp:0,dsr:0});
function newGame(key){
  const sc=SCENARIOS[key],date=todayUK(),daily=mode==='daily';
  ({start:START,end:END}=spanOf(key));
  const seed=daily?hashStr(date+'|'+key+'|'+CFG.salt):((Math.random()*2**31)|0);
  const rng=rngFrom(seed),b=sc.build(rng),surgeK=sc.surge ? .85+.3*rng() : 1;
  const N={d:makeNoise(rng,15),c1:makeNoise(rng,25),c2:makeNoise(rng,6),w1:makeNoise(rng,40),w2:makeNoise(rng,5)};
  PIDS=sc.mesh?['hw','ml','rv','js','kc']:['hw','ml','rv','js'];ITIDS=sc.mesh?['hm','mr','rj','mk','rk']:['hm','mr','rj'];LKIDS=GAME==='cr'&&sc.links?['hm','mr','rj']:[];VFI=sc.vfi||[1,2];
  const share=sc.shares||{hw:.30,ml:.20,rv:.25,js:.25};
  {const D=sc.derate||1;R=Math.round(60*D);Object.values(PR).forEach(P=>{if(P.fr0==null){P.fr0=P.fr;P.tie0=P.tie;}if(P.fr0!=null)P.fr=Math.round(P.fr0*D);if(P.tie0!=null)P.tie=Math.round(P.tie0*D);});
   Object.values(ITS).forEach(t=>{if(t.r0==null)t.r0=t.r;t.r=Math.round(t.r0*D);});}
  const sched=genFaults(rng,sc,b.risk).concat(genLvFaults(seed,sc,b.risk),genPtFaults(seed,sc,b.risk)).sort((a,b)=>a.m-b.m),dv=sc.demand.map(x=>x[1]);
  S={key,sc,mode,date,seed,surgeK,t:START-60,dmin:Math.min(...dv),dmax:Math.max(...dv),
    events:b.events.map(e=>({...e,fired:false,noticed:false})),cutout:b.cutout?{...b.cutout,fired:false,done:false}:null,
    risk:b.risk,sched,N,rng2:rngFrom(seed^0x5bd1e995),rngC:rngFrom(seed^0x3c6ef372),flood:b.flood?{...b.flood,warned:false,near:false,arrived:false,live:null,receded:false}:null,
    tx:[0,1,2].map(()=>({temp:60,out:null,em:0,sh:0,L:0,flow:0})),
    share,lf:Object.fromEntries(Object.keys(LF).map(p=>[p,LF[p].map(()=>true)])),nop:Object.fromEntries(Object.keys(LF).map(p=>[p,LF[p].map(()=>false)])),lk:{hm:false,mr:false,rj:false},
    mid:Object.fromEntries(Object.keys(LF).map(p=>[p,LF[p].map(()=>true)])),lff:Object.fromEntries(Object.keys(LF).map(p=>[p,LF[p].map(()=>null)])),pt:Object.fromEntries(Object.keys(LF).map(p=>[p,{closed:true,fault:null}])),
    mgu:LV_ON?Array.from({length:MG_N},(_,j)=>({n:j+1,site:null,conn:false,pend:false})):[],trial:0,recloses:0,vfLoad:0,fd:Object.fromEntries(PIDS.map(p=>[p,{brk:!!PR[p].fd,inc:!!PR[p].fd,fault:null}])),
    tie:Object.fromEntries(PIDS.map(p=>[p,{closed:false}])),
    it:Object.fromEntries(ITIDS.map(k=>[k,{closed:!!ITS[k].nc,fault:null}])),
    ov:{},edL:{},flows:{},alarms:{},bs:{'12':{closed:true},'23':{closed:true}},bsf:{'12':0,'23':0},isl:{},islands:[],inj:{kn:0,fm:0},parMin:0,
    sup:Object.fromEntries(PIDS.map(p=>[p,'bc'])),pn:Object.fromEntries(PIDS.map(p=>[p,0])),wB:Object.fromEntries(PIDS.map(p=>[p,1])),spare:{kn:65,fm:60},
    manual:{},armed:{},act:{},autoP:{},manP:{},called:{},fail:{},allow:{},allowLogged:{},
    soc:sc.soc0,op:null,sel:null,cust:{ci:0,cml:0,si:0,off:{}},crews:Array.from({length:sc.crews||3},(_,j)=>j+1).map(n=>({n,x:DEPOT.x,y:DEPOT.y,from:null,to:null,dep:0,arr:0,at:'depot',job:null})),crewJobs:0,parOk:0,vfPeak:0,gspOver:0,gspTrips:0,gspLoad:0,
    cost:{arm:0,use:0,short:0,curt:0,gen:0},insecureMin:0,overloadMin:0,trips:0,faults:0,incidents:0,ens:0,peakL:0,
    hist:[],full:[],marks:[],log:[],chain:[],running:false,paused:true,ended:false,silent:true,lost:null,emergOn:false,autoOn:false,tipShown:{}};
  SERVICES.forEach(s=>{S.manual[s.id]=0;S.armed[s.id]=0;S.act[s.id]=0;S.autoP[s.id]=0;S.manP[s.id]=0;S.called[s.id]=false;S.fail[s.id]=0;S.allow[s.id]=s.allow||0;});
  const c0=comps(S.t,false),L0=Math.abs(PIDS.reduce((a,p)=>a+netP(c0,p,zeroD()),0))/3/R;S.tx.forEach(t=>t.temp=20+100*L0*L0);
  buildMimic();
  for(let i=0;i<60;i++)step();
  S.silent=false;S.alarms={};S.cost={arm:0,use:0,short:0,curt:0,gen:0};S.insecureMin=0;S.overloadMin=0;S.peakL=0;S.ens=0;S.cust={ci:0,cml:0,si:0,off:{},pri:0,pmin:{}};S.loss=[];S.lossOpen={};S.cp={};S.crewJobs=0;S.trial=0;S.isoMin=0;S.recloses=0;S.parOk=0;S.calls=[];S.callQ=[];S.callN=0;S.tele={};S.polls=[];S.callRing=-99;S.vfPeak=0;S.gspOver=0;S.gspTrips=0;S.log=[];S.full=[];S.marks=[];S.chain=[];queued=[];
  logE(START,`Shift starts. ${sc.when}: ${sc.blurb}`,'info');
  if(daily)logE(START,`Today's challenge (${fmtDate(date)}): everyone gets the same weather and fault times.`,'info');
  S.events.filter(e=>e.planned).forEach(e=>logE(START,e.fd?`Notice: ${PR[e.fd].name} feeder planned outage ${fmtT(e.start)}–${fmtT(e.end)}. Field staff will open both ends of it at ${fmtT(e.start)}, so move ${PR[e.fd].name} and anything fed through it beforehand.`:`Notice: T${e.tx+1} planned outage ${fmtT(e.start)}–${fmtT(e.end)}. Field staff will switch it out; you restore it afterwards.`,'warn'));
  if(S.mode==='career'&&HANDOVER[key])logE(START,`Handover from ${HANDOVER[key].from}: ${HANDOVER[key].text}`,'info');
  if(S.flood)logE(START,`Flood watch: the River Ohm is high and still rising. The 11 kV switchgear at ${PR[S.flood.p].name} is in the basement. A flood warning will follow if the water keeps coming up.`,'warn');
  S.risk.forEach(w=>logE(START,`Weather warning: ${w.label.toLowerCase()} ${fmtT(w.start)}–${fmtT(w.end)}. Faults are ${w.mult}× more likely.`,'warn'));
  $('scnLabel').innerHTML=esc(sc.title+' · Blackout Canyon 33 kV')+(daily?` <span class="mode-tag">Daily ${esc(fmtDate(date))}</span>`:'');
  $('dayLabel').textContent=sc.when;
  {const w=$('wx');if(w)w.className='wx wx-'+wxOf(key);}
  hideBanner();hideTip();lastSky='';lastInsp='';closeSheet();applyZoom();render(true);
}

// A late evening surge (EV charging) on top of the demand curve: rises steeply to its peak, then tails off.
// The look-ahead only sees the fraction 'seen' of it. S.surgeK varies its size from day to day.
function surgeMW(h){const u=S.sc.surge;if(!u||h<=u.start||h>=u.end)return 0;
  const f=h<u.peak?Math.pow((h-u.start)/(u.peak-u.start),2.2):1-Math.pow((h-u.peak)/(u.end-u.peak),1.3);return u.mw*(S.surgeK||1)*f;}
function comps(m,fc){
  const h=m/60,sc=S.sc,N=S.N;
  let demand=interp(sc.demand,clamp(h,0,24));if(!fc)demand*=1+.025*N.d(m);
  if(sc.surge)demand+=surgeMW(h)*(fc?sc.surge.seen:1);
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
  else sh=(interp(sc.demand,clamp(m/60,0,24))+.5*surgeMW(m/60)-S.dmin)/(S.dmax-S.dmin);
  return nb.base-nb.dip*sh;}

/* ---------- Shift debrief: every point lost, with the reason ---------- */
// Losses of the same kind on the same thing within a couple of minutes join into one episode.
function lose(m,k,r,l,pts){if(S.silent||!(pts>0))return;const o=S.lossOpen||(S.lossOpen={});let e=o[k];
  if(!e||m>e.to+2){e=o[k]={k,r,l,from:m,to:m,pts:0};(S.loss||(S.loss=[])).push(e);}e.to=m;e.pts+=pts;}
// why half sx of 11 kV feeder p,i is off supply
function offWhy(p,i,sx,sup){const f=S.lff&&S.lff[p]&&S.lff[p][i],fn=`${lfName(p,i)} (${PR[p].name})`;
  if(f){if(S.tele&&S.tele[p+i])return{k:'lvcall:'+p+i,r:'lvcall',l:`Trip on the ${fn} not yet reported by the RTU`};if(!f.found)return{k:'lvfind:'+p+i,r:'lvfind',l:`Fault not yet found on the ${fn}`};
    if(sx===f.sec)return{k:'lvrep:'+p+i,r:'repair',l:`Faulted half of the ${fn} under repair`};
    return{k:'lvh:'+p+i,r:f.sec===1?'lvnear':'lvfar',l:`Healthy half of the ${fn} left off`};}
  if(!subOn(p,sup)){const fd=S.fd[p]&&S.fd[p].fault;return{k:'sub:'+p,r:fd?(fd.planned?'sub_plan':'sub_fd'):'sub',l:`${PR[p].name} off supply`};}
  if(!ptOn(p)){const f=S.pt[p].fault;return{k:'pt:'+p,r:f&&!f.ready?'pt_fault':'pt',l:f&&!f.ready?`${PR[p].name} transformer fault`:`${PR[p].name} transformer left off`};}
  return{k:'lvoff:'+p+i,r:'lvoff',l:`${ucfirst(lfName(p,i))} at ${PR[p].name} left off`};}
function logE(m,text,lvl){S.log.unshift({m,text,lvl});if(S.log.length>60)S.log.pop();logDirty=true;}
function mark(m,type,label){if(!S.silent)S.marks.push({m,type,label});}
// a breaker trip or auto-reclose, shown on the alarm list until it's acknowledged
function alEv(m,kind,name,sel,note){if(S.silent)return;const id='ev'+(S.alEvN=(S.alEvN||0)+1);S.alarms[id]={id,ev:kind,lvl:kind,name,sel:sel||'',note:note||'',since:m,L:0,ack:false};}
function queueAlert(text,lvl,pause){if(!S.silent)queued.push({text,lvl,pause,m:S.t});}
function incident(m,msg,el,rr){S.incidents++;
  lose(m,'inc'+S.incidents,rr||(/for more than/.test(msg)?'par':/mobile generator/.test(msg)?'inc_mg':/before (its|it was)|onto (the faulted|its fault)|still working/.test(msg)?'inc_early':'oop'),'Switching incident: '+msg.split(/\. /)[0].replace(/\.$/,''),INCIDENT_PTS);S.chain.push('a switching incident');mark(m,'incident','Incident');logE(m,'Switching incident: '+msg,'alarm');queueAlert('Switching incident: '+msg,'alarm',true);play('incident');fx(el);}
function openEdge(id){const[t,k]=id.split(':');if(t==='bs')S.bs[k].closed=false;else if(t==='bc')S.fd[k].brk=false;else if(t==='in')S.fd[k].inc=false;else if(t==='tie')S.tie[k].closed=false;else if(t==='it')S.it[k].closed=false;else if(t==='lk')S.lk[k]=false;}
const isClosed=id=>{const[t,k]=id.split(':');return t==='bs'?S.bs[k].closed:t==='bc'?S.fd[k].brk:t==='in'?S.fd[k].inc:t==='tie'?S.tie[k].closed:t==='lk'?!!S.lk[k]:S.it[k].closed;};
const fdOn=p=>{const f=S.fd[p];return !!PR[p].fd&&f.brk&&f.inc&&!f.fault;};
/* ---------- 11 kV faults: fault finding, auto-reclose, mobile generators ---------- */
const lfName=(p,i)=>`${LFN[p][i]} 11 kV feeder`;
const custOf=(p,i,s)=>Math.round(CUST_TOTAL*S.share[p]*LF[p][i]*SECF[s]);
// the device that puts supply onto half s of feeder p,i
function srcDev(p,i,s){const src=secFeed(p,i,s);if(src===null)return null;
  if(src===p&&S.lf[p][i])return 'lf:'+p+i;if(src==='vf')return 'nop:'+p+i;if(src==='mg')return 'mg:'+p+i;
  const l=linkOf(p,i);return l?'lk:'+l.k:null;}
function tripDev(k){const[t,id]=k.split(':');
  if(t==='lf'){const[p,i]=lfP(id);S.lf[p][i]=false;}else if(t==='nop'){const[p,i]=lfP(id);S.nop[p][i]=false;}
  else if(t==='lk')S.lk[id]=false;else if(t==='mg'){const u=mgAt(id);if(u)u.conn=false;}}
function ptHow(p){const o=[];if(LKIDS.some(k=>LINKS[k].a[0]===p||LINKS[k].b[0]===p))o.push('11 kV links');if(VF_ON&&VFI.length)o.push('Volt Face backfeeds');o.push('mobile generators');
  return `Open the feeder breakers, then restore what you can from the far ends with ${o.join(', ').replace(/, ([^,]*)$/,' or $1')}.`;}
function farOpts(p,i){const o=[];if(VF_ON&&VFI.includes(i))o.push('the Volt Face backfeed');if(linkOf(p,i))o.push('the 11 kV link');o.push('a mobile generator');return o.join(', ').replace(/, ([^,]*)$/,' or $1');}
function locate(m,p,i,sec,how){const f=S.lff[p][i];if(!f||f.found)return;f.found=true;f.sec=sec;f.until=m+f.dur;mark(m,'xfer','Fault found');
  const nxt=sec===1?(S.lf[p][i]?`The first half is back on. Keep the mid-point switch open until the repair is done.`:`Keep the mid-point switch open and close the breaker at ${PR[p].name} to restore the first half.`):`Keep the mid-point switch open. The second half can be restored from the far end with ${farOpts(p,i)}.`;
  const s=`${how} The fault on the ${lfName(p,i)} at ${PR[p].name} is in the ${SECN[sec]}. Repair expected by ${fmtT(f.until)}. ${nxt}`;
  logE(m,s,'ok');queueAlert(s,'ok',false);play('ok');}
// Protection: a half with an unrepaired fault cannot stay energised. Trips whatever is feeding it, and uses
// what held and what tripped to locate the fault.
function checkLv(m,opK){if(!LV_ON||!S.lff)return;
  PIDS.forEach(p=>LF[p].forEach((v,i)=>{const f=S.lff[p][i];if(!f)return;
    for(let g=0;g<3;g++){const d=srcDev(p,i,f.sec);if(!d)break;const live=[0,1].filter(s=>srcDev(p,i,s)===d);tripDev(d);
      if(opK){S.trial++;lose(m,'trial:'+p+i,'trial',`Closed the ${devName(d)} onto a fault`,TRIAL_PTS);mark(m,'trip','Closed onto fault');const s=`The ${devName(d)} tripped straight away: it was closed onto the fault on the ${lfName(p,i)} at ${PR[p].name}.`;logE(m,s,'alarm');alEv(m,'trip',ucfirst(devName(d)),d,'closed onto fault');queueAlert(s,'alarm',false);play('fault');fx(elOf(d));}
      else if(f.start!==m){const s=`The ${devName(d)} tripped: supply came back onto the faulted ${lfName(p,i)} at ${PR[p].name}.`;logE(m,s,'alarm');alEv(m,'trip',ucfirst(devName(d)),d,'onto fault');queueAlert(s,'alarm',false);play('trip');}
      if(live.length===1)locate(m,p,i,live[0],'Protection operated on that half only.');}
    if(!f.found&&!midOn(p,i)){const lv=[0,1].filter(s=>secFeed(p,i,s)!==null);if(lv.length===1)locate(m,p,i,1-lv[0],`The ${lv[0]?'second':'first'} half is holding on load.`);}}));}
function stepLv(m){if(!LV_ON)return;
  if(S.sc.easy)PIDS.forEach(p=>{if(S.fd[p].fault&&S.sup[p]==='off')S.isoMin++;});// easy shifts: a substation left off while its feeder is out
  PIDS.forEach(p=>LF[p].forEach((v,i)=>{const f=S.lff[p][i];if(!f)return;
    if(S.sc.easy&&f.found&&f.sec===1&&secFeed(p,i,0)===null)S.isoMin++;// easy shifts: minutes the healthy near half is left off
    const t0=f.hid?f.seen:f.start;if(!f.found&&t0!=null&&m>=t0+PATROL)locate(m,p,i,f.sec,'Line patrol has found the fault.');
    else if(f.found&&m>=f.until){S.lff[p][i]=null;const off=secOff(p,i).length;const s=`The ${lfName(p,i)} at ${PR[p].name} has been repaired.`+(off?` Close ${!S.lf[p][i]?'its breaker':''}${!S.lf[p][i]&&!midOn(p,i)?' and ':''}${!midOn(p,i)?'its mid-point switch':''}${S.lf[p][i]&&midOn(p,i)?'whatever fed it':''} to restore everyone.`:'');logE(m,s,'ok');queueAlert(s,'ok',false);play('ok');}}));
  // mobile generators: trip on overload
  (S.mgu||[]).forEach(u=>{if(!u.conn)return;const[p,i]=lfP(u.site),ld=srcMW(p,i,'mg');
    if(ld>MG_CAP+.05){u.conn=false;S.trips++;mark(m,'trip','Generator trip');const s=`The mobile generator at ${LFN[p][i]} (${PR[p].name}) tripped on overload: it was asked for ${ld.toFixed(1)} MW and is rated ${MG_CAP} MW. Open the mid-point switch so it only carries the second half, then reconnect it.`;logE(m,s,'alarm');alEv(m,'trip',`Mobile generator at ${LFN[p][i]}`,'mg:'+u.site,'overload');queueAlert(s,'alarm',true);play('trip');fx('mgg_'+u.site);}});}
// an operation that makes two different supplies meet on one 11 kV feeder through the mid-point switch or a generator
function lvConflict(p,i){const near=S.lf[p][i]&&subLv(p),far=farSrc(p,i),g=mgOn(p,i),vf=VF_ON&&VFI.includes(i)&&S.nop[p][i],l=linkOf(p,i),lk=l&&S.lk[l.k]&&S.lf[l.q][l.j]&&midOn(l.q,l.j)&&subLv(l.q);
  if(g&&(vf||lk||(near&&midOn(p,i))))return 'gen';
  if(near&&far&&midOn(p,i)){if(far==='vf')return 'vf';if(far!=='mg'&&grpOf(S.sup[p])!==grpOf(S.sup[far]))return 'grid';}
  return null;}
const elOf=id=>{const[t,k]=id.split(':');return t==='pt'?'ptg_'+k:t==='bs'?'bsg_'+k:t==='bc'||t==='in'?'fdg_'+k:t==='lf'?'lfb_'+k:t==='nop'?'nopb_'+k:t==='mid'?'midb_'+k:t==='mg'?'mgg_'+k:t==='lk'?'lkg_'+k:t==='tie'?'tieg_'+k:'itg_'+k;};

/* ---------- Customer calls and slow telemetry ---------- */
const callWho=(p,i)=>`${pick(S.rngC,ROADN)} ${pick(S.rngC,ROADS)}, ${LFN[p][i]}`;
const queueCall=(m,p,i,sx,txt,kind)=>S.callQ.push({m,p,i,sx,txt,kind});
// half sx of feeder p,i (n customers) has just lost supply: one to three of them ring in over the next few minutes
function callsFor(m,p,i,sx,n){if(!CALLS_ON||S.silent||!S.callQ)return;const r=S.rngC,k=Math.min(3,1+Math.floor(r()*.7+n/2500*r()));
  for(let j=0;j<k;j++)queueCall(m+2+Math.floor(r()*5)+j*2,p,i,sx,pick(r,CALL_TXT),'plain');
  const P=prioOf(p,i);if(P&&P.sec===sx)queueCall(m+3+Math.floor(r()*4),p,i,sx,HINT_PRIO[P.kind],'prio');}
// a trip the RTU hasn't reported yet: the alarm, its log entry and the line patrol all wait for it
function reveal(m,k,how){const T=S.tele[k];if(!T)return;delete S.tele[k];const[p,i]=lfP(k),f=S.lff[p][i];if(f)f.seen=m;
  const pre=how==='poll'?`RTU at ${PR[p].name} polled. `:how==='op'?`Operating on the ${lfName(p,i)} showed that its breaker at ${PR[p].name} was already open. `:`The RTU at ${PR[p].name} has caught up. `;
  const s=pre+T.mk(m)+` It tripped at ${fmtT(T.m)}, ${m-T.m} min before the alarm came through.`;
  logE(m,s,'alarm');T.al.forEach(a=>alEv(m,...a));queueAlert(s,'alarm',true);play('fault');fx('lfb_'+k);}
function pollRtu(p){if(!S||S.ended||!CALLS_ON||!PR[p])return;if(S.polls.some(o=>o.p===p))return;
  S.polls.push({p,at:S.t});logE(S.t,`Polling the RTU at ${PR[p].name}.`,'info');play('click');render(true);}
function stepCalls(m){if(!CALLS_ON)return;
  S.polls=S.polls.filter(o=>{if(o.at>m)return true;const ks=Object.keys(S.tele).filter(k=>k.slice(0,2)===o.p);
    if(ks.length)ks.forEach(k=>reveal(m,k,'poll'));else logE(m,`RTU at ${PR[o.p].name}: nothing new. Everything on the diagram is up to date.`,'info');return false;});
  Object.keys(S.tele).forEach(k=>{if(m>=S.tele[k].until)reveal(m,k,'late');});
  const due=S.callQ.filter(q=>q.m<=m).sort((a,b)=>a.m-b.m);if(!due.length)return;S.callQ=S.callQ.filter(q=>q.m>m);
  due.forEach(q=>{if(!PIDS.includes(q.p)||secFeed(q.p,q.i,q.sx)!==null)return;// back on before they got through
    const c={...q,m,id:++S.callN,who:callWho(q.p,q.i)};S.calls.unshift(c);if(S.calls.length>40)S.calls.pop();
    if(q.kind!=='plain')logE(m,`Customer call, ${c.who} (${PR[q.p].name}, ${q.sx?'second':'first'} half of the ${lfName(q.p,q.i)}): “${q.txt}”`,'warn');
    if(m-S.callRing>=3){S.callRing=m;play('ring');}});}
let lastCalls='';
function renderCalls(){const el=$('callBody');if(!el||!CALLS_ON)return;
  const all=S.calls||[],L=all.slice(0,CALL_MAX),live=c=>PIDS.includes(c.p)&&secFeed(c.p,c.i,c.sx)===null,n=all.filter(live).length;
  const h=L.length?`<ul class="call-list">${L.map(c=>{const on=!live(c),pend=(S.polls||[]).some(o=>o.p===c.p);
    return `<li class="call ${c.kind}${on?' done':''}"><div class="call-h"><span class="call-tm">${fmtT(c.m)}</span><span class="call-w">${esc(c.who)}</span><span class="call-s">${on?'Back on':`${esc(PR[c.p].name)} · ${c.sx?'second':'first'} half`}</span></div>
      <p class="call-q">“${esc(c.txt)}”</p>${on?'':`<div class="call-a"><button type="button" class="btn" data-sel="lf:${c.p}${c.i}" data-k="cs-${c.id}">Show feeder</button><button type="button" class="btn" data-poll="${c.p}" data-k="cp-${c.id}"${pend?' disabled':''}>${pend?'Polling…':`Poll ${esc(PR[c.p].name)} RTU`}</button></div>`}</li>`;}).join('')}</ul>${all.length>L.length?`<p class="fine">${nf(all.length)} calls so far this shift.</p>`:''}`
    :'<p class="empty">No calls. Customers ring in when their supply goes off. Some say what they saw or heard, which tells you which half of the feeder the fault is in.</p>';
  if(h!==lastCalls){lastCalls=h;const ae=document.activeElement,fk=ae&&el.contains(ae)&&ae.dataset?ae.dataset.k:null;el.innerHTML=h;callSeen=slideNew(el,callSeen);if(fk){const f=el.querySelector(`[data-k="${fk}"]`);if(f)f.focus();}}
  txt('callCount',n?String(n):'');setAttr($('callCount'),'class','al-count'+(n?' high':''));
  {const pc=$('pCalls');if(pc)pc.classList.toggle('ringing',L.some(c=>live(c)&&S.t-c.m<5));}}
// The diagram shows what the RTUs have reported: a trip that hasn't come through yet still shows the breaker closed.
function seenAs(fn){const ks=S.tele?Object.keys(S.tele):[];if(!ks.length)return fn();
  const sv=ks.map(k=>{const[p,i]=lfP(k);return[p,i,S.lf[p][i],S.lff[p][i]];});sv.forEach(([p,i])=>{S.lf[p][i]=true;S.lff[p][i]=null;});
  try{return fn();}finally{sv.forEach(([p,i,a,b])=>{S.lf[p][i]=a;S.lff[p][i]=b;});}}

/* ---------- Flood (Christmas Day): rising water at one substation's 11 kV switchgear ---------- */
// The switchboard is live if its transformer feeds it, or a closed feeder breaker backfeeds it from the far end.
const floodLive=p=>(ptOn(p)&&subOn(p))||LF[p].some((v,i)=>S.lf[p][i]&&feedOf(p,i)!==null);
const floodOn=p=>{const T=S.pt[p];return !!(T&&T.fault&&T.fault.flood&&!T.fault.ready);};
function floodLevel(m){const F=S.flood;if(!F)return 0;const s=F.warn-90;if(m<=s)return 0;
  if(m<F.end)return Math.min(1.12,Math.pow((m-s)/(F.at-s),1.3));return Math.max(0,1.12*(1-(m-F.end)/90));}
function stepFlood(m){const F=S.flood;if(!F)return;const p=F.p,nm=PR[p].name;
  if(!F.warned&&m>=F.warn){F.warned=true;mark(m,'fail','Flood warning');
    const s=`Environment Agency flood warning: the River Ohm is rising fast. Water is expected to reach the 11 kV switchgear at ${nm} at about ${fmtT(Math.round(F.at/5)*5)}. If the switchboard is still live then, it will flash over and trip. Before that, move ${nm}'s feeders onto other supplies (the 11 kV links, the Volt Face backfeeds, a mobile generator), then open its feeder breakers and its transformer breaker so the switchboard is dead.`;
    logE(m,s,'alarm');queueAlert(s,'alarm',true);play('warn');}
  if(F.warned&&!F.near&&m>=F.at-30){F.near=true;const live=floodLive(p),s=`Flood update: the water at ${nm} is about 30 minutes from the switchgear.`+(live?' The switchboard is still live.':' The switchboard is dead and ready for it.');
    logE(m,s,live?'alarm':'ok');if(live){queueAlert(s,'alarm',true);play('alarm');}}
  if(!F.arrived&&m>=F.at){F.arrived=true;F.live=floodLive(p);const T=S.pt[p],ready=F.end+(F.live?90:30);
    if(F.live){let n=0;LF[p].forEach((v,i)=>[0,1].forEach(sx=>{if(secFeed(p,i,sx)===p)n+=custOf(p,i,sx);}));
      T.closed=false;LF[p].forEach((v,i)=>{S.lf[p][i]=false;});T.fault={until:ready,ready:false,label:'Flood water in the 11 kV switchgear',flood:true};
      S.trips++;S.incidents++;lose(m,'flood','flood',`Flood water reached the live switchgear at ${nm}`,INCIDENT_PTS);S.chain.push('flood water reaching live switchgear');mark(m,'incident','Flood trip');
      alEv(m,'trip',`${nm} 11 kV switchgear`,'pt:'+p,'flooded while live');
      const s=`Flood water reached the live 11 kV switchgear at ${nm}. It flashed over, and the transformer breaker and every feeder breaker there tripped${n?`: about ${nf(n)} customers are off`:''}. It has to be cleaned and tested once the water goes down, not before ${fmtT(ready)}. Restore what you can from the far ends.`;
      logE(m,s,'alarm');queueAlert(s,'alarm',true);play('incident');fx('ptg_'+p);}
    else{T.closed=false;T.fault={until:ready,ready:false,label:'Flooded: switchgear to be dried and tested',flood:true};mark(m,'xfer','Flood: switchgear dead');
      const s=`The flood water has reached the 11 kV switchgear at ${nm}, but it was dead, so nothing was damaged. It can go back in service once the water has gone and it has been dried and tested, at about ${fmtT(ready)}.`;
      logE(m,s,'ok');queueAlert(s,'ok',false);play('ok');}}
  if(F.arrived&&!F.receded&&m>=F.end){F.receded=true;logE(m,`The River Ohm is going down, and the water is out of the ${nm} basement. Engineers are drying and testing the switchgear.`,'info');}}
function renderFlood(){const F=S.flood,g=$('flood');if(!g)return;if(!F||!F.warned){g.setAttribute('hidden','');return;}g.removeAttribute('hidden');
  const lv=floodLevel(S.t),w=$('flood_w'),top=451-lv*(451-384);setAttr(w,'y',top.toFixed(1));setAttr(w,'height',(451-top).toFixed(1));
  const t=!F.arrived?`Water due ${fmtT(Math.round(F.at/5)*5)}`:!F.receded?'Flooded':floodOn(F.p)?`Testing until ${fmtT(S.pt[F.p].fault.until)}`:'Water gone';
  txt('flood_t',t);setAttr(g,'class','flood'+(F.arrived&&!F.receded?' in':!F.arrived&&S.t>=F.at-30?' near':''));}

/* ---------- Simulation step (one game minute) ---------- */
function step(){
  const m=S.t;
  S.tx.forEach((t,i)=>{if(t.out&&!t.out.ready&&m>=t.out.until){t.out.ready=true;
    if(GAME==='fc'){t.out=null;t.em=0;t.sh=0;mark(m,'xfer',`T${i+1} restored`);const msg=`T${i+1} is back in service.`;logE(m,msg,'ok');queueAlert(msg,'ok',false);play('ok');return;}
    const msg=t.out.kind==='planned'?`T${i+1} maintenance is finished. Close the T${i+1} breaker to put it back in service.`:t.out.kind==='trip'?`T${i+1} has been inspected after its trip. Close the T${i+1} breaker to put it back in service.`:`T${i+1} has been repaired. Close the T${i+1} breaker to put it back in service.`;
    logE(m,msg,'ok');queueAlert(msg,'ok',false);play('ok');}});
  PIDS.forEach(p=>{const f=S.pt[p].fault;if(f&&!f.ready&&m>=f.until){f.ready=true;const msg=f.flood?`The ${PR[p].name} 11 kV switchgear has been dried and tested. Close the transformer breaker, then the feeder breakers, to put the ${PR[p].name} feeders back on their own substation.`:`The ${PR[p].name} 33/11 kV transformer has been repaired. Close its 33 kV breaker to put the 11 kV feeders back on.`+(LF[p].some((v,i)=>!S.lf[p][i]&&feedOf(p,i)!==null)?' Feeders you moved elsewhere stay there until you move them back.':'');logE(m,msg,'ok');queueAlert(msg,'ok',false);play('ok');}});
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
      const s=`Fault on the T${i+1} circuit: ${f.cause.toLowerCase()}. T${i+1} tripped. Repair expected by ${fmtT(m+f.dur)}.`;logE(m,s,'alarm');alEv(m,'trip',`T${i+1}`,'tx:'+i,'fault');queueAlert(s,'alarm',true);play('fault');fx('cct'+i);}
    else if(type==='ic'){const it=S.it[id];if(it.fault)continue;it.fault={until:m+f.dur,ready:false,label:f.cause};const was=it.closed;it.closed=false;S.faults++;S.chain.push(`a fault on the ${devName('it:'+id)}`);mark(m,'fault',devName('it:'+id)+' fault');
      const s=`Fault on the ${devName('it:'+id)}: ${f.cause.toLowerCase()}. ${was?'It tripped. ':''}Repair expected by ${fmtT(m+f.dur)}.`;logE(m,s,'alarm');if(was)alEv(m,'trip',ucfirst(devName('it:'+id)),'it:'+id,'fault');queueAlert(s,'alarm',true);play('fault');fx('itg_'+id);}
    else if(type==='lv'){const[p,i]=lfP(id);if(!PIDS.includes(p)||S.lff[p][i])continue;const devs=[0,1].map(s=>srcDev(p,i,s)),dv=devs[f.sec];if(!dv)continue;
      const nm=lfName(p,i),fedN=[0,1].filter(s=>devs[s]===dv).reduce((a,s)=>a+custOf(p,i,s),0);
      if(f.tr){S.cust.si+=fedN;lose(m,'ar'+m,'ar','Auto-reclose',fedN/500);S.recloses++;mark(m,'ar','Auto-reclose');alEv(m,'ar',`${ucfirst(devName(dv))} (${PR[p].name})`,dv,'held in');logE(m,`${ucfirst(nm)} at ${PR[p].name} tripped and auto-reclosed: a transient fault (${f.cause.toLowerCase()}) cleared itself. ${nf(fedN)} customers had a short interruption.`,'info');play('ar');continue;}
      S.lff[p][i]={sec:f.sec,dur:f.dur,found:!!S.sc.easy,until:S.sc.easy?m+f.dur:null,start:m,label:f.cause,oh:!!LF_OH[p][i]};S.faults++;S.chain.push(`a fault on the ${nm}`);mark(m,'fault',LFN[p][i]+' fault');
      checkLv(m,null);const f2=S.lff[p][i];
      const how=LF_OH[p][i]&&dv.startsWith('lf:')?`The breaker at ${PR[p].name} tripped, auto-reclosed onto a permanent fault and locked out.`:`The ${devName(dv)} tripped${LF_OH[p][i]?' and locked out':' (underground cable, so no auto-reclose)'}.`;
      const mk=t=>`Fault on the ${nm} at ${PR[p].name}: ${f.cause.toLowerCase()}. ${how} ${nf(fedN)} customers are off.`+(f2.found?` It's in the ${SECN[f2.sec]}, repair expected by ${fmtT(f2.until)}.${S.sc.easy&&f2.sec?' Send a crew to open the mid-point switch, then close the breaker to restore the first half. Close the mid-point switch after the repair.':''}`:` The fault could be in either half. Send a crew to open the mid-point switch, then trial-close the breaker to find it. Line patrol will find it by ${fmtT(t+PATROL)} otherwise.`);
      const al=[];if(LF_OH[p][i]&&dv.startsWith('lf:'))al.push(['ar',`${ucfirst(devName(dv))} (${PR[p].name})`,dv,'onto a permanent fault']);al.push(['trip',`${ucfirst(devName(dv))} (${PR[p].name})`,dv,LF_OH[p][i]&&dv.startsWith('lf:')?'locked out':'fault']);
      if(CALLS_ON){if(!f2.found&&S.rngC()<.7)queueCall(m+3+Math.floor(S.rngC()*6),p,i,f2.sec,pick(S.rngC,f2.oh?HINT_OH:HINT_UG),'hint');// a caller who saw or heard it, in the faulted half
        if(!S.sc.easy&&dv==='lf:'+p+i&&S.rngC()<TELE_P){f2.hid=true;S.tele[p+i]={m,until:m+TELE_MIN+Math.floor(S.rngC()*TELE_VAR),mk,al};continue;}}// the RTU is slow to report it
      logE(m,mk(m),'alarm');al.forEach(a=>alEv(m,...a));queueAlert(mk(m),'alarm',true);play('fault');fx(elOf(dv));}
    else if(type==='pt'){const p=id,T=S.pt[p];if(!PIDS.includes(p)||T.fault)continue;let n=0;LF[p].forEach((v,i)=>[0,1].forEach(s=>{if(secFeed(p,i,s)===p)n+=custOf(p,i,s);}));
      const was=T.closed;T.closed=false;T.fault={until:m+f.dur,ready:false,label:f.cause};S.faults++;S.chain.push(`a fault on the ${PR[p].name} transformer`);mark(m,'fault',`${PR[p].name} transformer fault`);
      const s=`Fault on the ${PR[p].name} 33/11 kV transformer: ${f.cause.toLowerCase()}. ${was?`Its 33 kV breaker tripped automatically, so the 11 kV feeders at ${PR[p].name} have lost their supply (${nf(n)} customers). `:''}Repair expected by ${fmtT(m+f.dur)}. ${ptHow(p)}`;
      logE(m,s,'alarm');if(was)alEv(m,'trip',`${PR[p].name} transformer breaker`,'pt:'+p,'fault');queueAlert(s,'alarm',true);play('fault');fx('ptg_'+p);}
    else if(type==='ar'){const p=id;if(!PIDS.includes(p)||!fdOn(p)||Math.abs(S.flows['bc:'+p]||0)<.5)continue;let n=0;PIDS.forEach(q=>LF[q].forEach((v,i)=>[0,1].forEach(s=>{if(secFeed(q,i,s)===p)n+=custOf(q,i,s);})));
      S.cust.si+=n;lose(m,'ar'+m,'ar','Auto-reclose',n/500);S.recloses++;mark(m,'ar','Auto-reclose');alEv(m,'ar',`${PR[p].name} 33 kV feeder`,'bc:'+p,'held in');logE(m,`${PR[p].name} 33 kV feeder tripped and auto-reclosed: a transient fault (${f.cause.toLowerCase()}) cleared itself. ${nf(n)} customers had a short interruption.`,'info');play('ar');fx('fdg_'+p);}
    else{const p=id,fd=S.fd[p];if(fd.fault||(S.sc.easy&&PIDS.some(q=>S.fd[q].fault&&!S.fd[q].fault.planned)))continue;// easy shifts: one feeder fault at a time
      fd.fault={until:m+f.dur,ready:false,label:f.cause};S.faults++;S.chain.push(`a fault on the ${PR[p].name} feeder`);mark(m,'fault',`${PR[p].name} feeder fault`);
      const was=fd.brk&&fd.inc;fd.brk=false;fd.inc=false;
      const s=`Fault on the ${PR[p].name} 33 kV feeder: ${f.cause.toLowerCase()}. ${was?`Its breaker at Blackout Canyon and the incomer at ${PR[p].name} both tripped. `:''}Repair expected by ${fmtT(m+f.dur)}.`+(was?` Restore ${PR[p].name} through ${PR[p].nb?'the '+NBS[PR[p].nb].name+' tie or ':''}an interconnector.`:'');
      logE(m,s,'alarm');if(was)alEv(m,'trip',`${PR[p].name} breaker and incomer`,'bc:'+p,'fault');queueAlert(s,'alarm',true);play('fault');fx('fdg_'+p);}}
  if(S.cutout&&!S.cutout.fired&&m>=S.cutout.start){S.cutout.fired=true;mark(m,'fail','Wind stop');const s=`Spinney Windy Things shut down on high wind speed. Restart expected around ${fmtT(S.cutout.end)}.`;logE(m,s,'alarm');queueAlert(s,'alarm',true);play('warn');}
  if(S.cutout&&S.cutout.fired&&!S.cutout.done&&m>=S.cutout.end){S.cutout.done=true;logE(m,'Spinney Windy Things restarting.','ok');}
  if(S.op&&m>=S.op.at){const op=S.op;S.op=null;doOp(op,m);}
  if(!S.silent)stepCrews(m);
  if(!S.silent){stepLv(m);checkLv(m,null);stepFlood(m);stepCalls(m);}

  const c=comps(m,false),n=S.tx.filter(t=>!t.out).length;
  // Protection on topology: out-of-phase and long parallels
  let topo=groupsOf(edgesNow());
  topo.list.forEach(g=>{if(kindOf(g)==='bad'&&!S.silent){const ties=PIDS.filter(p=>g.nodes.includes(p)&&PR[p].nb==='fm'&&S.tie[p].closed);ties.forEach(p=>{S.tie[p].closed=false;alEv(m,'trip',`${NBS.fm.name} tie to ${PR[p].name}`,'tie:'+p,'out of phase');});
    incident(m,`Out-of-phase paralleling: Blackout Canyon or Ampy Place was connected to Watts This, which is on a different grid supply. The Watts This ${ties.length>1?'ties':'tie'} tripped.`,'pMimic');}});
  topo=groupsOf(edgesNow());
  const parG=topo.list.filter(g=>kindOf(g)==='par');
  if(parG.length){S.parMin++;if(S.parMin>PAR_MAX&&!S.silent){parG.forEach(g=>PIDS.filter(p=>g.nodes.includes(p)&&PR[p].nb==='kn'&&S.tie[p].closed).forEach(p=>{S.tie[p].closed=false;alEv(m,'trip',`${NBS.kn.name} tie to ${PR[p].name}`,'tie:'+p,'parallel too long');}));S.parMin=0;
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
    const s=`Overload trip: ${names} (${tripped[0].why}). The flow moves onto what is left. Inspection takes 90 minutes.`;logE(m,s,'alarm');tripped.forEach(x=>alEv(m,'trip','T'+(x.i+1),'tx:'+x.i,'protection'));queueAlert(s,'alarm',true);play('trip');tripped.forEach(x=>fx('cct'+x.i));}
  // circuit ratings
  S.spare={kn:spareOf('kn',m),fm:spareOf('fm',m),vf:VF_ON?spareOf('vf',m):0};
  S.lkLoad={};LKIDS.forEach(k=>{const L=LINKS[k];let f=0;if(S.lk[k])f=srcMW(L.a[0],L.a[1],L.b[0])+srcMW(L.b[0],L.b[1],L.a[0]);S.lkLoad[k]=f;
    const id='lk:'+k,Lr=f/L.r;if(!(S.lf[L.a[0]][L.a[1]]&&S.lf[L.b[0]][L.b[1]]&&midOn(L.a[0],L.a[1])&&midOn(L.b[0],L.b[1]))){S.ov[id+'x']=Lr>1.0001?(S.ov[id+'x']||0)+1:0;
      if(S.ov[id+'x']>=OV_MIN&&!S.silent){S.ov[id+'x']=0;S.lk[k]=false;S.trips++;S.chain.push(`the ${devName(id)} tripping`);mark(m,'trip',devName(id)+' trip');alEv(m,'trip',ucfirst(devName(id)),id,'overload');const s3=`Overload trip: the ${devName(id)} opened because it carried over its ${L.r} MW rating.`;logE(m,s3,'alarm');queueAlert(s3,'alarm',true);play('trip');fx('lkg_'+k);}}});
  S.vfLoad=VF_ON?PIDS.reduce((a,p)=>a+c.demand*S.share[p]*vfFrac(p),0):0;
  {const L=S.vfLoad/Math.max(1,S.spare.vf);S.ov.vf=VF_ON&&L>1.0001?(S.ov.vf||0)+1:0;
   if(S.ov.vf>=OV_MIN&&!S.silent){S.ov.vf=0;const tr=[];PIDS.forEach(p=>VFI.forEach(i=>{if(S.nop[p][i]&&!S.lf[p][i]){S.nop[p][i]=false;tr.push(LFN[p][i]);}}));S.trips++;S.chain.push('the Volt Face backfeeds tripping');mark(m,'trip','Volt Face trip');alEv(m,'trip','Volt Face backfeeds','nb:vf','overload');
     const s2=`Overload trip: Volt Face ran out of spare capacity and its backfeeds tripped (${tr.join(', ')}). Those customers are off until you restore them.`;logE(m,s2,'alarm');queueAlert(s2,'alarm',true);play('trip');}}const edL={};
  sol.E.forEach(e=>{let L=Math.abs(sol.flows[e.id]||0)/e.r;if(e.id.startsWith('tie:')){const nb=PR[e.id.slice(4)].nb;L=Math.max(L,Math.abs(sol.inj[nb])/Math.max(1,S.spare[nb]));}edL[e.id]=L;
    S.ov[e.id]=GAME==='cr'&&L>1.0001?(S.ov[e.id]||0)+1:0;
    if(S.ov[e.id]>=OV_MIN&&!S.silent){S.ov[e.id]=0;openEdge(e.id);S.trips++;S.chain.push(`the ${devName(e.id)} tripping`);mark(m,'trip',devName(e.id)+' trip');
      const why=e.id.startsWith('tie:')?`${NBS[PR[e.id.slice(4)].nb].name} ran out of spare capacity or the tie was over its ${e.r} MW rating`:`it was over its ${e.r} MW rating`;
      const s=`Overload trip: the ${devName(e.id)} opened because ${why}.`;alEv(m,'trip',ucfirst(devName(e.id)),e.id,'overload');logE(m,s,'alarm');queueAlert(s,'alarm',true);play('trip');fx(elOf(e.id));}});
  Object.keys(S.ov).forEach(k=>{if(!(k in edL))S.ov[k]=0;});S.edL=edL;
  if(!S.silent)updateAlarms(m,sol);
  if(S.sc.gsp){const G=S.sc.gsp;S.gspLoad=Math.max(0,S.net)+Math.max(0,S.inj.kn||0);
    if(!S.silent){
      if(m===G.warn){const s1=`National Grid warning: a supergrid transformer at Steve Towers is failing. From ${fmtT(G.start)} you will have to hold Blackout Canyon plus Ampy Place to ${G.limit} MW until ${fmtT(G.end)}. Ampy Place shares the grid supply, so it does not help. Use Watts This, Volt Face and, if you must, 11 kV feeders.`;logE(m,s1,'alarm');queueAlert(s1,'alarm',true);play('warn');}
      if(m===G.start){const s2=`National Grid instruction: Steve Towers is down to one supergrid transformer. Get below ${G.limit} MW by ${fmtT(G.deadline)} (now ${Math.round(S.gspLoad)} MW).`;logE(m,s2,'alarm');queueAlert(s2,'alarm',true);play('emerg');mark(m,'fail','GSP limit');}
      if(m>=G.deadline&&m<G.end){if(S.gspLoad>G.limit+.5){S.gspOver++;S.insecureMin++;lose(m,'gsp','gsp','Over the National Grid limit at Steve Towers',20);
          if(S.gspOver>=15){S.gspOver=0;const live=S.tx.map((t,i)=>[t,i]).filter(([t])=>!t.out).sort((a,b)=>Math.abs(b[0].flow)-Math.abs(a[0].flow));
            if(live.length){const[t,i]=live[0];t.out={kind:'trip',until:m+90,ready:false,label:'Disconnected by National Grid'};S.gspTrips++;S.trips++;S.chain.push('National Grid disconnecting T'+(i+1));mark(m,'trip','GSP disconnect');alEv(m,'trip','T'+(i+1),'tx:'+i,'National Grid');
              const s3=`National Grid disconnected T${i+1} at Steve Towers to protect the grid, because Blackout Canyon stayed above the ${G.limit} MW limit. It can be closed again after 90 minutes.`;logE(m,s3,'alarm');queueAlert(s3,'alarm',true);play('trip');fx('cct'+i);}}}
        else S.gspOver=0;}
      if(m===G.end){logE(m,'National Grid has lifted the Steve Towers limit. Normal running can resume.','ok');queueAlert('National Grid has lifted the Steve Towers limit.','ok',false);play('ok');}}}
  let allOff=true;
  {const C=S.cust;PIDS.forEach(p=>LF[p].forEach((f,i)=>SECF.forEach((h,sx)=>{const k=p+i+'s'+sx,fed=secFeed(p,i,sx,sup)!==null,n=Math.round(CUST_TOTAL*S.share[p]*f*h);
    const P=prioOf(p,i),pr=P&&P.sec===sx?P:null;
    if(!fed){const o=C.off[k]=(C.off[k]||0)+1,w=(C.why||(C.why={}))[k]=offWhy(p,i,sx,sup);let d=0;if(o===1)callsFor(m,p,i,sx,n);if(o===SHORT_INT){C.ci+=n;C.cml+=SHORT_INT*n;d=n/100+SHORT_INT*n/500;}else if(o>SHORT_INT){C.cml+=n;d=n/500;}lose(m,w.k,w.r,w.l,d);
      if(pr&&!S.silent){const x=PRK[pr.kind].pts;C.pri+=x;C.pmin[p+i]=(C.pmin[p+i]||0)+1;lose(m,'prio:'+p+i,w.r==='repair'?'prio_rep':'prio',`${pr.name} off supply (${lfName(p,i)}, ${PR[p].name})`,x);
        if(o===1){const s=`${pr.name} is off supply on the ${lfName(p,i)} at ${PR[p].name}. ${PRK[pr.kind].label==='Hospital'?'The hospital':pr.kind==='care'?'The care home':'These customers'} cost${pr.kind==='psr'?'':'s'} ${x} extra points a minute until restored.`;logE(m,s,'alarm');queueAlert(s,'alarm',false);}}}
    else if(C.off[k]){if(C.off[k]<SHORT_INT){C.si+=n;const w=C.why&&C.why[k];if(w)lose(m,w.k,w.r,w.l,n/500);}
      if(pr&&!S.silent)logE(m,`${pr.name} back on supply after ${C.off[k]} min.`,'ok');C.off[k]=0;}})));
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
  {const cp=S.cp||(S.cp={});Object.entries(SPEND_L).forEach(([k,l])=>{lose(m,'sp:'+k,'sp_'+k,l,(S.cost[k]-(cp[k]||0))/10);cp[k]=S.cost[k];});}
  S.sec=security(av);if(S.sec.insecure&&!S.silent){S.insecureMin++;lose(m,'risk','risk',`${ucfirst(secName(S.sec.secs||[]))} at risk: not secure for the next loss`,20);}
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
  Object.keys(A).forEach(k=>{if(!seen[k]&&!A[k].ev)delete A[k];});}
const anyOver=()=>S&&Object.values(S.alarms).some(a=>a.lvl==='over');
let lastAl='';
function renderAlarms(){const red=a=>a.lvl==='over'||a.ev==='trip',list=Object.values(S.alarms).sort((a,b)=>red(b)-red(a)||!!b.ev-!!a.ev||b.since-a.since||b.L-a.L),un=list.filter(a=>!a.ack).length;
  const h=list.length?`<ul class="al-list">${list.map(a=>a.ev?`<li class="al ${a.ev==='trip'?'over':'high'} unack"><button type="button" data-sel="${a.sel}" data-k="al-${a.id}"><span class="al-l">${a.ev==='trip'?'Trip':'Auto-reclose'}</span><span class="al-n">${esc(a.name)}</span><span class="al-v"></span><span class="al-t">at ${fmtT(a.since)}${a.note?' · '+esc(a.note):''}</span></button></li>`:`<li class="al ${a.lvl}${a.ack?'':' unack'}"><button type="button" data-sel="${a.sel}" data-k="al-${a.id}"><span class="al-l">${a.lvl==='over'?'Overload':'High load'}</span><span class="al-n">${esc(a.name)}</span><span class="al-v">${Math.round(a.L*100)}%</span><span class="al-t">since ${fmtT(a.since)}${a.trip!=null?' · trips in '+a.trip+' min':a.lvl==='over'&&a.id.startsWith('nb:')?' · ties trip in '+OV_MIN+' min if it stays over':''}</span></button></li>`).join('')}</ul>`
    :'<p class="empty">No alarms. Anything above 80% of its rating, and every breaker trip or auto-reclose, shows here.</p>';
  const k=h+'|'+un;if(k!==lastAl){lastAl=k;$('alBody').innerHTML=h;alSeen=slideNew($('alBody'),alSeen);}
  txt('alCount',list.length?String(list.length):'');setAttr($('alCount'),'class','al-count'+(list.some(red)?' over':list.length?' high':''));
  $('ackBtn').hidden=!un;setAttr($('pAlarm'),'class','panel p-alarm'+(un?' ringing':''));
  setAttr($('dAl'),'class','al-count'+(list.some(red)?' over':list.length?' high':''));txt('dAl',list.length?String(list.length):'');}
function ackAll(){Object.values(S.alarms).forEach(a=>{if(a.ev)delete S.alarms[a.id];else a.ack=true;});lastAl='';render(true);}

/* ---------- Switching ---------- */
function opLabel(k,act){const[type,id]=k.split(':');
  if(type==='tx')return `${act==='close'?'Close':'Open'} T${+id+1} breaker`;
  if(type==='bc')return `${act==='close'?'Close':'Open'} ${PR[id].name} breaker at Blackout Canyon`;
  if(type==='in')return `${act==='close'?'Close':'Open'} ${PR[id].name} incomer`;
  if(type==='lf')return `${act==='close'?'Close':'Open'} the ${devName(k)} at ${PR[id.slice(0,2)].name}`;
  if(type==='nop'||type==='pt')return `${act==='close'?'Close':'Open'} the ${devName(k)}`;
  if(type==='bs')return `${act==='close'?'Close':'Open'} the ${devName(k)}`;
  if(type==='tie')return `${act==='close'?'Close':'Open'} ${NBS[PR[id].nb].name} tie to ${PR[id].name}`;
  if(type==='lk')return `${act==='close'?'Close':'Open'} the ${devName(k)}`;
  if(type==='mid')return `${act==='close'?'Close':'Open'} the ${devName(k)}`;
  if(type==='mg')return act==='close'?`Connect a mobile generator to ${LFN[id.slice(0,2)][+id.slice(2)]}`:`Disconnect the ${devName(k)}`;
  return `${act==='close'?'Close':'Open'} ${PR[ITS[id].a].name} – ${PR[ITS[id].b].name} interconnector`;}
const crewAt=k=>S.crews.find(c=>c.at===k&&!c.to);
const crewFor=k=>S.crews.find(c=>c.job&&c.job.k===k);
function devXY(k){const b=SELBOX[k];return b?{x:b[0]+b[2]/2,y:b[1]+b[3]/2}:{x:DEPOT.x,y:DEPOT.y};}
function crewPos(c,tNow){if(!c.to)return{x:c.x,y:c.y};const f=clamp((tNow-c.dep)/Math.max(.01,c.arr-c.dep),0,1),dx=c.to.x-c.from.x,dy=c.to.y-c.from.y,tot=Math.abs(dx)+Math.abs(dy)||1,d=f*tot;
  return d<=Math.abs(dx)?{x:c.from.x+Math.sign(dx)*d,y:c.from.y}:{x:c.to.x,y:c.from.y+Math.sign(dy)*(d-Math.abs(dx))};}
function dispatch(k,act){if(!S||S.ended||!CREW_ON)return;
  if(crewFor(k)){showBanner({m:S.t,text:`Crew ${crewFor(k).n} is already on its way to the ${devName(k)}.`,lvl:'warn'});return;}
  let mgu=null,opT=CREW_OP;if(k.startsWith('mg:')&&act==='close'){const id=k.slice(3);if(mgOn(...lfP(id)))return;
    if(!mgAt(id)){mgu=S.mgu.find(x=>!x.site)||S.mgu.find(x=>!x.conn&&!x.pend);if(!mgu){showBanner({m:S.t,text:`Both mobile generators are connected elsewhere. Disconnect one before sending it here.`,lvl:'warn'},'Mobile generators restore a dead section of feeder, up to '+MG_CAP+' MW each.');return;}opT=MG_CONN;}}
  let c=crewAt(k)&&!crewAt(k).job?crewAt(k):null;const tgt=devXY(k);
  if(!c){const idle=S.crews.filter(x=>!x.job);if(!idle.length){showBanner({m:S.t,text:S.crews.length===1?'Your only field crew is busy. Wait for it to finish its job.':`All ${['','one','two','three','four'][S.crews.length]||S.crews.length} field crews are busy. Wait for one to finish its job.`,lvl:'warn'},'Crews walk to manual switches, which takes time. Send one ahead to stand by where you will need it.');return;}
    c=idle.sort((a,b)=>{const pa=crewPos(a,S.t),pb=crewPos(b,S.t);return(Math.abs(pa.x-tgt.x)+Math.abs(pa.y-tgt.y))-(Math.abs(pb.x-tgt.x)+Math.abs(pb.y-tgt.y));})[0];}
  const p=crewPos(c,S.t),dist=Math.abs(p.x-tgt.x)+Math.abs(p.y-tgt.y),travel=c.at===k?0:Math.max(2,Math.round(dist/CREW_SPEED));
  if(travel){c.from={x:p.x,y:p.y};c.to=tgt;c.dep=S.t;c.arr=S.t+travel;c.at=null;}
  c.job={k,act,at:S.t+travel+(act?opT:0),arr:S.t+travel};
  if(mgu){if(mgu.site&&mgu.site!==k.slice(3))logE(S.t,`Mobile generator ${mgu.n} is being moved from ${LFN[mgu.site.slice(0,2)][+mgu.site.slice(2)]}.`,'info');mgu.site=k.slice(3);mgu.conn=false;mgu.pend=true;}
  logE(S.t,act?`Crew ${c.n} sent to ${opLabel(k,act).toLowerCase()}${opT===MG_CONN?' (towing and connecting a generator takes '+MG_CONN+' min)':''}. Arrives ${fmtT(S.t+travel)}, done by ${fmtT(c.job.at)}.`:`Crew ${c.n} sent to stand by at the ${devName(k)}. Arrives ${fmtT(S.t+travel)}.`,'info');
  play('click');lastInsp='';render(true);}
function stepCrews(m){if(!CREW_ON)return;S.crews.forEach(c=>{
  if(c.to&&m>=c.arr){c.x=c.to.x;c.y=c.to.y;c.to=null;c.at=c.job?c.job.k:c.at;}
  if(c.job&&m>=c.job.at){const j=c.job;c.job=null;c.at=j.k;if(j.act){S.crewJobs++;doOp({k:j.k,act:j.act},m);}else logE(m,`Crew ${c.n} is standing by at the ${devName(j.k)}.`,'ok');}});}
function issueOp(k,act){if(!S||S.ended||GAME==='fc')return;
  if(isManual(k)){dispatch(k,act);return;}
  if(S.op){showBanner({m:S.t,text:`Wait for the current operation (${opLabel(S.op.k,S.op.act).toLowerCase()}) to finish.`,lvl:'warn'},'Each operation takes one minute.');return;}
  S.op={k,act,at:S.t+1};logE(S.t,`Operating: ${opLabel(k,act).toLowerCase()}.`,'info');play('click');lastInsp='';render(true);}
function doOp(op,m){if(CALLS_ON&&S.tele){const[t,id]=op.k.split(':');if(['lf','mid','nop','mg'].includes(t)&&S.tele[id])reveal(m,id,'op');}doOp0(op,m);if(LV_ON&&op.act==='close'){genCheck(m,op.k);checkLv(m,op.k);}}
function genCheck(m,k){(S.mgu||[]).forEach(u=>{if(!u.conn)return;const[p,i]=lfP(u.site);if(lvConflict(p,i)!=='gen')return;u.conn=false;
  incident(m,`Closing the ${devName(k)} put another supply onto the mobile generator at ${LFN[p][i]} without synchronising, so the generator tripped. Disconnect a generator before closing anything else onto its section.`,'mgg_'+u.site);});}
function doOp0(op,m){const[type,id]=op.k.split(':');play('op');
  if(type==='tx'){const i=+id,t=S.tx[i];
    if(op.act==='close'){if(!t.out)return;
      if(!t.out.ready){t.out.until+=30;incident(m,`T${i+1} was closed before ${t.out.kind==='planned'?'its maintenance was finished':t.out.kind==='trip'?'its inspection was finished':'it was repaired'}. Protection tripped it straight away, and it now takes 30 minutes longer to come back.`,'cct'+i);return;}
      const alive=S.tx.some(x=>!x.out);t.out=null;t.em=0;t.sh=0;mark(m,'xfer',`T${i+1} restored`);logE(m,`T${i+1} breaker closed. T${i+1} is back in service.`,'ok');
      if(!alive){const g=groupsOf(edgesNow());if(g.list.some(x=>kindOf(x)==='bad'))logE(m,'Re-energising Blackout Canyon joined it to Watts This.','warn');}}
    else{if(t.out)return;t.out={kind:'open',until:m,ready:true,label:'Switched out by control'};mark(m,'xfer',`T${i+1} opened`);logE(m,`T${i+1} breaker opened. T${i+1} is switched out.`,'warn');}
    return;}
  const k=op.k,nm=devName(k);
  if(type==='pt'){const p=id,T=S.pt[p],ld=()=>Math.round(LF[p].reduce((a,v,i)=>a+srcMW(p,i,p),0));if((op.act==='close')===T.closed)return;
    if(op.act==='open'){const mwv=ld();T.closed=false;mark(m,'xfer',nm+' opened');logE(m,`${ucfirst(nm)} opened: the ${PR[p].name} 11 kV feeders are off their own substation`+(mwv?` (about ${mwv} MW of customers off supply).`:'.'),mwv?'warn':'ok');return;}
    if(T.fault&&!T.fault.ready&&T.fault.flood){T.fault.until+=30;alEv(m,'trip',ucfirst(nm),k,'flooded');incident(m,`The ${nm} was closed onto the flooded switchgear at ${PR[p].name}. It tripped straight away, and the drying and testing now take 30 minutes longer.`,'ptg_'+p,'flood_close');return;}
    if(T.fault&&!T.fault.ready){T.fault.until+=30;alEv(m,'trip',ucfirst(nm),k,'closed onto fault');incident(m,`The ${nm} was closed onto the faulted transformer. It tripped straight away, and the repair now takes 30 minutes longer.`,'ptg_'+p);return;}
    const bad=LF[p].findIndex((v,i)=>{const l=linkOf(p,i);return S.lf[p][i]&&midOn(p,i)&&l&&S.lk[l.k]&&S.lf[l.q][l.j]&&midOn(l.q,l.j)&&subLv(l.q)&&subOn(p)&&grpOf(S.sup[p])!==grpOf(S.sup[l.q]);});
    if(bad>=0){const l=linkOf(p,bad);alEv(m,'trip',ucfirst(nm),k,'out of phase');incident(m,`The ${nm} was closed while ${LFN[p][bad]} was linked at 11 kV to ${PR[l.q].name}, which is on a different grid supply. That paralleled two grid supplies, so the breaker tripped straight away. Open the 11 kV link first.`,'ptg_'+p);return;}
    T.closed=true;if(T.fault&&T.fault.ready)T.fault=null;mark(m,'xfer',nm+' closed');const mwv=ld();
    logE(m,`${ucfirst(nm)} closed: the ${PR[p].name} 33/11 kV transformer is back in service`+(mwv?` and about ${mwv} MW of customers are on from it.`:'.')+(subOn(p)?'':` ${PR[p].name} has no 33 kV supply yet.`),'ok');return;}
  if(type==='mid'){const[p,i]=lfP(id),v=midOn(p,i),fn=LFN[p][i];if((op.act==='close')===v)return;
    if(op.act==='open'){const b=secOff(p,i).length;S.mid[p][i]=false;const lost=secOff(p,i).length>b;mark(m,'xfer',nm+' opened');
      logE(m,`${ucfirst(nm)} opened: ${fn} is split into two halves.`+(lost?` About ${Math.round(lfMW(p,i)*SECF[1])} MW of customers beyond it are off supply.`:''),lost?'warn':'ok');return;}
    S.mid[p][i]=true;const cf=lvConflict(p,i);
    if(cf==='vf'||cf==='grid'){S.mid[p][i]=false;const td=cf==='vf'?'nop:'+id:'lk:'+linkOf(p,i).k;tripDev(td);alEv(m,'trip',ucfirst(devName(td)),td,'out of phase');incident(m,`Closing the ${nm} paralleled ${PR[p].name} with ${cf==='vf'?'Volt Face':'a substation'} on a different grid supply, so protection tripped the ${cf==='vf'?'backfeed':'11 kV link'}. Open one end of ${fn} first.`,'midb_'+id);return;}
    mark(m,'xfer',nm+' closed');logE(m,`${ucfirst(nm)} closed: ${fn} is one feeder again.`,'ok');return;}
  if(type==='mg'){const[p,i]=lfP(id),u=mgAt(id),fn=LFN[p][i];if(!u)return;
    if(op.act==='open'){u.pend=false;if(!u.conn)return;u.conn=false;mark(m,'xfer','Generator off');logE(m,`The ${nm} was disconnected. It stays parked there until you send it somewhere else.`,'info');return;}
    u.pend=false;if(u.conn)return;
    if(secFeed(p,i,1)!==null){const s=`The crew could not connect the ${nm}: the far end of ${fn} is still live. Make that half dead first (open the mid-point switch or the backfeed), then connect it.`;logE(m,s,'warn');queueAlert(s,'warn',false);return;}
    u.conn=true;const ld=srcMW(p,i,'mg');mark(m,'xfer','Generator on');
    logE(m,`Mobile generator ${u.n} connected at the far end of ${fn}: supplying about ${Math.round(ld)} MW (rated ${MG_CAP} MW).${ld>MG_CAP?' That is over its rating, so it will trip. Open the mid-point switch first.':''}`,ld>MG_CAP?'warn':'ok');return;}
  if(type==='nop'){const[p,i]=lfP(id),v=S.nop[p][i];if((op.act==='close')===v)return;const mwv=Math.round(lfMW(p,i)),fn=LFN[p][i];
    if(op.act==='close'&&S.lf[p][i]&&midOn(p,i)){alEv(m,'trip',ucfirst(nm),k,'out of phase');incident(m,`The ${nm} was closed while the ${fn} feeder breaker at ${PR[p].name} was still closed. That paralleled Blackout Canyon with Volt Face, which is on a different grid supply, so the backfeed tripped straight away. Open the feeder breaker first.`,'nopb_'+id);return;}
    S.nop[p][i]=op.act==='close';mark(m,'xfer',nm+(v?' opened':' closed'));
    logE(m,v?(S.lf[p][i]?`${ucfirst(nm)} opened.`:`${ucfirst(nm)} opened: about ${mwv} MW of ${fn} customers are off supply.`):`${ucfirst(nm)} closed: ${fn} (about ${mwv} MW) is now fed from Volt Face.`,v&&!S.lf[p][i]?'warn':'ok');return;}
  if(type==='lf'&&op.act==='close'&&floodOn(id.slice(0,2))){const p=id.slice(0,2),T=S.pt[p];T.fault.until+=30;alEv(m,'trip',`${ucfirst(nm)} (${PR[p].name})`,k,'flooded');incident(m,`The ${nm} breaker at ${PR[p].name} was closed onto the flooded switchboard. It tripped straight away, and the drying and testing now take 30 minutes longer.`,'lfb_'+id,'flood_close');return;}
  if(type==='lf'&&op.act==='close'){const[p,i]=lfP(id),l=linkOf(p,i);
    if(l&&S.lk[l.k]&&S.lf[l.q][l.j]&&midOn(p,i)&&midOn(l.q,l.j)&&subLv(l.q)&&subLv(p)&&grpOf(S.sup[p])!==grpOf(S.sup[l.q])){alEv(m,'trip',`${ucfirst(nm)} (${PR[p].name})`,k,'out of phase');incident(m,`The ${nm} breaker at ${PR[p].name} was closed while it was linked at 11 kV to ${PR[l.q].name}, which is on a different grid supply. That paralleled two grid supplies, so the breaker tripped straight away. Open the 11 kV link first.`,'lfb_'+id);return;}
    if(l&&S.lk[l.k]&&S.lf[l.q][l.j]&&midOn(p,i)&&midOn(l.q,l.j)&&subLv(l.q)&&subLv(p))logE(m,`${ucfirst(nm)} closed with the ${devName('lk:'+l.k)} closed: ${PR[p].name} and ${PR[l.q].name} are now paralleled at 11 kV. Open one side to finish the transfer.`,'warn');}
  if(type==='lf'&&op.act==='close'){const[p,i]=lfP(id);if(S.nop[p][i]&&midOn(p,i)){alEv(m,'trip',`${ucfirst(nm)} (${PR[p].name})`,k,'out of phase');incident(m,`The ${nm} breaker at ${PR[p].name} was closed while ${LFN[p][i]} was still fed from Volt Face. That paralleled two different grid supplies, so the breaker tripped straight away. Open the Volt Face backfeed first.`,'lfb_'+id);return;}}
  if(type==='lf'){const[p,i]=lfP(id),v=S.lf[p][i];if((op.act==='close')===v)return;S.lf[p][i]=op.act==='close';const mwv=Math.round(S.c.demand*S.share[p]*LF[p][i]);
    mark(m,'xfer',nm+(v?' opened':' closed'));logE(m,v?`${ucfirst(nm)} at ${PR[p].name} opened: about ${mwv} MW of customers are off supply.`:`${ucfirst(nm)} at ${PR[p].name} closed: about ${mwv} MW of customers are back on.`,v?'warn':'ok');return;}
  if(op.act==='open'){if(!isClosed(k))return;openEdge(k);mark(m,'xfer',nm+' opened');logE(m,`${ucfirst(nm)} opened.`,'info');return;}
  if(isClosed(k))return;
  if(type==='bc'||type==='in'){const f=S.fd[id];if(f.fault&&!f.fault.ready){f.fault.until+=30;alEv(m,'trip',ucfirst(nm),k,'closed onto fault');incident(m,f.fault.planned?`The ${nm} was closed while field staff were still working on the feeder. It tripped straight away, and the work now takes 30 minutes longer.`:`The ${nm} was closed onto the faulted feeder. It tripped straight away, and the repair now takes 30 minutes longer.`,'fdg_'+id);return;}}
  if(type==='it'){const f=S.it[id];if(f.fault&&!f.fault.ready){f.fault.until+=30;alEv(m,'trip',ucfirst(nm),k,'closed onto fault');incident(m,`The ${devName(k)} was closed onto its fault. It tripped straight away, and the repair now takes 30 minutes longer.`,'itg_'+id);return;}}
  const before=groupsOf(edgesNow()),after=groupsOf(edgesNow(k));
  const ends=G=>type==='bc'||type==='in'?[G.IS.of[FSEC[id]],id]:type==='bs'?[G.IS.of[id==='12'?'B1':'B2'],G.IS.of[id==='12'?'B2':'B3']]:type==='tie'?[id,PR[id].nb]:type==='lk'?[LINKS[id].a[0],LINKS[id].b[0]]:[ITS[id].a,ITS[id].b];
  const[ea,eb]=ends(before),ga=before.of(ea),gb=before.of(eb),gj=after.of(ends(after)[0]),kind=kindOf(gj);
  if(kind==='bad'){
    let tripped=[];
    if(type==='tie'&&PR[id].nb==='fm'){const p=id;if(S.fd[p].inc){S.fd[p].inc=false;tripped.push(`${PR[p].name} incomer`);alEv(m,'trip',`${PR[p].name} incomer`,'in:'+p,'out of phase');}
      ITIDS.filter(k2=>(ITS[k2].a===p||ITS[k2].b===p)&&S.it[k2].closed).forEach(k2=>{S.it[k2].closed=false;tripped.push(devName('it:'+k2));alEv(m,'trip',ucfirst(devName('it:'+k2)),'it:'+k2,'out of phase');});}
    else{const g=ga.src.includes('fm')?ga:gb;PIDS.filter(p=>g.nodes.includes(p)&&PR[p].nb==='fm'&&S.tie[p].closed).forEach(p=>{S.tie[p].closed=false;tripped.push(`${NBS.fm.name} tie to ${PR[p].name}`);alEv(m,'trip',`${NBS.fm.name} tie to ${PR[p].name}`,'tie:'+p,'out of phase');});}
    if(type==='bc'||type==='in')S.fd[id].fault=S.fd[id].fault&&S.fd[id].fault.ready?null:S.fd[id].fault;
    alEv(m,'trip',ucfirst(nm),k,'out of phase');incident(m,`Out-of-phase close: closing the ${nm} tried to parallel Watts This with ${gj.src.filter(s=>s!=='fm').map(s=>isBC(s)?'Blackout Canyon':NBS[s].name).filter((v,i,a)=>a.indexOf(v)===i).join(' and ')}, which is on a different grid supply. The ${nm} tripped${tripped.length?', and so did the '+tripped.join(', '):''}.`,elOf(k));
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
  S.lost={m,why};mark(m,'lost','Site lost');lose(m,'lost','lost','Blackout Canyon lost',(END-m)*10+5000);
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
const TIEARW={hw:[96,330,-1],ml:[300,603,-1],rv:[1000,633,1],js:[1085,330,1]};
const ADJ_TIP={batt:['Discharge more: offsets Hertz House\'s load','Charge more: adds load at Hertz House'],dsr:['Reduce demand more','Reduce demand less'],chp:['Run the gas engine harder','Run the gas engine less'],solar:['Curtail less','Curtail more'],wind:['Curtail less','Curtail more']};
function adjBtn(id,x,y,d){const up=d>0,tip=(ADJ_TIP[id]||['Turn up','Turn down'])[up?0:1];return `<g class="adj" id="adj_${id}_${up?'u':'d'}" data-adj="${id}" data-d="${d}" role="button" aria-label="${tip}"><title>${tip}</title><rect x="${x}" y="${y}" width="22" height="19" rx="4"/><path d="${up?`M${x+5} ${y+13.5}h12l-6-8z`:`M${x+5} ${y+5.5}h12l-6 8z`}"/></g>`;}
function buildMimic(){
  const ng=S&&NOGEN();
  let s=`<text class="t-bus" x="400" y="26">STEVE TOWERS GSP · 132 kV</text><line class="bus hv" x1="400" y1="40" x2="800" y2="40"/>`;
  s+=`<rect class="hit" data-sel="nb:kn" x="12" y="222" width="104" height="398"/>
    <text class="nb-name kn" x="16" y="236">AMPY PLACE</text><text id="nbs_kn" class="nb-s" x="16" y="251">Spare 65 MW</text><text class="nb-r" x="16" y="264">Same grid supply</text>
    <line class="bus nbus kn" x1="40" y1="276" x2="40" y2="618"/>`;
  s+=`<rect class="hit" data-sel="nb:fm" x="1074" y="222" width="122" height="428"/>
    <text class="nb-name fm" x="1188" y="236" text-anchor="end">WATTS THIS</text><text id="nbs_fm" class="nb-s" x="1188" y="251" text-anchor="end">Spare 60 MW</text><text class="nb-r" x="1188" y="264" text-anchor="end">Different grid supply</text>
    <line class="bus nbus fm" x1="1160" y1="276" x2="1160" y2="648"/>`;
  SELBOX['nb:kn']=[10,220,110,402];SELBOX['nb:fm']=[1072,220,126,432];
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
    if(P.fd)s+=`<g id="fdg_${p}"><line id="fdl_${p}" class="cond mv fd-${p}" x1="${x}" y1="${BCY}" x2="${x}" y2="${PY}"/><line id="fdf_${p}" class="flow" x1="${x}" y1="${BCY+34}" x2="${x}" y2="${PY-4}"/>
      <rect id="fbk_${p}" class="brk sw" x="${x-9}" y="${BCY+14}" width="18" height="18"/>
      <rect id="fin_${p}" class="brk sw" x="${x-9}" y="${PY-50}" width="18" height="18"/><text class="bs-t" x="${x-14}" y="${PY-37}" text-anchor="end">IN</text>
      <g id="fdb_${p}" hidden><path class="bolt" d="M${x+20} 238 l-8 14 h7 l-5 13 l12 -17 h-7 l6 -10 z"/></g>
      <text id="fdt_${p}" class="fd-t" x="${p==='ml'?x-14:x+14}" y="${BCY+28}"${p==='ml'?' text-anchor="end"':''}></text>
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
      <text id="itt_${k}" class="tie-t" x="${t.left?t.x-14:t.x+14}" y="${t.sy+4}" text-anchor="${t.left?'end':'start'}">open</text>${arw('ita_'+k,t.x,t.sy-38)}
      <rect class="hit" data-sel="it:${k}" x="${t.left?t.x-40:t.x-22}" y="${t.sy-22}" width="${t.left?80:102}" height="${t.left?56:44}"/></g>`;
      SELBOX['it:'+k]=[t.x-17,t.sy-17,34,34];return;}
    s+=`<g id="itg_${k}"><path id="itl_${k}" class="tie-l it" d="M${x1} ${PY} H${x2}"/>
      <rect id="itsw_${k}" class="brk sw open man" x="${t.x-9}" y="${PY-9}" width="18" height="18" rx="${CREW_ON?9:0}"/>
      <text id="itt_${k}" class="tie-t" x="${t.x}" y="${PY+26}" text-anchor="middle">open</text>${arw('ita_'+k,t.x,PY-15)}
      <rect class="hit" data-sel="it:${k}" x="${t.x-22}" y="${PY-22}" width="44" height="54"/></g>`;
    SELBOX['it:'+k]=[t.x-17,PY-17,34,34];});
  ASSETS.filter(a=>PIDS.includes(a.prim)&&(!ng||a.type==='load')).forEach(a=>{const x=a.x,bY=pY(a.prim),ay=bY+(a.type==='load'?TXD:0),y=ay+48+(a.type==='load'?LVD:0);let sym='';const col=a.col||'var(--muted)';
    if(a.type==='load'){const p=a.prim,by=ay+16;
      sym=LDX.map((dx,i)=>LV_ON?`<line id="lfl_${p}${i}" class="cond mv" x1="${x+dx}" y1="${by}" x2="${x+dx}" y2="${ay+44}"/><line id="lfm_${p}${i}" class="cond mv" x1="${x+dx}" y1="${ay+56}" x2="${x+dx}" y2="${y+4}"/><rect id="lfb_${p}${i}" class="brk sw" x="${x+dx-6}" y="${by+6}" width="12" height="12"/><rect id="midb_${p}${i}" class="brk sw man mid" x="${x+dx-6}" y="${ay+44}" width="12" height="12" rx="6"/><path id="lft_${p}${i}" class="sym" d="M${x+dx-7} ${y+4} L${x+dx+7} ${y+4} L${x+dx} ${y+17} Z"/>`
        :`<line id="lfl_${p}${i}" class="cond mv" x1="${x+dx}" y1="${by}" x2="${x+dx}" y2="${y+4}"/><rect id="lfb_${p}${i}" class="brk sw" x="${x+dx-6}" y="${by+8}" width="12" height="12"/><path id="lft_${p}${i}" class="sym" d="M${x+dx-7} ${y+4} L${x+dx+7} ${y+4} L${x+dx} ${y+17} Z"/>`).join('');
      if(PRIO_ON)LDX.forEach((dx,i)=>{const P=prioOf(p,i);if(!P)return;const fx=x+dx+12,K=PRK[P.kind];sym+=`<g id="pri_${p}${i}" class="pri pri-${P.kind}"><title>${esc(P.name)}</title><circle cx="${fx}" cy="${y-3}" r="7"/><text x="${fx}" y="${y+0.3}" text-anchor="middle">${K.ch}</text></g>`;});
      if(LV_ON)LDX.forEach((dx,i)=>{const fx=x+dx;sym+=`<g id="mgg_${p}${i}" class="mg" hidden><path class="mg-l" d="M${fx} ${VF_ON&&VFI.includes(i)?y+40:y+17} V${y+45.5}"/><circle cx="${fx}" cy="${y+52}" r="6.5"/><text x="${fx}" y="${y+55}" text-anchor="middle">G</text></g>`;SELBOX['mg:'+p+i]=[fx-9,y+43,18,18];});
      s+=`<line id="alb_load_${p}" class="cond mv" x1="${x+LDX[0]-2}" y1="${by}" x2="${x+LDX[2]+2}" y2="${by}" style="stroke-width:3"/>`;
      if(VF_ON)VFI.forEach(i=>{const fx=x+LDX[i];sym+=`<path id="nopl_${p}${i}" class="vf-l" d="M${fx} ${y+17} V${y+24} M${fx} ${y+34} V${y+40}"/><rect id="nopb_${p}${i}" class="brk sw nop open" x="${fx-5}" y="${y+24}" width="10" height="10" rx="5"/>`;});}
    if(a.type==='dsr')sym=`<path class="sym-o" d="M${x-11} ${y} L${x+11} ${y} L${x} ${y+20} Z"/>`;
    if(a.type==='solar')sym=`<rect class="sym-o" x="${x-15}" y="${y}" width="30" height="24"/><path class="sym-l" d="M${x-15} ${y+24} L${x+15} ${y}"/><path class="sym-l" d="M${x+3} ${y+18} h8 M${x+3} ${y+21} h8"/>`;
    if(a.type==='wind')sym=`<circle class="sym-o" cx="${x}" cy="${y+14}" r="14"/><g id="blades" class="blades"><path class="sym-l" d="M${x} ${y+14} V${y+4} M${x} ${y+14} L${x+8.7} ${y+19} M${x} ${y+14} L${x-8.7} ${y+19}"/></g>`;
    if(a.type==='batt')sym=`<path class="sym-l" d="M${x-15} ${y} h30 M${x-8} ${y+6} h16 M${x-15} ${y+12} h30 M${x-8} ${y+18} h16" style="stroke-width:2.5"/>`;
    if(a.type==='chp')sym=`<circle class="sym-o" cx="${x}" cy="${y+14}" r="14"/><text x="${x}" y="${y+19}" text-anchor="middle" style="font:700 13px var(--f-display)">G~</text>`;
    s+=a.type==='load'?`<g id="ptg_${a.prim}" class="ptg"><title>${esc(PR[a.prim].name)} 33/11 kV transformer and its automatic 33 kV breaker</title><line id="al_${a.id}" class="cond mv" x1="${x}" y1="${bY}" x2="${x}" y2="${bY+33}"/><line id="alt_${a.id}" class="cond mv" x1="${x}" y1="${bY+63}" x2="${x}" y2="${ay+16}"/>
      <rect id="ptb_${a.prim}" class="brk sw" x="${x-7}" y="${bY+12}" width="14" height="14"/><circle class="wdg mv" cx="${x}" cy="${bY+42}" r="9"/><circle class="wdg mv" cx="${x}" cy="${bY+54}" r="9"/>
      <g id="ptf_${a.prim}" hidden><path class="bolt" d="M${x-14} ${bY+32} l-6 10 h5 l-4 10 l9 -13 h-5 l4 -7 z"/></g><text id="ptt_${a.prim}" class="fd-t" x="${x+14}" y="${bY+24}"></text>
      <rect class="hit" data-sel="pt:${a.prim}" x="${x-15}" y="${bY+2}" width="30" height="${TXD+8}"/></g>`:`<line id="al_${a.id}" class="cond mv" x1="${x}" y1="${ay}" x2="${x}" y2="${y}"/><line id="afl_${a.id}" class="flow" x1="${x}" y1="${ay+4}" x2="${x}" y2="${y}"/>`;
    s+=`
      <g class="asym" style="--sc:${a.type==='load'?'var(--ink)':col}">${sym}</g>
      <text class="a-name" x="${x}" y="${y+46+(a.type==='load'&&VF_ON?10:0)+(a.type==='load'&&LV_ON?14:0)}" text-anchor="middle" style="fill:${a.type==='load'?'var(--muted)':col}">${a.name}</text>
      <text id="av_${a.id}" class="a-val" x="${x}" y="${y+62+(a.type==='load'&&VF_ON?10:0)+(a.type==='load'&&LV_ON?14:0)}" text-anchor="middle">0 MW</text>
      <text id="as_${a.id}" class="a-sub" x="${x}" y="${y+77+(a.type==='load'&&VF_ON?10:0)+(a.type==='load'&&LV_ON?14:0)}" text-anchor="middle"></text>
      <rect class="hit" data-sel="as:${a.id}" x="${x-30}" y="${a.type==='load'?y+24:y-8}" width="${a.type==='load'?60:48}" height="${a.type==='load'?60:92}"/>`;
    if(a.type==='load')LDX.forEach((dx,i)=>{s+=LV_ON?`<rect class="hit" data-sel="lf:${a.prim}${i}" x="${x+dx-12}" y="${ay+16}" width="24" height="24"/><rect class="hit" data-sel="mid:${a.prim}${i}" x="${x+dx-12}" y="${ay+40}" width="24" height="22"/><rect class="hit" data-sel="lf:${a.prim}${i}" x="${x+dx-12}" y="${ay+62}" width="24" height="${y+20-ay-62}"/>`:`<rect class="hit" data-sel="lf:${a.prim}${i}" x="${x+dx-11}" y="${ay+18}" width="22" height="${y-ay+4}"/>`;SELBOX['lf:'+a.prim+i]=[x+dx-10,ay+20,20,20];if(LV_ON){SELBOX['mid:'+a.prim+i]=[x+dx-8,ay+42,16,16];s+=`<rect id="mgh_${a.prim}${i}" class="hit" data-sel="mg:${a.prim}${i}" x="${x+dx-12}" y="${y+42}" width="24" height="21" hidden/>`;}
      if(VF_ON&&VFI.includes(i)){s+=LV_ON?`<rect class="hit" data-sel="nop:${a.prim}${i}" x="${x+dx-12}" y="${y+20}" width="24" height="22"/>`:`<rect class="hit" data-sel="nop:${a.prim}${i}" x="${x+dx-11}" y="${y+19}" width="22" height="22"/>`;SELBOX['nop:'+a.prim+i]=[x+dx-9,y+20,18,18];}});
    if(a.type!=='load')s+=adjBtn(a.id,x+19,y-4,1)+adjBtn(a.id,x+19,y+18,-1);
    if(a.type==='load')SELBOX['pt:'+a.prim]=[x-14,bY+2,28,TXD+8];
    SELBOX['as:'+a.id]=[x-32,y-10,a.type==='load'?64:76,96];});
  LKIDS.forEach(k=>{const L=LINKS[k],A=ASSETS.find(a=>a.id==='load_'+L.a[0]),B=ASSETS.find(a=>a.id==='load_'+L.b[0]);if(!A||!B)return;
    const y=pY(L.a[0])+TXD+48+LVD,xa=A.x+LDX[L.a[1]],xb=B.x+LDX[L.b[1]],oa=xa+(L.a[1]===2?22:-22),ob=xb+(L.b[1]===0?-22:22),yl=y+100,mx=(oa+ob)/2;
    s+=`<g id="lkg_${k}"><path id="lkl_${k}" class="lk-l" d="M${xa} ${y+17} V${y+22} H${oa} V${yl} H${ob} V${y+22} H${xb} V${y+17}"/>
      <rect id="lksw_${k}" class="brk sw open man" x="${mx-8}" y="${yl-8}" width="16" height="16" rx="8"/><text id="lkt_${k}" class="tie-t" x="${mx}" y="${yl+20}" text-anchor="middle">open</text>
      <rect class="hit" data-sel="lk:${k}" x="${mx-24}" y="${yl-20}" width="48" height="46"/></g>`;SELBOX['lk:'+k]=[mx-15,yl-15,30,30];});
  if(VF_ON){s+=`<g id="vfg"><text class="nb-name vf" x="16" y="34">VOLT FACE 11 kV</text><text id="nbs_vf" class="nb-s" x="16" y="49">Spare 44 MW</text><text class="nb-r" x="16" y="62">Backfeeds 11 kV demand feeders</text><text class="nb-r" x="16" y="75">Different grid supply: open first</text>
      <path class="vf-l" d="M16 84 h26"/><rect class="brk sw nop open" x="46" y="79" width="10" height="10" rx="5"/><text class="nb-r" x="62" y="88">backfeed under each feeder</text>
      <rect class="hit" data-sel="nb:vf" x="8" y="18" width="210" height="76"/></g>`;SELBOX['nb:vf']=[8,18,210,76];}
  if(S.sc.gsp)s+=`<text id="gspT" class="gsp-t" x="812" y="44"></text>`;
  if(CREW_ON)SELBOX.depot=[1080,22,114,74];
  s+=`<rect id="coachRing" class="coach-ring" x="0" y="0" width="0" height="0" rx="10" visibility="hidden"/>`;
  if(CREW_ON){s+=`<g class="depot"><text class="nb-name crew-n" x="1188" y="34" text-anchor="end">CREW DEPOT</text><text class="nb-r" x="1188" y="48" text-anchor="end">${S.crews.length===1?"1 field crew":S.crews.length+" field crews"}</text><path class="depot-i" d="M1094 76 l11 -10 l11 10 v11 h-22z"/></g><g id="crews">`+
    [1,2,3].map(n=>`<g id="crew${n}" class="crew"><g class="crew-b"><circle cx="0" cy="-15" r="3.6"/><path d="M0 -11 V-3 M0 -9 l-5 4 M0 -9 l5 4 M0 -3 l-4 7 M0 -3 l4 7"/></g><text class="crew-t" x="7" y="-12">${n}</text></g>`).join('')+'</g>';}
  s+=`<rect id="selbox" class="selbox" x="0" y="0" width="0" height="0" rx="6" visibility="hidden"/>`;
  if(GAME==='fc')s=s.replace(/<rect class="hit" data-sel="(?:bc|in|tie|it|bs|lf|nop|lk|nb|pt):[^"]*"[^>]*\/>/g,'');
  {const lg=$('lgLK');if(lg)lg.hidden=!LKIDS.length;}
  if(S.flood){const P=PR[S.flood.p],x=P.x2-125,lbl=`${P.name} basement: flood water against the 11 kV switchgear`;
    s+=`<g id="flood" class="flood" hidden><title>${lbl}</title><rect class="fl-box" x="${x}" y="356" width="112" height="96" rx="4"/><rect id="flood_w" class="fl-w" x="${x+1}" y="451" width="110" height="0"/>
      <line class="fl-sg" x1="${x}" x2="${x+112}" y1="384" y2="384"/><text class="fl-k" x="${x+6}" y="370">RIVER OHM</text><text class="fl-k" x="${x+106}" y="398" text-anchor="end">switchgear</text>
      <text id="flood_t" class="fl-t" x="${x+56}" y="468" text-anchor="middle"></text><rect class="hit" data-sel="pt:${S.flood.p}" x="${x}" y="356" width="112" height="118"/></g>`;}
  const el=$('mimic');el.setAttribute('viewBox',PIDS.includes('kc')?(LVD?'0 0 1200 764':'0 0 1200 698'):'0 0 1200 668');el.innerHTML=s;
}
function txt(id,v){const e=$(id);if(e&&e.textContent!==v)e.textContent=v;}
// Two-line sub-label under a generator or flexibility symbol (lines split on \n), so neighbouring labels don't run into each other
function sub2(id,v){const e=$(id);if(!e||e.dataset.v===v)return;e.dataset.v=v;const x=e.getAttribute('x');
  e.innerHTML=v.split('\n').map((l,i)=>`<tspan x="${x}" dy="${i?'1.15em':'0'}">${esc(l)}</tspan>`).join('');}
const RMQ=matchMedia('(prefers-reduced-motion: reduce)');
function anim(e,frames,o){if(e&&e.animate&&!RMQ.matches)try{e.animate(frames,o);}catch(x){}}
function setAttr(e,k,v){if(!e)return;const old=e.getAttribute(k);if(old===v)return;e.setAttribute(k,v);
  // a breaker or switch that has just opened or closed gives a short pulse, so the change is easy to spot
  if(k==='class'&&old&&/\bbrk\b/.test(v)&&/\bopen\b/.test(old)!==/\bopen\b/.test(v))anim(e,[{transform:'scale(1.45)'},{transform:'scale(1)'}],{duration:340,easing:'cubic-bezier(.2,.7,.2,1)'});}
// Slide in list items (alarms, calls) that weren't there last time
function slideNew(box,seen){const now=new Set();box.querySelectorAll('[data-k]').forEach(b=>{const k=b.dataset.k,li=b.closest('li');if(!li||now.has(k))return;now.add(k);
  if(seen&&!seen.has(k))anim(li,[{opacity:0,transform:'translateX(16px)'},{opacity:1,transform:'none'}],{duration:340,easing:'cubic-bezier(.2,.7,.2,1)'});});return now;}
let alSeen=null,callSeen=null;
function setFlow(el,v){if(!el)return;if(Math.abs(v)<.5){el.classList.add('idle');return;}el.classList.remove('idle');el.classList.toggle('rev',v<0);
  const d=Math.max(.35,2.2-Math.abs(v)/60).toFixed(1)+'s';if(el.style.animationDuration!==d)el.style.animationDuration=d;}
const arrow=v=>v>=0?'▼':'▲';
function tieLimit(p){return Math.round(Math.min(PR[p].tie,S.spare[PR[p].nb]));}
const supLbl=k=>k==='bc'?'From BC':k==='par'?`PARALLEL ${PAR_MAX-S.parMin} MIN`:k==='kn'?'From Ampy Place':k==='fm'?'From Watts This':'OFF SUPPLY';
function edgeTxt(id,closed,lim){const L=S.edL[id]||0,ov=S.ov[id]||0,fl=Math.abs(S.flows[id]||0);
  return closed?(ov>0?`TRIP IN ${OV_MIN-ov} MIN`:`${Math.round(fl)}/${lim} MW`):`open · ${lim} MW`;}
const edgeCls=(id,closed)=>{const L=S.edL[id]||0;return 'tie-t'+(closed&&L>1?' alarm':closed&&L>.85?' warn':'');};

// Circuit loading colour, like a control-room mimic: amber above the alarm level (80%), red over its rating
const heat=L=>L>1?' h3':L>AL_ON?' h2':'';
function renderMimic(){
  const opK=S.op?S.op.k:null,IS=S.islands,secAlive=sc=>{const I=IS.find(J=>J.secs.includes(sc));return !!(I&&I.alive);};
  S.tx.forEach((t,i)=>{
    const g=$('cct'+i);g.classList.toggle('out',!!t.out);g.classList.toggle('planned',!!t.out&&t.out.kind==='planned');g.classList.toggle('ready',!!t.out&&!!t.out.ready);
    g.dataset.lvl=t.out?'':t.L>1?'alarm':t.L>.9?'warn':'ok';
    const b=$('bolt'+i);if(t.out&&!t.out.ready&&(t.out.kind==='fault'||t.out.kind==='trip'))b.removeAttribute('hidden');else b.setAttribute('hidden','');
    const hc=t.out?'':heat(t.L),w=t.out?'':(3.5+2.5*Math.min(t.L,1.5)).toFixed(1);
    [['ca','hv'],['cb','mv']].forEach(([p,v])=>{const e=$(p+i);setAttr(e,'class','cond '+v+hc);if(e&&e.style.strokeWidth!==(w?w+'px':''))e.style.strokeWidth=w?w+'px':'';});
    txt('load'+i,t.out?(t.out.ready?'READY':t.out.kind==='planned'?'PLANNED':t.out.kind==='trip'?'TRIPPED':t.out.kind==='open'?'OPEN':'FAULTED'):Math.round(t.L*100)+'%');
    txt('flow'+i,t.out?(t.out.ready?'Close it':'Back '+fmtT(t.out.until)):`${Math.round(Math.abs(t.flow))} MW ${arrow(t.flow)}`);
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
    if(PR[p].fd){setAttr($('fdl_'+p),'class','cond mv fd-'+p+(en?heat(S.edL[fid]||0):' dead'));setFlow($('fdf_'+p),en?fl:0);setArw('fda_'+p,en?fl:0,'v');
    setAttr($('fbk_'+p),'class','brk sw'+(f.brk?'':' open')+(f.fault&&!f.fault.ready&&!f.fault.planned?' trip':'')+(opK===fid?' operating':''));
    setAttr($('fin_'+p),'class','brk sw'+(f.inc?'':' open')+(f.fault&&!f.fault.ready&&!f.fault.planned?' trip':'')+(opK==='in:'+p?' operating':''));
    const fb=$('fdb_'+p);if(f.fault&&!f.fault.ready&&!f.fault.planned)fb.removeAttribute('hidden');else fb.setAttribute('hidden','');
    txt('fdt_'+p,f.fault?(f.fault.ready?(f.fault.planned?'WORK DONE':'REPAIRED'):f.fault.planned?'WORK':'FAULT'):(S.ov[fid]>0?`TRIP IN ${OV_MIN-S.ov[fid]} MIN`:''));setAttr($('fdt_'+p),'class','fd-t'+(f.fault&&(f.fault.ready||f.fault.planned)?f.fault.ready?' ok':' warn':''));
    txt('fdv_'+p,en?`${Math.round(Math.abs(fl))}/${PR[p].fr} MW ${arrow(fl)}`:'');setAttr($('fdv_'+p),'class','fd-v'+((S.edL[fid]||0)>1?' alarm':(S.edL[fid]||0)>.85?' warn':''));}
    setAttr($('pb_'+p),'class','bus mv'+(sup==='off'?' dead':''));
    const ds=sup==='par'&&!S.tie[p].closed?(fdOn(p)?'bc':'kn'):sup;txt('ps_'+p,supLbl(ds));txt('pn_'+p,sup==='off'?'':`net ${Math.round(Math.abs(S.pn[p]))} MW ${S.pn[p]>=0?'▼':'▲'}`);setAttr($('ps_'+p),'class','p-stat'+(ds==='off'?' off':ds==='par'?' par':ds==='kn'||ds==='fm'?' nb '+ds:''));
    const tid='tie:'+p,tc=S.tie[p].closed;if(!PR[p].nb)return;
    setAttr($('tl_'+p),'class','tie-l '+PR[p].nb+(tc?' on'+heat(S.edL[tid]||0):''));
    setAttr($('tsw_'+p),'class','brk sw'+(tc?'':' open')+(opK===tid?' operating':''));
    setArw('tia_'+p,tc?(S.flows[tid]||0)*TIEARW[p][2]:0,'h');{const et=edgeTxt(tid,tc,tieLimit(p));if(p==='hw'||p==='js')sub2('tt_'+p,et.replace(' · ','\n'));else txt('tt_'+p,et);}setAttr($('tt_'+p),'class',edgeCls(tid,tc));
  });
  ITIDS.forEach(k=>{const id='it:'+k,c=S.it[k].closed,ft=S.it[k].fault;setArw('ita_'+k,c&&!ft?(S.flows[id]||0):0,ITS[k].v?'v':'h');
    setAttr($('itl_'+k),'class','tie-l it'+(c&&!ft?' on'+heat(S.edL[id]||0):c?' on':''));setAttr($('itsw_'+k),'class','brk sw'+(c?'':' open')+(opK===id?' operating':''));
    txt('itt_'+k,ft?(ft.ready?'REPAIRED':'FAULT'):edgeTxt(id,c,ITS[k].r));setAttr($('itt_'+k),'class',ft&&!ft.ready?'tie-t alarm':edgeCls(id,c));});
  ['kn','fm'].forEach(nb=>{const sp=Math.max(0,S.spare[nb]),u=Math.abs(S.inj[nb]||0),L=u/Math.max(1,sp);txt('nbs_'+nb,u>=.5?`Using ${Math.round(u)} of ${Math.round(sp)} MW`:`Spare ${Math.round(sp)} MW`);setAttr($('nbs_'+nb),'class','nb-s'+(u<.5?'':L>1?' alarm':L>=AL_ON?' warn':''));});
  const c=S.c,a=S.act,on=p=>S.sup[p]!=='off';
  PIDS.forEach(p=>{const d=dem(c,p)-(p==='hw'?a.dsr:0),n=S.lf[p].filter((v,i)=>feedOf(p,i)!==null).length,nv=S.lf[p].filter((v,i)=>feedOf(p,i)==='vf').length,nl=S.lf[p].filter((v,i)=>{const f=feedOf(p,i);return f&&f!==p&&f!=='vf';}).length;txt('av_load_'+p,on(p)?mw(d):'Off supply');txt('as_load_'+p,(n<3?`${3-n} feeder${n===2?'':'s'} off`:'')+(nv?`${n<3?' · ':''}${nv} on Volt Face`:'')+(nl?`${n<3||nv?' · ':''}${nl} linked`:''));setAttr($('as_load_'+p),'class','a-sub'+(n<3?'':' muted'));
    {const T=S.pt[p],fl=T.fault&&!T.fault.ready,lv=on(p)&&T.closed;setAttr($('al_load_'+p),'class','cond mv'+(on(p)?'':' dead'));setAttr($('alt_load_'+p),'class','cond mv'+(lv?'':' dead'));setAttr($('alb_load_'+p),'class','cond mv'+(lv?'':' dead'));
     setAttr($('ptb_'+p),'class','brk sw'+(T.closed?'':' open')+(fl?' trip':'')+(opK==='pt:'+p?' operating':''));setAttr($('ptg_'+p),'class','ptg'+(T.closed&&on(p)?'':' out'));
     const pf=$('ptf_'+p);if(pf){if(fl)pf.removeAttribute('hidden');else pf.setAttribute('hidden','');}txt('ptt_'+p,T.fault?(T.fault.ready?'REPAIRED':'FAULT'):'');setAttr($('ptt_'+p),'class','fd-t'+(T.fault&&T.fault.ready?' ok':''));}
    S.lf[p].forEach((v,i)=>{const k='lf:'+p+i,F=S.lff&&S.lff[p][i],f0=secFeed(p,i,0),f1=secFeed(p,i,1),fl=sx=>F?(!F.found?' unk':F.sec===sx?' flt':''):'';
      setAttr($('lfb_'+p+i),'class','brk sw'+(v?'':' open')+(F&&!F.found&&!v?' trip':'')+(opK===k?' operating':''));
      if(LV_ON){setAttr($('lfl_'+p+i),'class','cond mv'+(f0!==null?'':' dead')+fl(0));setAttr($('lfm_'+p+i),'class','cond mv'+(f1!==null?'':' dead')+fl(1));
        const mk='mid:'+p+i;setAttr($('midb_'+p+i),'class','brk sw man mid'+(midOn(p,i)?'':' open')+(crewFor(mk)?' operating':''));
        const u=mgAt(p+i),g=$('mgg_'+p+i);const gh=$('mgh_'+p+i);if(gh){if(u)gh.removeAttribute('hidden');else gh.setAttribute('hidden','');}if(g){if(u)g.removeAttribute('hidden');else g.setAttribute('hidden','');setAttr(g,'class','mg'+(u&&u.conn?' on':'')+(crewFor('mg:'+p+i)?' operating':''));}}
      else setAttr($('lfl_'+p+i),'class','cond mv'+(f0!==null?'':' dead'));
      {const P=prioOf(p,i);if(P)setAttr($('pri_'+p+i),'class','pri pri-'+P.kind+(secFeed(p,i,P.sec)===null?' off':''));}
      setAttr($('lft_'+p+i),'class','sym'+(f1===null?(S.nop[p][i]?' vf':' off'):f1==='vf'?' vf':f1==='mg'?' mg':f1!==p?' lk':'')+(F&&(!F.found||F.sec===1)?' flt':''));
      if(VF_ON&&VFI.includes(i)){const nk='nop:'+p+i,nc=S.nop[p][i];setAttr($('nopb_'+p+i),'class','brk sw nop'+(nc?'':' open')+(opK===nk?' operating':''));setAttr($('nopl_'+p+i),'class','vf-l'+(nc?' on':''));}});});
  LKIDS.forEach(k=>{const id='lk:'+k,c2=!!S.lk[k],f=(S.lkLoad||{})[k]||0,par=(S.flows||{})[id];setAttr($('lksw_'+k),'class','brk sw man'+(c2?'':' open')+(opK===id||crewFor(id)?' operating':''));setAttr($('lkl_'+k),'class','lk-l'+(c2?' on':''));
    txt('lkt_'+k,!c2?`open · ${LINKS[k].r} MW`:par!=null?`parallel ${Math.round(Math.abs(par))}/${LINKS[k].r} MW`:f>.5?`${Math.round(f)}/${LINKS[k].r} MW`:'closed · no load');setAttr($('lkt_'+k),'class','tie-t'+(f>LINKS[k].r?' alarm':f>LINKS[k].r*AL_ON?' warn':''));});
  if(VF_ON){const sp=Math.max(0,S.spare.vf||0),u=S.vfLoad||0,L=u/Math.max(1,sp);txt('nbs_vf',u>=.5?`Using ${Math.round(u)} of ${Math.round(sp)} MW`:`Spare ${Math.round(sp)} MW`);setAttr($('nbs_vf'),'class','nb-s'+(u<.5?'':L>1?' alarm':L>=AL_ON?' warn':''));}
  if(!NOGEN()){
    const cut=!!(S.cutout&&S.cutout.fired&&!S.cutout.done);
    const gen=(id,raw,p)=>{const out=on(p)?raw-a[id]:0;txt('av_'+id,on(p)?mw(out):'Off');setFlow($('afl_'+id),-out);setAttr($('al_'+id),'class','cond mv'+(on(p)?'':' dead'));
      sub2('as_'+id,!on(p)?'':a[id]>.5?`−${Math.round(a[id])}\ncurtailed`:S.fail[id]>S.t?'not\nresponding':id==='wind'&&cut?'high-wind\nstop':S.armed[id]>0?`auto −${S.armed[id]}`:out>.5?'full\noutput':'');
      setAttr($('as_'+id),'class','a-sub'+(a[id]>.5||S.fail[id]>S.t||(id==='wind'&&cut)?'':' muted'));return out;};
    const wnd=gen('wind',c.wind,'rv');gen('solar',c.solar,'ml');
    const bl=$('blades');if(bl)bl.classList.toggle('still',wnd<1);
    const bat=on('hw')?a.bdis-a.bchg:0;
    txt('av_batt',!on('hw')?'Off':Math.abs(bat)<.5?'Idle':mw(Math.abs(bat)));setFlow($('afl_batt'),-bat);setAttr($('al_batt'),'class','cond mv'+(on('hw')?'':' dead'));
    sub2('as_batt',`${Math.round(S.soc/SOC_MAX*100)}%`+(S.armed.bdis||S.armed.bchg?' · armed':'')+(Math.abs(bat)<.5||!on('hw')?'':bat>0?'\ndischarging':'\ncharging'));setAttr($('as_batt'),'class','a-sub'+(bat<-.5?'':' muted'));
    ['chp','dsr'].forEach(id=>{const p=SV[id].prim,v=on(p)?a[id]:0;txt('av_'+id,!on(p)?'Off':v>.5?(id==='dsr'?'−':'+')+mw(v):'Standby');
      setFlow($('afl_'+id),id==='chp'?-v:0);setAttr($('al_'+id),'class','cond mv'+(on(p)?'':' dead'));
      sub2('as_'+id,S.fail[id]>S.t?'not\nresponding':S.armed[id]>0?`armed ${S.armed[id]}`:'');setAttr($('as_'+id),'class','a-sub'+(S.fail[id]>S.t?'':' muted'));});
    ASSETS.filter(x=>x.type!=='load').forEach(x=>{const off=!on(x.prim)||S.ended;['u','d'].forEach(k=>{const e=$(`adj_${x.id}_${k}`);if(e)e.classList.toggle('dis',off);});});
  }
  if(CREW_ON){const tNow=S.t+(S.running&&!S.paused&&!S.ended?acc:0);S.crews.forEach((c,i)=>{const g=$('crew'+c.n);if(!g)return;const p=crewPos(c,tNow),same=S.crews.filter((d,j)=>j<i&&!d.to&&!c.to&&Math.abs(d.x-c.x)<1&&Math.abs(d.y-c.y)<1).length,
    off=c.to?(i-1)*7:(c.at==='depot'?(i-1)*16:14+same*12);setAttr(g,'transform',`translate(${(p.x+off).toFixed(1)} ${(p.y+(c.at==='depot'&&!c.to?16:-4)+(c.to?(i-1)*5:0)).toFixed(1)}) scale(1.25)`);g.classList.toggle('walk',!!c.to&&S.running&&!S.paused);g.classList.toggle('home',c.at==='depot'&&!c.to);g.classList.toggle('busy',!!c.job);});}
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
    ...PIDS.flatMap(p=>S.lf[p].map((v,i)=>lvFaultTxt(p,i)?`<li><button type="button" data-sel="lf:${p}${i}" data-k="o-lv${p}${i}"><span class="nm">${esc(LFN[p][i])} (${PR[p].name})</span><span class="st off">${esc(ucfirst(lvFaultTxt(p,i)))}</span><span class="v">${mw(lfMW(p,i)*SECF.reduce((a,h,sx)=>a+(secFeed(p,i,sx)===null?h:0),0))}</span></button></li>`:v?'':S.nop[p][i]?`<li><button type="button" data-sel="nop:${p}${i}" data-k="o-vf${p}${i}"><span class="nm">${esc(LFN[p][i])} (${PR[p].name})</span><span class="st">On Volt Face backfeed</span><span class="v">${mw(lfMW(p,i))}</span></button></li>`:`<li><button type="button" data-sel="lf:${p}${i}" data-k="o-lf${p}${i}"><span class="nm">${esc(LFN[p][i])} (${PR[p].name})</span><span class="st off">11 kV feeder open · customers off</span><span class="v"></span></button></li>`)),
    ...(S.mgu||[]).filter(u=>u.site).map(u=>`<li><button type="button" data-sel="mg:${u.site}" data-k="o-mg${u.n}"><span class="nm">Mobile generator ${u.n}</span><span class="st${u.conn?'':' warn'}">${u.conn?`On ${esc(LFN[u.site.slice(0,2)][+u.site.slice(2)])} · ${srcMW(...lfP(u.site),'mg').toFixed(1)}/${MG_CAP} MW`:u.pend?'Being towed and connected':'Parked, disconnected'}</span><span class="v"></span></button></li>`),
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
function ptHtml(p){const T=S.pt[p],nm=PR[p].name,id='pt:'+p,live=S.sup[p]!=='off',f=T.fault,ld=LF[p].reduce((a,v,i)=>a+srcMW(p,i,p),0);let st,cls;
  if(f&&!f.ready){st=`Transformer faulted: ${f.label.toLowerCase()}. Repair until ${fmtT(f.until)}. Keep the breaker open until then.`;cls='alarm';}
  else if(f){st='Transformer repaired. Close the breaker to put the 11 kV feeders back on.';cls='warn';}
  else if(!T.closed){st=`Breaker open: the ${nm} 11 kV feeders get nothing from their own substation.`;cls='warn';}
  else{st=live?'In service and supplying the 11 kV feeders.':`In service, but ${nm} has no 33 kV supply.`;cls=live?'ok':'warn';}
  return `${back}<div class="i-h">${ico('tx','var(--mv)')}<div><h3>${esc(nm)} transformer</h3><div class="kind">33/11 kV · automatic 33 kV breaker</div></div></div>
    ${facts([['33 kV breaker',T.closed?'Closed':'Open'],['Transformer',f?(f.ready?'Repaired':'Faulted'):'Healthy'],['11 kV load',T.closed&&live?mw(ld):'–'],['33 kV bar',live?'Live':'Dead']])}
    <p class="i-state ${cls}">${esc(st)}</p>
    ${GAME==='cr'?`<div class="op-row">${T.closed?opBtn(id,'open','Open the breaker'):opBtn(id,'close','Close the breaker')}</div>`:''}
    <p class="i-note">The ${nm} 33 kV bar feeds the transformer through its own breaker, and the transformer feeds the three 11 kV feeders. The breaker is automatic: protection trips it if the transformer develops a fault, and it can be switched remotely. While it's open the generation on the 33 kV bar is unaffected, but the 11 kV customers are off unless you feed them from the far ends of their feeders.</p>
    <div class="op-row"><button type="button" class="btn" data-sel="prim:${p}" data-k="go-prim">${esc(nm)} substation</button><button type="button" class="btn" data-sel="as:load_${p}" data-k="go-load">${esc(nm)} demand</button></div>`;}
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
    <p class="i-rule">With a bus section open, each part of the busbar is supplied only by its own transformers. The T1 section feeds Hertz House and Shocking Place, the T2 section has no feeders, and the T3 section feeds Ohm No and Joule Street. Losing the only transformer on a section takes its substations off supply.</p>`;}
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
    ${facts([['Supply',esc(supTxt(p))],['Net',`${mw(Math.abs(S.pn[p]))} ${S.pn[p]>=0?'import':'export'}`],['Demand',on?mw(dem(c,p)):'Off supply'],P.fd?['Feeder rating',mw(P.fr)]:['Normally fed','Through Shocking Place']])}
    <div class="op-row">${P.fd?`<button type="button" class="btn" data-sel="bc:${p}" data-k="go-bc">Feeder breaker</button>`:''}<button type="button" class="btn" data-sel="pt:${p}" data-k="go-pt">33/11 kV transformer</button>${P.nb?`<button type="button" class="btn" data-sel="tie:${p}" data-k="go-tie">${esc(NBS[P.nb].name)} tie</button>`:''}${its.map(k=>`<button type="button" class="btn" data-sel="it:${k}" data-k="go-${k}">${esc(PR[ITS[k].a===p?ITS[k].b:ITS[k].a].name)} interconnector</button>`).join('')}${assets.map(a=>`<button type="button" class="btn" data-sel="as:${a.id}" data-k="go-${a.id}">${esc(a.name)}</button>`).join('')}</div>`;}
function assetHtml(id){const a=ASB[id];
  if(a.type==='load'){const p=a.prim;return `${back}<div class="i-h">${ico('load','var(--muted)')}<div><h3>${PR[p].name} demand</h3><div class="kind">Homes and businesses</div></div></div>
    ${facts([['Demand now',S.sup[p]==='off'?'Off supply':mw(dem(S.c,p))],['Supply',esc(supTxt(p))]])}
    <h4 class="i-sub">11 kV feeders</h4><ul class="i-list">${S.lf[p].map((v,i)=>`<li><button type="button" data-sel="lf:${p}${i}" data-k="lf-${p}${i}"><span class="nm">${esc(LFN[p][i])}${prioOf(p,i)?` <span class="pri-tag pri-${prioOf(p,i).kind}" title="${esc(prioOf(p,i).name)}">${PRK[prioOf(p,i).kind].ch}</span>`:''}</span><span class="st${lvFaultTxt(p,i)?' off':v||S.nop[p][i]?'':' warn'}">${lvFaultTxt(p,i)?esc(ucfirst(lvFaultTxt(p,i))):(v?'From '+esc(PR[p].name):S.nop[p][i]?'From Volt Face':'Open · customers off')+(LV_ON&&!midOn(p,i)?' · split':'')+(LV_ON&&mgOn(p,i)?' · generator':'')}</span><span class="v">${mw(S.c.demand*S.share[p]*LF[p][i])}</span></button></li>`).join('')}</ul>
    <div class="op-row">${S.lf[p].map((v,i)=>opBtn('lf:'+p+i,v?'open':'close',`${v?'Open':'Close'} ${LFN[p][i]}`)).join('')}</div>
    ${VF_ON?`<div class="op-row">${VFI.map(i=>opBtn('nop:'+p+i,S.nop[p][i]?'open':'close',`${S.nop[p][i]?'Open':'Close'} ${LFN[p][i]} backfeed`)).join('')}</div><p class="i-note">Backfeeds move a feeder onto Volt Face, a neighbouring 11 kV network on a different grid supply. Open the feeder breaker first, then close the backfeed.</p>`:''}
    ${LV_ON?`<h4 class="i-sub">Mid-point switches</h4><div class="op-row">${S.lf[p].map((v,i)=>opBtn('mid:'+p+i,midOn(p,i)?'open':'close',`${midOn(p,i)?'Open':'Close'} ${LFN[p][i]} mid-point`)).join('')}</div>
    <h4 class="i-sub">Mobile generators · ${S.mgu.filter(u=>!u.conn&&!u.pend).length} of ${MG_N} free · ${MG_CAP} MW each</h4><div class="op-row">${S.lf[p].map((v,i)=>{const u=mgAt(p+i);return u&&(u.conn||u.pend)?opBtn('mg:'+p+i,'open',`Disconnect generator at ${LFN[p][i]}`):opBtn('mg:'+p+i,'close',`${u?'Reconnect':'Send'} generator to ${LFN[p][i]}`);}).join('')}</div>
    <p class="i-note">Fault finding: when a feeder locks out you don't know which half is faulted. Open its mid-point switch (manual, so a crew goes), then trial-close the breaker. If it holds, the fault is in the second half; if it trips, it's in the first. Repairs start once the fault is found. A mobile generator connects at the far end of a feeder after ${MG_CONN} minutes and carries up to ${MG_CAP} MW, so it can usually supply one dead half.</p>`:''}
    ${PRIO_ON&&S.lf[p].some((v,i)=>prioOf(p,i))?`<h4 class="i-sub">Priority customers</h4><ul class="i-plain">${S.lf[p].map((v,i)=>{const P=prioOf(p,i);return P?`<li class="${secFeed(p,i,P.sec)===null?'off':''}"><span class="pri-tag pri-${P.kind}">${PRK[P.kind].ch}</span> ${esc(prioTxt(P))}${secFeed(p,i,P.sec)===null?' · <b>off supply now</b>':''}</li>`:'';}).join('')}</ul>`:''}
    <p class="i-note">Opening an 11 kV feeder takes its customers off supply to cut the load on the network. Every minute customers are off supply costs 1 point per MW, so use it as a last resort and close it again as soon as you can.</p>`;}
  const p=a.prim,off=S.sup[p]==='off';
  if(id==='batt'){const b=S.act.bdis-S.act.bchg,f=S.fail.bdis>S.t||S.fail.bchg>S.t;
    return `${back}<div class="i-h">${ico('batt','var(--c-batt)')}<div><h3>Kings Hill Battery</h3><div class="kind">30 MW / 60 MWh battery at Hertz House</div></div></div>
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
  if(type==='tx')return txHtml(+id);if(type==='pt')return ptHtml(id);if(type==='bc'||type==='in')return bcHtml(id);if(type==='lf'||type==='nop'||type==='mid'||type==='mg')return assetHtml('load_'+id.slice(0,2));if(type==='lk')return lkHtml(id);if(type==='nb'&&id==='vf')return vfHtml();if(type==='tie')return tieHtml(id);if(type==='it')return itHtml(id);if(type==='bs')return bsHtml(id);if(type==='nb')return nbHtml(id);if(type==='prim')return primHtml(id);if(type==='as'&&ASB[id]&&(!NOGEN()||ASB[id].type==='load'))return assetHtml(id);return summaryHtml();}
function renderInsp(){const h=inspHtml();if(h===lastInsp)return;lastInsp=h;const el=$('inspBody'),ae=document.activeElement,k=ae&&el.contains(ae)&&ae.dataset?ae.dataset.k:null;el.innerHTML=h;if(k){const f=el.querySelector(`[data-k="${k}"]`);if(f)f.focus();}}
const QP_T=GAME==='fc'?[]:['tx','pt','bc','in','tie','it','bs','lf','nop','lk','mid','mg'],isSw=k=>!!k&&QP_T.includes(k.split(':')[0]);
function select(k,fromDiagram){S.sel=k==='none'?null:k;S.qp=!!fromDiagram&&isSw(S.sel);lastInsp='';
  if(PHONE){if(S.qp)closeSheet();else if(S.sel)openSheet();}render(true);}
function lvFaultTxt(p,i){const F=S.lff&&S.lff[p]&&S.lff[p][i];if(!F)return '';
  return F.found?`fault in the ${F.sec?'second':'first'} half · repair ${fmtT(F.until)}`:`faulted · location unknown (patrol ${fmtT(F.start+PATROL)})`;}
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
    st=!closed&&S.nop[p][i]?`fed from Volt Face (${mwv} MW)`:!closed?`${mwv} MW of customers off`:S.sup[p]==='off'?'substation off supply':`${mwv} MW of demand`;cls=closed?'':'warn';
    const F=lvFaultTxt(p,i);if(F){st=F+' · '+st;cls='alarm';}const P=prioOf(p,i);if(P)st+=` · ${P.name} (${P.sec?'second':'first'} half)${secFeed(p,i,P.sec)===null?' off':''}`;}
  else if(t==='mid'){const[p,i]=lfP(id);closed=midOn(p,i);const F=lvFaultTxt(p,i);
    const P=prioOf(p,i);st=F||`splits ${LFN[p][i]} in two · ${Math.round(lfMW(p,i)*SECF[1])} MW beyond it`;if(P)st+=` · ${P.name} on the ${P.sec?'far':'near'} side`;cls=F?'alarm':closed?'':'warn';}
  else if(t==='pt'){const T=S.pt[id],f=T.fault,mwv=Math.round(LF[id].reduce((a,v,i)=>a+srcMW(id,i,id),0));closed=T.closed;
    st=f&&!f.ready?(f.flood?`flooded · testing until ${fmtT(f.until)}`:`fault until ${fmtT(f.until)}`):f?(f.flood?'dried and tested: ready to close':'repaired: ready to close'):closed?(subOn(id)?`feeding ${mwv} MW of 11 kV feeders`:'33 kV bar off supply'):'11 kV feeders off their own substation';
    const F=S.flood&&S.flood.p===id&&S.flood.warned&&!S.flood.arrived?` · flood due ${fmtT(Math.round(S.flood.at/5)*5)}`:'';st+=F;cls=f&&!f.ready?'alarm':f||F&&floodLive(id)?'warn':closed?'':'warn';}
  else if(t==='mg'){const[p,i]=lfP(id),u=mgAt(id);closed=!!(u&&u.conn);const ld=srcMW(p,i,'mg');
    st=closed?`supplying ${ld.toFixed(1)}/${MG_CAP} MW`:u&&u.pend?'on its way':'parked here, disconnected';cls=closed&&ld>MG_CAP*AL_ON?'warn':'';}
  else{closed=S.bs[id].closed;st=closed?`${Math.round(Math.abs(S.bsf[id]||0))} MW across`:'busbar running split';cls=closed?'':'warn';}
  const act=closed?'open':'close',title=t==='tx'?`T${+id+1} breaker`:ucfirst(devName(k))+(t==='bc'?' at Blackout Canyon':t==='lf'||t==='nop'||t==='mid'?' · '+PR[id.slice(0,2)].name:'');
  return `<div class="qp-h"><b>${esc(title)}</b><button type="button" class="qp-x" id="qpClose" aria-label="Close this pop-up">×</button></div>
    <p class="qp-s ${cls}"><span class="qp-st">${closed?'Closed':'Open'}</span> · ${esc(st)}</p>${isManual(k)?qpCrew(k):''}
    <div class="qp-row">${opBtn(k,act,act==='close'?'Close':'Open')}${isManual(k)&&!crewAt(k)&&!crewFor(k)?`<button type="button" class="btn" data-crew="${k}">Send crew</button>`:''}${LV_ON&&(t==='lf'||t==='mid')&&S.lff[id.slice(0,2)][+id.slice(2)]&&!mgAt(id)?opBtn('mg:'+id,'close','Generator'):''}<button type="button" class="btn" id="qpMore">Details</button></div>`;}
function qpCrew(k){const j=crewFor(k),h=crewAt(k);return `<p class="qp-crew">${j?`Crew ${j.n} ${j.to?'walking there, arrives '+fmtT(j.arr):'on site'}${j.job.act?', will '+j.job.act+' it by '+fmtT(j.job.at):''}.`:h?`Crew ${h.n} is standing by here: operating takes ${CREW_OP} min.`:'Manual switch: a field crew has to walk here first.'}</p>`;}
function renderQP(){const q=$('qp');if(!q)return;const k=S&&!S.ended&&S.qp&&S.sel;
  if(!k||!isSw(k)||!SELBOX[k]){if(!q.hidden){q.hidden=true;lastQP='';}return;}
  const h=qpHtml(k);if(h!==lastQP){const ae=document.activeElement,fid=ae&&q.contains(ae)?ae.id:'',fk=ae&&q.contains(ae)&&ae.dataset?ae.dataset.k:'';q.innerHTML=h;lastQP=h;const f=fid?$(fid):fk?[...q.querySelectorAll('[data-k]')].find(x=>x.dataset.k===fk):null;if(f)f.focus();}
  q.hidden=false;
  const ms=$('mscroll'),r=$('mimic').getBoundingClientRect(),mr=ms.getBoundingClientRect();if(!r.width)return;const vb=($('mimic').getAttribute('viewBox')||'0 0 1200 668').split(' ').map(Number),sc=Math.min(r.width/vb[2],r.height/vb[3]),padX=(r.width-vb[2]*sc)/2,padY=(r.height-vb[3]*sc)/2,bx=SELBOX[k],W=q.offsetWidth,H=q.offsetHeight,ox=r.left-mr.left+ms.scrollLeft+padX,oy=r.top-mr.top+ms.scrollTop+padY,cw=vb[2]*sc,ch=vb[3]*sc;
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
  const day=h>r&&h<st,cl=sc.sky!=null?sc.sky:sc.noGen?.25:sc.solar.cloud,grey=cl>.3&&day?.45:cl>.15&&day?.2:0;
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
if(GAME==='cr')TIPS.push({id:'calls',el:'pCalls',when:()=>!!(S.calls&&S.calls.length),text:'Customers are ringing in. Calls tell you who is off, and some say what the caller saw or heard, which points to the faulted half of the feeder. If callers are off but their feeder breaker still shows closed, the trip hasn\'t been reported yet: poll the RTU at that substation.'});
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
const SPEND_L={arm:'Availability fees for armed flex',use:'Armed flex switching in',short:'Flex called at short notice',curt:'Curtailing generation',gen:'Compensation for generators off supply'};
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
  seenAs(()=>{renderMimic();renderInsp();renderQP();});renderFlood();renderCalls();renderAlarms();renderLog();renderSky();
  const now=performance.now();if(force||now-lastChart>350){lastChart=now;drawChart();}
  renderSec();
  const pl=S.ended?'Shift over':!S.running?'Start':S.paused?'Resume':'Pause';txt('playBtn',pl);txt('dPlay',pl);txt('dClock',fmtT(S.t));
  $('resumeBtn').hidden=!(S.paused&&S.running&&!S.ended);
}
let lastRender=0;
function frame(now){
  const dt=Math.min(.25,(now-lastFrame)/1000);lastFrame=now;
  if(S&&S.running&&!S.paused&&!S.ended){acc+=dt*RATE[speed]*(anyOver()?.5:1)*tutRate();while(acc>=1&&!S.paused&&!S.ended){acc-=1;step();}}
  if(S&&now-lastRender>90){lastRender=now;checkTips();render(false);tutTick(now);
    const live=S.tx.filter(t=>!t.out);humTo(S.running&&!S.paused&&!S.ended&&live.length?Math.max(...live.map(t=>t.L)):0);}
  requestAnimationFrame(frame);
}

/* ---------- Tutorial (control room) ---------- */
const TUT=[
  {t:'next',x:'pMimic',h:'Welcome to the control room',b:'It\'s Cold Thursday, 15:30, and the evening peak is building. This is Blackout Canyon: power comes from the Steve Towers grid supply point at the top, through three transformers (T1–T3), onto the 33 kV busbar, and out to four substations: Hertz House, Shocking Place, Ohm No and Joule Street.'},
  {t:'next',x:'kFirmBox',h:'Firm capacity',b:()=>`Each transformer is rated ${R} MW. Firm capacity is what you could still carry if one more transformer tripped: ${2*R} MW with all three in. You're importing about ${Math.round(Math.abs(S.net))} MW now, and the peak at 17:30 will be well over firm capacity.`},
  {t:'next',x:'as:batt',h:'Generation and flexibility',b:'Each substation has demand, and some have generation or flexibility: the Kings Hill battery and demand response at Hertz House, solar at Shocking Place, wind and a gas CHP at Ohm No. The ▲ ▼ buttons beside each one turn it up or down now. Every MW you produce locally is a MW Blackout Canyon doesn\'t have to import.'},
  {t:'act',x:'as:batt',press:'#adj_batt_u',done:()=>S.manual.bdis>=20,h:'Discharge the battery',b:'Press ▲ beside the Kings Hill Battery four times to discharge 20 MW into Hertz House. Batteries are quick but limited: watch its charge.'},
  {t:'act',x:'as:chp',press:'#adj_chp_u',done:()=>S.manual.chp>=15,h:'Run the CHP',b:'Press ▲ beside the Ohm No CHP three times to run 15 MW. Running something now costs 1.5× its normal price, so spend only what you need.'},
  {t:'act',x:'as:dsr',sel:'as:dsr',press:'#pInsp [data-f="arm"][data-id="dsr"][data-d="5"]',done:()=>S.armed.dsr>=10,h:'Arm demand response',b:'Better still, arm flexibility in advance. Tap the Hertz House DSR on the diagram, then press + on Armed in the Control panel twice (10 MW). Armed services cost a small fee per hour, and switch in by themselves the moment a transformer overloads.',
    hint:()=>S.sel==='as:dsr'?'Now press + on Armed in the Control panel.':'Your turn: tap the DSR on the diagram.'},
  {t:'next',x:'depot',h:'Remote and manual switches',b:'Now switching. Squares are remote-controlled breakers: they operate from here in a minute. Circles are manual switches: a field crew has to walk there from this depot first, so they take longer.'},
  {t:'next',x:'bc:js',h:'A fault!',enter(){S.sched.push({k:'fd:js',m:S.t,dur:900,cause:'Ice build-up on the overhead line',done:false});for(let i=0;i<2;i++)step();},b:'Ice has brought down the Joule Street 33 kV feeder. Its breaker at Blackout Canyon and its incomer at Joule Street both tripped, so Joule Street is off supply.'},
  {t:'act',x:'tie:js',k:'tie:js',a:'close',done:()=>S.tie.js.closed,h:'Restore from Watts This',b:'Tap the Joule Street – Watts This tie (the orange circle on the right) and press Close. Watts This is on a different grid supply, but Joule Street is dead, so closing onto it is safe. A crew will walk there first.'},
  {t:'next',x:'prim:js',h:'Customers back on',b:()=>`Joule Street is back, fed from Watts This, and that load is off Blackout Canyon too. It was off for more than 3 minutes, so those customers count as interrupted (CI: ${nf(S.cust.ci)}) and every minute added customer minutes lost (CML). Restore inside 3 minutes and it's only a short interruption.`},
  {t:'next',x:'tx:1',h:'T2 has tripped!',enter(){const t=S.tx[1];if(!t.out){t.out={kind:'fault',until:S.t+120,ready:false,label:'Cable joint failure'};S.faults++;logE(S.t,'Fault on the T2 circuit: cable joint failure. T2 tripped.','alarm');}for(let i=0;i<2;i++)step();},
    b:()=>{const L=Math.round(Math.max(...S.tx.filter(t=>!t.out).map(t=>t.L))*100),fc=Math.round(Math.abs(S.net));return L>100?`T2 has tripped on a cable fault. T1 and T3 now carry everything, ${L}% each, so they're on their emergency rating: 30 minutes to get below 100%. Your armed demand response switched in by itself${S.act.dsr>.5?` (${Math.round(S.act.dsr)} MW)`:''}. Take more load off now.`
      :`T2 has tripped on a cable fault. T1 and T3 now carry everything, but thanks to the battery, the CHP and Joule Street being on Watts This they're only at ${L}%. Had they gone over 100%, your armed demand response would have switched in by itself. Firm capacity is now just ${R} MW against ${fc} MW, and the peak is still climbing, so another trip would hurt. Take load off before it does.`;}},
  {t:'act',x:'tie:hw',k:'tie:hw',a:'close',done:()=>S.tie.hw.closed,h:'Make before break',b:'Move Hertz House onto Ampy Place. Ampy Place shares our grid supply, so you can do it without an interruption. First make: tap the Hertz House – Ampy Place tie (the green circle on the left) and press Close.'},
  {t:'act',x:'bc:hw',k:'bc:hw',a:'open',done:()=>!S.fd.hw.brk,h:'…then break',b:()=>`Blackout Canyon and Ampy Place are now running in parallel. You have ${PAR_MAX} minutes to open one side. Tap the Hertz House breaker at Blackout Canyon and press Open.`},
  {t:'act',x:'lf:ml1',k:'lf:ml1',a:'open',done:()=>!S.lf.ml[1],h:'Volt Face backfeeds',b:'Volt Face is a neighbouring 11 kV network on a different grid supply. It can pick up some 11 kV feeders. First open the Station 11 kV feeder breaker at Shocking Place (the middle small square).'},
  {t:'act',x:'nop:ml1',k:'nop:ml1',a:'close',done:()=>S.nop.ml[1],h:'Close the backfeed',b:'Now tap the pink circle under that feeder, its Volt Face backfeed, and press Close. A crew walks there; the Station customers are off until it closes.'},
  {t:'next',x:'pAlarm',h:'Alarms',b:'Anything over 80% of its rating raises an alarm here, with a countdown if it will trip. Press Acknowledge to quieten them.'},
  {t:'next',x:'pSec',h:'Next-loss check',b:()=>`This tells you whether you'd survive another transformer trip, and what to do if not. You're carrying about ${Math.round(Math.abs(S.net))} MW on two transformers now. Keep it green and you're running a secure network.`},
  {t:'next',x:null,h:'Tutorial complete',b:'You\'ve used the battery, CHP and armed demand response, restored a faulted feeder from a neighbour, made a make-before-break transfer after a transformer trip, and moved a feeder onto Volt Face. That\'s the control room. Ready for your first shift?'}];
const KIOSK=()=>!!(S&&S.tut&&S.tut.kiosk);
// Demo pacing (ms): wait before acting, gap between presses, pause on the result before moving on. Display mode is slower.
const PACE=()=>KIOSK()?{wait:5200,press:1400,op:2600,after:3800}:{wait:2800,press:800,op:1500,after:1800};
const SHOW_AFTER=15000;  // tutorial: offer "Show me" only if the player hasn't managed it by then
const readMs=st=>{const n=(typeof st.b==='function'?st.b():st.b).length;return KIOSK()?Math.max(7500,n*80):Math.max(4500,n*55);};
let tutRepeat=ls('tutRepeat')==='on',wakeLock=null;
function kioskLayout(on){const h=document.documentElement;h.classList.toggle('kiosk',!!on);
  if(on){const b=document.querySelector('header.bar');h.style.setProperty('--kh',(b?b.getBoundingClientRect().height:90)+'px');hideBanner();}else{h.style.removeProperty('--kh');h.classList.remove('k-insp');}
  if(S)render(true);}
addEventListener('resize',()=>{if(document.documentElement.classList.contains('kiosk'))kioskLayout(true);});
async function keepAwake(on){try{if(on&&'wakeLock' in navigator&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});}else if(!on&&wakeLock){await wakeLock.release();wakeLock=null;}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S&&S.tut&&S.tut.kiosk)keepAwake(true);});
function tutStart(auto,kiosk){speed=1;document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.speed==='1'));txt('dSpeed','1×');
  const m0=mode;mode='free';newGame('tut');mode=m0;
  S.silent=true;while(S.t<930)step();S.silent=false;S.log=[];S.full=[];S.marks=[];S.alarms={};S.cust={ci:0,cml:0,si:0,off:{},pri:0,pmin:{}};S.cost={arm:0,use:0,short:0,curt:0,gen:0};S.insecureMin=0;S.overloadMin=0;S.ens=0;S.peakL=0;queued=[];
  logE(S.t,'Tutorial: Cold Thursday, 15:30. The evening peak is building.','info');S.tut={i:-1,auto:!!auto||!!kiosk,kiosk:!!kiosk,shown:0,acted:false,doneAt:0};kioskLayout(!!kiosk);if(kiosk){tutRepeat=true;keepAwake(true);const ck=$('cookie');if(ck)ck.hidden=true;}hideTip();begin();tutGo(0);track('tutorial_start',{auto:!!auto,kiosk:!!kiosk});}
// Display mode: brand card between demo loops
let introTimer=0;
function kioskIntro(){const el=$('kIntro');el.classList.remove('splash','out');el.hidden=false;el.classList.remove('go');void el.offsetWidth;el.classList.add('go');
  clearTimeout(introTimer);introTimer=setTimeout(endIntro,11000);}
function splash(){let seen=false;try{seen=sessionStorage.getItem(CFG.pre+'splash')==='1';sessionStorage.setItem(CFG.pre+'splash','1');}catch(e){}
  if(seen)return;const el=$('kIntro');el.classList.add('splash');el.hidden=false;el.classList.remove('go');void el.offsetWidth;el.classList.add('go');
  clearTimeout(introTimer);introTimer=setTimeout(endIntro,3400);}
function endIntro(){clearTimeout(introTimer);const el=$('kIntro');if(el.hidden)return;
  if(el.classList.contains('splash')&&el.classList.contains('go')&&!el.classList.contains('out')&&!RMQ.matches){el.classList.add('out');introTimer=setTimeout(endIntro,380);return;}
  el.hidden=true;el.classList.remove('splash','out');if(S&&S.tut&&S.tut.kiosk)tutStart(true,true);}
function tutGo(i){const T=S.tut;if(!T)return;T.i=i;const st=TUT[i];if(!st){tutDone();return;}
  if(st.enter)st.enter();T.shown=performance.now();T.acted=false;T.doneAt=0;T.pressing=false;T.scrolled=false;
  document.documentElement.classList.toggle('k-insp',!!(T.kiosk&&st.sel));
  S.paused=st.t==='next';acc=0;S.sel=null;S.qp=false;lastInsp='';if(PHONE)closeSheet();
  if(st.t==='next'&&i===TUT.length-1)S.paused=true;
  renderCoach(true);render(true);
  if(PHONE){const pm=$('pMimic');if(pm)window.scrollTo({top:pm.getBoundingClientRect().top+window.scrollY-8,behavior:'smooth'});}
  else if(!T.kiosk&&st.x){const e=SELBOX[st.x]?$('coachRing'):$(st.x),r=e&&e.getBoundingClientRect();if(r&&r.height&&(r.bottom<90||r.top>innerHeight-90))e.scrollIntoView({block:'nearest',behavior:'smooth'});}
  if(st.x&&SELBOX[st.x]&&PHONE){const sc=$('mscroll'),svg=$('mimic'),k=svg.getBoundingClientRect().width/1200,b=SELBOX[st.x];sc.scrollLeft=Math.max(0,(b[0]+b[2]/2)*k-sc.clientWidth/2);}}
function tutAct(){const st=TUT[S.tut.i];if(!st||st.t!=='act'||st.done())return;S.tut.acted=true;S.tut.actAt=performance.now();
  if(st.press){S.tut.pressing=true;S.tut.lastGo=0;return;}
  if(isManual(st.k)?!crewFor(st.k):!S.op){const i=S.tut.i;select(st.k,true);
    // show the pop-up for a moment, flash its button, then operate
    setTimeout(()=>{if(!S||!S.tut||S.tut.i!==i)return;flashEl(document.querySelector(`#qp [data-op="${st.k}:${st.a}"]`));
      setTimeout(()=>{if(!S||!S.tut||S.tut.i!==i)return;issueOp(st.k,st.a);S.qp=false;render(true);},380);},PACE().op);}}
function flashEl(e){if(!e)return;e.classList.remove('tut-press');void e.getBoundingClientRect();e.classList.add('tut-press');setTimeout(()=>e.classList.remove('tut-press'),420);}
// One demo press on the real control, so viewers see where it is: select first if the control is in the Control panel
function tutPress(st){if(st.sel&&S.sel!==st.sel){select(st.sel);return;}
  const e=document.querySelector(st.press);if(!e)return;flashEl(e);e.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
// Tutorial clock: slower while someone is reading or doing a step, full speed while a crew walks or a breaker operates
function tutRate(){const T=S.tut;if(!T)return 1;const st=TUT[T.i];const busy=st&&st.t==='act'&&(S.op||crewFor(st.k));return (T.kiosk?.6:1)*(busy?1:.4);}
function tutTick(now){const T=S&&S.tut;if(!T||S.ended)return;const st=TUT[T.i];if(!st)return;
  if(st.t==='act'&&st.press&&T.pressing&&!st.done()&&now-(T.lastGo||0)>PACE().press){T.lastGo=now;tutPress(st);}
  // Bring the control into view once it's showing in the Control panel
  if(st.t==='act'&&st.sel&&S.sel===st.sel&&!T.scrolled&&!T.kiosk&&!PHONE&&!st.done()){const e=document.querySelector(st.press);if(e){T.scrolled=true;e.scrollIntoView({block:'nearest',behavior:'smooth'});}}
  if(st.t==='act'){if(st.done()){if(!T.doneAt){T.doneAt=now;play('ok');if(!T.auto){S.paused=true;acc=0;}renderCoach(true);}
      else if(T.auto&&now-T.doneAt>PACE().after)tutGo(T.i+1);}
    else if(T.doneAt&&!T.auto){T.doneAt=0;S.paused=false;}  // undone before pressing Next: carry on
    else if(T.auto&&!T.acted&&now-T.shown>PACE().wait)tutAct();
    else if(T.acted&&!st.press&&!S.op&&!crewFor(st.k)&&now-(T.actAt||0)>PACE().op+2500&&!st.done())T.acted=false;}
  else if(T.auto&&T.i<TUT.length-1&&now-T.shown>readMs(st))tutGo(T.i+1);
  else if(T.auto&&T.i===TUT.length-1&&tutRepeat&&now-T.shown>Math.max(9000,readMs(st))){if(T.kiosk){if(!T.intro){T.intro=true;kioskIntro();}}else tutStart(true,false);return;}
  renderCoach(false);}
let lastCoach='';
let coachStep=-1,coachPos=-1,coachIn=0;
function renderCoach(force){const el=$('coach');if(!el)return;const T=S&&S.tut;
  if(!T||S.ended){if(!el.hidden){el.hidden=true;lastCoach='';}coachStep=-1;coachPos=-1;el.removeAttribute('style');el.classList.remove('coach-up');document.documentElement.classList.remove('k-insp');
    document.querySelectorAll('.coach-hl').forEach(e=>e.classList.remove('coach-hl'));setAttr($('coachRing'),'visibility','hidden');return;}
  const st=TUT[T.i],last=T.i===TUT.length-1,b=typeof st.b==='function'?st.b():st.b,act=st.t==='act',done=act&&st.done(),
    wait=act&&(S.op&&S.op.k===st.k||crewFor(st.k)),j=act&&crewFor(st.k),
    showMe=act&&!T.auto&&!wait&&!done&&performance.now()-T.shown>SHOW_AFTER;
  const stTxt=!act?'':done?(T.auto?'✓ Done':'✓ Done. Press Next when you\'re ready.'):wait?(j?`Crew ${j.n} ${j.to?'walking there, arrives '+fmtT(j.arr):'on site'}…`:'Operating…'):T.auto?'Watch: the demo does this for you.':st.hint?st.hint():'Your turn: do this on the diagram.';
  const h=`<div class="coach-top"><span class="coach-n">${T.kiosk?'Demonstration':'Tutorial'} · ${T.i+1} of ${TUT.length}</span><button type="button" class="coach-x" data-tut="exit" aria-label="Exit the tutorial">×</button></div>
    <h3>${esc(st.h)}</h3><p>${esc(b)}</p>
    ${act?`<p class="coach-st${done?' ok':''}">${esc(stTxt)}</p>`:''}
    ${T.auto&&last&&tutRepeat?`<p class="coach-st">Starting again in a few seconds…</p>`:''}
    <div class="coach-row">${T.auto?`<button type="button" class="btn${tutRepeat?' on':''}" data-tut="repeat" aria-pressed="${tutRepeat}">↻ Repeat: ${tutRepeat?'on':'off'}</button>`:''}${T.kiosk?'':last?`<button type="button" class="btn primary" data-tut="career">Start my career</button><button type="button" class="btn" data-tut="menu">Start screen</button><button type="button" class="btn" data-tut="again">Replay demo</button>`
      :`<button type="button" class="btn" data-tut="mode">${T.auto?'Let me do it':'Auto-play'}</button>${showMe?'<button type="button" class="btn" data-tut="show">Stuck? Show me</button>':''}${st.t==='next'||done?`<button type="button" class="btn primary" data-tut="next">${T.auto?'Next now':'Next'}</button>`:''}`}</div>`;
  if(force||h!==lastCoach){el.innerHTML=h;lastCoach=h;}
  const fresh=el.hidden;el.hidden=false;
  if(coachStep!==T.i){coachStep=T.i;el.classList.remove('step-in');void el.offsetWidth;el.classList.add('step-in');clearTimeout(coachIn);coachIn=setTimeout(()=>el.classList.remove('step-in'),450);}
  document.querySelectorAll('.coach-hl').forEach(e=>e.classList.remove('coach-hl'));
  const r=$('coachRing');if(st.x&&SELBOX[st.x]){const bx=SELBOX[st.x];setAttr(r,'x',String(bx[0]-6));setAttr(r,'y',String(bx[1]-6));setAttr(r,'width',String(bx[2]+12));setAttr(r,'height',String(bx[3]+12));setAttr(r,'visibility','visible');}
  else{setAttr(r,'visibility','hidden');const e=st.x&&$(st.x);if(e)e.classList.add('coach-hl');}
  // Point at the control itself (e.g. + on Armed) while it's still to do
  const ps=st.press||(st.k&&`#qp [data-op="${st.k}:${st.a}"]`);if(act&&ps&&!done&&!wait){const e=document.querySelector(ps);if(e&&!(e instanceof SVGElement))e.classList.add('coach-hl');}
  if(T.kiosk){const p=$('pInsp');if(st.sel&&p)document.documentElement.style.setProperty('--ih',p.offsetHeight+'px');return;}
  placeCoach(el,st,fresh);}
// Keep the coach off whatever the step is about: the highlighted part of the diagram, its pop-up and the Control panel
function coachAvoid(st){const out=[],add=e=>{if(!e)return;const b=e.getBoundingClientRect();if(b.width&&b.height)out.push(b);};
  if(st.x&&st.x!=='pMimic')add(SELBOX[st.x]?$('coachRing'):$(st.x));
  if(st.t==='act'){const q=$('qp');if(q&&!q.hidden)add(q);if(st.press)add(document.querySelector(st.press));if(st.sel&&S.sel===st.sel)add($('pInsp'));}
  return out;}
function placeCoach(el,st,fresh){const W=innerWidth,H=innerHeight,w=el.offsetWidth,h=el.offsetHeight,m=16,av=coachAvoid(st);
  const C=PHONE?[[8,H-70-h],[8,8]]:[[W-m-w,H-m-h],[m,H-m-h],[W-m-w,m],[m,m]];
  const ov=C.map(([x,y])=>av.reduce((a,b)=>a+Math.max(0,Math.min(x+w,b.right)-Math.max(x,b.left))*Math.max(0,Math.min(y+h,b.bottom)-Math.max(y,b.top)),0));
  let k=coachPos<0||coachPos>=C.length?0:coachPos;const best=ov.indexOf(Math.min(...ov));if(ov[k]>0&&ov[best]<ov[k])k=best;
  if(PHONE){el.removeAttribute('style');el.classList.toggle('coach-up',k===1);coachPos=k;return;}
  el.classList.remove('coach-up');
  if(fresh||coachPos<0)el.style.transition='none';
  el.style.left=Math.max(8,Math.round(C[k][0]))+'px';el.style.top=Math.max(8,Math.round(C[k][1]))+'px';el.style.right='auto';el.style.bottom='auto';
  if(el.style.transition==='none'){void el.offsetWidth;el.style.transition='';}coachPos=k;}
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
  if(a==='mode'&&S.tut){const T=S.tut,st=TUT[T.i];T.auto=!T.auto;T.shown=performance.now();T.acted=false;T.pressing=false;if(st&&st.t==='act'&&st.done()){T.doneAt=performance.now();S.paused=!T.auto;}renderCoach(true);return;}
  if(a==='exit'||a==='menu'){keepAwake(false);kioskLayout(false);S.tut=null;renderCoach(true);S.running=false;S.paused=true;newGame(chosen);startSheet();return;}
  if(a==='career'){kioskLayout(false);S.tut=null;renderCoach(true);mode='career';ls('mode',mode);const c=career();chosen=CAREER.find(k=>unlockedK(c,k)&&!(c.stars[k]>=1))||CAREER[0];ls('day',chosen);newGame(chosen);startSheet();return;}}

/* ---------- Start sheet ---------- */
const BOLT='M7 0 0 8h4l-2 6 7-9H5l2-5z';
const diffHtml=(d,c)=>`<span class="diff" style="--sc:${c}">${[1,2,3].map(k=>`<svg viewBox="0 0 9 14" aria-hidden="true"><path class="${k<=d?'on':'off'}" d="${BOLT}"/></svg>`).join('')}<em>${['','Easier','Medium','Hardest'][d]}</em></span>`;
const FC_RULES=`
    <li>Blackout Canyon takes power from the Steve Towers 132 kV grid supply point through three 60 MVA transformers, and feeds <b>Hertz House</b>, <b>Shocking Place</b>, <b>Ohm No</b> and <b>Joule Street</b>. Keep each transformer under 100%, in either direction.</li>
    <li><b>Generation and flexibility</b> are your only tools. Shocking Place has a solar farm, Ohm No has a wind farm and a gas CHP, and Hertz House has the Kings Hill battery and demand response. Strong sun or wind pushes power back up through the transformers, and peaks pull hard the other way.</li>
    <li><b>▲ ▼</b> beside a generator turn it up or down now. Select one to <b>arm</b> an automatic response that switches in by itself if a transformer overloads. Arming and using flexibility costs money, and spending costs points.</li>
    <li><b>Firm capacity</b> is what's left if one more transformer trips. After a loss the others can run at up to 120% for 30 minutes, or 120–150% for ${SHORT_MIN} minutes. Above that they trip, so be ready before a fault, not after it.</li>
    <li>Transformer faults and planned work come back by themselves when they're finished. The breakers, ties and interconnectors on the diagram are run from the control room game.</li>
    <li>If every transformer trips, Blackout Canyon is lost and the shift ends.</li>`;
function careerBox(){const c=career(),n=starsOf(c),nr=nextRank(n),got=ACH.filter(a=>c.ach[a.id]);
  return `<div class="career" id="careerBox"><div class="career-top"><div><span class="k">Rank</span><b>${esc(rankOf(n))}</b><span class="s">${n} of ${CAREER.length*3} stars${nr?` · ${nr[0]-n} more for ${esc(nr[1])}`:''}</span></div>
    <div><span class="k">Achievements</span><b>${got.length} of ${ACH.length}</b></div></div>
    <div class="ach">${ACH.map(a=>`<span class="badge${c.ach[a.id]?' got':''}" title="${esc(a.d)}">${c.ach[a.id]?'🏅':'○'} ${esc(a.name)}</span>`).join('')}</div>
    <p class="fine">Finish a shift to unlock the next one. Grade A earns 3 stars, B 2, C or D 1. Career shifts use random faults and count on the free-play scoreboard.</p>${syncBox()}</div>`;}
// Start screen: hero with an animated mini-diagram, three "how it works" cards and one clear main action
const HOW=GAME==='cr'?[['tx','var(--hv)','Keep transformers under firm capacity','If one more transformer trips, the others still have to carry the load.'],
    ['tie','var(--c-wind)','Switch load between substations','Ties, interconnectors and backfeeds move demand to where there is room.'],
    ['load','var(--ok)','Restore customers fast','Find faults, send crews and get people back on inside 3 minutes if you can.']]
  :[['tx','var(--hv)','Keep transformers under firm capacity','If one more transformer trips, the others still have to carry the flow.'],
    ['wind','var(--c-wind)','Turn generation up or down','Strong sun and wind push power back up; evening peaks pull the other way.'],
    ['batt','var(--c-batt)','Arm flexibility before the fault','Book the battery, CHP and demand response to switch in by themselves.']];
const played=()=>ls('played')==='1'||starsOf(career())>0;
const easiestK=()=>Object.keys(SCENARIOS).filter(k=>!SCENARIOS[k].hidden).sort((a,b)=>SCENARIOS[a].diff-SCENARIOS[b].diff)[0];
const careerNext=()=>{const c=career(),ks=CAREER.filter(k=>SCENARIOS[k]);return ks.find(k=>unlockedK(c,k)&&!(c.stars[k]>=1))||ks[ks.length-1];};
const dailyK=()=>SCENARIOS[chosen]&&!SCENARIOS[chosen].hidden?chosen:CFG.def;
function heroArt(){const cr=GAME==='cr',X=[80,160,240],F=[60,125,195,260];
  return `<svg class="hero-art" viewBox="0 0 320 210" role="img" aria-label="Animated network: power flowing through three transformers, then a fault trips one circuit${cr?' and a field crew walks out':' while the wind farm turns'}">
  <text class="ha-t" x="40" y="12">132 kV</text><path class="ha-gsp" d="M40 18 H280"/>
  ${X.map((x,i)=>`<g class="ha-cct${i===2?' ha-f':''}"><path class="ha-l" d="M${x} 18 V39 M${x} 74 V110"/><path class="ha-flow" d="M${x} 18 V39 M${x} 74 V110"/><circle class="ha-w1" cx="${x}" cy="50" r="11"/><circle class="ha-w2" cx="${x}" cy="63" r="11"/><text class="ha-t" x="${x+15}" y="48">T${i+1}</text></g>`).join('')}
  <path class="ha-bolt" d="M262 82 l-9 13 h6 l-3 10 l10 -14 h-6 z"/>
  <path class="ha-bus" d="M30 110 H290"/><text class="ha-t" x="30" y="104">33 kV</text>
  ${F.map(x=>`<path class="ha-fd" d="M${x} 110 V146"/><path class="ha-flow" d="M${x} 110 V146"/><path class="ha-sub" d="M${x-16} 146 H${x+16}"/>${[-9,0,9].map(d=>`<path class="ha-ld" d="M${x+d-4} 152 h8 l-4 7 z"/>`).join('')}`).join('')}
  ${cr?`<g class="ha-crew"><g class="ha-bob"><circle cx="0" cy="-15" r="3.6"/><path d="M0 -11 V-3 M0 -9 l-5 4 M0 -9 l5 4 M0 -3 l-4 7 M0 -3 l4 7"/></g></g><path class="ha-path" d="M14 196 H306"/>`
    :`<g class="ha-wt" transform="translate(296 168)"><path class="ha-tower" d="M0 0 V34"/><g class="ha-blades"><path d="M0 0 V-14 M0 0 L12 7 M0 0 L-12 7"/></g></g><g class="ha-sun" transform="translate(24 176)"><circle r="7"/><path d="M0 -12v3M0 9v3M-12 0h3M9 0h3M-8.5 -8.5l2 2M6.5 6.5l2 2M-8.5 8.5l2 -2M6.5 -6.5l2 -2"/></g>`}
</svg>`;}
function mainAction(){const cr=GAME==='cr';
  if(!played()){const e=easiestK();
    return `<div class="cta-main">${cr?`<button type="button" class="btn primary big hero-go" data-tut="play"><small>New here? Start with</small>Play the tutorial</button><button type="button" class="btn big hero-go" data-tut="demo"><small>Or sit back and</small>Watch the demo</button>`
      :`<button type="button" class="btn primary big hero-go" data-go="first"><small>New here? Start with the easiest day</small>Play ${esc(SCENARIOS[e].title)}</button>`}</div>
    <div class="cta-sec"><button type="button" class="btn sec-go" data-go="skip"><small>Played before?</small>Choose your own shift ↓</button></div>
    ${cr?`<p class="cta-alt">For a stand or screen: <button type="button" class="linkish" data-tut="kiosk" title="Runs the demo on its own, over and over, and keeps the screen awake. For a display stand.">display mode</button></p>`:''}`;}
  const c=career(),nk=careerNext(),done=CAREER.filter(k=>SCENARIOS[k]).every(k=>c.stars[k]>=1),dk=dailyK();
  return `<div class="cta-main"><button type="button" class="btn primary big hero-go" data-go="career"><small>${done?'Career complete · play again':starsOf(c)?'Continue your career':'Start your career'}</small>Shift ${CAREER.indexOf(nk)+1}: ${esc(SCENARIOS[nk].title)}</button>
    <button type="button" class="btn big hero-go" data-go="daily"><small>Today's challenge · ${esc(fmtDate(todayUK()))}<span class="daily-top"></span></small>${esc(SCENARIOS[dk].title)}</button></div>
    <div class="cta-sec"><button type="button" class="btn sec-go" data-go="skip"><small>Something else?</small>Choose your own shift ↓</button>${cr?`<button type="button" class="btn sec-go" data-tut="play"><small>Need a refresher?</small>Play the tutorial</button>`:''}</div>
    ${cr?`<p class="cta-alt">Or <button type="button" class="linkish" data-tut="demo">watch the demo</button> · For a stand or screen: <button type="button" class="linkish" data-tut="kiosk" title="Runs the demo on its own, over and over, and keeps the screen awake. For a display stand.">display mode</button></p>`:''}`;}
function heroGo(g){
  if(g==='skip'){const t=$('pick');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(g==='career'){mode='career';chosen=careerNext();}else if(g==='daily'){mode='daily';chosen=dailyK();}else if(g==='first'){mode='free';chosen=easiestK();}else return;
  ls('mode',mode);ls('day',chosen);newGame(chosen);$('startBtn').click();}
function startSheet(){
  const date=todayUK();
  const cc=career(),keys=mode==='career'?CAREER.filter(k=>SCENARIOS[k]):Object.keys(SCENARIOS).filter(k=>!SCENARIOS[k].hidden);
  if(mode==='career'&&!unlockedK(cc,chosen)){chosen=CAREER.find(k=>unlockedK(cc,k)&&!(cc.stars[k]>=1))||CAREER[0];}
  const sc=keys.map(k=>[k,SCENARIOS[k]]).map(([k,v])=>`<button type="button" class="scn${mode==='career'&&!unlockedK(cc,k)?' locked':''}" data-scn="${k}"${mode==='career'&&!unlockedK(cc,k)?' disabled':''} style="--sc:${v.color}" aria-pressed="${k===chosen}"><span class="scn-top">${ico(sceneOf(k),v.color)}<span class="f">${mode==='career'?`Shift ${CAREER.indexOf(k)+1} · `:''}${v.focus}</span></span><b>${v.title}${mode==='career'?` <span class="stars">${unlockedK(cc,k)?starStr(cc.stars[k]||0):'🔒'}</span>`:''}</b>${diffHtml(v.diff,v.color)}<span class="d">${v.when}</span><span class="best">${ls('best-'+k)?'Your best: <b>'+nf(+ls('best-'+k))+'</b>':'Not played yet'}</span><p>${v.blurb}</p></button>`).join('');
  $('sheet').innerHTML=`${BAND}<div class="hero"><div class="hero-t">
    <h2 class="hero-h">Firm Capacity<span>${GAME==='cr'?'Control room':'Generation'}</span></h2>
    <p class="pitch">${GAME==='cr'?"You're on shift in the control room. Keep the lights on.":"You're the DSO on shift. Keep Blackout Canyon inside firm capacity."}</p>
    ${mainAction()}</div>${heroArt()}</div>
  <div class="how">${HOW.map(([ic,c,t,d])=>`<div class="how-c">${ico(ic,c)}<div><b>${t}</b><span class="t">${d}</span></div></div>`).join('')}</div>
  <details class="rules-d"><summary>How to play: the full rules</summary>
  <ul class="rules">${GAME==='fc'?FC_RULES:`
    <li>Blackout Canyon takes power from the Steve Towers 132 kV grid supply point through three 60 MVA transformers, and feeds four substations: <b>Hertz House</b>, <b>Shocking Place</b>, <b>Ohm No</b> and <b>Joule Street</b>.${GAME==='cr'?' On the Interconnected shift, <b>Kilowatt Close</b> is fed through Shocking Place, with a backup route from Ohm No.':''} Keep each transformer under 100%, in either direction.</li>
    <li>The 33 kV busbar has two normally closed <b>bus section breakers</b> (BS), between T1 and T2 and between T2 and T3. Opening one splits the busbar, so each section is supplied only by its own transformers. Arrows on the diagram show which way power is flowing.</li>
    <li><b>Firm capacity</b> is what's left if one more transformer trips. After a loss the others can run at up to 120% for 30 minutes, or 120–150% for ${SHORT_MIN} minutes. Above that they trip.</li>
    <li><b>Everything is run from the diagram.</b> Tap a breaker or switch and press Open or Close in the pop-up. Tap anything else for its details. In the generation days, ▲ ▼ beside a generator turn it up or down now, and armed flexibility switches in by itself on overload.</li>
    <li><b>Neighbours:</b> Hertz House and Shocking Place have ties to <b>Ampy Place</b>, which shares our grid supply: close the new route, then open the old one within ${PAR_MAX} minutes. Ohm No and Joule Street have ties to <b>Watts This</b>, on a different grid supply: open the old route first, then close the new one. Get the order wrong and protection trips.</li>
    <li><b>Interconnectors</b> link neighbouring substations so one can feed another. Feeders, ties and interconnectors all have ratings, and neighbours have limited spare capacity. Anything over its limit for ${OV_MIN} minutes trips, and an alarm sounds at 80% so you have warning.</li>
    <li><b>Field crews:</b> breakers at substations are remote-controlled and operate in a minute. Ties, interconnectors and Volt Face backfeeds (drawn as circles ○) are manual: a field crew (three on most shifts, one on Christmas Day) has to walk there from the depot first. Send a crew ahead to stand by where you'll need it.</li>
    <li><b>The 3-minute rule:</b> customers count as interrupted (CI) only if they're off for 3 minutes or more, and every minute after that adds customer minutes lost (CML). Restore within 3 minutes and it's only a short interruption.</li>
    <li><b>11 kV links</b> (Snow day and Storm endurance) join an 11 kV feeder at one substation to a feeder at the next. Open a feeder breaker and close its link to move that feeder onto the neighbouring substation. With both on the same grid supply you can close the link first for a transfer with no interruption. Each link is rated 15 MW.</li>
    <li><b>Volt Face</b> is a neighbouring 11 kV network on a different grid supply. The second and third 11 kV feeders at each substation have a backfeed from it (the small switch under the feeder). Open the feeder breaker first, then close the backfeed, and those customers move onto Volt Face, which takes the load off Blackout Canyon. Volt Face has limited spare capacity too.</li>
    ${PRIO_ON?`<li><b>Priority customers:</b> some 11 kV feeders supply a hospital (<b>H</b>), a care home (<b>C</b>) or Priority Services Register customers (<b>P</b>), marked next to the feeder. While their half of the feeder is off they cost extra points every minute: ${PRK.hosp.pts} for the hospital, ${PRK.care.pts} for a care home and ${PRK.psr.pts} for PSR customers, on top of the usual customer minutes lost. Restore them first, and shed feeders without them.</li>`:''}
    ${GAME==='cr'?`<li><b>Substation transformers:</b> at each substation the 33 kV bar feeds a 33/11 kV transformer through its own automatic 33 kV breaker (the square above the two circles), and the transformer feeds the 11 kV feeders. If the transformer develops a fault, protection trips the breaker and all three 11 kV feeders lose supply, while generation on the 33 kV bar carries on. Open the feeder breakers and restore what you can from the far ends, then close the transformer breaker once the repair is done. Closing it onto the fault trips it again and adds 30 minutes to the repair.</li>`:''}
    <li><b>Demand feeders:</b> each substation supplies three 11 kV feeders, each with its own breaker. Opening one sheds that part of the demand, which can save an overload, but its customers count as off supply until you close it again.</li>
    <li><b>Auto-reclose:</b> most faults on overhead lines are transient. The breaker trips, recloses a few seconds later and stays in, so customers only get a short interruption. A permanent fault makes it lock out. Underground cables (the first feeder at each substation) don't auto-reclose.</li>
    <li><b>Fault finding:</b> when an 11 kV feeder locks out you don't know which half the fault is in. Each feeder has a manual mid-point switch (the small circle halfway down). Open it, then trial-close the feeder breaker: if it holds, the fault is in the far half and the near half is back on; if it trips, the fault is in the near half. Each close onto a fault costs ${TRIAL_PTS} points. Repairs only start once the fault is found, and line patrol finds it after ${PATROL} minutes if you don't.</li>
    <li><b>Customer calls:</b> customers ring in when their supply goes off. Some say what they saw or heard, such as a bang from a pole, which tells you which half of the feeder the fault is in. Now and then a substation's RTU is slow to report a trip, so the calls arrive before the alarm and the diagram still shows the breaker closed: poll the RTU from the call to get the trip through.</li>
    <li><b>Mobile generators:</b> ${MG_N} trailer generators of ${MG_CAP} MW each. A crew tows one to the far end of a feeder and connects it in ${MG_CONN} minutes, so it can supply a dead half that has no backfeed. It trips if it's overloaded or if another supply is closed onto it.</li>
    <li><b>Feeders have a breaker at each end:</b> one at Blackout Canyon and an incomer at the substation. A feeder fault trips both, and the feeder only carries power again once both are closed.</li>
    <li>Planned work and faulted equipment must be finished before you close it again. Closing either end of a feeder before then is an incident. Repaired transformers and feeders stay out until you close their breakers. Each operation takes one minute.</li>
    <li>Customers off supply cost points every minute. If every substation is off supply at once, Blackout Canyon is lost and the shift ends.</li>
  `}</ul></details>
  <div class="pick" id="pick"><p class="pick-h">Or choose your own shift</p>
  <h3>Mode</h3><div class="modes">
    <button type="button" class="mode" data-mode="daily" aria-pressed="${mode==='daily'}"><b>Today's challenge · ${esc(fmtDate(date))}<span class="daily-top"></span></b><span>Same weather and fault times for everyone today.</span></button>
    <button type="button" class="mode" data-mode="free" aria-pressed="${mode==='free'}"><b>Free play</b><span>Random faults every game. Good for practice.</span></button>
    <button type="button" class="mode" data-mode="career" aria-pressed="${mode==='career'}"><b>Career</b><span>Work through the shifts in order, earn stars and climb the ranks.</span></button></div>
  ${mode==='career'?careerBox():''}
  <h3>Choose a day</h3><div class="scns">${sc}${mode==='free'?`<button type="button" class="scn" data-random style="--sc:var(--accent)"><span class="f">Free play</span><b>Random shift</b><span class="d">Any day</span><p>Picks one of the shifts above at random.</p></button>`:''}</div>
  <div class="go"><div class="opts"><label class="chk"><input type="checkbox" id="ovPause" ${autoPause?'checked':''}> Pause on faults and overloads</label><label class="chk"><input type="checkbox" id="ovTips" ${tipsOn?'checked':''}> Show tips</label></div>
  <span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-feedback>Feedback</button><button id="sheetBoardBtn" type="button" class="btn">Scoreboard</button><button id="startBtn" type="button" class="btn primary big">Start shift at ${fmtT(START)}</button></span></div>
  <div class="other-game"><p>${CFG.other.box}</p><a class="btn" href="${CFG.other.url}" target="_top">${CFG.other.cta}</a></div>
  <p class="fine"><span id="runTxt">${runText()}</span> Time slows to half speed while anything is overloaded. MW and MVA are treated as equal. No faults in the first 20 minutes, so you can set up.</p></div>`;
  $('overlay').hidden=false;fillDailyTop();
}
// Today's challenge buttons: add the current leader from the scoreboard
let dailyTop={};
async function fillDailyTop(){const day=dailyK(),key=day+'|'+todayUK();
  const put=()=>{const v=dailyTop[key];if(v)document.querySelectorAll('.daily-top').forEach(el=>el.textContent=v);};
  if(key in dailyTop)return put();dailyTop[key]='';
  try{const r=await fetch(SCORE_URL+'?game='+GAME+'&day='+encodeURIComponent(day)+'&mode='+encodeURIComponent(modeKey('daily',todayUK())));const j=await r.json();
    if(!j.ok||!(j.version>=(GAME==='cr'?3:1)))return;const t=j.scores&&j.scores[0];
    dailyTop[key]=t?` · Top ${Number(t.score).toLocaleString('en-GB')} (${t.name})`:' · No scores yet';put();}
  catch(e){delete dailyTop[key];}}

/* ---------- End of shift ---------- */
function computeScore(){
  const spend=spendOf(S.cost),L=S.lost,surv=(L?L.m:END)-START;
  const parts={surv:surv*10,bonus:L?0:5000,risk:-S.insecureMin*20,spend:-Math.round(spend/10),ens:-Math.round(S.ens),inc:-S.incidents*INCIDENT_PTS,trial:-(S.trial||0)*TRIAL_PTS,prio:-Math.round(S.cust.pri||0)};
  return{total:Math.max(0,Object.values(parts).reduce((a,b)=>a+b,0)),parts,surv,spend};
}
function endShift(){
  if(S.tut){tutDone();return;}
  S.ended=true;S.running=false;S.paused=true;hideBanner();hideTip();humTo(0);closeSheet();S.sel=null;lastInsp='';
  const L=S.lost,sc=computeScore();let g='✕',gl='alarm',gd='';
  if(!L){const k=(END-START)/720;
    if(S.sc.easy&&S.insecureMin===0&&S.overloadMin===0&&S.incidents===0&&S.isoMin<=ISO_A*S.faults){g='A';gl='ok';gd=S.faults?'Every fault switched round quickly, so customers were soon back on. Textbook control.':'A clean shift with nothing to restore. Textbook control.';}
    else if(S.insecureMin===0&&S.overloadMin===0&&S.incidents===0&&S.ens+(S.cust.pri||0)<100){g='A';gl='ok';gd='Secure all shift, no incidents and almost no customers off. Textbook control.';}
    else if(S.insecureMin<=20*k&&S.incidents<=Math.round(k)&&S.ens+(S.cust.pri||0)<1500*k){g='B';gl='ok';gd='A solid shift with only brief exposure.';}
    else if(S.insecureMin<=90*k&&S.incidents<=Math.round(2*k)){g='C';gl='warn';gd='Blackout Canyon stayed on, but there were costly moments.';}
    else{g='D';gl='warn';gd='You got through it, but customers and the network took a beating.';}
    play('done');
  }
  S.final={...sc,grade:L?'Lost':g,gl,gd,result:L?'lost':'complete'};
  if(sc.total>(+ls('best-'+S.key)||0))ls('best-'+S.key,String(sc.total));
  {const c=career(),before=starsOf(c),done=!L,st=L?0:{A:3,B:2,C:1,D:1}[g]||0,newA=[];const prevUnl=CAREER.filter(k=>unlockedK(c,k));
   const award=(id,ok)=>{if(ok&&!c.ach[id]&&ACH.some(a=>a.id===id)){c.ach[id]=1;newA.push(ACH.find(a=>a.id===id));}};
   award('first',done);award('clean',done&&S.incidents===0);award('solid',done&&S.insecureMin===0);award('quick',done&&S.cust.ci===0&&S.cust.si>0);award('nobody',done&&S.cust.ci===0&&S.cust.si===0);
   award('mbb',S.parOk>0);award('crews',S.crewJobs>=8);award('vf',S.vfPeak>=20);award('heat',done&&S.key==='heat'&&(g==='A'||g==='B'));award('gsp',done&&S.key==='gsp'&&S.gspTrips===0);award('dry',done&&S.key==='xmas'&&!!S.flood&&S.flood.arrived&&S.flood.live===false);award('endure',done&&S.key==='endure'&&(g==='A'||g==='B'));award('cheap',done&&GAME==='fc'&&sc.spend<2000);
   let up=false;if(S.mode==='career'&&st>(c.stars[S.key]||0)){c.stars[S.key]=st;up=true;}
   award('textbook',CAREER.every(k=>(c.stars[k]||0)>=3));saveCareer(c);
   S.syncRes=null;if(syncGet()&&!S.silent)syncQuiet().then(r=>{if(!r||!S||!S.ended)return;S.syncRes=r;const e=$('endSync');if(e)e.textContent=endSyncTxt();});
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
// Tips for the debrief, by reason. A shift can override any of them with its own tips:{reason:text}.
const DB_TIPS={
  sub:'A whole substation off costs points every minute. Get it back first, through its tie or an interconnector, and tidy up afterwards.',
  sub_fd:'A 33 kV feeder fault leaves the substation off until you switch it round. Close its tie or an interconnector straight away, and send a crew to stand by when a weather warning starts.',
  sub_plan:'Planned outages are announced at the start of the shift and again an hour before. Move the substation onto another route before field staff open the feeder.',
  lvfind:'Don\'t wait for line patrol. Send a crew to open the mid-point switch, then close the breaker: if it holds, the fault is in the far half and the near half is back on.',
  lvnear:'With the fault in the far half, open the mid-point switch and close the breaker at the substation. The near half comes straight back.',
  lvfar:'With the fault in the near half, the far half can come back from the other end: Volt Face, an 11 kV link or a mobile generator.',
  prio:'Hospitals, care homes and Priority Services Register customers cost far more while they\'re off. Restore their half of the feeder first, and when you have to shed load, open a feeder without them.',
  prio_rep:'The priority customers were on the faulted half, so only the repair could bring them back.',
  pt_fault:'A transformer fault takes out all three 11 kV feeders at once. Open the feeder breakers, then bring back what you can from the far ends with links, Volt Face or a mobile generator while it\'s repaired.',
  pt:'With the transformer breaker open, the 11 kV feeders have no supply from their own substation. Close it as soon as the transformer is ready.',
  lvoff:'These customers were on a healthy feeder. After a repair or a trip, check the alarm list and close the breaker and mid-point switch to put everyone back.',
  risk:'Minutes at risk count while losing one more transformer would overload the rest. Use the look-ahead and move load onto the neighbours before the peak, not during it.',
  gsp:'Get under the National Grid limit before the deadline. Watts This and Volt Face take load off Steve Towers; Ampy Place is on the same grid supply, so moving load there doesn\'t help.',
  oop:'Watts This and Volt Face are on a different grid supply from Blackout Canyon and Ampy Place. When moving load between them, open the old supply before closing the new one: break before make.',
  par:'Make before break onto Ampy Place is fine, but open one side within '+PAR_MAX+' minutes of closing the other.',
  inc_mg:'A mobile generator can\'t be paralleled with anything. Disconnect it before closing any other supply onto its section.',
  inc_early:'Wait for the "repaired" or "finished" message before closing anything back onto faulted plant. Closing early trips it and adds 30 minutes.',
  trial:'Each close onto a fault costs '+TRIAL_PTS+' points. Open the mid-point switch first so only half the feeder is tried, and keep the faulted half isolated until the repair is done.',
  sp_arm:'Availability fees run for as long as flex is armed. Arm what the look-ahead says the peak needs, and disarm once it has passed.',
  sp_use:'Armed flex switched in because loading went past firm capacity. Moving load onto the neighbours first costs nothing.',
  sp_short:'Calling flex by hand costs 1.5 times the armed price. Arm it ahead of the peak instead.',
  sp_curt:'Curtailment compensation adds up quickly. Curtail only what is needed and release it as soon as loading allows.',
  sp_gen:'Generators on a substation that is off supply still get compensation. Restore those substations quickly.',
  lvcall:'Customers were calling before the trip alarm came through. When callers are off but their feeder breaker still shows closed, poll the RTU at that substation.',
  flood:'Before the water arrives, move every feeder at the flooded substation onto another supply, then open its feeder breakers and its transformer breaker so the switchboard is dead.',
  flood_close:'Leave the flooded switchgear dead until the "dried and tested" message. Closing anything onto it trips it and adds 30 minutes.',
  lost:'Every substation was off at once. Keep a healthy route ready for each substation, and get transformers under their emergency rating before protection trips them.'};
const UNAVOID={repair:1,ar:1,prio_rep:1};// faulted sections and auto-recloses: nothing the player could have done
const tipOf=r=>{const b=r.split('_')[0],t=S.sc.tips||{};return t[r]||t[b]||DB_TIPS[r]||DB_TIPS[b]||'';};
function drawDebrief(){if(GAME!=='cr')return'';const all=S.loss||[],top=all.filter(e=>!UNAVOID[e.r]&&e.pts>=1).sort((a,b)=>b.pts-a.pts).slice(0,3);
  const un=Math.round(all.filter(e=>UNAVOID[e.r]).reduce((a,e)=>a+e.pts,0)),when=e=>fmtT(e.from)+(e.to>e.from?'–'+fmtT(e.to+1):'');
  const unl=un?`<p class="fine">Another ${nf(un)} points went on faulted sections waiting for repair and on auto-recloses: nothing to be done about those.</p>`:'';
  if(!top.length)return `<div class="debrief"><h3>Shift debrief</h3><p>Nothing cost you points that you could have saved. Textbook.</p>${unl}</div>`;
  return `<div class="debrief"><h3>Shift debrief</h3><p class="fine">The ${top.length===1?'moment':top.length+' moments'} that cost the most points, and what to try next time.</p><ol>${top.map(e=>`<li><div class="db-h"><b class="db-pts">−${nf(e.pts)}</b><span class="db-t">${when(e)}</span><span class="db-l">${esc(e.l)}</span></div><p class="db-tip">${esc(tipOf(e.r))}</p></li>`).join('')}</ol>${unl}</div>`;}
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
      ${PRIO_ON?`<tr><td>Priority customers off (${nf(Object.values(S.cust.pmin||{}).reduce((a,b)=>a+b,0))} min${Object.keys(S.cust.pmin||{}).length?': '+esc(Object.entries(S.cust.pmin).map(([k,v])=>`${PRIO[k].name} ${v}`).join(', ')):''})</td><td>${sg(F.parts.prio)}</td></tr>`:''}
      <tr><td>Switching incidents (${S.incidents} × ${INCIDENT_PTS})</td><td>${sg(F.parts.inc)}</td></tr>
      ${LV_ON?`<tr><td>Closed onto a fault (${S.trial||0} × ${TRIAL_PTS})</td><td>${sg(F.parts.trial)}</td></tr>`:''}
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
      ${syncGet()||S.syncRes?`<p class="fine sync-end" id="endSync" role="status">${esc(endSyncTxt())}</p>`:''}
      ${S.mode!=='career'?'':CR.next?(unlockedK(career(),CR.next)?`<button type="button" class="btn primary big" data-next="${CR.next}">Start next day: ${esc(SCENARIOS[CR.next].title)} →</button>`:`<p class="fine">Finish this shift to unlock ${esc(SCENARIOS[CR.next].title)}. Press Try again below.</p>`):`<p><b>That's every career shift done.</b> Replay any of them to earn more stars.</p>`}</div>`:'';
  $('sheet').innerHTML=`${BAND}<p class="eyebrow">${esc(S.sc.title)}, ${esc(S.sc.when)} · ${S.mode==='daily'?"Today's challenge, "+fmtDate(S.date):S.mode==='career'?'Career · '+esc(CR?CR.rank:''):'Free play'}</p>${head}${cbox}${drawDebrief()}${drawReplay()}${score}${sub}${costs}${btns}`;
  $('overlay').hidden=false;
}

function unlockEnd(){S.unlocked=true;['againBtn','sheetBoardBtn','replayBtn'].forEach(i=>{const b=$(i);if(b)b.disabled=false;});const n=$('lockNote');if(n)n.hidden=true;}
const endSyncTxt=()=>{const r=S.syncRes;return !r?'Saving your career online…':r.ok?`Career saved online as ${r.name}.`:syncNote||SYNC_ERR.net;};
function setMsg(t,cls){const m=$('submitMsg');if(m){m.textContent=t;m.className='fine '+(cls||'');}}
const MPRE=GAME==='cr'?'cr-':'',modeKey=(md,date)=>md==='daily'?MPRE+'daily-'+date:MPRE+'free';
async function submitScore(){
  const inp=$('pName'),btn=$('submitScore');if(!inp||S.submitted)return;
  const nm=inp.value.trim().replace(/\s+/g,' ').slice(0,20);if(!nm){setMsg('Enter a name first.','err');inp.focus();return;}
  if(rude(nm)){setMsg('Please choose a different name.','err');inp.focus();return;}
  saveName(nm);const F=S.final;btn.disabled=true;setMsg('Sending…');
  try{
    const r=await fetch(SCORE_URL,{method:'POST',body:JSON.stringify({game:GAME,site:location.hostname,name:nm,day:S.key,mode:modeKey(S.mode,S.date),result:F.result,survived:F.surv,spend:Math.round(F.spend),faults:S.faults,risk:S.insecureMin,ens:Math.round(S.ens),incidents:S.incidents,grade:F.grade})});
    const j=await r.json();
    if(!j.ok){if(j.error==='name'){btn.disabled=false;setMsg('Please choose a different name.','err');return;}
      if(j.error==='site'){setMsg(`Scores can only be saved on the original game at ${HOME_HOST}.`,'err');unlockEnd();return;}
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
      rows.slice(0,20).map((x,i)=>`<tr class="${i<3?'top':''}${lastSubmit&&lastSubmit.day===day&&lastSubmit.mode===bm&&x.name===lastSubmit.name?' me':''}"><td>${i+1}</td><td class="nm">${esc(x.name)}</td><td>${Number(x.score).toLocaleString('en-GB')}</td><td>${x.result==='complete'?'Full shift':'Lost at '+fmtT(spanOf(day).start+Number(x.survived))}</td><td>${esc(x.grade)}</td></tr>`).join('')}</tbody></table>`;
  }catch(e){if($('boardList'))el.innerHTML="<p class=\"empty\">Couldn't load the scoreboard. Check your connection and try again.</p>";}
}

/* ---------- Panels ---------- */
let collapsed={};try{collapsed=JSON.parse(ls('col')||'null')||{pLog:true};}catch(e){collapsed={pLog:true};}
function applyCollapsed(){Object.keys(collapsed).forEach(id=>{const p=$(id);if(p)p.classList.toggle('collapsed',!!collapsed[id]);});}
function applyZoom(){const z=PHONE&&zoomed;$('mimic').classList.toggle('zoom',z);txt('zoomBtn',z?'Fit':'Zoom');setAttr($('zoomBtn'),'aria-pressed',String(z));
  if(z){const sc=$('mscroll');sc.scrollLeft=Math.max(0,(sc.scrollWidth-sc.clientWidth)*.3);}}

/* ---------- Events ---------- */
function begin(){ls('played','1');$('overlay').hidden=true;hideHO();S.running=true;S.paused=false;acc=0;audio();if(MUS.on&&!MUS.timer)setMusic(true);track('shift_start',{scenario:S.key,mode:S.mode});render(true);}
document.addEventListener('click',e=>{
  if(e.target.closest('#kIntro')){endIntro();return;}
  const adj=e.target.closest('[data-adj]');if(adj){nudge(adj.dataset.adj,+adj.dataset.d);return;}
  const op=e.target.closest('[data-op]');if(op){if(op.disabled)return;const[t,i,a]=op.dataset.op.split(':');if(op.closest('#qp')&&S){S.qp=false;}issueOp(t+':'+i,a);return;}
  const st=e.target.closest('[data-f]');if(st){adjust(st.dataset.f,st.dataset.id,+st.dataset.d);return;}
  const pl=e.target.closest('[data-poll]');if(pl&&S){if(!pl.disabled)pollRtu(pl.dataset.poll);return;}
  const sl=e.target.closest('[data-sel]');if(sl&&S){select(sl.dataset.sel,!!sl.closest('#mimic'));return;}
  if(S&&S.sel&&e.target.closest&&e.target.closest('#mimic')){select('none');return;}
  const hg=e.target.closest('[data-go]');if(hg){heroGo(hg.dataset.go);return;}
  const tu=e.target.closest('[data-tut]');if(tu){if(tu.dataset.tut==='play')ls('played','1');tutClick(tu.dataset.tut);return;}
  const cw=e.target.closest('[data-crew]');if(cw&&S){if(cw.closest('#qp'))S.qp=false;dispatch(cw.dataset.crew,null);return;}
  const nx=e.target.closest('[data-next]');if(nx){chosen=nx.dataset.next;ls('day',chosen);newGame(chosen);if(S.mode==='career'&&HANDOVER[S.key]){handoverSheet();return;}begin();return;}
  const rnd=e.target.closest('[data-random]');if(rnd){const ks=Object.keys(SCENARIOS).filter(k=>!SCENARIOS[k].hidden&&k!==chosen),k=ks[Math.floor(Math.random()*ks.length)]||chosen,b=document.querySelector(`[data-scn="${k}"]`);if(b){b.click();b.scrollIntoView({block:'nearest',behavior:'smooth'});}return;}
  const sc=e.target.closest('[data-scn]');if(sc){if(sc.disabled)return;chosen=sc.dataset.scn;ls('day',chosen);document.querySelectorAll('[data-scn]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.scn===chosen));newGame(chosen);txt('startBtn','Start shift at '+fmtT(START));txt('runTxt',runText());return;}
  const md=e.target.closest('[data-mode]');if(md){mode=md.dataset.mode;ls('mode',mode);const sy=$('sheet').scrollTop;if(mode==='career'&&!unlockedK(career(),chosen))chosen=CAREER[0];newGame(chosen);startSheet();$('sheet').scrollTop=sy;return;}
  const sp=e.target.closest('[data-speed]');if(sp){speed=+sp.dataset.speed;document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',b===sp));txt('dSpeed',speed+'×');return;}
  const tg=e.target.closest('[data-tog]');if(tg){const id=tg.dataset.tog;collapsed[id]=!collapsed[id];ls('col',JSON.stringify(collapsed));applyCollapsed();return;}
  const bb=e.target.closest('[data-board]');if(bb){boardDay=bb.dataset.board;document.querySelectorAll('[data-board]').forEach(x=>x.setAttribute('aria-pressed',x===bb));loadBoard();return;}
  const bmo=e.target.closest('[data-bmode]');if(bmo){boardMode=bmo.dataset.bmode;document.querySelectorAll('[data-bmode]').forEach(x=>x.setAttribute('aria-pressed',x===bmo));loadBoard();return;}
  const btn=e.target.closest('button');const id=btn?btn.id:'';
  if(id==='ackBtn'){ackAll();return;}
  if(id==='syncBtn'){syncLink();return;}if(id==='syncNow'){syncNow();return;}
  if(id==='syncOff'){syncSet(null);syncNote='This device has stopped syncing. Your career stays saved here and online.';refreshStart(true);return;}
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
  if(id==='startBtn'){autoPause=$('ovPause').checked;$('autoPause').checked=autoPause;tipsOn=$('ovTips').checked;ls('tips',tipsOn?'on':'off');if(S.key!==chosen||S.t!==START||S.mode!==mode)newGame(chosen);if(S.mode==='career'&&HANDOVER[S.key]){handoverSheet();return;}begin();return;}
  if(id==='hoGo'){begin();return;}
  if(id==='hoBack'){hideHO();startSheet();return;}
  if(id==='replayBtn'){newGame(S.key);begin();return;}
  if(id==='againBtn'||id==='newBtn'){if(S.running)S.paused=true;hideTip();newGame(chosen);startSheet();return;}
  if(id==='playBtn'){if(S.ended)return;if(!S.running)begin();else{S.paused=!S.paused;if(!S.paused){hideBanner();if(tipActive)hideTip();}acc=0;render(true);}return;}
  if(id==='resumeBtn'){S.paused=false;acc=0;hideBanner();render(true);return;}
  if(id==='dismissBtn'){hideBanner();return;}
});
$('autoPause').addEventListener('change',e=>autoPause=e.target.checked);
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target&&e.target.id==='pName'){e.preventDefault();submitScore();return;}
  if(e.key==='Enter'&&e.target&&(e.target.id==='syName'||e.target.id==='syPin')){e.preventDefault();syncLink();return;}
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
if(!CALLS_ON){const l=$('pCalls');if(l)l.remove();}if(!VF_ON){const l=$('lgVF');if(l)l.remove();}if(!CREW_ON){const l=$('lgMan');if(l)l.remove();}
txt('clock',fmtT(START));txt('dClock',fmtT(START));
setSound(SND.on);applyCollapsed();{const b=$('musicBtn');if(b){b.setAttribute('aria-pressed',String(MUS.on));b.classList.toggle('on',MUS.on);}}
txt('kTitle',GAME==='cr'?'Firm Capacity · Control room':'Firm Capacity · Generation');
if(GAME==='cr'&&/(^|[?&#])demo\b/.test(location.search+location.hash))setTimeout(()=>tutStart(true,true),300);else splash();
newGame(chosen);startSheet();initConsent();requestAnimationFrame(frame);
if(syncGet())syncQuiet().then(r=>{if(r)refreshStart(false);});
window.__fc={get S(){return S;},run(n){for(let i=0;i<n&&S&&!S.ended;i++)step();render(true);},op(k,a){issueOp(k,a);},comps:(m,f)=>comps(m,f),tutGo:i=>tutGo(i),tutAct:()=>tutAct(),select};
})();
