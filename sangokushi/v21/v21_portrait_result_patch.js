// v21: raster portraits and compact command-result dialogue
const V21_RASTER_CACHE=Object.create(null);
const V21_RASTER_PENDING=Object.create(null);

function v21RasterizePortrait(name){
  if(V21_RASTER_CACHE[name]) return Promise.resolve(V21_RASTER_CACHE[name]);
  if(V21_RASTER_PENDING[name]) return V21_RASTER_PENDING[name];
  V21_RASTER_PENDING[name]=new Promise(resolve=>{
    try{
      const source=typeof portraitData==='function'?portraitData(name):'';
      if(!source) throw new Error('portrait source unavailable');
      const img=new Image();
      img.onload=()=>{
        try{
          const canvas=document.createElement('canvas');
          canvas.width=224; canvas.height=264;
          const ctx=canvas.getContext('2d');
          ctx.fillStyle='#24170f'; ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          const jpg=canvas.toDataURL('image/jpeg',0.9);
          V21_RASTER_CACHE[name]=jpg;
          delete V21_RASTER_PENDING[name];
          resolve(jpg);
          if(typeof state!=='undefined'&&state&&!state.battle) requestAnimationFrame(()=>v21Apply());
        }catch(e){delete V21_RASTER_PENDING[name];resolve('')}
      };
      img.onerror=()=>{delete V21_RASTER_PENDING[name];resolve('')};
      img.src=source;
    }catch(e){delete V21_RASTER_PENDING[name];resolve('')}
  });
  return V21_RASTER_PENDING[name];
}

v21Face=function(name,cls=''){
  const src=V21_RASTER_CACHE[name];
  if(!src){
    v21RasterizePortrait(name);
    const initial=(name||'?').slice(0,1);
    return `<span class="v21-face v21-raster-wait ${cls}" role="img" aria-label="${name}の肖像"><b>${initial}</b></span>`;
  }
  return `<span class="v21-face v21-raster ${cls}" role="img" aria-label="${name}のJPEG肖像" style="background-image:url('${src}')"></span>`;
};

(function addV21PortraitResultStyles(){
  const s=document.createElement('style');
  s.textContent=`
    .v21-raster-wait{background:linear-gradient(145deg,#5c442b,#20160e)!important;display:grid!important;place-items:center;color:#f1d79a;font-size:28px;font-weight:900}
    .v21-raster{background-size:cover!important;background-position:center top!important}
    .v21-result{position:fixed;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:5000;max-width:720px;margin:auto;display:grid;grid-template-columns:62px 1fr auto;gap:10px;align-items:center;padding:10px;background:linear-gradient(135deg,#23170f,#0f0b08);border:2px solid #b88935;box-shadow:0 10px 30px #000b,inset 0 0 0 1px #5c3d1d;color:#f5ddb0;animation:v21ResultIn .18s ease-out}
    .v21-result .v21-face{width:58px;height:68px;border-radius:3px}
    .v21-result strong{display:block;color:#ffd77a;font-size:15px;margin-bottom:2px}
    .v21-result p{margin:0;line-height:1.45;font-size:14px}
    .v21-result button{padding:7px 10px;min-width:54px}
    @keyframes v21ResultIn{from{transform:translateY(18px);opacity:0}to{transform:none;opacity:1}}
    @media(max-width:520px){.v21-result{grid-template-columns:52px 1fr auto;padding:8px}.v21-result .v21-face{width:48px;height:58px}.v21-result p{font-size:13px}}
  `;
  document.head.appendChild(s);
})();

function v21ResultLine(message){
  if(/登用成功|帰順/.test(message)) return `「力を貸してくれるそうです。${message}」`;
  if(/登用失敗|失敗/.test(message)) return `「今回は及びませんでした。${message}」`;
  if(/発見/.test(message)) return `「捜索の成果です。${message}」`;
  if(/徴兵/.test(message)) return `「兵の編成が整いました。${message}」`;
  if(/訓練/.test(message)) return `「部隊の練度が上がりました。${message}」`;
  if(/農業|商業|治水|巡察/.test(message)) return `「政務を完了しました。${message}」`;
  if(/策略|流言|離間|焼討|内応/.test(message)) return `「計略の結果をご報告します。${message}」`;
  if(/外交|同盟|停戦|贈物|共同/.test(message)) return `「交渉結果です。${message}」`;
  if(/移動/.test(message)) return `「移動を完了しました。${message}」`;
  return `「命令を完了しました。${message}」`;
}

function v21ShowCommandResult(officer,message){
  document.querySelectorAll('.v21-result').forEach(x=>x.remove());
  const box=document.createElement('div');
  box.className='v21-result';
  box.innerHTML=`${v21Face(officer.name)}<div><strong>${officer.name}</strong><p>${v21ResultLine(message)}</p></div><button type="button">確認</button>`;
  document.body.appendChild(box);
  const close=()=>box.remove();
  box.querySelector('button').onclick=close;
  clearTimeout(v21ShowCommandResult.timer);
  v21ShowCommandResult.timer=setTimeout(close,4800);
}

finish=function(o,m){
  o.acted=state.turn;
  log(`${o.name}：${m}`);
  checkWin();
  render();
  v21RasterizePortrait(o.name).finally(()=>setTimeout(()=>v21ShowCommandResult(o,m),30));
};

// Preload visible portraits after each strategic render.
const v21PatchBaseApply=v21Apply;
v21Apply=function(){
  v21PatchBaseApply();
  if(!state||state.battle)return;
  ofs(state.playerForce).filter(o=>o.status!=='捕虜').forEach(o=>v21RasterizePortrait(o.name));
};
