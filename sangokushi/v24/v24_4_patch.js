// v24.4 — recruit enemy officers; success chance is exactly 100 - loyalty
(()=>{
 const HN=new Set((window.HINATA_WORLD||[]).map(x=>x[0]));
 window.hire=function(o){
   const ts=state.officers.filter(x=>{
     if(x.force==='日向軍'||x.status==='君主'||x.status==='捕虜')return false;
     if(HN.has(x.name)&&x.discovered===false)return false;
     if(x.force==='在野')return x.city===state.selected;
     return !!x.force;
   });
   if(!ts.length)return alert('登用可能な武将はいません。');
   const ordered=ts.slice().sort((a,b)=>{
     const ae=a.force==='在野'?0:1,be=b.force==='在野'?0:1;
     return ae-be||a.loy-b.loy||a.name.localeCompare(b.name,'ja');
   });
   showModal(`<h2>登用</h2><p>敵国武将の成功率は <b>100－忠誠度</b> です。君主・捕虜・所在未判明の人物は対象外です。</p><div class="choice-list">${ordered.map(t=>{const enemy=t.force!=='在野',chance=enemy?Math.max(0,Math.min(100,100-(Number(t.loy)||0))):Math.max(5,Math.min(95,25+o.cha*.55));return `<button data-v244-target="${t.name}">${typeof v241FaceHtml==='function'?v241FaceHtml(t.name):''}<span><b>${t.name}</b><br>${t.force}・${t.city}　忠誠${t.loy??'―'}　成功率${Math.round(chance)}%</span></button>`}).join('')}</div><button data-close>閉じる</button>`);
   if(typeof v241ApplyFace==='function')modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
   modalCard.querySelectorAll('[data-v244-target]').forEach(b=>b.onclick=()=>{
     const t=state.officers.find(x=>x.name===b.dataset.v244Target);
     const enemy=t.force!=='在野';
     const chance=enemy?Math.max(0,Math.min(100,100-(Number(t.loy)||0))):Math.max(5,Math.min(95,25+o.cha*.55));
     const success=Math.random()*100<chance;
     const ad=typeof v241Advice==='function'?v241Advice(success,`${t.name}の登用`):null;
     showModal(`<h2>${t.name}を登用</h2>${ad&&typeof v241AdviceHtml==='function'?v241AdviceHtml(ad):''}<p>所属：<b>${t.force}</b>　忠誠：<b>${t.loy??'―'}</b></p><p>成功率：<b>${Math.round(chance)}%</b>${enemy?'（100－忠誠度）':'（在野武将）'}</p><p>実行武将：<b>${o.name}</b>　必要金180</p><button id="v244-go" class="primary">登用を実行</button><button data-close>中止</button>`);
     if(typeof v241ApplyFace==='function')modalCard.querySelectorAll('[data-v241-face]').forEach(el=>v241ApplyFace(el,el.dataset.v241Face));
     modalCard.querySelector('#v244-go').onclick=()=>{
       const c=cityObj();if(c.gold<180)return alert('金不足');c.gold-=180;
       if(success){const old=t.force;t.force='日向軍';t.city=state.selected;t.status='一般';t.loy=70;t.discovered=true;closeModal();finish(o,`${old}軍の${t.name}を登用しました。`)}
       else{closeModal();finish(o,`${t.name}の登用に失敗しました。`)}
     };
   });
 };
})();