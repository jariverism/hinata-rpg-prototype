const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const extra=fs.readFileSync(path.join(root,'historical_officers_extra.js'),'utf8');
const stats=fs.readFileSync(path.join(root,'v24_18_stats.js'),'utf8');
const data=fs.readFileSync(path.join(root,'data.js'),'utf8');
function jsonObjectAfter(src,prefix,suffix){const a=src.indexOf(prefix);if(a<0)throw new Error(`prefix not found: ${prefix}`);const start=a+prefix.length,b=src.indexOf(suffix,start);if(b<0)throw new Error(`suffix not found: ${suffix}`);return JSON.parse(src.slice(start,b));}
const exact=jsonObjectAfter(stats,'const EXACT=',';\nwindow.ROTK4_EXACT_STATS');
const raw=jsonObjectAfter(extra,'const EXTRA_RAW=',';\nconst SPECIAL=');
const ctx={};vm.createContext(ctx);vm.runInContext(data+'\nthis.__HIST=HIST;this.__HINATA_START=HINATA_START;this.__HINATA_WORLD=HINATA_WORLD;',ctx,{filename:'data.js'});
const hist=ctx.__HIST||[],hinata=new Set();(ctx.__HINATA_START||[]).forEach(o=>hinata.add(o.name));(ctx.__HINATA_WORLD||[]).forEach(x=>hinata.add(x[0]));
const names=new Set();hist.forEach(o=>{if(o?.name&&!hinata.has(o.name))names.add(o.name)});raw.forEach(x=>{if(x?.[0]&&!hinata.has(x[0]))names.add(x[0])});
const missing=[...names].filter(n=>!exact[n]).sort((a,b)=>a.localeCompare(b,'ja'));
console.log(`historical_coverage: total=${names.size} exact=${names.size-missing.length} missing=${missing.length}`);
console.log('MISSING_EXACT='+missing.join('、'));
