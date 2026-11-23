// Losing Control: the Your network shift uses the network built in Gatekeeper: uprated transformers, Kilowatt Close,
// and remote-controlled switches where new switchgear was fitted. Run python3 src/build.py first.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const cr=fs.readFileSync(path.join(__dirname,'../../build/control-room.html'),'utf8'),gkh=fs.readFileSync(path.join(__dirname,'../../build/gatekeeper.html'),'utf8');
let fails=0,n=0;const ok=(c,m)=>{if(!c){fails++;console.error('FAIL',m);}else console.log('ok',m);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function boot(X){return new JSDOM(cr,{runScripts:'dangerously',pretendToBeVisual:true,url:`https://n${++n}.test/control-room/#gk`,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};
  w.localStorage.setItem('gk-export',JSON.stringify(X));w.localStorage.setItem('fc4-played','1');w.localStorage.setItem('fc4-tips','off');}}).window;}
const base={v:1,at:Date.now(),year:8,grade:'B',mode:'free',kD:1.1,E:.2,gspF:210,sgt:true,dsr:{mw:10,names:['Byte Me Data Centre'],n:1},batt:{mw:15,names:['Volt Vault'],n:1},solar:{mw:0,names:[],n:0},flexBuy:0};
const prims=(o)=>({hw:{F:60,F0:45,FL:30,FL0:30,tx:1,fl:0,peak:40},ml:{F:30,F0:30,FL:25,FL0:25,tx:0,fl:0,peak:22},rv:{F:40,F0:40,FL:37,FL0:22,tx:0,fl:1,peak:30},js:{F:45,F0:45,FL:45,FL0:30,tx:0,fl:1,peak:35},...o});
(async()=>{
 {const X={...base,net:{v:2,dGrow:1.3,gspF:210,gspF0:150,kc:true,prims:prims({kc:{F:35,F0:35,FL:30,FL0:30,tx:0,fl:0,peak:14}})}};
  const w=boot(X),d=w.document;await wait(40);const F=w.__fc;let S=F.S;
  ok(S.key==='gk'&&S.sc.mesh&&S.sc.shares.kc>0,'Kilowatt Close joins: the interconnected layout, with its share of demand');
  ok(S.sc.txR===84,'a fourth supergrid transformer: T1–T3 rated 84 MVA');
  ok(Math.round(S.sc.prRate.hw*100)===133,'Hertz House uprated by a third');
  ok(JSON.stringify(S.sc.remote)===JSON.stringify(['rv','js']),'new switchgear at Ohm No and Joule Street');
  ok(d.getElementById('tsw_js').getAttribute('rx')==='1.5'&&d.getElementById('tsw_hw').getAttribute('rx')==='9','remote ties are drawn square, manual ones round');
  ok(/remote controlled/.test(S.sc.blurb)&&/Kilowatt Close/.test(S.sc.blurb)&&/84 MVA/.test(S.sc.blurb),'the blurb lists what was built');
  ok(Math.abs(Math.max(...S.sc.demand.map(x=>x[1]))-150*1.3)<1,'demand grows as it did in Gatekeeper');
  d.getElementById('startBtn').click();F.run(30);S=F.S;const ft=(d.getElementById('fdv_hw')||{}).textContent||'';ok(/\/93 MW/.test(ft),'its feeder rating follows: '+ft);
  const jobs=()=>S.crews.filter(c=>c.job).length;
  F.op('tie:js','close');ok(S.op&&S.op.k==='tie:js'&&jobs()===0,'a remote tie operates from the control room, no crew');
  F.run(3);F.op('tie:hw','close');ok(jobs()===1,'a manual tie still sends a crew');
  F.run(1500);ok(S.ended,'the shift runs to the end');}
 // no reinforcement: the inherited network, all switches manual
 {const X={...base,net:{v:2,dGrow:1.2,gspF:150,gspF0:150,kc:false,prims:prims({hw:{F:45,F0:45,FL:30,FL0:30,tx:0,fl:0,peak:40},rv:{F:40,F0:40,FL:22,FL0:22,tx:0,fl:0,peak:30},js:{F:45,F0:45,FL:30,FL0:30,tx:0,fl:0,peak:35}})}};
  const w=boot(X);await wait(40);const S=w.__fc.S;
  ok(!S.sc.mesh&&S.sc.txR===60&&S.sc.remote.length===0&&/built no reinforcement/.test(S.sc.blurb),'nothing built: the inherited network, every switch manual');}
 // an export from before Nov 2026 (no net) still works the old way
 {const w=boot(base);await wait(40);const S=w.__fc.S;ok(S.key==='gk'&&!S.sc.remote&&!S.sc.txR,'older exports still run');}
 // Gatekeeper writes the network as built
 {const w=new JSDOM(gkh,{runScripts:'dangerously',url:'http://gkn.test/',beforeParse(w){w.__GK_FAST=true;}}).window;await wait(40);const G=w.__gk;G.newCareer(12);
  G.startBuild('tx','hw',0);G.startBuild('fl','js',0);G.startBuild('kc',null,0);
  for(let y=0;y<4;y++){G.S.queue.forEach(a=>a.choice='hold');G.sendOffers();G.runYear();G.startYear();}
  const X=G.exportNet(),N=X.net;
  ok(N&&N.v===2&&N.kc&&N.prims.kc&&N.prims.hw.tx===1&&N.prims.hw.F===60&&N.prims.js.fl===1&&N.prims.js.FL===45,'Gatekeeper exports what was built');
  ok(N.dGrow>1&&N.dGrow<1.4&&Object.values(N.prims).every(p=>p.peak>0),'with demand growth and each substation\'s peak');}
 console.log(fails?`${fails} FAILED`:'all passed');process.exit(fails?1:0);})();
