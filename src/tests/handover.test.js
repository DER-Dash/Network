// Handover notes before each career shift (both games).
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const cr=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
const fc=fs.readFileSync(path.join(__dirname,'..','..','build','generation.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)fails++;};
function mk(src,store){return new JSDOM(src,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);
  if(store)Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,v));}});}
async function open(src,md,scn,store){const d=mk(src,store),w=d.window,doc=w.document;await wait(30);doc.querySelector(`[data-mode="${md}"]`).click();const b=doc.querySelector(`[data-scn="${scn}"]`);if(b&&!b.disabled)b.click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();return{w,doc,G:w.__fc,S:w.__fc.S};}
const hoShown=doc=>{const h=doc.getElementById('hoOverlay');return !!h&&!h.hidden;};
(async()=>{
 const all={stars:{quiet:3,grid:3,storm:3,heat:3,jan:3,ev:3,snow:3,gsp:3,mesh:3,endure:3},ach:{},best:{}};
 for(const k of ['quiet','grid','storm','heat','jan','ev','snow','gsp','mesh','endure']){
  const {doc,S}=await open(cr,'career',k,{'fc4-career':JSON.stringify(all)});
  ok(S.key===k&&hoShown(doc)&&!S.running&&doc.getElementById('hoSheet').textContent.length>150,`control room ${k}: handover shown before the shift starts`);}
 {const {doc,S,G}=await open(cr,'career','quiet');
  ok(/Shift 1/.test(doc.getElementById('hoSheet').textContent)&&/Pat, night shift, 08:00/.test(doc.getElementById('hoSheet').textContent),'shows shift number, who from and start time');
  doc.getElementById('hoBack').click();ok(!hoShown(doc)&&!doc.getElementById('overlay').hidden&&doc.querySelector('[data-scn]'),'Back returns to the shift list');
  doc.getElementById('startBtn').click();doc.getElementById('hoGo').click();ok(!hoShown(doc)&&S.running&&doc.getElementById('overlay').hidden,'taking the handover starts the shift');
  ok(S.log.some(e=>/^Handover from Pat/.test(e.text)),'handover note is in the event log');}
 {const {doc,S}=await open(cr,'free','quiet');ok(!hoShown(doc)&&S.running&&!S.log.some(e=>/^Handover/.test(e.text)),'free play starts straight away, no handover');}
 {const {doc,S}=await open(cr,'daily','quiet');ok(!hoShown(doc)&&S.running,'daily challenge starts straight away');}
 for(const k of ['may','storm','jan']){const {doc,S}=await open(fc,'career',k,{'fcg-career':JSON.stringify({stars:{may:3,storm:3,jan:3},ach:{},best:{}})});ok(S.key===k&&hoShown(doc),`generation ${k}: handover shown`);}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
