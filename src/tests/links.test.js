const {JSDOM}=require('jsdom');const html=require('fs').readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));const r=Math.round;
const mk=()=>new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
async function start(scn){const d=mk(),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}return{doc,G,S:G.S};}
const until=(G,f,max=60)=>{for(let i=0;i<max&&!f();i++)G.run(1);};
(async()=>{
 {const {doc,G,S}=await start('snow');S.sched.length=0;S.events.length=0;G.run(5);
  console.log('links drawn',['hm','mr','rj'].map(k=>!!doc.getElementById('lkg_'+k)).join(','),'| VF backfeeds',doc.querySelectorAll('[id^="nopb_"]').length,'| legend',!doc.getElementById('lgLK').hidden);
  const pn0={...S.pn};
  // break-before-make transfer of Hertz House Park (hw2) onto Shocking Place via link hm
  G.op('lf:hw2','open');G.run(2);G.op('lk:hm','close');until(G,()=>S.lk.hm);G.run(2);
  console.log('transfer: hw',r(pn0.hw),'->',r(S.pn.hw),'ml',r(pn0.ml),'->',r(S.pn.ml),'link load',r(S.lkLoad.hm),'text',doc.getElementById('lkt_hm').textContent,'CI',S.cust.ci);
  // close hw2 breaker while linked (same supply) -> parallel allowed, edge in flows
  G.op('lf:hw2','close');G.run(2);console.log('parallel ok, incidents',S.incidents,'flow',S.flows['lk:hm']!=null?r(S.flows['lk:hm']):'none','text',doc.getElementById('lkt_hm').textContent);
  G.op('lk:hm','open');until(G,()=>!S.lk.hm);G.run(1);console.log('link reopened, pn hw',r(S.pn.hw));
  // different supply: js onto Watts This, then try paralleling rv2-js0 link
  G.op('bc:js','open');G.run(2);G.op('tie:js','close');until(G,()=>S.tie.js.closed);G.run(1);console.log('js sup',S.sup.js);
  G.op('lk:rj','close');until(G,()=>S.lk.rj||S.incidents>0,60);G.run(1);console.log('closing link between BC and Watts This -> incidents',S.incidents,'link',S.lk.rj);
  // pop-up and panel
  doc.querySelector('#mimic [data-sel="lk:mr"]').dispatchEvent(new doc.defaultView.MouseEvent('click',{bubbles:true}));
 }
 {const {doc,G,S}=await start('snow');S.sched.length=0;G.run(600-S.t+5);console.log('rv feeder out at',doc.getElementById('clock').textContent,'rv sup',S.sup.rv);
  // backfeed Ohm No feeders from neighbours: rv0 via ml2 link, rv2 via js0 link
  G.op('lf:rv0','open');G.run(2);G.op('lk:mr','close');G.op('lf:rv2','open');G.run(2);G.op('lk:rj','close');until(G,()=>S.lk.mr&&S.lk.rj,80);G.run(2);
  console.log('Ohm No feeders fed from:',JSON.stringify(G.S.cust.off),'lk loads',r(S.lkLoad.mr),r(S.lkLoad.rj),'pn ml',r(S.pn.ml),'js',r(S.pn.js));}
 // other scenarios unaffected
 for(const k of ['grid','jan']){const {G,S}=await start(k);G.run(200);console.log(k,'ok, links',Object.values(S.lk).filter(Boolean).length,'VF',S.vfLoad);}
 console.log('errors',errs.slice(0,6));process.exit(0);})();
