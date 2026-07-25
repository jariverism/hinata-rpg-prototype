(function(global){
  'use strict';
  var RELICS={
    kat:{name:'負けず嫌いのノート',icon:'📓',effect:'ボイトレ成功時の上昇量＋2'},
    kum:{name:'キャプテンのメモ帳',icon:'🗒️',effect:'開始時の運営評価＋10'},
    kyo:{name:'歌姫のマイク',icon:'🎤',effect:'ボイトレ成功時の上昇量＋2'},
    mir:{name:'太陽のペンライト',icon:'☀️',effect:'ライブ系イベントを強化'},
    mei:{name:'俊足シューズ',icon:'👟',effect:'ダンス成功時の上昇量＋2'},
    aya:{name:'ランウェイの鏡',icon:'🪞',effect:'モデル撮影成功時の上昇量＋2'},
    ush:{name:'幸運のクローバー',icon:'🍀',effect:'失敗を時々成功に変える'},
    tak:{name:'分析ノート',icon:'📘',effect:'審査イベントを強化'},
    ig:{name:'バラエティ笛',icon:'📣',effect:'バラエティ成功時に人気＋3'},
    mem:{name:'約束のリボン',icon:'🎀',effect:'最終評価＋15'},
    memorial:{name:'世界線の記念写真',icon:'📷',effect:'開始時に全能力＋2'}
  };
  function valid(id){return Object.prototype.hasOwnProperty.call(RELICS,id);}
  function normalizeMeta(raw,ending){
    raw=raw&&typeof raw==='object'?raw:{};
    var owned=Array.isArray(raw.owned)?raw.owned.filter(valid):[];
    var equipped=Array.isArray(raw.equipped)?raw.equipped.filter(valid).slice(0,2):[];
    if(ending&&ending.item==='記念の遺物'&&owned.indexOf('memorial')<0)owned.push('memorial');
    return {runs:Number(raw.runs)||0,owned:owned,clears:raw.clears&&typeof raw.clears==='object'?raw.clears:{},centers:Number(raw.centers)||0,worlds:Array.isArray(raw.worlds)?raw.worlds:[],equipped:equipped};
  }
  global.HinataRelics={all:RELICS,valid:valid,normalizeMeta:normalizeMeta};
})(window);