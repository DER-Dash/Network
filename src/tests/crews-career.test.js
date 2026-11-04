const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));const r=Math.round;
function mk(){return new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});}
async function start(scn,md){const d=mk(),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector(`[data-mode="${md||'free'}"]`).click();const b=doc.querySelector(`[data-scn="${scn}"]`);if(b&&!b.disabled)b.click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}return{w,doc,G,S:G.S};}
(async()=>{
 {const {doc,G,S}=await start('grid');S.sched.length=0;G.run(5);
  console.log('scenarios',[...doc.querySelectorAll('[data-scn]')].length,'crews at',S.crews.map(c=>c.at).join(','));
  G.op('tie:hw','close');G.run(1);const c=S.crews.find(c=>c.job);console.log('dispatched crew',c&&c.n,'arr',c&&c.arr-S.t+1,'min, job at',c&&c.job.at-S.t+1,'| tie closed?',S.tie.hw.closed);
  const t0=S.t;while(!S.tie.hw.closed&&S.t<t0+60)G.run(1);console.log('tie closed after',S.t-t0+1,'min; crew at',c.at);
  G.op('bc:hw','open');G.run(2);console.log('remote op still instant: bc open',!S.fd.hw.brk,'parOk',S.parOk);
  G.op('tie:hw','open');G.run(1);console.log('crew on site -> job at +',S.crews.find(x=>x.job)?S.crews.find(x=>x.job).job.at-S.t:'none');G.run(3);console.log('tie open',!S.tie.hw.closed);
  // all crews busy
  G.op('tie:ml','close');G.op('tie:rv','close');G.op('tie:js','close');G.run(1);console.log('banner:',doc.getElementById('bannerMsg').textContent.slice(0,60));
  // pre-position
  G.select('nop:hw1');console.log('crew panel rows',[...doc.querySelectorAll('#inspBody .i-list li')].length);
  // CI/CML: open a feeder briefly (<3) and long
  const C=S.cust;G.op('bc:ml','close');G.run(2);
  G.op('lf:rv0','open');G.run(2);G.op('lf:rv0','close');G.run(2);console.log('short int',C.si,'ci',C.ci);
  G.op('lf:rv1','open');G.run(10);G.op('lf:rv1','close');G.run(2);console.log('after 10-min outage: ci',C.ci,'cml',C.cml,'penalty',r(S.ens));}
 {const {doc,G,S}=await start('gsp');S.sched.length=0;G.run(900-S.t+40);console.log('gsp t',S.t,'load',r(S.gspLoad),'text',doc.getElementById('gspT').textContent,'over',S.gspOver,'trips',S.gspTrips);G.run(30);console.log('gsp after 30 more, trips',S.gspTrips,'risk',S.insecureMin);}
 {const {G,S}=await start('heat');console.log('heat R',S.tx[0]&&'',G.S.sc.derate,'firm text',G.S&&'');}
 // career
 {const {doc,G,S,w}=await start('grid','career');console.log('career cards locked',[...doc.querySelectorAll('.scn.locked')].length);
  S.sched.length=0;S.lost=null;S.t=1199;G.run(2);console.log('ended',S.ended,'grade',S.final&&S.final.grade,'career res',JSON.stringify(S.careerRes&&{st:S.careerRes.st,unl:S.careerRes.newUnl,rank:S.careerRes.rank,ach:S.careerRes.newA.map(a=>a.id)}));
  console.log('next btn',!!doc.querySelector('[data-next]'));}
 console.log('errors',errs.slice(0,5));process.exit(0);})();
