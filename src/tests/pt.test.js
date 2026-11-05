const {JSDOM}=require('jsdom');const html=require('fs').readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));const r=Math.round;
const mk=()=>new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
async function start(scn){const d=mk(),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}return{doc,G,S:G.S};}
const until=(G,f,max=60)=>{for(let i=0;i<max&&!f();i++)G.run(1);};
(async()=>{
 {const {doc,G,S}=await start('snow');S.sched.length=0;G.run(3);
  console.log('drawn',!!doc.getElementById('ptg_hw'),!doc.getElementById('ptb_kc'),'| pt closed',S.pt.hw.closed);
  const pn0=S.pn.hw;
  // transformer fault: breaker trips automatically, feeders lose supply, 33 kV gen unaffected
  S.sched.push({k:'pt:hw',m:S.t,dur:60,cause:'Buchholz relay alarm and trip',done:false});G.run(2);
  console.log('after fault: breaker',S.pt.hw.closed,'| feeders on',[0,1,2].filter(i=>G.S.lf.hw[i]&&S.pt.hw.closed).length,'| customers off',JSON.stringify(S.cust.off).includes('hw'),'| off reasons',(G.run(5),[...new Set(S.loss.map(e=>e.r))].join(',')),'| pn hw',Math.round(pn0),'->',Math.round(S.pn.hw),'| class',doc.getElementById('ptb_hw').getAttribute('class'),'| label',doc.getElementById('ptt_hw').textContent);
  // close onto fault -> incident
  G.op('pt:hw','close');G.run(2);console.log('close onto fault: incidents',S.incidents,'closed',S.pt.hw.closed);
  // backfeed Hertz House Park (hw2) through the 11 kV link while the transformer is out
  G.op('lf:hw2','open');G.run(2);G.op('lk:hm','close');for(let i=0;i<60&&!S.lk.hm;i++)G.run(1);G.run(2);
  console.log('hw2 back on through the link: link load',Math.round(S.lkLoad.hm||0),'MW, incidents',S.incidents);
  // wait for repair, close, check back
  for(let i=0;i<200&&!(S.pt.hw.fault&&S.pt.hw.fault.ready);i++)G.run(1);console.log('repaired',!!S.pt.hw.fault.ready);
  G.op('pt:hw','close');G.run(2);console.log('closed after repair',S.pt.hw.closed,'fault cleared',S.pt.hw.fault===null,'incidents',S.incidents);
  // manual open sheds the 11 kV load
  const before=S.pn.hw;G.op('pt:hw','open');G.run(2);console.log('manual open: pn',Math.round(before),'->',Math.round(S.pn.hw),'closed',S.pt.hw.closed);
  // panel opens
  doc.querySelector('#mimic [data-sel="pt:ml"]').dispatchEvent(new doc.defaultView.MouseEvent('click',{bubbles:true}));await wait(20);
  console.log('panel:',(doc.body.textContent.match(/Shocking Place transformer[^.]*?automatic 33 kV breaker/)||['missing'])[0]);
 }
 // faults generated in normal shifts but not the easy one, and both games run
 {let n=0,q=0;for(let r=0;r<8;r++){const a=await start('storm');n+=a.S.sched.filter(f=>f.k.startsWith('pt:')).length;const b=await start('quiet');q+=b.S.sched.filter(f=>f.k.startsWith('pt:')).length;}console.log('pt faults over 8 storm shifts',n,'| quiet',q);}
 {const {G,S}=await start('mesh');G.run(400);console.log('mesh ok, kc pt',S.pt.kc.closed!==undefined);}
 console.log('errors',errs.slice(0,6));process.exit(0);})();
