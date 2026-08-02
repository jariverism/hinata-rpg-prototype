// v24.1 — adviser system and shared portrait rendering
let V241_PORTRAITS={};
fetch('portraits.json?v=241',{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(x=>{V241_PORTRAITS=x||{};setTimeout(v241Enhance,0)}).catch(()=>{});

(function(){
 const style=document.createElement('style');
 style.textContent=`
 .adviser-card{display:grid;grid-template-columns:54px 1fr;gap:10px;align-items:center;margin-top:10px;padding:10px;border:1px solid #8c6c34;background:#17120ddd}
 .adviser-card .face{width:50px;height:60px}
 .adviser-card small{display:block;line-height:1.45;color:#d8c6a3}
 .advice-box{display:grid;grid-template-columns:58px 1fr;gap:10px;align-items:center;padding:12px;margin:10px 0;border:1px solid #aa8240;background:#21180f}
 .advice-box .face{width:54px;height:64px}
 .advice-box p{margin:4px 0 0;line-height:1.55}
 .portrait-img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
 .face.portrait-ready{overflow:hidden;padding:0!important}
 .portrait-status{font-size:11px;color:#bca67c}
 `;
 document.head.appendChild(style);
})();

function v241Ensure(){
 if(!state)return;
 state.advisers=state.advisers||{};
 if(!state.advisers['日向軍']){
   const k=state.officers.find(o=>o.force==='日向軍'&&o.name==='齊藤京子')||officers('日向軍').slice().sort((a,b)=>b.int-a.int)[0];
   if(k)state.advisers['日向軍']=k.name;
 }
 Object.keys(FORCES).forEach(f=>{
   if(!state.advisers[f]){
     const a=state.officers.filter(o=>o.force===f&&o.status!=='捕虜').sort((x,y)=>y.int-x.int)[0];
     if(a)state.advisers[f]=a.name;
   }
 });
}
function v241Adviser(force='日向軍'){
 v241Ensure();
 const name=state?.advisers?.[force];
 return state?.officers?.find(o=>o.name===name&&o.force===force&&o.status!=='捕虜')||null;
}
function v241FaceHtml(name){return `<span class="face" data-v241-face="${name}">${(name||'?')[0]}</span>`}
function v241ApplyFace(el,name){
 if(!el||el.dataset.loaded==='1')return;
 const rec=V241_PORTRAITS[name];
 if(!rec||!rec.mini)return;
 const img=new Image();
 img.className='portrait-img';img.alt=`${name}の肖像`;
 img.onload=()=>{el.textContent='';el.classList.add('portrait-ready');el.appendChild(img);el.dataset.loaded='1'};
 img.onerror=()=>{el.dataset.loaded='0'};
 img.src=rec.mini+'?v=241';
}
function v241Enhance(){
 if(!state||state.battle)return;
 v241Ensure();
 document.querySelectorAll('.officer').forEach(row=>{
   const name=row.querySelector('b')?.textContent?.trim();const face=row.querySelector('.face');if(name&&face)v241ApplyFace(face,name);
 });
 document.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
 const firstPanel=document.querySelector('.dashboard .stack .panel');
 if(firstPanel&&!firstPanel.querySelector('.adviser-card')){
   const a=v241Adviser();
   firstPanel.insertAdjacentHTML('beforeend',`<div class="adviser-card">${a?v241FaceHtml(a.name):'<span class="face">軍</span>'}<div><b>軍師 ${a?.name||'未任命'}</b><small>${a?`知力 ${a.int}／助言的中率 ${a.int}%`:'人事から任命してください'}</small><span class="portrait-status">肖像は共通画像台帳を参照</span></div></div>`);
   if(a)v241ApplyFace(firstPanel.querySelector('[data-v241-face]'),a.name);
 }
 const commands=document.querySelector('.commands');
 if(commands&&!commands.querySelector('[data-cmd="adviser"]')){
   const b=document.createElement('button');b.dataset.cmd='adviser';b.textContent='軍師任命';b.disabled=cityObj().force!=='日向軍';b.onclick=()=>v241Appoint();commands.insertBefore(b,commands.lastElementChild);
 }
}

const v241BaseBegin=beginGame;
beginGame=function(){v241BaseBegin();v241Ensure();render()};
const v241BaseRender=render;
render=function(){v241Ensure();v241BaseRender();setTimeout(v241Enhance,0)};

function v241Appoint(){
 const list=officers('日向軍').slice().sort((a,b)=>b.int-a.int);
 showModal(`<h2>軍師任命</h2><p>勢力全体で一名を任命します。知力が助言の正確さになります。</p><div class="choice-list">${list.map(o=>`<button data-v241-appoint="${o.name}">${v241FaceHtml(o.name)}<span><b>${o.name}</b><br>知力${o.int}　助言的中率${o.int}%</span></button>`).join('')}</div><button data-close>閉じる</button>`);
 modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
 modalCard.querySelectorAll('[data-v241-appoint]').forEach(b=>b.onclick=()=>{state.advisers['日向軍']=b.dataset.v241Appoint;log(`${b.dataset.v241Appoint}を軍師に任命した。`);closeModal();render()});
}
function v241Advice(actualSuccess,subject){
 const a=v241Adviser();if(!a)return {a:null,text:'軍師が不在のため、助言を得られません。'};
 const correct=Math.random()*100<a.int;
 const saysSuccess=correct?actualSuccess:!actualSuccess;
 return {a,text:saysSuccess?`「${subject}は成功する見込みがございます。」`:`「${subject}は難しいでしょう。」`};
}
function v241AdviceHtml(ad){return `<div class="advice-box">${ad.a?v241FaceHtml(ad.a.name):'<span class="face">軍</span>'}<div><b>${ad.a?`軍師 ${ad.a.name}`:'軍師不在'}</b><p>${ad.text}</p>${ad.a?`<small>知力${ad.a.int}：助言が正しい確率${ad.a.int}%</small>`:''}</div></div>`}

// Recruitment with adviser forecast. The result is rolled before the advice, so INT 100 is always truthful.
hire=function(o){
 const ts=state.officers.filter(x=>(x.force==='在野'&&x.city===state.selected)||(x.force&&x.force!=='日向軍'&&x.status!=='君主'));
 if(!ts.length)return alert('対象なし');
 showModal(`<h2>登用</h2><div class="choice-list">${ts.slice(0,40).map(t=>`<button data-target="${t.name}"><b>${t.name}</b> ${t.force} ${t.city} 忠${t.loy}</button>`).join('')}</div><button data-close>閉じる</button>`);
 modalCard.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>{
   const t=state.officers.find(x=>x.name===b.dataset.target);
   const chance=Math.max(3,Math.min(92,15+o.cha*.45+(100-t.loy)*.45-(t.force==='在野'?0:20)));
   const success=Math.random()*100<chance;
   const ad=v241Advice(success,`${t.name}の登用`);
   showModal(`<h2>${t.name}を登用</h2>${v241AdviceHtml(ad)}<p>実行武将：<b>${o.name}</b>　必要金180</p><button id="v241-hire-go" class="primary">登用を実行</button><button data-close>中止</button>`);
   modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
   modalCard.querySelector('#v241-hire-go').onclick=()=>{
     const c=cityObj();if(c.gold<180)return alert('金不足');c.gold-=180;
     if(success){t.force='日向軍';t.city=state.selected;t.status='一般';t.loy=68;closeModal();finish(o,`${t.name}の登用に成功しました。`)}
     else{closeModal();finish(o,`${t.name}の登用に失敗しました。`)}
   };
 });
};

// Compact diplomacy with adviser forecast.
diplomacy=function(o){
 const fs=Object.keys(FORCES).filter(f=>state.officers.some(x=>x.force===f));
 showModal(`<h2>外交</h2><div class="choice-list">${fs.map(f=>`<button data-v241-force="${f}"><b>${f}</b>　関係${state.relations[f]||0}</button>`).join('')}</div><button data-close>閉じる</button>`);
 modalCard.querySelectorAll('[data-v241-force]').forEach(b=>b.onclick=()=>{
   const f=b.dataset.v241Force,rel=state.relations[f]||0,chance=Math.max(5,Math.min(90,20+o.cha*.55+rel*.25));
   const success=Math.random()*100<chance,ad=v241Advice(success,`${f}との同盟交渉`);
   showModal(`<h2>${f}との同盟</h2>${v241AdviceHtml(ad)}<p>使者：<b>${o.name}</b>　贈物：金300</p><button id="v241-dip-go" class="primary">交渉を実行</button><button data-close>中止</button>`);
   modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
   modalCard.querySelector('#v241-dip-go').onclick=()=>{
     const c=cityObj();if(c.gold<300)return alert('金不足');c.gold-=300;
     if(success){state.alliances[f]=state.turn+12;state.relations[f]=Math.min(100,(state.relations[f]||0)+25);closeModal();finish(o,`${f}との同盟が成立しました。`)}
     else{state.relations[f]=Math.max(-100,(state.relations[f]||0)-5);closeModal();finish(o,`${f}との交渉は決裂しました。`)}
   };
 });
};

// Use the same portrait source for command-result dialogue.
const v241OldToast=toast;
toast=function(o,msg){
 document.querySelector('.toast')?.remove();const x=document.createElement('div');x.className='toast';x.innerHTML=`${v241FaceHtml(o.name)}<div><b>${o.name}</b><br>「${msg}」</div>`;document.body.appendChild(x);v241ApplyFace(x.querySelector('[data-v241-face]'),o.name);setTimeout(()=>x.remove(),4200)
};
