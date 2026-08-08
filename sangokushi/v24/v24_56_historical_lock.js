// v24.56 — one canonical stat source for all non-Hinata officers
(()=>{
if(window.V2456_HISTORICAL_LOCK)return;window.V2456_HISTORICAL_LOCK=true;
const EXACT=window.ROTK4_EXACT_STATS||{};
const FALLBACK=window.ROTK4_UNCONFIRMED_FALLBACK||{};
const HINATA=new Set();
try{(HINATA_START||[]).forEach(o=>HINATA.add(o.name))}catch(e){}
try{(HINATA_WORLD||[]).forEach(x=>HINATA.add(x[0]))}catch(e){}
['髙橋未来虹','上村ひなの','森本茉莉','山口陽世','大田美月','大野愛実','片山紗希','蔵盛妃那乃','坂井新奈','佐藤優羽','下田衣珠季','高井俐香','鶴崎仁香','松尾桜'].forEach(n=>HINATA.add(n));

// Freeze the fallback rows once at load. They must never be regenerated from later scenario values.
const FIXED_FALLBACK={};Object.entries(FALLBACK).forEach(([n,v])=>FIXED_FALLBACK[n]={lead:Number(v.lead),war:Number(v.war),int:Number(v.int),pol:Number(v.pol),cha:Number(v.cha)});
window.ROTK4_FIXED_FALLBACK=FIXED_FALLBACK;

function aptitude(s){
 if(Number(s.int)>=90&&Number(s.war)<80)return '弩兵';
 if(Number(s.war)>=90)return '騎兵';
 if(Number(s.war)>=80)return '槍兵';
 return '剣盾兵';
}
function rowFor(name){
 const e=EXACT[name];if(e)return {lead:e[0],war:e[1],int:e[2],pol:e[3],cha:e[4],exact:true};
 const f=FIXED_FALLBACK[name];if(f)return {...f,exact:false};
 return null;
}
function applyOfficer(o){
 if(!o?.name||HINATA.has(o.name))return false;
 const s=rowFor(o.name);if(!s)return false;
 o.lead=s.lead;o.war=s.war;o.int=s.int;o.pol=s.pol;o.cha=s.cha;
 o.apt=aptitude(s);if(o.type)o.type=o.apt;
 o.statSource=s.exact?'SFC版三國志IV固定値':'三國志IV非確認武将・固定補完値';
 return true;
}
function applyBattleUnit(u){
 if(!u?.name||HINATA.has(u.name))return;
 const s=rowFor(u.name);if(!s)return;
 u.lead=s.lead;u.war=s.war;u.int=s.int;u.type=aptitude(s);
}
function applyAll(){
 try{(HIST||[]).forEach(applyOfficer)}catch(e){}
 try{(window.EXTRA_HISTORICAL_OFFICERS||[]).forEach(applyOfficer)}catch(e){}
 if(state?.officers)state.officers.forEach(applyOfficer);
 if(state?.battle?.units)state.battle.units.forEach(applyBattleUnit);
 if(state&&state.historicalStatVersion!==156){
  state.historicalStatVersion=156;
  if(typeof log==='function')log(`歴史武将の能力値を三國志IV固定表へ統一した（確認済${Object.keys(EXACT).length}名）。`);
 }
}
const previousRender=window.render;
window.render=function(){applyAll();const r=previousRender.apply(this,arguments);applyAll();return r};
const previousBegin=window.beginGame;
if(typeof previousBegin==='function')window.beginGame=function(){const r=previousBegin.apply(this,arguments);applyAll();return r};
applyAll();setTimeout(applyAll,0);
window.V2456_HIST={rowFor,applyAll,exactCount:Object.keys(EXACT).length,fallbackCount:Object.keys(FIXED_FALLBACK).length};
})();
