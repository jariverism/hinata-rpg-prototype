(()=>{
'use strict';
function fail(msg){let e=document.getElementById('rogueCleanGuard');if(!e){e=document.createElement('div');e.id='rogueCleanGuard';e.style.cssText='position:fixed;z-index:99999;left:8px;right:8px;top:8px;padding:10px;border:2px solid #ff8d7a;background:#3a1111;color:#fff;font-weight:900';document.body.appendChild(e)}e.textContent=msg}
function run(){
 const ok=!!window.HINATA_ROGUE_FIXED_V8&&!!window.HINATA_CANONICAL_STATS&&!!window.HINATA_ROGUE_ROSTER_V7;
 if(!ok){fail('ROGUE 0.8能力エンジンの読み込みに失敗しています。この画面ではプレイを続けないでください。');return}
 try{if(typeof state!=='undefined'&&state?.rogue){window.HINATA_ROGUE_FIXED_V8.normalize();if(typeof window.render==='function')window.render()}}catch(e){console.error(e);fail('ROGUE 0.8能力再計算に失敗しました。')}
 const s=document.querySelector('header h1 small');if(s)s.textContent='Prototype 0.8 CLEAN';
 let b=document.getElementById('rogueStatEngineBadge');if(!b){b=document.createElement('div');b.id='rogueStatEngineBadge';b.style.cssText='font-size:11px;color:#d9c77b;margin-top:3px';document.querySelector('header>div')?.appendChild(b)}b.textContent='能力Engine v8 / CLEAN';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});else setTimeout(run,0);
})();