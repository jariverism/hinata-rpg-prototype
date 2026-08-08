// v24.63 — non-invasive regression audit for restored features
(()=>{
if(window.V2463_REGRESSION_AUDIT)return;window.V2463_REGRESSION_AUDIT=true;
function snapshotCities(){const out={};for(const [n,c] of Object.entries(state?.cities||{}))out[n]={force:c.force,troops:c.troops,morale:c.morale};return JSON.stringify(out)}
function run(){
 const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
 try{
  const f=window.V2458?.FIFTH||[];add('五期生10人定義',f.length===10&&new Set(f.map(x=>x.name)).size===10,`count=${f.length}`);
  add('五期生固有技10人',f.length===10&&f.every(x=>!!window.V246_SKILLS?.[x.name]));
  add('戦場計略上限4/3/2/1',!!window.V2461?.selfTest?.());
  add('軍師同期モジュール',typeof window.V2462?.sync==='function');
  add('歴史武将固定モジュール',typeof window.V2456_HIST?.rowFor==='function');
  if(state){
   const beforeSelected=state.selected,beforeCities=snapshotCities();
   try{window.V2462?.sync?.()}catch(e){add('軍師同期実行',false,e.message)}
   add('軍師同期で選択都市不変',state.selected===beforeSelected,`${beforeSelected} -> ${state.selected}`);
   add('軍師同期で都市状態不変',snapshotCities()===beforeCities);
   const hist=[];try{(HIST||[]).forEach(o=>hist.push(o))}catch(e){};(window.EXTRA_HISTORICAL_OFFICERS||[]).forEach(o=>hist.push(o));
   const hinata=new Set();try{(HINATA_START||[]).forEach(o=>hinata.add(o.name));(HINATA_WORLD||[]).forEach(x=>hinata.add(x[0]))}catch(e){}
   (window.V2458?.FIFTH||[]).forEach(o=>hinata.add(o.name));['髙橋未来虹','上村ひなの','森本茉莉','山口陽世'].forEach(n=>hinata.add(n));
   const names=[...new Set(hist.map(o=>o.name).filter(n=>!hinata.has(n)))],missing=names.filter(n=>!window.V2456_HIST?.rowFor?.(n));
   add('歴史武将に固定行あり',missing.length===0,missing.join('、'));
  }
 }catch(e){add('監査実行',false,e.stack||e.message)}
 const ok=checks.every(c=>c.ok);window.V2463_LAST_AUDIT={ok,checks,time:new Date().toISOString()};
 (ok?console.info:console.error)('[日向三國志 v24.63 回帰監査]',window.V2463_LAST_AUDIT);
 return window.V2463_LAST_AUDIT;
}
setTimeout(run,120);
window.V2463={run};
})();
