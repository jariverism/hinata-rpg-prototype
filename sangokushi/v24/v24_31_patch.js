// v24.31 — captured rulers may only be released or executed
(()=>{
let patchTimer=null;

function activeCitySnapshots(force){
 return Object.values(state?.cities||{}).filter(c=>c.force===force).map(c=>({
  name:c.name,force:c.force,troops:Number(c.troops)||0,morale:Number(c.morale)||0
 }));
}
function graphDistance(from,to){
 if(!from||!to||!state?.cities)return 999;
 if(from===to)return 0;
 const q=[[from,0]],seen=new Set([from]);
 while(q.length){
  const [name,d]=q.shift();
  for(const nx of state.cities[name]?.n||[]){
   if(nx===to)return d+1;
   if(!seen.has(nx)){seen.add(nx);q.push([nx,d+1])}
  }
 }
 return 999;
}
function nearestForceCity(from,force){
 return Object.values(state?.cities||{}).filter(c=>c.force===force)
  .sort((a,b)=>graphDistance(from,a.name)-graphDistance(from,b.name)||a.name.localeCompare(b.name,'ja'))[0]||null;
}
function removeLatestPrisonerLog(name){
 if(!Array.isArray(state?.logs))return;
 const needle=`${name}を捕虜とした。`;
 const index=state.logs.findIndex(line=>String(line).includes(needle));
 if(index>=0)state.logs.splice(index,1);
}
function restoreClearedCities(snapshots,force){
 for(const snap of snapshots){
  const c=state?.cities?.[snap.name];
  if(!c||c.force!=null)continue;
  c.force=force;c.troops=snap.troops;c.morale=snap.morale;
 }
}
function releaseRuler(officer,advance){
 const oldForce=officer.defeatedForce||officer.force;
 const oldCity=officer.city;
 const oldLoyalty=Number(officer.loy)||70;
 const oldWasRuler=officer.wasRuler;
 const oldDefeatedForce=officer.defeatedForce;
 const snapshots=activeCitySnapshots(oldForce);
 const refuge=nearestForceCity(oldCity,oldForce);

 // Prevent the compatibility succession hooks from treating this temporary
 // prisoner conversion as removal of the ruler while the queue advances.
 officer.wasRuler=false;
 try{advance()}catch(e){
  officer.wasRuler=oldWasRuler;
  throw e;
 }

 removeLatestPrisonerLog(officer.name);
 restoreClearedCities(snapshots,oldForce);
 const restoredRefuge=refuge&&state?.cities?.[refuge.name]?.force===oldForce?state.cities[refuge.name]:nearestForceCity(oldCity,oldForce);
 if(restoredRefuge){
  officer.force=oldForce;officer.city=restoredRefuge.name;officer.status='君主';officer.loy=Math.max(80,oldLoyalty);
  officer.captured=false;delete officer.captor;
  officer.wasRuler=oldWasRuler!==false;officer.defeatedForce=oldDefeatedForce||oldForce;
  officer.v2431Released=true;officer.v2431ReleasedTurn=state.turn;
  if(typeof log==='function')log(`${officer.name}を解放した。${officer.name}は${restoredRefuge.name}へ帰還し、${oldForce}軍の君主を続ける。`);
 }else{
  officer.force='在野';officer.city=oldCity||state.selected;officer.status='在野';officer.loy=Math.max(45,Math.min(70,oldLoyalty));
  officer.captured=false;delete officer.captor;
  officer.wasRuler=oldWasRuler!==false;officer.defeatedForce=oldDefeatedForce||oldForce;
  officer.v2431Released=true;officer.v2431ReleasedTurn=state.turn;
  if(typeof log==='function')log(`${officer.name}を解放したが、帰還できる領土がなく在野となった。`);
 }
 if(!modal?.classList?.contains('on')&&!state?.battle&&typeof render==='function')setTimeout(()=>render(),0);
}
function showReleaseConfirmation(officer,advance){
 const oldForce=officer.defeatedForce||officer.force;
 const refuge=nearestForceCity(officer.city,oldForce);
 const destination=refuge?`${refuge.name}へ帰還し、${oldForce}軍の君主を続けます。`:'帰還できる領土がないため、在野になります。';
 showModal(`<h2>君主解放の確認</h2><p><b>${officer.name}</b>を解放します。</p><p>${destination}</p><button id="v2431-release-go" class="primary">解放を確定</button><button data-close>戻る</button>`);
 modalCard.querySelector('#v2431-release-go').onclick=()=>releaseRuler(officer,advance);
}
function patchDisposition(){
 if(!state||!modalCard)return;
 const card=modalCard.querySelector('.disposition-card');
 if(!card||card.dataset.v2431RulerPatched==='1')return;
 const text=card.textContent||'';
 const name=card.querySelector('b')?.textContent?.trim();
 const officer=(state.officers||[]).find(o=>o.name===name);
 if(!officer||!(officer.wasRuler||officer.status==='君主'||text.includes('君主')))return;

 const attackRecruit=modalCard.querySelector('[data-v2410="recruit"]');
 const attackPrisoner=modalCard.querySelector('[data-v2410="prisoner"]');
 const defenseRecruit=modalCard.querySelector('#v2427-recruit');
 const defensePrisoner=modalCard.querySelector('#v2427-prisoner');
 const recruit=attackRecruit||defenseRecruit;
 const release=attackPrisoner||defensePrisoner;
 if(!release||typeof release.onclick!=='function'){
  clearTimeout(patchTimer);patchTimer=setTimeout(patchDisposition,20);return;
 }
 const advance=release.onclick;
 card.dataset.v2431RulerPatched='1';
 if(recruit)recruit.remove();
 release.textContent='解放する';release.classList.add('primary');
 release.onclick=()=>showReleaseConfirmation(officer,advance);
 const actions=release.closest('.disposition-actions');
 if(actions)actions.classList.add('v2431-ruler-actions');
 const paragraph=card.nextElementSibling;
 if(paragraph&&paragraph.tagName==='P')paragraph.textContent=`${officer.name}は敵勢力の君主です。登用・捕虜化はできません。解放または斬首を選んでください。`;
}

const observer=new MutationObserver(()=>{
 clearTimeout(patchTimer);patchTimer=setTimeout(patchDisposition,0);
});
if(modalCard)observer.observe(modalCard,{childList:true,subtree:true});
setTimeout(patchDisposition,0);

const style=document.createElement('style');
style.textContent=`.disposition-actions.v2431-ruler-actions{grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:560px){.disposition-actions.v2431-ruler-actions{grid-template-columns:1fr}}`;
document.head.appendChild(style);
})();
