// v24.74 — canonical fixed stats for all Hinatazaka officers used by Sangokushi/ROGUE
(()=>{
if(window.V2474_HINATA_FIXED_STATS)return;window.V2474_HINATA_FIXED_STATS=true;
const KEYS=['lead','war','int','pol','cha'];
const STATS={
 '佐々木久美':{lead:98,war:85,int:85,pol:92,cha:91},
 '加藤史帆':{lead:91,war:96,int:57,pol:61,cha:96},
 '齊藤京子':{lead:80,war:95,int:51,pol:78,cha:96},
 '井口眞緒':{lead:68,war:60,int:64,pol:82,cha:76},
 '潮紗理菜':{lead:86,war:94,int:69,pol:74,cha:84},
 '影山優佳':{lead:93,war:93,int:100,pol:96,cha:90},
 '佐々木美玲':{lead:87,war:94,int:62,pol:72,cha:92},
 '高瀬愛奈':{lead:79,war:77,int:81,pol:81,cha:80},
 '高本彩花':{lead:76,war:76,int:56,pol:67,cha:87},
 '東村芽依':{lead:83,war:95,int:49,pol:63,cha:88},
 '金村美玖':{lead:92,war:92,int:82,pol:87,cha:97},
 '河田陽菜':{lead:82,war:88,int:49,pol:64,cha:93},
 '小坂菜緒':{lead:92,war:93,int:75,pol:83,cha:99},
 '富田鈴花':{lead:78,war:78,int:62,pol:71,cha:88},
 '丹生明里':{lead:87,war:90,int:70,pol:78,cha:92},
 '濱岸ひより':{lead:75,war:80,int:45,pol:59,cha:86},
 '松田好花':{lead:86,war:80,int:91,pol:91,cha:92},
 '宮田愛萌':{lead:81,war:72,int:91,pol:90,cha:87},
 '渡邉美穂':{lead:91,war:95,int:84,pol:86,cha:91},
 '上村ひなの':{lead:78,war:91,int:65,pol:84,cha:91},
 '森本茉莉':{lead:84,war:84,int:72,pol:80,cha:88},
 '山口陽世':{lead:90,war:76,int:55,pol:70,cha:86},
 '髙橋未来虹':{lead:95,war:95,int:88,pol:75,cha:89},
 '正源司陽子':{lead:86,war:75,int:92,pol:94,cha:97},
 '藤嶌果歩':{lead:85,war:91,int:55,pol:69,cha:94},
 '平尾帆夏':{lead:65,war:45,int:72,pol:78,cha:88},
 '宮地すみれ':{lead:72,war:50,int:90,pol:90,cha:91},
 '山下葉留花':{lead:72,war:60,int:72,pol:77,cha:86},
 '渡辺莉奈':{lead:70,war:67,int:50,pol:63,cha:86},
 '清水理央':{lead:81,war:85,int:62,pol:71,cha:87},
 '石塚瑶季':{lead:81,war:85,int:67,pol:73,cha:85},
 '竹内希来里':{lead:72,war:69,int:61,pol:69,cha:83},
 '小西夏菜実':{lead:69,war:66,int:50,pol:62,cha:84},
 '岸帆夏':{lead:72,war:64,int:74,pol:76,cha:80},
 '平岡海月':{lead:79,war:79,int:63,pol:72,cha:88},
 '柿崎芽実':{lead:84,war:84,int:73,pol:79,cha:89},
 '大田美月':{lead:83,war:93,int:76,pol:75,cha:90},
 '大野愛実':{lead:97,war:90,int:84,pol:84,cha:99},
 '片山紗希':{lead:92,war:96,int:74,pol:73,cha:96},
 '蔵盛妃那乃':{lead:82,war:73,int:87,pol:85,cha:88},
 '坂井新奈':{lead:75,war:63,int:59,pol:62,cha:86},
 '佐藤優羽':{lead:86,war:91,int:91,pol:88,cha:95},
 '下田衣珠季':{lead:76,war:88,int:58,pol:60,cha:86},
 '高井俐香':{lead:86,war:65,int:86,pol:86,cha:94},
 '鶴崎仁香':{lead:82,war:91,int:95,pol:92,cha:91},
 '松尾桜':{lead:92,war:85,int:90,pol:88,cha:97}
};
function copyRow(row){return Object.fromEntries(KEYS.map(k=>[k,Number(row?.[k])||0]))}
function applyOfficer(o){
 const d=o&&STATS[o.name];if(!d)return false;
 for(const k of KEYS)o[k]=d[k];
 o.statSource='日向坂固定能力表v24.74';
 return true;
}
function applySources(){
 try{(HINATA_START||[]).forEach(applyOfficer)}catch(e){}
 try{for(const d of window.V2458?.FIFTH||[]){const s=STATS[d.name];if(s)for(const k of KEYS)d[k]=s[k]}}catch(e){}
}
function rogueOwnsFinalStats(){return !!(state?.modeId==='rogue'&&window.HINATA_ROGUE_ROSTER_STAT_V7)}
function applyState(){
 if(typeof state==='undefined'||!state?.officers||rogueOwnsFinalStats())return false;
 let changed=false;
 for(const o of state.officers){const d=STATS[o.name];if(!d)continue;for(const k of KEYS)if(Number(o[k])!==d[k]){o[k]=d[k];changed=true}o.statSource='日向坂固定能力表v24.74'}
 if(state.battle?.units)for(const u of state.battle.units){const d=STATS[u.name];if(!d)continue;for(const k of ['lead','war','int'])u[k]=d[k]}
 state.hinataFixedStatVersion=174;
 return changed;
}
function decorate(){
 if(typeof state==='undefined'||!state||state.battle)return;
 document.querySelectorAll('.officer').forEach(el=>{
  const name=el.querySelector('b')?.textContent?.trim(),o=(state.officers||[]).find(x=>x.name===name);if(!o||!STATS[name])return;
  const small=el.querySelector('small');if(!small)return;
  small.textContent=small.textContent.replace(/統\d+\s*武\d+\s*知\d+\s*政\d+\s*魅\d+/,`統${o.lead} 武${o.war} 知${o.int} 政${o.pol} 魅${o.cha}`);
 });
}
applySources();
const prevRender=window.render;
window.render=function(){
 applySources();applyState();const r=prevRender.apply(this,arguments);applyState();decorate();return r;
};
if(typeof window.beginGame==='function'){
 const prevBegin=window.beginGame;
 window.beginGame=function(){applySources();const r=prevBegin.apply(this,arguments);applyState();if(typeof window.render==='function')window.render();return r};
}
if(typeof window.beginBattle==='function'){
 const prevBattle=window.beginBattle;
 window.beginBattle=function(){applyState();const r=prevBattle.apply(this,arguments);applyState();return r};
}
setTimeout(()=>{try{applySources();if(typeof state!=='undefined'&&state){applyState();decorate()}else if(typeof startScreen==='function')startScreen()}catch(e){console.error('v24.74 fixed stats:',e)}},0);
window.HINATA_CANONICAL_STATS=STATS;
window.V2474={STATS,applyOfficer,applySources,applyState,copyRow,count:Object.keys(STATS).length};
})();
