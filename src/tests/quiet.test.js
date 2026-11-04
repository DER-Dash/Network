// The Quiet shift: easiest control room day. Faults are found straight away and repaired quickly,
// and each one is a simple switching job with field crews.
const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)fails++;};
function mk(store){return new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);
  if(store)Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,v));}});}
async function start(scn,md,store){const d=mk(store),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector(`[data-mode="${md||'free'}"]`).click();const b=doc.querySelector(`[data-scn="${scn}"]`);if(b&&!b.disabled)b.click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}return{w,doc,G,S:G.S};}
const busy=(S,k)=>S.crews.some(c=>c.job&&c.job.k===k);
// one minute of play. smart: switch round every fault; otherwise just wait for repairs and close things back.
function play(G,S,smart){
  for(const p of Object.keys(S.fd)){const f=S.fd[p];
    if(f.fault&&!f.fault.planned){if(smart&&S.sup[p]==='off'&&!S.tie[p].closed&&!busy(S,'tie:'+p))G.op('tie:'+p,'close');}
    else if(!f.brk||!f.inc){if(S.tie[p].closed){if(!busy(S,'tie:'+p))G.op('tie:'+p,'open');}else if(!S.op)G.op(!f.brk?'bc:'+p:'in:'+p,'close');}}
  for(const p of Object.keys(S.lf))S.lf[p].forEach((v,i)=>{const F=S.lff[p][i],id=p+i;if(S.op)return;
    if(F){if(smart&&F.found&&F.sec===1){if(S.mid[p][i]){if(!busy(S,'mid:'+id))G.op('mid:'+id,'open');}else if(!v)G.op('lf:'+id,'close');}}
    else if(!S.mid[p][i]){if(!busy(S,'mid:'+id))G.op('mid:'+id,'close');}else if(!v)G.op('lf:'+id,'close');});
  G.run(1);}
(async()=>{
 {const {doc,S}=await start('quiet');const keys=[...doc.querySelectorAll('[data-scn]')].map(b=>b.dataset.scn);
  ok(keys[0]==='quiet'&&keys[keys.length-1]==='endure','days listed easiest first: '+keys.join(','));
  ok(S.key==='quiet'&&S.sc.noGen&&S.sc.easy,'quiet shift: easy faults, no generation');
  ok(!S.sched.some(f=>/^(tx|ic):/.test(f.k)),'no transformer or interconnector faults');
  ok(S.sched.filter(f=>f.k.startsWith('fd:')).every(f=>f.dur<=70),'33 kV feeder repairs within 70 min');}
 // manual switches need a crew again
 {const {G,S}=await start('quiet');S.sched.length=0;G.run(3);G.op('tie:hw','close');G.run(1);ok(busy(S,'tie:hw')&&!S.tie.hw.closed,'crew sent to close a tie');}
 // 11 kV fault: found in the far half; crew opens the mid-point switch, the breaker restores the near half
 {const {G,S}=await start('quiet');S.sched.length=0;G.run(3);
  S.sched.push({k:'lv:hw0',m:S.t,dur:40,sec:1,tr:false,cause:'Cable joint failure',done:false});G.run(2);
  const f=S.lff.hw[0];ok(f&&f.found&&f.sec===1,'fault located in the far half');ok(!S.lf.hw[0],'breaker tripped');
  G.op('mid:hw0','open');let t=0;while(S.mid.hw[0]&&t++<40)G.run(1);ok(!S.mid.hw[0],`crew opened the mid-point switch after ${t} min`);
  G.op('lf:hw0','close');G.run(2);ok(S.lf.hw[0]&&S.incidents===0&&S.trial===0,'near half restored without tripping');}
 // 33 kV feeder fault: substation off until a tie is closed
 {const {G,S}=await start('quiet');S.sched.length=0;G.run(3);
  S.sched.push({k:'fd:js',m:S.t,dur:45,cause:'Cable joint failure',done:false});G.run(2);ok(S.sup.js==='off','Joule Street off after its feeder fault');
  G.op('tie:js','close');let t=0;while(!S.tie.js.closed&&t++<40)G.run(1);G.run(1);ok(S.sup.js==='fm',`restored from Watts This after ${t} min`);}
 // a player who switches round every fault gets an A; one who only waits does not
 const smartG=[];for(let n=0;n<8;n++){const smart=n<5,{G,S}=await start('quiet');let t=0;while(!S.ended&&t++<900)play(G,S,smart);
  const g=S.final&&S.final.grade;if(smart)smartG.push(g);
  ok(S.ended&&!S.lost&&S.incidents===0&&(smart||g!=='A'||S.faults===0),`${smart?'switching':'waiting'} bot ${n+1}: grade ${g}, faults ${S.faults}, minutes off ${S.isoMin}, crew jobs ${S.crewJobs}`);}
 ok(smartG.filter(g=>g==='A').length>=4,'switching bot mostly earns A: '+smartG.join(''));
 // existing careers keep their unlocks
 {const {doc}=await start('quiet','career',{'fc4-career':JSON.stringify({stars:{grid:2,storm:1},ach:{},best:{}})});
  const st=k=>doc.querySelector(`[data-scn="${k}"]`);ok(!st('grid').disabled&&!st('storm').disabled&&!st('heat').disabled,'existing career keeps grid, storm and heat');ok(st('jan').disabled,'jan still locked');}
 ok(!errs.length,'no script errors '+errs.slice(0,3).join(' | '));
 if(fails)console.log(fails+' failed');process.exit(fails?1:0);})();
