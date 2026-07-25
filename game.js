(function(){
'use strict';
var MEMBERS=window.HinataMembers||[];
var EVENTS=window.HinataEvents||[];
var NAMES=['人気','歌唱','ダンス','トーク','表現力'];
var ACTIONS=[['ボイトレ',1],['ダンス',2],['バラエティ',3],['モデル撮影',4],['仲間と過ごす',-2],['休養',-1]];
var EXAMS={26:{name:'第一次選抜審査',need:40},52:{name:'第二次選抜審査',need:52},78:{name:'第三次選抜審査',need:64},104:{name:'最終選抜審査',need:76}};
var S=window.HinataSave,R=window.HinataRelics.all;
function clamp(n){return Math.max(0,Math.min(100,n));}
function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function avg(list){return list.length?list.reduce(function(a,b){return a+b;},0)/list.length:0;}
function bondMap(raw){var x={};MEMBERS.forEach(function(m){x[m.id]=Math.max(0,Math.min(5,Number(raw&&raw[m.id])||0));});return x;}
function normalizeEnding(x){if(!x||typeof x!=='object')return null;return {rank:x.rank||'D',title:x.title||'選抜入りならず',score:Number(x.score)||0,relicId:x.relicId||'memorial',relicName:x.relicName||'世界線の記念写真',judges:Number(x.judges)||0,album:Number(x.album)||0};}
function normalizeRun(run){
 if(!run||typeof run!=='object')return null;
 var st=Array.isArray(run.stats)?run.stats:Array.isArray(run.st)?run.st:null;if(!st)return null;
 st=st.slice(0,5).map(function(v){return clamp(Number(v)||0);});while(st.length<5)st.push(20);
 return {memberId:run.memberId||(run.m&&run.m.id)||MEMBERS[0].id,memberName:run.memberName||(run.m&&run.m.name)||'主人公',week:Math.max(1,Number(run.week)||1),stats:st,energy:clamp(Number(run.energy==null?100:run.energy)),staff:clamp(Number(run.staff)||18),judges:Math.max(0,Math.min(4,Number(run.judges)||0)),exams:Array.isArray(run.exams)?run.exams.map(Number):[],bonds:bondMap(run.bonds),seen:Array.isArray(run.seen)?run.seen:[],examBonus:Number(run.examBonus)||0,logs:Array.isArray(run.logs)?run.logs:[],lastEvent:run.lastEvent||null};
}
var ending=normalizeEnding(S.loadEnding());
var meta=window.HinataRelics.normalizeMeta(S.loadMeta(),ending);if(!Array.isArray(meta.album))meta.album=[];
var game=normalizeRun(S.loadRun());
var selected=Math.max(0,Math.min(MEMBERS.length-1,S.loadMember()));
var screen=S.loadScreen();
function persist(){S.saveMeta(meta);S.saveRun(game);S.saveEnding(ending);S.saveScreen(screen);}
function log(text){game.logs.unshift({w:game.week,t:text});game.logs=game.logs.slice(0,60);}
function averageBond(){return avg(Object.keys(game.bonds).map(function(k){return game.bonds[k];}));}
function topBond(){var id=MEMBERS[0].id;MEMBERS.forEach(function(m){if(game.bonds[m.id]>game.bonds[id])id=m.id;});return {id:id,value:game.bonds[id],name:MEMBERS.filter(function(m){return m.id===id;})[0].name};}
function score(){if(!game)return 0;return Math.round(avg(game.stats)*.62+game.staff*.18+averageBond()*4+game.judges*3);}
function equip(id){if(meta.owned.indexOf(id)<0||!R[id])return;var p=meta.equipped.indexOf(id);if(p>=0)meta.equipped.splice(p,1);else{if(meta.equipped.length>=2)meta.equipped.shift();meta.equipped.push(id);}persist();render();}
function start(){var m=MEMBERS[selected],stats=m.stats.slice();if(meta.equipped.indexOf('memorial')>=0)stats=stats.map(function(v){return clamp(v+2);});game={memberId:m.id,memberName:m.name,week:1,stats:stats,energy:100,staff:18+(meta.equipped.indexOf('kum')>=0?10:0),judges:0,exams:[],bonds:bondMap(),seen:[],examBonus:0,logs:[],lastEvent:null};ending=null;screen='play';persist();render();}
function successRate(){return Math.max(25,Math.min(92,58+game.energy*.3));}
function gainBond(id,n){game.bonds[id]=Math.min(5,game.bonds[id]+n);}
function eligibleEvents(){return EVENTS.filter(function(e){
 if(game.seen.indexOf(e.id)>=0)return false;
 if(e.member&&game.bonds[e.member]<(e.bond||0))return false;
 if(e.members&&e.members.some(function(id){return game.bonds[id]<(e.bond||0);}))return false;
 if(e.averageBond!=null&&averageBond()<e.averageBond)return false;
 return true;
 });}
function applyEvent(e){
 if(e.stats)Object.keys(e.stats).forEach(function(k){game.stats[Number(k)]=clamp(game.stats[Number(k)]+e.stats[k]);});
 if(e.staff)game.staff=clamp(game.staff+e.staff);
 if(e.energy)game.energy=clamp(game.energy+e.energy);
 if(e.examBonus)game.examBonus+=e.examBonus;
 if(e.allBond)MEMBERS.forEach(function(m){gainBond(m.id,e.allBond);});
 game.seen.push(e.id);if(meta.album.indexOf(e.id)<0)meta.album.push(e.id);
 game.lastEvent={title:e.title,text:e.text};log('【絆イベント】'+e.title);
}
function eventCheck(force){var list=eligibleEvents();if(!list.length)return;if(force||rnd(1,100)<=35)applyEvent(list[rnd(0,list.length-1)]);}
function examScore(){return Math.round(avg(game.stats)*.58+game.staff*.2+averageBond()*4+game.examBonus+rnd(-4,4)+(meta.equipped.indexOf('tak')>=0?8:0));}
function runExam(week){var exam=EXAMS[week];if(!exam||game.exams.indexOf(week)>=0)return;var value=examScore(),passed=value>=exam.need;game.exams.push(week);if(passed){game.judges++;game.staff=clamp(game.staff+4);MEMBERS.forEach(function(m){if(game.bonds[m.id]>=3)gainBond(m.id,1);});log('【'+exam.name+'】合格！ 審査点 '+value+'（基準 '+exam.need+'）');}else{game.staff=clamp(game.staff-3);log('【'+exam.name+'】不合格… 審査点 '+value+'（基準 '+exam.need+'）');}}
function act(index){
 if(!game||ending)return;var a=ACTIONS[index];if(!a)return;game.lastEvent=null;
 if(a[1]===-1){game.energy=clamp(game.energy+35);log('休養して体力を35回復');eventCheck(false);}
 else if(a[1]===-2){var partner=MEMBERS[rnd(0,MEMBERS.length-1)];gainBond(partner.id,1);game.energy=clamp(game.energy+8);log(partner.name+'と過ごした　絆＋1');eventCheck(true);}
 else{
  if(game.energy<=0){log('体力が尽きていてトレーニングできない');persist();render();return;}
  var rate=successRate(),ok=rnd(1,100)<=rate;game.energy=clamp(game.energy-12);
  if(!ok&&meta.equipped.indexOf('ush')>=0&&rnd(1,100)<=25)ok=true;
  if(ok){var up=rnd(2,4);if(a[1]===1&&meta.equipped.indexOf('kyo')>=0)up+=2;if(a[1]===2&&meta.equipped.indexOf('mei')>=0)up+=2;if(a[1]===4&&meta.equipped.indexOf('aya')>=0)up+=2;game.stats[a[1]]=clamp(game.stats[a[1]]+up);game.staff=clamp(game.staff+1);if(a[1]===3&&meta.equipped.indexOf('ig')>=0)game.stats[0]=clamp(game.stats[0]+3);log(a[0]+'成功 '+NAMES[a[1]]+'＋'+up+'（成功率 '+rate+'％）');eventCheck(false);}else{game.staff=clamp(game.staff-1);log(a[0]+'失敗（成功率 '+rate+'％）');}
 }
 runExam(game.week);if(game.week>=104)finish();else{game.week++;persist();render();}
}
function endingData(){var sc=score(),b=averageBond(),top=topBond(),rank=sc>=88?'S':sc>=76?'A':sc>=64?'B':sc>=52?'C':'D',title='選抜入りならず';if(game.judges===4&&b>=4)title='一期生の絆・真エンド';else if(game.stats[3]>=85)title='バラエティエース';else if(game.stats[1]>=85)title='歌姫フロント';else if(game.stats[2]>=85)title='ライブの切り札';else if(game.staff>=85)title='信頼されるまとめ役';else if(rank==='S')title='デビュー曲センター';else if(rank==='A')title='フロントメンバー';else if(rank==='B')title='二列目選抜';else if(rank==='C')title='三列目選抜';return {rank:rank,title:title,score:sc,top:top};}
function finish(){if(!game||ending)return;runExam(104);var x=endingData(),id=game.memberId;if(!R[id])id='memorial';if(meta.owned.indexOf(id)<0)meta.owned.push(id);meta.runs++;if(x.rank==='S')meta.centers++;meta.clears[id]=x.rank;ending={rank:x.rank,title:x.title,score:x.score,relicId:id,relicName:R[id].name,judges:game.judges,album:meta.album.length,topBond:x.top};persist();render();}
function nextWorld(){game=null;ending=null;screen='home';persist();render();}
function statRows(){return game.stats.map(function(v,i){return '<div class="stat"><span>'+NAMES[i]+'</span><div class="bar"><div class="fill" style="width:'+v+'%"></div></div><b>'+v+'</b></div>';}).join('')+'<div class="stat"><span>体力</span><div class="bar"><div class="fill" style="width:'+game.energy+'%"></div></div><b>'+game.energy+'</b></div><div class="stat"><span>運営</span><div class="bar"><div class="fill" style="width:'+game.staff+'%"></div></div><b>'+game.staff+'</b></div>';}
function bondRows(){return MEMBERS.map(function(m){var n=game.bonds[m.id];return '<span class="pill">'+m.name+' '+('★★★★★'.slice(0,n))+('☆☆☆☆☆'.slice(n))+'</span>';}).join('');}
function relicButton(id){var x=R[id];if(!x)return '';var on=meta.equipped.indexOf(id)>=0;return '<button class="item '+(on?'on':'')+'" data-action="equip" data-id="'+id+'"><span class="ico">'+x.icon+'</span><span><b>'+x.name+(on?'［装備中］':'')+'</b><div class="effect">'+x.effect+'</div></span><span>'+(on?'解除':'装備')+'</span></button>';}
function nav(){return '<div class="tabs"><button class="tab '+(screen==='home'?'on':'')+'" data-action="go" data-screen="home">出発</button><button class="tab '+(screen==='book'?'on':'')+'" data-action="go" data-screen="book">遺物図鑑</button><button class="tab '+(screen==='play'?'on':'')+'" data-action="go" data-screen="play">育成</button></div>';}
function home(){return '<div class="card"><div class="small">HINATA SUCCESS LOOP v3.0</div><h1>一期生との思い出を紡ぐ育成RPG</h1><span class="pill">周回 '+meta.runs+'</span><span class="pill">思い出 '+meta.album.length+'/'+EVENTS.length+'</span><span class="pill">センター '+meta.centers+'</span></div><div class="card"><h3>主人公</h3><div class="grid">'+MEMBERS.map(function(m,i){return '<button class="member '+(i===selected?'on':'')+'" data-action="member" data-index="'+i+'"><b>'+m.name+'</b><div class="small">'+m.type+'／最高 '+(meta.clears[m.id]||'未完走')+'</div></button>';}).join('')+'</div></div><div class="card"><h3>装備中（'+meta.equipped.length+'/2）</h3>'+(meta.equipped.length?meta.equipped.map(relicButton).join(''):'<div class="notice">装備なし</div>')+'<div class="row"><button class="btn primary" data-action="start">この世界線を始める</button>'+(game?'<button class="btn" data-action="go" data-screen="play">途中から</button>':'')+'</div></div>';}
function book(){return '<div class="card"><h2>遺物図鑑</h2>'+Object.keys(R).map(function(id){return meta.owned.indexOf(id)>=0?relicButton(id):'<div class="item muted"><span class="ico">？</span><span><b>未発見</b><div class="effect">世界線を完走すると獲得</div></span><span>---</span></div>';}).join('')+'</div><div class="card"><h2>思い出アルバム</h2><p>'+meta.album.length+'/'+EVENTS.length+'イベントを発見</p></div>';}
function nextExamText(){var w=[26,52,78,104];for(var i=0;i<w.length;i++)if(game.exams.indexOf(w[i])<0)return '次の選抜審査：第'+w[i]+'週（基準 '+EXAMS[w[i]].need+'）';return '全選抜審査終了';}
function finalView(){return '<div class="card final"><div class="small" style="color:#eee">WORLD LINE COMPLETE</div><div class="big">'+ending.rank+'</div><h1>'+ending.title+'</h1><p>最終評価 '+ending.score+'／選抜審査突破 '+ending.judges+'/4</p>'+(ending.topBond?'<p>最高の絆：'+ending.topBond.name+' ★'+ending.topBond.value+'</p>':'')+'</div><div class="card"><h3>周回報酬</h3><p>遺物「<b>'+ending.relicName+'</b>」を獲得した。</p><p>思い出アルバム '+ending.album+'/'+EVENTS.length+'</p><button class="btn primary" data-action="next">次の世界線へ</button></div>';}
function play(){if(ending)return finalView();if(!game)return '<div class="card"><p>育成データがありません。</p><button class="btn" data-action="go" data-screen="home">出発へ戻る</button></div>';var buttons=ACTIONS.map(function(a,i){var disabled=(game.energy<=0&&a[1]>=0)?' disabled':'';var desc=a[1]===-1?'体力＋35':a[1]===-2?'誰かとの絆＋1・体力＋8':'能力上昇・体力－12';return '<button class="act" data-action="act" data-index="'+i+'"'+disabled+'><b>'+a[0]+'</b><div class="small">'+desc+'</div></button>';}).join('');return '<div class="card"><h2>'+game.memberName+'　育成中</h2><div class="small">第'+game.week+'週／104週</div>'+(EXAMS[game.week]&&game.exams.indexOf(game.week)<0?'<div class="notice"><b>'+EXAMS[game.week].name+'</b><br>今週の行動後に選抜判定。</div>':'')+(game.lastEvent?'<div class="notice"><b>'+game.lastEvent.title+'</b><br>'+game.lastEvent.text+'</div>':'')+statRows()+'<p><b>センター評価 '+score()+'</b>　練習成功率 '+successRate()+'％</p><p class="small">選抜審査突破 '+game.judges+'/4<br>'+nextExamText()+'</p></div><div class="card"><h3>一期生との絆　平均 '+averageBond().toFixed(1)+'</h3>'+bondRows()+'</div><div class="card"><div class="acts">'+buttons+'</div></div><div class="card"><h3>活動記録</h3><div class="log">'+(game.logs.length?game.logs.map(function(x){return '<div>第'+x.w+'週 '+x.t+'</div>';}).join(''):'<div>世界線が始まった。</div>')+'</div></div>';}
function render(){var app=document.getElementById('app');app.innerHTML=nav()+(screen==='home'?home():screen==='book'?book():play());}
document.addEventListener('click',function(e){var b=e.target.closest('[data-action]');if(!b||b.disabled)return;var a=b.getAttribute('data-action');if(a==='member'){selected=Number(b.getAttribute('data-index'));S.saveMember(selected);render();}else if(a==='start')start();else if(a==='act')act(Number(b.getAttribute('data-index')));else if(a==='equip')equip(b.getAttribute('data-id'));else if(a==='next')nextWorld();else if(a==='go'){screen=b.getAttribute('data-screen');persist();render();}});
render();
})();