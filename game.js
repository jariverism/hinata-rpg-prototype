(function(){
'use strict';
var MEMBERS=[
 {name:'井口眞緒',type:'トーク型',stats:[17,31,27,57,36,49],id:'ig'},
 {name:'潮紗理菜',type:'安定型',stats:[18,40,39,42,43,57],id:'ush'},
 {name:'柿崎芽実',type:'表現型',stats:[20,43,45,38,58,45],id:'mem'},
 {name:'加藤史帆',type:'万能型',stats:[21,49,48,46,55,47],id:'kat'},
 {name:'齊藤京子',type:'歌唱型',stats:[23,64,37,44,52,53],id:'kyo'},
 {name:'佐々木久美',type:'統率型',stats:[18,39,43,52,44,61],id:'kum'},
 {name:'佐々木美玲',type:'ライブ型',stats:[20,54,53,46,49,57],id:'mir'},
 {name:'高瀬愛奈',type:'知性型',stats:[16,40,39,44,42,56],id:'tak'},
 {name:'高本彩花',type:'モデル型',stats:[19,38,46,41,59,49],id:'aya'},
 {name:'東村芽依',type:'身体型',stats:[18,37,61,31,51,52],id:'mei'}
];
var NAMES=['人気','歌唱','ダンス','トーク','表現力','メンタル'];
var ACTIONS=[['ボイトレ',1],['ダンス',2],['バラエティ',3],['モデル撮影',4],['仲間と語る',5],['休養',-1]];
var S=window.HinataSave,R=window.HinataRelics.all;
function normalizeEnding(x){
 if(!x||typeof x!=='object')return null;
 var id=x.relicId==='memory'?'memorial':x.relicId;
 if(!R[id]){
  if(x.item==='記念の遺物'||x.item==='世界線の記念写真')id='memorial';
  else id=null;
 }
 return {rank:x.rank||x.rk||'D',title:x.title||'選抜結果',score:Number(x.score!=null?x.score:x.sc)||0,relicId:id,relicName:(id&&R[id]?R[id].name:(x.relicName||x.item||'記念の遺物')),judges:Number(x.judges)||0};
}
var ending=normalizeEnding(S.loadEnding());
var meta=window.HinataRelics.normalizeMeta(S.loadMeta(),ending);
var game=normalizeRun(S.loadRun());
var selected=Math.max(0,Math.min(MEMBERS.length-1,S.loadMember()));
var screen=S.loadScreen();
function clamp(n){return Math.max(0,Math.min(100,n));}
function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function memberIdFromRun(run){
 if(!run)return null;
 if(run.memberId&&R[run.memberId])return run.memberId;
 if(run.m&&run.m.id&&R[run.m.id])return run.m.id;
 var name=run.memberName||(run.m&&run.m.name)||(Array.isArray(run.m)?run.m[0]:null);
 for(var i=0;i<MEMBERS.length;i++)if(MEMBERS[i].name===name)return MEMBERS[i].id;
 return 'memorial';
}
function normalizeRun(run){
 if(!run||typeof run!=='object')return null;
 var st=Array.isArray(run.stats)?run.stats:Array.isArray(run.st)?run.st:null;
 if(!st||st.length<6)return null;
 return {memberId:memberIdFromRun(run),memberName:run.memberName||(run.m&&run.m.name)||(Array.isArray(run.m)?run.m[0]:'主人公'),week:Math.max(1,Number(run.week)||1),stats:st.slice(0,6).map(function(v){return clamp(Number(v)||0);}),energy:clamp(Number(run.energy)||0),staff:clamp(Number(run.staff)||0),judges:Number(run.judges)||0,logs:Array.isArray(run.logs)?run.logs:[]};
}
function persist(){S.saveMeta(meta);S.saveRun(game);S.saveEnding(ending);S.saveScreen(screen);}
function score(){if(!game)return 0;var sum=game.stats.reduce(function(a,b){return a+b;},0);return Math.round(sum/6*.75+game.staff*.2+game.judges*3+(meta.equipped.indexOf('mem')>=0?15:0));}
function log(text){game.logs.unshift({w:game.week,t:text});game.logs=game.logs.slice(0,50);}
function equip(id){if(meta.owned.indexOf(id)<0||!R[id])return;var p=meta.equipped.indexOf(id);if(p>=0)meta.equipped.splice(p,1);else{if(meta.equipped.length>=2)meta.equipped.shift();meta.equipped.push(id);}persist();render();}
function start(){var m=MEMBERS[selected],stats=m.stats.slice();if(meta.equipped.indexOf('memorial')>=0)stats=stats.map(function(v){return clamp(v+2);});game={memberId:m.id,memberName:m.name,week:1,stats:stats,energy:100,staff:18+(meta.equipped.indexOf('kum')>=0?10:0),judges:0,logs:[]};ending=null;screen='play';persist();render();}
function act(index){if(!game||ending)return;var a=ACTIONS[index];if(!a)return;if(a[1]<0){game.energy=clamp(game.energy+30);log('休養して体力を回復');}else{game.energy=clamp(game.energy-9);var ok=rnd(1,100)<=76;if(!ok&&meta.equipped.indexOf('ush')>=0&&rnd(1,100)<=25)ok=true;if(ok){var up=rnd(2,4);if(a[1]===1&&meta.equipped.indexOf('kyo')>=0)up+=2;if(a[1]===2&&meta.equipped.indexOf('mei')>=0)up+=2;if(a[1]===4&&meta.equipped.indexOf('aya')>=0)up+=2;game.stats[a[1]]=clamp(game.stats[a[1]]+up);game.staff=clamp(game.staff+1);if(a[1]===3&&meta.equipped.indexOf('ig')>=0)game.stats[0]=clamp(game.stats[0]+3);log(a[0]+'成功 '+NAMES[a[1]]+'＋'+up);}else{game.stats[5]=clamp(game.stats[5]-3);log(a[0]+'失敗');}}
 if(game.week>=104)finish();else{game.week++;persist();render();}
}
function finish(){if(!game||ending)return;var sc=score(),rank=sc>=90?'S':sc>=78?'A':sc>=66?'B':sc>=54?'C':'D';var titles={S:'デビュー曲センター',A:'フロントメンバー',B:'二列目選抜',C:'三列目選抜',D:'選抜入りならず'};var id=memberIdFromRun(game);if(!R[id])id='memorial';if(meta.owned.indexOf(id)<0)meta.owned.push(id);meta.runs++;if(rank==='S')meta.centers++;meta.clears[id]=rank;ending={rank:rank,title:titles[rank],score:sc,relicId:id,relicName:R[id].name,judges:game.judges};screen='play';persist();render();}
function nextWorld(){game=null;ending=null;screen='home';persist();render();}
function statRows(){return game.stats.map(function(v,i){return '<div class="stat"><span>'+NAMES[i]+'</span><div class="bar"><div class="fill" style="width:'+v+'%"></div></div><b>'+v+'</b></div>';}).join('')+'<div class="stat"><span>体力</span><div class="bar"><div class="fill" style="width:'+game.energy+'%"></div></div><b>'+game.energy+'</b></div><div class="stat"><span>運営</span><div class="bar"><div class="fill" style="width:'+game.staff+'%"></div></div><b>'+game.staff+'</b></div>';}
function relicButton(id){var x=R[id];if(!x)return '';var on=meta.equipped.indexOf(id)>=0;return '<button class="item '+(on?'on':'')+'" data-action="equip" data-id="'+id+'"><span class="ico">'+x.icon+'</span><span><b>'+x.name+(on?'［装備中］':'')+'</b><div class="effect">'+x.effect+'</div></span><span>'+(on?'解除':'装備')+'</span></button>';}
function nav(){return '<div class="tabs"><button class="tab '+(screen==='home'?'on':'')+'" data-action="go" data-screen="home">出発</button><button class="tab '+(screen==='book'?'on':'')+'" data-action="go" data-screen="book">遺物図鑑</button><button class="tab '+(screen==='play'?'on':'')+'" data-action="go" data-screen="play">育成</button></div>';}
function home(){return '<div class="card"><div class="small">HINATA SUCCESS LOOP v2.0</div><h1>世界線を紡ぐ育成RPG</h1><span class="pill">周回 '+meta.runs+'</span><span class="pill">獲得遺物 '+meta.owned.length+'</span><span class="pill">センター '+meta.centers+'</span></div><div class="card"><h3>主人公</h3><div class="grid">'+MEMBERS.map(function(m,i){return '<button class="member '+(i===selected?'on':'')+'" data-action="member" data-index="'+i+'"><b>'+m.name+'</b><div class="small">'+m.type+'／最高 '+(meta.clears[m.id]||'未完走')+'</div></button>';}).join('')+'</div></div><div class="card"><h3>装備中（'+meta.equipped.length+'/2）</h3>'+(meta.equipped.length?meta.equipped.map(relicButton).join(''):'<div class="notice">装備なし</div>')+'<h3>所持遺物</h3>'+(meta.owned.length?meta.owned.map(relicButton).join(''):'<p class="small">まだ遺物がない。</p>')+'<div class="row"><button class="btn primary" data-action="start">この装備で育成開始</button>'+(game?'<button class="btn" data-action="go" data-screen="play">途中から</button>':'')+'</div></div>';}
function book(){return '<div class="card"><h2>遺物図鑑</h2>'+Object.keys(R).map(function(id){return meta.owned.indexOf(id)>=0?relicButton(id):'<div class="item muted"><span class="ico">？</span><span><b>未発見</b><div class="effect">世界線を完走すると獲得</div></span><span>---</span></div>';}).join('')+'</div>';}
function finalView(){return '<div class="card final"><div class="small" style="color:#eee">WORLD LINE COMPLETE</div><div class="big">'+ending.rank+'</div><h1>'+ending.title+'</h1><p>最終評価 '+ending.score+'／選抜審査突破 '+ending.judges+'/4</p></div><div class="card"><h3>周回報酬</h3><p>遺物「<b>'+ending.relicName+'</b>」を獲得した。</p><button class="btn primary" data-action="next">次の世界線へ</button></div>';}
function play(){if(ending)return finalView();if(!game)return '<div class="card"><p>育成データがありません。</p><button class="btn" data-action="go" data-screen="home">出発へ戻る</button></div>';var buttons=ACTIONS.map(function(a,i){return '<button class="act" data-action="act" data-index="'+i+'"><b>'+a[0]+'</b><div class="small">'+(a[1]<0?'体力＋30':'能力上昇・体力－9')+'</div></button>';}).join('');if(game.week>=104)buttons+='<button class="act wide" data-action="finish"><b>この能力で最終センター発表へ</b></button>';return '<div class="card"><h2>'+game.memberName+'　育成中</h2><div class="small">第'+game.week+'週／104週</div>'+(game.week>=104?'<div class="notice"><b>最終週</b><br>行動を1つ選ぶか、直接最終発表へ進める。</div>':'')+statRows()+'<p><b>センター評価 '+score()+'</b></p></div><div class="card"><div class="acts">'+buttons+'</div></div><div class="card"><h3>活動記録</h3><div class="log">'+(game.logs.length?game.logs.map(function(x){return '<div>第'+x.w+'週 '+x.t+'</div>';}).join(''):'<div>新しい世界線が始まった。</div>')+'</div></div>';}
function render(){var app=document.getElementById('app');if(!app)return;app.innerHTML=nav()+(screen==='home'?home():screen==='book'?book():play());}
document.addEventListener('click',function(e){var b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();var a=b.dataset.action;if(a==='go'){screen=b.dataset.screen;if(screen==='play'&&!game&&!ending)screen='home';persist();render();}else if(a==='member'){selected=Number(b.dataset.index);S.saveMember(selected);render();}else if(a==='equip')equip(b.dataset.id);else if(a==='start')start();else if(a==='act')act(Number(b.dataset.index));else if(a==='finish')finish();else if(a==='next')nextWorld();});
window.addEventListener('error',function(e){var app=document.getElementById('app');if(app)app.innerHTML='<div class="card"><h2>エラー</h2><div class="error">'+String(e.message||e.error||'不明なエラー')+'</div><button class="btn" onclick="location.reload()">再読込</button></div>';});
persist();render();
})();