const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const d=new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});const w=d.window,doc=w.document;await wait(30);const G=w.__fc;
 for(const scn of ['mesh','jan']){
 doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${scn}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
 const S=G.S;S.sched.length=0;G.run(2);const pn0=S.pn.hw,e0=S.ens;
 const click=sel=>doc.querySelector(sel).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 click('#mimic [data-sel="lf:hw0"]');const qp=doc.getElementById('qp');console.log(scn,'popup',qp.hidden?'HIDDEN':qp.textContent.replace(/\s+/g,' ').trim());
 qp.querySelector('[data-op]').click();console.log('popup closed after op',qp.hidden);
 G.run(3);console.log('lf hw',S.lf.hw,'pn',Math.round(pn0),'->',Math.round(S.pn.hw),'ens/min',Math.round((S.ens-e0)/3),'label',doc.getElementById('as_load_hw').textContent);
 G.select('as:load_hw');console.log('panel',[...doc.querySelectorAll('#inspBody .op-btn')].map(b=>b.textContent).join(' / '));
 G.select('none');console.log('summary has',[...doc.querySelectorAll('#inspBody .i-list .nm')].map(x=>x.textContent).filter(x=>x.includes('Town')));
 G.op('lf:hw0','close');G.run(2);console.log('reclosed',S.lf.hw[0],Math.round(S.pn.hw));}
 console.log('errors',errs);process.exit(0);})();
