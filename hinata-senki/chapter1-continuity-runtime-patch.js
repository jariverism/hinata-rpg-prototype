(() => {
  'use strict';

  const NativeBlob = window.Blob;

  function replaceFunction(source,startMarker,endMarker,replacement) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker,start);
    if (start < 0 || end < 0) return source;
    return source.slice(0,start) + replacement + source.slice(end);
  }

  function patchChapterOne(source) {
    if (!source.includes("const SAVE_KEY = 'hinata-senki-save-v1'") || !source.includes('function recruit(a,b)')) return source;

    source = replaceFunction(
      source,
      '  function canTalk(a,b) {',
      '  function getHealTargets',
      `  function canTalk(a,b) {
    return ['kumi','toshi','kyoko'].includes(a.id) && b.id === 'sarina' && dist(a,b) === 1;
  }

`
    );

    source = replaceFunction(
      source,
      '  function recruit(a,b) {',
      '  function visitVillage',
      `  function recruit(a,b) {
    b.faction = 'ally';
    b.acted = false;
    b.weapon = 'live';
    b.staves = b.staves || { live:20, relive:10 };
    const reunionLines = {
      kumi:[
        '久美「紗理菜、治療院の人たちは避難できた？」',
        '紗理菜「うん。裏道へ誘導できたよ。約束どおり合流するね、久美」',
        '久美「ありがとう。ここからは、また一緒に行こう」'
      ],
      toshi:[
        '史帆「紗理菜！　治療院の人たちはもう大丈夫？」',
        '紗理菜「うん、避難できたよ。史帆ちゃんも先に行きすぎてない？」',
        '史帆「今日はちゃんと戻ってきた。ここから一緒に行こう」'
      ],
      kyoko:[
        '京子「紗理菜、治療院の避難は終わった？」',
        '紗理菜「終わったよ。武器を捨てた兵も手伝ってくれた」',
        '京子「分かった。その人たちは追わない。紗理菜は私たちと合流して」'
      ]
    };
    (reunionLines[a.id] || reunionLines.kumi).forEach(addLog);
    addLog('潮紗理菜が部隊へ合流した！');
    finishAction(a);
  }

`
    );

    return source;
  }

  function PatchedBlob(parts = [], options = {}) {
    if (options?.type === 'text/javascript') {
      const text = parts.map(part => typeof part === 'string' ? part : '').join('');
      if (text.includes("hinata-senki-save-v1") && text.includes('function recruit(a,b)')) {
        return new NativeBlob([patchChapterOne(text)],options);
      }
    }
    return new NativeBlob(parts,options);
  }

  PatchedBlob.prototype = NativeBlob.prototype;
  Object.setPrototypeOf(PatchedBlob,NativeBlob);
  window.Blob = PatchedBlob;
})();
