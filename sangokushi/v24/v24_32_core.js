// v24.32 core — terrain, movement and combat formulas
(()=>{
const V=window.V2432=window.V2432||{};
const W=9,H=7;
const MOUNTAIN_CITIES=new Set(['晋陽','上党','洛陽','長安','弘農','安定','天水','武威','西平','漢中','梓潼','成都','江州','永安','建寧','雲南','宛']);
const COAST_CITIES=new Set(['襄平','北海','徐州','下邳','寿春','廬江','建業','呉','会稽','柴桑','長沙','南海']);
const RIVER_CITIES=new Set(['濮陽','陳留','許昌','汝南','寿春','廬江','柴桑','江夏','襄陽','江陵','武陵','長沙']);

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function typeOf(u){const t=u?.type||u?.apt||'剣盾兵';return t==='歩兵'?'剣盾兵':t}
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function key(x,y){return `${x},${y}`}
function idx(x,y){return y*W+x}
function alive(side,b=state?.battle){return b?.units?.filter(u=>u.side===side&&Number(u.troops)>0)||[]}
function occupiedAt(b,x,y){return b?.units?.find(u=>Number(u.troops)>0&&Number(u.x)===x&&Number(u.y)===y)||null}
function officerOfUnit(u,b=state?.battle){
 if(!u)return null;
 const force=u.side==='player'?'日向軍':(b?.invadingForce||state?.cities?.[b?.target]?.force||null);
 return (state?.officers||[]).find(o=>o.name===u.name&&(!force||o.force===force))||(state?.officers||[]).find(o=>o.name===u.name)||null;
}
function currentUnit(){const b=state?.battle;return b?.units?.find(u=>u.side==='player'&&u.name===b.selected&&u.troops>0)||null}
function battleEnemyForce(b){return b?.defense?(b.invadingForce||state?.cities?.[b.enemySource]?.force):state?.cities?.[b.target]?.force}
function hashString(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}

function terrainProfile(b){
 const city=b?.target||'';
 if(MOUNTAIN_CITIES.has(city)&&COAST_CITIES.has(city))return '山海';
 if(MOUNTAIN_CITIES.has(city))return '山岳';
 if(COAST_CITIES.has(city))return '海岸';
 if(RIVER_CITIES.has(city))return '河畔';
 return '平原';
}
function generateTerrain(b){
 const seed=hashString(`${b.src}|${b.target}|${state?.scenarioId||190}`),r=seeded(seed);
 const profile=terrainProfile(b),t=Array(W*H).fill('plain');
 const set=(x,y,v)=>{if(x>=0&&x<W&&y>=0&&y<H)t[idx(x,y)]=v};
 for(let i=0;i<8;i++){
  const x=2+Math.floor(r()*5),y=Math.floor(r()*H);
  if(y===3&&x>=3&&x<=5)continue;
  set(x,y,r()<.55?'forest':'hill');
 }
 if(profile==='山岳'||profile==='山海'){
  const mountains=[[3,0],[4,0],[5,1],[3,2],[5,2],[4,4],[3,5],[5,5],[4,6]];
  mountains.forEach(([x,y],i)=>{if(i%3!==seed%3)set(x,y,'mountain')});
  set(4,3,'hill');
 }
 if(profile==='海岸'||profile==='山海'){
  const lower=seed%2===0;
  const rows=lower?[5,6]:[0,1];
  rows.forEach((y,ri)=>{for(let x=2;x<=6;x++)if(!(ri===0&&x===4))set(x,y,'water')});
  set(4,rows[0],'coast');
 }
 if(profile==='河畔'){
  for(let y=0;y<H;y++)set(4,y,[1,3,5].includes(y)?'bridge':'water');
 }
 for(const u of b.units||[]){
  const p=idx(Number(u.x),Number(u.y));
  if(['water','mountain'].includes(t[p]))t[p]='plain';
 }
 b.terrain=t;b.v2432TerrainVersion=132;b.v2432TerrainProfile=profile;
}
function ensureBattle(b=state?.battle){
 if(!b)return;
 if(!Array.isArray(b.terrain)||b.terrain.length!==W*H||b.v2432TerrainVersion!==132)generateTerrain(b);
 b.v2432DuelUsed=b.v2432DuelUsed||{};
 b.v2432TacticUsed=b.v2432TacticUsed||{};
 b.logs=Array.isArray(b.logs)?b.logs:[];
}
function terrainAt(b,x,y){return String(b?.terrain?.[idx(x,y)]||'plain').split(' ')[0]}
function movePoints(u){return Math.max(1,(Number(window.TROOP_TYPE_INFO?.[typeOf(u)]?.move)||2)+(Number(u?.moveRangeBonus)||0))}
function terrainCost(u,x,y){
 const t=terrainAt(state.battle,x,y);
 if(t==='water')return Infinity;
 if(t==='mountain')return typeOf(u)==='騎兵'?Infinity:2;
 return 1;
}
function passable(u,x,y,allowOccupied=false){
 if(x<0||x>=W||y<0||y>=H||!Number.isFinite(terrainCost(u,x,y)))return false;
 return allowOccupied||!occupiedAt(state.battle,x,y);
}
function reachableCells(u){
 const out=new Map();if(!u||u.done||u.movedThisTurn||u.immobileTurns>0)return out;
 const max=movePoints(u),q=[[Number(u.x),Number(u.y),0]],best=new Map([[key(u.x,u.y),0]]);
 while(q.length){q.sort((a,b)=>a[2]-b[2]);const [x,y,c]=q.shift();if(c>max)continue;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;if(nx<0||nx>=W||ny<0||ny>=H||occupiedAt(state.battle,nx,ny))continue;
   const nc=c+terrainCost(u,nx,ny),k=key(nx,ny);if(!Number.isFinite(nc)||nc>max||nc>=(best.get(k)??Infinity))continue;
   best.set(k,nc);out.set(k,nc);q.push([nx,ny,nc]);
  }
 }
 return out;
}
function attackRange(u,action='attack'){if(action==='fire')return 3;return typeOf(u)==='弩兵'?3:1}
function legalTargets(u,action='attack'){const range=attackRange(u,action);return alive('enemy').filter(e=>dist(u,e)<=range)}

function terrainDefenseFactor(target,b=state.battle){
 const t=terrainAt(b,target.x,target.y);
 if(t==='mountain')return .72;
 if(t==='hill')return .85;
 if(t==='forest')return .90;
 if(t==='coast'||t==='bridge')return .95;
 return 1;
}
function leadershipFactor(target){return 1-clamp(((Number(target?.lead)||50)-50)*.003,-.09,.15)}
function roleFactor(attacker,target,distance){
 const a=typeOf(attacker),d=typeOf(target);let mult=1,notes=[];
 if(a==='槍兵'&&d==='騎兵'){mult*=1.35;notes.push('槍兵の迎撃')}
 if(a==='騎兵'&&d==='槍兵'){mult*=.75;notes.push('槍列')}
 if(a==='騎兵'&&d==='弩兵'){mult*=1.30;notes.push('弩兵急襲')}
 if(a==='騎兵'&&(attacker.movedDistance||0)>=2){mult*=1.20;notes.push('騎馬突撃')}
 if(a==='弩兵'){
  if(distance<=1){mult*=.65;notes.push('接近戦')}
  else if(d==='槍兵'){mult*=1.25;notes.push('槍兵へ遠射')}
  else mult*=1.10;
 }
 if(a==='剣盾兵'&&d==='弩兵'&&distance<=1)mult*=1.25;
 if(d==='剣盾兵')mult*=.90;
 return {mult,notes};
}
function applyDamage(target,amount){
 const b=state.battle;let dmg=Math.max(1,Math.floor(amount));
 if(target.side==='player'&&(b.playerGuardTurns||0)>0)dmg=Math.floor(dmg*.7);
 const before=Number(target.troops)||0;target.troops=Math.max(0,before-dmg);return before-target.troops;
}
function normalDamage(attacker,target){
 let value=90+(Number(attacker.war)||50)*2+(Number(attacker.lead)||50)*.8+(Number(attacker.troops)||0)*.03+rand(0,100);
 if(attacker.weakenTurns>0)value*=.65;
 if(attacker.criticalReady){value*=1.75;attacker.criticalReady=false;attacker.moveRangeBonus=0;state.battle.logs.unshift(`${attacker.name}隊の星詠みが成就した！`)}
 const role=roleFactor(attacker,target,dist(attacker,target));
 value*=role.mult*leadershipFactor(target)*terrainDefenseFactor(target);
 return {damage:Math.max(1,Math.floor(value)),notes:role.notes};
}
function fireResult(attacker,target){
 const chance=clamp(Math.round(25+(Number(attacker.int)||50)*.65-(Number(target.int)||50)*.25),10,90);
 const success=Math.random()*100<chance;
 let damage=0;
 if(success){
  let value=140+(Number(attacker.int)||50)*2.2+(Number(attacker.troops)||0)*.018+rand(0,100);
  value*=leadershipFactor(target)*terrainDefenseFactor(target);
  damage=applyDamage(target,value);
 }
 return {chance,success,damage};
}
function syncExperience(actor,target,before){
 const b=state.battle,after=Number(target.troops)||0,damage=Math.max(0,before-after);if(!damage)return;
 b._v2420Damage=b._v2420Damage||{};b._v2420Damage[actor]=(b._v2420Damage[actor]||0)+damage;b._v2420LastActor=actor;
 b._v2420EnemyTotal=alive('enemy',b).reduce((s,u)=>s+Number(u.troops||0),0);
 b._v2421Damage=b._v2421Damage||{};b._v2421Kills=b._v2421Kills||{};b._v2421Damage[actor]=(b._v2421Damage[actor]||0)+damage;b._v2421LastActor=actor;
 if(before>0&&after===0)b._v2421Kills[actor]=(b._v2421Kills[actor]||0)+1;
 if(Array.isArray(b._v2421Snapshot)){
  const i=b.units.indexOf(target);if(i>=0)b._v2421Snapshot[i]=after;
 }
}
function finishPlayerAction(p){
 p.done=true;p.movedDistance=0;state.battle.mode=null;state.battle.v2432Mode=null;
 if(p.immobileTurns>0)p.immobileTurns--;
 if(window.checkBattleEnd())return;
 window.afterPlayerAction();
}
function playerAttack(action,target){
 const b=state.battle,p=currentUnit();if(!p||p.done||!target)return;
 if(!legalTargets(p,action).includes(target)){b.logs.unshift('対象が射程外です。');return render()}
 const before=target.troops;
 if(action==='attack'){
  const calc=normalDamage(p,target),damage=applyDamage(target,calc.damage),terrain=terrainAt(b,target.x,target.y);
  b.logs.unshift(`${p.name}隊が${target.name}隊へ${damage}損害。${terrain==='mountain'?'【山岳防御】':''}${calc.notes.length?`【${calc.notes.join('・')}】`:''}`);
 }else{
  const r=fireResult(p,target);b.logs.unshift(r.success?`${p.name}隊の火計成功（${r.chance}%）！ ${target.name}隊へ${r.damage}損害。`:`${p.name}隊の火計失敗（成功率${r.chance}%）。`);
 }
 syncExperience(p.name,target,before);finishPlayerAction(p);
}

Object.assign(V,{W,H,clamp,rand,typeOf,dist,key,idx,alive,occupiedAt,officerOfUnit,currentUnit,battleEnemyForce,ensureBattle,terrainAt,movePoints,terrainCost,reachableCells,attackRange,legalTargets,terrainDefenseFactor,leadershipFactor,roleFactor,applyDamage,normalDamage,fireResult,syncExperience,finishPlayerAction,playerAttack});
})();
