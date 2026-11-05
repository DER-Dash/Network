// 11 kV fault finding (sectionalising), auto-reclose and mobile generators in the control room.
const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m);}else console.log('ok',m);};
function mk(){return new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});}
async function start(scn){const d=mk(),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();
  doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}const S=G.S;S.sched.length=0;S.events.length=0;G.run(2);return{w,doc,G,S};}
const until=(G,S,f,max)=>{const t0=S.t;while(!f()&&S.t<t0+(max||120))G.run(1);return S.t-t0;};
const fault=(S,k,sec,tr,dur)=>{S.rngC=()=>.99;S.sched.push({k,m:S.t,dur:dur||80,sec,tr:!!tr,cause:'Test fault',done:false});};
(async()=>{
 {const {doc,G,S}=await start('storm');
  ok(S.sched.length===0&&S.mgu.length===2,'two mobile generators, faults cleared');
  ok(doc.getElementById('midb_hw1')&&doc.getElementById('mgg_hw1'),'mid-point switch and generator marker drawn');
  // permanent fault in the first half: lock out, trial close trips and locates it
  fault(S,'lv:hw1',0);G.run(1);const F=S.lff.hw[1];
  ok(F&&!F.found&&!S.lf.hw[1],'permanent fault locks the breaker out, location unknown');
  ok(S.cust.off['hw1s0']>=1&&S.cust.off['hw1s1']>=1,'both halves off');
  G.op('mid:hw1','open');G.run(1);ok(S.crews.some(c=>c.job&&c.job.k==='mid:hw1'),'crew sent to the mid-point switch');
  until(G,S,()=>!S.mid.hw[1]);ok(!S.mid.hw[1],'mid-point switch opened by crew');
  G.op('lf:hw1','close');G.run(2);
  ok(!S.lf.hw[1]&&S.trial===1&&F.found&&F.sec===0,'trial close trips: fault located in the first half');
  ok(F.until>S.t,'repair now under way, until '+F.until);
  // generator onto the healthy far half
  G.op('mg:hw1','close');G.run(1);ok(S.mgu.some(u=>u.site==='hw1'&&u.pend),'generator reserved and on its way');
  const tg=until(G,S,()=>S.mgu.some(u=>u.conn),90);ok(tg>=45,'generator connected after '+tg+' min');
  ok(S.cust.off['hw1s1']===0&&S.cust.off['hw1s0']>0,'generator restores the far half only');
  ok(G.S.mgu.find(u=>u.conn).site==='hw1','generator on Kings Hill');
  // repair, then restore without paralleling the generator
  until(G,S,()=>!S.lff.hw[1],200);ok(!S.lff.hw[1],'fault repaired');
  G.op('lf:hw1','close');G.run(2);ok(S.lf.hw[1]&&S.cust.off['hw1s0']===0,'first half back from Hertz House');
  const inc0=S.incidents;G.op('mid:hw1','close');until(G,S,()=>S.mid.hw[1]||S.incidents>inc0);
  ok(S.incidents===inc0+1&&!S.mgu.some(u=>u.conn),'closing the mid-point onto the generator is an incident and trips it');
  G.run(2);ok(S.cust.off['hw1s1']===0,'whole feeder back on Hertz House');}
 {const {G,S}=await start('storm');
  // fault in the far half: trial close holds
  fault(S,'lv:ml2',1);G.run(1);G.op('mid:ml2','open');until(G,S,()=>!S.mid.ml[2]);G.op('lf:ml2','close');G.run(2);
  const F=S.lff.ml[2];ok(S.lf.ml[2]&&F.found&&F.sec===1&&S.trial===0,'trial close holds: fault in the second half, first half restored');
  // closing a backfeed onto the far faulted half trips it
  G.op('nop:ml2','close');until(G,S,()=>S.trial>0||S.nop.ml[2]);G.run(1);ok(!S.nop.ml[2]&&S.trial===1,'backfeed closed onto the fault trips');
  // transient fault and 33 kV auto-reclose
  const si=S.cust.si;fault(S,'lv:js2',0,true);G.run(1);ok(S.lf.js[2]&&!S.lff.js[2]&&S.cust.si>si&&S.recloses===1,'transient 11 kV fault auto-recloses, short interruption only');
  const si2=S.cust.si;S.sched.push({k:'ar:rv',m:S.t,dur:0,cause:'Lightning strike',done:false});G.run(1);ok(S.cust.si>si2&&S.recloses===2&&S.fd.rv.brk,'33 kV feeder auto-recloses');
  // cable fault: patrol finds it if nobody sectionalises
  fault(S,'lv:rv0',1);G.run(1);ok(S.lff.rv[0]&&!S.lff.rv[0].found,'cable fault locks out');const tp=until(G,S,()=>S.lff.rv[0].found,90);ok(tp>=58&&tp<=61,'line patrol finds it after '+tp+' min');
  // generator overload on a whole dead feeder
  G.op('lf:js1','open');G.run(2);G.op('mg:js1','close');until(G,S,()=>S.mgu.some(u=>u.site==='js1'&&!u.pend),90);G.run(2);
  ok(!S.mgu.some(u=>u.site==='js1'&&u.conn)&&S.trips>0,'generator trips when asked for the whole feeder');}
 {const {doc,G,S}=await start('grid');G.select('lf:hw1',true);G.run(1);ok(!doc.getElementById('qp').hidden,'pop-up still works on an 11 kV breaker');
  G.select('mid:hw1',true);G.run(1);ok(/mid-point switch/i.test(doc.getElementById('qp').textContent),'mid-point pop-up');
  S.t=1199;G.run(2);ok(S.ended&&!/NaN/.test(doc.body.textContent),'shift ends cleanly, no NaN');}
 ok(!errs.length,'no script errors '+errs.slice(0,3).join(' | '));
 console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);})();
