// v24.3 — 内政フェーズ計略
(function(){
 const style=document.createElement('style');
 style.textContent=`
 .stratagem-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}
 .stratagem-grid button{text-align:left;min-height:76px;padding:10px}
 .stratagem-grid button small{display:block;margin-top:4px;color:#d7c39d;line-height:1.4}
 .stratagem-target{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
 .stratagem-rate{color:#d6b46d;font-weight:bold}
 @media(max-width:560px){.stratagem-grid{grid-template-columns:1fr}}
 `;
 document.head.appendChild(style);
})();

function v243EnemyCities(){
 return Object.values(state.cities)
  .filter(c=>c.force&&c.force!=='日向軍'&&!(state.alliances[c.force]>=state.turn))
  .sort((a,b)=>a.name.localeCompare(b.name,'ja'));
}
function v243CityDefence(city){
 const intel=state.officers.filter(o=>o.force===city.force&&o.city===city.name&&o.status!=='捕虜').map(o=>o.int||50);
 return intel.length?Math.max(...intel):55;
}
function v243Chance(actor,city,type,target){
 const defence=v243CityDefence(city);
 let base=actor.int*.78-defence*.42+34;
 if(type==='discord'&&target)base+=(100-(target.loy||70))*.18;
 if(type==='rumor')base+=5;
 if(type==='incite')base-=3;
 if(type==='sabotage')base-=7;
 return Math.max(5,Math.min(92,Math.round(base)));
}
function v243Stratagem(){
 if(!state||cityObj().force!=='日向軍')return alert('自国都市でのみ実行できます。');
 if(!ready(state.selected).length)return alert('この都市で行動可能な武将がいません。');
 chooseActor('int',v243ChooseType);
}
function v243ChooseType(actor){
 showModal(`<h2>計略</h2><p>実行武将：<b>${actor.name}</b>　知力${actor.int}</p><div class="stratagem-grid">
 <button data-v243-type="discord"><b>離間の計</b><small>敵将の忠誠を低下させる。低忠誠の武将ほど成功しやすい。金200。</small></button>
 <button data-v243-type="rumor"><b>流言</b><small>敵都市に悪評を流し、士気と勢力間関係を低下させる。金160。</small></button>
 <button data-v243-type="incite"><b>扇動</b><small>敵兵を動揺させ、兵士と士気を減少させる。金220。</small></button>
 <button data-v243-type="sabotage"><b>破壊工作</b><small>城壁・農業・商業のいずれかを損壊させる。金250。</small></button>
 </div><button data-close>閉じる</button>`);
 modalCard.querySelectorAll('[data-v243-type]').forEach(b=>b.onclick=()=>v243ChooseCity(actor,b.dataset.v243Type));
}
function v243ChooseCity(actor,type){
 const cities=v243EnemyCities();
 if(!cities.length)return alert('計略を仕掛けられる敵都市がありません。');
 const labels={discord:'離間の計',rumor:'流言',incite:'扇動',sabotage:'破壊工作'};
 showModal(`<h2>${labels[type]}：対象都市</h2><p>実行武将：<b>${actor.name}</b></p><div class="choice-list">${cities.map(c=>`<button data-v243-city="${c.name}"><span class="stratagem-target"><span><b>${c.name}</b>　${c.force}<br><small>兵${c.troops.toLocaleString()}　士気${c.morale}　城壁${c.wall}</small></span><span>選択</span></span></button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v243-city]').forEach(b=>b.onclick=()=>{
   const city=state.cities[b.dataset.v243City];
   if(type==='discord')v243ChooseOfficer(actor,city);
   else v243Confirm(actor,city,type,null);
 });
}
function v243ChooseOfficer(actor,city){
 const targets=state.officers.filter(o=>o.force===city.force&&o.status!=='君主'&&o.status!=='捕虜').sort((a,b)=>(a.loy||70)-(b.loy||70));
 if(!targets.length)return alert('離間できる敵将がいません。');
 showModal(`<h2>離間の計：対象武将</h2><p>対象勢力：<b>${city.force}</b></p><div class="choice-list">${targets.slice(0,50).map(o=>`<button data-v243-officer="${o.name}"><b>${o.name}</b>　所在${o.city}　忠誠${o.loy??70}　知力${o.int}</button>`).join('')}</div><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v243-officer]').forEach(b=>b.onclick=()=>v243Confirm(actor,city,'discord',state.officers.find(o=>o.name===b.dataset.v243Officer&&o.force===city.force)));
}
function v243Confirm(actor,city,type,target){
 const costs={discord:200,rumor:160,incite:220,sabotage:250};
 const labels={discord:'離間の計',rumor:'流言',incite:'扇動',sabotage:'破壊工作'};
 const chance=v243Chance(actor,city,type,target);
 const success=Math.random()*100<chance;
 const subject=type==='discord'?`${target.name}への離間の計`:`${city.name}への${labels[type]}`;
 const advice=typeof v241Advice==='function'?v241Advice(success,subject):{a:null,text:'軍師から助言を得られません。'};
 showModal(`<h2>${labels[type]}を実行</h2>${typeof v241AdviceHtml==='function'?v241AdviceHtml(advice):`<p>${advice.text}</p>`}<p>実行武将：<b>${actor.name}</b><br>対象：<b>${target?target.name:city.name}</b>（${city.force}）<br>必要金：${costs[type]}</p><p><small>実際の成功率は実行武将の知力、対象勢力の知力、忠誠などから算出されます。</small></p><button id="v243-go" class="primary">計略を実行</button><button data-close>中止</button>`);
 modalCard.querySelectorAll('[data-v241-face]').forEach(el=>typeof v241ApplyFace==='function'&&v241ApplyFace(el,el.dataset.v241Face));
 modalCard.querySelector('#v243-go').onclick=()=>{
   const home=cityObj();if(home.gold<costs[type])return alert('金が不足しています。');
   home.gold-=costs[type];
   let msg;
   if(success){
     if(type==='discord'){
       const loss=Math.max(7,Math.min(22,Math.floor((actor.int-v243CityDefence(city))/5)+14));
       target.loy=Math.max(1,(target.loy??70)-loss);
       msg=`${target.name}への離間に成功。忠誠が${loss}低下しました。`;
       if(target.loy<=25&&Math.random()<.28){target.force='在野';target.status='在野';target.discovered=true;msg+=` ${target.name}は主君を見限り、在野となりました。`;}
     }else if(type==='rumor'){
       const loss=8+Math.floor(actor.int/12);city.morale=Math.max(20,city.morale-loss);state.relations[city.force]=Math.max(-100,(state.relations[city.force]||0)-8);msg=`${city.name}に流言が広まり、士気が${loss}低下しました。`;
     }else if(type==='incite'){
       const troopLoss=Math.max(180,Math.floor(city.troops*(.05+actor.int/2500)));const moraleLoss=6+Math.floor(actor.int/18);city.troops=Math.max(0,city.troops-troopLoss);city.morale=Math.max(15,city.morale-moraleLoss);msg=`${city.name}の兵を扇動し、${troopLoss}人が離脱しました。`;
     }else{
       const fields=['wall','farm','commerce'];const field=fields[Math.floor(Math.random()*fields.length)];const names={wall:'城壁',farm:'農業',commerce:'商業'};const loss=7+Math.floor(actor.int/14);city[field]=Math.max(10,city[field]-loss);msg=`${city.name}の${names[field]}へ破壊工作を行い、${loss}低下させました。`;
     }
   }else msg=`${subject}は敵に見破られ、失敗しました。`;
   closeModal();finish(actor,msg);
 };
}

const v243BaseRender=render;
render=function(){
 v243BaseRender();
 setTimeout(()=>{
   if(!state||state.battle)return;
   const commands=document.querySelector('.commands');
   if(commands&&!commands.querySelector('[data-cmd="stratagem"]')){
     const b=document.createElement('button');b.dataset.cmd='stratagem';b.textContent='計略';b.disabled=cityObj().force!=='日向軍'||!ready(state.selected).length;b.addEventListener('click',v243Stratagem);
     const end=commands.querySelector('[data-cmd="end"]');commands.insertBefore(b,end||null);
   }
 },0);
};
setTimeout(()=>{if(state)render()},0);
