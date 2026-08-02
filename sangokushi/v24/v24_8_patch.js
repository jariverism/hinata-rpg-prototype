// v24.8 — rebalance Hinatazaka WAR from 50m sprint times and CHA from center/front/meet-and-greet results
(()=>{
const V248_WAR={
 '影山優佳':93,'加藤史帆':96,'東村芽依':95,'潮紗理菜':94,'渡邉美穂':95,'髙橋未来虹':95,
 '小坂菜緒':91,'金村美玖':88,'河田陽菜':88,'片山紗希':88,'佐々木久美':85,'清水理央':85,
 '石塚瑶季':85,'大田美月':85,'森本茉莉':84,'佐々木美玲':84,'柿崎芽実':84,'丹生明里':83,
 '佐藤優羽':83,'鶴崎仁香':83,'松田好花':80,'濱岸ひより':80,'平岡海月':79,'富田鈴花':78,
 '高瀬愛奈':77,'山口陽世':76,'高本彩花':76,'正源司陽子':75,'上村ひなの':73,'藤嶌果歩':73,
 '宮田愛萌':72,'竹内希来里':69,'渡辺莉奈':67,'小西夏菜実':66,'岸帆夏':64,'山下葉留花':60,
 '井口眞緒':60,'齊藤京子':59,'宮地すみれ':50,'平尾帆夏':45
};

// CHA combines career center record, front-row record and meet-and-greet sell-through.
const V248_CHARM={
 '小坂菜緒':99,'加藤史帆':96,'金村美玖':97,'齊藤京子':96,'正源司陽子':97,'丹生明里':92,
 '藤嶌果歩':94,'佐々木美玲':92,'上村ひなの':91,'河田陽菜':93,'松田好花':92,'影山優佳':90,
 '佐々木久美':91,'東村芽依':88,'渡邉美穂':91,'宮田愛萌':87,'富田鈴花':88,'高本彩花':87,
 '濱岸ひより':86,'髙橋未来虹':89,'森本茉莉':88,'山口陽世':86,'平尾帆夏':88,'宮地すみれ':91,
 '山下葉留花':86,'清水理央':87,'石塚瑶季':85,'竹内希来里':83,'渡辺莉奈':86,'小西夏菜実':84,
 '潮紗理菜':84,'高瀬愛奈':80,'井口眞緒':76,'柿崎芽実':89,'岸帆夏':80,
 '大野愛実':95,'松尾桜':87,'鶴崎仁香':86,'佐藤優羽':85,'片山紗希':84,'大田美月':83,
 '高井俐香':82,'蔵盛妃那乃':82,'坂井新奈':80,'下田衣珠季':80
};
window.HINATA_WAR=V248_WAR;
window.HINATA_CHARM=V248_CHARM;

function applyBase(){
 if(typeof HINATA_START!=='undefined')HINATA_START.forEach(o=>{
   if(Number.isFinite(V248_WAR[o.name]))o.war=V248_WAR[o.name];
   if(Number.isFinite(V248_CHARM[o.name]))o.cha=V248_CHARM[o.name];
 });
}
function applyState(){
 const s=typeof state!=='undefined'?state:null;
 if(!s?.officers)return;
 s.officers.forEach(o=>{
   if(Number.isFinite(V248_WAR[o.name]))o.war=V248_WAR[o.name];
   if(Number.isFinite(V248_CHARM[o.name]))o.cha=V248_CHARM[o.name];
   if(Number.isFinite(V248_WAR[o.name])){
     // Re-evaluate default troop type after the stat rebalance, while preserving ranged specialists.
     if(o.apt!=='弩兵')o.apt=o.war>=90?'騎兵':o.war>=80?'槍兵':'歩兵';
   }
 });
 if(s.physicalCharmVersion!==18){
   s.physicalCharmVersion=18;
   if(typeof log==='function')log('50m走と活動実績を基準に、日向坂武将の武力・魅力を再評価した。');
 }
}
applyBase();
const oldRender=window.render;
window.render=function(){applyBase();applyState();return oldRender()};
const oldBegin=window.beginGame;
window.beginGame=function(){applyBase();oldBegin();applyState();window.render()};
setTimeout(()=>{
 try{
   applyBase();
   if(typeof state!=='undefined'&&state)window.render();
   else if(typeof startScreen==='function')startScreen();
 }catch(e){console.warn('v24.8 stat patch:',e)}
},0);
})();
