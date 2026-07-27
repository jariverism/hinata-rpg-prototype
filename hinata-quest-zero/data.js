window.HQ0 = (() => {
  "use strict";
  const TILE = { GRASS:0, PATH:1, TREE:2, WATER:3, BRIDGE:4, STONE:5, FLOOR:6, WALL:7, CAVE:8, CRYSTAL:9, FLOWER:10 };
  const grid = (fill) => Array.from({length:11}, () => Array(20).fill(fill));

  function grass() {
    const g = grid(TILE.GRASS);
    for (let x=0;x<20;x++){ g[0][x]=TILE.TREE; g[10][x]=TILE.TREE; }
    for (let y=0;y<11;y++){ g[y][0]=TILE.TREE; }
    for (let x=1;x<20;x++) g[5][x]=TILE.PATH;
    for (let y=0;y<10;y++) g[y][10]=TILE.PATH;
    g[0][10]=TILE.CAVE;
    for(let x=3;x<9;x++) g[8][x]=TILE.WATER;
    g[8][6]=TILE.BRIDGE;
    [[3,2],[4,2],[15,3],[16,3],[3,7],[16,8]].forEach(([x,y])=>g[y][x]=TILE.FLOWER);
    return g;
  }
  function city() {
    const g=grid(TILE.FLOOR);
    for(let x=0;x<20;x++){g[0][x]=TILE.WALL;g[10][x]=TILE.WALL;}
    for(let y=0;y<11;y++){g[y][0]=TILE.WALL;g[y][19]=TILE.WALL;}
    for(let y=1;y<10;y++) g[y][10]=TILE.PATH;
    for(let x=1;x<19;x++) g[8][x]=TILE.PATH;
    for(let x=2;x<7;x++){g[2][x]=TILE.WALL;g[3][x]=TILE.WALL;}
    for(let x=13;x<18;x++){g[2][x]=TILE.WALL;g[3][x]=TILE.WALL;}
    g[3][4]=TILE.FLOOR;g[3][15]=TILE.FLOOR;g[10][10]=TILE.PATH;
    [[2,6],[3,6],[16,6],[17,6]].forEach(([x,y])=>g[y][x]=TILE.FLOWER);
    return g;
  }
  function cave() {
    const g=grid(TILE.STONE);
    for(let x=0;x<20;x++){g[0][x]=TILE.WALL;g[10][x]=TILE.WALL;}
    for(let y=0;y<11;y++){g[y][0]=TILE.WALL;g[y][19]=TILE.WALL;}
    for(let y=2;y<10;y++) g[y][10]=TILE.FLOOR;
    for(let x=2;x<18;x++){g[8][x]=TILE.FLOOR;g[5][x]=TILE.FLOOR;}
    for(let y=5;y<9;y++){g[y][3]=TILE.FLOOR;g[y][16]=TILE.FLOOR;}
    for(let x=7;x<14;x++) g[2][x]=TILE.FLOOR;
    for(let y=2;y<6;y++){g[y][7]=TILE.FLOOR;g[y][13]=TILE.FLOOR;}
    g[1][10]=TILE.CRYSTAL;g[9][10]=TILE.CAVE;
    return g;
  }

  const maps = {
    grass:{name:"はじまりの草原",tiles:grass(),start:[2,5],npcs:[
      {id:"traveler",x:4,y:4,type:"elder",name:"旅の行商人",lines:["東の門を抜ければ王都ソラシドだ。","目が赤く光った魔物は追ってくる。背後には気をつけな。"]},
      {id:"guard",x:17,y:4,type:"guard",name:"門番の騎士",lines:["王都はすぐ東です。草原の魔物を倒してからお進みください！"]}
    ],chests:[],enemies:[
      {id:"tutorial",x:7,y:5,kind:"slime",story:true},
      {id:"slime2",x:14,y:3,kind:"slime"},
      {id:"bat1",x:15,y:8,kind:"bat"},
      {id:"raid",x:16,y:5,kind:"hound",hidden:true,story:true}
    ]},
    city:{name:"王都ソラシド",tiles:city(),start:[10,9],npcs:[
      {id:"child",x:3,y:7,type:"child",name:"空色の帽子の子",lines:["最近みんな笑わなくなったけど、騎士団長さんは毎朝ちゃんと声をかけてくれるよ。"]},
      {id:"baker",x:16,y:7,type:"merchant",name:"パン屋の主人",lines:["西の国ミレリアから小麦が届かないんだ。畑まで元気をなくしたらしい。"]},
      {id:"shop",x:6,y:8,type:"merchant",name:"道具屋",lines:["薬草は15G、青銅の剣は45Gだよ。"],shop:true},
      {id:"kumi",x:10,y:2,type:"kumi",name:"空色の騎士団長",special:"kumi"}
    ],chests:[{id:"cityChest",x:17,y:5,item:"herb",amount:1,text:"薬草を見つけた！"}],enemies:[]},
    cave:{name:"うつろいの洞窟",tiles:cave(),start:[10,9],npcs:[
      {id:"wisp",x:9,y:8,type:"wisp",name:"小さな光",lines:["奥から誰かのため息が聞こえる……。虹色の光は北を指している。"]}
    ],chests:[
      {id:"herbChest",x:3,y:5,item:"herb",amount:2,text:"薬草を2個手に入れた！"},
      {id:"charmChest",x:16,y:5,item:"charm",amount:1,text:"装備品「空色のお守り」を手に入れた！"}
    ],enemies:[
      {id:"caveBat",x:7,y:5,kind:"bat"},
      {id:"armor",x:13,y:5,kind:"armor"},
      {id:"boss",x:10,y:1,kind:"boss",boss:true,story:true}
    ]}
  };
  const enemies={
    slime:{name:"しょんぼりスライム",hp:28,atk:7,def:2,exp:16,gold:12},
    bat:{name:"ためいきバット",hp:38,atk:10,def:3,exp:24,gold:16},
    hound:{name:"不安の魔犬",hp:70,atk:13,def:5,exp:45,gold:30},
    armor:{name:"うつろの鎧",hp:82,atk:15,def:8,exp:55,gold:35},
    boss:{name:"笑顔喰らい",hp:230,atk:18,def:7,exp:180,gold:100,boss:true}
  };
  const intro=[
    ["モノローグ","hero","その夜も、あなたは部屋で日向坂46の映像を見ていた。","room"],
    ["画面の向こうの声","light","――ハッピーオーラを、もう一度。","glow"],
    ["主人公","hero","え……？　画面が、光って――！","warp"],
    ["？？？","light","欠片を集めて。七つの心が再び出会うとき、道は開かれる……。","warp"],
    ["主人公","hero","ここは……どこだ？　スマホもグッズもない。でも「ハッピーオーラ」だけは覚えてる。","meadow"]
  ];
  const meet=[
    ["空色の騎士団長","kumi","止まれ。見慣れない服装だな。魔王軍の間者ではないだろうな？"],
    ["主人公","hero","あなた……佐々木久美さん、ですよね？　日向坂46の――"],
    ["空色の騎士団長","kumi","ササキ・クミ？　知らない名だ。私はこの国の騎士団長だ。"],
    ["主人公","hero","その声も、みんなを気にかけるところも……絶対に間違えない。"],
    ["騎士団員","guard","団長！　東門の外に魔物が！　住民が取り残されています！"],
    ["空色の騎士団長","kumi","全員集合！　あなたも戦えるなら来い。疑いは、その剣で晴らしてもらう！"]
  ];
  const afterRaid=[
    ["空色の騎士団長","kumi","助かった。戦いながら周りを励ますなんて、変わった剣士だな。"],
    ["主人公","hero","応援するのは得意なんです。ずっと、あなたたちに教えてもらったから。"],
    ["空色の騎士団長","kumi","不思議と懐かしい……。北の洞窟から嫌な気配がする。私も同行しよう。"],
    ["SYSTEM","light","空色の騎士団長がゲスト加入！　「キャプテンコール」が使えるようになった。"]
  ];
  const bossIntro=[
    ["笑顔喰らい","boss","笑顔など、失うから苦しい。期待など、裏切られるだけだ。"],
    ["空色の騎士団長","kumi","違う。うまくいかない時こそ、隣にいる仲間の声が聞こえる。"],
    ["主人公","hero","久美さん、みんなをまとめるあの言葉を！"],
    ["空色の騎士団長","kumi","……全員集合！　ここからが、私たちの本番だ！"]
  ];
  const ending=[
    ["空色の騎士団長","kumi","光の中で見えた。空色の衣装、眩しい舞台、隣で笑う仲間たち……。"],
    ["佐々木久美","kumi","私は佐々木久美。日向坂46の一期生で、キャプテンだった。"],
    ["主人公","hero","おかえりなさい、久美さん。"],
    ["佐々木久美","kumi","ただいま。次の欠片は西、パンの国ミレリアにある気がする。"],
    ["佐々木久美","kumi","行こう。散り散りになったみんなを、今度は私たちが迎えに行く番だよ！"]
  ];
  return {TILE,maps,enemies,intro,meet,afterRaid,bossIntro,ending};
})();
