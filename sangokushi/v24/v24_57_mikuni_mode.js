// v24.57 — Mikuni mode uses the exact same campaign engine as the original Sasaki Kumi mode
(()=>{
if(window.V2457_MIKUNI_MODE)return;window.V2457_MIKUNI_MODE=true;
const baseStartScreen=window.startScreen;
const baseBeginGame=window.beginGame;
let mode=window.V2457_MODE||'kumi';
const THIRD=[
 {name:'髙橋未来虹',lead:96,war:90,int:84,pol:75,cha:90,status:'君主',apt:'槍兵',skill:'大将の器'},
 {name:'上村ひなの',lead:78,war:52,int:95,pol:84,cha:92,status:'一般',apt:'弩兵',skill:'星詠み'},
 {name:'森本茉莉',lead:84,war:78,int:82,pol:80,cha:90,status:'一般',apt:'剣盾兵'},
 {name:'山口陽世',lead:90,war:93,int:66,pol:70,cha:90,status:'一般',apt:'騎兵'}
];
const OLD={
 '佐々木久美':{force:'袁紹',city:'南皮',loy:88,status:'一般',apt:'剣盾兵'},
 '加藤史帆':{force:'曹操',city:'許昌',loy:84,status:'一般',apt:'騎兵'},
 '齊藤京子':{force:'劉備',city:'小沛',loy:84,status:'一般',apt:'弩兵'},
 '井口眞緒':{force:'在野',city:'平原',loy:45,status:'在野',apt:'剣盾兵'}
};
function card(o){return `<div class="officer"><span class="face">${o.name[0]}</span><div><b>${o.name}</b><small> 統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}</small></div></div>`}
function decorateStart(){
 const intro=document.querySelector('.start .intro');if(!intro)return;
 let picker=intro.querySelector('.v2457-mode-picker');
 if(!picker){picker=document.createElement('div');picker.className='v2457-mode-picker';intro.prepend(picker)}
 picker.innerHTML=`<b>主人公モード</b><div><button data-v2457-mode="kumi" class="${mode==='kumi'?'selected':''}">佐々木久美</button><button data-v2457-mode="mikuni" class="${mode==='mikuni'?'selected':''}">髙橋未来虹</button></div>`;
 picker.querySelectorAll('[data-v2457-mode]').forEach(btn=>btn.onclick=()=>{mode=btn.dataset.v2457Mode;window.V2457_MODE=mode;if(mode==='mikuni')startCity='上党';window.startScreen()});
 if(mode!=='mikuni')return;
 startCity='上党';
 const titles=[...intro.querySelectorAll(':scope > .title')];if(titles[0])titles[0].textContent='シナリオ：ハッピーオーラの旗揚げ ― 髙橋未来虹モード';
 const ps=[...intro.querySelectorAll(':scope > p')];if(ps[0])ps[0].textContent='西暦190年。髙橋未来虹、上村ひなの、森本茉莉、山口陽世の三期生4人が上党で旗揚げする。ゲーム進行・都市操作・防衛・出兵は佐々木久美モードと完全共通。';
 if(ps[1])ps[1].textContent='開始都市は上党固定。まず三期生4人で群雄割拠を生き抜き、各地の日向坂メンバーを集めて天下統一を目指す。';
 const init=titles.find(t=>t.textContent.includes('初期武将'));if(init){let n=init.nextElementSibling;while(n&&n.classList?.contains('officer')){const q=n.nextElementSibling;n.remove();n=q}init.insertAdjacentHTML('afterend',THIRD.map(card).join(''))}
 const nm=document.getElementById('startName');if(nm)nm.textContent='上党';
 const begin=document.getElementById('begin');if(begin)begin.textContent='上党で三期生軍を旗揚げ';
 document.querySelectorAll('[data-start]').forEach(btn=>{const ok=btn.dataset.start==='上党';btn.disabled=!ok;btn.classList.toggle('sel',ok)});
}
window.startScreen=function(){if(mode==='mikuni')startCity='上党';const r=baseStartScreen.apply(this,arguments);decorateStart();return r};
function applyMikuniStart(){
 if(!state)return;
 state.modeId='mikuni';state.rulerName='髙橋未来虹';state.selected='上党';
 Object.entries(OLD).forEach(([name,d])=>{const o=state.officers.find(x=>x.name===name);if(o)Object.assign(o,d,{type:d.apt,acted:0})});
 THIRD.forEach((d,i)=>{let o=state.officers.find(x=>x.name===d.name);if(!o){o={name:d.name};state.officers.push(o)}Object.assign(o,d,{force:'日向軍',city:'上党',loy:i?98-i:100,status:i===0?'君主':'一般',type:d.apt,acted:0})});
 const home=state.cities?.['上党'];if(home){home.force='日向軍';home.gold=1600;home.food=22000;home.troops=5000;home.morale=75}
 state.logs=[];if(typeof log==='function')log('上党に髙橋未来虹を君主とする三期生4人の日向軍が旗揚げした。');
}
window.beginGame=function(){
 if(mode!=='mikuni')return baseBeginGame.apply(this,arguments);
 startCity='上党';
 const r=baseBeginGame.apply(this,arguments);
 applyMikuniStart();
 if(typeof window.render==='function')window.render();
 return r;
};
// Display only; campaign state is not rewritten here.
const baseRender=window.render;
window.render=function(){const r=baseRender.apply(this,arguments);if(state?.modeId==='mikuni'&&!state.battle){document.querySelectorAll('.dashboard .panel').forEach(p=>{if(p.textContent.includes('君主 佐々木久美'))p.innerHTML=p.innerHTML.replace('君主 佐々木久美','君主 髙橋未来虹')})}return r};
const style=document.createElement('style');style.textContent=`.v2457-mode-picker{margin:0 0 12px;padding:10px;border:1px solid #735e3d;background:#17120d}.v2457-mode-picker>div{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:7px}.v2457-mode-picker button.selected{outline:2px solid #d4b46b}`;document.head.appendChild(style);
window.V2457={getMode:()=>mode};
})();
