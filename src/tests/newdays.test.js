// The morning after (inherited abnormal running) and Black start (restoration with cold load pickup).
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
async function start(scn){const d=new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
  await wait(30);const doc=d.window.document;doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
  const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();const G=d.window.__fc;G.S.sched.length=0;return G;}
const until=(G,f,n=120)=>{for(let i=0;i<n&&!f()&&!G.S.ended;i++)G.run(1);};
(async()=>{
 // ---- The morning after ----
 {const G=await start('morning'),S=G.S;
  ok(S.sup.hw==='kn'&&S.sup.js==='fm'&&S.nop.ml[2]&&S.nop.rv[1]&&S.mgu[0].conn&&!S.mid.ml[0]&&!S.bs['23'].closed&&S.incidents===0,'starts in the abnormal state the night shift left, with no incidents');
  // put it back to normal, in the right order
  const op=(k,a,f)=>{G.op(k,a);until(G,f);};
  op('bs:23','close',()=>S.bs['23'].closed);
  op('bc:hw','close',()=>S.fd.hw.brk);op('tie:hw','open',()=>!S.tie.hw.closed);// same grid supply: make before break
  op('tie:js','open',()=>!S.tie.js.closed);op('in:js','close',()=>S.fd.js.inc);op('bc:js','close',()=>S.fd.js.brk);// different supply: break before make
  op('nop:ml2','open',()=>!S.nop.ml[2]);op('lf:ml2','close',()=>S.lf.ml[2]);op('nop:rv1','open',()=>!S.nop.rv[1]);op('lf:rv1','close',()=>S.lf.rv[1]);
  op('mg:ml0','open',()=>!S.mgu[0].conn);op('mid:ml0','close',()=>S.mid.ml[0]);
  ok(['hw','ml','rv','js'].every(p=>S.sup[p]==='bc')&&S.incidents===0,'back to normal running with no incidents by '+(Math.floor(S.t/60)+':'+String(S.t%60).padStart(2,'0')));}
 {const G=await start('morning'),S=G.S;G.op('mid:ml0','close');until(G,()=>S.mid.ml[0]||S.incidents>0);ok(S.incidents===1,'closing the mid-point switch with the generator still on is an incident');}
 // ---- Black start ----
 {const G=await start('black'),S=G.S;
  ok(['hw','ml','rv','js'].every(p=>S.sup[p]==='off')&&S.tx.every(t=>t.out&&t.out.kind==='black')&&['hw','ml','rv','js'].every(p=>!S.fd[p].brk)&&!S.ended,'starts dark: transformers out, feeder breakers open, shift running');
  G.run(30);ok(!S.ended&&!S.lost,'being dark at the start is not "site lost"');
  until(G,()=>S.tx[0].out.ready);ok(S.tx[0].out.ready&&S.t>=375,'T1 comes back from National Grid');
  G.op('tx:0','close');until(G,()=>!S.tx[0].out);G.op('bc:hw','close');until(G,()=>S.sup.hw!=='off');
  ok(Object.keys(S.clp||{}).some(k=>k.startsWith('hw')&&S.clp[k]>1.15),'cold load pickup on Hertz House feeders: '+JSON.stringify(S.clp));
  const k0=S.clp.hw0;G.run(40);ok(!S.clp.hw0||S.clp.hw0<k0-.1,'cold load settles over time');}
 {const G=await start('black'),S=G.S;until(G,()=>S.tx[0].out.ready);G.op('tx:0','close');until(G,()=>!S.tx[0].out);
  ['hw','ml','rv','js'].forEach(p=>{G.op('bc:'+p,'close');until(G,()=>S.fd[p].brk);});G.run(15);
  ok(S.tx[0].out&&!S.ended,'everything at once on one transformer: cold load trips it, but the shift goes on');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
