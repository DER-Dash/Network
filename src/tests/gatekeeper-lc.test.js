// Losing Control: the "Your network" control room shift built from Gatekeeper's export (localStorage 'gk-export'):
// switching, faults and crews, plus the flexibility the player connected.
// Run python3 src/build.py first.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const gen=fs.readFileSync(path.join(__dirname,'../../build/generation.html'),'utf8'),cr=fs.readFileSync(path.join(__dirname,'../../build/control-room.html'),'utf8');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.error('FAIL',m);}else console.log('ok',m);};
let n=0;
function boot(html,X,hash){const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:`https://lc${++n}.test/control-room/${hash||''}`,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};if(X)w.localStorage.setItem('gk-export',JSON.stringify(X));w.localStorage.setItem('fcg-played','1');w.localStorage.setItem('fc4-played','1');
    }});return dom.window;}
const X={v:1,at:Date.now(),year:6,grade:'B',mode:'free',kD:1.2,E:.2,gspF:150,sgt:false,dsr:{mw:12,names:['Byte Me Data Centre','Charge Ahead Hub'],n:2},batt:{mw:18,names:['Volt Vault'],n:1},solar:{mw:20,names:['Photon Farm'],n:1},flexBuy:0};
(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));
  {const w=boot(cr,null),d=w.document;ok(!d.querySelector('[data-go="gk"]'),'no Gatekeeper button without an export');
   await wait(30);const before=JSON.stringify(w.__fc.S.sc.demand);ok(!!before,'normal shifts unchanged');}
  {const w=boot(cr,X),d=w.document;await wait(30);const F=w.__fc;
   const b=d.querySelector('[data-go="gk"]');ok(b&&/year 6/.test(b.textContent),'control room start screen offers your Gatekeeper network');
   b.click();const S=F.S;
   ok(S.key==='gk'&&S.sc.title==='Your network'&&S.running,'it starts the Your network shift');
   ok(Math.abs(Math.max(...S.sc.demand.map(x=>x[1]))-150*1.2)<1,'winter peak scaled by how loaded the grid supply point is ('+Math.max(...S.sc.demand.map(x=>x[1]))+' MW)');
   ok(/Byte Me Data Centre and 1 more/.test(S.sc.blurb)&&/18 MW of battery/.test(S.sc.blurb),'the blurb lists the flexibility you connected');
   const was=S.lf.hw[0];F.op('lf:hw0',was?'open':'close');F.run(3);ok(S.lf.hw[0]===!was,'switching works on your network');F.op('lf:hw0',was?'close':'open');
   ok(!S.sc.noGen&&S.lff,'it is a control room shift: generation and flexibility as well as 11 kV faults and crews');
   F.run(600);ok(S.act.bdis<=18.001&&S.act.dsr<=12.001,'battery and demand response limited to what you connected');
   F.run(2000);ok(S.ended,'the shift runs to the end');
   ok(d.querySelector('.gk-end')&&!d.getElementById('pName'),'end screen: back to Gatekeeper, no scoreboard entry');}
  {const X0={...X,dsr:{mw:0,names:[],n:0},batt:{mw:0,names:[],n:0},solar:{mw:0,names:[],n:0},kD:.9};
   const w=boot(cr,X0,'#gk');await wait(30);const S=w.__fc.S;ok(S.key==='gk','#gk opens straight on your network');
   w.document.getElementById('startBtn').click();w.__fc.run(900);ok(S.act.bdis===0&&S.act.bchg===0&&S.act.dsr===0,'no flexible customers: no battery or demand response to call');
   ok(/none, so it/.test(S.sc.blurb),'blurb says there is no flexibility');}
  {const w=boot(cr,{...X,E:.8});await wait(30);w.document.querySelector('[data-go="gk"]').click();const S=w.__fc.S;
   ok(S.sc.focus==='Your network on a sunny day'&&S.sc.solar.peak===172&&S.sc.nbShape==='solar','export-heavy networks get a sunny day');
   const t0=S.t;w.__fc.run(60);ok(S.t===t0+60&&S.running,'the sunny day runs as a control room shift');}
  {const w=boot(gen,X);await wait(30);const a=w.document.querySelector('a.gk-go');ok(a&&/\/control-room\/#gk$/.test(a.getAttribute('href')),'generation start screen links across to the control room shift');}
  console.log(fails?`${fails} FAILED`:'all passed');process.exit(fails?1:0);})();
