// v24.44 — preserve dashboard event handlers in the 194 scenario and dedupe scenario picker
(()=>{
const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
if(desc?.get&&desc?.set&&!window.V2444InnerHTMLGuard){
 window.V2444InnerHTMLGuard=true;
 Object.defineProperty(Element.prototype,'innerHTML',{
  configurable:desc.configurable,enumerable:desc.enumerable,get:desc.get,
  set(value){
   try{
    if(this.classList?.contains('dashboard')&&state?.scenarioId==='194-mikuni'&&typeof value==='string'&&value.includes('君主 髙橋未来虹')){
     const ruler=[...this.querySelectorAll('b')].find(n=>n.textContent.includes('君主 佐々木久美'));
     if(ruler){ruler.textContent=ruler.textContent.replace('佐々木久美','髙橋未来虹');return}
    }
   }catch(e){}
   return desc.set.call(this,value);
  }
 });
}
function dedupe(){const nodes=[...document.querySelectorAll('.v2443-scenario-picker')];nodes.slice(1).forEach(n=>n.remove())}
const previousRender=window.render;
window.render=function(){const r=previousRender.apply(this,arguments);setTimeout(dedupe,10);return r};
const previousStart=window.startScreen;
window.startScreen=function(){const r=previousStart.apply(this,arguments);dedupe();return r};
dedupe();
})();
