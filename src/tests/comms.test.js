// Comms down: a substation control can't see. Its trips aren't reported, polling fails, its breakers need a crew,
// a crew on site reports by radio, and everything comes through when comms return.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
async function start(){const d=new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
  await wait(30);const doc=d.window.document;doc.querySelector('[data-mode="free"]').click();doc.querySelector('[data-scn="comms"]').click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
  const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();return{G:d.window.__fc,doc};}
const until=(G,f,n=300)=>{for(let i=0;i<n&&!f()&&!G.S.ended;i++)G.run(1);};
(async()=>{
 const {G,doc}=await start(),S=G.S;S.sched.length=0;const C=S.commsPlan.find(c=>c.p==='ml');
 ok(S.commsPlan.length===2&&C,'two comms losses planned: '+S.commsPlan.map(c=>c.p+' '+c.from+'–'+c.to).join(', '));
 until(G,()=>S.comms.ml);ok(!!S.comms.ml&&!doc.getElementById('cmx_ml').hasAttribute('hidden'),'comms lost: NO COMMS shown over Shocking Place');
 ok(Object.values(S.alarms).some(a=>/Comms to Shocking Place/.test(a.name)),'comms loss alarms');
 // a trip there: not reported, diagram still shows the breaker closed
 S.sched.push({k:'lv:ml1',m:S.t,dur:90,sec:1,tr:false,cause:'Cable joint failure',done:false});G.run(2);
 ok(!S.lf.ml[1]&&S.tele.ml1&&doc.getElementById('lfb_ml1').getAttribute('class').indexOf('open')<0,'trip not reported: breaker still shows closed');
 ok(!Object.values(S.alarms).some(a=>/Station/.test(a.name)),'no trip alarm');
 // polling fails
 // remote operation needs a crew
 G.op('lf:ml0','open');G.run(1);ok(S.crews.some(c=>c.job&&c.job.k==='lf:ml0'),'operating a breaker there sends a crew');
 // once the crew is on site, it reports the trip
 until(G,()=>!S.tele.ml1,120);ok(!S.tele.ml1&&S.log.some(l=>/crew at Shocking Place reports by radio/i.test(l.text)),'crew on site reports the hidden trip');
 // comms come back
 until(G,()=>!S.comms.ml,400);ok(!S.comms.ml&&doc.getElementById('cmx_ml').hasAttribute('hidden'),'comms restored, overlay gone');
 G.op('lf:ml0','close');G.run(1);ok(!S.crews.some(c=>c.job&&c.job.k==='lf:ml0'&&c.job.act==='close')&&S.op&&S.op.k==='lf:ml0','with comms back, breakers are remote again');
 {const {G,doc}=await start(),S=G.S;S.sched.length=0;until(G,()=>S.comms.rv,700);
  S.sched.push({k:'lv:rv2',m:S.t,dur:90,sec:0,tr:false,cause:'Cable joint failure',done:false});G.run(2);ok(!!S.tele.rv2,'trip at Ohm No hidden while comms are down');
  G.run(0);
  until(G,()=>!S.comms.rv,400);ok(!S.tele.rv2&&S.log.some(l=>/Comms to Ohm No are back, and the RTU has sent everything it missed/.test(l.text)),'trip reported when comms return: '+JSON.stringify(S.comms)+' t'+S.t+' ended '+S.ended+' '+JSON.stringify(S.lost)+' paused '+S.paused);}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
