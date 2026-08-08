// v24.61 — final guard for intelligence-based battle-tactic counts
(()=>{
if(window.V2461_TACTIC_GUARD)return;window.V2461_TACTIC_GUARD=true;
function limit(intel){const i=Number(intel)||0;return i>=100?4:i>=90?3:i>=80?2:1}
function used(b,name){const v=b?.v2432TacticUsed?.[name];return v===true?1:Math.max(0,Number(v)||0)}
function decorate(){
 const b=state?.battle;if(!b)return;
 const p=(b.units||[]).find(u=>u.side==='player'&&u.name===b.selected&&Number(u.troops)>0);if(!p)return;
 const n=used(b,p.name),max=limit(p.int);
 document.querySelectorAll('[data-ba="tactic"]').forEach(btn=>{btn.disabled=!!p.done||n>=max;btn.textContent=`戦場計略 ${n}/${max}`;btn.title=`知力${p.int}：一戦${max}回まで`});
 const modal=document.getElementById('modalCard');
 if(modal&&modal.textContent.includes('戦場計略')){
  const small=modal.querySelector('small');if(small&&small.textContent.includes('一戦につき1回'))small.textContent=`この武将は知力${p.int}のため、一戦につき${max}回まで使用可能。成否は主に知力差と対象の忠誠度で決まります。`;
 }
}
const prevRender=window.render;
window.render=function(){const r=prevRender.apply(this,arguments);setTimeout(decorate,0);return r};
document.addEventListener('click',e=>{if(e.target.closest?.('[data-ba="tactic"],[data-v2432-kind],[data-v2432-tactic-target]'))setTimeout(decorate,0)},true);
function selfTest(){return limit(100)===4&&limit(99)===3&&limit(90)===3&&limit(89)===2&&limit(80)===2&&limit(79)===1&&used({v2432TacticUsed:{A:true}},'A')===1&&used({v2432TacticUsed:{A:3}},'A')===3}
window.V2461={limit,used,selfTest};
})();
