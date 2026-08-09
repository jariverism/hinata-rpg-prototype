// v24.68 deployment guard — do not consume mole pledges before large-siege deployment is confirmed
(()=>{
if(window.V2468_DEPLOYMENT_GUARD)return;window.V2468_DEPLOYMENT_GUARD=true;
const previousRender=window.render;
window.render=function(){
 const b=state?.battle;
 if(!b?.v2439LargeSiege||b.v2439DeploymentDone||!state?.v2424Moles)return previousRender.apply(this,arguments);
 const pledges=state.v2424Moles,checked=b._v2424MolesChecked;
 state.v2424Moles={};
 try{return previousRender.apply(this,arguments)}
 finally{
  state.v2424Moles=pledges;
  if(checked===undefined)delete b._v2424MolesChecked;else b._v2424MolesChecked=checked;
 }
};
})();
