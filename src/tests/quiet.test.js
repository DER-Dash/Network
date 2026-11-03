// The Quiet shift: easiest control room day. Remote switching only, faults found straight away, quick repairs.
const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)fails++;};
function mk(store){return new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);
  if(store)Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,v));}});}
async function start(scn,md,store){const d=mk(store),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector(`[data-mode="${md||'free'}"]`).click();const b=doc.querySelector(`[data-scn="${scn}"]`);if(b&&!b.disabled)b.click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();return{w,doc,G,S:G.S};}
(async()=>{
 {const {doc,S}=await start('quiet');const keys=[...doc.querySelectorAll('[data-scn]')].map(b=>b.dataset.scn);
  ok(keys[0]==='quiet'&&keys[keys.length-1]==='endure','days listed easiest first: '+keys.join(','));
  ok(S.key==='quiet'&&S.sc.remote&&S.sc.noGen,'quiet shift is remote only, no generation');
  ok(S.sched.every(f=>!/^(fd|ic):/.test(f.k)),'no 33 kV feeder or interconnector faults');
  ok(!S.sched.some(f=>f.k.startsWith('tx:')),'no transformer faults');}
 // manual switches can't be operated
 {const {doc,G,S}=await start('quiet');S.sched.length=0;G.run(3);G.op('tie:hw','close');G.run(3);
  ok(!S.tie.hw.closed&&!S.crews.some(c=>c.job),'no crew sent to a tie');ok(/no field crews/i.test(doc.getElementById('bannerMsg').textContent),'banner explains remote only');
  G.op('bs:12','open');G.run(2);ok(!S.bs['12'].closed,'remote bus section still operates');}
 // an 11 kV fault is found straight away in the far half; the mid-point switch is remote, so the near half comes back at once
 {const {doc,G,S}=await start('quiet');S.sched.length=0;G.run(3);
  ok(!doc.getElementById('midb_hw0').classList.contains('man'),'mid-point switch drawn as remote');
  S.sched.push({k:'lv:hw0',m:S.t,dur:25,sec:1,tr:false,cause:'Cable joint failure',done:false});G.run(2);
  const f=S.lff.hw[0];ok(f&&f.found&&f.sec===1,'fault located in the far half');ok(!S.lf.hw[0],'breaker tripped');
  G.op('mid:hw0','open');G.run(2);ok(!S.mid.hw[0]&&!S.crews.some(c=>c.job),'mid-point switch opened remotely, no crew');
  G.op('lf:hw0','close');G.run(2);ok(S.lf.hw[0]&&S.incidents===0&&S.trial===0,'near half restored without tripping');
  G.run(30);ok(!S.lff.hw[0],'repaired within 30 min');G.op('mid:hw0','close');G.run(2);ok(S.mid.hw[0]&&S.lf.hw[0]&&S.incidents===0,'mid-point closed, everyone back');}
 // a player who isolates every fault gets an A; one who only waits for repairs does not
 for(let n=0;n<6;n++){const smart=n<4,{G,S}=await start('quiet');let t=0;while(!S.ended&&t++<900){G.run(1);
    for(const p of Object.keys(S.lf))S.lf[p].forEach((v,i)=>{const F=S.lff[p][i],id=p+i;
      if(smart&&F&&F.found&&F.sec===1&&S.mid[p][i]){G.op('mid:'+id,'open');G.run(1);}
      if(!S.lf[p][i]&&(smart?!(F&&F.sec===0)&&!(F&&S.mid[p][i]):!F)){G.op('lf:'+id,'close');G.run(1);}
      if(!F&&!S.mid[p][i]){G.op('mid:'+id,'close');G.run(1);}});}
  const g=S.final&&S.final.grade;ok(S.ended&&!S.lost&&S.incidents===0&&(smart?g==='A':g!=='A'||S.faults===0),`${smart?'isolating':'waiting'} bot ${n+1}: grade ${g}, faults ${S.faults}, isolation min ${S.isoMin}`);}
 // existing careers keep their unlocks
 {const {doc}=await start('quiet','career',{'fc4-career':JSON.stringify({stars:{grid:2,storm:1},ach:{},best:{}})});
  const st=k=>doc.querySelector(`[data-scn="${k}"]`);ok(!st('grid').disabled&&!st('storm').disabled&&!st('heat').disabled,'existing career keeps grid, storm and heat');ok(st('jan').disabled,'jan still locked');}
 ok(!errs.length,'no script errors '+errs.slice(0,3).join(' | '));
 if(fails)console.log(fails+' failed');process.exit(fails?1:0);})();
