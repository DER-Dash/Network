// Career: start again from shift 1 once complete, or from any unlocked shift. Stars are kept; the run moves on in order.
const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)fails++;};
const ALL=['quiet','grid','storm','heat','jan','ev','snow','xmas','gsp','mesh','endure'];
function mk(store){return new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);
  Object.entries(store||{}).forEach(([k,v])=>w.localStorage.setItem(k,v));}});}
const car=w=>JSON.parse(w.localStorage.getItem('fc4-career'));
const finish=(G,S)=>{S.sched.length=0;let t=0;while(!S.ended&&t++<2000)G.run(5);};
(async()=>{
 const full={stars:Object.fromEntries(ALL.map(k=>[k,2])),ach:{first:1},best:{}};
 {const d=mk({'fc4-career':JSON.stringify(full),'fc4-mode':'career'}),w=d.window,doc=w.document;await wait(40);
  const hb=doc.querySelector('.hero-go[data-restart]');ok(hb&&/start again/i.test(hb.textContent)&&/Shift 1/.test(hb.textContent),'complete career: main button starts again from shift 1');
  hb.click();await wait(10);const c=car(w);ok(c.run&&c.run.at==='quiet'&&c.stars.endure===2,'run set to shift 1, stars kept');
  ok(w.__fc.S&&w.__fc.S.key==='quiet'&&w.__fc.S.mode==='career','shift 1 started in career mode');
  finish(w.__fc,w.__fc.S);const c2=car(w);ok(c2.run&&c2.run.at==='grid'&&c2.stars.endure===2,'after finishing shift 1 the run moves on to shift 2: '+(c2.run&&c2.run.at));}
 // restart from any point via the career box
 {const d=mk({'fc4-career':JSON.stringify(full),'fc4-mode':'career'}),w=d.window,doc=w.document;await wait(40);
  doc.querySelector('[data-mode="career"]').click();await wait(5);const sel=doc.getElementById('restartFrom');ok(sel&&sel.options.length===ALL.length,'restart chooser lists every unlocked shift');
  sel.value='mesh';doc.getElementById('restartBtn').click();await wait(5);ok(car(w).run.at==='mesh','restarted from shift 10');
  const mb=doc.querySelector('.hero-go[data-go="career"]');ok(mb&&/Shift 10/.test(mb.textContent),'main button continues from shift 10: '+(mb&&mb.textContent));
  mb.click();await wait(5);finish(w.__fc,w.__fc.S);ok(car(w).run.at==='endure','then shift 11');
  doc.getElementById('replayBtn')&&0;w.__fc.S.mode='career';
  // play the last shift: run ends, career shows complete again
  {const nd=doc.querySelector('[data-next]');if(nd)nd.click();else{w.__fc.S.key;}}
  await wait(5);if(w.__fc.S.key!=='endure'){}const G=w.__fc;finish(G,G.S);const c=car(w);ok(G.S.key==='endure'&&(!c.run||c.run.end),'finishing the last shift ends the run');
  ok(/start your career again/i.test(doc.getElementById('sheet').textContent+doc.body.textContent),'end screen offers to start again');}
 // a partial career with no stars has no restart box
 {const d=mk({'fc4-mode':'career'}),w=d.window,doc=w.document;await wait(40);doc.querySelector('[data-mode="career"]').click();ok(!doc.getElementById('restartBox'),'no restart option before any stars');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
