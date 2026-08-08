// v24.47 — robust strategist appointment for all Hinata scenarios
(()=>{
function ownOfficers(){
  if(typeof state==='undefined'||!state?.officers)return [];
  return state.officers.filter(o=>o.force==='日向軍'&&o.status!=='捕虜');
}
function currentRulerName(){
  return state?.rulerName || ownOfficers().find(o=>o.status==='君主')?.name || '佐々木久美';
}
function currentStrategist(){return ownOfficers().find(o=>o.status==='軍師')||null}
function appointStrategist(name){
  const list=ownOfficers(),target=list.find(o=>o.name===name);if(!target)return;
  const ruler=currentRulerName();
  if(target.name===ruler||target.status==='君主')return alert('君主自身を軍師には任命できません。');
  list.forEach(o=>{if(o.status==='軍師')o.status='一般'});
  target.status='軍師';
  state.strategistName=target.name;
  state.adviserName=target.name;
  state.advisorName=target.name;
  if(typeof log==='function')log(`${target.name}を軍師に任命した。`);
  if(typeof closeModal==='function')closeModal();
  if(typeof render==='function')render();
}
function showStrategistModal(){
  if(typeof state==='undefined'||!state)return;
  const ruler=currentRulerName(),cur=currentStrategist();
  const candidates=ownOfficers().filter(o=>o.name!==ruler&&o.status!=='君主').sort((a,b)=>(Number(b.int)||0)-(Number(a.int)||0)||(Number(b.pol)||0)-(Number(a.pol)||0));
  if(!candidates.length)return alert('軍師に任命できる配下がいません。');
  const html=`<h2>軍師任命</h2><p>現在の軍師：<b>${cur?.name||'なし'}</b></p><p><small>知力の高い武将ほど計略・助言役に向きます。</small></p><div class="choice-list v2447-strategist-list">${candidates.map(o=>`<button data-v2447-strategist="${o.name}"><span><b>${o.name}</b>${o.status==='軍師'?'　【現軍師】':''}<br><small>知${o.int}　政${o.pol}　統${o.lead}　魅${o.cha}</small></span><span>任命</span></button>`).join('')}</div><button data-close>閉じる</button>`;
  if(typeof showModal==='function')showModal(html);else return;
  modalCard.querySelectorAll('[data-v2447-strategist]').forEach(btn=>btn.onclick=()=>appointStrategist(btn.dataset.v2447Strategist));
}
function decorateStrategistUI(){
  if(typeof state==='undefined'||!state||state.battle)return;
  const dashboard=document.querySelector('.dashboard');if(!dashboard)return;
  const commands=dashboard.querySelector('.commands');if(!commands)return;
  let btn=commands.querySelector('[data-cmd="strategist"], [data-cmd="adviser"], [data-cmd="advisor"]');
  if(!btn){
    btn=document.createElement('button');btn.dataset.cmd='strategist';btn.textContent='軍師任命';commands.appendChild(btn);
  }
  btn.disabled=false;btn.onclick=e=>{e.preventDefault();e.stopPropagation();showStrategistModal()};
  const cur=currentStrategist();
  const titlePanel=[...dashboard.querySelectorAll('.panel')].find(p=>p.textContent.includes('日向軍'));
  if(titlePanel){
    let line=titlePanel.querySelector('.v2447-strategist-line');
    if(!line){line=document.createElement('div');line.className='v2447-strategist-line';titlePanel.appendChild(line)}
    line.innerHTML=`<small>軍師　<b>${cur?.name||'未任命'}</b></small>`;
  }
}
// Capture any pre-existing strategist appointment button even if its onclick was lost by a redraw.
document.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn)return;
  const txt=(btn.textContent||'').trim();
  if(btn.dataset?.cmd==='strategist'||btn.dataset?.cmd==='adviser'||btn.dataset?.cmd==='advisor'||txt==='軍師任命'||txt==='軍師を任命'){
    e.preventDefault();e.stopPropagation();showStrategistModal();
  }
},true);
const previousRender=window.render;
window.render=function(){const r=previousRender.apply(this,arguments);setTimeout(decorateStrategistUI,0);return r};
setTimeout(decorateStrategistUI,0);
window.V2447={showStrategistModal,appointStrategist,currentStrategist};
const style=document.createElement('style');style.textContent=`.v2447-strategist-list button{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;text-align:left}.v2447-strategist-line{margin-top:5px;color:#e7c477}`;document.head.appendChild(style);
})();
