// v24.28 — rename an enemy force after an executed ruler is succeeded
(()=>{
const previousRender=window.render;
const previousEndMonth=window.endMonth;
const previousLog=window.log;

const SUCCESSION_ORDER={
 '曹操':['曹丕','曹植','曹彰','曹叡','夏侯惇','荀彧','司馬懿'],
 '曹丕':['曹叡','曹植','曹彰','司馬懿','曹真'],
 '曹叡':['曹芳','曹爽','司馬懿','曹真'],
 '劉備':['劉禅','諸葛亮','関羽','趙雲','姜維'],
 '劉禅':['諸葛亮','姜維','費禕','蒋琬'],
 '孫堅':['孫策','孫権','程普','黄蓋'],
 '孫策':['孫権','周瑜','張昭','程普'],
 '孫権':['孫亮','孫休','孫皓','陸遜','諸葛瑾'],
 '袁紹':['袁譚','袁尚','袁煕','審配','田豊'],
 '袁術':['袁胤','紀霊','張勲','橋蕤'],
 '董卓':['李傕','郭汜','呂布','牛輔'],
 '呂布':['高順','陳宮','張遼'],
 '公孫瓚':['公孫続','田楷','関靖'],
 '陶謙':['劉備','陳登','糜竺'],
 '孔融':['王修','太史慈'],
 '劉表':['劉琦','劉琮','蔡瑁','蒯越'],
 '劉焉':['劉璋','張魯','張任'],
 '劉璋':['劉循','張任','法正','厳顔'],
 '馬騰':['馬超','馬岱','龐徳','韓遂'],
 '韓遂':['成公英','閻行'],
 '張魯':['張衛','楊松','楊任']
};

function active(o){return o&& !['死亡','捕虜','敗将'].includes(o.status)}
function hasTerritory(force){return Object.values(state?.cities||{}).some(c=>c.force===force)}
function candidateScore(o){
 return (Number(o.lead)||0)*1.15+(Number(o.pol)||0)*.9+(Number(o.cha)||0)*.75+(Number(o.int)||0)*.45+(Number(o.loy)||0)*.12;
}
function successionCandidates(force){
 return (state?.officers||[]).filter(o=>o.force===force&&active(o)&&state.cities?.[o.city]?.force===force);
}
function chooseSuccessor(force,candidates){
 const preferred=SUCCESSION_ORDER[force]||[];
 for(const name of preferred){
  const found=candidates.find(o=>o.name===name);
  if(found)return found;
 }
 const current=candidates.find(o=>o.status==='君主');
 if(current)return current;
 return candidates.slice().sort((a,b)=>candidateScore(b)-candidateScore(a)||String(a.name).localeCompare(String(b.name),'ja'))[0]||null;
}
function availableForceName(name,oldForce){
 const occupied=Object.values(state?.cities||{}).some(c=>c.force===name&&c.force!==oldForce);
 return occupied?`${name}新`:name;
}
function moveKey(obj,oldKey,newKey){
 if(!obj||typeof obj!=='object'||!(oldKey in obj))return;
 const value=obj[oldKey];
 if(!(newKey in obj))obj[newKey]=value;
 else if(typeof value==='number'&&typeof obj[newKey]==='number')obj[newKey]=Math.round((obj[newKey]+value)/2);
 delete obj[oldKey];
}
function replaceForceRefs(value,oldForce,newForce,depth=0){
 if(depth>7||value==null)return;
 if(Array.isArray(value)){
  for(let i=0;i<value.length;i++){
   if(value[i]===oldForce)value[i]=newForce;
   else replaceForceRefs(value[i],oldForce,newForce,depth+1);
  }
  return;
 }
 if(typeof value!=='object')return;
 for(const key of Object.keys(value)){
  const item=value[key];
  if(item===oldForce)value[key]=newForce;
  else replaceForceRefs(item,oldForce,newForce,depth+1);
  if(key===oldForce){
   if(!(newForce in value))value[newForce]=value[key];
   delete value[key];
  }
 }
}
function transferPeripheralState(oldForce,newForce){
 moveKey(state.relations,oldForce,newForce);
 moveKey(state.alliances,oldForce,newForce);
 moveKey(state.advisers,oldForce,newForce);
 const skipped=new Set(['cities','officers','logs','relations','alliances','advisers','v2428SuccessionHistory']);
 for(const [key,value] of Object.entries(state)){
  if(skipped.has(key))continue;
  replaceForceRefs(value,oldForce,newForce);
 }
}
function renameForce(oldForce,newForce,successor,fallen){
 const oldStyle=(typeof FORCES!=='undefined'&&FORCES[oldForce])||{color:'#6f3c36'};
 if(typeof FORCES!=='undefined')FORCES[newForce]={...oldStyle};
 for(const c of Object.values(state.cities||{}))if(c.force===oldForce)c.force=newForce;
 for(const o of state.officers||[]){
  if(o.force!==oldForce)continue;
  o.force=newForce;
  if(o!==successor&&o.status==='君主')o.status='一般';
 }
 successor.force=newForce;successor.status='君主';successor.loy=Math.max(85,Number(successor.loy)||70);
 transferPeripheralState(oldForce,newForce);
 state.v2428SuccessionHistory=Array.isArray(state.v2428SuccessionHistory)?state.v2428SuccessionHistory:[];
 state.v2428SuccessionHistory.unshift({turn:state.turn,year:state.year,month:state.month,fallen:fallen.name,oldForce,newForce,successor:successor.name});
 state.v2428SuccessionHistory=state.v2428SuccessionHistory.slice(0,30);
 previousLog(`${fallen.name}の斬首を受け、${oldForce}軍は${successor.name}を新君主に擁立した。以後、勢力は${newForce}軍を称する。`);
 if(Array.isArray(state.aiNews)){
  state.aiNews.unshift({turn:state.turn,type:'succession',important:true,text:`政変：${oldForce}軍は${successor.name}を新君主に立て、${newForce}軍へ改称した。`});
  state.aiNews=state.aiNews.slice(0,12);
 }
}
function collapseForce(force,fallen){
 for(const c of Object.values(state.cities||{}))if(c.force===force){c.force=null;c.troops=0;c.morale=Math.max(35,Math.min(Number(c.morale)||50,55))}
 for(const o of state.officers||[]){
  if(o.force!==force||!active(o))continue;
  o.force='在野';o.status='在野';o.discovered=true;o.loy=Math.max(30,Math.min(Number(o.loy)||50,65));
 }
 moveKey(state.relations,force,`${force}滅亡`);delete state.relations?.[`${force}滅亡`];
 if(state.alliances)delete state.alliances[force];
 previousLog(`${fallen.name}の斬首後、${force}軍は後継君主を立てられず滅亡した。`);
}
function processExecutedRulers(){
 if(!state?.officers||!state?.cities)return false;
 let changed=false;
 const fallen=state.officers.filter(o=>o.wasRuler&&o.defeatedForce&&o.status==='死亡'&&!o.v2428SuccessionProcessed);
 for(const ruler of fallen){
  const oldForce=ruler.defeatedForce;
  ruler.v2428SuccessionProcessed=true;ruler.v2428FallenForce=oldForce;
  if(!hasTerritory(oldForce))continue;
  const candidates=successionCandidates(oldForce);
  if(!candidates.length){collapseForce(oldForce,ruler);changed=true;continue}
  const successor=chooseSuccessor(oldForce,candidates);
  if(!successor){collapseForce(oldForce,ruler);changed=true;continue}
  const newForce=availableForceName(successor.name,oldForce);
  renameForce(oldForce,newForce,successor,ruler);changed=true;
 }
 if(changed)state.v2428SuccessionVersion=128;
 return changed;
}

window.log=function(message){
 const result=previousLog.apply(this,arguments);
 if(String(message||'').includes('を斬首した'))setTimeout(()=>{if(processExecutedRulers())window.render()},0);
 return result;
};
window.render=function(){processExecutedRulers();return previousRender.apply(this,arguments)};
window.endMonth=function(){processExecutedRulers();return previousEndMonth.apply(this,arguments)};
setTimeout(()=>{try{if(processExecutedRulers())window.render()}catch(e){console.error('v24.28 succession:',e)}},0);
})();
