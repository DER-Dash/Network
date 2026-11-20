// Gatekeeper: headless checks. Run python3 src/gatekeeper/build.py first.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../../build/gatekeeper.html'),'utf8');
function boot(){const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://gk'+(boot.n=(boot.n||0)+1)+'.test/',pretendToBeVisual:true,beforeParse(w){w.__GK_FAST=true;w.confirm=()=>true;}});return dom.window;}
const assert=(c,m)=>{if(!c){console.error('FAIL',m);process.exitCode=1;}};
const strat=process.argv[2]||'smart';
for(const seed of (process.env.SEEDS||"1,2,3,42,99").split(",").map(Number)){console.error("seed start",seed,Date.now()%100000);
  const w=boot(),G=w.__gk;G.newCareer(seed);const S=()=>G.S;
  assert(S().year===1&&S().queue.length>=5,'year 1 has a queue');
  const out=[];
  for(let y=1;y<=10;y++){
    // policy
    if(S().reform)S().cust.filter(c=>!c.gone&&!c.built&&!c.existing&&S().year>c.conn).forEach(c=>c.gone=true);
    for(const a of S().queue){const O=G.offers(a),L=O.list,by=t=>L.find(x=>x.type===t&&x.avail);
      let ch='hold';
      if(strat==='firm'){ch=by('firm')?'firm':'refuse';}
      else{
        const g2bad=L.some(x=>x.g2);
        if(g2bad)ch='hold';
        else if(by('firm')&&by('firm').cls==='green')ch='firm';
        else if(by('timed')&&by('timed').cls==='green')ch='timed';
        else if(by('flex')&&by('flex').est<=a.tol)ch='flex';
        else if(by('reinf'))ch='reinf';
        else if(by('flex'))ch='flex';
        else ch='hold';}
      a.choice=ch;}
    const res=G.sendOffers();
    const rep=G.runYear();
    out.push(`${y}:${rep.grade}(${Object.values(rep.sc).map(Math.round).join('/')}) bh${Math.round(rep.bh)} cut${Math.round(rep.cut)} sp${rep.spend.toFixed(1)} acc${rep.accMW.toFixed(0)}/${rep.genMW.toFixed(0)}`);
    assert(Object.values(rep.sc).every(v=>v>=0&&v<=100&&isFinite(v)),'scores in range');
    if(y<10){G.startYear();}
  }
  assert(S().phase==='end','career ends after 10 years');
  console.log('seed',seed,'\n '+out.join('\n '));
}
// UI smoke: render, open an app, choose, send, run, report
(async()=>{const w=boot(),d=w.document,G=w.__gk;await new Promise(r=>setTimeout(r,100));
 assert(d.querySelectorAll('.app').length>=5,'cards render');
 assert(!d.getElementById('ov').hidden,'help shows on first visit');
 d.getElementById('hGo').click();
 const ev=d.getElementById('evOk');if(ev)ev.click();
 d.querySelector('.app').click();assert(!d.getElementById('sheet').hidden,'sheet opens');
 assert(d.querySelectorAll('.off').length>=3,'offers listed');
 G.S.queue.forEach(a=>a.choice='hold');G.render();
 assert(!d.getElementById('goBtn').disabled,'send enabled');
 d.getElementById('goBtn').click();assert(d.querySelector('.resp'),'responses show');
 d.getElementById('rOk').click();d.getElementById('reBtn').click();assert(d.querySelectorAll('.blist li').length>5,'reinforce list');
 d.querySelector('[data-b="tx"]').click();assert(G.S.builds.length===1,'build started');
 d.getElementById('bOk').click();d.getElementById('goBtn').click();
 return new Promise(r=>setTimeout(r,200)).then(()=>{d.getElementById('pSkip').click();assert(d.querySelector('.res'),'report shows');
   d.getElementById('repGo').click();assert(G.S.year===2,'year 2 starts');
   // reload resumes
   console.log('UI ok, exitCode',process.exitCode||0);});})();
