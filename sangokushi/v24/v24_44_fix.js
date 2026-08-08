// v24.44 — safe 194 scenario UI fixes without intercepting innerHTML
(()=>{
function dedupeScenarioPicker(){
 const nodes=[...document.querySelectorAll('.v2443-scenario-picker')];
 nodes.slice(1).forEach(n=>n.remove());
}
function patchRulerLabel(){
 if(state?.scenarioId!=='194-mikuni'||state?.battle)return;
 const dashboard=document.querySelector('.dashboard');if(!dashboard)return;
 const ruler=[...dashboard.querySelectorAll('b')].find(n=>/^君主\s+佐々木久美$/.test(n.textContent.trim()));
 if(ruler)ruler.textContent='君主 髙橋未来虹';
}
function applyUiFixes(){dedupeScenarioPicker();patchRulerLabel()}

const previousRender=window.render;
window.render=function(){
 const result=previousRender.apply(this,arguments);
 applyUiFixes();setTimeout(applyUiFixes,0);
 return result;
};

const previousStart=window.startScreen;
window.startScreen=function(){
 const result=previousStart.apply(this,arguments);
 dedupeScenarioPicker();
 return result;
};

applyUiFixes();
})();
