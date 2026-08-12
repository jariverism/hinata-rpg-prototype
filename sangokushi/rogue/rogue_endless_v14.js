// 日向三國志 ROGUE Prototype 0.14 — 12-month / endless mode
(()=>{
if(window.HINATA_ROGUE_ENDLESS_V14)return;window.HINATA_ROGUE_ENDLESS_V14=true;
const MODE_STANDARD='standard',MODE_ENDLESS='endless';
let pendingMode=MODE_STANDARD;
const isEndlessState=(s=state)=>s?.rogue?.mode===MODE_ENDLESS;
function setRunMode(s,mode,{silent=false}={}){
 if(!s?.rogue)return false;
 const endless=mode===MODE_ENDLESS;
 s.rogue.mode=endless?MODE_ENDLESS:MODE_STANDARD;
 s.rogue.deadline=endless?null:12;
 if(endless){s.rogue.finalBossCity=null;s.rogue.finalCleared=false}
 if(!silent&&typeof log==='function')log(endless?'無期限モードへ移行。12月の最終決戦・強制終了は発生しない。':'12か月決戦モードで開始。12月が最終決戦となる。');
 return true;
}
function nextEndlessGrowthTurn(turn){const t=Number(turn)||0;return t>=13&&(t-13)%3===0}
function queueEndlessGrowth(){
 if(!isEndlessState()||!nextEndlessGrowthTurn(state.turn))return false;
 state.rogue.rewardQueue=Array.isArray(state.rogue.rewardQueue)?state.rogue.rewardQueue:[];
 const reason=`無期限・${state.turn}か月目の成長機会`;
 if(state.rogue.rewardQueue.some(x=>x?.type==='upgrade'&&x?.reason===reason))return false;
 state.rogue.rewardQueue.push({type:'upgrade',reason});
 if(typeof log==='function')log(`${state.turn}か月目の長期戦成長機会を得た。`);
 return true;
}
function stripFinalBossArtifacts(){
 if(!isEndlessState())return;
 state.rogue.finalBossCity=null;state.rogue.finalCleared=false;state.rogue.deadline=null;
 if(Array.isArray(state.logs))state.logs=state.logs.filter(x=>!String(x).includes('最終決戦発生！'));
}
const previousShowModal=window.showModal;
if(typeof previousShowModal==='function')window.showModal=function(html){
 if(isEndlessState()&&/最終決戦/.test(String(html||'')))return;
 return previousShowModal.apply(this,arguments);
};
const previousEndMonth=window.endMonth;
if(typeof previousEndMonth==='function')window.endMonth=function(){
 if(!isEndlessState())return previousEndMonth.apply(this,arguments);
 // The legacy ROGUE wrapper ends the run when finalBossCity survives into month 12+.
 // Clear it before and after each month so the base calendar/economy/AI can continue indefinitely.
 stripFinalBossArtifacts();
 const before=Number(state.turn)||0;
 const r=previousEndMonth.apply(this,arguments);
 if(!state?.rogue)return r;
 stripFinalBossArtifacts();
 if(Number(state.turn)!==before&&queueEndlessGrowth()&&typeof render==='function')render();
 return r;
};
function modeLabel(){return pendingMode===MODE_ENDLESS?'無期限':'12か月決戦'}
function refreshStartModeUI(){
 if(typeof document==='undefined')return;
 const root=document.querySelector('.rogue-start');if(!root)return;
 let box=root.querySelector('.v14-mode-box');
 if(!box){
  const opts=root.querySelector('.rogue-city-options');if(!opts)return;
  box=document.createElement('div');box.className='v14-mode-box';
  box.innerHTML=`<div class="title">プレイ期間</div><div class="v14-mode-buttons"><button data-v14-mode="standard"><b>12か月決戦</b><small>従来ルール。12月に最終決戦、期限内攻略でクリア。</small></button><button data-v14-mode="endless"><b>無期限モード</b><small>終了期限なし。13か月目以降も内政・戦争・登用を継続。</small></button></div><p class="v14-mode-note"></p>`;
  opts.parentElement?.insertBefore(box,opts);
 }
 root.querySelectorAll('[data-v14-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.v14Mode===pendingMode));
 const note=root.querySelector('.v14-mode-note');if(note)note.innerHTML=pendingMode===MODE_ENDLESS?'<b>無期限：</b>12月の最終決戦・強制終了なし。13か月目以降も3か月ごとに成長機会。':'<b>12か月決戦：</b>従来どおり12月が最終決戦。';
 const hp=document.querySelector('header p');if(hp&&!state)hp.textContent='12か月決戦か、終わりのない無期限戦記を選べ';
}
function decorateRunUI(){
 if(typeof document==='undefined'||!state?.rogue)return;
 const small=document.querySelector('header h1 small');if(small)small.textContent='Prototype 0.14';
 const hp=document.querySelector('header p');if(hp)hp.textContent=isEndlessState()?'終期なし。勢力を広げ、好きなだけ戦い続けろ':'十二か月でビルドを完成させ、最後の決戦を制せ';
 const panel=document.querySelector('.rogue-panel');if(!panel)return;
 let badge=panel.querySelector('.v14-mode-badge');if(!badge){badge=document.createElement('div');badge.className='v14-mode-badge';panel.querySelector('.title')?.insertAdjacentElement('afterend',badge)}
 badge.textContent=`モード：${isEndlessState()?'無期限':'12か月決戦'}`;
 const runbox=panel.querySelector('.rogue-runbox');
 if(isEndlessState()&&runbox){const first=runbox.firstElementChild;if(first)first.innerHTML=`経過<b>${Math.max(1,Number(state.turn)||1)}か月</b>`;panel.querySelector('.rogue-final')?.remove()}
 if(!isEndlessState()&&!panel.querySelector('.v14-convert-endless')){
  const btn=document.createElement('button');btn.className='v14-convert-endless';btn.textContent='このランを無期限モードへ変更';
  btn.onclick=()=>{if(!confirm('このランを無期限モードへ変更しますか？ 12か月決戦には戻せません。'))return;setRunMode(state,MODE_ENDLESS);stripFinalBossArtifacts();render()};
  panel.appendChild(btn);
 }
}
function applyPendingModeAfterStart(){
 if(!state?.rogue)return;
 setRunMode(state,pendingMode,{silent:true});
 if(pendingMode===MODE_ENDLESS&&typeof log==='function')log('無期限モードで旗揚げ。12月の最終決戦・強制終了は発生しない。');
 else if(typeof log==='function')log('12か月決戦モードで旗揚げ。');
 if(typeof render==='function')render();
}
const previousRender=window.render;
if(typeof previousRender==='function')window.render=function(){
 if(state?.rogue&&!state.rogue.mode)state.rogue.mode=MODE_STANDARD;
 const r=previousRender.apply(this,arguments);
 if(state?.rogue){stripFinalBossArtifacts();setTimeout(decorateRunUI,0)}else setTimeout(refreshStartModeUI,0);
 return r;
};
window.HINATA_ROGUE_ENDLESS_V14_API={MODE_STANDARD,MODE_ENDLESS,isEndlessState,setRunMode,nextEndlessGrowthTurn,queueEndlessGrowth,stripFinalBossArtifacts};
if(typeof document==='undefined')return;
document.addEventListener('click',e=>{
 const mode=e.target.closest?.('[data-v14-mode]');
 if(mode){e.preventDefault();e.stopPropagation();pendingMode=mode.dataset.v14Mode===MODE_ENDLESS?MODE_ENDLESS:MODE_STANDARD;refreshStartModeUI();return}
 const start=e.target.closest?.('[data-rogue-start]');if(start&&!state)setTimeout(applyPendingModeAfterStart,0);
 if(e.target.closest?.('#newBtn'))setTimeout(()=>{pendingMode=MODE_STANDARD;refreshStartModeUI()},0);
},true);
const observer=new MutationObserver(()=>{if(!state)refreshStartModeUI();else if(state?.rogue)decorateRunUI()});observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
const style=document.createElement('style');style.textContent=`
.v14-mode-box{margin:12px 0 8px;padding:10px;border:1px solid #806126;background:#17110a}.v14-mode-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v14-mode-buttons button{text-align:left;min-height:78px}.v14-mode-buttons button small{display:block;margin-top:5px;line-height:1.4}.v14-mode-buttons button.selected{outline:2px solid #e0b24f;background:linear-gradient(#60451f,#392710)}.v14-mode-note{margin:8px 2px 0;font-size:11px;color:#d9c6a0}.v14-mode-badge{display:inline-block;margin:4px 0 8px;padding:4px 8px;border:1px solid #9f7b35;border-radius:999px;color:#f0d28a;font-size:11px}.v14-convert-endless{width:100%;margin-top:10px}@media(max-width:620px){.v14-mode-buttons{grid-template-columns:1fr}}
`;document.head.appendChild(style);
setTimeout(()=>{refreshStartModeUI();decorateRunUI()},0);
})();
