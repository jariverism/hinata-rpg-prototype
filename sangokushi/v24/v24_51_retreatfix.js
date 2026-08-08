// v24.51 — 敗戦時の退却は隣接都市のみ。遠距離ワープを禁止
(()=>{
const previousEndBattle=window.endBattle;

function activeOfficer(o){return o&&o.status!=='死亡'&&o.status!=='捕虜'&&o.status!=='敗将'}
function cityNeighbors(name){
 const c=state?.cities?.[name];
 const list=Array.isArray(c?.n)?c.n:(typeof neighbors==='function'?neighbors(name):[]);
 return list.map(n=>state.cities?.[n]).filter(Boolean);
}
function removeWrongDefeatLog(fallen){
 if(!Array.isArray(state?.logs))return;
 state.logs=state.logs.filter(line=>{
  const text=String(line||'');
  return !(text.includes(`${fallen}防衛戦に敗北`)||text.includes(`${fallen}が陥落し、日向軍はすべての拠点を失った`));
 });
}

window.endBattle=function(win,retreat){
 const b=state?.battle;
 if(!b?.defense||win)return previousEndBattle.apply(this,arguments);

 const fallen=b.target,invadingForce=b.invadingForce;
 const adjacent=cityNeighbors(fallen);
 const adjacentOwn=adjacent.find(c=>c.force==='日向軍');
 // 隣接する自国都市がある場合は従来処理でも必ずそこへ退却するため、そのまま任せる。
 if(adjacentOwn)return previousEndBattle.apply(this,arguments);

 const adjacentEmpty=adjacent.find(c=>!c.force);
 const remain=b.units.filter(u=>u.side==='player'&&u.troops>0).reduce((s,u)=>s+(Number(u.troops)||0),0);
 const defenders=(state.officers||[]).filter(o=>o.force==='日向軍'&&o.city===fallen&&activeOfficer(o)).map(o=>({
  name:o.name,status:o.status,force:o.force,city:o.city,captured:o.captured,captor:o.captor
 }));
 const beforeTroops={};
 Object.values(state.cities||{}).forEach(c=>beforeTroops[c.name]=Number(c.troops)||0);

 const result=previousEndBattle.apply(this,arguments);

 // v24.20 は最寄り自国都市を幅優先探索するため、離れた都市へ兵・武将がワープすることがある。
 // その転送分だけを取り消す。
 let toRemove=remain;
 if(toRemove>0){
  for(const c of Object.values(state.cities||{})){
   if(c.name===fallen||c.force!=='日向軍')continue;
   const delta=Math.max(0,(Number(c.troops)||0)-(beforeTroops[c.name]||0));
   if(delta<=0)continue;
   const cut=Math.min(delta,toRemove);c.troops=Math.max(0,(Number(c.troops)||0)-cut);toRemove-=cut;
   if(toRemove<=0)break;
  }
 }
 removeWrongDefeatLog(fallen);

 if(adjacentEmpty){
  adjacentEmpty.force='日向軍';
  adjacentEmpty.troops=Math.max(0,Number(adjacentEmpty.troops)||0)+remain;
  adjacentEmpty.morale=Math.max(40,Number(adjacentEmpty.morale)||40);
  defenders.forEach(s=>{
   const o=(state.officers||[]).find(x=>x.name===s.name);if(!o)return;
   o.force='日向軍';o.city=adjacentEmpty.name;o.status=s.status||'一般';
   if(s.captured===undefined)delete o.captured;else o.captured=s.captured;
   if(s.captor===undefined)delete o.captor;else o.captor=s.captor;
  });
  state.over=false;state.aiDefeated=false;state.selected=adjacentEmpty.name;
  if(typeof log==='function')log(`${fallen}防衛戦に敗北。退路は隣接都市に限られるため、残存兵${remain.toLocaleString()}は空城${adjacentEmpty.name}へ退却し、そのまま占領した。`);
  if(typeof render==='function')render();
  return result;
 }

 // 隣接する自国都市も空城もなければ、遠方拠点の有無にかかわらずこの敗戦でゲームオーバー。
 defenders.forEach(s=>{
  const o=(state.officers||[]).find(x=>x.name===s.name);if(!o)return;
  o.force='日向軍';o.city=fallen;o.status='捕虜';o.captured=true;o.captor=invadingForce;
 });
 state.v2420DefenseQueue=[];
 state.over=true;state.aiDefeated=true;state.selected=fallen;
 if(typeof log==='function')log(`${fallen}が陥落。隣接する退却可能な自国都市・空城がなく、日向軍は敗北した。`);
 if(typeof render==='function')render();
 return result;
};
})();
