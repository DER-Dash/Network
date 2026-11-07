// Runs scoreboard/Code.gs in Node with a small in-memory stand-in for Google Apps Script
// (spreadsheet, cache, lock, properties, digest), so the career sync can be tested without deploying.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
function makeAppsScript(){
  const sheets={},cache={},props={};
  function sheet(name){const rows=[];const sh={name,rows,
    appendRow(r){rows.push(r.map(v=>v));},getLastRow(){return rows.length;},setFrozenRows(){},
    getRange(r,c,nr,nc){if(typeof r==='string')return{setNumberFormat(){return this;},setFontWeight(){return this;}};nr=nr||1;nc=nc||1;
      return{getValues(){return Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>{const row=rows[r-1+i]||[];const v=row[c-1+j];return v===undefined?'':v;}));},
        setValues(v){v.forEach((row,i)=>row.forEach((x,j)=>{(rows[r-1+i]=rows[r-1+i]||[])[c-1+j]=x;}));return this;},
        setValue(x){(rows[r-1]=rows[r-1]||[])[c-1]=x;return this;},getValue(){const row=rows[r-1]||[];return row[c-1]===undefined?'':row[c-1];},
        setFontWeight(){return this;},setNumberFormat(){return this;}};}};return sh;}
  const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=sheet(n)),getUrl:()=>'https://sheet.test'};
  const G={
    SpreadsheetApp:{getActiveSpreadsheet:()=>ss},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({text:t,setMimeType(){return this;}})},
    CacheService:{getScriptCache:()=>({get:k=>k in cache?cache[k]:null,put:(k,v)=>{cache[k]=String(v);},remove:k=>{delete cache[k];}})},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>k in props?props[k]:null,setProperty:(k,v)=>{props[k]=v;}})},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},getUuid:()=>crypto.randomUUID(),
      computeDigest:(alg,s)=>[...crypto.createHash('sha256').update(s,'utf8').digest()].map(b=>b>127?b-256:b)},// signed bytes, like Apps Script
    Session:{getEffectiveUser:()=>({getEmail:()=>'owner@test'})},MailApp:{sendEmail(){}},
    console,Date,JSON,Math,String,Number,Object,Array};
  vm.createContext(G);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','..','scoreboard','Code.gs'),'utf8'),G);
  const post=d=>JSON.parse(G.doPost({postData:{contents:JSON.stringify(d)}}).text);
  return{post,sheets,cache,props,clearCache(){Object.keys(cache).forEach(k=>delete cache[k]);}};}
module.exports={makeAppsScript};
