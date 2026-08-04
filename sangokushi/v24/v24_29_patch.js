// v24.29 — loyalty shock after succession
(()=>{
const previousRender=window.render;
const previousEndMonth=window.endMonth;

const LEGITIMATE_SUCCESSORS={
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

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function active(o){return o&&!['死亡','捕虜','敗将'].includes(o.status)}
function familyName(name){return String(name||'').charAt(0)}
function stableVariance(seed){
 let h=2166136261;
 for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
 return ((h>>>0)%9)-4;
}
function legitimacyScore(history){
 const order=LEGITIMATE_SUCCESSORS[history.oldForce]||[];
 const rank=order.indexOf(history.successor);
 if(rank===0)return 6;
 if(rank===1)return 4;
 if(rank>=2&&rank<=4)return 2;
 if(rank>=5)return 0;
 return -5;
}
function loyaltyDelta(o,successor,history,legitimacy){
 const old=Number(o.loy??70);
 let delta=legitimacy;
 delta+=clamp(Math.round(((Number(successor.cha)||70)-72)/8),-4,4);
 delta+=clamp(Math.round(((Number(successor.pol)||70)-70)/15),-2,2);
 if(o.city===successor.city)delta+=2;
 if(familyName(o.name)===familyName(successor.name))delta+=5;
 if(familyName(o.name)===familyName(history.fallen)&&familyName(successor.name)!==familyName(history.fallen))delta-=7;
 if(old<=40)delta-=7;
 else if(old<=60)delta-=4;
 else if(old>=90)delta+=legitimacy>=2?2:-3;
 if((Number(o.cha)||0)>(Number(successor.cha)||0)+10)delta-=2;
 if((Number(o.lead)||0)>(Number(successor.lead)||0)+12)delta-=2;
 delta+=stableVariance(`${history.turn}:${history.oldForce}:${history.successor}:${o.name}`);
 return clamp(delta,-20,16);
}
function describeCrisis(legitimacy,avg){
 if(legitimacy>=4&&avg>=1)return '正統な継承として受け入れられ、家中はおおむね安定した。';
 if(avg<=-8)return '継承への反発が広がり、家中は大きく動揺している。';
 if(avg<=-3)return '新君主への不信から、家臣団の忠誠が低下した。';
 if(avg>=3)return '新君主への期待が広がり、家臣団の忠誠が上向いた。';
 return '君主交代により、家臣ごとの忠誠が揺れ動いた。';
}
function processSuccessionLoyalty(){
 if(!state?.v2428SuccessionHistory||!state?.officers)return false;
 let changed=false;
 for(const history of state.v2428SuccessionHistory.slice().reverse()){
  if(history.v2429LoyaltyProcessed)continue;
  const successor=state.officers.find(o=>o.name===history.successor&&o.force===history.newForce&&o.status==='君主');
  if(!successor){history.v2429LoyaltyProcessed=true;continue}
  const retainers=state.officers.filter(o=>o.force===history.newForce&&active(o)&&o!==successor);
  const legitimacy=legitimacyScore(history),changes=[];
  successor.loy=100;
  for(const o of retainers){
   const before=clamp(Number(o.loy??70),1,100),delta=loyaltyDelta(o,successor,history,legitimacy);
   const after=clamp(before+delta,1,100);
   o.loy=after;o.v2429LastSuccessionDelta=after-before;o.v2429LastSuccessionTurn=state.turn;
   changes.push({name:o.name,before,after,delta:after-before});
  }
  history.v2429LoyaltyProcessed=true;
  history.loyaltyChanges=changes;
  history.legitimacy=legitimacy;
  const up=changes.filter(x=>x.delta>0).length,down=changes.filter(x=>x.delta<0).length;
  const avg=changes.length?changes.reduce((s,x)=>s+x.delta,0)/changes.length:0;
  const notable=changes.slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,5);
  const detail=notable.length?` 主な変動：${notable.map(x=>`${x.name}${x.delta>=0?'+':''}${x.delta}（${x.before}→${x.after}）`).join('、')}。`:'';
  const message=`${history.newForce}軍の君主交代：${describeCrisis(legitimacy,avg)} 忠誠上昇${up}名・低下${down}名。${detail}`;
  if(typeof log==='function')log(message);
  state.aiNews=Array.isArray(state.aiNews)?state.aiNews:[];
  state.aiNews.unshift({turn:state.turn,type:'succession-loyalty',important:true,text:message});
  state.aiNews=state.aiNews.slice(0,12);
  changed=true;
 }
 if(changed)state.v2429SuccessionLoyaltyVersion=129;
 return changed;
}

window.render=function(){processSuccessionLoyalty();return previousRender.apply(this,arguments)};
window.endMonth=function(){processSuccessionLoyalty();return previousEndMonth.apply(this,arguments)};
setTimeout(()=>{try{if(processSuccessionLoyalty())window.render()}catch(e){console.error('v24.29 succession loyalty:',e)}},0);
})();
