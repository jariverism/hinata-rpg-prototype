const V19_HINATA_NAMES=new Set([...HINATA_RULERS,...HINATA_OFFICERS].map(x=>x.name));
const V19_TRAITS={
 '佐々木久美':{face:'oval',eyes:'bright',brow:'soft',hair:'longSide',bang:'sweep',smile:'warm',palette:0,orn:'captain'},
 '加藤史帆':{face:'heart',eyes:'cat',brow:'arch',hair:'longWave',bang:'light',smile:'playful',palette:1,orn:'plume'},
 '小坂菜緒':{face:'slim',eyes:'cool',brow:'fine',hair:'longStraight',bang:'heavy',smile:'quiet',palette:2,orn:'jade'},
 '金村美玖':{face:'oval',eyes:'clear',brow:'fine',hair:'longWave',bang:'center',smile:'gentle',palette:3,orn:'gold'},
 '正源司陽子':{face:'round',eyes:'bright',brow:'soft',hair:'mediumFlip',bang:'light',smile:'sunny',palette:4,orn:'flower'},
 '藤嶌果歩':{face:'round',eyes:'round',brow:'soft',hair:'mediumWave',bang:'heavy',smile:'sunny',palette:5,orn:'flower'},
 '上村ひなの':{face:'round',eyes:'dreamy',brow:'soft',hair:'longStraight',bang:'heavy',smile:'mystic',palette:6,orn:'moon'},
 '山口陽世':{face:'round',eyes:'bright',brow:'bold',hair:'shortBob',bang:'light',smile:'brave',palette:1,orn:'plume'},
 '東村芽依':{face:'small',eyes:'cat',brow:'fine',hair:'highPony',bang:'light',smile:'playful',palette:4,orn:'ribbon'},
 '齊藤京子':{face:'slim',eyes:'deep',brow:'arch',hair:'longStraight',bang:'center',smile:'cool',palette:0,orn:'gold'},
 '河田陽菜':{face:'round',eyes:'droop',brow:'soft',hair:'mediumWave',bang:'light',smile:'gentle',palette:5,orn:'flower'},
 '丹生明里':{face:'round',eyes:'bright',brow:'soft',hair:'halfUp',bang:'light',smile:'sunny',palette:4,orn:'ribbon'},
 '富田鈴花':{face:'oval',eyes:'clear',brow:'bold',hair:'longWave',bang:'sweep',smile:'confident',palette:3,orn:'plume'},
 '濱岸ひより':{face:'slim',eyes:'dreamy',brow:'fine',hair:'longWave',bang:'center',smile:'quiet',palette:6,orn:'jade'},
 '高瀬愛奈':{face:'oval',eyes:'clear',brow:'soft',hair:'mediumStraight',bang:'sweep',smile:'gentle',palette:2,orn:'jade'},
 '平尾帆夏':{face:'heart',eyes:'bright',brow:'soft',hair:'mediumFlip',bang:'light',smile:'sunny',palette:1,orn:'flower'},
 '宮地すみれ':{face:'heart',eyes:'cat',brow:'fine',hair:'longStraight',bang:'heavy',smile:'playful',palette:6,orn:'moon'},
 '山下葉留花':{face:'oval',eyes:'round',brow:'soft',hair:'mediumWave',bang:'light',smile:'warm',palette:3,orn:'ribbon'},
 '石塚瑶季':{face:'round',eyes:'bright',brow:'bold',hair:'highPony',bang:'light',smile:'brave',palette:0,orn:'plume'},
 '森本茉莉':{face:'oval',eyes:'dreamy',brow:'arch',hair:'longWave',bang:'center',smile:'mystic',palette:5,orn:'moon'},
 '清水理央':{face:'slim',eyes:'clear',brow:'fine',hair:'longStraight',bang:'sweep',smile:'confident',palette:2,orn:'gold'},
 '小西夏菜実':{face:'slim',eyes:'cool',brow:'bold',hair:'longStraight',bang:'center',smile:'quiet',palette:0,orn:'jade'}
};
const V19_PALETTES=[
 ['#8d3152','#d78b9d','#f5d7dc','#62435c'],['#395c8b','#8eb2d4','#d9e6f1','#38445f'],
 ['#496f61','#9dc3af','#dce9df','#354f48'],['#8a6231','#d3a565','#efe0c2','#60482f'],
 ['#8a4c7d','#c995bc','#efdcec','#5f3d5a'],['#487e8b','#8bc3c9','#d8edee','#355c63'],
 ['#5b4b8b','#9f90cd','#e4def3','#41385f']
];
function v19Hash(s){let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(h,31)+s.charCodeAt(i))>>>0;return h}
function v19Trait(name){
 if(V19_TRAITS[name])return V19_TRAITS[name];
 const h=v19Hash(name),female=V19_HINATA_NAMES.has(name);
 if(female)return {face:['round','oval','heart','slim'][h%4],eyes:['bright','clear','droop','cat','dreamy'][h%5],brow:['soft','fine','arch'][h%3],hair:['longStraight','longWave','mediumWave','shortBob','halfUp'][h%5],bang:['heavy','light','center','sweep'][h%4],smile:['gentle','sunny','quiet','playful'][h%4],palette:h%7,orn:['flower','jade','ribbon','moon','gold'][h%5]};
 return {face:['square','long','oval'][h%3],eyes:['stern','deep','sharp'][h%3],brow:'bold',hair:['topknot','helmet','tied'][h%3],bang:'none',smile:'stern',palette:h%7,orn:['crown','helmet','gold'][h%3]};
}
function v19FacePath(type){
 return type==='round'?'M37 32 Q34 57 43 72 Q52 83 65 72 Q74 57 71 32 Q54 23 37 32Z':
 type==='heart'?'M36 32 Q34 55 43 69 Q54 82 66 68 Q75 53 72 32 Q54 21 36 32Z':
 type==='slim'?'M38 29 Q34 54 44 72 Q54 84 65 71 Q74 53 70 29 Q54 22 38 29Z':
 type==='small'?'M39 33 Q36 55 44 68 Q54 77 64 68 Q72 55 69 33 Q54 25 39 33Z':
 type==='square'?'M34 31 L37 61 Q40 75 54 79 Q68 75 71 61 L74 31 Q54 21 34 31Z':
 type==='long'?'M37 27 Q33 56 43 76 Q54 88 66 75 Q75 55 71 27 Q54 19 37 27Z':'M36 30 Q33 56 43 72 Q54 83 66 72 Q75 55 72 30 Q54 21 36 30Z';
}
function v19Eyes(type){
 if(type==='cat')return '<path d="M41 47 Q46 43 51 47 Q46 49 41 47M58 47 Q63 43 68 47 Q63 49 58 47" fill="#2b211f"/><path d="M40 46l-3-2M69 46l3-2" stroke="#3b2725" stroke-width="1.3"/>';
 if(type==='droop')return '<path d="M40 46 Q46 44 51 48M58 48 Q63 44 69 46" fill="none" stroke="#322522" stroke-width="2"/><circle cx="46" cy="47" r="1.8"/><circle cx="63" cy="47" r="1.8"/>';
 if(type==='round'||type==='bright')return '<ellipse cx="46" cy="47" rx="3.4" ry="4" fill="#fff"/><ellipse cx="63" cy="47" rx="3.4" ry="4" fill="#fff"/><circle cx="46" cy="48" r="2.2" fill="#382824"/><circle cx="63" cy="48" r="2.2" fill="#382824"/><circle cx="45.3" cy="47" r=".7" fill="#fff"/><circle cx="62.3" cy="47" r=".7" fill="#fff"/>';
 if(type==='dreamy')return '<path d="M40 47 Q46 42 52 47M57 47 Q63 42 69 47" fill="#fff" stroke="#4a3330" stroke-width="1.3"/><circle cx="46" cy="47" r="1.8"/><circle cx="63" cy="47" r="1.8"/>';
 if(type==='cool'||type==='sharp'||type==='stern')return '<path d="M40 47 Q46 44 52 46M57 46 Q63 44 69 47" fill="none" stroke="#281d1b" stroke-width="2.2"/><circle cx="46" cy="47" r="1.5"/><circle cx="63" cy="47" r="1.5"/>';
 return '<path d="M40 47 Q46 43 52 47M57 47 Q63 43 69 47" fill="#fff" stroke="#3a2926" stroke-width="1.5"/><circle cx="46" cy="47" r="1.9"/><circle cx="63" cy="47" r="1.9"/>';
}
function v19Brows(type){const sw=type==='bold'?3:type==='arch'?2.1:1.6;return `<path d="M39 40 Q46 ${type==='arch'?35:37} 52 40M57 40 Q63 ${type==='arch'?35:37} 70 40" fill="none" stroke="#3a2925" stroke-width="${sw}" stroke-linecap="round"/>`}
function v19Mouth(type){
 if(type==='sunny'||type==='warm')return '<path d="M46 63 Q54 69 63 62" fill="none" stroke="#a84d5d" stroke-width="2.2"/><path d="M49 64 Q54 66 60 63" fill="#fff"/>';
 if(type==='playful')return '<path d="M47 63 Q55 68 63 61" fill="none" stroke="#a33f55" stroke-width="2"/><circle cx="67" cy="59" r="1.2" fill="#bf6b74"/>';
 if(type==='mystic')return '<path d="M47 63 Q54 65 62 62" fill="none" stroke="#924653" stroke-width="1.8"/>';
 if(type==='stern')return '<path d="M46 64 Q54 61 63 64" fill="none" stroke="#5c302d" stroke-width="2"/>';
 return '<path d="M47 63 Q54 66 62 63" fill="none" stroke="#9d4c57" stroke-width="1.8"/>';
}
function v19Hair(t,color){
 const back=t.hair==='shortBob'?'<path d="M31 30 Q27 58 37 74 L44 66 L67 66 L74 75 Q82 54 77 30Z" fill="'+color+'"/>':t.hair==='highPony'?'<path d="M33 30 Q28 60 38 78 L44 66 L68 66 L74 79 Q83 56 77 30Z" fill="'+color+'"/><path d="M68 18 Q91 20 84 51 Q78 35 66 31Z" fill="'+color+'"/>':t.hair==='topknot'?'<path d="M35 29Q38 17 54 15Q70 17 74 29Z" fill="'+color+'"/><ellipse cx="54" cy="13" rx="8" ry="7" fill="'+color+'"/>':t.hair==='helmet'?'<path d="M32 32Q31 13 54 11Q77 13 77 33L70 26Q54 19 37 27Z" fill="#665642" stroke="#c6a45a" stroke-width="2"/>':t.hair==='tied'?'<path d="M33 30Q36 15 54 14Q72 15 76 30Q55 22 34 31Z" fill="'+color+'"/><path d="M54 14V5" stroke="'+color+'" stroke-width="7"/>':'<path d="M29 28 Q23 66 37 86 L44 69 L67 69 L76 86 Q88 60 79 28Z" fill="'+color+'"/>';
 const front=t.bang==='heavy'?'<path d="M34 31Q38 15 56 15Q73 17 76 31Q64 25 58 37Q50 27 35 36Z" fill="'+color+'"/>':t.bang==='center'?'<path d="M34 32Q38 15 54 15Q72 16 76 32Q63 24 55 37Q49 24 34 34Z" fill="'+color+'"/>':t.bang==='sweep'?'<path d="M34 33Q36 15 56 15Q74 17 76 32Q57 19 38 40Z" fill="'+color+'"/>':t.bang==='light'?'<path d="M34 32Q38 16 55 15Q72 17 76 32Q62 25 53 34Q45 25 35 36Z" fill="'+color+'"/><path d="M48 20Q50 32 47 38M58 19Q56 31 58 37" stroke="#ffffff22"/>':'<path d="M34 31Q38 15 54 15Q72 16 76 31Q55 23 34 33Z" fill="'+color+'"/>';
 return back+front;
}
function v19Orn(type){
 if(type==='flower')return '<g transform="translate(74 27)"><circle r="3" fill="#f4d6df"/><circle cx="4" r="3" fill="#f0a9bf"/><circle cy="4" r="3" fill="#f6c6d4"/><circle cx="3" cy="3" r="2" fill="#d98aa5"/></g>';
 if(type==='jade')return '<path d="M70 23Q77 17 81 24Q77 30 70 27Z" fill="#6ebaa5" stroke="#d9f3e8"/>';
 if(type==='ribbon')return '<path d="M72 22Q84 14 82 29L76 25L82 36Q72 32 70 25Z" fill="#d98da5"/>';
 if(type==='moon')return '<path d="M75 18A8 8 0 1 0 82 28A7 7 0 0 1 75 18Z" fill="#d9c46a"/>';
 if(type==='captain')return '<path d="M45 16L54 7L63 16L60 22H48Z" fill="#c7a24a" stroke="#ffe49a"/>';
 if(type==='plume')return '<path d="M68 23Q81 8 83 12Q82 25 73 31Z" fill="#d66a73"/>';
 if(type==='crown')return '<path d="M43 18L48 7L54 15L60 6L66 18Z" fill="#c5a24e" stroke="#f5de91"/>';
 if(type==='helmet')return '<path d="M37 22Q54 6 71 22" fill="none" stroke="#c6a45a" stroke-width="4"/>';
 return '<circle cx="75" cy="23" r="4" fill="#d9b65e"/>';
}
function v19PortraitData(name){
 const t=v19Trait(name),female=V19_HINATA_NAMES.has(name),h=v19Hash(name),pal=V19_PALETTES[t.palette%V19_PALETTES.length],hair=female?['#241b22','#332526','#1c1a1c','#4a3132'][h%4]:['#211b18','#35291f','#171717'][h%3],skin=female?['#f5cfb5','#f0c5aa','#f8d7c2'][h%3]:['#d7aa82','#c9956f','#e0b38b'][h%3];
 const beard=!female&&h%3!==0?`<path d="M43 66Q54 ${h%2?91:82} 66 66Q63 87 54 92Q46 87 43 66Z" fill="${hair}" opacity=".92"/>`:'';
 const blush=female?'<ellipse cx="39" cy="57" rx="5" ry="2.4" fill="#df8c9a" opacity=".25"/><ellipse cx="69" cy="57" rx="5" ry="2.4" fill="#df8c9a" opacity=".25"/>':'';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 128"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${pal[2]}"/><stop offset="1" stop-color="${pal[3]}"/></linearGradient><linearGradient id="robe" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[0]}"/></linearGradient><radialGradient id="skin"><stop stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="${skin}"/></radialGradient></defs><rect width="108" height="128" rx="12" fill="url(#bg)"/><circle cx="86" cy="25" r="28" fill="#fff" opacity=".09"/><path d="M5 104Q18 82 39 78L54 89L69 78Q91 83 103 104V128H5Z" fill="url(#robe)"/><path d="M31 92L43 78L54 89L66 78L79 93L69 128H39Z" fill="#f1e4c8" opacity=".9"/><path d="M37 94L54 105L71 94" fill="none" stroke="#d2a94f" stroke-width="3"/>${v19Hair(t,hair)}<path d="${v19FacePath(t.face)}" fill="url(#skin)" stroke="#7f5545" stroke-width=".7"/>${v19Brows(t.brow)}${v19Eyes(t.eyes)}<path d="M54 49Q51 56 54 58Q57 57 58 58" fill="none" stroke="#b37b68" stroke-width="1.2"/>${blush}${v19Mouth(t.smile)}${beard}${v19Orn(t.orn)}<path d="M12 106Q28 96 39 98M96 106Q80 96 69 98" fill="none" stroke="#e7c46c" stroke-width="2" opacity=".7"/><rect x="5" y="106" width="98" height="18" rx="5" fill="#20170fda"/><text x="54" y="119" text-anchor="middle" font-size="10.5" font-family="serif" font-weight="700" fill="#fff7df">${name}</text></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
portraitData=v19PortraitData;
portraitHTML=function(name,small=false){return `<img class="portrait${small?' small':''}" src="${v19PortraitData(name)}" alt="${name}の三国志風武将肖像">`};
function v19RefreshPortraits(){document.querySelectorAll('img.portrait').forEach(img=>{const alt=img.alt||'';const n=[...state.officers.map(o=>o.name),...V19_HINATA_NAMES].find(x=>alt.includes(x));if(n)img.src=v19PortraitData(n)})}
const v19BaseRender=render;render=function(){v19BaseRender();setTimeout(v19RefreshPortraits,0)};
const v19BaseShowModal=showModal;showModal=function(html){v19BaseShowModal(html);setTimeout(v19RefreshPortraits,0)};
if(state)render();
