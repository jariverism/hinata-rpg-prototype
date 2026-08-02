// v24.7 — rebalance Hinatazaka officer intelligence using three academic-test result sets
(()=>{
const V247_INTELLIGENCE={
 '影山優佳':100,
 '宮田愛萌':91,
 '松田好花':91,
 '宮地すみれ':90,
 '鶴崎仁香':89,
 '髙橋未来虹':88,
 '佐藤優羽':86,
 '佐々木久美':85,
 '正源司陽子':83,
 '渡邉美穂':84,
 '金村美玖':82,
 '松尾桜':82,
 '高瀬愛奈':81,
 '蔵盛妃那乃':76,
 '小坂菜緒':75,
 '岸帆夏':74,
 '柿崎芽実':73,
 '山下葉留花':72,
 '森本茉莉':72,
 '平尾帆夏':72,
 '高井俐香':71,
 '丹生明里':70,
 '大野愛実':70,
 '潮紗理菜':69,
 '石塚瑶季':67,
 '上村ひなの':65,
 '井口眞緒':64,
 '大田美月':64,
 '平岡海月':63,
 '清水理央':62,
 '富田鈴花':62,
 '佐々木美玲':62,
 '竹内希来里':61,
 '片山紗希':60,
 '加藤史帆':57,
 '高本彩花':56,
 '藤嶌果歩':55,
 '山口陽世':55,
 '齊藤京子':51,
 '坂井新奈':51,
 '下田衣珠季':50,
 '小西夏菜実':50,
 '渡辺莉奈':50,
 '東村芽依':49,
 '河田陽菜':49,
 '濱岸ひより':45
};
window.HINATA_INTELLIGENCE=V247_INTELLIGENCE;

function v247ApplyStartData(){
 if(typeof HINATA_START==='undefined')return;
 HINATA_START.forEach(o=>{if(Number.isFinite(V247_INTELLIGENCE[o.name]))o.int=V247_INTELLIGENCE[o.name]});
}
function v247ApplyState(){
 if(!window.state&&!state)return;
 const s=window.state||state;
 if(!s?.officers)return;
 s.officers.forEach(o=>{if(Number.isFinite(V247_INTELLIGENCE[o.name]))o.int=V247_INTELLIGENCE[o.name]});
 if(s.intelligenceVersion!==17){
   s.intelligenceVersion=17;
   if(typeof log==='function')log('学力テスト3回分を基準に、日向坂武将の知力を再評価した。');
 }
}

v247ApplyStartData();
const v247BaseRender=window.render;
window.render=function(){v247ApplyStartData();v247ApplyState();return v247BaseRender()};
const v247BaseBegin=window.beginGame;
window.beginGame=function(){v247ApplyStartData();v247BaseBegin();v247ApplyState();window.render()};

// The original game draws the start screen before patches load, so redraw once with the new values.
setTimeout(()=>{
 v247ApplyStartData();
 try{
   if(!state&&typeof startScreen==='function')startScreen();
   else if(state)window.render();
 }catch(e){console.warn('v24.7 intelligence patch:',e)}
},0);
})();
