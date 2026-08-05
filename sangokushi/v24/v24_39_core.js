// v24.39 core — large central-castle siege map generation and deployment
(()=>{
const V39=window.V2439=window.V2439||{};
const W=15,H=13;
const CX=7,CY=6;
const CASTLE={left:5,right:9,top:4,bottom:8};
const GATES={north:[7,4],east:[9,6],south:[7,8],west:[5,6]};
const DIRS=['north','east','south','west'];
const DIR_LABEL={north:'北',east:'東',south:'南',west:'西'};
const OPPOSITE={north:'south',south:'north',east:'west',west:'east'};
const MOUNTAIN_CITIES=new Set(['晋陽','上党','洛陽','長安','弘農','安定','天水','武威','西平','漢中','梓潼','成都','江州','永安','建寧','雲南','宛']);
const COAST_CITIES=new Set(['襄平','北海','徐州','下邳','寿春','廬江','建業','呉','会稽','柴桑','長沙','南海']);
const RIVER_CITIES=new Set(['濮陽','陳留','許昌','汝南','寿春','廬江','柴桑','江夏','襄陽','江陵','武陵','長沙']);

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function hashString(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
function idx(x,y){return y*W+x}
function key(x,y){return `${x},${y}`}
function dist(a,b){return Math.abs(Number(a.x)-Number(b.x))+Math.abs(Number(a.y)-Number(b.y))}
function typeOf(u){const t=u?.type||u?.apt||'剣盾兵';return t==='歩兵'?'剣盾兵':t}
function isActiveUnit(u){return u&&!u.v2436Structure&&['player','enemy'].includes(u.side)&&Number(u.troops)>0}
function living(b,side){return (b?.units||[]).filter(u=>isActiveUnit(u)&&u.side===side)}
function occupiedAt(b,x,y){return (b?.units||[]).find(u=>isActiveUnit(u)&&Number(u.x)===x&&Number(u.y)===y)||null}
function terrainAt(b,x,y){return String(b?.terrain?.[idx(x,y)]||'plain').split(' ')[0]}
function currentPlayer(b=state?.battle){const units=living(b,'player'),selected=units.find(u=>u.name===b.selected);return (selected&&!selected.done?selected:null)||units.find(u=>!u.done)||selected||units[0]||null}
function attackerSide(b){return b?.defense?'enemy':'player'}
function defenderSide(b){return b?.defense?'player':'enemy'}
function battleEnemyForce(b){return b?.defense?(b.invadingForce||state?.cities?.[b.enemySource]?.force):state?.cities?.[b.target]?.force}
function officerFor(u,b=state?.battle){
 if(!u)return null;
 const force=u.side==='player'?'日向軍':battleEnemyForce(b);
 return (state?.officers||[]).find(o=>o.name===u.name&&(!force||o.force===force))||(state?.officers||[]).find(o=>o.name===u.name)||null;
}
function isCastleTile(t){return ['wall','gate','courtyard','keep'].includes(t)}
function isWallTile(t){return t==='wall'||t==='gate'}
function insideCastle(x,y){return x>=CASTLE.left&&x<=CASTLE.right&&y>=CASTLE.top&&y<=CASTLE.bottom}
function onCastlePerimeter(x,y){return insideCastle(x,y)&&(x===CASTLE.left||x===CASTLE.right||y===CASTLE.top||y===CASTLE.bottom)}
function keepCell(){return {x:CX,y:CY}}

function eligibleForLargeSiege(b){
 if(!b||b.v2439Skipped)return false;
 if(b.v2439LargeSiege)return true;
 if(Number(b.day||1)!==1||b.phase!=='player')return false;
 const active=(b.units||[]).filter(u=>!u.v2436Structure&&['player','enemy'].includes(u.side));
 if(active.some(u=>u.done||u.movedThisTurn||u.v2433DuelCaptured||Number(u.troops)<=0))return false;
 if(b.mode||b.v2432Mode||b.v2423Target)return false;
 return true;
}
function sourceDirection(b){
 const sourceName=b.defense?b.enemySource:b.src;
 const source=state?.cities?.[sourceName],target=state?.cities?.[b.target];
 if(!source||!target)return 'west';
 const dx=Number(source.x)-Number(target.x),dy=Number(source.y)-Number(target.y);
 if(Math.abs(dx)>=Math.abs(dy))return dx<0?'west':'east';
 return dy<0?'north':'south';
}
function profileForCity(city){
 if(MOUNTAIN_CITIES.has(city)&&COAST_CITIES.has(city))return '山海';
 if(MOUNTAIN_CITIES.has(city))return '山城';
 if(COAST_CITIES.has(city))return '海城';
 if(RIVER_CITIES.has(city))return '河城';
 return '平城';
}
function featureSide(city,profile){return DIRS[hashString(`${city}|${profile}|fortress`)%DIRS.length]}
function setTerrain(t,x,y,value){if(x>=0&&x<W&&y>=0&&y<H)t[idx(x,y)]=value}
function bandCells(side,depth=2){
 const cells=[];
 if(side==='north')for(let y=0;y<depth;y++)for(let x=0;x<W;x++)cells.push([x,y]);
 if(side==='south')for(let y=H-depth;y<H;y++)for(let x=0;x<W;x++)cells.push([x,y]);
 if(side==='west')for(let x=0;x<depth;x++)for(let y=0;y<H;y++)cells.push([x,y]);
 if(side==='east')for(let x=W-depth;x<W;x++)for(let y=0;y<H;y++)cells.push([x,y]);
 return cells;
}
function approachLane(side){
 const cells=[];
 if(side==='west')for(let x=0;x<=CASTLE.left;x++)for(let y=CY-1;y<=CY+1;y++)cells.push([x,y]);
 if(side==='east')for(let x=CASTLE.right;x<W;x++)for(let y=CY-1;y<=CY+1;y++)cells.push([x,y]);
 if(side==='north')for(let y=0;y<=CASTLE.top;y++)for(let x=CX-1;x<=CX+1;x++)cells.push([x,y]);
 if(side==='south')for(let y=CASTLE.bottom;y<H;y++)for(let x=CX-1;x<=CX+1;x++)cells.push([x,y]);
 return cells;
}
function generateLargeTerrain(b){
 const seed=hashString(`${b.target}|${state?.scenarioId||190}|large-siege`),r=seeded(seed);
 const t=Array(W*H).fill('plain');
 const profile=profileForCity(b.target),back=featureSide(b.target,profile);
 const road=new Set(DIRS.flatMap(d=>approachLane(d).map(([x,y])=>key(x,y))));
 for(let i=0;i<34;i++){
  const x=Math.floor(r()*W),y=Math.floor(r()*H);
  if(insideCastle(x,y)||road.has(key(x,y)))continue;
  setTerrain(t,x,y,r()<.57?'forest':'hill');
 }
 if(profile==='山城'||profile==='山海'){
  for(const [x,y] of bandCells(back,3))setTerrain(t,x,y,(x+y+seed)%5===0?'hill':'mountain');
  const pass=back==='north'||back==='south'?[[CX-2,back==='north'?1:H-2],[CX+2,back==='north'?1:H-2]]:[[back==='west'?1:W-2,CY-2],[back==='west'?1:W-2,CY+2]];
  pass.forEach(([x,y])=>{setTerrain(t,x,y,'hill');if(back==='north')setTerrain(t,x,y+1,'hill');if(back==='south')setTerrain(t,x,y-1,'hill');if(back==='west')setTerrain(t,x+1,y,'hill');if(back==='east')setTerrain(t,x-1,y,'hill')});
 }
 if(profile==='海城'||profile==='山海'){
  for(const [x,y] of bandCells(back,2))setTerrain(t,x,y,'water');
  for(const [x,y] of bandCells(back,3))if(terrainAt({terrain:t},x,y)!=='water')setTerrain(t,x,y,'coast');
 }
 if(profile==='河城'){
  const vertical=back==='east'||back==='west';
  const line=vertical?(back==='west'?3:W-4):(back==='north'?3:H-4);
  if(vertical){for(let y=0;y<H;y++)setTerrain(t,line,y,[3,6,9].includes(y)?'bridge':'water')}
  else{for(let x=0;x<W;x++)setTerrain(t,x,line,[3,7,11].includes(x)?'bridge':'water')}
 }
 for(let y=CASTLE.top;y<=CASTLE.bottom;y++)for(let x=CASTLE.left;x<=CASTLE.right;x++)setTerrain(t,x,y,onCastlePerimeter(x,y)?'wall':'courtyard');
 Object.values(GATES).forEach(([x,y])=>setTerrain(t,x,y,'gate'));
 setTerrain(t,CX,CY,'keep');
 for(const [gx,gy] of Object.values(GATES)){
  setTerrain(t,gx,gy,'gate');
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=gx+dx,y=gy+dy;
   if(!insideCastle(x,y)&&terrainAt({terrain:t},x,y)==='water')setTerrain(t,x,y,'bridge');
   if(insideCastle(x,y)&&!onCastlePerimeter(x,y)&&!(x===CX&&y===CY))setTerrain(t,x,y,'courtyard');
  }
 }
 b.terrain=t;b.v2439Profile=profile;b.v2439FeatureSide=back;b.v2439TerrainVersion=139;
}
function spawnZone(side){
 const out=[];
 if(side==='west')for(let x=0;x<=1;x++)for(let y=1;y<H-1;y++)out.push({x,y});
 if(side==='east')for(let x=W-1;x>=W-2;x--)for(let y=1;y<H-1;y++)out.push({x,y});
 if(side==='north')for(let y=0;y<=1;y++)for(let x=1;x<W-1;x++)out.push({x,y});
 if(side==='south')for(let y=H-1;y>=H-2;y--)for(let x=1;x<W-1;x++)out.push({x,y});
 return out;
}
function directionAvailable(b,side){return spawnZone(side).filter(s=>terrainAt(b,s.x,s.y)!=='water').length>=7}
function castleSlots(b){
 const walls=[],inside=[];
 for(let y=CASTLE.top;y<=CASTLE.bottom;y++)for(let x=CASTLE.left;x<=CASTLE.right;x++){
  const t=terrainAt(b,x,y);(t==='wall'||t==='gate'?walls:inside).push({x,y});
 }
 const centerFirst=(a,c)=>dist(a,{x:CX,y:CY})-dist(c,{x:CX,y:CY});
 walls.sort(centerFirst);inside.sort(centerFirst);return {walls,inside};
}
function clearSpawnTerrain(b,side){for(const s of spawnZone(side))if(terrainAt(b,s.x,s.y)==='mountain')b.terrain[idx(s.x,s.y)]='hill'}
function placeAttackers(b,side,units){
 clearSpawnTerrain(b,side);
 const slots=spawnZone(side).filter(s=>terrainAt(b,s.x,s.y)!=='water');
 const ordered=units.slice().sort((a,c)=>{const rank=u=>typeOf(u)==='騎兵'?0:typeOf(u)==='弩兵'?2:1;return rank(a)-rank(c)||(Number(c.lead)||0)-(Number(a.lead)||0)});
 ordered.forEach((u,i)=>{const s=slots[i%slots.length];u.x=s.x;u.y=s.y;u.done=false;u.movedThisTurn=false;u.movedDistance=0});
}
function placeDefenders(b,units){
 const {walls,inside}=castleSlots(b),used=new Set();
 const ranged=units.filter(u=>typeOf(u)==='弩兵').sort((a,c)=>(Number(c.int)||0)-(Number(a.int)||0));
 const melee=units.filter(u=>typeOf(u)!=='弩兵').sort((a,c)=>(Number(c.lead)||0)-(Number(a.lead)||0));
 const wallPriority=[GATES.west,GATES.east,GATES.north,GATES.south].map(([x,y])=>({x,y})).concat(walls);
 const take=list=>list.find(s=>!used.has(key(s.x,s.y))&&terrainAt(b,s.x,s.y)!=='water');
 ranged.forEach(u=>{const s=take(walls)||take(inside);if(s){u.x=s.x;u.y=s.y;used.add(key(s.x,s.y))}});
 melee.forEach(u=>{const s=take(wallPriority)||take(inside)||take(walls);if(s){u.x=s.x;u.y=s.y;used.add(key(s.x,s.y))}});
 units.forEach(u=>{u.done=false;u.movedThisTurn=false;u.movedDistance=0});
}
function chooseCommandersAndMorale(b){
 b.v2436Commanders=b.v2436Commanders||{};
 for(const side of ['player','enemy']){
  const units=living(b,side);if(!units.length)continue;
  let name=b.v2436Commanders[side];
  if(side==='player'&&state?.v2436PendingCommander&&units.some(u=>u.name===state.v2436PendingCommander))name=state.v2436PendingCommander;
  if(!name||!units.some(u=>u.name===name)){
   const ruler=units.find(u=>officerFor(u,b)?.status==='君主');
   name=(ruler||units.slice().sort((a,c)=>(Number(c.lead)||0)-(Number(a.lead)||0))[0]).name;
  }
  b.v2436Commanders[side]=name;
  const commander=units.find(u=>u.name===name),cityName=side==='player'?(b.defense?b.target:b.src):(b.defense?b.enemySource:b.target),base=clamp(Number(state?.cities?.[cityName]?.morale)||65,35,95),aura=Math.round(((Number(commander?.lead)||70)-70)/4);
  for(const u of units){if(!Number.isFinite(Number(u.morale)))u.morale=clamp(base+aura+(u.name===name?8:0),20,100);u.maxMorale=100}
 }
}
function initLargeSiege(b){
 b.units=(b.units||[]).filter(u=>!u.v2436Structure&&['player','enemy'].includes(u.side));
 delete b.v2436Siege;b.v2436SiegeSkipped=true;b.v2438Disabled=true;
 b.v2439LargeSiege=true;b.v2439GridW=W;b.v2439GridH=H;
 b.v2439DefaultDirection=sourceDirection(b);b.v2439Direction=b.v2439DefaultDirection;
 generateLargeTerrain(b);
 if(!directionAvailable(b,b.v2439Direction))b.v2439Direction=DIRS.find(d=>directionAvailable(b,d))||'west';
 const attackers=living(b,attackerSide(b)),defenders=living(b,defenderSide(b));
 placeAttackers(b,b.v2439Direction,attackers);placeDefenders(b,defenders);chooseCommandersAndMorale(b);
 b.v2439DeploymentActive=true;b.v2439DeploymentDone=false;b.v2439Selected=(b.defense?living(b,'player'):attackers)[0]?.name||null;
 b.v2434DeploymentActive=true;b.v2434DeploymentDone=false;b.phase='player';b.day=1;b.mode=null;b.v2432Mode=null;
 b.logs=Array.isArray(b.logs)?b.logs:[];
 b.logs.unshift(`${b.target}${b.defense?'防衛戦':'攻略戦'}。15×13の戦場中央に城郭が築かれ、${DIR_LABEL[b.v2439Direction]}方から攻城軍が迫る。`);
}
function playerDeploymentUnits(b){return living(b,'player')}
function allowedDeploymentCells(b){
 if(b.defense){const out=[];for(let y=CASTLE.top;y<=CASTLE.bottom;y++)for(let x=CASTLE.left;x<=CASTLE.right;x++)out.push({x,y});return out}
 return spawnZone(b.v2439Direction).filter(s=>terrainAt(b,s.x,s.y)!=='water');
}
function deploymentAllowed(b,x,y){return allowedDeploymentCells(b).some(s=>s.x===x&&s.y===y)}
function selectedDeployUnit(b){return playerDeploymentUnits(b).find(u=>u.name===b.v2439Selected)||playerDeploymentUnits(b)[0]||null}
function placeSelectedDeployment(b,x,y){
 const u=selectedDeployUnit(b);if(!u||!deploymentAllowed(b,x,y)||terrainAt(b,x,y)==='water')return;
 const occ=occupiedAt(b,x,y);if(occ?.side==='enemy')return;
 if(occ?.side==='player'&&occ!==u){const ox=u.x,oy=u.y;u.x=occ.x;u.y=occ.y;occ.x=ox;occ.y=oy}else{u.x=x;u.y=y}
 window.render();
}
function changeAttackDirection(b,side){if(!b.defense&&directionAvailable(b,side)){b.v2439Direction=side;placeAttackers(b,side,living(b,'player'));b.v2439Selected=living(b,'player')[0]?.name||null;window.render()}}
function autoPlayerDeployment(b){if(b.defense)placeDefenders(b,living(b,'player'));else placeAttackers(b,b.v2439Direction,living(b,'player'));b.v2439Selected=living(b,'player')[0]?.name||null;window.render()}
function matchingMoleOfficer(unit,b){
 const force=battleEnemyForce(b);
 return (state?.officers||[]).find(o=>o.name===unit.name&&o.force===force&&o.v2424MoleId&&state?.v2424Moles?.[o.v2424MoleId])||null;
}
function activateMolesAfterDeployment(b){
 b._v2424Turncoats=Array.isArray(b._v2424Turncoats)?b._v2424Turncoats:[];
 for(const unit of living(b,'enemy').slice()){
  const o=matchingMoleOfficer(unit,b);if(!o)continue;
  const pledge=state.v2424Moles[o.v2424MoleId],oldForce=o.force;
  unit.side='player';unit.done=false;unit.movedThisTurn=false;unit.v2424Turncoat=true;unit.originalForce=oldForce;
  o.force='日向軍';o.status='一般';o.loy=Math.max(68,Math.min(82,58+Math.floor(Number(pledge?.loyalty||60)/5)));o.city=b.target;o.acted=state.turn;
  if(!b._v2424Turncoats.includes(o.name))b._v2424Turncoats.push(o.name);
  delete state.v2424Moles[o.v2424MoleId];delete o.v2424MoleId;
  b.logs.unshift(`伏毒発動！ ${o.name}隊が敵陣で旗を翻し、日向軍へ寝返った！`);
  if(typeof log==='function')log(`伏毒の計が発動。${oldForce}軍の${o.name}が戦場で寝返り、日向軍へ加入した。`);
 }
}
function confirmDeployment(b){
 const units=playerDeploymentUnits(b),seen=new Set();
 for(const u of units){
  if(!deploymentAllowed(b,u.x,u.y))return alert(`${u.name}を配置可能範囲へ置いてください。`);
  const k=key(u.x,u.y);if(seen.has(k))return alert('同じマスに複数部隊は配置できません。');seen.add(k);
 }
 b.v2439DeploymentActive=false;b.v2439DeploymentDone=true;b.v2434DeploymentActive=false;b.v2434DeploymentDone=true;
 b.selected=units[0]?.name||b.selected;b.v2439Selected=null;b.mode=null;b.v2432Mode=null;
 units.forEach(u=>{u.done=false;u.movedThisTurn=false;u.movedDistance=0});
 activateMolesAfterDeployment(b);chooseCommandersAndMorale(b);
 b.logs.unshift(`布陣完了。${DIR_LABEL[b.v2439Direction]}方から四門と城壁を巡る攻防が始まった。城壁は登攀可能、本丸占領でも決着する。`);
 window.render();
}

Object.assign(V39,{W,H,CX,CY,CASTLE,GATES,DIRS,DIR_LABEL,OPPOSITE,clamp,rand,idx,key,dist,typeOf,isActiveUnit,living,occupiedAt,terrainAt,currentPlayer,attackerSide,defenderSide,battleEnemyForce,officerFor,isCastleTile,isWallTile,insideCastle,onCastlePerimeter,keepCell,eligibleForLargeSiege,sourceDirection,profileForCity,featureSide,generateLargeTerrain,spawnZone,directionAvailable,castleSlots,placeAttackers,placeDefenders,chooseCommandersAndMorale,initLargeSiege,playerDeploymentUnits,allowedDeploymentCells,deploymentAllowed,selectedDeployUnit,placeSelectedDeployment,changeAttackDirection,autoPlayerDeployment,activateMolesAfterDeployment,confirmDeployment});
})();
