// A fault in the second half of an 11 kV feeder: a mobile generator connects to the LV there and restores those
// customers before the repair is done, without tripping on the fault.
const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)fails++;};
function mk(){return new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});}
async function start(scn){const d=mk(),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}return{w,doc,G,S:G.S};}
(async()=>{
 {const {G,S}=await start('quiet');S.sched.length=0;G.run(3);const t0=S.t;
  S.sched.push({k:'lv:hw0',m:S.t,dur:40,sec:1,tr:false,cause:'Cable joint failure',done:false});G.run(2);
  const f=S.lff.hw[0];ok(f&&f.found&&f.sec===1&&f.until-t0>=105,`second-half repair takes at least 105 min (${f&&f.until-t0})`);
  G.op('mid:hw0','open');let t=0;while(S.mid.hw[0]&&t++<40)G.run(1);G.op('lf:hw0','close');G.run(2);
  G.op('mg:hw0','close');t=0;const u=()=>S.mgu.find(x=>x.site==='hw0');while(!(u()&&u().conn)&&t++<120)G.run(1);
  ok(u()&&u().conn&&u().lv,`generator connected to the LV after ${t} min`);G.run(2);
  ok(S.lff.hw[0]&&S.lff.hw[0].sec===1,'fault still there while the generator runs');
  ok(u().conn&&S.trial===0,'generator did not trip on the 11 kV fault');
  ok(S.t<S.lff.hw[0].until,`customers back before the repair (${S.lff.hw[0].until-S.t} min to spare)`);
  // repair done: closing the mid-point switch with the generator still on is an incident; disconnecting first is fine
  while(S.lff.hw[0]&&!S.ended)G.run(1);ok(u().conn,'generator keeps supplying after the repair until disconnected');
  G.op('mg:hw0','open');t=0;while(u().conn&&t++<40)G.run(1);ok(!u().conn,'generator disconnected');
  G.op('mid:hw0','close');t=0;while(!S.mid.hw[0]&&t++<40)G.run(1);G.run(1);ok(S.mid.hw[0]&&S.incidents===0,'feeder back together with no incident');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
