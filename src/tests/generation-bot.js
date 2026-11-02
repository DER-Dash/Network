const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','generation.html'),'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));const r=Math.round;let errs=[];
function mk(){return new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.onerror=(m)=>errs.push(m);}});}
(async()=>{for(const k of ['may','jan','storm']){const res=[];
 for(let n=0;n<6;n++){const d=mk(),w=d.window,doc=w.document;await wait(20);const G=w.__fc;
  doc.querySelector('[data-mode="free"]').click();doc.querySelector(`[data-scn="${k}"]`).click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
  const S=G.S;Object.assign(S.armed,{bdis:30,chp:25,dsr:15,solar:60,wind:40,bchg:30});
  for(let t=0;t<1200&&!S.ended;t++){const live=S.tx.filter(x=>!x.out),L=Math.max(0,...live.map(x=>x.L)),imp=S.net>0;
   // keep under 95% with manual action
   if(L>.95){if(imp){S.manual.chp=25;S.manual.dsr=15;S.manual.bdis=30;}else{S.manual.solar=Math.min(160,S.manual.solar+10);S.manual.wind=Math.min(60,S.manual.wind+5);}}
   else if(L<.8){S.manual.chp=0;S.manual.dsr=0;S.manual.bdis=0;S.manual.solar=Math.max(0,S.manual.solar-5);S.manual.wind=Math.max(0,S.manual.wind-5);}
   G.run(1);}
  res.push((S.lost?'L':'ok')+'/'+(S.final?S.final.total:0));w.close();}
 console.log(k,res.join(' '));}console.log('errs',errs.slice(0,3));process.exit(0);})();
