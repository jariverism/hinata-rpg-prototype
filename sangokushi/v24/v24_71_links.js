// v24.71 — formation links: nearby cohort allies strengthen attacks and steady morale
(()=>{
if(window.V2471_LINKS)return;window.V2471_LINKS=true;
const V39=window.V2439||{},V70=window.V2470||{};
const GROUPS=[
 {id:'third',label:'三期生連携',names:['髙橋未来虹','上村ひなの','森本茉莉','山口陽世']},
 {id:'fifth',label:'五期生連携',names:['大田美月','大野愛実','片山紗希','蔵盛妃那乃','坂井新奈','佐藤優羽','下田衣珠季','高井俐香','鶴崎仁香','松尾桜']},
 {id:'founders',label:'旗揚げ組連携',names:['佐々木久美','加藤史帆','齊藤京子','井口眞緒']}
];
const BY_NAME=new Map();for(const g of GROUPS)for(const n of g.names)BY_NAME.set(n,g);
const previousNormalDamage=typeof V39.normalDamage==='function'?V39.normalDamage:null;
const previousRender=window.render;
function dist(a,b){return Math.abs(Number(a?.x)-Number(b?.x))+Math.abs(Number(a?.y)-Number(b?.y))}
function alive(b,side){return (b?.units||[]).filter(u=>!u.v2436Structure&&!u.v2468Routed&&u.side===side&&Number(u.troops)>0)}
function groupOf(u){return BY_NAME.get(u?.name)||null}
function linkedAllies(b,u,range=2){const g=groupOf(u);if(!g)return [];return alive(b,u.side).filter(a=>a!==u&&g.names.includes(a.name)&&dist(a,u)<=range)}
function linkLabel(b,u){const xs=linkedAllies(b,u);const g=groupOf(u);return xs.length&&g?`${g.label}：${xs.map(x=>x.name).join('・')}`:''}
if(previousNormalDamage){
 V39.normalDamage=function(attacker,target,b){const r=previousNormalDamage.apply(this,arguments)||{damage:1,notes:[]};const links=linkedAllies(b,attacker);if(links.length){r.damage=Math.max(1,Math.floor(Number(r.damage||1)*1.10));r.notes=[...(r.notes||[]),groupOf(attacker)?.label||'連携']}return r};
}
function steadyLowMorale(b){
 if(!b?.v2439LargeSiege||!b.v2439DeploymentDone)return;
 const day=Number(b.day)||1;
 for(const u of [...alive(b,'player'),...alive(b,'enemy')]){
  if(Number(u.v2471SteadyDay)===day||Number(u.morale)>25||Number(u.morale)<=10)continue;
  const links=linkedAllies(b,u);if(!links.length)continue;
  const before=Number(u.morale)||0;u.morale=Math.min(100,before+6);u.v2471SteadyDay=day;
  if(u.side==='player'&&typeof V70.gain==='function'){V70.gain(u,5,'連携');for(const a of links)V70.gain(a,2,'連携')}
  b.logs=b.logs||[];b.logs.unshift(`${groupOf(u)?.label||'連携'}！ ${links[0].name}隊の支えで${u.name}隊が踏みとどまり、士気${before}→${u.morale}。`);
 }
}
function decorate(){
 const b=state?.battle;if(!b?.v2439LargeSiege||!b.v2439DeploymentDone)return;steadyLowMorale(b);
 const p=(b.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0&&!u.v2468Routed);if(!p)return;
 const text=linkLabel(b,p),panel=document.querySelector('.v2439-selected')||document.querySelector('.battle-actions')?.parentElement;if(!panel)return;
 panel.querySelector?.('.v2471-link-note')?.remove();if(!text)return;
 const note=document.createElement('div');note.className='v2471-link-note';note.textContent=`連携中：${text}（通常攻撃＋10%）`;panel.appendChild(note);
}
window.render=function(){const b=state?.battle;if(b)steadyLowMorale(b);const r=previousRender.apply(this,arguments);setTimeout(decorate,560);return r};
const style=document.createElement('style');style.textContent=`.v2471-link-note{margin-top:6px;padding:5px 7px;border:1px solid #526b7a;background:#111b21;color:#bfe8ff;font-size:10px;line-height:1.35}`;document.head.appendChild(style);
window.V2471={GROUPS,groupOf,linkedAllies,linkLabel,steadyLowMorale};
})();
