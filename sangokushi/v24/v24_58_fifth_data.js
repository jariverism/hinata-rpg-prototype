// v24.58 — fifth-generation officers for Mikuni mode; static data only after initial spawn
(()=>{
if(window.V2458_FIFTH_DATA)return;window.V2458_FIFTH_DATA=true;
const FIFTH=[
 {name:'大田美月',lead:83,war:93,int:76,pol:75,cha:90,apt:'騎兵',force:'袁紹',city:'鄴',loy:76},
 {name:'大野愛実',lead:97,war:90,int:84,pol:84,cha:99,apt:'剣盾兵',force:'在野',city:'洛陽',loy:48},
 {name:'片山紗希',lead:92,war:96,int:74,pol:73,cha:96,apt:'騎兵',force:'孫堅',city:'建業',loy:79},
 {name:'蔵盛妃那乃',lead:82,war:73,int:87,pol:85,cha:88,apt:'弩兵',force:'劉備',city:'小沛',loy:74},
 {name:'坂井新奈',lead:75,war:63,int:59,pol:62,cha:86,apt:'剣盾兵',force:'在野',city:'桂陽',loy:42},
 {name:'佐藤優羽',lead:86,war:91,int:91,pol:88,cha:95,apt:'槍兵',force:'馬騰',city:'天水',loy:78},
 {name:'下田衣珠季',lead:76,war:88,int:58,pol:60,cha:86,apt:'騎兵',force:'在野',city:'武陵',loy:40},
 {name:'高井俐香',lead:86,war:65,int:86,pol:86,cha:94,apt:'弩兵',force:'劉表',city:'襄陽',loy:78},
 {name:'鶴崎仁香',lead:82,war:91,int:95,pol:92,cha:91,apt:'弩兵',force:'劉焉',city:'成都',loy:80},
 {name:'松尾桜',lead:92,war:85,int:90,pol:88,cha:97,apt:'槍兵',force:'曹操',city:'許昌',loy:81}
];
const NAMES=new Set(FIFTH.map(x=>x.name));
const STATIC_KEYS=['lead','war','int','pol','cha','apt'];
function applyOne(d){
 if(!state?.officers)return;
 let o=state.officers.find(x=>x.name===d.name);
 if(!o){
  // Initial spawn only: starting force/city/status/loyalty are assigned exactly once.
  o={name:d.name,lead:d.lead,war:d.war,int:d.int,pol:d.pol,cha:d.cha,apt:d.apt,type:d.apt,
     force:d.force,city:d.city,loy:d.loy,status:d.force==='在野'?'在野':'一般',acted:0,
     statSource:'五期生固定値',v2458Spawned:true};
  state.officers.push(o);
  return o;
 }
 // Existing officer: NEVER overwrite campaign-progress fields.
 // Search/recruit/move/capture must own force, city, status, loyalty and acted state.
 for(const k of STATIC_KEYS)o[k]=d[k];
 o.type=d.apt;o.statSource='五期生固定値';o.v2458Spawned=true;
 return o;
}
function apply(){
 if(!state||state.modeId!=='mikuni')return;
 FIFTH.forEach(applyOne);
 state.v2458FifthData=true;
}
function lifecycleSelfTest(){
 const snapshot=state;if(!state)return true;
 try{
  const sakai=state.officers.find(o=>o.name==='坂井新奈'),ono=state.officers.find(o=>o.name==='大野愛実');
  if(!sakai||!ono)return false;
  const sb={force:sakai.force,city:sakai.city,status:sakai.status,loy:sakai.loy,acted:sakai.acted};
  const ob={force:ono.force,city:ono.city,status:ono.status,loy:ono.loy,acted:ono.acted};
  Object.assign(sakai,{force:'在野',city:'上党',status:'在野',loy:41,acted:7});
  Object.assign(ono,{force:'日向軍',city:'洛陽',status:'一般',loy:72,acted:7});
  apply();
  const ok=sakai.force==='在野'&&sakai.city==='上党'&&sakai.status==='在野'&&sakai.loy===41&&sakai.acted===7&&
    ono.force==='日向軍'&&ono.city==='洛陽'&&ono.status==='一般'&&ono.loy===72&&ono.acted===7;
  Object.assign(sakai,sb);Object.assign(ono,ob);return ok;
 }catch(e){console.error('v24.58 lifecycle self-test:',e);return false}
}
const prevBegin=window.beginGame;
window.beginGame=function(){const r=prevBegin.apply(this,arguments);apply();return r};
const prevRender=window.render;
window.render=function(){if(state?.modeId==='mikuni'&&!state?.battle)apply();return prevRender.apply(this,arguments)};
setTimeout(()=>{try{apply()}catch(e){console.error('v24.58 fifth data:',e)}},0);
window.V2458={FIFTH,NAMES,apply,applyOne,lifecycleSelfTest};
})();
