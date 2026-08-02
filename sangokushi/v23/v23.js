// v23: fixed 20-character raster atlas. No SVG/Canvas portrait generation for mapped Hinata officers.
const V23_ATLAS_NAMES=[
 '井口眞緒','潮紗理菜','影山優佳','加藤史帆','齊藤京子','佐々木久美','佐々木美玲','高瀬愛奈','高本彩花','東村芽依',
 '金村美玖','河田陽菜','小坂菜緒','富田鈴花','丹生明里','濱岸ひより','松田好花','宮田愛萌','渡邉美穂','上村ひなの'
];
const V23_ATLAS_INDEX=Object.fromEntries(V23_ATLAS_NAMES.map((n,i)=>[n,i]));
let V23_ATLAS_URL='';

(function v23Styles(){
 const s=document.createElement('style');
 s.textContent=`
 .v23-face{display:block;width:100%;aspect-ratio:4/5;background-color:#f5efe4;background-repeat:no-repeat;background-size:1000% 200%;border:1px solid #a87c31;box-shadow:inset 0 0 0 1px #f3d891;pointer-events:none}
 .v23-face.large{width:150px;min-width:150px}
 .v23-face.mini{width:54px;height:64px;aspect-ratio:auto}
 .v23-face.error{display:grid;place-items:center;background:linear-gradient(145deg,#4b3422,#17100b);color:#f0d28e;font-weight:900;font-size:24px}
 .v21-card .v23-face{margin-bottom:5px}
 .v21-detail>.v23-face{width:132px;min-width:132px}
 .v23-result{position:fixed;left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:9000;max-width:700px;margin:auto;display:grid;grid-template-columns:58px 1fr auto;gap:10px;align-items:center;padding:10px;background:linear-gradient(135deg,#25180f,#0d0906);border:2px solid #bd8c36;color:#f5ddb0;box-shadow:0 10px 32px #000c,inset 0 0 0 1px #5e421f}
 .v23-result strong{display:block;color:#ffd77b}.v23-result p{margin:3px 0 0;line-height:1.45;font-size:14px}.v23-result button{padding:8px 10px}
 .v23-image-state{font-size:11px;color:#6b512c;margin-left:auto}
 @media(max-width:520px){.v23-face.large{width:112px;min-width:112px}.v21-detail>.v23-face{width:105px;min-width:105px}.v23-result{grid-template-columns:50px 1fr auto}.v23-face.mini{width:46px;height:56px}.v23-result p{font-size:13px}}
 `;document.head.appendChild(s);
})();

function v23Position(name){
 const i=V23_ATLAS_INDEX[name]; if(i===undefined)return null;
 return `${(i%10)*(100/9)}% ${Math.floor(i/10)*100}%`;
}
function v23Face(name,cls=''){
 const pos=v23Position(name);
 if(pos&&V23_ATLAS_URL)return `<span class="v23-face ${cls}" role="img" aria-label="${name}の肖像" style="background-image:url('${V23_ATLAS_URL}');background-position:${pos}"></span>`;
 return `<span class="v23-face error ${cls}" role="img" aria-label="${name}の画像未読込">${(name||'?').slice(0,1)}</span>`;
}

async function v23LoadAtlas(){
 try{
  const r=await fetch('./portraits/atlas.webp.b64?v=3',{cache:'no-store'}); if(!r.ok)throw new Error(String(r.status));
  const raw=(await r.text()).replace(/\s+/g,'');
  if(!raw.startsWith('UklGR'))throw new Error('invalid webp payload');
  V23_ATLAS_URL='data:image/webp;base64,'+raw;
 }catch(e){console.error('v23 portrait atlas failed',e)}
 if(typeof state!=='undefined'&&state&&!state.battle)render();
}

// Replace all strategic portrait rendering with the atlas.
v21Face=function(name,cls=''){return v23Face(name,cls)};

function v23ResultText(m){
 if(/登用.*成功|帰順/.test(m))return `「新たな仲間を迎えました。${m}」`;
 if(/登用.*失敗|失敗/.test(m))return `「今回は説得できませんでした。${m}」`;
 if(/発見/.test(m))return `「捜索の成果をご報告します。${m}」`;
 if(/農業|商業|治水|巡察/.test(m))return `「政務を完了しました。${m}」`;
 if(/徴兵/.test(m))return `「兵の編成が整いました。${m}」`;
 if(/訓練/.test(m))return `「訓練を終え、部隊の練度が上がりました。${m}」`;
 if(/計略|流言|離間|焼討|内応/.test(m))return `「計略の結果です。${m}」`;
 if(/外交|同盟|停戦|贈物|共同/.test(m))return `「交渉結果をご報告します。${m}」`;
 return `「命令を完了しました。${m}」`;
}
function v23ShowResult(o,m){
 document.querySelectorAll('.v23-result').forEach(x=>x.remove());
 const el=document.createElement('div');el.className='v23-result';
 el.innerHTML=`${v23Face(o.name,'mini')}<div><strong>${o.name}</strong><p>${v23ResultText(m)}</p></div><button>確認</button>`;
 document.body.appendChild(el);const close=()=>el.remove();el.querySelector('button').onclick=close;setTimeout(close,5200);
}
finish=function(o,m){o.acted=state.turn;log(`${o.name}：${m}`);checkWin();render();setTimeout(()=>v23ShowResult(o,m),40)};

// Rebuild roster so mapped members always use the WebP atlas and no SVG fallback.
const v23BaseRoster=v21Roster;
v21Roster=function(){
 const html=v23BaseRoster();
 return html.replace(/画像(?:読込済み|代替表示中)/g,V23_ATLAS_URL?'WebP読込済み':'画像読込中');
};

v23LoadAtlas();
